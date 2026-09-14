export type RecurrenceType = 
  | 'ONE_TIME'
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'YEARLY'
  | 'CUSTOM_INTERVAL';

export type IntervalUnit = 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS';

export type TaskStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'OVERDUE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type HistoryEventType = 
  | 'CREATED'
  | 'TRIGGERED'
  | 'SNOOZED'
  | 'RESCHEDULED'
  | 'PAUSED'
  | 'RESUMED'
  | 'COMPLETED'
  | 'OVERDUE'
  | 'EDITED';

export interface User {
  id: number;
  email: string;
  full_name?: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export type ReminderMode = 'NOTIFICATION' | 'ALARM';

export type LocationTrigger = 'ENTER' | 'EXIT';

export interface Task {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  start_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  timezone: string;
  recurrence_type: RecurrenceType;
  recurrence_days?: number[]; // [0, 1, 2...]
  interval_value?: number;
  interval_unit?: IntervalUnit;
  end_date?: string; // YYYY-MM-DD
  status: TaskStatus;
  priority: TaskPriority;
  lead_time_minutes: number;
  next_run_at?: string; // ISO string
  last_run_at?: string; // ISO string
  snoozed_until?: string; // ISO string
  notification_id?: string;
  
  // MyDay 2.0
  reminder_mode?: ReminderMode;
  alarm_sound?: string;
  smart_escalation?: boolean;
  is_location_based?: boolean;
  location_name?: string;
  location_lat?: number;
  location_lng?: number;
  location_radius?: number;
  location_trigger?: LocationTrigger;

  created_at: string;
  updated_at: string;
}

export interface TaskCreatePayload {
  title: string;
  description?: string;
  start_date: string;
  start_time: string;
  timezone: string;
  recurrence_type: RecurrenceType;
  recurrence_days?: number[];
  interval_value?: number;
  interval_unit?: IntervalUnit;
  end_date?: string;
  priority: TaskPriority;
  lead_time_minutes: number;
  
  // MyDay 2.0
  reminder_mode?: ReminderMode;
  alarm_sound?: string;
  smart_escalation?: boolean;
  is_location_based?: boolean;
  location_name?: string;
  location_lat?: number;
  location_lng?: number;
  location_radius?: number;
  location_trigger?: LocationTrigger;
}

export interface TaskUpdatePayload {
  title?: string;
  description?: string;
  start_date?: string;
  start_time?: string;
  timezone?: string;
  recurrence_type?: RecurrenceType;
  recurrence_days?: number[];
  interval_value?: number;
  interval_unit?: IntervalUnit;
  end_date?: string;
  priority?: TaskPriority;
  lead_time_minutes?: number;
  status?: TaskStatus;
  
  // MyDay 2.0
  reminder_mode?: ReminderMode;
  alarm_sound?: string;
  smart_escalation?: boolean;
  is_location_based?: boolean;
  location_name?: string;
  location_lat?: number;
  location_lng?: number;
  location_radius?: number;
  location_trigger?: LocationTrigger;
}

export interface TaskSummary {
  total: number;
  active: number;
  paused: number;
  completed: number;
  overdue: number;
  today_due: number;
}

export interface TaskHistoryItem {
  id: number;
  task_id: number;
  user_id: number;
  event_type: HistoryEventType;
  event_time: string;
  details?: string;
  task_title?: string;
}

export interface SnoozePayload {
  duration_minutes?: number;
  snooze_until?: string;
}

export interface ReschedulePayload {
  new_date: string;
  new_time: string;
  new_timezone?: string;
}

// AI Daily Planner types
export interface PlanDayRequest {
  prompt: string;
  plan_date?: string; // YYYY-MM-DD
  day_start_time?: string;
  day_end_time?: string;
  timezone?: string;
}

export interface PlanDayItem {
  id?: string;
  title: string;
  description?: string;
  start_date: string;
  start_time: string;
  duration_minutes: number;
  priority: TaskPriority;
  reminder_mode?: ReminderMode;
  smart_escalation?: boolean;
  reasoning?: string;
}

export interface PlanDayResponse {
  summary: string;
  plan_date: string;
  items: PlanDayItem[];
  conflict_notes?: string[];
}

export type ScreenTab = 'home' | 'tasks' | 'create' | 'history' | 'settings' | 'details';

