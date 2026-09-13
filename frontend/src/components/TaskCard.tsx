import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../types';
import { colors } from '../theme/colors';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { formatTime, getRecurrenceLabel, getRelativeTimeString } from '../utils/dateUtils';

interface Props {
  task: Task;
  onPress: () => void;
  onComplete?: () => void;
  onSnooze?: () => void;
  onTogglePause?: () => void;
}

export const TaskCard: React.FC<Props> = ({
  task,
  onPress,
  onComplete,
  onSnooze,
  onTogglePause,
}) => {
  const isOverdue = task.status === 'OVERDUE';
  const isCompleted = task.status === 'COMPLETED';
  const isPaused = task.status === 'PAUSED';

  const relativeTime = getRelativeTimeString(task.next_run_at);
  const recurrenceLabel = getRecurrenceLabel(task);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isOverdue && styles.cardOverdue,
        isCompleted && styles.cardCompleted,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.badges}>
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </View>

        {task.next_run_at && (
          <View style={[styles.timeChip, isOverdue && styles.timeChipOverdue]}>
            <Ionicons
              name={isOverdue ? "alert-circle" : "time-outline"}
              size={12}
              color={isOverdue ? colors.danger : colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.timeChipText, isOverdue && styles.timeChipTextOverdue]}>
              {relativeTime}
            </Text>
          </View>
        )}
      </View>

      {/* Title & Description */}
      <Text
        style={[styles.title, isCompleted && styles.titleCompleted]}
        numberOfLines={2}
      >
        {task.title}
      </Text>

      {task.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {task.description}
        </Text>
      ) : null}

      {/* Recurrence & Time Meta */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="repeat-outline" size={14} color={colors.primaryLight} style={{ marginRight: 5 }} />
          <Text style={styles.metaText}>{recurrenceLabel}</Text>
        </View>

        <View style={styles.metaItem}>
          <Ionicons name="alarm-outline" size={14} color={colors.textMuted} style={{ marginRight: 5 }} />
          <Text style={styles.metaText}>{formatTime(task.start_time)} ({task.timezone})</Text>
        </View>
      </View>

      {/* Quick Action Footer */}
      <View style={styles.footerRow}>
        {onComplete && !isCompleted && (
          <TouchableOpacity
            style={styles.actionBtnComplete}
            onPress={onComplete}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} style={{ marginRight: 4 }} />
            <Text style={styles.completeBtnText}>Done</Text>
          </TouchableOpacity>
        )}

        {onSnooze && !isCompleted && !isPaused && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onSnooze}
            activeOpacity={0.7}
          >
            <Ionicons name="timer-outline" size={16} color={colors.warning} style={{ marginRight: 4 }} />
            <Text style={styles.actionBtnText}>Snooze</Text>
          </TouchableOpacity>
        )}

        {onTogglePause && !isCompleted && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onTogglePause}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPaused ? "play-outline" : "pause-outline"}
              size={15}
              color={colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.actionBtnText}>{isPaused ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  cardOverdue: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
  },
  cardCompleted: {
    opacity: 0.7,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeChipOverdue: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  timeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timeChipTextOverdue: {
    color: colors.danger,
    fontWeight: '700',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(42, 55, 79, 0.5)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actionBtnComplete: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  completeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
});
