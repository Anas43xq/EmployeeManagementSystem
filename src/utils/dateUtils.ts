export function calculateWorkingDays(
  startDate: Date | string,
  endDate: Date | string
): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
  const end = typeof endDate === 'string' ? new Date(endDate) : new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (end < start) return 0;

  let workingDays = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endNorm = new Date(end);
  endNorm.setHours(0, 0, 0, 0);

  while (current <= endNorm) {
    const day = current.getDay(); // 0 = Sunday, 6 = Saturday
    if (day !== 0 && day !== 6) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return Math.max(1, workingDays); // minimum 1 working day
}

export function formatDateForDB(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function calculateCalendarDays(
  startDate: Date | string,
  endDate: Date | string
): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 0;
}
