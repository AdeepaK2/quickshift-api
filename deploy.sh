#!/bin/bash

# Deployment script for QuickShift API
echo "🚀 Starting deployment process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Run any database migrations if needed
echo "🗄️ Checking database..."
# Add migration commands here if you have them

# Test the application
echo "🧪 Running health check..."
npm run build

# Test if the server starts
echo "🔍 Testing server startup..."
timeout 10s npm start &
SERVER_PID=$!
sleep 5

# Check if server is responding
if curl -f http://localhost:8080/api/health > /dev/null 2>&1; then
    echo "✅ Server health check passed!"
    kill $SERVER_PID
else
    echo "❌ Server health check failed!"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "🎉 Deployment preparation complete!"
echo "💡 Next steps:"
echo "   1. Push to your Git repository"
echo "   2. Configure environment variables in DigitalOcean"
echo "   3. Deploy through DigitalOcean App Platform"
