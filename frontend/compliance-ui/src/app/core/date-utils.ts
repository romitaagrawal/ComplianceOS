export function getMondayOfCurrentWeek(): Date {
  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7; // 0 = Monday .. 6 = Sunday
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - dayOfWeek);
  return monday;
}

export function sumHoursInCurrentWeek(logs: { clockIn: string; totalHours: number | null }[]): number {
  const monday = getMondayOfCurrentWeek();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const sum = logs.reduce((acc, l) => {
    const d = new Date(l.clockIn);
    if (d >= monday && d <= sunday) {
      return acc + (l.totalHours || 0);
    }
    return acc;
  }, 0);

  return Math.round(sum * 10) / 10;
}