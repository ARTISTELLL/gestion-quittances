# 📧 Guide : Configuration Gmail pour l'envoi de quittances

## ⚠️ Problème courant : "Invalid login" ou "BadCredentials"

Si vous recevez cette erreur, c'est que vous utilisez votre **mot de passe Gmail normal** au lieu d'un **"Mot de passe d'application"**.

Gmail n'accepte plus les mots de passe normaux pour les applications tierces. Vous devez créer un "Mot de passe d'application" spécial.

## 📝 Étapes pour créer un mot de passe d'application Gmail

### Étape 1 : Activer la validation en 2 étapes

1. Allez sur https://myaccount.google.com/security
2. Si la "Validation en 2 étapes" n'est pas activée :
   - Cliquez sur "Validation en 2 étapes"
   - Suivez les instructions pour l'activer
   - C'est obligatoire pour créer un mot de passe d'application

### Étape 2 : Créer un mot de passe d'application

1. Allez sur https://myaccount.google.com/apppasswords
   - Ou : Compte Google → Sécurité → Validation en 2 étapes → Mots de passe des applications

2. Si vous ne voyez pas cette option :
   - Assurez-vous que la validation en 2 étapes est activée
   - Vous devrez peut-être vous authentifier à nouveau

3. Dans "Sélectionner une application" :
   - Choisissez "Autre (nom personnalisé)"
   - Tapez : "Gestion Quittances" (ou un nom de votre choix)

4. Cliquez sur "Générer"

5. **Copiez le mot de passe de 16 caractères** qui s'affiche
   - Format : `xxxx xxxx xxxx xxxx` (4 groupes de 4 caractères)
   - Vous pouvez copier avec ou sans les espaces

### Étape 3 : Utiliser le mot de passe dans l'application

1. Ouvrez l'application Gestion Quittances
2. Cliquez sur "⚙️ Configuration"
3. Dans "Email Gmail" :
   - **Email Gmail** : Votre adresse Gmail complète (ex: `votre.email@gmail.com`)
   - **Mot de passe** : Le mot de passe d'application de 16 caractères (pas votre mot de passe Gmail normal !)
   - **Nom de l'expéditeur** : Optionnel (ex: `Votre Nom <votre.email@gmail.com>`)

4. Cliquez sur "🔍 Tester la connexion Gmail" pour vérifier que ça fonctionne

5. Si le test réussit, cliquez sur "Sauvegarder"

## ✅ Vérification

- Le mot de passe d'application fait **16 caractères** (souvent affiché en 4 groupes de 4)
- Vous pouvez créer plusieurs mots de passe d'application pour différentes applications
- Si vous perdez un mot de passe d'application, supprimez-le et créez-en un nouveau

## 🔒 Sécurité

- Les mots de passe d'application sont plus sûrs que votre mot de passe principal
- Vous pouvez révoquer un mot de passe d'application à tout moment
- Chaque application peut avoir son propre mot de passe d'application

## ❓ Problèmes courants

**"Je ne vois pas l'option Mots de passe des applications"**
- Vérifiez que la validation en 2 étapes est activée
- Essayez de vous déconnecter et reconnecter à votre compte Google

**"Le test de connexion échoue toujours"**
- Vérifiez que vous avez copié le mot de passe complet (16 caractères)
- Assurez-vous de ne pas avoir d'espaces supplémentaires
- Essayez de créer un nouveau mot de passe d'application

**"J'ai oublié mon mot de passe d'application"**
- Allez sur https://myaccount.google.com/apppasswords
- Supprimez l'ancien et créez-en un nouveau
- Mettez à jour la configuration dans l'application
