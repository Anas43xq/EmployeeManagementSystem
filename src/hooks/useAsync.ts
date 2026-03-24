import { useState, useEffect } from 'react';
import { getErrorMessage } from '../services/errorHandler';

/** Generic async data fetcher with loading and error state. */
export function useAsync<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fn()
      .then(setData)
      .catch(err => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
