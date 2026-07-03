const dotenv = require('dotenv');
dotenv.config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'survey_analytics',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

(async () => {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('surveys','survey_responses','alerts') ORDER BY table_name");
    console.log('tables:', res.rows);
    const version = await pool.query('SELECT version()');
    console.log('postgres version:', version.rows[0].version);
  } catch (err) {
    console.error('DB error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();