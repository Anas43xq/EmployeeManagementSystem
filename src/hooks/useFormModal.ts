import { useState, useCallback } from 'react';

interface UseFormModalReturn<T> {
  formData: T;
  setFormData: React.Dispatch<React.SetStateAction<T>>;
  submitting: boolean;
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  error: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
  showModal: boolean;
  openModal: (data?: Partial<T>) => void;
  closeModal: () => void;
}

export default function useFormModal<T extends Record<string, any>>(
  initialValues: T
): UseFormModalReturn<T> {
  const [formData, setFormData] = useState<T>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  const openModal = useCallback((data?: Partial<T>) => {
    setFormData(data ? { ...initialValues, ...data } : initialValues);
    setError('');
    setShowModal(true);
  }, [initialValues]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setError('');
  }, []);

  return {
    formData,
    setFormData,
    submitting,
    setSubmitting,
    error,
    setError,
    showModal,
    openModal,
    closeModal,
  };
}
