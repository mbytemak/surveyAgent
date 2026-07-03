import { OpenAI } from 'openai';
import pool from '../models/db';

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing or empty');
  }
  return new OpenAI({ apiKey });
}

export interface AgentResponse {
  answer: string;
  dataPoints: Array<{ key: string; value: string }>;
  sources: string[];
}

export async function queryAgent(runId: string, question: string): Promise<AgentResponse> {
  try {
    // Get survey data
    const surveyResult = await pool.query('SELECT id FROM surveys WHERE run_id = $1', [runId]);

    if (surveyResult.rows.length === 0) {
      throw new Error('Survey not found');
    }

    const surveyId = surveyResult.rows[0].id;

    // Get all responses for context
    const responsesResult = await pool.query(
      `SELECT q1, q2, sentiment, topics, severity FROM survey_responses 
       WHERE survey_id = $1
       ORDER BY created_at DESC`,
      [surveyId]
    );

    const responses = responsesResult.rows;

    // Build context for LLM
    const context = buildContext(responses);

    // Query LLM
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an AI agent analyzing customer survey feedback. 
You have access to survey response data including ratings (1-10), comments, sentiment scores (0-1), and extracted topics.
Provide clear, concise answers to user questions about the survey data.
Format your response as: [ANSWER] followed by [DATA_POINTS] as key-value pairs.`,
        },
        {
          role: 'user',
          content: `Survey Context:\n${context}\n\nQuestion: ${question}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 1000,
    });

    const answer = response.choices[0].message.content || 'Unable to process question';

    // Parse response
    const dataPoints: Array<{ key: string; value: string }> = [];
    const sources: string[] = ['Survey responses', 'Sentiment analysis'];

    // Extract data points from answer
    const lines = answer.split('\n');
    let inDataPoints = false;
    for (const line of lines) {
      if (line.includes('[DATA_POINTS]')) {
        inDataPoints = true;
        continue;
      }
      if (inDataPoints && line.includes(':')) {
        const [key, value] = line.split(':');
        if (key && value) {
          dataPoints.push({ key: key.trim(), value: value.trim() });
        }
      }
    }

    return {
      answer,
      dataPoints,
      sources,
    };
  } catch (error) {
    throw new Error(`Agent query failed: ${(error as Error).message}`);
  }
}

function buildContext(responses: any[]): string {
  const totalResponses = responses.length;
  const avgRating = (responses.reduce((sum, r) => sum + (r.q1 || 0), 0) / totalResponses).toFixed(2);
  const positiveCount = responses.filter((r) => r.sentiment > 0.6).length;
  const negativeCount = responses.filter((r) => r.sentiment < 0.4).length;
  const criticalCount = responses.filter((r) => r.severity === 'critical').length;

  // Get top topics
  const topicMap = new Map<string, number>();
  responses.forEach((r) => {
    if (r.topics) {
      r.topics.forEach((topic: string) => {
        topicMap.set(topic, (topicMap.get(topic) || 0) + 1);
      });
    }
  });
  const topTopics = Array.from(topicMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((t) => `${t[0]} (${t[1]} mentions)`)
    .join(', ');

  // Get sample comments
  const positiveComments = responses
    .filter((r) => r.sentiment > 0.6 && r.q2)
    .slice(0, 2)
    .map((r) => `"${r.q2}"`)
    .join(' | ');

  const negativeComments = responses
    .filter((r) => r.sentiment < 0.4 && r.q2)
    .slice(0, 2)
    .map((r) => `"${r.q2}"`)
    .join(' | ');

  return `
Total Responses: ${totalResponses}
Average Rating: ${avgRating}/10
Positive Feedback: ${positiveCount} (${((positiveCount / totalResponses) * 100).toFixed(1)}%)
Negative Feedback: ${negativeCount} (${((negativeCount / totalResponses) * 100).toFixed(1)}%)
Critical Issues: ${criticalCount}

Top Topics: ${topTopics}

Sample Positive Comments: ${positiveComments || 'None'}
Sample Negative Comments: ${negativeComments || 'None'}
`;
}
