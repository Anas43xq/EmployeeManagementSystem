import { useState, useCallback } from 'react';

/**
 * Reusable hook for managing delete confirmation workflows.
 * Handles: pending delete ID, delete confirmation UI, error states
 */
export function useDeleteConfirmation() {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const requestDelete = useCallback((id: string) => {
    setPendingDeleteId(id);
  }, []);

  const cancelDelete = useCallback(() => {
    setPendingDeleteId(null);
  }, []);

  const confirmDelete = useCallback(
    async (onConfirmCallback: (id: string) => Promise<void>) => {
      if (!pendingDeleteId) return;
      
      const id = pendingDeleteId;
      setDeleting(true);
      
      try {
        await onConfirmCallback(id);
        setPendingDeleteId(null);
      } finally {
        setDeleting(false);
      }
    },
    [pendingDeleteId]
  );

  return {
    pendingDeleteId,
    deleting,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
}
