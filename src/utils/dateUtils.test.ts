import { describe, it, expect } from 'vitest';
import { calculateWorkingDays, formatDateForDB, calculateCalendarDays } from './dateUtils';

describe('dateUtils', () => {
  describe('calculateWorkingDays', () => {
    it('should calculate working days excluding weekends (Mon-Fri)', () => {
      // Jan 1, 2024 = Monday
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-05'); // Friday
      const result = calculateWorkingDays(start, end);
      expect(result).toBe(5); // Mon, Tue, Wed, Thu, Fri
    });

    it('should handle date strings', () => {
      const result = calculateWorkingDays('2024-01-01', '2024-01-05');
      expect(result).toBe(5);
    });

    it('should exclude Saturday and Sunday', () => {
      // Jan 5-8, 2024 = Fri, Sat, Sun, Mon (2 working days)
      const result = calculateWorkingDays('2024-01-05', '2024-01-08'); // Fri to Mon
      expect(result).toBe(2); // Fri and Mon only (Sat/Sun excluded)
    });

    it('should return 0 for invalid date strings', () => {
      const result = calculateWorkingDays('invalid', '2024-01-05');
      expect(result).toBe(0);
    });

    it('should return 0 when end date is before start date', () => {
      const result = calculateWorkingDays('2024-01-10', '2024-01-01');
      expect(result).toBe(0);
    });

    it('should return minimum 1 for same day (if not weekend)', () => {
      // Jan 1, 2024 = Monday
      const result = calculateWorkingDays('2024-01-01', '2024-01-01');
      expect(result).toBe(1);
    });

    it('should return 1 for Saturday (single day minimum)', () => {
      // Jan 6, 2024 = Saturday
      const result = calculateWorkingDays('2024-01-06', '2024-01-06');
      expect(result).toBe(1); // min 1, even though it's weekend
    });

    it('should handle full week correctly', () => {
      // Jan 1-7, 2024 = Mon to Sun (includes 5 working days)
      const result = calculateWorkingDays('2024-01-01', '2024-01-07');
      expect(result).toBe(5); // Mon-Fri only
    });
  });

  describe('formatDateForDB', () => {
    it('should format Date object to YYYY-MM-DD', () => {
      const date = new Date('2024-03-15');
      const result = formatDateForDB(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result).toContain('-03-');
      expect(result).toContain('-15');
    });

    it('should format date string to YYYY-MM-DD', () => {
      const result = formatDateForDB('2024-03-15');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result).toContain('-03-');
      expect(result).toContain('-15');
    });

    it('should pad month and day with zeros', () => {
      const date = new Date('2024-01-05');
      const result = formatDateForDB(date);
      expect(result).toBe('2024-01-05');
    });

    it('should handle single-digit months correctly', () => {
      const date = new Date('2024-09-25');
      const result = formatDateForDB(date);
      expect(result).toBe('2024-09-25');
    });
  });

  describe('calculateCalendarDays', () => {
    it('should calculate total calendar days inclusive', () => {
      // Same day = 1 day
      const result = calculateCalendarDays('2024-01-01', '2024-01-01');
      expect(result).toBe(1);
    });

    it('should calculate 2 days for consecutive days', () => {
      const result = calculateCalendarDays('2024-01-01', '2024-01-02');
      expect(result).toBe(2);
    });

    it('should calculate a week correctly', () => {
      // Jan 1 to Jan 7 = 7 days
      const result = calculateCalendarDays('2024-01-01', '2024-01-07');
      expect(result).toBe(7);
    });

    it('should return 0 when end date is before start date', () => {
      const result = calculateCalendarDays('2024-01-10', '2024-01-01');
      expect(result).toBe(0);
    });

    it('should handle Date objects and strings', () => {
      const start = new Date('2024-01-01');
      const end = '2024-01-05';
      const result = calculateCalendarDays(start, end);
      expect(result).toBe(5);
    });
  });
});
