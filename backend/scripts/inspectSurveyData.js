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
    const surveys = await pool.query('SELECT * FROM surveys ORDER BY created_at DESC');
    console.log('surveys:', surveys.rows);
    const responses = await pool.query('SELECT * FROM survey_responses ORDER BY created_at DESC LIMIT 20');
    console.log('responses count:', responses.rowCount);
    console.log('responses sample:', responses.rows);
    const topics = await pool.query("SELECT DISTINCT unnest(topics) AS topic, COUNT(*) AS count FROM survey_responses WHERE topics IS NOT NULL GROUP BY topic ORDER BY count DESC");
    console.log('topics:', topics.rows);
  } catch (err) {
    console.error('ERROR:', err.message, err.stack);
  } finally {
    await pool.end();
  }
})();