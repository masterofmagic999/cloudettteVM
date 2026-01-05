let socket;
let terminal;
let fitAddon;
let currentUser = null;
let openWindows = {};
let windowZIndex = 100;
let activeWindow = null;

// Toast notification function
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// Authentication functions
async function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        showToast('Please enter username and password', 'error');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (response.ok) {
            currentUser = data.username;
            showAppScreen();
            showToast(`Welcome back, ${data.username}!`);
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showToast('Login failed. Please try again.', 'error');
    }
}

async function register() {
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;

    if (!username || !password) {
        showToast('Please enter username and password', 'error');
        return;
    }

    if (username.length < 3 || username.length > 30) {
        showToast('Username must be between 3 and 30 characters', 'error');
        return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showToast('Username can only contain letters, numbers, and underscores', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (response.ok) {
            currentUser = data.username;
            showAppScreen();
            showToast(`Account created! Welcome, ${data.username}!`);
        } else {
            showToast(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showToast('Registration failed. Please try again.', 'error');
    }
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        currentUser = null;
        openWindows = {};
        showAuthScreen();
        showToast('Logged out successfully');
    } catch (error) {
        showToast('Logout failed', 'error');
    }
}

function showLogin() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
}

function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

function showAuthScreen() {
    document.getElementById('auth-screen').classList.add('active');
    document.getElementById('app-screen').classList.remove('active');
    if (terminal) {
        terminal.dispose();
        terminal = null;
    }
    // Close all windows
    document.querySelectorAll('.window').forEach(w => w.style.display = 'none');
    updateTaskbar();
}

function showAppScreen() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('app-screen').classList.add('active');
    document.getElementById('username-display').textContent = currentUser;
    document.getElementById('settings-username').textContent = currentUser;
    loadInstalledApps();
    loadHistory();
    updateClock();
    setInterval(updateClock, 1000);
}

