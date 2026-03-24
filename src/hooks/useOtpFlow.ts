/**
 * useOtpFlow hook
 * Priority 3: SOLID - Extract Login.tsx complexity
 * Encapsulates OTP authentication flow logic
 */

import { useState } from 'react';
import { sendLoginOtp } from '../services/session/loginAttempts';

export interface OtpFlowState {
  otpEmail: string;
  isOtpScreenActive: boolean;
  triggerOtpFlow: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetOtpFlow: () => void;
  setOtpEmail: (email: string) => void;
  setIsOtpScreenActive: (active: boolean) => void;
}

/**
 * Manages OTP authentication flow
 * Handles OTP sending and screen state transitions
 */
export function useOtpFlow(): OtpFlowState {
  const [otpEmail, setOtpEmail] = useState('');
  const [isOtpScreenActive, setIsOtpScreenActive] = useState(false);

  const triggerOtpFlow = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: sendError } = await sendLoginOtp(email);
      if (sendError) return { success: false, error: sendError };
      setOtpEmail(email);
      setIsOtpScreenActive(true);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send OTP';
      return { success: false, error: errorMessage };
    }
  };

  const resetOtpFlow = () => {
    setOtpEmail('');
    setIsOtpScreenActive(false);
  };

  return {
    otpEmail,
    isOtpScreenActive,
    triggerOtpFlow,
    resetOtpFlow,
    setOtpEmail,
    setIsOtpScreenActive,
  };
}
