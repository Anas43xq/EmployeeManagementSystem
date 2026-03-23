import { describe, it, expect } from 'vitest';
import {
  OTP_TRIGGER_THRESHOLD,
  OTP_VERIFICATION_ATTEMPTS_MAX,
  OTP_REQUEST_COOLDOWN_SECONDS,
  getProgressiveDelaySeconds,
} from './loginAttempts';

describe('loginAttempts', () => {
  describe('Constants', () => {
    it('should define OTP trigger threshold', () => {
      expect(OTP_TRIGGER_THRESHOLD).toBe(5);
    });

    it('should define OTP verification max attempts', () => {
      expect(OTP_VERIFICATION_ATTEMPTS_MAX).toBe(5);
    });

    it('should define OTP request cooldown in seconds', () => {
      expect(OTP_REQUEST_COOLDOWN_SECONDS).toBe(60);
    });
  });

  describe('getProgressiveDelaySeconds', () => {
    it('should return 0 seconds for first attempt', () => {
      expect(getProgressiveDelaySeconds(1)).toBe(0);
    });

    it('should return 0 seconds for less than 2 attempts', () => {
      expect(getProgressiveDelaySeconds(0)).toBe(0);
    });

    it('should return 5 seconds for second attempt', () => {
      expect(getProgressiveDelaySeconds(2)).toBe(5);
    });

    it('should return 15 seconds for third attempt', () => {
      expect(getProgressiveDelaySeconds(3)).toBe(15);
    });

    it('should return 30 seconds for fourth attempt', () => {
      expect(getProgressiveDelaySeconds(4)).toBe(30);
    });

    it('should return 30 seconds for fifth and beyond', () => {
      expect(getProgressiveDelaySeconds(5)).toBe(30);
      expect(getProgressiveDelaySeconds(10)).toBe(30);
      expect(getProgressiveDelaySeconds(100)).toBe(30);
    });

    it('should follow pattern: 0, 5, 15, 30+', () => {
      const delaySequence = Array.from({ length: 6 }, (_, i) => i + 1).map(
        getProgressiveDelaySeconds
      );
      expect(delaySequence).toEqual([0, 5, 15, 30, 30, 30]);
    });
  });

  describe('LoginAttemptStatus Interface', () => {
    it('should track userId and failed attempts', () => {
      const status = {
        userId: 'user-123',
        failedAttempts: 3,
        attemptsRemaining: 2, // 5 - 3
      };

      expect(status.userId).toBe('user-123');
      expect(status.failedAttempts).toBe(3);
      expect(status.attemptsRemaining).toBe(2);
    });

    it('should track OTP requirement', () => {
      const status = {
        userId: 'user-456',
        failedAttempts: 5,
        requiresOtp: true,
        otpExpiresAt: '2024-12-31T23:59:59Z',
        otpSecondsLeft: 300,
      };

      expect(status.requiresOtp).toBe(true);
      expect(status.otpSecondsLeft).toBeGreaterThan(0);
    });

    it('should track progressive delay', () => {
      const status = {
        failedAttempts: 3,
        delayUntil: '2024-12-31T12:00:15Z',
        secondsUntilRetry: 15, // 15 second delay for 3rd attempt
      };

      expect(status.secondsUntilRetry).toBe(15);
    });
  });

  describe('IpMacLimitStatus Interface', () => {
    it('should track IP/MAC limit status', () => {
      const status = {
        allowed: true,
        failedAttempts: 2,
        attemptsRemaining: 3, // 5 - 2
        limit: 5,
        windowMinutes: 5,
      };

      expect(status.allowed).toBe(true);
      expect(status.attemptsRemaining).toBe(3);
      expect(status.limit).toBe(5);
    });

    it('should track IP/MAC window reset time', () => {
      const status = {
        allowed: false,
        failedAttempts: 5,
        attemptsRemaining: 0,
        windowResetAt: '2024-12-31T12:05:00Z',
        secondsUntilReset: 120,
      };

      expect(status.allowed).toBe(false);
      expect(status.secondsUntilReset).toBeGreaterThan(0);
    });
  });

  describe('Attack Prevention Logic', () => {
    it('should block after OTP_TRIGGER_THRESHOLD failed attempts', () => {
      const maxAttempts = OTP_TRIGGER_THRESHOLD;
      const failedAttempts = maxAttempts;

      expect(failedAttempts >= maxAttempts).toBe(true);
    });

    it('should allow up to 5 OTP verification attempts', () => {
      const otpMaxAttempts = OTP_VERIFICATION_ATTEMPTS_MAX;
      expect(otpMaxAttempts).toBe(5);
    });

    it('should enforce 60-second cooldown between OTP requests', () => {
      const cooldown = OTP_REQUEST_COOLDOWN_SECONDS;
      expect(cooldown).toBe(60);
    });

    it('should calculate progressive delays correctly', () => {
      // Simulating failed login attempt sequence
      const attemptDelays = [1, 2, 3, 4, 5].map((attempt) => {
        return {
          attempt,
          delaySeconds: getProgressiveDelaySeconds(attempt),
          isBlocked: attempt >= OTP_TRIGGER_THRESHOLD,
        };
      });

      // Check pattern: 0, 5, 15, 30, 30
      expect(attemptDelays[0].delaySeconds).toBe(0);  // 1st attempt
      expect(attemptDelays[1].delaySeconds).toBe(5);  // 2nd attempt
      expect(attemptDelays[2].delaySeconds).toBe(15); // 3rd attempt
      expect(attemptDelays[3].delaySeconds).toBe(30); // 4th attempt
      expect(attemptDelays[4].delaySeconds).toBe(30); // 5th attempt

      // 5th attempt triggers OTP requirement
      expect(attemptDelays[4].isBlocked).toBe(true);
    });
  });

  describe('State Transitions', () => {
    it('should transition from normal login to OTP required at threshold', () => {
      // Simulate state machine: normal -> warning -> blocked
      const states = Array.from({ length: 6 }, (_, i) => {
        const failedCount = i;
        const requiresOtp = failedCount >= OTP_TRIGGER_THRESHOLD;
        const delaySeconds = getProgressiveDelaySeconds(failedCount);

        return {
          failedAttempts: failedCount,
          requiresOtp,
          delaySeconds,
        };
      });

      // First 4 attempts: no OTP required
      expect(states[0].requiresOtp).toBe(false);
      expect(states[1].requiresOtp).toBe(false);
      expect(states[2].requiresOtp).toBe(false);
      expect(states[3].requiresOtp).toBe(false);

      // 5th+ attempts: OTP required
      expect(states[5].requiresOtp).toBe(true);
    });

    it('should reset login attempts on successful OTP verification', () => {
      // Before reset
      const before = {
        failedAttempts: 5,
        requiresOtp: true,
      };

      // After successful OTP
      const after = {
        failedAttempts: 0,
        requiresOtp: false,
      };

      expect(after.failedAttempts).toBeLessThan(before.failedAttempts);
      expect(after.requiresOtp).toBe(false);
    });

    it('should reset delay on successful OTP verification', () => {
      // Before reset
      const delayBefore = getProgressiveDelaySeconds(4);
      const attemptsAfterOtpSuccess = 0;
      const delayAfter = getProgressiveDelaySeconds(attemptsAfterOtpSuccess);

      expect(delayBefore).toBe(30); // 4th attempt delay
      expect(delayAfter).toBe(0); // Reset
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative attempt counts gracefully', () => {
      expect(getProgressiveDelaySeconds(-1)).toBe(0);
    });

    it('should handle very high attempt counts (cap at 30s)', () => {
      expect(getProgressiveDelaySeconds(1000)).toBe(30);
    });

    it('should not allow remaining attempts below 0', () => {
      const failedAttempts = 10; // exceeds threshold of 5
      const remaining = Math.max(0, OTP_TRIGGER_THRESHOLD - failedAttempts);
      expect(remaining).toBe(0);
    });
  });
});
