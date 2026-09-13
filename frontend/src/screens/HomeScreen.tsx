import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TaskContext';
import { Task } from '../types';
import { colors } from '../theme/colors';
import { TaskCard } from '../components/TaskCard';
import { SnoozeModal } from '../components/SnoozeModal';
import { EmptyState } from '../components/EmptyState';
import { formatDate } from '../utils/dateUtils';

interface Props {
  onNavigateToCreate: () => void;
  onNavigateToTasks: () => void;
  onSelectTask: (task: Task) => void;
  onNavigateToSettings: () => void;
}

export const HomeScreen: React.FC<Props> = ({
  onNavigateToCreate,
  onNavigateToTasks,
  onSelectTask,
  onNavigateToSettings,
}) => {
  const { user } = useAuth();
  const { tasks, summary, isLoading, refreshTasks, completeTask, pauseTask, resumeTask, snoozeTask } = useTasks();

  const [snoozingTask, setSnoozingTask] = useState<Task | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const formattedToday = formatDate(todayStr);

  // Filter tasks due today or overdue or top upcoming
  const todayTasks = tasks.filter(t => {
    if (t.status === 'OVERDUE') return true;
    if (t.status === 'ACTIVE' && t.next_run_at) {
      return t.next_run_at.startsWith(todayStr);
    }
    return false;
  });

  const upcomingTasks = tasks
    .filter(t => t.status === 'ACTIVE' && t.next_run_at && !t.next_run_at.startsWith(todayStr))
    .slice(0, 5);

  const handleTogglePause = async (task: Task) => {
    if (task.status === 'PAUSED') {
      await resumeTask(task.id);
    } else {
      await pauseTask(task.id);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hello, {user?.full_name ? user.full_name.split(' ')[0] : 'there'} 👋
          </Text>
          <Text style={styles.dateText}>{formattedToday}</Text>
        </View>

        <TouchableOpacity style={styles.settingsBtn} onPress={onNavigateToSettings} activeOpacity={0.7}>
          <Ionicons name="settings-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshTasks}
            tintColor={colors.primaryLight}
          />
        }
      >
        {/* Metric Summary Cards */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { borderColor: 'rgba(99, 102, 241, 0.3)' }]}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>Today</Text>
              <Ionicons name="calendar-outline" size={16} color={colors.primaryLight} />
            </View>
            <Text style={styles.metricValue}>{summary?.today_due ?? 0}</Text>
          </View>

          <View style={[styles.metricCard, { borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>Active</Text>
              <Ionicons name="play-circle-outline" size={16} color={colors.success} />
            </View>
            <Text style={[styles.metricValue, { color: colors.success }]}>
              {summary?.active ?? 0}
            </Text>
          </View>

          <View style={[styles.metricCard, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>Overdue</Text>
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            </View>
            <Text style={[styles.metricValue, { color: colors.danger }]}>
              {summary?.overdue ?? 0}
            </Text>
          </View>

          <View style={[styles.metricCard, { borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>Paused</Text>
              <Ionicons name="pause-circle-outline" size={16} color={colors.warning} />
            </View>
            <Text style={[styles.metricValue, { color: colors.warning }]}>
              {summary?.paused ?? 0}
            </Text>
          </View>
        </View>

        {/* Section: Today's Agenda */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="flash-outline" size={18} color={colors.warning} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Today's Agenda</Text>
          </View>
          <TouchableOpacity onPress={onNavigateToTasks}>
            <Text style={styles.viewAllText}>View All ({tasks.length})</Text>
          </TouchableOpacity>
        </View>

        {todayTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={36} color={colors.success} />
            <Text style={styles.emptyTitle}>You're all caught up for today!</Text>
            <Text style={styles.emptySubtitle}>No pending or overdue reminders right now.</Text>
          </View>
        ) : (
          todayTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onPress={() => onSelectTask(task)}
              onComplete={() => completeTask(task.id)}
              onSnooze={() => setSnoozingTask(task)}
              onTogglePause={() => handleTogglePause(task)}
            />
          ))
        )}

        {/* Section: Upcoming Ahead */}
        {upcomingTasks.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="time-outline" size={18} color={colors.primaryLight} style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>Coming Up Next</Text>
              </View>
            </View>

            {upcomingTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onPress={() => onSelectTask(task)}
                onComplete={() => completeTask(task.id)}
                onSnooze={() => setSnoozingTask(task)}
                onTogglePause={() => handleTogglePause(task)}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={onNavigateToCreate}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* Snooze Modal */}
      {snoozingTask && (
        <SnoozeModal
          visible={!!snoozingTask}
          taskTitle={snoozingTask.title}
          onClose={() => setSnoozingTask(null)}
          onSnooze={async (minutes) => {
            await snoozeTask(snoozingTask.id, { duration_minutes: minutes });
          }}
        />
      )}
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
    backgroundColor: colors.background,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  dateText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  settingsBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 90,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
