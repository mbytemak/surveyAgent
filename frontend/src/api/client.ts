import axios from 'axios';
import { Survey, SurveySummary, Alert, AgentResponse } from '../types';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const normalizedApiUrl = rawApiUrl.replace(/\/$/, '');
const API_URL = normalizedApiUrl.endsWith('/api') ? normalizedApiUrl : `${normalizedApiUrl}/api`;

const client = axios.create({
  baseURL: API_URL,
});

export const surveyAPI = {
  getSurveys: () => client.get<Survey[]>('/surveys'),
  getSurveySummary: (runId: string) => client.get<SurveySummary>(`/surveys/${runId}/summary`),
  getSurveyResponses: (runId: string, page = 1, limit = 20, severity?: string) =>
    client.get(`/surveys/${runId}/responses`, { params: { page, limit, severity } }),
  getSurveyTopics: (runId: string) => client.get(`/surveys/${runId}/topics`),
};

export const alertAPI = {
  getAlerts: () => client.get<Alert[]>('/alerts'),
  resolveAlert: (alertId: string) => client.put(`/alerts/${alertId}/resolve`),
};

export const agentAPI = {
  ask: (runId: string, question: string) =>
    client.post<AgentResponse>('/agent/ask', { runId, question }),
};

export const uploadAPI = {
  uploadCSV: (csvContent: string) =>
    client.post('/upload', csvContent, {
      headers: { 'Content-Type': 'text/plain' },
    }),
};