function updateClock() {
    const clock = document.getElementById('tray-clock');
    if (clock) {
        const now = new Date();
        clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

// Window management
function openWindow(appName) {
    const windowEl = document.getElementById(`${appName}-window`);
    if (!windowEl) return;

    if (openWindows[appName]) {
        // Window already open, focus it
        focusWindow(appName);
        if (windowEl.classList.contains('minimized')) {
            windowEl.classList.remove('minimized');
        }
        return;
    }

    // Set initial position
    const offset = Object.keys(openWindows).length * 30;
    windowEl.style.top = `${50 + offset}px`;
    windowEl.style.left = `${100 + offset}px`;
    windowEl.style.width = '700px';
    windowEl.style.height = '500px';
    windowEl.style.display = 'flex';

    openWindows[appName] = true;
    focusWindow(appName);
    updateTaskbar();

    // Initialize terminal if opening terminal window
    if (appName === 'terminal' && !terminal) {
        setTimeout(initializeTerminal, 100);
    }

    // Hide start menu
    hideStartMenu();
}

function closeWindow(appName) {
    const windowEl = document.getElementById(`${appName}-window`);
    if (!windowEl) return;

    windowEl.style.display = 'none';
    windowEl.classList.remove('maximized', 'minimized', 'focused');
    delete openWindows[appName];

    if (appName === 'terminal' && terminal) {
        terminal.dispose();
        terminal = null;
    }

    updateTaskbar();
}

function minimizeWindow(appName) {
    const windowEl = document.getElementById(`${appName}-window`);
    if (!windowEl) return;

    windowEl.classList.add('minimized');
    windowEl.classList.remove('focused');
    updateTaskbar();
}

function maximizeWindow(appName) {
    const windowEl = document.getElementById(`${appName}-window`);
    if (!windowEl) return;

    windowEl.classList.toggle('maximized');
    
    if (appName === 'terminal' && fitAddon) {
        setTimeout(() => fitAddon.fit(), 100);
    }
}

function focusWindow(appName) {
    // Remove focus from all windows
    document.querySelectorAll('.window').forEach(w => w.classList.remove('focused'));
    
    const windowEl = document.getElementById(`${appName}-window`);
    if (!windowEl) return;

    windowEl.style.zIndex = ++windowZIndex;
    windowEl.classList.add('focused');
    activeWindow = appName;
    updateTaskbar();
}

function updateTaskbar() {
    const taskbarApps = document.getElementById('taskbar-apps');
    taskbarApps.innerHTML = '';

    const appNames = {
        terminal: { icon: '💻', name: 'Terminal' },
        browser: { icon: '🌐', name: 'Browser' },
        store: { icon: '📦', name: 'App Store' },
        apps: { icon: '📱', name: 'My Apps' },
        history: { icon: '📜', name: 'History' },
        settings: { icon: '⚙️', name: 'Settings' }
    };

    for (const [app, isOpen] of Object.entries(openWindows)) {
        if (isOpen && appNames[app]) {
            const btn = document.createElement('button');
            btn.className = `taskbar-app${activeWindow === app ? ' active' : ''}`;
            btn.innerHTML = `<span>${appNames[app].icon}</span> ${appNames[app].name}`;
            btn.addEventListener('click', () => {
                const windowEl = document.getElementById(`${app}-window`);
                if (windowEl.classList.contains('minimized')) {
                    windowEl.classList.remove('minimized');
                    focusWindow(app);
                } else if (activeWindow === app) {
                    minimizeWindow(app);
                } else {
                    focusWindow(app);
                }
            });
            taskbarApps.appendChild(btn);
        }
    }
}

// Start menu
function toggleStartMenu() {
    const startMenu = document.getElementById('start-menu');
    if (startMenu.style.display === 'none' || !startMenu.style.display) {
        startMenu.style.display = 'block';
    } else {
        hideStartMenu();
    }
}

function hideStartMenu() {
    document.getElementById('start-menu').style.display = 'none';
}

// Make windows draggable
function initDraggable(windowEl) {
    const titlebar = windowEl.querySelector('.window-titlebar');
    let isDragging = false;
    let offsetX, offsetY;

    titlebar.addEventListener('mousedown', (e) => {
        if (e.target.closest('.window-controls')) return;
        if (windowEl.classList.contains('maximized')) return;

        isDragging = true;
        offsetX = e.clientX - windowEl.offsetLeft;
        offsetY = e.clientY - windowEl.offsetTop;
        focusWindow(windowEl.id.replace('-window', ''));
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        windowEl.style.left = `${e.clientX - offsetX}px`;
        windowEl.style.top = `${e.clientY - offsetY}px`;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// Terminal functions
function initializeTerminal() {
    if (terminal) return;

    const terminalElement = document.getElementById('terminal');
    if (!terminalElement) return;

    terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
            background: '#0a0a0a',
            foreground: '#e4e4e7',
            cursor: '#ffffff',
            cursorAccent: '#0a0a0a',
            black: '#18181b',
            red: '#ef4444',
            green: '#22c55e',
            yellow: '#eab308',
            blue: '#3b82f6',
            magenta: '#a855f7',
            cyan: '#06b6d4',
            white: '#f4f4f5',
            brightBlack: '#52525b',
            brightRed: '#f87171',
            brightGreen: '#4ade80',
            brightYellow: '#facc15',
            brightBlue: '#60a5fa',
            brightMagenta: '#c084fc',
            brightCyan: '#22d3ee',
            brightWhite: '#fafafa'
        }
    });

    fitAddon = new FitAddon.FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalElement);
    
    setTimeout(() => fitAddon.fit(), 50);

    // Connect to WebSocket
    socket = io();

    socket.on('connect', () => {
        socket.emit('create-terminal');
    });

    socket.on('terminal-output', (data) => {
        terminal.write(data);
    });

    socket.on('terminal-exit', () => {
        terminal.writeln('\r\nTerminal session ended. Reopen to start a new session.');
    });

    socket.on('terminal-error', (error) => {
        showToast(error, 'error');
    });

    terminal.onData((data) => {
        socket.emit('terminal-input', data);
    });

    // Handle window resize
    const resizeObserver = new ResizeObserver(() => {
        if (fitAddon && terminal) {
            fitAddon.fit();
            if (socket) {
                socket.emit('terminal-resize', {
                    cols: terminal.cols,
                    rows: terminal.rows
                });
            }
        }
    });

    resizeObserver.observe(terminalElement);
}

// Browser functions
function navigateTo() {
    const urlInput = document.getElementById('url-input').value;
    if (!urlInput) {
        showToast('Please enter a URL', 'error');
        return;
    }

    let url = urlInput;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    const proxyUrl = `/proxy?url=${encodeURIComponent(url)}`;
    const iframe = document.getElementById('browser-frame');
    iframe.src = proxyUrl;

    saveToHistory(url, 'Web Page');
}

function refreshBrowser() {
    const iframe = document.getElementById('browser-frame');
    if (iframe.src) {
        iframe.src = iframe.src;
    }
}

async function saveToHistory(url, title) {
    try {
        await fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, title })
        });
    } catch (error) {
        console.error('Failed to save history:', error);
    }
}

