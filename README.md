# cloudettteVM

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/masterofmagic999/cloudettteVM)

A robust web application hosting a fully functional virtual Linux machine. Users can install apps via terminal or store, with an advanced profile system that persists all data, including installed software and browser history.

> **🚀 Quick Start:** Click the badge above to launch CloudettteVM in GitHub Codespaces instantly!
> 
> **📖 Setup Guide:** See [SETUP.md](./SETUP.md) for detailed installation and usage instructions.

## Features

### 🖥️ Virtual Linux Terminal
- Full Linux terminal access through web browser
- Install applications via apt, npm, pip, and other package managers
- Real-time terminal emulation using xterm.js
- Persistent terminal sessions

### 🌐 Secure Browser with Proxy
- High-speed, secure background web proxy integrated into every browser
- Bypass external blocks and interference
- Fast, unrestricted, and private browsing experience
- All traffic routed through secure proxy server

### 👤 Advanced Profile System
- User registration and authentication
- Persistent data storage across sessions
- Tracks installed applications
- Saves browser history
- Secure password hashing with bcrypt

### 📦 Application Store
- One-click installation of popular applications
- Pre-configured apps: Node.js, Python, Git, Vim, Curl, Wget
- Track all installed applications
- Easy application management

### 🔒 Security Features
- Session-based authentication
- Secure password storage
- HTTP headers protection with Helmet
- CORS configuration
- SQLite database with WAL mode

## Installation

> **📖 For detailed setup instructions, see [SETUP.md](./SETUP.md)**

### Prerequisites
- Node.js (v20 or higher) - **REQUIRED**
- npm (v10 or higher)
- Linux/MacOS (recommended) or Windows with WSL

### Setup

1. Clone the repository:
```bash
git clone https://github.com/masterofmagic999/cloudettteVM.git
cd cloudettteVM
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## 🚀 GitHub Codespaces Setup (Recommended)

CloudettteVM is optimized for GitHub Codespaces! Run it instantly in your browser without any local setup.

> **✅ Automatic Setup:** The devcontainer configuration automatically installs Node.js 20 and all dependencies.

### Quick Start in Codespaces

1. **Open in Codespaces:**
   - Go to the repository on GitHub
   - Click the green **"Code"** button
   - Select **"Codespaces"** tab
   - Click **"Create codespace on main"** (or your branch)

2. **Automatic Setup:**
   - The codespace will automatically:
     - Install all dependencies
     - Start the server on port 3000
     - Forward the port for public access

3. **Access the Application:**
   - A notification will appear with the forwarded port
   - Click **"Open in Browser"** when prompted
   - Or find the forwarded URL in the **"PORTS"** tab (View → PORTS)
   - The URL format: `https://<codespace-name>-3000.app.github.dev`

4. **Manual Start (if needed):**
   ```bash
   # If the server isn't running, start it manually:
   npm start
   
   # Or use the quick start script:
   ./start.sh
   ```

### Codespaces Configuration

The repository includes a `.devcontainer/devcontainer.json` configuration that:
- Sets up Node.js 20 environment (required for dependencies)
- Installs required VS Code extensions
- Automatically forwards port 3000
- Runs `npm install` on creation
- Starts the server automatically

### Benefits of Using Codespaces
- ✅ No local installation required
- ✅ Consistent development environment
- ✅ Access from any device with a browser
- ✅ Automatic port forwarding and HTTPS
- ✅ Pre-configured terminal and tools
- ✅ Free tier available (60 hours/month)

## Usage

### Getting Started
1. **Register**: Create a new account with username and password
2. **Login**: Sign in with your credentials
3. **Terminal**: Access the Linux terminal to run commands and install software
4. **Browser**: Use the secure proxy browser to browse the web unrestricted
5. **App Store**: Install popular applications with one click
6. **My Apps**: View all your installed applications
7. **History**: Browse your web history

### Terminal Commands
You can use standard Linux commands in the terminal:
```bash
# Update package list
sudo apt-get update

# Install applications
sudo apt-get install python3
sudo apt-get install nodejs
sudo apt-get install git

# Navigate filesystem
ls -la
cd /home
pwd

# Edit files
vim myfile.txt
nano myfile.txt
```

### Browser Usage
1. Enter any URL in the browser address bar
2. Click "Go" to navigate through the secure proxy
3. All traffic is routed through the proxy server
4. Browse history is automatically saved

### Installing Apps
**Via App Store:**
- Click on "App Store" in the sidebar
- Select an app and click "Install"
- The app will be installed via terminal

**Via Terminal:**
- Use standard package managers (apt, npm, pip, etc.)
- All installations are tracked in "My Apps"

## Architecture

### Backend (Node.js/Express)
- **server.js**: Main server file with all API routes
- **Express**: Web framework for handling HTTP requests
- **Socket.IO**: WebSocket connections for real-time terminal
- **node-pty**: Pseudo-terminal for Linux shell emulation
- **better-sqlite3**: Fast, synchronous SQLite database
- **express-http-proxy**: Proxy middleware for secure browsing

### Frontend
- **index.html**: Main application interface
- **app.js**: Client-side JavaScript for interactivity
- **styles.css**: Modern, responsive styling
- **xterm.js**: Terminal emulator library
- **Socket.IO client**: Real-time communication with server

### Database Schema
- **users**: User accounts with authentication
- **user_data**: Generic key-value storage for user data
- **browser_history**: Browser history with timestamps
- **installed_apps**: Tracking of installed applications

## API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - Login user
- `POST /api/logout` - Logout user
- `GET /api/user` - Get current user info

### Browser History
- `POST /api/history` - Save browser history entry
- `GET /api/history` - Get user's browser history

### Applications
- `POST /api/apps/install` - Track app installation
- `GET /api/apps/installed` - Get installed apps

### User Data
- `POST /api/userdata` - Save user data
- `GET /api/userdata/:dataType` - Get user data by type

### Proxy
- `GET /proxy?url=<target_url>` - Proxy web requests

## Security Considerations

### Current Implementation
- Password hashing with bcrypt
- Session-based authentication
- Helmet for HTTP headers protection
- CORS configuration
- Input validation on critical endpoints

### Production Recommendations
1. Use HTTPS/TLS encryption
2. Set secure session secrets via environment variables
3. Implement rate limiting
4. Add CSRF protection
5. Regular security audits
6. Container isolation for terminal sessions
7. Restrict terminal command execution
8. Implement user resource quotas

## Configuration

### Environment Variables
```bash
PORT=3000                    # Server port
SESSION_SECRET=<secret>      # Session secret key
NODE_ENV=production          # Environment mode
```

## Development

### Project Structure
```
cloudettteVM/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── .gitignore            # Git ignore rules
├── cloudette.db          # SQLite database (auto-created)
└── public/               # Frontend files
    ├── index.html        # Main HTML
    ├── app.js           # Client JavaScript
    └── styles.css       # Styling
```

### Adding New Features
1. Backend routes go in `server.js`
2. Frontend logic goes in `public/app.js`
3. Styling goes in `public/styles.css`
4. Database schema changes in server.js initialization

## Troubleshooting

### Terminal not working
- Ensure node-pty is properly installed
- Check that you have appropriate shell (bash/powershell)
- Verify WebSocket connections are allowed

### Proxy not loading pages
- Check the target URL is valid
- Ensure network connectivity
- Some sites may block proxy requests

### Database errors
- Delete cloudette.db and restart to recreate
- Check file permissions on database file

## License

ISC License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on GitHub.
