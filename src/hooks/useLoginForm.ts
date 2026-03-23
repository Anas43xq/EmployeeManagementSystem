/**
 * useLoginForm hook
 * Priority 3: SOLID - Extract Login.tsx complexity
 * Encapsulates login form state and error handling
 */

import { useState } from 'react';

export interface LoginFormState {
  email: string;
  password: string;
  error: string;
  loading: boolean;
  showPassword: boolean;
  warnMessage: string;
  ipMacLimitMessage: string;
}

export interface LoginFormActions {
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setError: (error: string) => void;
  setLoading: (loading: boolean) => void;
  toggleShowPassword: () => void;
  setWarnMessage: (msg: string) => void;
  setIpMacLimitMessage: (msg: string) => void;
  clearErrors: () => void;
  reset: () => void;
}

/**
 * Manages all form-related state for Login component
 * Separates form state concerns from auth/routing logic
 */
export function useLoginForm(): LoginFormState & LoginFormActions {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [warnMessage, setWarnMessage] = useState('');
  const [ipMacLimitMessage, setIpMacLimitMessage] = useState('');

  const toggleShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  const clearErrors = () => {
    setError('');
    setWarnMessage('');
    setIpMacLimitMessage('');
  };

  const reset = () => {
    setEmail('');
    setPassword('');
    setError('');
    setLoading(false);
    setShowPassword(false);
    setWarnMessage('');
    setIpMacLimitMessage('');
  };

  return {
    // State
    email,
    password,
    error,
    loading,
    showPassword,
    warnMessage,
    ipMacLimitMessage,
    // Actions
    setEmail,
    setPassword,
    setError,
    setLoading,
    toggleShowPassword,
    setWarnMessage,
    setIpMacLimitMessage,
    clearErrors,
    reset,
  };
}
