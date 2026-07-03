export interface Survey {
  id: string;
  runId: string;
  createdAt: Date;
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
  surveyId: string;
  runId: string;
  uniqueId: string;
  q1: number; // rating 1-10
  q2: string; // comments
  q3?: string;
  q4?: string;
  q5?: string;
  q6?: string;
  q7?: string;
  q8?: string;
  q9?: string;
  q10?: string;
  sentiment: number; // 0-1
  topics: string[]; // extracted topics
  severity: 'critical' | 'warning' | 'neutral'; // alert level
  createdAt: Date;
}

export interface Alert {
  id: string;
  surveyId: string;
  responseId: string;
  severity: 'critical' | 'warning';
  commentSnippet: string;
  createdAt: Date;
  resolved: boolean;
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
  createdAt: Date;
}
