export interface GoalProgress {
  /** 0–100, floored. */
  percent: number;
  remainingAgorot: number;
  reached: boolean;
  /** Whole calendar months left (rounded up, min 1); null without a date or once it passed. */
  monthsLeft: number | null;
  /** Amount to save each month to hit the date; null when reached or no usable date. */
  monthlyAgorot: number | null;
  overdue: boolean;
}

function parseISO(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
}

/** Calendar months from today until the target, rounded up; ≤0 when the date has passed. */
function monthsUntil(today: string, target: string): number {
  const [ty, tm, td] = parseISO(today);
  const [gy, gm, gd] = parseISO(target);
  const whole = (gy - ty) * 12 + (gm - tm);
  return gd > td ? whole + 1 : whole;
}

export function goalProgress(
  balanceAgorot: number,
  goalAgorot: number,
  goalDate: string | null,
  today: string,
): GoalProgress {
  const balance = Math.max(0, balanceAgorot);
  const reached = balance >= goalAgorot;
  const remainingAgorot = reached ? 0 : goalAgorot - balance;
  const percent = reached ? 100 : Math.floor((balance * 100) / goalAgorot);

  let monthsLeft: number | null = null;
  let overdue = false;
  if (goalDate) {
    if (goalDate < today) overdue = !reached;
    else monthsLeft = Math.max(1, monthsUntil(today, goalDate));
  }
  const monthlyAgorot = !reached && monthsLeft ? Math.ceil(remainingAgorot / monthsLeft) : null;

  return { percent, remainingAgorot, reached, monthsLeft, monthlyAgorot, overdue };
}
