import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTasks } from '../context/TaskContext';
import { Task, TaskStatus } from '../types';
import { colors } from '../theme/colors';
import { TaskCard } from '../components/TaskCard';
import { SnoozeModal } from '../components/SnoozeModal';
import { EmptyState } from '../components/EmptyState';

interface Props {
  onSelectTask: (task: Task) => void;
  onNavigateToCreate: () => void;
}

type FilterOption = 'ALL' | TaskStatus;
type SortOption = 'DUE_ASC' | 'PRIORITY_DESC' | 'TITLE_ASC';

const FILTERS: { label: string; value: FilterOption }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Paused', value: 'PAUSED' },
  { label: 'Overdue', value: 'OVERDUE' },
  { label: 'Completed', value: 'COMPLETED' },
];

export const TasksScreen: React.FC<Props> = ({ onSelectTask, onNavigateToCreate }) => {
  const { tasks, isLoading, refreshTasks, completeTask, pauseTask, resumeTask, snoozeTask } = useTasks();

  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('DUE_ASC');
  const [snoozingTask, setSnoozingTask] = useState<Task | null>(null);

  const priorityOrder: Record<string, number> = {
    URGENT: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  const filteredTasks = useMemo(() => {
    let list = [...tasks];

    // Status filter
    if (selectedFilter !== 'ALL') {
      list = list.filter(t => t.status === selectedFilter);
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        t => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'DUE_ASC') {
        if (!a.next_run_at) return 1;
        if (!b.next_run_at) return -1;
        return new Date(a.next_run_at).getTime() - new Date(b.next_run_at).getTime();
      }
      if (sortBy === 'PRIORITY_DESC') {
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      }
      if (sortBy === 'TITLE_ASC') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return list;
  }, [tasks, selectedFilter, search, sortBy]);

  const handleTogglePause = async (task: Task) => {
    if (task.status === 'PAUSED') {
      await resumeTask(task.id);
    } else {
      await pauseTask(task.id);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search & Header Bar */}
      <View style={styles.topContainer}>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks or descriptions..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map(f => {
            const isSelected = selectedFilter === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
                onPress={() => setSelectedFilter(f.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Sort Row */}
        <View style={styles.sortRow}>
          <Text style={styles.countText}>
            Showing {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
          </Text>

          <View style={styles.sortButtons}>
            <TouchableOpacity
              style={[styles.sortBtn, sortBy === 'DUE_ASC' && styles.sortBtnActive]}
              onPress={() => setSortBy('DUE_ASC')}
            >
              <Text style={[styles.sortBtnText, sortBy === 'DUE_ASC' && styles.sortBtnTextActive]}>Due</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortBtn, sortBy === 'PRIORITY_DESC' && styles.sortBtnActive]}
              onPress={() => setSortBy('PRIORITY_DESC')}
            >
              <Text style={[styles.sortBtnText, sortBy === 'PRIORITY_DESC' && styles.sortBtnTextActive]}>Priority</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortBtn, sortBy === 'TITLE_ASC' && styles.sortBtnActive]}
              onPress={() => setSortBy('TITLE_ASC')}
            >
              <Text style={[styles.sortBtnText, sortBy === 'TITLE_ASC' && styles.sortBtnTextActive]}>A-Z</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Task List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshTasks}
            tintColor={colors.primaryLight}
          />
        }
      >
        {filteredTasks.length === 0 ? (
          <EmptyState
            icon="clipboard-outline"
            title="No tasks match your filters"
            description="Try changing your search terms, status filters, or add a brand new task."
            actionLabel="Create Task"
            onAction={onNavigateToCreate}
          />
        ) : (
          filteredTasks.map(task => (
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
      </ScrollView>

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
  topContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  sortBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  sortBtnActive: {
    backgroundColor: colors.primaryGlow,
  },
  sortBtnText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  sortBtnTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
});
