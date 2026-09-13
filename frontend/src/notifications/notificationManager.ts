import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Task } from '../types';
import { storage } from '../utils/storage';
import { tasksApi } from '../api/tasks';

// In-app alarm event listener callback type
type AlarmTriggerCallback = (data: { taskId?: number; title: string; body?: string }) => void;
const alarmListeners: Set<AlarmTriggerCallback> = new Set();

export const registerInAppAlarmListener = (cb: AlarmTriggerCallback) => {
  alarmListeners.add(cb);
  return () => {
    alarmListeners.delete(cb);
  };
};

// Configure notification presentation behavior
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

let isInitialized = false;

export function parseRunTimeMs(nextRunAt?: string | null, startDate?: string, startTime?: string): number {
  if (nextRunAt) {
    // If nextRunAt lacks timezone offset or Z, append Z for UTC
    const cleanStr = (nextRunAt.includes('Z') || nextRunAt.includes('+') || (nextRunAt.includes('-') && nextRunAt.indexOf('-') > 7))
      ? nextRunAt
      : `${nextRunAt.replace(' ', 'T')}Z`;
    const parsed = new Date(cleanStr).getTime();
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // Fallback to start_date (YYYY-MM-DD) and start_time (HH:MM)
  if (startDate && startTime) {
    const timeClean = startTime.slice(0, 5);
    const localIso = `${startDate}T${timeClean}:00`;
    const parsed = new Date(localIso).getTime();
    if (!isNaN(parsed)) {
      return parsed;
    }
  }

  return 0;
}

export const notificationManager = {
  async init(): Promise<void> {
    if (isInitialized) return;
    isInitialized = true;

    if (Platform.OS === 'android') {
      // 1. Task Alarm Channel (Maximum importance, alarm audio usage, strong vibration pattern, lockscreen visibility)
      await Notifications.setNotificationChannelAsync('myday-task-alarm', {
        name: 'MyDay Task Alarms & Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 600, 300, 600, 300, 600, 300, 800],
        lightColor: '#EF4444',
        sound: 'default',
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.ALARM,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
          flags: {
            enforceAudibility: true,
            requestHardwareAudioVideoSynchronization: false,
          },
        },
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });

      // 2. Task Reminder Channel (High importance, reminder before scheduled task)
      await Notifications.setNotificationChannelAsync('myday-task-reminder', {
        name: 'MyDay Upcoming Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 300, 200, 300],
        lightColor: '#6366F1',
        sound: 'default',
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.NOTIFICATION,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        },
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // 3. Register Interactive Notification Actions for turning off / snoozing
      await Notifications.setNotificationCategoryAsync('TASK_ALARM_CATEGORY', [
        {
          identifier: 'OFF_ALARM',
          buttonTitle: '🔔 Turn Off / Done',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'SNOOZE_10',
          buttonTitle: '⏰ Snooze 10m',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);
    }

    // Handle user interaction with notification action buttons (Turn Off, Snooze, Tap)
    Notifications.addNotificationResponseReceivedListener(async (response) => {
      try {
        const actionId = response.actionIdentifier;
        const data = response.notification.request.content.data as any;
        const taskId = data?.taskId ? Number(data.taskId) : undefined;
        const notifId = response.notification.request.identifier;

        // Dismiss this notification immediately
        await Notifications.dismissNotificationAsync(notifId);

        if (actionId === 'OFF_ALARM') {
          // Turn off alarm and mark task completed
          if (taskId) {
            await tasksApi.completeTask(taskId).catch(console.warn);
          }
        } else if (actionId === 'SNOOZE_10') {
          // Snooze task for 10 minutes
          if (taskId) {
            await tasksApi.snoozeTask(taskId, { duration_minutes: 10 }).catch(console.warn);
            // Schedule a follow-up alarm for 10 minutes from now
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `🚨 Snoozed Alarm: ${data?.title || 'Task Reminder'}`,
                body: 'Snoozed task is now due!',
                data: { taskId, type: 'TASK_ALARM' },
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.MAX,
                categoryIdentifier: 'TASK_ALARM_CATEGORY',
                autoDismiss: false,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: new Date(Date.now() + 10 * 60 * 1000),
                channelId: 'myday-task-alarm',
              },
            });
          }
        }
      } catch (err) {
        console.warn('Error handling notification response:', err);
      }
    });

    // Notify in-app listeners when an alarm notification fires while foregrounded
    Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as any;
      if (data?.type === 'TASK_ALARM') {
        alarmListeners.forEach((cb) =>
          cb({
            taskId: data.taskId,
            title: notification.request.content.title || 'Task Alarm',
            body: notification.request.content.body || undefined,
          })
        );
      }
    });
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

  /**
   * Schedules both:
   * 1. Exact Task Timing Alert/Alarm (At the exact scheduled task time)
   * 2. Before-Task Reminder (If lead_time_minutes > 0)
   */
  async scheduleTaskNotifications(task: Task): Promise<{ alarmId?: string; reminderId?: string }> {
    if (task.status !== 'ACTIVE') {
      await this.cancelTaskNotification(task.id);
      return {};
    }

    try {
      await this.cancelTaskNotification(task.id);

      const targetRunTime = parseRunTimeMs(task.next_run_at, task.start_date, task.start_time);
      const now = Date.now();

      if (targetRunTime <= 0) {
        return {};
      }

      let alarmId: string | undefined;
      let reminderId: string | undefined;

      // 1. EXACT TASK TIMING ALARM (Fires at task time with full alarm alert sound and Turn Off action)
      if (targetRunTime > now) {
        alarmId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `🚨 Task Alarm: ${task.title}`,
            body: task.description
              ? `${task.description} • Scheduled for ${task.start_time}`
              : `Scheduled time (${task.start_time}) is NOW! Tap to open or turn off below.`,
            data: { taskId: task.id, type: 'TASK_ALARM', title: task.title },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
            categoryIdentifier: 'TASK_ALARM_CATEGORY',
            sticky: false,
            autoDismiss: false,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(targetRunTime),
            channelId: 'myday-task-alarm',
          },
        });
      }

      // 2. BEFORE-TASK REMINDER NOTIFICATION (Fires lead_time_minutes before task time)
      const leadMinutes = task.lead_time_minutes || 0;
      if (leadMinutes > 0) {
        const reminderTime = targetRunTime - leadMinutes * 60 * 1000;
        if (reminderTime > now) {
          reminderId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `⏰ Upcoming: ${task.title}`,
              body: `Starts in ${leadMinutes} min (${task.start_time}). ${task.description || ''}`.trim(),
              data: { taskId: task.id, type: 'TASK_REMINDER', title: task.title },
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.HIGH,
              autoDismiss: true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: new Date(reminderTime),
              channelId: 'myday-task-reminder',
            },
          });
        }
      }

      // Save IDs to notification mapping
      if (alarmId || reminderId) {
        const notifMap = await storage.getNotificationMap();
        notifMap[task.id] = { alarmId, reminderId };
        await storage.setNotificationMap(notifMap);
      }

      return { alarmId, reminderId };
    } catch (err) {
      console.warn('Failed to schedule task notifications:', err);
      return {};
    }
  },

  async cancelTaskNotification(taskId: number): Promise<void> {
    try {
      const notifMap = await storage.getNotificationMap();
      const entry = notifMap[taskId];
      if (entry) {
        if (typeof entry === 'string') {
          await Notifications.cancelScheduledNotificationAsync(entry).catch(() => {});
        } else if (typeof entry === 'object') {
          if (entry.alarmId) {
            await Notifications.cancelScheduledNotificationAsync(entry.alarmId).catch(() => {});
          }
          if (entry.reminderId) {
            await Notifications.cancelScheduledNotificationAsync(entry.reminderId).catch(() => {});
          }
        }
        delete notifMap[taskId];
        await storage.setNotificationMap(notifMap);
      }
    } catch (err) {
      console.warn('Failed to cancel task notifications:', err);
    }
  },

  async sendTestAlarmAlert(): Promise<void> {
    await this.requestPermissions();
    // Schedule an alarm 3 seconds from now on the alarm channel with MAX priority and Turn Off button
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 Test Task Alarm: MyDay Alert',
        body: 'Alarm sound and popup working on lock screen! Tap "Turn Off / Done" below to turn off.',
        data: { type: 'TASK_ALARM', title: 'Test Task Alarm' },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'TASK_ALARM_CATEGORY',
        autoDismiss: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3,
        channelId: 'myday-task-alarm',
      },
    });
  },

  // Backward compatibility alias
  async sendTestNotification(): Promise<void> {
    return this.sendTestAlarmAlert();
  },

  async scheduleTaskNotification(task: Task): Promise<string | null> {
    const res = await this.scheduleTaskNotifications(task);
    return res.alarmId || res.reminderId || null;
  },
};
