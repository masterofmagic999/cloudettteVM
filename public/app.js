let socket;
let terminal;
let fitAddon;
let currentUser = null;

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
}

function showAppScreen() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('app-screen').classList.add('active');
    document.getElementById('username-display').textContent = currentUser;
    initializeTerminal();
    loadInstalledApps();
    loadHistory();
}

// Tab navigation
function showTab(tabName, event) {
    // Remove active class from all tabs and buttons
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    // Add active class to selected tab and button
    document.getElementById(`${tabName}-tab`).classList.add('active');
    if (event) {
        event.target.closest('.nav-btn').classList.add('active');
    } else {
        // If no event, find the button by tabName
        document.querySelector(`[onclick*="${tabName}"]`)?.classList.add('active');
    }

    // Initialize terminal if switching to terminal tab
    if (tabName === 'terminal' && !terminal) {
        initializeTerminal();
    }
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
            background: '#1e1e1e',
            foreground: '#d4d4d4',
            cursor: '#ffffff',
            black: '#000000',
            red: '#cd3131',
            green: '#0dbc79',
            yellow: '#e5e510',
            blue: '#2472c8',
            magenta: '#bc3fbc',
            cyan: '#11a8cd',
            white: '#e5e5e5',
            brightBlack: '#666666',
            brightRed: '#f14c4c',
            brightGreen: '#23d18b',
            brightYellow: '#f5f543',
            brightBlue: '#3b8eea',
            brightMagenta: '#d670d6',
            brightCyan: '#29b8db',
            brightWhite: '#e5e5e5'
        }
    });

    fitAddon = new FitAddon.FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalElement);
    fitAddon.fit();

    // Connect to WebSocket (session handled via cookies)
    socket = io();

    socket.on('connect', () => {
        socket.emit('create-terminal');
    });

    socket.on('terminal-output', (data) => {
        terminal.write(data);
    });

    socket.on('terminal-exit', () => {
        terminal.writeln('\r\nTerminal session ended. Refresh to start a new session.');
    });

    terminal.onData((data) => {
        socket.emit('terminal-input', data);
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (fitAddon && terminal) {
            fitAddon.fit();
            socket.emit('terminal-resize', {
                cols: terminal.cols,
                rows: terminal.rows
            });
        }
    });
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

    // Save to history
    saveToHistory(url, 'Web Page');
}

function refreshBrowser() {
    const iframe = document.getElementById('browser-frame');
    iframe.src = iframe.src;
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
                    <h4>${item.title || 'Untitled'}</h4>
                    <p><a href="#" onclick="loadFromHistory('${item.url}')">${item.url}</a></p>
                    <p>${new Date(item.visited_at).toLocaleString()}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        document.getElementById('history-list').innerHTML = '<p class="loading">Failed to load history</p>';
    }
}

function loadFromHistory(url) {
    document.getElementById('url-input').value = url;
    // Find and click the browser button
    const browserBtn = document.querySelector('[onclick*="browser"]');
    if (browserBtn) browserBtn.click();
    setTimeout(() => navigateTo(), 100);
}

// App installation functions
async function installApp(appName, version) {
    try {
        // Show installation in terminal
        const terminalBtn = document.querySelector('[onclick*="terminal"]');
        if (terminalBtn) terminalBtn.click();
        showToast(`Installing ${appName}...`);

        // Track installation
        await fetch('/api/apps/install', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appName, appVersion: version })
        });

        // Send installation command to terminal (if applicable)
        if (socket && terminal) {
            // Different package managers for different apps
            let installCmd = '';
            if (['nodejs', 'python3', 'git', 'vim', 'curl', 'wget'].includes(appName)) {
                // For apt-based systems
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
                    <h4>${app.app_name}</h4>
                    <p>Version: ${app.app_version || 'latest'}</p>
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

    // Add Enter key support for login/register
    document.getElementById('login-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });

    document.getElementById('register-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') register();
    });

    document.getElementById('url-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') navigateTo();
    });
});
