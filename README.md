# Gestion Quittances - Application de gestion automatique de quittances de loyer

Application web pour la gestion automatique des quittances de loyer avec génération de PDF et envoi par email.

## Fonctionnalités

- ✅ Interface sobre et moderne
- ✅ Gestion des locataires (5 par défaut, extensible)
- ✅ Génération automatique de quittances au format PDF
- ✅ Envoi automatique par email le premier de chaque mois
- ✅ Toutes les informations légales incluses
- ✅ Configuration simple via l'interface

## Installation

### Prérequis

- Node.js (version 14 ou supérieure)
- npm ou yarn

### Installation des dépendances

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

## Configuration Gmail

Pour utiliser l'envoi d'emails avec Gmail, vous devez :

1. Activer la validation en 2 étapes sur votre compte Gmail
2. Générer un "Mot de passe d'application" :
   - Allez dans votre compte Google → Sécurité
   - Sous "Connexion à Google", sélectionnez "Validation en 2 étapes"
   - En bas, sélectionnez "Mots de passe des applications"
   - Sélectionnez "Autre" et entrez "Gestion Quittances"
   - Copiez le mot de passe généré (16 caractères)

3. Dans l'application, allez dans Configuration et entrez :
   - Votre email Gmail
   - Le mot de passe d'application généré

## Démarrage

### ⚠️ Important : Démarrez d'abord le backend, puis le frontend

### Étape 1 : Démarrer le backend

**Terminal 1** :
```bash
cd gestion-quittances/backend
npm start
```

Attendez de voir : `Serveur démarré sur le port 3001`

### Étape 2 : Démarrer le frontend

**Terminal 2** (nouveau terminal) :
```bash
cd gestion-quittances/frontend
npm start
```

L'application s'ouvre automatiquement sur `http://localhost:3000`

### Alternative : Scripts de démarrage

Vous pouvez aussi utiliser les scripts fournis :

```bash
# Terminal 1
./demarrer-backend.sh

# Terminal 2
./demarrer-frontend.sh
```

### ⚠️ Si le port 3000 ne fonctionne pas

Consultez le fichier `TROUBLESHOOTING.md` pour les solutions de dépannage.

## Utilisation

1. **Configuration initiale** :
   - Cliquez sur "⚙️ Configuration" dans l'en-tête
   - Renseignez les informations du propriétaire
   - Configurez votre compte Gmail (email + mot de passe d'application)
   - Sauvegardez

2. **Gestion des locataires** :
   - Les 5 locataires par défaut sont affichés
   - Cliquez sur "✏️" pour modifier un locataire
   - Cliquez sur "🗑️" pour supprimer un locataire
   - Cliquez sur "+ Ajouter un locataire" pour en ajouter

3. **Envoi de quittances** :
   - Les quittances sont automatiquement générées et envoyées le premier de chaque mois à 9h
   - Vous pouvez aussi envoyer manuellement une quittance en cliquant sur "Envoyer quittance"

## Structure des données

Les données sont stockées dans :
- `backend/data/locataires.json` : Liste des locataires
- `backend/data/config.json` : Configuration de l'application
- `backend/quittances/` : Dossier contenant les PDF générés

## Fonctionnement automatique

L'application utilise `node-cron` pour planifier l'envoi automatique des quittances :
- **Fréquence** : Le 1er de chaque mois à 9h00
- **Action** : Génération du PDF + envoi par email à tous les locataires configurés

## Notes importantes

- Assurez-vous que le backend tourne en permanence pour que l'envoi automatique fonctionne
- Les quittances sont générées avec toutes les informations légales requises
- Le logo du modèle original a été retiré et remplacé par le nom de l'application
