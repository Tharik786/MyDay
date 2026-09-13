import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Task } from '../types';
import { storage } from '../utils/storage';

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

export const notificationManager = {
  async init(): Promise<void> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('myday-tasks', {
        name: 'MyDay Task Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }
  },

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch {
      return false;
    }
  },

  async scheduleTaskNotification(task: Task): Promise<string | null> {
    if (!task.next_run_at || task.status !== 'ACTIVE') {
      return null;
    }

    try {
      // Cancel previous notification for this task if any exists
      await this.cancelTaskNotification(task.id);

      const targetRunTime = new Date(task.next_run_at).getTime();
      const leadMs = (task.lead_time_minutes || 0) * 60 * 1000;
      const triggerTime = targetRunTime - leadMs;
      const now = Date.now();

      // Only schedule if trigger time is in the future
      if (triggerTime <= now) {
        return null;
      }

      const triggerSeconds = Math.max(1, Math.floor((triggerTime - now) / 1000));

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Reminder: ${task.title}`,
          body: task.description || `Scheduled for ${task.start_time}`,
          data: { taskId: task.id },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: triggerSeconds,
          repeats: false,
        },
      });

      // Save mapping
      const notifMap = await storage.getNotificationMap();
      notifMap[task.id] = notificationId;
      await storage.setNotificationMap(notifMap);

      return notificationId;
    } catch (err) {
      console.warn('Failed to schedule notification:', err);
      return null;
    }
  },

  async cancelTaskNotification(taskId: number): Promise<void> {
    try {
      const notifMap = await storage.getNotificationMap();
      const notifId = notifMap[taskId];
      if (notifId) {
        await Notifications.cancelScheduledNotificationAsync(notifId);
        delete notifMap[taskId];
        await storage.setNotificationMap(notifMap);
      }
    } catch (err) {
      console.warn('Failed to cancel notification:', err);
    }
  },

  async sendTestNotification(): Promise<void> {
    await this.requestPermissions();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 MyDay Test Reminder',
        body: 'Local notification system is active and functioning smoothly!',
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        repeats: false,
      },
    });
  }
};
