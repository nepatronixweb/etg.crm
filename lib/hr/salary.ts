export type SalaryRow = {
  userId: string;
  name: string;
  email: string;
  monthlySalary: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  perDaySalary: number;
  finalSalary: number;
  month: string;
};

export function computeSalaryForMonth(
  monthlySalary: number,
  workingDays: number,
  presentDaysValid: number,
  month: string
): Omit<SalaryRow, "userId" | "name" | "email"> {
  const wd = Math.max(1, workingDays || 26);
  const ms = Math.max(0, monthlySalary);
  const present = Math.max(0, presentDaysValid);
  const absentDays = Math.max(0, wd - present);
  const perDaySalary = ms / wd;
  const finalSalary = Math.max(0, ms - absentDays * perDaySalary);
  return {
    monthlySalary: ms,
    workingDays: wd,
    presentDays: present,
    absentDays,
    perDaySalary: Math.round(perDaySalary * 100) / 100,
    finalSalary: Math.round(finalSalary * 100) / 100,
    month,
  };
}

/** Inclusive YYYY-MM-DD range for a calendar month in the same TZ as stored dates (string compare works for ISO dates). */
export function monthToDateRange(month: string): { start: string; end: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month.trim());
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  if (mo < 1 || mo > 12) return null;
  const mm = m[2];
  const start = `${y}-${mm}-01`;
  const last = new Date(y, mo, 0).getDate();
  const end = `${y}-${mm}-${String(last).padStart(2, "0")}`;
  return { start, end };
}
