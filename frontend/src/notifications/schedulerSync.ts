import * as Notifications from 'expo-notifications';
import { Task } from '../types';
import { notificationManager } from './notificationManager';
import { storage } from '../utils/storage';

export const schedulerSync = {
  /**
   * Reschedules local alarms and reminders for all active tasks.
   * Called on app startup, user login, and whenever tasks are created or refreshed.
   */
  async syncWithTasks(tasks: Task[]): Promise<number> {
    const hasPermission = await notificationManager.requestPermissions();
    if (!hasPermission) {
      return 0;
    }

    // Clear previous scheduled notifications to eliminate orphaned or duplicate alarms
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    await storage.setNotificationMap({});

    let scheduledCount = 0;

    for (const task of tasks) {
      if (task.status === 'ACTIVE') {
        const { alarmId, reminderId } = await notificationManager.scheduleTaskNotifications(task);
        if (alarmId || reminderId) {
          scheduledCount++;
        }
      }
    }

    return scheduledCount;
  },
};
