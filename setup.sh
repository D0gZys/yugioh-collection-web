#!/bin/bash

echo "🚀 Configuration de Yu-Gi-Oh! Collection Web"
echo "============================================="

# Vérification du fichier .env
if [ ! -f ".env" ]; then
    echo "📄 Création du fichier .env..."
    cp .env.example .env
    echo "✅ Fichier .env créé ! Pensez à modifier DATABASE_URL avec vos paramètres."
else
    echo "✅ Fichier .env existe déjà"
fi

# Installation des dépendances
echo "📦 Installation des dépendances..."
npm install

# Génération du client Prisma
echo "🔧 Génération du client Prisma..."
npx prisma generate

echo ""
echo "🎯 Configuration terminée !"
echo ""
echo "📋 Étapes suivantes :"
echo "1. Modifiez le fichier .env avec votre DATABASE_URL"
echo "2. Assurez-vous que PostgreSQL est installé et démarré"
echo "3. Exécutez: npx prisma db push"
echo "4. Lancez le serveur: npm run dev"
echo ""