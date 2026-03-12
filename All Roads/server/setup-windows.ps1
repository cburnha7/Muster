# Muster Backend Setup Script for Windows
Write-Host "🚀 Muster Backend Setup" -ForegroundColor Green
Write-Host ""

# Check if PostgreSQL is already installed
$pgPath = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
$pgInstalled = Test-Path $pgPath

if ($pgInstalled) {
    Write-Host "✅ PostgreSQL is already installed" -ForegroundColor Green
} else {
    Write-Host "📥 PostgreSQL not found. Please install it manually:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Download installer from:" -ForegroundColor Cyan
    Write-Host "https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Option 2: Use winget (Windows Package Manager):" -ForegroundColor Cyan
    Write-Host "winget install PostgreSQL.PostgreSQL" -ForegroundColor White
    Write-Host ""
    Write-Host "After installation, run this script again." -ForegroundColor Yellow
    Write-Host ""
    
    $response = Read-Host "Do you want to try installing with winget now? (y/n)"
    if ($response -eq "y") {
        Write-Host "Installing PostgreSQL with winget..." -ForegroundColor Cyan
        winget install PostgreSQL.PostgreSQL
        Write-Host ""
        Write-Host "⚠️  Please restart your terminal and run this script again" -ForegroundColor Yellow
        exit
    } else {
        exit
    }
}

Write-Host ""
Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Cyan
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📝 Setting up environment file..." -ForegroundColor Cyan
if (!(Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Created .env file" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Edit .env and update your PostgreSQL password" -ForegroundColor Yellow
    Write-Host "   Default password during PostgreSQL installation is usually 'postgres'" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "🗄️  Setting up database..." -ForegroundColor Cyan
Write-Host "Please enter your PostgreSQL password (default is usually 'postgres'):" -ForegroundColor Yellow
$env:PGPASSWORD = Read-Host -AsSecureString | ConvertFrom-SecureString -AsPlainText

# Create database
Write-Host "Creating database..." -ForegroundColor Cyan
$createDbCommand = "CREATE DATABASE muster;"
echo $createDbCommand | & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost 2>&1

Write-Host ""
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Cyan
npm run prisma:generate

Write-Host ""
Write-Host "📊 Running database migrations..." -ForegroundColor Cyan
npm run prisma:migrate

Write-Host ""
Write-Host "🌱 Seeding database with sample data..." -ForegroundColor Cyan
npm run prisma:seed

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the server, run:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "The API will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test credentials:" -ForegroundColor Cyan
Write-Host "  Email: edwin@muster.app" -ForegroundColor White
Write-Host "  Password: password123" -ForegroundColor White
