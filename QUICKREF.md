# CloudettteVM - Quick Reference

## 🚀 Quick Start Commands

### Starting the Application

```bash
# Option 1: Standard npm start
npm start

# Option 2: Using the convenience script
./start.sh

# Option 3: Development mode
npm run dev
```

### First Time Setup (if needed)

```bash
# Install dependencies (should happen automatically in Codespaces)
npm install

# Check Node version (should be 20+)
node --version

# Check npm version
npm --version
```

## 🔧 Troubleshooting Commands

### Server Issues

```bash
# Check if server is running
ps aux | grep node

# Check which process is using port 3000
netstat -tlnp | grep 3000
# or
lsof -i :3000

# Kill a hung server process (replace PID with actual process ID)
kill <PID>

# Restart the server
npm start
```

### Dependency Issues

```bash
# Clean reinstall of dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild native modules (if node-pty fails)
npm rebuild node-pty

# Clear npm cache
npm cache clean --force
npm install
```

### Database Issues

```bash
# Remove database (WARNING: This deletes all user data!)
# IMPORTANT: Ensure you are in the cloudettteVM directory first!
cd /workspaces/cloudettteVM  # or your project directory path
rm -f cloudette.db cloudette.db-shm cloudette.db-wal

# Check if database exists
ls -lh *.db*

# View database file size
du -h cloudette.db
```

### Logs and Debugging

```bash
# Run server with verbose output
npm start 2>&1 | tee server.log

# Check recent logs
tail -f server.log

# Check for errors in logs
grep -i error server.log
```

## 📦 Testing the Application

### Using curl to test API endpoints

```bash
# Test homepage
curl http://localhost:3000/

# Register a test user
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}'

# Login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}' \
  -c cookies.txt

# Get user info (requires authentication)
curl http://localhost:3000/api/user \
  -b cookies.txt

# Logout
curl -X POST http://localhost:3000/api/logout \
  -b cookies.txt

# Cleanup
rm -f cookies.txt
```

## 🌐 Accessing the Application

### In GitHub Codespaces

```bash
# The URL will be automatically shown when the server starts
# Format: https://<codespace-name>-3000.app.github.dev

# You can also find it in the PORTS tab:
# 1. Click on "PORTS" tab in the bottom panel
# 2. Find port 3000
# 3. Click the globe icon or "Open in Browser"
```

### Local Development

```
http://localhost:3000
```

## 🔐 Environment Variables

Create a `.env` file in the project root:

```bash
# Create .env file
cat > .env << 'EOF'
# Server Configuration
PORT=3000
HOST=0.0.0.0

# Security (REQUIRED for production)
SESSION_SECRET=your-super-secret-key-here

# Environment
NODE_ENV=development

# CORS (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000
EOF
```

## 📊 Useful Checks

### Check Installation

```bash
# Verify all required packages are installed
npm list --depth=0

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

### Check Server Health

```bash
# Test if server is responding
curl -I http://localhost:3000/

# Test WebSocket connection (requires wscat)
npm install -g wscat
wscat -c ws://localhost:3000
```

### Check System Resources

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top -bn1 | head -20

# Check Node.js process resource usage
ps aux | grep node
```

## 🔍 Common Issues and Solutions

### "Cannot find module" error
```bash
npm install
```

### "Port 3000 already in use"
```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9
# or
fuser -k 3000/tcp
```

### "Permission denied" errors
```bash
# Make start.sh executable
chmod +x start.sh

# Fix ownership (if needed)
sudo chown -R $USER:$USER .
```

### Terminal not working in app
```bash
# Rebuild node-pty
npm rebuild node-pty

# Verify bash is available
which bash

# Test terminal manually
node -e "const pty = require('node-pty'); console.log('node-pty works!');"
```

### Database locked error
```bash
# Close all connections and restart
# WARNING: Ensure you're in the cloudettteVM directory
cd /workspaces/cloudettteVM  # or your project directory
rm -f cloudette.db-shm cloudette.db-wal
npm start
```

## 📚 Additional Resources

- **Main Documentation**: [README.md](./README.md)
- **Setup Guide**: [SETUP.md](./SETUP.md)
- **GitHub Repository**: https://github.com/masterofmagic999/cloudettteVM

## 🆘 Getting Help

1. Check this reference guide
2. Review [SETUP.md](./SETUP.md) troubleshooting section
3. Check existing [GitHub Issues](https://github.com/masterofmagic999/cloudettteVM/issues)
4. Create a new issue with error details

---

**Need to reset everything?**

```bash
# Complete reset (WARNING: This deletes ALL data and dependencies!)
# CRITICAL: Make absolutely sure you are in the cloudettteVM directory!
pwd  # Verify you're in the right directory
cd /workspaces/cloudettteVM  # or your project directory
npm run clean  # Uses explicit paths for safety
# or manually:
rm -rf ./node_modules ./package-lock.json ./cloudette.db*
npm install
npm start
```
