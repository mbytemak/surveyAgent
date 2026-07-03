import fs from 'fs';
import path from 'path';
import pool from '../models/db';
import { SurveyResponse } from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import { updateSurveySummaries } from './sentimentAnalysis';

const STOP_WORDS = new Set([
  'the','and','is','in','to','of','for','with','a','an','it','on','that','this','but','are','was','were','be','or','as','at','by','from','have','has','had','their','they','them','its','not','no','into','out','up','down','over','under','very','so','too','just','more','about'
]);

function extractBasicTopics(comment: string): string[] {
  const words = comment
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !STOP_WORDS.has(word) && word.length > 3);

  const counts = words.reduce<Record<string, number>>((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);
}

export interface CSVRow {
  runId: string;
  uniqueId: string;
  q1: string;
  q2: string;
  q3?: string;
  q4?: string;
  q5?: string;
  q6?: string;
  q7?: string;
  q8?: string;
  q9?: string;
  q10?: string;
}

export async function importCSV(filePath: string): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  try {
    // Read and parse CSV manually (simple CSV parsing)
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file must have header and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const records: CSVRow[] = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const record: any = {};
      headers.forEach((header, idx) => {
        record[header] = values[idx];
      });
      return record;
    });

    if (records.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Create or get survey by runId
    const runId = records[0].runId;
    if (!runId) {
      throw new Error('Missing runId in CSV');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if survey already exists
      const surveyResult = await client.query(
        'SELECT id FROM surveys WHERE run_id = $1',
        [runId]
      );

      let surveyId: string;
      if (surveyResult.rows.length > 0) {
        surveyId = surveyResult.rows[0].id;
      } else {
        // Create new survey
        const newSurvey = await client.query(
          'INSERT INTO surveys (run_id) VALUES ($1) RETURNING id',
          [runId]
        );
        surveyId = newSurvey.rows[0].id;
      }

      // Insert responses
      for (const record of records) {
        try {
          // Validate required fields
          if (!record.uniqueId || record.q1 === undefined || record.q1 === '' || !record.q2) {
            errors.push(`Row skipped: Missing required fields (uniqueId, q1, q2)`);
            skipped++;
            continue;
          }

          // Check if response already exists (by runId + uniqueId)
          const existingResponse = await client.query(
            'SELECT id FROM survey_responses WHERE run_id = $1 AND unique_id = $2',
            [runId, record.uniqueId]
          );

          if (existingResponse.rows.length > 0) {
            skipped++;
            continue;
          }

          // Coerce q1 into a nullable number for DB insert
          const q1Value = record.q1 && record.q1 !== '' ? parseInt(String(record.q1), 10) : null;

          const topics = record.q2 ? extractBasicTopics(record.q2) : [];
          const sentiment = null;
          const severity = null;

          await client.query(
            `INSERT INTO survey_responses 
            (id, survey_id, run_id, unique_id, q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, sentiment, topics, severity)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
            [
              uuidv4(),
              surveyId,
              runId,
              record.uniqueId,
              q1Value,
              record.q2 || null,
              record.q3 || null,
              record.q4 || null,
              record.q5 || null,
              record.q6 || null,
              record.q7 || null,
              record.q8 || null,
              record.q9 || null,
              record.q10 || null,
              sentiment,
              topics.length > 0 ? topics : null,
              severity,
            ]
          );

          imported++;
        } catch (rowError) {
          errors.push(`Row error: ${(rowError as Error).message}`);
        }
      }

      await client.query('COMMIT');
    } catch (transactionError) {
      await client.query('ROLLBACK');
      throw transactionError;
    } finally {
      client.release();
    }

    // Delete the CSV file after successful import
    fs.unlinkSync(filePath);

    try {
      await updateSurveySummaries();
    } catch (summaryError) {
      console.error('Failed to update survey summaries after import:', summaryError);
    }

    return { imported, skipped, errors };
  } catch (error) {
    errors.push(`Import error: ${(error as Error).message}`);
    return { imported: 0, skipped: 0, errors };
  }
}

export async function watchCSVFolder(folderPath: string, importInterval: number = 60000) {
  // Watch folder for new CSV files and import them
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  setInterval(async () => {
    try {
      const files = fs.readdirSync(folderPath);
      const csvFiles = files.filter((file) => file.endsWith('.csv'));

      for (const file of csvFiles) {
        const filePath = path.join(folderPath, file);
        console.log(`Importing CSV: ${file}`);
        const result = await importCSV(filePath);
        console.log(`Import result:`, result);
      }
    } catch (error) {
      console.error('CSV watcher error:', error);
    }
  }, importInterval);
}
