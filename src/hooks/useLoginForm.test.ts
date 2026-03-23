import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLoginForm } from './useLoginForm';

describe('useLoginForm', () => {
  it('should initialize with empty form state', () => {
    const { result } = renderHook(() => useLoginForm());

    expect(result.current.email).toBe('');
    expect(result.current.password).toBe('');
    expect(result.current.error).toBe('');
    expect(result.current.warnMessage).toBe('');
    expect(result.current.ipMacLimitMessage).toBe('');
    expect(result.current.loading).toBe(false);
    expect(result.current.showPassword).toBe(false);
  });

  it('should update email field', () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.setEmail('test@example.com');
    });

    expect(result.current.email).toBe('test@example.com');
  });

  it('should update password field', () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.setPassword('myPassword123');
    });

    expect(result.current.password).toBe('myPassword123');
  });

  it('should set and clear error messages', () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.setError('Invalid credentials');
    });

    expect(result.current.error).toBe('Invalid credentials');

    act(() => {
      result.current.clearErrors();
    });

    expect(result.current.error).toBe('');
  });

  it('should set and clear warning messages', () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.setWarnMessage('Too many attempts');
    });

    expect(result.current.warnMessage).toBe('Too many attempts');

    act(() => {
      result.current.clearErrors();
    });

    expect(result.current.warnMessage).toBe('');
  });

  it('should set IP/MAC limit message', () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.setIpMacLimitMessage('Device limit exceeded');
    });

    expect(result.current.ipMacLimitMessage).toBe('Device limit exceeded');

    act(() => {
      result.current.clearErrors();
    });

    expect(result.current.ipMacLimitMessage).toBe('');
  });

  it('should toggle password visibility', () => {
    const { result } = renderHook(() => useLoginForm());

    expect(result.current.showPassword).toBe(false);

    act(() => {
      result.current.toggleShowPassword();
    });

    expect(result.current.showPassword).toBe(true);

    act(() => {
      result.current.toggleShowPassword();
    });

    expect(result.current.showPassword).toBe(false);
  });

  it('should set and clear loading state', () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.loading).toBe(true);

    act(() => {
      result.current.setLoading(false);
    });

    expect(result.current.loading).toBe(false);
  });

  it('should reset all form state', () => {
    const { result } = renderHook(() => useLoginForm());

    // Set various fields
    act(() => {
      result.current.setEmail('test@example.com');
      result.current.setPassword('password123');
      result.current.setError('Some error');
      result.current.setWarnMessage('Some warning');
      result.current.setIpMacLimitMessage('Device limit');
      result.current.setLoading(true);
      result.current.toggleShowPassword();
    });

    // Verify all set
    expect(result.current.email).toBe('test@example.com');
    expect(result.current.password).toBe('password123');
    expect(result.current.error).toBe('Some error');
    expect(result.current.warnMessage).toBe('Some warning');
    expect(result.current.ipMacLimitMessage).toBe('Device limit');
    expect(result.current.loading).toBe(true);
    expect(result.current.showPassword).toBe(true);

    // Reset
    act(() => {
      result.current.reset();
    });

    // Verify all cleared
    expect(result.current.email).toBe('');
    expect(result.current.password).toBe('');
    expect(result.current.error).toBe('');
    expect(result.current.warnMessage).toBe('');
    expect(result.current.ipMacLimitMessage).toBe('');
    expect(result.current.loading).toBe(false);
    expect(result.current.showPassword).toBe(false);
  });

  it('should handle form submission flow', () => {
    const { result } = renderHook(() => useLoginForm());

    // Enter credentials
    act(() => {
      result.current.setEmail('user@example.com');
      result.current.setPassword('SecurePass123');
    });

    expect(result.current.email).toBe('user@example.com');
    expect(result.current.password).toBe('SecurePass123');

    // Start loading
    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.loading).toBe(true);

    // Simulate error
    act(() => {
      result.current.setError('Invalid credentials');
      result.current.setLoading(false);
    });

    expect(result.current.error).toBe('Invalid credentials');
    expect(result.current.loading).toBe(false);
  });

  it('should support independent error and warning states', () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.setError('This is an error');
      result.current.setWarnMessage('This is a warning');
    });

    expect(result.current.error).toBe('This is an error');
    expect(result.current.warnMessage).toBe('This is a warning');

    // Clear only error, not warning
    act(() => {
      result.current.setError('');
    });

    expect(result.current.error).toBe('');
    expect(result.current.warnMessage).toBe('This is a warning');
  });

  it('should handle rapid consecutive updates', () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.setEmail('test1@example.com');
      result.current.setEmail('test2@example.com');
      result.current.setEmail('test3@example.com');
    });

    // Last value wins
    expect(result.current.email).toBe('test3@example.com');
  });

  it('should support two-factor authentication flow', () => {
    const { result } = renderHook(() => useLoginForm());

    // First attempt
    act(() => {
      result.current.setEmail('user@example.com');
      result.current.setPassword('password123');
      result.current.setLoading(true);
    });

    act(() => {
      result.current.setLoading(false);
      result.current.setWarnMessage('OTP required');
    });

    expect(result.current.warnMessage).toBe('OTP required');
    expect(result.current.email).toBe('user@example.com');

    // Clear warning for OTP entry
    act(() => {
      result.current.setWarnMessage('');
    });

    expect(result.current.warnMessage).toBe('');
    expect(result.current.email).toBe('user@example.com');
  });

  it('should handle IP/MAC limit scenario', () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.setEmail('user@example.com');
      result.current.setPassword('password123');
      result.current.setIpMacLimitMessage('Too many devices. Max 5 devices per 5 minutes.');
    });

    expect(result.current.ipMacLimitMessage).toContain('Too many devices');

    // User fixes by clearing
    act(() => {
      result.current.setIpMacLimitMessage('');
    });

    expect(result.current.ipMacLimitMessage).toBe('');
  });

  it('should maintain separate state across multiple hook instances', () => {
    const { result: result1 } = renderHook(() => useLoginForm());
    const { result: result2 } = renderHook(() => useLoginForm());

    act(() => {
      result1.current.setEmail('user1@example.com');
      result2.current.setEmail('user2@example.com');
    });

    expect(result1.current.email).toBe('user1@example.com');
    expect(result2.current.email).toBe('user2@example.com');
  });
});
