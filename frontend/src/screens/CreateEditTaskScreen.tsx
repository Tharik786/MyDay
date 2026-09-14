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
import { Task, RecurrenceType, IntervalUnit, TaskPriority, ReminderMode, LocationTrigger } from '../types';
import { colors } from '../theme/colors';
import { HeaderBar } from '../components/HeaderBar';
import { SchedulePicker } from '../components/SchedulePicker';
import { getCommonTimezones, getLocalTodayDateString, to12HourParts, to24HourString } from '../utils/dateUtils';
import { locationManager } from '../services/locationManager';
import { soundManager } from '../services/soundManager';

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

  const defaultDate = getLocalTodayDateString();
  const defaultTz = user?.timezone || 'Asia/Kolkata';

  const [title, setTitle] = useState(editingTask?.title || '');
  const [description, setDescription] = useState(editingTask?.description || '');
  const [startDate, setStartDate] = useState(editingTask?.start_date || defaultDate);
  const initialTimeParts = to12HourParts(editingTask?.start_time || '09:00');
  const [hour12, setHour12] = useState<number>(initialTimeParts.hour);
  const [minute12, setMinute12] = useState<string>(initialTimeParts.minute);
  const [ampm, setAmPm] = useState<'AM' | 'PM'>(initialTimeParts.ampm);
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

  // MyDay 2.0 Feature States
  const [reminderMode, setReminderMode] = useState<ReminderMode>(
    editingTask?.reminder_mode || 'NOTIFICATION'
  );
  const [alarmSound, setAlarmSound] = useState<string>(
    editingTask?.alarm_sound || 'default'
  );
  const [smartEscalation, setSmartEscalation] = useState<boolean>(
    editingTask?.smart_escalation ?? false
  );
  const [isLocationBased, setIsLocationBased] = useState<boolean>(
    editingTask?.is_location_based ?? false
  );
  const [locationName, setLocationName] = useState<string>(
    editingTask?.location_name || ''
  );
  const [locationLat, setLocationLat] = useState<number | undefined>(
    editingTask?.location_lat
  );
  const [locationLng, setLocationLng] = useState<number | undefined>(
    editingTask?.location_lng
  );
  const [locationRadius, setLocationRadius] = useState<number>(
    editingTask?.location_radius || 200
  );
  const [locationTrigger, setLocationTrigger] = useState<LocationTrigger>(
    editingTask?.location_trigger || 'ENTER'
  );
  const [locating, setLocating] = useState<boolean>(false);
  const [testingSound, setTestingSound] = useState<boolean>(false);

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

    setLoading(true);
    try {
      const safeHour = Math.min(Math.max(Number(hour12) || 1, 1), 12);
      const safeMinNum = Math.min(Math.max(Number(minute12) || 0, 0), 59);
      const safeMinute = String(safeMinNum).padStart(2, '0');
      const formattedTime = to24HourString(safeHour, safeMinute, ampm);
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
        // MyDay 2.0
        reminder_mode: reminderMode,
        alarm_sound: reminderMode === 'ALARM' ? alarmSound : undefined,
        smart_escalation: smartEscalation,
        is_location_based: isLocationBased,
        location_name: isLocationBased ? locationName.trim() : undefined,
        location_lat: isLocationBased ? locationLat : undefined,
        location_lng: isLocationBased ? locationLng : undefined,
        location_radius: isLocationBased ? locationRadius : undefined,
        location_trigger: isLocationBased ? locationTrigger : undefined,
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

        {/* Start Date */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Start Date</Text>
            <View style={styles.quickDateChips}>
              <TouchableOpacity
                style={[styles.quickDateChip, startDate === getLocalTodayDateString() && styles.quickDateChipActive]}
                onPress={() => setStartDate(getLocalTodayDateString())}
                activeOpacity={0.7}
              >
                <Text style={[styles.quickDateText, startDate === getLocalTodayDateString() && styles.quickDateTextActive]}>
                  Today
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickDateChip}
                onPress={() => {
                  const tm = new Date();
                  tm.setDate(tm.getDate() + 1);
                  const y = tm.getFullYear();
                  const m = String(tm.getMonth() + 1).padStart(2, '0');
                  const d = String(tm.getDate()).padStart(2, '0');
                  setStartDate(`${y}-${m}-${d}`);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.quickDateText}>Tomorrow</Text>
              </TouchableOpacity>
            </View>
          </View>
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

        {/* 12-Hour AM/PM Start Time */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Start Time (12-Hour AM/PM)</Text>
            <View style={styles.liveTimeBadge}>
              <Ionicons name="time-outline" size={14} color={colors.primaryLight} style={{ marginRight: 4 }} />
              <Text style={styles.liveTimeText}>
                {String(hour12).padStart(2, '0')}:{minute12.padStart(2, '0')} {ampm}
              </Text>
            </View>
          </View>

          {/* Time Picker Controls */}
          <View style={styles.timePickerContainer}>
            {/* Hour Block */}
            <View style={styles.timeBlock}>
              <Text style={styles.timeBlockLabel}>HOUR</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setHour12((h) => (h <= 1 ? 12 : h - 1))}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-down" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
                <TextInput
                  style={styles.timeValueInput}
                  value={String(hour12).padStart(2, '0')}
                  keyboardType="number-pad"
                  maxLength={2}
                  onChangeText={(val) => {
                    const num = parseInt(val, 10);
                    if (!isNaN(num)) {
                      if (num >= 1 && num <= 12) setHour12(num);
                    } else if (val === '') {
                      setHour12(1);
                    }
                  }}
                />
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setHour12((h) => (h >= 12 ? 1 : h + 1))}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-up" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.timeColon}>:</Text>

            {/* Minute Block */}
            <View style={styles.timeBlock}>
              <Text style={styles.timeBlockLabel}>MINUTE</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => {
                    const curr = parseInt(minute12, 10) || 0;
                    const next = curr <= 0 ? 55 : curr - 5;
                    setMinute12(String(next).padStart(2, '0'));
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-down" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
                <TextInput
                  style={styles.timeValueInput}
                  value={minute12.padStart(2, '0')}
                  keyboardType="number-pad"
                  maxLength={2}
                  onChangeText={(val) => {
                    const clean = val.replace(/[^0-9]/g, '');
                    if (clean === '') {
                      setMinute12('00');
                    } else {
                      const num = Math.min(Math.max(parseInt(clean, 10), 0), 59);
                      setMinute12(String(num).padStart(2, '0'));
                    }
                  }}
                />
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => {
                    const curr = parseInt(minute12, 10) || 0;
                    const next = curr >= 55 ? 0 : curr + 5;
                    setMinute12(String(next).padStart(2, '0'));
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-up" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* AM / PM Toggle */}
            <View style={styles.ampmContainer}>
              <TouchableOpacity
                style={[styles.ampmBtn, ampm === 'AM' && styles.ampmBtnActive]}
                onPress={() => setAmPm('AM')}
                activeOpacity={0.7}
              >
                <Text style={[styles.ampmText, ampm === 'AM' && styles.ampmTextActive]}>AM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ampmBtn, ampm === 'PM' && styles.ampmBtnActive]}
                onPress={() => setAmPm('PM')}
                activeOpacity={0.7}
              >
                <Text style={[styles.ampmText, ampm === 'PM' && styles.ampmTextActive]}>PM</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Presets */}
          <View style={styles.timePresetsRow}>
            {[
              { label: '09:00 AM', h: 9, m: '00', p: 'AM' as const },
              { label: '01:00 PM', h: 1, m: '00', p: 'PM' as const },
              { label: '06:00 PM', h: 6, m: '00', p: 'PM' as const },
              { label: '09:00 PM', h: 9, m: '00', p: 'PM' as const },
            ].map((preset) => {
              const isSelected = hour12 === preset.h && minute12 === preset.m && ampm === preset.p;
              return (
                <TouchableOpacity
                  key={preset.label}
                  style={[styles.timePresetChip, isSelected && styles.timePresetChipActive]}
                  onPress={() => {
                    setHour12(preset.h);
                    setMinute12(preset.m);
                    setAmPm(preset.p);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.timePresetText, isSelected && styles.timePresetTextActive]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
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

        {/* ========================================= */}
        {/* MYDAY 2.0: REMINDER MODE (NOTIFICATION VS SMART ALARM) */}
        {/* ========================================= */}
        <View style={styles.sectionDivider} />
        <Text style={styles.sectionHeaderTitle}>🚨 Alert & Reminder Options</Text>

        <View style={styles.modeTabsRow}>
          <TouchableOpacity
            style={[
              styles.modeTab,
              reminderMode === 'NOTIFICATION' && styles.modeTabSelected,
            ]}
            onPress={() => setReminderMode('NOTIFICATION')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="notifications-outline"
              size={18}
              color={reminderMode === 'NOTIFICATION' ? colors.primaryLight : colors.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.modeTabText,
                reminderMode === 'NOTIFICATION' && styles.modeTabTextSelected,
              ]}
            >
              Standard Notification
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeTab,
              reminderMode === 'ALARM' && styles.modeTabSelectedAlarm,
            ]}
            onPress={() => setReminderMode('ALARM')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="alarm"
              size={18}
              color={reminderMode === 'ALARM' ? colors.danger : colors.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.modeTabText,
                reminderMode === 'ALARM' && { color: colors.danger, fontWeight: '700' },
              ]}
            >
              Smart Alarm
            </Text>
          </TouchableOpacity>
        </View>

        {/* Smart Alarm Settings (If ALARM selected) */}
        {reminderMode === 'ALARM' && (
          <View style={styles.alarmConfigBox}>
            <View style={styles.alarmConfigHeader}>
              <Ionicons name="volume-high-outline" size={16} color={colors.danger} style={{ marginRight: 6 }} />
              <Text style={styles.alarmConfigTitle}>Alarm Sound & Vibration</Text>
            </View>

            <View style={styles.soundOptionsRow}>
              {[
                { id: 'default', label: '📱 Mobile Default Alarm' },
                { id: 'radar', label: 'Digital Radar' },
                { id: 'chime', label: 'Bell Chime' },
                { id: 'energetic', label: 'Bugle Tune' },
              ].map((snd) => (
                <TouchableOpacity
                  key={snd.id}
                  style={[
                    styles.soundChip,
                    alarmSound === snd.id && styles.soundChipSelected,
                  ]}
                  onPress={() => setAlarmSound(snd.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.soundChipText,
                      alarmSound === snd.id && styles.soundChipTextSelected,
                    ]}
                  >
                    {snd.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Test Alarm Sound Preview */}
            <TouchableOpacity
              style={styles.testSoundBtn}
              onPress={async () => {
                if (testingSound) {
                  await soundManager.stopAlarm();
                  setTestingSound(false);
                } else {
                  setTestingSound(true);
                  await soundManager.playAlarm(alarmSound);
                  setTimeout(async () => {
                    await soundManager.stopAlarm();
                    setTestingSound(false);
                  }, 3000);
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={testingSound ? "stop-circle" : "play-circle"}
                size={16}
                color={colors.danger}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.testSoundText}>
                {testingSound ? 'Stop Audio Preview' : 'Test Alarm Sound (3s)'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ========================================= */}
        {/* MYDAY 2.0: SMART ESCALATION */}
        {/* ========================================= */}
        <View style={styles.toggleRow}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="flame" size={16} color={colors.warning} style={{ marginRight: 6 }} />
              <Text style={styles.toggleTitle}>Smart Escalation</Text>
            </View>
            <Text style={styles.toggleSubtitle}>
              Progressively escalates if task is not completed. Automatically cleans up upon completion.
            </Text>
          </View>
          <Switch
            value={smartEscalation}
            onValueChange={setSmartEscalation}
            trackColor={{ false: colors.surfaceElevated, true: colors.warning }}
            thumbColor={smartEscalation ? colors.white : colors.textMuted}
          />
        </View>

        {smartEscalation && (
          <View style={styles.escalationTimelineBox}>
            <Text style={styles.escalationTimelineHeader}>Escalation Stages Timeline:</Text>
            <View style={styles.timelineRow}>
              <View style={styles.timelineStep}>
                <Text style={styles.timelineTime}>T (Due)</Text>
                <Text style={styles.timelineAction}>Reminder</Text>
              </View>
              <Ionicons name="arrow-forward" size={12} color={colors.textMuted} />
              <View style={styles.timelineStep}>
                <Text style={styles.timelineTime}>T + 15m</Text>
                <Text style={styles.timelineAction}>Follow-up</Text>
              </View>
              <Ionicons name="arrow-forward" size={12} color={colors.textMuted} />
              <View style={styles.timelineStep}>
                <Text style={styles.timelineTime}>T + 30m</Text>
                <Text style={[styles.timelineAction, { color: colors.danger }]}>Loud Alarm</Text>
              </View>
              <Ionicons name="arrow-forward" size={12} color={colors.textMuted} />
              <View style={styles.timelineStep}>
                <Text style={styles.timelineTime}>T + 45m</Text>
                <Text style={[styles.timelineAction, { color: colors.danger }]}>Overdue</Text>
              </View>
            </View>
          </View>
        )}

        {/* ========================================= */}
        {/* MYDAY 2.0: LOCATION REMINDER */}
        {/* ========================================= */}
        <View style={styles.toggleRow}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="location" size={16} color={colors.primaryLight} style={{ marginRight: 6 }} />
              <Text style={styles.toggleTitle}>Location-Based Reminder</Text>
            </View>
            <Text style={styles.toggleSubtitle}>
              Trigger reminder when arriving at or leaving a specific place.
            </Text>
          </View>
          <Switch
            value={isLocationBased}
            onValueChange={async (val) => {
              if (val) {
                // Request permission only when user enables this feature!
                const granted = await locationManager.requestPermission();
                if (!granted) {
                  setErrorMsg('Location permission is required to enable location reminders.');
                  return;
                }
              }
              setIsLocationBased(val);
            }}
            trackColor={{ false: colors.surfaceElevated, true: colors.primaryLight }}
            thumbColor={isLocationBased ? colors.primary : colors.textMuted}
          />
        </View>

        {isLocationBased && (
          <View style={styles.locationBox}>
            {/* Location Name Input */}
            <Text style={styles.label}>Location / Place Name</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="pin-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.inlineInput}
                placeholder="e.g. Office, Supermarket, Gym"
                placeholderTextColor={colors.textMuted}
                value={locationName}
                onChangeText={setLocationName}
              />
            </View>

            {/* Use Current GPS Location Button */}
            <TouchableOpacity
              style={styles.gpsBtn}
              onPress={async () => {
                setLocating(true);
                try {
                  const loc = await locationManager.getCurrentLocation();
                  if (loc) {
                    setLocationLat(loc.latitude);
                    setLocationLng(loc.longitude);
                    if (loc.name && !locationName) {
                      setLocationName(loc.name);
                    }
                  } else {
                    setErrorMsg('Unable to retrieve current GPS location.');
                  }
                } finally {
                  setLocating(false);
                }
              }}
              disabled={locating}
              activeOpacity={0.7}
            >
              {locating ? (
                <ActivityIndicator size="small" color={colors.primaryLight} />
              ) : (
                <>
                  <Ionicons name="navigate" size={14} color={colors.primaryLight} style={{ marginRight: 6 }} />
                  <Text style={styles.gpsBtnText}>
                    {locationLat && locationLng
                      ? `GPS Saved (${locationLat.toFixed(3)}, ${locationLng.toFixed(3)})`
                      : 'Use Current GPS Location'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Quick Presets */}
            <Text style={[styles.label, { marginTop: 12 }]}>Quick Presets:</Text>
            <View style={styles.presetChipsRow}>
              {['Office', 'Home', 'Gym', 'Supermarket'].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.presetChip,
                    locationName.toLowerCase() === preset.toLowerCase() && styles.presetChipSelected,
                  ]}
                  onPress={() => setLocationName(preset)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      locationName.toLowerCase() === preset.toLowerCase() && styles.presetChipTextSelected,
                    ]}
                  >
                    {preset}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Trigger Condition (Enter vs Exit) */}
            <Text style={[styles.label, { marginTop: 12 }]}>When to Trigger:</Text>
            <View style={styles.triggerRow}>
              <TouchableOpacity
                style={[
                  styles.triggerBtn,
                  locationTrigger === 'ENTER' && styles.triggerBtnSelected,
                ]}
                onPress={() => setLocationTrigger('ENTER')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="log-in-outline"
                  size={15}
                  color={locationTrigger === 'ENTER' ? colors.primaryLight : colors.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.triggerBtnText,
                    locationTrigger === 'ENTER' && styles.triggerBtnTextSelected,
                  ]}
                >
                  When I Arrive (Enter)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.triggerBtn,
                  locationTrigger === 'EXIT' && styles.triggerBtnSelected,
                ]}
                onPress={() => setLocationTrigger('EXIT')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="log-out-outline"
                  size={15}
                  color={locationTrigger === 'EXIT' ? colors.primaryLight : colors.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.triggerBtnText,
                    locationTrigger === 'EXIT' && styles.triggerBtnTextSelected,
                  ]}
                >
                  When I Leave (Exit)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Radius selector */}
            <Text style={[styles.label, { marginTop: 12 }]}>Geofence Radius:</Text>
            <View style={styles.radiusRow}>
              {[100, 200, 500].map((rad) => (
                <TouchableOpacity
                  key={rad}
                  style={[
                    styles.radiusChip,
                    locationRadius === rad && styles.radiusChipSelected,
                  ]}
                  onPress={() => setLocationRadius(rad)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.radiusChipText,
                      locationRadius === rad && styles.radiusChipTextSelected,
                    ]}
                  >
                    {rad}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

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
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  modeTabsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  modeTabSelected: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.primaryGlow,
  },
  modeTabSelectedAlarm: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerGlow,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  modeTabTextSelected: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  alarmConfigBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  alarmConfigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  alarmConfigTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },
  soundOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  soundChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  soundChipSelected: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerGlow,
  },
  soundChipText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  soundChipTextSelected: {
    color: colors.danger,
    fontWeight: '700',
  },
  testSoundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  testSoundText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '700',
  },
  escalationTimelineBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  escalationTimelineHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineStep: {
    alignItems: 'center',
  },
  timelineTime: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  timelineAction: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  locationBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryGlow,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  gpsBtnText: {
    fontSize: 12,
    color: colors.primaryLight,
    fontWeight: '700',
  },
  presetChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  presetChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipSelected: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.primaryGlow,
  },
  presetChipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  presetChipTextSelected: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  triggerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  triggerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  triggerBtnSelected: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.primaryGlow,
  },
  triggerBtnText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  triggerBtnTextSelected: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  radiusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  radiusChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  radiusChipSelected: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.primaryGlow,
  },
  radiusChipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  radiusChipTextSelected: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickDateChips: {
    flexDirection: 'row',
    gap: 6,
  },
  quickDateChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickDateChipActive: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.primaryGlow,
  },
  quickDateText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  quickDateTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  liveTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryGlow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  liveTimeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryLight,
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    justifyContent: 'center',
    gap: 12,
  },
  timeBlock: {
    alignItems: 'center',
  },
  timeBlockLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 6,
  },
  stepperRow: {
    alignItems: 'center',
  },
  stepperBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: colors.surfaceElevated,
  },
  timeValueInput: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    width: 46,
    paddingVertical: 4,
  },
  timeColon: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryLight,
    marginTop: 14,
  },
  ampmContainer: {
    marginLeft: 8,
    gap: 6,
    justifyContent: 'center',
  },
  ampmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  ampmBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  ampmText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  ampmTextActive: {
    color: colors.white,
    fontWeight: '800',
  },
  timePresetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    justifyContent: 'space-between',
  },
  timePresetChip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timePresetChipActive: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.primaryGlow,
  },
  timePresetText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timePresetTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
});