async function loadHistory() {
    try {
        const response = await fetch('/api/history');
        const history = await response.json();
        
        const historyList = document.getElementById('history-list');
        if (history.length === 0) {
            historyList.innerHTML = '<p class="loading">No browsing history yet</p>';
            return;
        }

        historyList.innerHTML = history.map(item => `
            <div class="history-item">
                <div>
                    <h4>${escapeHtml(item.title || 'Untitled')}</h4>
                    <p><a href="#" class="history-link" data-url="${escapeHtml(item.url)}">${escapeHtml(item.url)}</a></p>
                    <p>${new Date(item.visited_at).toLocaleString()}</p>
                </div>
            </div>
        `).join('');

        // Add event listeners to history links
        historyList.querySelectorAll('.history-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                loadFromHistory(link.dataset.url);
            });
        });
    } catch (error) {
        document.getElementById('history-list').innerHTML = '<p class="loading">Failed to load history</p>';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function loadFromHistory(url) {
    document.getElementById('url-input').value = url;
    openWindow('browser');
    setTimeout(() => navigateTo(), 100);
}

// App installation functions
async function installApp(appName, version) {
    try {
        openWindow('terminal');
        showToast(`Installing ${appName}...`);

        await fetch('/api/apps/install', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appName, appVersion: version })
        });

        if (socket && terminal) {
            let installCmd = '';
            if (['nodejs', 'python3', 'git', 'vim', 'curl', 'wget'].includes(appName)) {
                installCmd = `sudo apt-get update && sudo apt-get install -y ${appName}\r`;
            }
            socket.emit('terminal-input', installCmd);
        }

        showToast(`${appName} installation started!`, 'success');
        setTimeout(() => loadInstalledApps(), 2000);
    } catch (error) {
        showToast(`Failed to install ${appName}`, 'error');
    }
}

async function loadInstalledApps() {
    try {
        const response = await fetch('/api/apps/installed');
        const apps = await response.json();
        
        const appsList = document.getElementById('installed-apps-list');
        if (apps.length === 0) {
            appsList.innerHTML = '<p class="loading">No apps installed yet. Visit the App Store to install apps.</p>';
            return;
        }

        appsList.innerHTML = apps.map(app => `
            <div class="app-item">
                <div>
                    <h4>${escapeHtml(app.app_name)}</h4>
                    <p>Version: ${escapeHtml(app.app_version || 'latest')}</p>
                    <p>Installed: ${new Date(app.installed_at).toLocaleString()}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        document.getElementById('installed-apps-list').innerHTML = '<p class="loading">Failed to load apps</p>';
    }
}

// Check if user is already logged in
async function checkAuth() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            currentUser = data.username;
            showAppScreen();
        }
    } catch (error) {
        // User not logged in, stay on auth screen
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    // Auth form event listeners
    document.getElementById('login-btn').addEventListener('click', login);
    document.getElementById('register-btn').addEventListener('click', register);
    document.getElementById('show-register-link').addEventListener('click', (e) => {
        e.preventDefault();
        showRegister();
    });
    document.getElementById('show-login-link').addEventListener('click', (e) => {
        e.preventDefault();
        showLogin();
    });

    // Logout buttons
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('start-logout-btn').addEventListener('click', () => {
        hideStartMenu();
        logout();
    });

    // Start menu
    document.getElementById('start-btn').addEventListener('click', toggleStartMenu);

    // Close start menu when clicking outside
    document.addEventListener('click', (e) => {
        const startMenu = document.getElementById('start-menu');
        const startBtn = document.getElementById('start-btn');
        if (!startMenu.contains(e.target) && !startBtn.contains(e.target)) {
            hideStartMenu();
        }
    });

    // Desktop icons - double click to open
    document.querySelectorAll('.desktop-icon').forEach(icon => {
        icon.addEventListener('dblclick', () => {
            const appName = icon.dataset.app;
            openWindow(appName);
        });
    });

    // Start menu items
    document.querySelectorAll('.start-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const appName = item.dataset.app;
            openWindow(appName);
        });
    });

    // Window controls
    document.querySelectorAll('.window-btn.close').forEach(btn => {
        btn.addEventListener('click', () => {
            const windowName = btn.dataset.window;
            closeWindow(windowName);
        });
    });

    document.querySelectorAll('.window-btn.minimize').forEach(btn => {
        btn.addEventListener('click', () => {
            const windowName = btn.dataset.window;
            minimizeWindow(windowName);
        });
    });

    document.querySelectorAll('.window-btn.maximize').forEach(btn => {
        btn.addEventListener('click', () => {
            const windowName = btn.dataset.window;
            maximizeWindow(windowName);
        });
    });

    // Make windows draggable and focusable
    document.querySelectorAll('.window').forEach(windowEl => {
        initDraggable(windowEl);
        windowEl.addEventListener('mousedown', () => {
            focusWindow(windowEl.id.replace('-window', ''));
        });
    });

    // Browser controls
    document.getElementById('go-btn').addEventListener('click', navigateTo);
    document.getElementById('refresh-btn').addEventListener('click', refreshBrowser);
    document.getElementById('url-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') navigateTo();
    });

    // App install buttons
    document.querySelectorAll('.install-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const appName = btn.dataset.app;
            const version = btn.dataset.version;
            installApp(appName, version);
        });
    });

    // Welcome widget close
    document.getElementById('close-welcome').addEventListener('click', () => {
        document.getElementById('welcome-widget').style.display = 'none';
    });

    // Add Enter key support for login/register
    document.getElementById('login-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });

    document.getElementById('register-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') register();
    });
});
