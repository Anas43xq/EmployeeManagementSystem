/**
 * Abstract service interfaces for dependency injection
 * Priority 1: SOLID - Dependency Inversion Principle
 * 
 * Allows services to depend on abstractions, not concrete implementations
 * Enables testing, swapping implementations, and loose coupling
 */

import type { AppError } from '../services/errorHandler';

/**
 * Abstract database client interface
 * Decouples services from Supabase implementation details
 * All database operations flow through this interface
 */
export interface DatabaseClient {
  /**
   * Execute a SELECT query
   */
  select(query: {
    from: string;
    columns?: string;
    filters?: Array<{ column: string; operator: string; value: unknown }>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
  }): Promise<{ data: unknown[] | null; error: AppError | null }>;

  /**
   * Execute an INSERT query
   */
  insert(query: {
    table: string;
    data: Record<string, unknown> | Record<string, unknown>[];
    returning?: string;
  }): Promise<{ data: unknown | unknown[] | null; error: AppError | null }>;

  /**
   * Execute an UPDATE query
   */
  update(query: {
    table: string;
    data: Record<string, unknown>;
    filters: Array<{ column: string; operator: string; value: unknown }>;
    returning?: string;
  }): Promise<{ data: unknown | unknown[] | null; error: AppError | null }>;

  /**
   * Execute a DELETE query
   */
  delete(query: {
    table: string;
    filters: Array<{ column: string; operator: string; value: unknown }>;
    returning?: string;
  }): Promise<{ data: unknown | unknown[] | null; error: AppError | null }>;

  /**
   * Call a database function
   */
  rpc(functionName: string, params?: Record<string, unknown>): Promise<{ data: unknown; error: AppError | null }>;

  /**
   * Direct query builder for complex queries (escape hatch)
   * Allows sophisticated queries without rebuilding entire interface
   */
  raw(builder: (client: unknown) => Promise<{ data: unknown; error: AppError | null }>): Promise<{ data: unknown; error: AppError | null }>;
}

/**
 * Abstract authentication client interface
 * Decouples from Supabase auth implementation
 */
export interface AuthClient {
  /**
   * Get currently authenticated user
   */
  getUser(): Promise<{ user: { id: string; email: string } | null; error: AppError | null }>;

  /**
   * Sign in with email/password
   */
  signIn(email: string, password: string): Promise<{ data: unknown; error: AppError | null }>;

  /**
   * Sign out
   */
  signOut(): Promise<{ error: AppError | null }>;

  /**
   * Get current session
   */
  getSession(): Promise<{ data: unknown; error: AppError | null }>;

  /**
   * Refresh session
   */
  refreshSession(): Promise<{ data: unknown; error: AppError | null }>;

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: unknown) => void): () => void;
}

/**
 * Abstract notification service interface
 * Decouples from specific notification implementations (email, SMS, push, etc.)
 */
export interface NotificationClient {
  /**
   * Send email notification
   */
  sendEmail(options: {
    to: string;
    subject: string;
    body: string;
    type: string;
    data?: Record<string, unknown>;
  }): Promise<{ success: boolean; error?: AppError }>;

  /**
   * Send SMS notification
   */
  sendSMS(options: {
    to: string;
    message: string;
    type: string;
  }): Promise<{ success: boolean; error?: AppError }>;

  /**
   * Send in-app notification
   */
  sendInApp(options: {
    userId: string;
    title: string;
    message: string;
    type: string;
    data?: Record<string, unknown>;
  }): Promise<{ success: boolean; error?: AppError }>;
}

/**
 * Configuration for services
 * Allows composition and customization
 */
export interface ServiceConfig {
  dbClient: DatabaseClient;
  authClient?: AuthClient;
  notificationClient?: NotificationClient;
  logError?: (error: AppError, context?: string) => void;
}
