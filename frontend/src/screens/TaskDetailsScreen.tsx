import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task, TaskHistoryItem } from '../types';
import { useTasks } from '../context/TaskContext';
import { historyApi } from '../api/history';
import { colors } from '../theme/colors';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { SnoozeModal } from '../components/SnoozeModal';
import { RescheduleModal } from '../components/RescheduleModal';
import {
  formatDate,
  formatTime,
  formatDateTime,
  getRecurrenceLabel,
  getRelativeTimeString,
} from '../utils/dateUtils';

interface Props {
  task: Task;
  onBack: () => void;
  onEdit: (task: Task) => void;
}

export const TaskDetailsScreen: React.FC<Props> = ({ task, onBack, onEdit }) => {
  const { deleteTask, pauseTask, resumeTask, completeTask, snoozeTask, rescheduleTask } = useTasks();

  const [history, setHistory] = useState<TaskHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showSnoozeModal, setShowSnoozeModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const items = await historyApi.getHistory({ task_id: task.id, limit: 20 });
      setHistory(items);
    } catch (err) {
      console.warn('Could not load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [task.id]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to permanently delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTask(task.id);
            onBack();
          },
        },
      ]
    );
  };

  const handleTogglePause = async () => {
    setActionLoading(true);
    try {
      if (task.status === 'PAUSED') {
        await resumeTask(task.id);
      } else {
        await pauseTask(task.id);
      }
      await fetchHistory();
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    setActionLoading(true);
    try {
      await completeTask(task.id);
      await fetchHistory();
    } finally {
      setActionLoading(false);
    }
  };

  const isOverdue = task.status === 'OVERDUE';
  const isPaused = task.status === 'PAUSED';
  const isCompleted = task.status === 'COMPLETED';

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onBack} style={styles.headerBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Details</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => onEdit(task)} style={styles.headerBtn} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={20} color={colors.primaryLight} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={[styles.headerBtn, styles.deleteBtn]} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.badgeRow}>
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </View>

          <Text style={[styles.title, isCompleted && styles.titleCompleted]}>{task.title}</Text>

          {task.description ? (
            <Text style={styles.description}>{task.description}</Text>
          ) : null}

          {/* Next Run Banner */}
          {task.next_run_at ? (
            <View style={[styles.nextRunBanner, isOverdue && styles.nextRunOverdue]}>
              <Ionicons
                name={isOverdue ? "alert-circle" : "time"}
                size={22}
                color={isOverdue ? colors.danger : colors.primaryLight}
                style={{ marginRight: 12 }}
              />
              <View>
                <Text style={styles.nextRunLabel}>
                  {task.snoozed_until ? 'Snoozed Until' : 'Next Execution'}
                </Text>
                <Text style={styles.nextRunTime}>
                  {formatDateTime(task.next_run_at)} ({getRelativeTimeString(task.next_run_at)})
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.nextRunBanner}>
              <Ionicons name="checkmark-done-circle" size={22} color={colors.success} style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.nextRunLabel}>Schedule Status</Text>
                <Text style={styles.nextRunTime}>Task Completed</Text>
              </View>
            </View>
          )}

          {/* Details Table */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Frequency</Text>
              <Text style={styles.detailValue}>{getRecurrenceLabel(task)}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Scheduled Time</Text>
              <Text style={styles.detailValue}>{formatTime(task.start_time)}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Timezone</Text>
              <Text style={styles.detailValue}>{task.timezone}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Lead Reminder</Text>
              <Text style={styles.detailValue}>
                {task.lead_time_minutes > 0 ? `${task.lead_time_minutes} min before` : 'At event time'}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Alert Mode</Text>
              <Text style={[styles.detailValue, task.reminder_mode === 'ALARM' && { color: colors.danger, fontWeight: '700' }]}>
                {task.reminder_mode === 'ALARM' ? `🚨 Smart Alarm (${task.alarm_sound || 'default'})` : '🔔 Standard Notification'}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Smart Escalation</Text>
              <Text style={[styles.detailValue, task.smart_escalation && { color: colors.warning, fontWeight: '700' }]}>
                {task.smart_escalation ? '🔥 Enabled (T → T+15m → T+30m → T+45m)' : 'Disabled'}
              </Text>
            </View>

            {task.is_location_based && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Location Trigger</Text>
                <Text style={[styles.detailValue, { color: colors.primaryLight, fontWeight: '700' }]}>
                  📍 {task.location_trigger === 'ENTER' ? 'Arrive at' : 'Leave'} {task.location_name || 'Location'} ({task.location_radius || 200}m)
                </Text>
              </View>
            )}

            {task.end_date && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Ends On</Text>
                <Text style={styles.detailValue}>{formatDate(task.end_date)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Controls */}
        <View style={styles.actionGrid}>
          {!isCompleted && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.completeBtn]}
              onPress={handleComplete}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={20} color={colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.completeBtnText}>Mark Done</Text>
            </TouchableOpacity>
          )}

          {!isCompleted && !isPaused && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowSnoozeModal(true)}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="timer-outline" size={20} color={colors.warning} style={{ marginRight: 8 }} />
              <Text style={styles.actionText}>Snooze</Text>
            </TouchableOpacity>
          )}

          {!isCompleted && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowRescheduleModal(true)}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.primaryLight} style={{ marginRight: 8 }} />
              <Text style={styles.actionText}>Reschedule</Text>
            </TouchableOpacity>
          )}

          {!isCompleted && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleTogglePause}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isPaused ? "play-outline" : "pause-outline"}
                size={20}
                color={colors.textSecondary}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.actionText}>{isPaused ? 'Resume' : 'Pause'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Task History Timeline */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Ionicons name="time-outline" size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.historyTitle}>Activity History</Text>
          </View>

          {historyLoading ? (
            <ActivityIndicator color={colors.primaryLight} style={{ marginVertical: 20 }} />
          ) : history.length === 0 ? (
            <Text style={styles.noHistory}>No activity logged yet.</Text>
          ) : (
            <View style={styles.timeline}>
              {history.map((item, idx) => (
                <View key={item.id} style={styles.timelineItem}>
                  <View style={styles.timelinePoint}>
                    <View style={styles.pointDot} />
                    {idx < history.length - 1 && <View style={styles.pointLine} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineMeta}>
                      <Text style={styles.eventType}>{item.event_type}</Text>
                      <Text style={styles.eventTime}>{formatDateTime(item.event_time)}</Text>
                    </View>
                    {item.details && <Text style={styles.eventDetails}>{item.details}</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Snooze Modal */}
      <SnoozeModal
        visible={showSnoozeModal}
        taskTitle={task.title}
        onClose={() => setShowSnoozeModal(false)}
        onSnooze={async (minutes) => {
          await snoozeTask(task.id, { duration_minutes: minutes });
          await fetchHistory();
        }}
      />

      {/* Reschedule Modal */}
      <RescheduleModal
        visible={showRescheduleModal}
        initialDate={task.start_date}
        initialTime={task.start_time}
        initialTimezone={task.timezone}
        onClose={() => setShowRescheduleModal(false)}
        onReschedule={async (payload) => {
          await rescheduleTask(task.id, payload);
          await fetchHistory();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteBtn: {
    backgroundColor: colors.dangerGlow,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  nextRunBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  nextRunOverdue: {
    backgroundColor: colors.dangerGlow,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  nextRunLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  nextRunTime: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailItem: {
    width: '45%',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  completeBtn: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  completeBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  actionText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  historySection: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  noHistory: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  timeline: {
    paddingLeft: 6,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  timelinePoint: {
    alignItems: 'center',
    marginRight: 12,
  },
  pointDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primaryLight,
  },
  pointLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  eventType: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  eventTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  eventDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});
