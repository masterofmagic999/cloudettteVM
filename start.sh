#!/bin/bash

echo "🚀 Starting CloudettteVM..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Start the server
echo "✨ Starting server..."
npm start
