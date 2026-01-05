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

    // Initialize app-specific functionality
    if (appName === 'terminal' && !terminal) {
        setTimeout(initializeTerminal, 100);
    } else if (appName === 'files') {
        setTimeout(loadFilesList, 100);
    } else if (appName === 'notes') {
        setTimeout(loadNotes, 100);
    } else if (appName === 'calculator') {
        setTimeout(updateCalcDisplay, 100);
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
        editor: { icon: '📝', name: 'Text Editor' },
        files: { icon: '📁', name: 'Files' },
        calculator: { icon: '🔢', name: 'Calculator' },
        notes: { icon: '📔', name: 'Notes' },
        store: { icon: '📦', name: 'App Store' },
        apps: { icon: '📱', name: 'My Apps' },
        activity: { icon: '📊', name: 'Activity' },
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

    // Track command input for history
    let currentCommand = '';
    terminal.onData((data) => {
        socket.emit('terminal-input', data);
        
        // Track command for history (Enter key = command submitted)
        if (data === '\r' || data === '\n') {
            if (currentCommand.trim()) {
                saveTerminalCommand(currentCommand.trim());
            }
            currentCommand = '';
        } else if (data === '\x7f' || data === '\b') {
            // Backspace
            currentCommand = currentCommand.slice(0, -1);
        } else if (data.length === 1 && data.charCodeAt(0) >= 32) {
            // Printable character
            currentCommand += data;
        }
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

// Save terminal command to history
async function saveTerminalCommand(command) {
    try {
        await fetch('/api/terminal/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command })
        });
    } catch (error) {
        console.error('Failed to save terminal command:', error);
    }
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
    await loadBrowsingHistory();
}

async function loadBrowsingHistory() {
    try {
        const response = await fetch('/api/history');
        const history = await response.json();
        
        const historyList = document.getElementById('browsing-history');
        if (!historyList) return;
        
        if (history.length === 0) {
            historyList.innerHTML = '<p class="loading">No browsing history yet</p>';
            return;
        }

        historyList.innerHTML = history.map(item => `
            <div class="activity-item">
                <h4>${escapeHtml(item.title || 'Untitled')}</h4>
                <p><a href="#" class="history-link" data-url="${escapeHtml(item.url)}">${escapeHtml(item.url)}</a></p>
                <p>${new Date(item.visited_at).toLocaleString()}</p>
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
        const historyList = document.getElementById('browsing-history');
        if (historyList) {
            historyList.innerHTML = '<p class="loading">Failed to load history</p>';
        }
    }
}

async function loadTerminalHistory() {
    try {
        const response = await fetch('/api/terminal/commands');
        const commands = await response.json();
        
        const terminalList = document.getElementById('terminal-history');
        if (!terminalList) return;
        
        if (commands.length === 0) {
            terminalList.innerHTML = '<p class="loading">No terminal commands recorded yet</p>';
            return;
        }

        terminalList.innerHTML = commands.map(cmd => `
            <div class="activity-item">
                <h4><code>${escapeHtml(cmd.command)}</code></h4>
                <p>${new Date(cmd.executed_at).toLocaleString()}</p>
            </div>
        `).join('');
    } catch (error) {
        const terminalList = document.getElementById('terminal-history');
        if (terminalList) {
            terminalList.innerHTML = '<p class="loading">Terminal history not available</p>';
        }
    }
}

async function loadAppsHistory() {
    try {
        const response = await fetch('/api/apps/installed');
        const apps = await response.json();
        
        const appsList = document.getElementById('apps-history');
        if (!appsList) return;
        
        if (apps.length === 0) {
            appsList.innerHTML = '<p class="loading">No apps installed yet</p>';
            return;
        }

        appsList.innerHTML = apps.map(app => `
            <div class="activity-item">
                <h4>${escapeHtml(app.app_name)}</h4>
                <p>Version: ${escapeHtml(app.app_version || 'latest')}</p>
                <p>Installed: ${new Date(app.installed_at).toLocaleString()}</p>
            </div>
        `).join('');
    } catch (error) {
        const appsList = document.getElementById('apps-history');
        if (appsList) {
            appsList.innerHTML = '<p class="loading">Failed to load apps</p>';
        }
    }
}

function switchActivityTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.activity-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Show/hide content
    document.querySelectorAll('.activity-list').forEach(list => {
        list.style.display = 'none';
    });

    const targetList = document.getElementById(`${tabName}-history`);
    if (targetList) {
        targetList.style.display = 'flex';
    }

    // Load data for the tab
    if (tabName === 'browsing') {
        loadBrowsingHistory();
    } else if (tabName === 'terminal') {
        loadTerminalHistory();
    } else if (tabName === 'apps') {
        loadAppsHistory();
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

// ==================== TEXT EDITOR FUNCTIONALITY ====================
let currentEditorFile = null;

async function saveEditorFile() {
    const filename = document.getElementById('editor-filename').value || 'untitled.txt';
    const content = document.getElementById('editor-content').value;
    
    try {
        await fetch('/api/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: filename, content, type: 'text' })
        });
        showToast(`File "${filename}" saved successfully!`);
        currentEditorFile = filename;
        loadFilesList();
    } catch (error) {
        showToast('Failed to save file', 'error');
    }
}

function newEditorFile() {
    document.getElementById('editor-filename').value = '';
    document.getElementById('editor-content').value = '';
    currentEditorFile = null;
    showToast('New file created');
}

function clearEditor() {
    if (confirm('Clear all content?')) {
        document.getElementById('editor-content').value = '';
    }
}

// ==================== FILE MANAGER FUNCTIONALITY ====================
async function loadFilesList() {
    try {
        const response = await fetch('/api/files');
        const files = await response.json();
        
        const filesList = document.getElementById('files-list');
        if (!filesList) return;
        
        if (files.length === 0) {
            filesList.innerHTML = '<p class="loading">No files yet. Create files in the Text Editor.</p>';
            return;
        }
        
        filesList.innerHTML = files.map(file => `
            <div class="file-item" data-path="${escapeHtml(file.file_path)}">
                <div class="file-item-info">
                    <h4>${escapeHtml(file.file_path)}</h4>
                    <p>Modified: ${new Date(file.updated_at).toLocaleString()}</p>
                </div>
                <div class="file-item-actions">
                    <button class="file-item-btn file-open-btn" data-path="${escapeHtml(file.file_path)}">📂 Open</button>
                    <button class="file-item-btn file-delete-btn" data-path="${escapeHtml(file.file_path)}">🗑️</button>
                </div>
            </div>
        `).join('');
        
        // Add event listeners
        filesList.querySelectorAll('.file-open-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openFile(btn.dataset.path);
            });
        });
        
        filesList.querySelectorAll('.file-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteFile(btn.dataset.path);
            });
        });
    } catch (error) {
        const filesList = document.getElementById('files-list');
        if (filesList) {
            filesList.innerHTML = '<p class="loading">Failed to load files</p>';
        }
    }
}

async function openFile(filepath) {
    try {
        const response = await fetch(`/api/files?path=${encodeURIComponent(filepath)}`);
        const file = await response.json();
        
        if (file) {
            // Open editor and load content
            openWindow('editor');
            document.getElementById('editor-filename').value = file.file_path;
            document.getElementById('editor-content').value = file.file_content || '';
            currentEditorFile = file.file_path;
            showToast(`Opened "${file.file_path}"`);
        }
    } catch (error) {
        showToast('Failed to open file', 'error');
    }
}

async function deleteFile(filepath) {
    if (!confirm(`Delete "${filepath}"?`)) return;
    
    try {
        await fetch('/api/files', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: filepath })
        });
        showToast(`File "${filepath}" deleted`);
        loadFilesList();
    } catch (error) {
        showToast('Failed to delete file', 'error');
    }
}

// ==================== CALCULATOR FUNCTIONALITY ====================
let calcDisplay = '0';
let calcPrevValue = null;
let calcOperator = null;
let calcWaitingForOperand = false;

function updateCalcDisplay() {
    document.getElementById('calc-display').textContent = calcDisplay;
}

function handleCalcButton(action) {
    if (!isNaN(action) || action === '.') {
        // Number or decimal point
        if (calcWaitingForOperand) {
            calcDisplay = action;
            calcWaitingForOperand = false;
        } else {
            calcDisplay = calcDisplay === '0' ? action : calcDisplay + action;
        }
    } else if (action === 'clear') {
        calcDisplay = '0';
        calcPrevValue = null;
        calcOperator = null;
        calcWaitingForOperand = false;
    } else if (action === 'backspace') {
        calcDisplay = calcDisplay.slice(0, -1) || '0';
    } else if (action === '=') {
        if (calcOperator && calcPrevValue !== null) {
            const curr = parseFloat(calcDisplay);
            const prev = parseFloat(calcPrevValue);
            
            switch (calcOperator) {
                case '+': calcDisplay = String(prev + curr); break;
                case '-': calcDisplay = String(prev - curr); break;
                case '*': calcDisplay = String(prev * curr); break;
                case '/': calcDisplay = curr !== 0 ? String(prev / curr) : 'Error'; break;
            }
            
            calcPrevValue = null;
            calcOperator = null;
            calcWaitingForOperand = true;
        }
    } else {
        // Operator
        if (calcOperator && !calcWaitingForOperand) {
            // Calculate first
            const curr = parseFloat(calcDisplay);
            const prev = parseFloat(calcPrevValue);
            
            switch (calcOperator) {
                case '+': calcDisplay = String(prev + curr); break;
                case '-': calcDisplay = String(prev - curr); break;
                case '*': calcDisplay = String(prev * curr); break;
                case '/': calcDisplay = curr !== 0 ? String(prev / curr) : 'Error'; break;
            }
        }
        
        calcPrevValue = calcDisplay;
        calcOperator = action;
        calcWaitingForOperand = true;
    }
    
    updateCalcDisplay();
}

// ==================== NOTES FUNCTIONALITY ====================
let notes = [];
let currentNoteId = null;

async function loadNotes() {
    try {
        const response = await fetch('/api/userdata/notes');
        const data = await response.json();
        notes = Object.entries(data)
            .map(([id, note]) => ({ id, ...note }))
            .filter(note => note.title || note.content); // Filter out deleted notes
        renderNotesList();
    } catch (error) {
        notes = [];
        renderNotesList();
    }
}

function renderNotesList() {
    const notesList = document.getElementById('notes-list');
    if (!notesList) return;
    
    if (notes.length === 0) {
        notesList.innerHTML = '<p class="loading" style="padding: 12px;">No notes yet. Click "New Note" to create one.</p>';
        return;
    }
    
    notesList.innerHTML = notes.map(note => `
        <div class="notes-item ${currentNoteId === note.id ? 'active' : ''}" data-id="${note.id}">
            <h4>${escapeHtml(note.title || 'Untitled')}</h4>
            <p>${new Date(note.updated || Date.now()).toLocaleDateString()}</p>
        </div>
    `).join('');
    
    // Add event listeners
    notesList.querySelectorAll('.notes-item').forEach(item => {
        item.addEventListener('click', () => loadNote(item.dataset.id));
    });
}

function loadNote(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (note) {
        currentNoteId = noteId;
        document.getElementById('notes-title').value = note.title || '';
        document.getElementById('notes-content').value = note.content || '';
        renderNotesList();
    }
}

async function saveNote() {
    const title = document.getElementById('notes-title').value;
    const content = document.getElementById('notes-content').value;
    
    if (!title && !content) {
        showToast('Please add a title or content', 'error');
        return;
    }
    
    const noteId = currentNoteId || `note_${Date.now()}`;
    const note = { title, content, updated: new Date().toISOString() };
    
    try {
        await fetch('/api/userdata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataType: 'notes', dataKey: noteId, dataValue: note })
        });
        
        currentNoteId = noteId;
        showToast('Note saved!');
        await loadNotes();
    } catch (error) {
        showToast('Failed to save note', 'error');
    }
}

async function createNewNote() {
    currentNoteId = null;
    document.getElementById('notes-title').value = '';
    document.getElementById('notes-content').value = '';
    showToast('New note created');
}

async function deleteNote() {
    if (!currentNoteId) {
        showToast('No note selected', 'error');
        return;
    }
    
    if (!confirm('Delete this note?')) return;
    
    try {
        // Mark as deleted by saving null value
        await fetch('/api/userdata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataType: 'notes', dataKey: currentNoteId, dataValue: null })
        });
        
        showToast('Note deleted');
        currentNoteId = null;
        document.getElementById('notes-title').value = '';
        document.getElementById('notes-content').value = '';
        await loadNotes();
    } catch (error) {
        showToast('Failed to delete note', 'error');
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    // Auth form event listeners
    document.getElementById('login-btn').addEventListener('click', login);
    document.getElementById('register-btn').addEventListener('click', register);
    document.getElementById('show-register-btn').addEventListener('click', (e) => {
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

    // Activity tabs
    document.querySelectorAll('.activity-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchActivityTab(tab.dataset.tab);
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

    // Text Editor event listeners
    const editorSaveBtn = document.getElementById('editor-save-btn');
    const editorNewBtn = document.getElementById('editor-new-btn');
    const editorClearBtn = document.getElementById('editor-clear-btn');
    
    if (editorSaveBtn) editorSaveBtn.addEventListener('click', saveEditorFile);
    if (editorNewBtn) editorNewBtn.addEventListener('click', newEditorFile);
    if (editorClearBtn) editorClearBtn.addEventListener('click', clearEditor);

    // File Manager event listeners
    const filesRefreshBtn = document.getElementById('files-refresh-btn');
    if (filesRefreshBtn) filesRefreshBtn.addEventListener('click', loadFilesList);

    // Calculator event listeners
    document.querySelectorAll('.calc-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            handleCalcButton(btn.dataset.action);
        });
    });

    // Notes event listeners
    const notesNewBtn = document.getElementById('notes-new-btn');
    const notesSaveBtn = document.getElementById('notes-save-btn');
    const notesDeleteBtn = document.getElementById('notes-delete-btn');
    
    if (notesNewBtn) notesNewBtn.addEventListener('click', createNewNote);
    if (notesSaveBtn) notesSaveBtn.addEventListener('click', saveNote);
    if (notesDeleteBtn) notesDeleteBtn.addEventListener('click', deleteNote);
});
