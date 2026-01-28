#!/bin/bash

echo "🚀 Démarrage du backend..."
echo ""

cd "$(dirname "$0")/backend"

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
echo "✅ Démarrage du serveur backend..."
echo "   API accessible sur http://localhost:3001"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter"
echo ""

npm start
