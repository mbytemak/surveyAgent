import pool from '../src/models/db';

export async function runMigrations() {
  console.log('Running migrations...');

  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS surveys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      run_id VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      total_responses INT DEFAULT 0,
      avg_rating DECIMAL(3, 2),
      sentiment_positive INT DEFAULT 0,
      sentiment_neutral INT DEFAULT 0,
      sentiment_negative INT DEFAULT 0
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS survey_responses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      run_id VARCHAR(255) NOT NULL,
      unique_id VARCHAR(255) NOT NULL,
      q1 INT,
      q2 TEXT,
      q3 TEXT,
      q4 TEXT,
      q5 TEXT,
      q6 TEXT,
      q7 TEXT,
      q8 TEXT,
      q9 TEXT,
      q10 TEXT,
      sentiment DECIMAL(3, 2),
      topics TEXT[],
      severity VARCHAR(20) DEFAULT 'neutral',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(run_id, unique_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      response_id UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
      severity VARCHAR(20) NOT NULL,
      comment_snippet TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved BOOLEAN DEFAULT FALSE
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_surveys_run_id ON surveys(run_id);
    CREATE INDEX IF NOT EXISTS idx_responses_run_id ON survey_responses(run_id);
    CREATE INDEX IF NOT EXISTS idx_responses_survey_id ON survey_responses(survey_id);
    CREATE INDEX IF NOT EXISTS idx_responses_severity ON survey_responses(severity);
    CREATE INDEX IF NOT EXISTS idx_responses_created_at ON survey_responses(created_at);
    CREATE INDEX IF NOT EXISTS idx_alerts_survey_id ON alerts(survey_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
  `);

  console.log('✓ Migrations completed successfully');
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
