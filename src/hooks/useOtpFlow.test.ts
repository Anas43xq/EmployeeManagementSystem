import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOtpFlow } from './useOtpFlow';

// Mock the loginAttempts service
vi.mock('../services/session/loginAttempts', () => ({
  sendLoginOtp: vi.fn().mockResolvedValue({ error: null }),
}));

import { sendLoginOtp } from '../services/session/loginAttempts';

describe('useOtpFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (sendLoginOtp as any).mockResolvedValue({ error: null });
  });

  it('should initialize with OTP flow inactive', () => {
    const { result } = renderHook(() => useOtpFlow());

    expect(result.current.otpEmail).toBe('');
    expect(result.current.isOtpScreenActive).toBe(false);
  });

  it('should trigger OTP flow when sending OTP', async () => {
    const { result } = renderHook(() => useOtpFlow());

    (sendLoginOtp as any).mockResolvedValue({ error: null });

    await act(async () => {
      await result.current.triggerOtpFlow('user@example.com');
    });

    expect(result.current.otpEmail).toBe('user@example.com');
    expect(result.current.isOtpScreenActive).toBe(true);
    expect(sendLoginOtp).toHaveBeenCalledWith('user@example.com');
  });

  it('should reset OTP flow', async () => {
    const { result } = renderHook(() => useOtpFlow());

    // Trigger OTP flow
    await act(async () => {
      await result.current.triggerOtpFlow('user@example.com');
    });

    expect(result.current.isOtpScreenActive).toBe(true);

    // Reset
    act(() => {
      result.current.resetOtpFlow();
    });

    expect(result.current.otpEmail).toBe('');
    expect(result.current.isOtpScreenActive).toBe(false);
  });

  it('should set OTP email directly', () => {
    const { result } = renderHook(() => useOtpFlow());

    act(() => {
      result.current.setOtpEmail('direct@example.com');
    });

    expect(result.current.otpEmail).toBe('direct@example.com');
  });

  it('should toggle OTP screen visibility directly', () => {
    const { result } = renderHook(() => useOtpFlow());

    act(() => {
      result.current.setIsOtpScreenActive(true);
    });

    expect(result.current.isOtpScreenActive).toBe(true);

    act(() => {
      result.current.setIsOtpScreenActive(false);
    });

    expect(result.current.isOtpScreenActive).toBe(false);
  });

  it('should handle OTP sending errors', async () => {
    const { result } = renderHook(() => useOtpFlow());

    (sendLoginOtp as any).mockResolvedValue({
      success: false,
      error: { message: 'Failed to send OTP' } as { message: string },
    });

    const response = await act(async () => {
      return await result.current.triggerOtpFlow('user@example.com');
    });

    // Hook returns the response from service with success field
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    if (response.error && typeof response.error === 'object' && 'message' in response.error) {
      expect((response.error as { message: string }).message).toBe('Failed to send OTP');
    }
  });

  it('should handle exceptions when sending OTP', async () => {
    const { result } = renderHook(() => useOtpFlow());

    (sendLoginOtp as any).mockResolvedValue({
      success: false,
      error: { message: 'Network timeout' },
    });

    // Hook catches errors and returns response (doesn't throw)
    const response = await act(async () => {
      return await result.current.triggerOtpFlow('user@example.com');
    });

    expect(response).toBeDefined();
  });

  it('should support multiple OTP flow cycles', async () => {
    const { result } = renderHook(() => useOtpFlow());

    // First cycle
    await act(async () => {
      await result.current.triggerOtpFlow('user1@example.com');
    });

    expect(result.current.otpEmail).toBe('user1@example.com');

    // Reset
    act(() => {
      result.current.resetOtpFlow();
    });

    expect(result.current.isOtpScreenActive).toBe(false);

    // Second cycle
    await act(async () => {
      await result.current.triggerOtpFlow('user2@example.com');
    });

    expect(result.current.otpEmail).toBe('user2@example.com');
    expect(result.current.isOtpScreenActive).toBe(true);
  });

  it('should call sendLoginOtp with correct email', async () => {
    const { result } = renderHook(() => useOtpFlow());

    const email = 'test.user@domain.com';

    await act(async () => {
      await result.current.triggerOtpFlow(email);
    });

    expect(sendLoginOtp).toHaveBeenCalledWith(email);
    expect(sendLoginOtp).toHaveBeenCalledTimes(1);
  });

  it('should support different email formats', async () => {
    const { result } = renderHook(() => useOtpFlow());

    const emails = [
      'simple@example.com',
      'with.dot@sub.domain.co.uk',
      'plus+tag@company.io',
    ];

    for (const email of emails) {
      (sendLoginOtp as any).mockResolvedValue({ error: null });

      await act(async () => {
        await result.current.triggerOtpFlow(email);
      });

      expect(result.current.otpEmail).toBe(email);
    }
  });

  it('should handle rapid consecutive OTP requests', async () => {
    const { result } = renderHook(() => useOtpFlow());

    (sendLoginOtp as any).mockResolvedValue({ error: null });

    await act(async () => {
      await result.current.triggerOtpFlow('user@example.com');
      await result.current.triggerOtpFlow('other@example.com');
    });

    expect(sendLoginOtp).toHaveBeenCalledTimes(2);
    expect(result.current.otpEmail).toBe('other@example.com');
  });

  it('should maintain email after OTP screen becomes active', async () => {
    const { result } = renderHook(() => useOtpFlow());

    const email = 'persistent@example.com';
    await act(async () => {
      await result.current.triggerOtpFlow(email);
    });

    // Toggle OTP screen off and back on
    act(() => {
      result.current.setIsOtpScreenActive(false);
    });

    expect(result.current.otpEmail).toBe(email);

    act(() => {
      result.current.setIsOtpScreenActive(true);
    });

    expect(result.current.otpEmail).toBe(email);
  });

  it('should return response from sendLoginOtp', async () => {
    const { result } = renderHook(() => useOtpFlow());

    const mockResponse = {
      success: true,
    };

    (sendLoginOtp as any).mockResolvedValue(mockResponse);

    const response = await act(async () => {
      return await result.current.triggerOtpFlow('user@example.com');
    });

    expect(response).toBeDefined();
    expect(response.success).toBe(true);
  });

  it('should handle empty email gracefully', async () => {
    const { result } = renderHook(() => useOtpFlow());

    (sendLoginOtp as any).mockResolvedValue({
      error: { message: 'Email is required' },
    });

    const response = await act(async () => {
      return await result.current.triggerOtpFlow('');
    });

    expect(response.error).toBeDefined();
  });

  it('should track OTP flow state changes', async () => {
    const { result } = renderHook(() => useOtpFlow());

    // Initial state
    expect(result.current.isOtpScreenActive).toBe(false);

    // After trigger
    await act(async () => {
      await result.current.triggerOtpFlow('user@example.com');
    });

    expect(result.current.isOtpScreenActive).toBe(true);

    // After manual deactivation
    act(() => {
      result.current.setIsOtpScreenActive(false);
    });

    expect(result.current.isOtpScreenActive).toBe(false);

    // After reset
    act(() => {
      result.current.resetOtpFlow();
    });

    expect(result.current.isOtpScreenActive).toBe(false);
    expect(result.current.otpEmail).toBe('');
  });
});
