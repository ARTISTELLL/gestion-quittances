# 🔧 Dépannage - Port 3000 ne fonctionne pas

## Solutions possibles

### 1. Vérifier que le frontend est démarré

Le frontend doit être démarré dans un terminal séparé :

```bash
cd gestion-quittances
./demarrer-frontend.sh
```

Ou manuellement :
```bash
cd frontend
npm start
```

### 2. Vérifier que le port 3000 n'est pas déjà utilisé

```bash
lsof -ti:3000
```

Si une commande retourne un PID, le port est utilisé. Vous pouvez :
- Arrêter le processus qui utilise le port
- Ou utiliser un autre port en définissant `PORT=3001` avant `npm start`

### 3. Vérifier que les dépendances sont installées

```bash
cd frontend
npm install
```

### 4. Démarrer le backend en premier

Le backend doit être démarré avant le frontend :

**Terminal 1 (Backend)** :
```bash
cd gestion-quittances
./demarrer-backend.sh
```

**Terminal 2 (Frontend)** :
```bash
cd gestion-quittances
./demarrer-frontend.sh
```

### 5. Vérifier les erreurs dans la console

Ouvrez la console du navigateur (F12) et vérifiez s'il y a des erreurs.

### 6. Utiliser un autre port

Si le port 3000 est bloqué, vous pouvez utiliser un autre port :

```bash
cd frontend
PORT=3002 npm start
```

Puis accédez à `http://localhost:3002`

### 7. Vérifier la configuration du proxy

Le fichier `frontend/package.json` contient :
```json
"proxy": "http://localhost:3001"
```

Assurez-vous que le backend tourne sur le port 3001.

## Démarrage complet recommandé

1. **Terminal 1** - Démarrer le backend :
   ```bash
   cd gestion-quittances/backend
   npm start
   ```
   Attendez de voir : `Serveur démarré sur le port 3001`

2. **Terminal 2** - Démarrer le frontend :
   ```bash
   cd gestion-quittances/frontend
   npm start
   ```
   Le navigateur devrait s'ouvrir automatiquement sur `http://localhost:3000`

## Si rien ne fonctionne

1. Vérifiez que Node.js est installé :
   ```bash
   node --version
   npm --version
   ```

2. Réinstallez les dépendances :
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

3. Vérifiez les logs d'erreur dans les terminaux
