#!/bin/bash

echo "🚀 Démarrage du frontend..."
echo ""

cd "$(dirname "$0")/frontend"

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

echo ""
echo "✅ Démarrage du serveur de développement..."
echo "   L'application sera accessible sur http://localhost:3000"
echo ""
echo "⚠️  Assurez-vous que le backend est démarré sur le port 3001"
echo "   Pour démarrer le backend : cd backend && npm start"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter"
echo ""

npm start
