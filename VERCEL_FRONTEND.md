# Déployer le frontend sur Vercel

Pour que les changements (Connexion, Déconnexion, etc.) apparaissent sur le site :

## Option A – Projet avec racine du repo

1. Vercel Dashboard → ton projet **gestion-quittances** → **Settings** → **General**.
2. **Root Directory** : laisse **vide** ou mets `.` (racine du repo).
3. **Build Command** : laisse vide (le `vercel.json` à la racine utilise `npm run build`).
4. **Output Directory** : laisse vide (le `vercel.json` utilise `frontend/build`).
5. **Install Command** : laisse vide (le `vercel.json` utilise `cd frontend && npm ci`).
6. **Redeploy** : onglet **Deployments** → dernier déploiement → **⋯** → **Redeploy**.

## Option B – Projet déjà en "frontend"

Si ton projet a **Root Directory** = `frontend` :

- Chaque `git push` doit déjà reconstruire le frontend.
- Vérifie l’onglet **Deployments** : le dernier déploiement est-il **Ready** (vert) ou **Failed** ?
- Si **Failed**, ouvre le déploiement et regarde les **Build Logs** pour l’erreur.
- Une fois un déploiement **Ready**, ouvre le site en **navigation privée** ou fais **Cmd+Shift+R** (Mac) / **Ctrl+Shift+R** (Windows) pour forcer le rechargement sans cache.

## Après déploiement

- Ouvre l’URL du site (ex. `https://gestion-quittances-xxx.vercel.app`).
- Recharge en **navigation privée** ou **Cmd+Shift+R** pour éviter le cache.
- Tu dois voir **Connexion** en haut à droite quand tu n’es pas connecté, et après connexion **Connecté : ton@email.com** + **Déconnexion**.
