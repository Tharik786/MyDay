import { Task, RecurrenceType, IntervalUnit } from '../types';

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const FULL_DAY_NAMES = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export function getLocalTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  try {
    // If format is YYYY-MM-DD, parse as local year, month, day to avoid UTC offset drift
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString.trim())) {
      const [y, m, d] = dateString.trim().split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatTime(timeString?: string): string {
  if (!timeString) return 'N/A';
  try {
    if (timeString.includes('T')) {
      const d = new Date(timeString);
      let h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      if (h === 0) h = 12;
      return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
    }
    const clean = timeString.trim();
    const parts = clean.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts.length > 1 ? parts[1].slice(0, 2).padStart(2, '0') : '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
  } catch {
    return timeString;
  }
}

export function parseUtcDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  let s = dateStr.trim();
  s = s.replace(' ', 'T');
  if (!s.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(s)) {
    s += 'Z';
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateTime(isoString?: string): string {
  if (!isoString) return 'Not scheduled';
  try {
    const d = parseUtcDate(isoString);
    if (!d) return isoString;
    const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${datePart} at ${String(h).padStart(2, '0')}:${m} ${ampm}`;
  } catch {
    return isoString;
  }
}

export function to12HourParts(time24?: string): { hour: number; minute: string; ampm: 'AM' | 'PM' } {
  if (!time24) return { hour: 9, minute: '00', ampm: 'AM' };
  try {
    const clean = time24.includes('T') ? time24.split('T')[1] : time24;
    const [hStr, mStr] = clean.split(':');
    const h = parseInt(hStr, 10);
    const minute = mStr ? mStr.slice(0, 2).padStart(2, '0') : '00';
    const ampm: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    let hour = h % 12;
    if (hour === 0) hour = 12;
    return { hour, minute, ampm };
  } catch {
    return { hour: 9, minute: '00', ampm: 'AM' };
  }
}

export function to24HourString(hour12: number, minute: string, ampm: 'AM' | 'PM'): string {
  let h = hour12 % 12;
  if (ampm === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${minute.padStart(2, '0')}:00`;
}

export function getRelativeTimeString(isoString?: string): string {
  if (!isoString) return 'No upcoming run';
  try {
    const parsed = parseUtcDate(isoString);
    if (!parsed) return 'Scheduled';
    const target = parsed.getTime();
    const now = Date.now();
    const diffMs = target - now;
    const isPast = diffMs < 0;
    const absDiffMs = Math.abs(diffMs);

    const diffMinutes = Math.floor(absDiffMs / (1000 * 60));
    const diffHours = Math.floor(absDiffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(absDiffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return isPast ? 'Just passed' : 'Right now';
    }

    if (diffMinutes < 60) {
      return isPast ? `${diffMinutes}m overdue` : `in ${diffMinutes}m`;
    }

    if (diffHours < 24) {
      const remainingMins = diffMinutes % 60;
      const hoursStr = remainingMins > 0 ? `${diffHours}h ${remainingMins}m` : `${diffHours}h`;
      return isPast ? `${hoursStr} overdue` : `in ${hoursStr}`;
    }

    if (diffDays === 1) {
      return isPast ? '1 day overdue' : 'tomorrow';
    }

    return isPast ? `${diffDays} days overdue` : `in ${diffDays} days`;
  } catch {
    return 'Scheduled';
  }
}

export function getRecurrenceLabel(task: Partial<Task>): string {
  if (!task.recurrence_type) return 'One-time';

  switch (task.recurrence_type) {
    case 'ONE_TIME':
      return 'One-time';
    case 'DAILY':
      return 'Repeats Daily';
    case 'WEEKLY':
      if (task.recurrence_days && task.recurrence_days.length > 0) {
        const days = task.recurrence_days.map(d => DAY_NAMES[d] || `${d}`).join(', ');
        return `Weekly (${days})`;
      }
      return 'Repeats Weekly';
    case 'MONTHLY':
      return 'Repeats Monthly';
    case 'YEARLY':
      return 'Repeats Yearly';
    case 'CUSTOM_INTERVAL':
      const val = task.interval_value || 1;
      const unit = (task.interval_unit || 'DAYS').toLowerCase();
      return `Every ${val} ${unit}`;
    default:
      return 'Custom';
  }
}

export function getCommonTimezones(): string[] {
  return [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney'
  ];
}
