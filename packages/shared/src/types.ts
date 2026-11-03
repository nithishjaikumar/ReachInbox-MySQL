import { EmailStatus } from './constants';

export interface User {
  id: string;
  googleId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Sender {
  id: string;
  userId: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  userId: string;
  senderId: string;
  subject: string;
  body: string;
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  totalRecipients: number;
  createdAt: string;
  updatedAt: string;
  sender?: Sender;
}

export interface Email {
  id: string;
  campaignId: string;
  senderId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatus;
  attempts: number;
  bullJobId: string | null;
  idempotencyKey: string;
  errorMessage: string | null;
  etherealPreviewUrl: string | null;
  createdAt: string;
  updatedAt: string;
  campaign?: Campaign;
  sender?: Sender;
}

export interface SlackConnection {
  id: string;
  userId: string;
  slackUserId: string;
  teamId: string;
  teamName: string;
  channelId: string | null;
  connected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleEmailRequest {
  senderId: string;
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  services: {
    database: 'connected' | 'disconnected';
    redis: 'connected' | 'disconnected';
    elasticsearch: 'connected' | 'disconnected';
  };
  timestamp: string;
}

export interface EmailSearchParams {
  q?: string;
  status?: EmailStatus;
  senderId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
