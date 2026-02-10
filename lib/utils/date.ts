export const startOfDay = (value: Date) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const toDateOnly = (value: string) => {
  const date = new Date(value + 'T00:00:00');
  return startOfDay(date);
};

export const isBefore = (a: Date, b: Date) => a.getTime() < b.getTime();
export const isSameDay = (a: Date, b: Date) => a.getTime() === b.getTime();

export const diffInDays = (a: Date, b: Date) => {
  const diff = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.round(diff / 86400000);
};
