import { Task, RecurrenceType, IntervalUnit } from '../types';

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const FULL_DAY_NAMES = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString(undefined, {
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
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const [h, m] = timeString.split(':');
    const d = new Date();
    d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return timeString;
  }
}

export function formatDateTime(isoString?: string): string {
  if (!isoString) return 'Not scheduled';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return isoString;
  }
}

export function getRelativeTimeString(isoString?: string): string {
  if (!isoString) return 'No upcoming run';
  try {
    const target = new Date(isoString).getTime();
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
