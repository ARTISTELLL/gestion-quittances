# 🔧 Correction de l'erreur redirect_uri_mismatch

## ❌ Erreur actuelle
```
Erreur 400 : redirect_uri_mismatch
```

## ✅ Solution

Vous devez ajouter l'URI de redirection exacte dans Google Cloud Console.

### Étape 1 : Aller dans Google Cloud Console

1. Allez sur : https://console.cloud.google.com/apis/credentials
2. Cliquez sur votre OAuth 2.0 Client ID (celui avec votre Client ID)
3. Faites défiler jusqu'à "Authorized redirect URIs"

### Étape 2 : Ajouter l'URI de redirection

**Ajoutez EXACTEMENT cette URI** (copiez-collez) :

```
http://localhost:3001/api/oauth/callback
```

⚠️ **IMPORTANT** :
- Pas d'espace avant ou après
- Pas de `/` à la fin
- Utilisez `http://` (pas `https://`) pour le développement local
- Le port doit être `3001` (port du backend)

### Étape 3 : Sauvegarder

1. Cliquez sur "SAVE" (Enregistrer)
2. Attendez quelques secondes que les changements soient appliqués

### Étape 4 : Réessayer

1. Retournez dans l'application
2. Cliquez à nouveau sur "🔗 Se connecter à Gmail avec OAuth2"
3. La connexion devrait maintenant fonctionner

## 📋 URI à ajouter (copier-coller)

```
http://localhost:3001/api/oauth/callback
```

## 🔍 Vérification

Si ça ne fonctionne toujours pas, vérifiez :
- ✅ L'URI est exactement `http://localhost:3001/api/oauth/callback` (sans espaces, sans slash final)
- ✅ Vous avez cliqué sur "SAVE" après l'ajout
- ✅ Vous avez attendu quelques secondes après la sauvegarde
- ✅ Le backend tourne bien sur le port 3001

## 🌐 Pour la production

Si vous déployez l'application en production, vous devrez aussi ajouter l'URI de production :
```
https://votre-domaine.com/api/oauth/callback
```
