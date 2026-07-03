export interface Survey {
  id: string;
  runId: string;
  createdAt: string;
  totalResponses: number;
  avgRating: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface SurveyResponse {
  id: string;
  runId: string;
  uniqueId: string;
  q1: number;
  q2: string;
  q3?: string;
  q4?: string;
  q5?: string;
  q6?: string;
  q7?: string;
  q8?: string;
  q9?: string;
  q10?: string;
  sentiment: number;
  topics: string[];
  severity: 'critical' | 'warning' | 'neutral';
  createdAt: string;
}

export interface SurveySummary {
  runId: string;
  totalResponses: number;
  avgRating: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topTopics: Array<{
    topic: string;
    count: number;
    avgSentiment: number;
  }>;
  criticalAlertsCount: number;
  createdAt: string;
}

export interface Alert {
  id: string;
  surveyId: string;
  responseId: string;
  severity: 'critical' | 'warning';
  commentSnippet: string;
  createdAt: string;
}

export interface AgentResponse {
  answer: string;
  dataPoints: Array<{ key: string; value: string }>;
  sources: string[];
}
