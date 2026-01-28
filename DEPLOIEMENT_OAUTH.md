# Connexion Gmail : côté déploiement (une seule fois)

Pour que chaque utilisateur puisse **se connecter à Gmail en un clic** (sans saisir de Client ID / Client Secret), la personne qui **déploie** l’application doit configurer une seule fois les clés OAuth de l’app.

## 1. Créer un projet Google Cloud (une fois)

1. Va sur [Google Cloud Console](https://console.cloud.google.com/) → Crée un projet ou choisis-en un.
2. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
3. Type : **Web application**.
4. **Authorized redirect URIs** : ajoute l’URL de callback de ton backend, par ex. :
   - En local : `http://localhost:3001/api/oauth/callback`
   - En prod (Vercel) : `https://ton-backend.vercel.app/api/oauth/callback`
5. Récupère le **Client ID** et le **Client Secret**.

## 2. Variables d’environnement du backend (une fois)

Sur le **backend** (Vercel : projet backend → Settings → Environment Variables), ajoute :

| Nom | Valeur |
|-----|--------|
| `GOOGLE_OAUTH_CLIENT_ID` | Ton Client ID (ex. `xxx.apps.googleusercontent.com`) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Ton Client Secret |

Redeploie le backend après avoir ajouté ces variables.

## 3. Côté utilisateur (chaque propriétaire)

- L’utilisateur ouvre **Configuration**.
- Il saisit son **adresse Gmail** (champ « Email Gmail »).
- Il clique sur **Se connecter à Gmail**.
- Une fenêtre Google s’ouvre : il se connecte et autorise l’app.
- Aucune clé à récupérer ni à coller.

Une fois cette configuration faite une fois par l’hébergeur, tous les utilisateurs peuvent ainsi connecter leur Gmail en un clic.
