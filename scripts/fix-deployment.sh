#!/bin/bash

# Fix deployment issues script
echo "🔧 Fixing deployment issues..."

# Remove conflicting lockfiles
echo "📦 Cleaning up lockfiles..."
rm -f pnpm-lock.yaml
rm -f yarn.lock

# Clean node_modules
echo "🧹 Cleaning node_modules..."
rm -rf node_modules

# Install dependencies with npm
echo "📥 Installing dependencies with npm..."
npm install

# Verify build works
echo "🏗️ Testing build..."
npm run build

echo "✅ Deployment fix complete!"
echo "🚀 You can now deploy to Vercel/GitHub Pages"
