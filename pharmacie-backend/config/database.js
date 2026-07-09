const oracledb = require('oracledb');
require('dotenv').config();

const dbConfig = {
  user: process.env.DB_USER || 'zineb1',
  password: process.env.DB_PASSWORD || 'zineb1',
  
  connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/orclpdb'
};

let pool;

async function initialize() {
  try {
    pool = await oracledb.createPool({
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: dbConfig.connectString,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1
    });
    
    console.log('✅ Pool de connexions Oracle créé avec succès');
    console.log(`📍 Connecté à: ${dbConfig.connectString} avec l'utilisateur ${dbConfig.user}`);
    
    // TEST : Vérifier la connexion immédiatement
    const connection = await pool.getConnection();
    const result = await connection.execute(
      `SELECT USER, SYS_CONTEXT('USERENV', 'DB_NAME') as DB_NAME FROM DUAL`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('🔍 Utilisateur connecté:', result.rows[0]);
    
    const tables = await connection.execute(
      `SELECT COUNT(*) as COUNT FROM user_tables WHERE table_name = 'USERS_APP'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('📊 Table USERS_APP existe?', tables.rows[0]);
    
    const count = await connection.execute(
      `SELECT COUNT(*) as COUNT FROM users_app`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('📊 Nombre d\'utilisateurs dans users_app:', count.rows[0]);
    
    await connection.close();
    
  } catch (err) {
    console.error('❌ Erreur de connexion Oracle:', err.message);
    throw err;
  }
}

async function close() {
  if (pool) {
    try {
      await pool.close();
      console.log('✅ Pool de connexions fermé');
    } catch (err) {
      console.error('Erreur lors de la fermeture du pool:', err);
    }
  }
}

function getPool() {
  return pool;
}

module.exports = { initialize, close, getPool };