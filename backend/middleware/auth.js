const jwt = require('jsonwebtoken');
const { getUserById } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;

    if (!token) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Token invalide' });
    }

    const user = await getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error('Erreur requireAuth:', error);
    return res.status(500).json({ error: 'Erreur d\'authentification' });
  }
}

module.exports = {
  generateToken,
  verifyToken,
  requireAuth,
};
