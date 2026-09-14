import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TaskContext';
import { Task } from '../types';
import { colors } from '../theme/colors';
import { TaskCard } from '../components/TaskCard';
import { SnoozeModal } from '../components/SnoozeModal';
import { AIPlannerModal } from '../components/AIPlannerModal';
import { EmptyState } from '../components/EmptyState';
import { formatDate, getLocalTodayDateString, parseUtcDate } from '../utils/dateUtils';

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
  const [showAIPlanner, setShowAIPlanner] = useState<boolean>(false);
  const [todayDateStr, setTodayDateStr] = useState<string>(getLocalTodayDateString());

  // Listen for AppState changes so when user opens/resumes app every day, the date updates
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const freshToday = getLocalTodayDateString();
        setTodayDateStr(freshToday);
        refreshTasks().catch(console.warn);
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);

    // Also periodically check if midnight has passed
    const timer = setInterval(() => {
      const freshToday = getLocalTodayDateString();
      setTodayDateStr((prev) => {
        if (prev !== freshToday) {
          refreshTasks().catch(console.warn);
          return freshToday;
        }
        return prev;
      });
    }, 30000);

    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [refreshTasks]);

  const formattedToday = formatDate(todayDateStr);

  const dateClean = todayDateStr || getLocalTodayDateString();
  const [ty, tm, td] = dateClean.split('-').map(Number);
  const todayObj = new Date(ty, (tm || 1) - 1, td || 1);
  const todayWeekday = (todayObj.getDay() + 6) % 7;

  // Filter tasks due today, overdue, or active daily/weekly habits
  const todayTasks = tasks.filter((t) => {
    if (t.status === 'OVERDUE') return true;
    if (t.status === 'ACTIVE') {
      if (t.start_date === todayDateStr) return true;
      if (t.recurrence_type === 'DAILY') return true;
      if (
        t.recurrence_type === 'WEEKLY' &&
        t.recurrence_days &&
        t.recurrence_days.includes(todayWeekday)
      ) {
        return true;
      }
      if (t.next_run_at) {
        const nrDate = parseUtcDate(t.next_run_at);
        if (nrDate) {
          const y = nrDate.getFullYear();
          const m = String(nrDate.getMonth() + 1).padStart(2, '0');
          const d = String(nrDate.getDate()).padStart(2, '0');
          if (`${y}-${m}-${d}` === todayDateStr) return true;
        }
      }
    }
    return false;
  });

  const upcomingTasks = tasks
    .filter((t) => t.status === 'ACTIVE' && !todayTasks.some((tt) => tt.id === t.id))
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
            <Text style={styles.metricValue}>
              {Math.max(summary?.today_due ?? 0, todayTasks.length)}
            </Text>
          </View>

          <View style={[styles.metricCard, { borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>Active</Text>
              <Ionicons name="play-circle-outline" size={16} color={colors.success} />
            </View>
            <Text style={[styles.metricValue, { color: colors.success }]}>
              {Math.max(summary?.active ?? 0, tasks.filter((t) => t.status === 'ACTIVE').length)}
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

        {/* AI Daily Planner Banner */}
        <TouchableOpacity
          style={styles.aiPlannerCard}
          onPress={() => setShowAIPlanner(true)}
          activeOpacity={0.85}
        >
          <View style={styles.aiPlannerLeft}>
            <View style={styles.aiIconBadge}>
              <Ionicons name="sparkles" size={20} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.aiBadgeRow}>
                <Text style={styles.aiPlannerTag}>MYDAY 2.0 AI</Text>
              </View>
              <Text style={styles.aiPlannerTitle}>Plan My Day</Text>
              <Text style={styles.aiPlannerSubtitle}>
                Tell AI what you need to study or do today. It creates your schedule automatically.
              </Text>
            </View>
          </View>
          <View style={styles.aiArrowCircle}>
            <Ionicons name="arrow-forward" size={18} color={colors.white} />
          </View>
        </TouchableOpacity>

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

      {/* AI Daily Planner Modal */}
      <AIPlannerModal
        visible={showAIPlanner}
        onClose={() => setShowAIPlanner(false)}
        onPlanAccepted={() => {
          refreshTasks();
        }}
      />

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
  aiPlannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  aiPlannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  aiIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  aiBadgeRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  aiPlannerTag: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primaryLight,
    letterSpacing: 1.2,
    backgroundColor: colors.primaryGlow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiPlannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  aiPlannerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  aiArrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
});
