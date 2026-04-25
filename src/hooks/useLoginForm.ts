

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
    
    email,
    password,
    error,
    loading,
    showPassword,
    warnMessage,
    ipMacLimitMessage,
    
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
