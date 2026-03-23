import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProgressiveCountdown } from './useProgressiveCountdown';

describe('useProgressiveCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should initialize with countdown at 0 and not active', () => {
    const { result } = renderHook(() => useProgressiveCountdown());

    expect(result.current.countdown).toBe(0);
    expect(result.current.isActive).toBe(false);
  });

  it('should start countdown with given initial seconds', () => {
    const { result } = renderHook(() => useProgressiveCountdown());

    act(() => {
      result.current.start(5);
    });

    expect(result.current.countdown).toBe(5);
    expect(result.current.isActive).toBe(true);
  });

  it('should decrement countdown every second', () => {
    const { result } = renderHook(() => useProgressiveCountdown());

    act(() => {
      result.current.start(5);
    });

    expect(result.current.countdown).toBe(5);

    // Advance 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.countdown).toBe(4);

    // Advance 2 more seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.countdown).toBe(2);
  });

  it('should reach 0 and become inactive', () => {
    const { result } = renderHook(() => useProgressiveCountdown());

    act(() => {
      result.current.start(3);
    });

    // Advance all 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.countdown).toBe(0);
    expect(result.current.isActive).toBe(false);
  });

  it('should stop countdown when stop is called', () => {
    const { result } = renderHook(() => useProgressiveCountdown());

    act(() => {
      result.current.start(10);
    });

    expect(result.current.countdown).toBe(10);

    act(() => {
      result.current.stop();
    });

    expect(result.current.countdown).toBe(0);
    expect(result.current.isActive).toBe(false);

    // Verify timer is cleared (advancing time doesn't change countdown)
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.countdown).toBe(0);
  });

  it('should handle multiple start/stop cycles', () => {
    const { result } = renderHook(() => useProgressiveCountdown());

    // First cycle
    act(() => {
      result.current.start(3);
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.countdown).toBe(2);

    // Stop and reset
    act(() => {
      result.current.stop();
    });

    expect(result.current.countdown).toBe(0);

    // Second cycle
    act(() => {
      result.current.start(5);
    });

    expect(result.current.countdown).toBe(5);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.countdown).toBe(3);
  });

  it('should handle cleanup on unmount', () => {
    const { result, unmount } = renderHook(() => useProgressiveCountdown());

    act(() => {
      result.current.start(10);
    });

    // Before unmount, timer is running
    expect(result.current.countdown).toBe(10);

    // Unmount should clean up without errors (no error on unmount is the test)
    unmount();
    
    // Just verify unmount completes successfully
    expect(true).toBe(true);
  });

  it('should handle start with 0 seconds', () => {
    const { result } = renderHook(() => useProgressiveCountdown());

    act(() => {
      result.current.start(0);
    });

    expect(result.current.countdown).toBe(0);
    expect(result.current.isActive).toBe(false);
  });

  it('should handle rapid start calls (last one wins)', () => {
    const { result } = renderHook(() => useProgressiveCountdown());

    act(() => {
      result.current.start(10);
      result.current.start(5); // Should replace previous
    });

    expect(result.current.countdown).toBe(5);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.countdown).toBe(4);
  });

  it('should test progressive login delay scenario', () => {
    const { result } = renderHook(() => useProgressiveCountdown());

    // Test 2nd attempt delay (5 seconds)
    act(() => {
      result.current.start(5);
    });

    expect(result.current.isActive).toBe(true);

    // User waits 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.countdown).toBe(3);

    // 3 more seconds pass
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.countdown).toBe(0);
    expect(result.current.isActive).toBe(false);
    expect(result.current.countdown).toBeLessThanOrEqual(0);
  });

  it('should handle large countdown values', () => {
    const { result } = renderHook(() => useProgressiveCountdown());

    // 4th+ attempt delay (30 seconds)
    act(() => {
      result.current.start(30);
    });

    expect(result.current.countdown).toBe(30);

    // Advance halfway
    act(() => {
      vi.advanceTimersByTime(15000);
    });

    expect(result.current.countdown).toBe(15);

    // Advance rest
    act(() => {
      vi.advanceTimersByTime(15000);
    });

    expect(result.current.countdown).toBe(0);
  });
});
