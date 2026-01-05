const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const pty = require('node-pty');
const session = require('express-session');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const cors = require('cors');
const proxy = require('express-http-proxy');
const helmet = require('helmet');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Database setup
const db = new Database('cloudette.db');
db.pragma('journal_mode = WAL');

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    data_type TEXT NOT NULL,
    data_key TEXT NOT NULL,
    data_value TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, data_type, data_key)
  );

  CREATE TABLE IF NOT EXISTS browser_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS installed_apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    app_name TEXT NOT NULL,
    app_version TEXT,
    installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, app_name)
  );
`);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(cookieParser());
app.use(cors({
  credentials: true,
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
const sessionSecret = process.env.SESSION_SECRET || (() => {
  console.warn('⚠️  WARNING: Using fallback session secret. Set SESSION_SECRET environment variable in production!');
  return crypto.randomBytes(32).toString('hex');
})();

const sessionMiddleware = session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
});

app.use(sessionMiddleware);

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs for auth endpoints
  message: 'Too many attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.static('public'));

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
}

// User authentication routes
app.post('/api/register', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Input validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Sanitize username (alphanumeric and underscore only)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    const stmt = db.prepare('INSERT INTO users (id, username, password) VALUES (?, ?, ?)');
    stmt.run(userId, username, hashedPassword);

    req.session.userId = userId;
    req.session.username = username;
    res.json({ success: true, username });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = stmt.get(username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ success: true, username: user.username });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/user', requireAuth, (req, res) => {
  res.json({ username: req.session.username, userId: req.session.userId });
});

// Browser history routes
app.post('/api/history', apiLimiter, requireAuth, (req, res) => {
  try {
    const { url, title } = req.body;
    const stmt = db.prepare('INSERT INTO browser_history (user_id, url, title) VALUES (?, ?, ?)');
    stmt.run(req.session.userId, url, title);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save history' });
  }
});

app.get('/api/history', apiLimiter, requireAuth, (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM browser_history WHERE user_id = ? ORDER BY visited_at DESC LIMIT 100');
    const history = stmt.all(req.session.userId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve history' });
  }
});

// Installed apps routes
app.post('/api/apps/install', apiLimiter, requireAuth, (req, res) => {
  try {
    const { appName, appVersion } = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO installed_apps (user_id, app_name, app_version) VALUES (?, ?, ?)');
    stmt.run(req.session.userId, appName, appVersion);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to install app' });
  }
});

app.get('/api/apps/installed', apiLimiter, requireAuth, (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM installed_apps WHERE user_id = ? ORDER BY installed_at DESC');
    const apps = stmt.all(req.session.userId);
    res.json(apps);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve apps' });
  }
});

// User data persistence routes
app.post('/api/userdata', apiLimiter, requireAuth, (req, res) => {
  try {
    const { dataType, dataKey, dataValue } = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO user_data (user_id, data_type, data_key, data_value) VALUES (?, ?, ?, ?)');
    stmt.run(req.session.userId, dataType, dataKey, JSON.stringify(dataValue));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save user data' });
  }
});

app.get('/api/userdata/:dataType', apiLimiter, requireAuth, (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM user_data WHERE user_id = ? AND data_type = ?');
    const data = stmt.all(req.session.userId, req.params.dataType);
    const result = {};
    data.forEach(item => {
      try {
        result[item.data_key] = JSON.parse(item.data_value);
      } catch (parseError) {
        console.error('Failed to parse user data:', parseError);
        result[item.data_key] = null;
      }
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve user data' });
  }
});

// Secure web proxy
app.use('/proxy', requireAuth, (req, res, next) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  try {
    const url = new URL(targetUrl);
    proxy(url.origin, {
      proxyReqPathResolver: () => url.pathname + url.search,
      userResDecorator: (proxyRes, proxyResData) => {
        return proxyResData;
      },
      proxyReqOptDecorator: (proxyReqOpts) => {
        proxyReqOpts.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        return proxyReqOpts;
      }
    })(req, res, next);
  } catch (error) {
    res.status(400).json({ error: 'Invalid URL' });
  }
});

// Terminal WebSocket connections
const terminals = {};
const logs = {};

// Share session with Socket.IO
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('create-terminal', (data) => {
    // Validate user is authenticated via session
    if (!socket.request.session || !socket.request.session.userId) {
      socket.emit('terminal-error', 'Authentication required');
      return;
    }

    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    const term = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: process.env.HOME,
      env: process.env
    });

    const terminalId = crypto.randomUUID();
    terminals[terminalId] = term;
    logs[terminalId] = '';

    term.on('data', (data) => {
      logs[terminalId] += data;
      socket.emit('terminal-output', data);
    });

    term.on('exit', () => {
      delete terminals[terminalId];
      socket.emit('terminal-exit');
    });

    socket.emit('terminal-created', { terminalId });

    socket.on('terminal-input', (data) => {
      if (terminals[terminalId]) {
        terminals[terminalId].write(data);
      }
    });

    socket.on('terminal-resize', (size) => {
      if (terminals[terminalId]) {
        terminals[terminalId].resize(size.cols, size.rows);
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`CloudettteVM server running on ${HOST}:${PORT}`);
  
  // GitHub Codespaces detection
  if (process.env.CODESPACE_NAME) {
    const codespaceUrl = `https://${process.env.CODESPACE_NAME}-${PORT}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
    console.log(`🚀 Running in GitHub Codespaces!`);
    console.log(`📱 Open: ${codespaceUrl}`);
  } else {
    console.log(`📱 Open: http://localhost:${PORT}`);
  }
  
  console.log(`\n✨ CloudettteVM Features:`);
  console.log(`  • Virtual Linux Terminal`);
  console.log(`  • Secure Web Proxy Browser`);
  console.log(`  • Application Store`);
  console.log(`  • Persistent User Profiles\n`);
});
