import * as Notifications from 'expo-notifications';
import { Task } from '../types';
import { notificationManager } from './notificationManager';
import { storage } from '../utils/storage';

export const schedulerSync = {
  /**
   * Reschedules local notifications for all active tasks.
   * Call on app startup, user login, and whenever tasks are refreshed.
   */
  async syncWithTasks(tasks: Task[]): Promise<number> {
    const hasPermission = await notificationManager.requestPermissions();
    if (!hasPermission) {
      return 0;
    }

    // Cancel all previously scheduled notifications to eliminate orphaned or duplicate alarms
    await Notifications.cancelAllScheduledNotificationsAsync();
    await storage.setNotificationMap({});

    let scheduledCount = 0;
    const now = Date.now();
    const maxLookaheadMs = 14 * 24 * 60 * 60 * 1000; // 14 days lookahead

    for (const task of tasks) {
      if (task.status === 'ACTIVE' && task.next_run_at) {
        const runTime = new Date(task.next_run_at).getTime();
        const leadMs = (task.lead_time_minutes || 0) * 60 * 1000;
        const triggerTime = runTime - leadMs;

        // Ensure trigger is in future and within lookahead window
        if (triggerTime > now && triggerTime - now <= maxLookaheadMs) {
          const id = await notificationManager.scheduleTaskNotification(task);
          if (id) {
            scheduledCount++;
          }
        }
      }
    }

    return scheduledCount;
  },
};
