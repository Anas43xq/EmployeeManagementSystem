/**
 * Shared utility functions used across all query services
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FilterableQuery = any;

/**
 * Applies an optional `.eq()` filter to a Supabase query builder.
 * Returns the query unchanged when value is undefined.
 */
export function applyFilter(query: FilterableQuery, column: string, value: string | undefined): FilterableQuery {
  return value ? query.eq(column, value) : query;
}
