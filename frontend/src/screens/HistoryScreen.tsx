import React, { useState, useEffect } from 'react';
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
import { historyApi } from '../api/history';
import { TaskHistoryItem, HistoryEventType } from '../types';
import { colors } from '../theme/colors';
import { EmptyState } from '../components/EmptyState';
import { formatDateTime } from '../utils/dateUtils';

const EVENT_FILTERS: { label: string; value: HistoryEventType | 'ALL' }[] = [
  { label: 'All Events', value: 'ALL' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Snoozed', value: 'SNOOZED' },
  { label: 'Rescheduled', value: 'RESCHEDULED' },
  { label: 'Created', value: 'CREATED' },
  { label: 'Paused', value: 'PAUSED' },
  { label: 'Resumed', value: 'RESUMED' },
];

export const HistoryScreen: React.FC = () => {
  const [history, setHistory] = useState<TaskHistoryItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<HistoryEventType | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const filterParam = selectedFilter === 'ALL' ? undefined : selectedFilter;
      const items = await historyApi.getHistory({ event_type: filterParam, limit: 100 });
      setHistory(items);
    } catch (err) {
      console.warn('Failed to load history logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedFilter]);

  const getEventBadgeColor = (type: HistoryEventType) => {
    switch (type) {
      case 'COMPLETED':
        return colors.success;
      case 'SNOOZED':
        return colors.warning;
      case 'RESCHEDULED':
        return colors.primaryLight;
      case 'CREATED':
        return colors.info;
      case 'PAUSED':
        return colors.textMuted;
      case 'RESUMED':
        return colors.accent;
      case 'OVERDUE':
        return colors.danger;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Execution History</Text>
        <Text style={styles.subtitle}>Audit trail of task triggers, snoozes, and state changes</Text>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {EVENT_FILTERS.map(f => {
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
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchLogs}
            tintColor={colors.primaryLight}
          />
        }
      >
        {history.length === 0 && !loading ? (
          <EmptyState
            icon="time-outline"
            title="No activity records yet"
            description="As tasks run, are snoozed, or completed, their history events will appear here."
          />
        ) : (
          history.map(item => {
            const badgeColor = getEventBadgeColor(item.event_type);
            return (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.taskTitle} numberOfLines={1}>
                    {item.task_title || `Task #${item.task_id}`}
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: `${badgeColor}20`, borderColor: `${badgeColor}40` },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: badgeColor }]}>
                      {item.event_type}
                    </Text>
                  </View>
                </View>

                {item.details ? <Text style={styles.details}>{item.details}</Text> : null}

                <View style={styles.cardFooter}>
                  <Ionicons name="time-outline" size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={styles.timeText}>{formatDateTime(item.event_time)}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 6,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.surface,
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  details: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
