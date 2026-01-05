# CloudettteVM - Quick Setup Guide

## 🚀 Running on GitHub Codespaces (Recommended)

GitHub Codespaces provides the **easiest and fastest** way to run CloudettteVM. Everything is pre-configured and ready to go!

### Method 1: One-Click Launch (Fastest)

Click this badge to instantly create and launch a Codespace:

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/masterofmagic999/cloudettteVM)

### Method 2: Manual Launch from Repository

1. **Navigate** to https://github.com/masterofmagic999/cloudettteVM
2. Click the green **"Code"** button
3. Select the **"Codespaces"** tab
4. Click **"Create codespace on main"**

### What Happens Automatically

When your Codespace starts, it will automatically:
1. ✅ Set up Node.js 20.x environment
2. ✅ Install all npm dependencies (`npm install`)
3. ✅ Start the CloudettteVM server (`npm start`)
4. ✅ Forward port 3000 for public access
5. ✅ Show you a notification to open the app

### Accessing Your Running Application

Once the Codespace is ready:

1. **Look for the notification**: A pop-up will appear saying "Your application running on port 3000 is available"
2. **Click "Open in Browser"** in the notification, OR
3. **Use the Ports tab**:
   - Go to the bottom panel in VS Code
   - Click the **"PORTS"** tab
   - Find port 3000 (labeled "CloudettteVM App")
   - Hover over the Local Address and click the globe icon 🌐
   - Or right-click and select "Open in Browser"

Your app URL will look like:
```
https://<your-codespace-name>-3000.app.github.dev
```

### If the Server Isn't Running

If for any reason the server didn't start automatically:

```bash
# Option 1: Use npm start
npm start

# Option 2: Use the convenience script
./start.sh

# Option 3: Run with development mode
npm run dev
```

### Verifying Everything Works

After opening the application in your browser:

1. ✅ You should see the CloudettteVM login/register page
2. ✅ Register a new account (username + password)
3. ✅ Login with your credentials
4. ✅ Test the Terminal - it should show a working bash prompt
5. ✅ Test the Browser - enter a URL and navigate
6. ✅ Check the App Store - try installing an app

### Troubleshooting in Codespaces

#### Port not accessible
```bash
# Check if the server is running
ps aux | grep node

# Check which ports are listening
netstat -tlnp | grep 3000

# Restart the server
npm start
```

#### Dependencies not installed
```bash
# Manually install dependencies
npm install

# Clean install if there are issues
rm -rf node_modules package-lock.json
npm install
```

#### Database permission errors
```bash
# Remove the database file and restart (data will be lost)
rm -f cloudette.db cloudette.db-shm cloudette.db-wal
npm start
```

#### Terminal not working
The terminal feature requires `node-pty` which is automatically compiled during `npm install`. If you see errors:
```bash
# Rebuild native modules
npm rebuild node-pty

# Or reinstall everything
npm install
```

## 🖥️ Running Locally (Alternative)

If you prefer to run CloudettteVM on your local machine:

### Prerequisites

- **Node.js**: Version 20.x or higher (required)
- **npm**: Version 10.x or higher
- **Operating System**: Linux, macOS, or Windows with WSL2

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/masterofmagic999/cloudettteVM.git
   cd cloudettteVM
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Open in browser**:
   ```
   http://localhost:3000
   ```

### Checking Your Node Version

```bash
# Check Node.js version (must be 20.x or higher)
node --version

# Check npm version
npm --version
```

If you have an older version of Node.js, update it:
- **Using nvm** (recommended):
  ```bash
  nvm install 20
  nvm use 20
  ```
- **Direct download**: https://nodejs.org/

## 🔧 Development Mode

For development with auto-reload capabilities:

```bash
# Install nodemon globally (optional)
npm install -g nodemon

# Run with nodemon
nodemon server.js
```

Or modify `package.json` to add a dev script with watch mode.

## 📦 Environment Variables (Optional)

Create a `.env` file in the root directory for custom configuration:

```env
# Server Configuration
PORT=3000
HOST=0.0.0.0

# Security (REQUIRED for production)
SESSION_SECRET=your-super-secret-key-change-this

# Environment
NODE_ENV=development

# CORS (optional)
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com
```

## 🎯 Features Overview

Once running, you'll have access to:

### 🖥️ Virtual Terminal
- Full Linux bash terminal in your browser
- Install packages: `sudo apt-get install <package>`
- Run commands: `ls`, `cd`, `pwd`, `vim`, `git`, etc.
- Persistent terminal sessions

### 🌐 Secure Proxy Browser
- Browse any website through the secure proxy
- Bypass restrictions and blocks
- Automatic history tracking
- Fast and private browsing

### 👤 User Profiles
- Secure registration and authentication
- Persistent data across sessions
- Tracked browser history
- Tracked installed applications

### 📦 Application Store
- One-click installation of popular apps
- Pre-configured: Node.js, Python, Git, Vim, Curl, Wget
- Track all your installed applications

## 🔒 Security Notes

### For Development
- A random session secret is generated on each restart
- This is fine for development and testing

### For Production
- **ALWAYS** set a persistent `SESSION_SECRET` environment variable
- Use HTTPS/TLS encryption
- Consider implementing additional rate limiting
- Review and adjust CORS settings
- Use strong passwords
- Regular security updates

## 📚 Additional Resources

- **Main README**: See [README.md](./README.md) for full documentation
- **API Documentation**: Check the API Endpoints section in README.md
- **Architecture**: Review the Architecture section for technical details
- **GitHub Repository**: https://github.com/masterofmagic999/cloudettteVM

## 🆘 Getting Help

If you encounter issues:

1. Check this setup guide first
2. Review the [README.md](./README.md) troubleshooting section
3. Check existing [GitHub Issues](https://github.com/masterofmagic999/cloudettteVM/issues)
4. Create a new issue with:
   - Your environment (Codespaces/Local, OS, Node version)
   - Error messages
   - Steps to reproduce

## ✅ Quick Verification Checklist

After setup, verify these work:

- [ ] Application loads in browser
- [ ] Can register a new account
- [ ] Can login successfully
- [ ] Terminal opens and accepts commands
- [ ] Can type in terminal and see output
- [ ] Browser proxy loads a website
- [ ] App Store shows available apps
- [ ] Can view My Apps section
- [ ] Can view Browser History

---

**Ready to start?** Click the badge at the top to launch in Codespaces now! 🚀
