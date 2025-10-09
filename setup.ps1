Write-Host "🚀 Configuration de Yu-Gi-Oh! Collection Web" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Vérification du fichier .env
if (-not (Test-Path ".env")) {
    Write-Host "📄 Création du fichier .env..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Fichier .env créé ! Pensez à modifier DATABASE_URL avec vos paramètres." -ForegroundColor Green
} else {
    Write-Host "✅ Fichier .env existe déjà" -ForegroundColor Green
}

# Installation des dépendances
Write-Host "📦 Installation des dépendances..." -ForegroundColor Yellow
npm install

# Génération du client Prisma
Write-Host "🔧 Génération du client Prisma..." -ForegroundColor Yellow
npx prisma generate

Write-Host ""
Write-Host "🎯 Configuration terminée !" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Étapes suivantes :" -ForegroundColor Cyan
Write-Host "1. Modifiez le fichier .env avec votre DATABASE_URL" -ForegroundColor White
Write-Host "2. Assurez-vous que PostgreSQL est installé et démarré" -ForegroundColor White
Write-Host "3. Exécutez: npx prisma db push" -ForegroundColor White
Write-Host "4. Lancez le serveur: npm run dev" -ForegroundColor White
Write-Host ""