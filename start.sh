#!/bin/bash

echo "🚀 Démarrage de l'application Gestion Quittances"
echo ""

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Installer les dépendances du backend si nécessaire
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installation des dépendances du backend..."
    cd backend
    npm install
    cd ..
fi

# Installer les dépendances du frontend si nécessaire
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installation des dépendances du frontend..."
    cd frontend
    npm install
    cd ..
fi

echo ""
echo "✅ Démarrage du backend..."
cd backend
npm start &
BACKEND_PID=$!

echo "⏳ Attente du démarrage du backend..."
sleep 3

echo ""
echo "✅ Démarrage du frontend..."
cd ../frontend
npm start &
FRONTEND_PID=$!

echo ""
echo "✨ Application démarrée !"
echo "   - Backend: http://localhost:3001"
echo "   - Frontend: http://localhost:3000"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter l'application"

# Attendre que les processus se terminent
wait $BACKEND_PID $FRONTEND_PID
