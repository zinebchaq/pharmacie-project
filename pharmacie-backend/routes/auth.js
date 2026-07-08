const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/database');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  console.log('📝 Login attempt:', { username, password });

  let connection;

  try {
    const pool = getPool();
    connection = await pool.getConnection();
    
    console.log('🔌 Connected to DB');

    // TEST : Récupérer TOUS les utilisateurs d'abord
    const allUsers = await connection.execute(
      `SELECT * FROM users_app`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    console.log('👥 ALL USERS:', JSON.stringify(allUsers.rows, null, 2));

    // Requête simple sans LOWER
    const result = await connection.execute(
      `SELECT * FROM users_app WHERE username = :username AND password = :password`,
      { username, password },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('🔍 Query result:', JSON.stringify(result.rows, null, 2));
    console.log('📊 Rows count:', result.rows.length);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects'
      });
    }

    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.ID, username: user.USERNAME, role: user.ROLE },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ Login successful for:', user.USERNAME);

    res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: {
        id: user.ID,
        username: user.USERNAME,
        role: user.ROLE
      }
    });

  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).json({ success: false, message: 'Token manquant' });
  
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalide' });
  }
};

router.get('/me', verifyToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.post('/logout', verifyToken, (req, res) => {
  res.json({ success: true, message: 'Déconnexion réussie' });
});

module.exports = router;
module.exports.verifyToken = verifyToken;