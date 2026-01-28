# ✅ Configuration OAuth2 - Étapes finales

Vos identifiants OAuth2 ont été configurés dans l'application !

## 📋 Identifiants configurés

- **Client ID** : `86307071635-fevpeklknkckjc41nea47l3tf9jkqotf.apps.googleusercontent.com`
- **Client Secret** : `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`
- **Email** : `bierataise1996@gmail.com`

## ⚠️ IMPORTANT : Configurer l'URI de redirection

Avant de pouvoir vous connecter, vous devez ajouter l'URI de redirection dans Google Cloud Console :

1. Allez sur https://console.cloud.google.com/apis/credentials
2. Cliquez sur votre OAuth 2.0 Client ID
3. Dans "Authorized redirect URIs", ajoutez :
   ```
   http://localhost:3001/api/oauth/callback
   ```
4. Cliquez sur "Save"

## 🚀 Se connecter à Gmail

1. Ouvrez l'application : http://localhost:3000
2. Cliquez sur **⚙️ Configuration**
3. Vous devriez voir vos identifiants OAuth2 déjà remplis
4. Cliquez sur **🔗 Se connecter à Gmail avec OAuth2**
5. Une fenêtre s'ouvre - connectez-vous avec votre compte Gmail
6. Autorisez l'application à accéder à Gmail
7. La fenêtre se ferme automatiquement
8. Cliquez sur **🔍 Tester la connexion Gmail** pour vérifier

## ✅ C'est tout !

Une fois connecté, le refresh token sera sauvegardé et vous pourrez envoyer des quittances automatiquement.
