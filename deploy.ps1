# PowerShell Deployment Script for QuickShift API
Write-Host "Starting deployment process..." -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: package.json not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm ci --only=production

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies!" -ForegroundColor Red
    exit 1
}

# Test the application build
Write-Host "Running build process..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Deployment preparation complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. git add . && git commit -m `"Deploy configuration`" && git push" -ForegroundColor White
Write-Host "   2. Configure environment variables in DigitalOcean App Platform" -ForegroundColor White
Write-Host "   3. Deploy through DigitalOcean App Platform dashboard" -ForegroundColor White

Write-Host "" -ForegroundColor White
Write-Host "Required Environment Variables:" -ForegroundColor Cyan
Write-Host "   - NODE_ENV=production" -ForegroundColor White
Write-Host "   - PORT=8080" -ForegroundColor White
Write-Host "   - MONGODB_URI=<your-mongodb-connection>" -ForegroundColor White
Write-Host "   - JWT_SECRET=<your-jwt-secret>" -ForegroundColor White
Write-Host "   - STRIPE_SECRET_KEY=<your-stripe-key>" -ForegroundColor White
Write-Host "   - SENDGRID_API_KEY=<your-sendgrid-key>" -ForegroundColor White
