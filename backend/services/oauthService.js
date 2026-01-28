const { google } = require('googleapis');
const fs = require('fs-extra');
const path = require('path');

const SCOPES = ['https://mail.google.com/'];
const TOKEN_PATH = path.join(__dirname, '../data/token.json');
const CREDENTIALS_PATH = path.join(__dirname, '../data/credentials.json');

/**
 * Crée un client OAuth2
 */
function getOAuth2Client(clientId, clientSecret, redirectUri) {
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
}

/**
 * Génère l'URL d'autorisation OAuth2
 */
function getAuthUrl(clientId, clientSecret, redirectUri) {
  const oAuth2Client = getOAuth2Client(clientId, clientSecret, redirectUri);
  
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
}

/**
 * Échange le code d'autorisation contre un token
 */
async function getTokenFromCode(code, clientId, clientSecret, redirectUri) {
  const oAuth2Client = getOAuth2Client(clientId, clientSecret, redirectUri);
  
  const { tokens } = await oAuth2Client.getToken(code);
  return tokens;
}

/**
 * Configure le client OAuth2 avec les tokens
 */
function getAuthorizedClient(clientId, clientSecret, refreshToken) {
  const oAuth2Client = getOAuth2Client(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob');
  oAuth2Client.setCredentials({
    refresh_token: refreshToken
  });
  return oAuth2Client;
}

/**
 * Obtient un access token à partir du refresh token
 */
async function getAccessToken(clientId, clientSecret, refreshToken) {
  try {
    const oAuth2Client = getAuthorizedClient(clientId, clientSecret, refreshToken);
    const { token } = await oAuth2Client.getAccessToken();
    return token;
  } catch (error) {
    throw new Error('Erreur lors de l\'obtention du token: ' + error.message);
  }
}

module.exports = {
  getAuthUrl,
  getTokenFromCode,
  getAccessToken,
  getAuthorizedClient,
  SCOPES
};
