# 🔐 Guide : Configuration OAuth2 Gmail (Recommandé)

## Pourquoi OAuth2 ?

OAuth2 est la méthode **recommandée** par Google pour se connecter à Gmail. C'est :
- ✅ Plus simple : connexion directe à votre compte
- ✅ Plus sécurisé : pas besoin de mots de passe d'application
- ✅ Plus pratique : pas de configuration complexe

## 📝 Étapes de configuration

### Étape 1 : Créer un projet dans Google Cloud Console

1. Allez sur https://console.cloud.google.com/
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Donnez un nom à votre projet (ex: "Gestion Quittances")

### Étape 2 : Activer l'API Gmail

1. Dans le menu, allez dans **APIs & Services** → **Library**
2. Recherchez "Gmail API"
3. Cliquez sur **Enable** (Activer)

### Étape 3 : Créer les identifiants OAuth2

1. Allez dans **APIs & Services** → **Credentials**
2. Cliquez sur **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Si c'est la première fois, configurez l'écran de consentement OAuth :
   - Choisissez **External** (ou Internal si vous avez Google Workspace)
   - Remplissez les informations requises
   - Ajoutez votre email dans "Test users" si nécessaire
   - Continuez jusqu'à la fin

4. Créez l'OAuth client ID :
   - **Application type** : Choisissez **Web application**
   - **Name** : "Gestion Quittances" (ou un nom de votre choix)
   - **Authorized redirect URIs** : 
     - Pour développement local : `http://localhost:3001/api/oauth/callback`
     - Pour production : `https://votre-domaine.com/api/oauth/callback`
   - Cliquez sur **Create**

5. **Copiez le Client ID et le Client Secret** qui s'affichent

### Étape 4 : Configurer dans l'application

1. Ouvrez l'application Gestion Quittances
2. Cliquez sur **⚙️ Configuration**
3. Dans la section **Email Gmail** :
   - Entrez votre **Email Gmail**
   - Dans **Option 1 : OAuth2** :
     - Collez votre **Client ID**
     - Collez votre **Client Secret**
   - Cliquez sur **🔗 Se connecter à Gmail avec OAuth2**

4. Une fenêtre s'ouvre pour vous connecter à Google :
   - Connectez-vous avec votre compte Gmail
   - Autorisez l'application à accéder à Gmail
   - La fenêtre se ferme automatiquement

5. Testez la connexion avec le bouton **🔍 Tester la connexion Gmail**

6. Si le test réussit, cliquez sur **Sauvegarder**

## ✅ C'est tout !

Une fois configuré, l'application utilisera automatiquement OAuth2 pour envoyer les quittances. Le refresh token est sauvegardé et l'application peut se connecter automatiquement.

## 🔄 Si vous devez vous reconnecter

Si le refresh token expire ou si vous devez vous reconnecter :
1. Allez dans Configuration
2. Cliquez à nouveau sur **🔗 Se connecter à Gmail avec OAuth2**
3. Autorisez à nouveau l'application

## ❓ Problèmes courants

**"redirect_uri_mismatch"**
- Vérifiez que l'URI de redirection dans Google Cloud Console correspond exactement à `http://localhost:3001/api/oauth/callback`

**"access_denied"**
- Assurez-vous d'autoriser toutes les permissions demandées lors de la connexion

**"invalid_client"**
- Vérifiez que le Client ID et Client Secret sont corrects

**Le refresh token n'est pas sauvegardé**
- Assurez-vous que l'écran de consentement OAuth est en mode "Testing" et que votre email est dans la liste des test users

## 📚 Ressources

- [Google Cloud Console](https://console.cloud.google.com/)
- [Documentation Gmail API](https://developers.google.com/gmail/api)
- [Guide OAuth2 Google](https://developers.google.com/identity/protocols/oauth2)
