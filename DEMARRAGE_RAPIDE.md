# 🚀 Démarrage Rapide

## Installation en 3 étapes

### 1. Installer les dépendances

```bash
# Backend
cd backend
npm install

# Frontend (dans un nouveau terminal)
cd frontend
npm install
```

### 2. Démarrer l'application

**Option A : Script automatique**
```bash
./start.sh
```

**Option B : Manuellement**

Terminal 1 (Backend) :
```bash
cd backend
npm start
```

Terminal 2 (Frontend) :
```bash
cd frontend
npm start
```

### 3. Configuration Gmail

1. Ouvrez l'application dans votre navigateur : `http://localhost:3000`
2. Cliquez sur "⚙️ Configuration"
3. Renseignez :
   - **Propriétaire** : Nom, prénom, adresse
   - **Email Gmail** : Votre adresse Gmail
   - **Mot de passe** : Un "Mot de passe d'application" Gmail (voir ci-dessous)
   - **Nom de l'application** : Le nom qui apparaîtra sur les quittances

#### Comment obtenir un mot de passe d'application Gmail :

1. Allez sur https://myaccount.google.com/security
2. Activez la validation en 2 étapes si ce n'est pas déjà fait
3. Allez dans "Mots de passe des applications"
4. Sélectionnez "Autre" et tapez "Gestion Quittances"
5. Copiez le mot de passe de 16 caractères généré
6. Utilisez ce mot de passe dans la configuration (pas votre mot de passe Gmail normal)

## Utilisation

1. **Modifier les locataires** : Cliquez sur ✏️ pour éditer
2. **Ajouter un locataire** : Cliquez sur "+ Ajouter un locataire"
3. **Envoyer une quittance** : Cliquez sur "Envoyer quittance" (ou attendez le 1er du mois pour l'envoi automatique)

## ⚠️ Important

- Le backend doit rester actif pour que l'envoi automatique fonctionne le 1er de chaque mois
- Les quittances sont automatiquement générées et envoyées à 9h00 le 1er de chaque mois
- Tous les locataires avec un email et un loyer > 0 recevront leur quittance automatiquement
