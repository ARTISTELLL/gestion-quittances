const nodemailer = require('nodemailer');
const { getAccessToken } = require('./oauthService');

let transporter = null;
let appTransporter = null;

async function initTransporter(config) {
  if (transporter && config.email.oauth2?.refreshToken && config.email.user === transporter.options.auth?.user) {
    return transporter;
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret || !config.email.oauth2?.refreshToken) {
    throw new Error('Configuration OAuth2 incomplète. Connectez-vous à Gmail via OAuth2 (et configurez les variables d\'env du serveur).');
  }

  try {
    const accessToken = await getAccessToken(
      clientId,
      clientSecret,
      config.email.oauth2.refreshToken
    );
    
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: config.email.user,
        clientId,
        clientSecret,
        refreshToken: config.email.oauth2.refreshToken,
        accessToken: accessToken
      }
    });
    
    return transporter;
  } catch (error) {
    throw new Error('Erreur OAuth2: ' + error.message);
  }
}

function ensureOAuthConfig(config) {
  const hasOAuth2 = config.email.oauth2?.refreshToken
    && process.env.GOOGLE_OAUTH_CLIENT_ID
    && process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!config.email.user || !hasOAuth2) {
    throw new Error('Configuration email non complète. Connectez-vous à Gmail via OAuth2.');
  }
}

function getAppEmailConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const user = process.env.APP_EMAIL_USER;
  const refreshToken = process.env.APP_EMAIL_OAUTH_REFRESH_TOKEN;
  const from = process.env.APP_EMAIL_FROM || user;

  if (!clientId || !clientSecret || !user || !refreshToken) {
    return null;
  }

  return { clientId, clientSecret, user, refreshToken, from };
}

async function initAppTransporter() {
  const cfg = getAppEmailConfig();
  if (!cfg) {
    return null;
  }

  if (appTransporter && appTransporter.options.auth?.user === cfg.user) {
    return appTransporter;
  }

  const accessToken = await getAccessToken(
    cfg.clientId,
    cfg.clientSecret,
    cfg.refreshToken
  );

  appTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: cfg.user,
      clientId: cfg.clientId,
      clientSecret: cfg.clientSecret,
      refreshToken: cfg.refreshToken,
      accessToken
    }
  });

  return appTransporter;
}

async function getAppTransporterOrThrow() {
  const transporter = await initAppTransporter();
  if (!transporter) {
    throw new Error('Email app non configuré (APP_EMAIL_USER / APP_EMAIL_OAUTH_REFRESH_TOKEN manquants)');
  }
  return transporter;
}

async function sendAppEmail({ to, subject, text, html }) {
  const transporter = await getAppTransporterOrThrow();
  const from = process.env.APP_EMAIL_FROM || process.env.APP_EMAIL_USER;
  await transporter.sendMail({ from, to, subject, text, html });
}

async function sendEmail(locataire, config, pdfPath, mois, annee) {
  ensureOAuthConfig(config);
  
  const transporter = await initTransporter(config);
  
  try {
    await transporter.verify();
  } catch (error) {
    throw error;
  }
  
  const mailOptions = {
    from: config.email.from || config.email.user,
    to: locataire.email,
    bcc: config.email.user,
    subject: `Quittance de loyer - ${mois} ${annee}`,
    text: `Bonjour ${locataire.prenom} ${locataire.nom},\n\nVeuillez trouver ci-joint votre quittance de loyer pour le mois de ${mois} ${annee}.\n\nCordialement,\n${config.proprietaire.prenom} ${config.proprietaire.nom}`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <p>Bonjour ${locataire.prenom} ${locataire.nom},</p>
        <p>Veuillez trouver ci-joint votre quittance de loyer pour le mois de <strong>${mois} ${annee}</strong>.</p>
        <p>Montant total : <strong>${(locataire.loyer + locataire.charges).toFixed(2)} €</strong></p>
        <p>Cordialement,<br>${config.proprietaire.prenom} ${config.proprietaire.nom}</p>
      </div>
    `,
    attachments: [
      {
        filename: `quittance_${mois}_${annee}.pdf`,
        path: pdfPath
      }
    ]
  };
  
  await transporter.sendMail(mailOptions);
}

async function sendWelcomeEmail(payload) {
  const { email, appName } = payload;
  await sendAppEmail({
    to: email,
    subject: `Bienvenue sur ${appName}`,
    text: `Bienvenue sur ${appName} !\n\nVotre compte est prêt. Vous pouvez maintenant vous connecter.`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Bienvenue sur ${appName} !</h2>
        <p>Votre compte est prêt. Vous pouvez maintenant vous connecter.</p>
      </div>
    `
  });
  return true;
}

async function sendPasswordResetEmail(payload) {
  const { email, appName, resetUrl } = payload;
  await sendAppEmail({
    to: email,
    subject: `Réinitialiser votre mot de passe – ${appName}`,
    text: `Vous avez demandé la réinitialisation de votre mot de passe.\n\nLien : ${resetUrl}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Réinitialiser votre mot de passe</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p><a href="${resetUrl}">Cliquez ici pour réinitialiser votre mot de passe</a></p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      </div>
    `
  });
  return true;
}

async function testEmailConnection(config) {
  try {
    ensureOAuthConfig(config);
  } catch (error) {
    return { success: false, message: error.message };
  }
  
  try {
    const transporter = await initTransporter(config);
    await transporter.verify();
    return { success: true, message: 'Connexion Gmail réussie !' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function sendSupportEmail(payload, config) {
  ensureOAuthConfig(config);

  const transporter = await initTransporter(config);

  const { nom, email, message } = payload;

  const mailOptions = {
    from: config.email.from || config.email.user,
    to: config.email.user,
    replyTo: email || config.email.user,
    subject: `Demande d'aide depuis l'application quittances`,
    text: `Nom: ${nom || 'Non renseigné'}\nEmail: ${email || 'Non renseigné'}\n\nMessage:\n${message}`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Nouvelle demande d'aide</h2>
        <p><strong>Nom:</strong> ${nom || 'Non renseigné'}</p>
        <p><strong>Email:</strong> ${email || 'Non renseigné'}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-line;">${message}</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  testEmailConnection,
  sendSupportEmail
};
