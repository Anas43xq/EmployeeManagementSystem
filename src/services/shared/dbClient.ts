/**
 * Supabase adapter implementing DatabaseClient interface
 * Priority 2: SOLID - Open/Closed Principle (via adapter pattern)
 *
 * Wraps Supabase behind the DatabaseClient abstraction
 * Allows swapping Supabase for another database without changing service code
 */

import { supabase } from '../supabase';
import type { DatabaseClient } from '../../types/interfaces';
import { extractError, AppError } from '../errorHandler';

// Re-export supabase as typed for use across all services
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

/**
 * Supabase adapter - implements DatabaseClient interface
 * Translates abstract DB operations to Supabase API calls
 */
export class SupabaseDatabaseClient implements DatabaseClient {
  async select(query: {
    from: string;
    columns?: string;
    filters?: Array<{ column: string; operator: string; value: unknown }>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
  }): Promise<{ data: unknown[] | null; error: AppError | null }> {
    try {
      const result = await this.raw(async (client) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let queryBuilder = (client as any).from(query.from).select(query.columns || '*');

        if (query.filters) {
          for (const filter of query.filters) {
            queryBuilder = queryBuilder.filter(filter.column, filter.operator as any, filter.value);
          }
        }

        if (query.orderBy) {
          queryBuilder = queryBuilder.order(query.orderBy.column, {
            ascending: query.orderBy.ascending !== false,
          });
        }

        if (query.limit) {
          queryBuilder = queryBuilder.limit(query.limit);
        }

        if (query.offset) {
          queryBuilder = queryBuilder.range(query.offset, query.offset + (query.limit || 1000) - 1);
        }

        const { data, error } = await queryBuilder;
        return { data: data || [], error: extractError(error) };
      });

      return { data: (result.data as unknown[]) || [], error: result.error };
    } catch (err) {
      return { data: null, error: extractError(err) };
    }
  }

  async insert(query: {
    table: string;
    data: Record<string, unknown> | Record<string, unknown>[];
    returning?: string;
  }): Promise<{ data: unknown | unknown[] | null; error: AppError | null }> {
    try {
      const result = await this.raw(async (client) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await (client as any)
          .from(query.table)
          .insert(query.data)
          .select(query.returning || '*');

        if (response.error) {
          return { data: null, error: extractError(response.error) };
        }

        return { data: response.data, error: null };
      });

      return result;
    } catch (err) {
      return { data: null, error: extractError(err) };
    }
  }

  async update(query: {
    table: string;
    data: Record<string, unknown>;
    filters: Array<{ column: string; operator: string; value: unknown }>;
    returning?: string;
  }): Promise<{ data: unknown | unknown[] | null; error: AppError | null }> {
    try {
      const result = await this.raw(async (client) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let queryBuilder = (client as any).from(query.table).update(query.data);

        for (const filter of query.filters) {
          queryBuilder = queryBuilder.filter(filter.column, filter.operator as any, filter.value);
        }

        const response = await queryBuilder.select(query.returning || '*');

        if (response.error) {
          return { data: null, error: extractError(response.error) };
        }

        return { data: response.data, error: null };
      });

      return result;
    } catch (err) {
      return { data: null, error: extractError(err) };
    }
  }

  async delete(query: {
    table: string;
    filters: Array<{ column: string; operator: string; value: unknown }>;
    returning?: string;
  }): Promise<{ data: unknown | unknown[] | null; error: AppError | null }> {
    try {
      const result = await this.raw(async (client) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let queryBuilder = (client as any).from(query.table).delete();

        for (const filter of query.filters) {
          queryBuilder = queryBuilder.filter(filter.column, filter.operator as any, filter.value);
        }

        const response = await queryBuilder.select(query.returning || '*');

        if (response.error) {
          return { data: null, error: extractError(response.error) };
        }

        return { data: response.data, error: null };
      });

      return result;
    } catch (err) {
      return { data: null, error: extractError(err) };
    }
  }

  async rpc(functionName: string, params?: Record<string, unknown>): Promise<{ data: unknown; error: AppError | null }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase as any).rpc(functionName, params);

      if (result.error) {
        return { data: null, error: extractError(result.error) };
      }

      return { data: result.data, error: null };
    } catch (err) {
      return { data: null, error: extractError(err) };
    }
  }

  async raw(builder: (client: any) => Promise<{ data: unknown; error: AppError | null }>): Promise<{ data: unknown; error: AppError | null }> {
    try {
      return await builder(supabase);
    } catch (err) {
      return { data: null, error: extractError(err) };
    }
  }
}

/**
 * Global database client instance
 * Inject this into services instead of importing supabase directly
 */
export const dbClient = new SupabaseDatabaseClient();
