/**
 * Supabase adapter implementing DatabaseClient interface
 * Priority 2: SOLID - Open/Closed Principle (via adapter pattern)
 *
 * Wraps Supabase behind the DatabaseClient abstraction
 * Allows swapping Supabase for another database without changing service code
 */

import { supabase } from '../supabase';
import type { DatabaseClient } from '../../types/interfaces';
import { extractError, type AppError } from '../errorHandler';

// Re-export supabase as typed for use across all services
export const db = supabase;

interface QueryResult<TData = unknown> {
  data: TData;
  error: unknown;
}

interface SelectQueryBuilder extends PromiseLike<QueryResult<unknown[] | null>> {
  filter(column: string, operator: string, value: unknown): SelectQueryBuilder;
  order(column: string, options?: { ascending?: boolean }): SelectQueryBuilder;
  limit(count: number): SelectQueryBuilder;
  range(from: number, to: number): SelectQueryBuilder;
}

interface MutationQueryBuilder {
  filter(column: string, operator: string, value: unknown): MutationQueryBuilder;
  select(columns?: string): Promise<QueryResult<unknown | unknown[] | null>>;
}

interface InsertQueryBuilder {
  select(columns?: string): Promise<QueryResult<unknown | unknown[] | null>>;
}

interface TableQuerySource {
  select(columns?: string): SelectQueryBuilder;
  insert(data: Record<string, unknown> | Record<string, unknown>[]): InsertQueryBuilder;
  update(data: Record<string, unknown>): MutationQueryBuilder;
  delete(): MutationQueryBuilder;
}

interface DynamicSupabaseClient {
  from(table: string): TableQuerySource;
  rpc(functionName: string, params?: Record<string, unknown>): Promise<QueryResult<unknown>>;
}

// Keep the dynamic client cast isolated here so the rest of the service layer stays strongly typed.
const runtimeClient = supabase as unknown as DynamicSupabaseClient;

/** Converts a single snake_case key to camelCase. */
const snakeToCamel = (key: string): string =>
  key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/** Recursively maps a Supabase snake_case response object to camelCase keys. */
export function toCamel<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map((item) => toCamel(item)) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        snakeToCamel(k),
        toCamel(v),
      ])
    ) as T;
  }
  return value as T;
}

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
        const querySource = client as DynamicSupabaseClient;
        let queryBuilder = querySource.from(query.from).select(query.columns || '*');

        if (query.filters) {
          for (const filter of query.filters) {
            queryBuilder = queryBuilder.filter(filter.column, filter.operator, filter.value);
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
        const querySource = client as DynamicSupabaseClient;
        const response = await querySource
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
        const querySource = client as DynamicSupabaseClient;
        let queryBuilder = querySource.from(query.table).update(query.data);

        for (const filter of query.filters) {
          queryBuilder = queryBuilder.filter(filter.column, filter.operator, filter.value);
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
        const querySource = client as DynamicSupabaseClient;
        let queryBuilder = querySource.from(query.table).delete();

        for (const filter of query.filters) {
          queryBuilder = queryBuilder.filter(filter.column, filter.operator, filter.value);
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
      const result = await runtimeClient.rpc(functionName, params);

      if (result.error) {
        return { data: null, error: extractError(result.error) };
      }

      return { data: result.data, error: null };
    } catch (err) {
      return { data: null, error: extractError(err) };
    }
  }

  async raw(builder: (client: unknown) => Promise<{ data: unknown; error: AppError | null }>): Promise<{ data: unknown; error: AppError | null }> {
    try {
      return await builder(runtimeClient);
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
