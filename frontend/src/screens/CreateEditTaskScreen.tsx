import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTasks } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import { Task, RecurrenceType, IntervalUnit, TaskPriority } from '../types';
import { colors } from '../theme/colors';
import { HeaderBar } from '../components/HeaderBar';
import { SchedulePicker } from '../components/SchedulePicker';
import { getCommonTimezones } from '../utils/dateUtils';

interface Props {
  editingTask?: Task | null;
  onBack: () => void;
  onSaved: () => void;
}

const PRIORITIES: { label: string; value: TaskPriority; color: string }[] = [
  { label: 'Low', value: 'LOW', color: colors.priorities.LOW },
  { label: 'Medium', value: 'MEDIUM', color: colors.priorities.MEDIUM },
  { label: 'High', value: 'HIGH', color: colors.priorities.HIGH },
  { label: 'Urgent', value: 'URGENT', color: colors.priorities.URGENT },
];

export const CreateEditTaskScreen: React.FC<Props> = ({ editingTask, onBack, onSaved }) => {
  const { createTask, updateTask } = useTasks();
  const { user } = useAuth();

  const isEdit = !!editingTask;

  const defaultDate = new Date().toISOString().split('T')[0];
  const defaultTime = '09:00';
  const defaultTz = user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const [title, setTitle] = useState(editingTask?.title || '');
  const [description, setDescription] = useState(editingTask?.description || '');
  const [startDate, setStartDate] = useState(editingTask?.start_date || defaultDate);
  const [startTime, setStartTime] = useState(
    editingTask?.start_time ? editingTask.start_time.slice(0, 5) : defaultTime
  );
  const [timezone, setTimezone] = useState(editingTask?.timezone || defaultTz);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(
    editingTask?.recurrence_type || 'DAILY'
  );
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(
    editingTask?.recurrence_days || [1, 2, 3, 4, 5] // Default weekdays
  );
  const [intervalValue, setIntervalValue] = useState<number>(
    editingTask?.interval_value || 1
  );
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>(
    editingTask?.interval_unit || 'DAYS'
  );
  const [hasEndDate, setHasEndDate] = useState<boolean>(!!editingTask?.end_date);
  const [endDate, setEndDate] = useState<string>(editingTask?.end_date || '');
  const [priority, setPriority] = useState<TaskPriority>(editingTask?.priority || 'MEDIUM');
  const [leadTimeMinutes, setLeadTimeMinutes] = useState<number>(
    editingTask?.lead_time_minutes ?? 15
  );

  const [showTzPicker, setShowTzPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const timezones = getCommonTimezones();

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!title.trim()) {
      setErrorMsg('Task title is required.');
      return;
    }
    if (!startDate) {
      setErrorMsg('Start date is required.');
      return;
    }
    if (!startTime) {
      setErrorMsg('Start time is required.');
      return;
    }

    setLoading(true);
    try {
      const formattedTime = startTime.length === 5 ? `${startTime}:00` : startTime;
      const payload: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        start_date: startDate,
        start_time: formattedTime,
        timezone,
        recurrence_type: recurrenceType,
        recurrence_days: recurrenceType === 'WEEKLY' ? recurrenceDays : undefined,
        interval_value: recurrenceType === 'CUSTOM_INTERVAL' ? intervalValue : undefined,
        interval_unit: recurrenceType === 'CUSTOM_INTERVAL' ? intervalUnit : undefined,
        end_date: hasEndDate && endDate ? endDate : undefined,
        priority,
        lead_time_minutes: leadTimeMinutes,
      };

      if (isEdit && editingTask) {
        await updateTask(editingTask.id, payload);
      } else {
        await createTask(payload);
      }
      onSaved();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <HeaderBar
        title={isEdit ? 'Edit Task' : 'New Task'}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {errorMsg && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Task Title *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Morning Medication or Team Sync"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Additional notes, checklist or reminder details..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Start Date & Time Row */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Start Date</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="calendar-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.inlineInput}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Start Time</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="time-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.inlineInput}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="09:00"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
        </View>

        {/* Timezone Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Timezone</Text>
          <TouchableOpacity
            style={styles.tzSelector}
            onPress={() => setShowTzPicker(!showTzPicker)}
          >
            <Ionicons name="globe-outline" size={16} color={colors.primaryLight} style={{ marginRight: 8 }} />
            <Text style={styles.tzText}>{timezone}</Text>
            <Ionicons name={showTzPicker ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          {showTzPicker && (
            <View style={styles.dropdown}>
              {timezones.map(tz => (
                <TouchableOpacity
                  key={tz}
                  style={[styles.dropdownItem, tz === timezone && styles.dropdownItemSelected]}
                  onPress={() => {
                    setTimezone(tz);
                    setShowTzPicker(false);
                  }}
                >
                  <Text style={[styles.dropdownText, tz === timezone && styles.dropdownTextSelected]}>
                    {tz}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Schedule & Recurrence Picker */}
        <SchedulePicker
          recurrenceType={recurrenceType}
          onChangeRecurrenceType={setRecurrenceType}
          recurrenceDays={recurrenceDays}
          onChangeRecurrenceDays={setRecurrenceDays}
          intervalValue={intervalValue}
          onChangeIntervalValue={setIntervalValue}
          intervalUnit={intervalUnit}
          onChangeIntervalUnit={setIntervalUnit}
          leadTimeMinutes={leadTimeMinutes}
          onChangeLeadTimeMinutes={setLeadTimeMinutes}
        />

        {/* Optional End Date */}
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleTitle}>Set End Date</Text>
            <Text style={styles.toggleSubtitle}>Stop recurrence automatically after this date</Text>
          </View>
          <Switch
            value={hasEndDate}
            onValueChange={setHasEndDate}
            trackColor={{ false: colors.surfaceElevated, true: colors.primaryLight }}
            thumbColor={hasEndDate ? colors.primary : colors.textMuted}
          />
        </View>

        {hasEndDate && (
          <View style={[styles.inputGroup, { marginTop: 10 }]}>
            <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="calendar-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.inlineInput}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="2026-12-31"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
        )}

        {/* Priority Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Priority Level</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map(p => {
              const isSelected = priority === p.value;
              return (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.priorityBtn,
                    isSelected && { borderColor: p.color, backgroundColor: `${p.color}20` },
                  ]}
                  onPress={() => setPriority(p.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                  <Text style={[styles.priorityText, isSelected && { color: p.color, fontWeight: '700' }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>
              {isEdit ? 'Save Changes' : 'Create Task'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerGlow,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.danger,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 48,
  },
  inlineInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  tzSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 48,
  },
  tzText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  dropdown: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 6,
    maxHeight: 180,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: colors.primaryGlow,
  },
  dropdownText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  dropdownTextSelected: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 10,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
