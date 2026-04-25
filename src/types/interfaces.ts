

import type { AppError } from '../lib/errorHandler';


export interface DatabaseClient {
  
  select(query: {
    from: string;
    columns?: string;
    filters?: Array<{ column: string; operator: string; value: unknown }>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
  }): Promise<{ data: unknown[] | null; error: AppError | null }>;

  
  insert(query: {
    table: string;
    data: Record<string, unknown> | Record<string, unknown>[];
    returning?: string;
  }): Promise<{ data: unknown | unknown[] | null; error: AppError | null }>;

  
  update(query: {
    table: string;
    data: Record<string, unknown>;
    filters: Array<{ column: string; operator: string; value: unknown }>;
    returning?: string;
  }): Promise<{ data: unknown | unknown[] | null; error: AppError | null }>;

  
  delete(query: {
    table: string;
    filters: Array<{ column: string; operator: string; value: unknown }>;
    returning?: string;
  }): Promise<{ data: unknown | unknown[] | null; error: AppError | null }>;

  
  rpc(functionName: string, params?: Record<string, unknown>): Promise<{ data: unknown; error: AppError | null }>;

  
  raw(builder: (client: unknown) => Promise<{ data: unknown; error: AppError | null }>): Promise<{ data: unknown; error: AppError | null }>;
}


export interface AuthClient {
  
  getUser(): Promise<{ user: { id: string; email: string } | null; error: AppError | null }>;

  
  signIn(email: string, password: string): Promise<{ data: unknown; error: AppError | null }>;

  
  signOut(): Promise<{ error: AppError | null }>;

  
  getSession(): Promise<{ data: unknown; error: AppError | null }>;

  
  refreshSession(): Promise<{ data: unknown; error: AppError | null }>;

  
  onAuthStateChange(callback: (event: string, session: unknown) => void): () => void;
}


export interface NotificationClient {
  
  sendEmail(options: {
    to: string;
    subject: string;
    body: string;
    type: string;
    data?: Record<string, unknown>;
  }): Promise<{ success: boolean; error?: AppError }>;

  
  sendSMS(options: {
    to: string;
    message: string;
    type: string;
  }): Promise<{ success: boolean; error?: AppError }>;

  
  sendInApp(options: {
    userId: string;
    title: string;
    message: string;
    type: string;
    data?: Record<string, unknown>;
  }): Promise<{ success: boolean; error?: AppError }>;
}


export interface ServiceConfig {
  dbClient: DatabaseClient;
  authClient?: AuthClient;
  notificationClient?: NotificationClient;
  logError?: (error: AppError, context?: string) => void;
}
