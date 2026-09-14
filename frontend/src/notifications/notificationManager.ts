import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Task } from '../types';
import { storage } from '../utils/storage';
import { tasksApi } from '../api/tasks';
import { soundManager } from '../services/soundManager';

// In-app alarm event listener callback type
type AlarmTriggerCallback = (data: { taskId?: number; title: string; body?: string; alarmSound?: string }) => void;
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
    const cleanStr = (nextRunAt.includes('Z') || nextRunAt.includes('+') || (nextRunAt.includes('-') && nextRunAt.indexOf('-') > 7))
      ? nextRunAt
      : `${nextRunAt.replace(' ', 'T')}Z`;
    const parsed = new Date(cleanStr).getTime();
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

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
        vibrationPattern: [0, 800, 300, 800, 300, 800, 300, 1000],
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

      // 2. Task Reminder Channel
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

      // 3. Register Interactive Notification Actions
      await Notifications.setNotificationCategoryAsync('TASK_ALARM_CATEGORY', [
        {
          identifier: 'OFF_ALARM',
          buttonTitle: '🔔 Complete / Turn Off',
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
        {
          identifier: 'DISMISS_ALARM',
          buttonTitle: '✖ Dismiss',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);
    }

    // Handle user interaction with notification action buttons
    Notifications.addNotificationResponseReceivedListener(async (response) => {
      try {
        const actionId = response.actionIdentifier;
        const data = response.notification.request.content.data as any;
        const taskId = data?.taskId ? Number(data.taskId) : undefined;
        const notifId = response.notification.request.identifier;

        // Dismiss this notification immediately & stop alarm audio
        await Notifications.dismissNotificationAsync(notifId);
        await soundManager.stopAlarm();

        if (actionId === 'OFF_ALARM') {
          if (taskId) {
            await tasksApi.completeTask(taskId).catch(console.warn);
          }
        } else if (actionId === 'DISMISS_ALARM') {
          // Alarm sound already stopped above
        } else if (actionId === 'SNOOZE_10') {
          if (taskId) {
            await tasksApi.snoozeTask(taskId, { duration_minutes: 10 }).catch(console.warn);
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `🚨 Snoozed Alarm: ${data?.title || 'Task'}`,
                body: 'Snoozed task is now due!',
                data: { taskId, type: 'TASK_ALARM', alarmSound: data?.alarmSound },
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

    // When an alarm notification fires while app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as any;
      if (data?.type === 'TASK_ALARM') {
        soundManager.playAlarm(data.alarmSound || 'default');
        alarmListeners.forEach((cb) =>
          cb({
            taskId: data.taskId,
            title: notification.request.content.title || 'Task Alarm',
            body: notification.request.content.body || undefined,
            alarmSound: data.alarmSound,
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
   * Schedules task notifications supporting:
   * 1. Smart Alarm Mode (Ringtone audio, MAX priority alarm channel)
   * 2. Standard Notifications (Lead time reminder + task time notification)
   * 3. Smart Escalation (T -> T+15m -> T+30m -> T+45m)
   */
  async scheduleTaskNotifications(task: Task): Promise<Record<string, string | undefined>> {
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

      const scheduledIds: Record<string, string | undefined> = {};
      const isAlarmMode = task.reminder_mode === 'ALARM';

      // 1. EXACT TASK TIME ALERT / ALARM (T)
      if (targetRunTime > now) {
        if (isAlarmMode) {
          scheduledIds.alarmId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `🚨 Alarm: ${task.title}`,
              body: task.description
                ? `${task.description} • Scheduled for ${task.start_time}`
                : `Scheduled time (${task.start_time}) is NOW! Tap to turn off.`,
              data: { taskId: task.id, type: 'TASK_ALARM', title: task.title, alarmSound: task.alarm_sound },
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.MAX,
              categoryIdentifier: 'TASK_ALARM_CATEGORY',
              sticky: true,
              autoDismiss: false,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: new Date(targetRunTime),
              channelId: 'myday-task-alarm',
            },
          });
        } else {
          scheduledIds.alarmId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `📋 Reminder: ${task.title}`,
              body: task.description || `It is now ${task.start_time}. Time to work on this task!`,
              data: { taskId: task.id, type: 'TASK_REMINDER', title: task.title },
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.HIGH,
              autoDismiss: true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: new Date(targetRunTime),
              channelId: 'myday-task-reminder',
            },
          });
        }
      }

      // 2. BEFORE-TASK REMINDER (If lead_time_minutes > 0)
      const leadMinutes = task.lead_time_minutes || 0;
      if (leadMinutes > 0) {
        const reminderTime = targetRunTime - leadMinutes * 60 * 1000;
        if (reminderTime > now) {
          scheduledIds.reminderId = await Notifications.scheduleNotificationAsync({
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

      // 3. SMART ESCALATION (If enabled)
      // 10:00 -> Reminder (handled above)
      // 10:15 -> Follow-up
      // 10:30 -> Alarm
      // 10:45 -> Overdue
      if (task.smart_escalation) {
        const followUpTime = targetRunTime + 15 * 60 * 1000; // T + 15m
        const escalationAlarmTime = targetRunTime + 30 * 60 * 1000; // T + 30m
        const overdueTime = targetRunTime + 45 * 60 * 1000; // T + 45m

        // T + 15m: Follow-up Notification
        if (followUpTime > now) {
          scheduledIds.followUpId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `⚠️ Follow-up: ${task.title}`,
              body: `Task was due 15 minutes ago. Have you completed it?`,
              data: { taskId: task.id, type: 'TASK_REMINDER', title: task.title },
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: new Date(followUpTime),
              channelId: 'myday-task-reminder',
            },
          });
        }

        // T + 30m: Escalated Loud Alarm
        if (escalationAlarmTime > now) {
          scheduledIds.escalationAlarmId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `🔥 ESCALATED ALARM: ${task.title}`,
              body: `Important task is 30 mins late! Attention required immediately.`,
              data: { taskId: task.id, type: 'TASK_ALARM', title: task.title, alarmSound: task.alarm_sound },
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.MAX,
              categoryIdentifier: 'TASK_ALARM_CATEGORY',
              sticky: true,
              autoDismiss: false,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: new Date(escalationAlarmTime),
              channelId: 'myday-task-alarm',
            },
          });
        }

        // T + 45m: Overdue Notice
        if (overdueTime > now) {
          scheduledIds.overdueId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `❌ OVERDUE: ${task.title}`,
              body: `Task was not completed and is now marked as overdue.`,
              data: { taskId: task.id, type: 'TASK_REMINDER', title: task.title },
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: new Date(overdueTime),
              channelId: 'myday-task-reminder',
            },
          });
        }
      }

      // Save notification IDs to storage map
      const notifMap = await storage.getNotificationMap();
      notifMap[task.id] = scheduledIds;
      await storage.setNotificationMap(notifMap);

      return scheduledIds;
    } catch (err) {
      console.warn('Failed to schedule task notifications:', err);
      return {};
    }
  },

  async cancelTaskNotification(taskId: number): Promise<void> {
    try {
      await soundManager.stopAlarm();

      const notifMap = await storage.getNotificationMap();
      const entry = notifMap[taskId];
      if (entry) {
        if (typeof entry === 'string') {
          await Notifications.cancelScheduledNotificationAsync(entry).catch(() => {});
        } else if (typeof entry === 'object') {
          for (const key of Object.keys(entry)) {
            const id = entry[key];
            if (id) {
              await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
            }
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
