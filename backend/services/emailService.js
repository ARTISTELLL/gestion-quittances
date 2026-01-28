const nodemailer = require('nodemailer');
const fs = require('fs-extra');
const { getAccessToken } = require('./oauthService');

let transporter = null;

async function initTransporter(config) {
  if (transporter && config.email.oauth2?.refreshToken && config.email.user === transporter.options.auth?.user) {
    return transporter;
  }

  if (!config.email.oauth2?.clientId || !config.email.oauth2?.refreshToken) {
    throw new Error('Configuration OAuth2 incomplète. Connectez-vous à Gmail via OAuth2.');
  }

  try {
    const accessToken = await getAccessToken(
      config.email.oauth2.clientId,
      config.email.oauth2.clientSecret,
      config.email.oauth2.refreshToken
    );
    
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: config.email.user,
        clientId: config.email.oauth2.clientId,
        clientSecret: config.email.oauth2.clientSecret,
        refreshToken: config.email.oauth2.refreshToken,
        accessToken: accessToken
      }
    });
    
    return transporter;
  } catch (error) {
    throw new Error('Erreur OAuth2: ' + error.message);
  }
}

async function sendEmail(locataire, config, pdfPath, mois, annee) {
  const hasOAuth2 = config.email.oauth2 && config.email.oauth2.clientId && config.email.oauth2.refreshToken;
  
  if (!config.email.user || !hasOAuth2) {
    throw new Error('Configuration email non complète. Connectez-vous à Gmail via OAuth2.');
  }
  
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

async function testEmailConnection(config) {
  const hasOAuth2 = config.email.oauth2 && config.email.oauth2.clientId && config.email.oauth2.refreshToken;
  
  if (!config.email.user || !hasOAuth2) {
    return { 
      success: false, 
      message: 'Configuration email non complète. Connectez-vous à Gmail via OAuth2.' 
    };
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
  const hasOAuth2 = config.email.oauth2 && config.email.oauth2.clientId && config.email.oauth2.refreshToken;

  if (!config.email.user || !hasOAuth2) {
    throw new Error('Configuration email non complète. Connectez-vous à Gmail via OAuth2.');
  }

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

module.exports = { sendEmail, testEmailConnection, sendSupportEmail };
