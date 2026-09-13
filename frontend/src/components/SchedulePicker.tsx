import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { RecurrenceType, IntervalUnit } from '../types';
import { colors } from '../theme/colors';
import { DAY_NAMES } from '../utils/dateUtils';

interface Props {
  recurrenceType: RecurrenceType;
  onChangeRecurrenceType: (type: RecurrenceType) => void;
  recurrenceDays: number[];
  onChangeRecurrenceDays: (days: number[]) => void;
  intervalValue: number;
  onChangeIntervalValue: (val: number) => void;
  intervalUnit: IntervalUnit;
  onChangeIntervalUnit: (unit: IntervalUnit) => void;
  leadTimeMinutes: number;
  onChangeLeadTimeMinutes: (mins: number) => void;
}

const RECURRENCE_OPTIONS: { label: string; value: RecurrenceType }[] = [
  { label: 'Once', value: 'ONE_TIME' },
  { label: 'Daily', value: 'DAILY' },
  { label: 'Weekly', value: 'WEEKLY' },
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'Yearly', value: 'YEARLY' },
  { label: 'Custom', value: 'CUSTOM_INTERVAL' },
];

const INTERVAL_UNITS: IntervalUnit[] = ['MINUTES', 'HOURS', 'DAYS', 'WEEKS'];

const LEAD_TIME_OPTIONS = [
  { label: 'At event', value: 0 },
  { label: '5m before', value: 5 },
  { label: '15m before', value: 15 },
  { label: '30m before', value: 30 },
  { label: '1h before', value: 60 },
];

export const SchedulePicker: React.FC<Props> = ({
  recurrenceType,
  onChangeRecurrenceType,
  recurrenceDays,
  onChangeRecurrenceDays,
  intervalValue,
  onChangeIntervalValue,
  intervalUnit,
  onChangeIntervalUnit,
  leadTimeMinutes,
  onChangeLeadTimeMinutes,
}) => {
  const toggleDay = (dayIndex: number) => {
    if (recurrenceDays.includes(dayIndex)) {
      if (recurrenceDays.length > 1) {
        onChangeRecurrenceDays(recurrenceDays.filter(d => d !== dayIndex));
      }
    } else {
      onChangeRecurrenceDays([...recurrenceDays, dayIndex].sort());
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Repeat Schedule</Text>

      {/* Recurrence Pill Selector */}
      <View style={styles.pillRow}>
        {RECURRENCE_OPTIONS.map(opt => {
          const isSelected = recurrenceType === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.pill, isSelected && styles.pillSelected]}
              onPress={() => onChangeRecurrenceType(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Weekly Day Selector */}
      {recurrenceType === 'WEEKLY' && (
        <View style={styles.subSection}>
          <Text style={styles.subLabel}>Repeat on weekdays:</Text>
          <View style={styles.daysRow}>
            {DAY_NAMES.map((name, idx) => {
              const isSelected = recurrenceDays.includes(idx);
              return (
                <TouchableOpacity
                  key={name}
                  style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}
                  onPress={() => toggleDay(idx)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                    {name.charAt(0)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Custom Interval Builder */}
      {recurrenceType === 'CUSTOM_INTERVAL' && (
        <View style={styles.subSection}>
          <Text style={styles.subLabel}>Repeat every:</Text>
          <View style={styles.intervalRow}>
            <TextInput
              style={styles.intervalInput}
              keyboardType="number-pad"
              value={intervalValue ? intervalValue.toString() : '1'}
              onChangeText={t => {
                const parsed = parseInt(t, 10);
                onChangeIntervalValue(isNaN(parsed) || parsed < 1 ? 1 : parsed);
              }}
              placeholder="1"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.unitRow}>
              {INTERVAL_UNITS.map(unit => {
                const isSelected = intervalUnit === unit;
                return (
                  <TouchableOpacity
                    key={unit}
                    style={[styles.unitBtn, isSelected && styles.unitBtnSelected]}
                    onPress={() => onChangeIntervalUnit(unit)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.unitText, isSelected && styles.unitTextSelected]}>
                      {unit.toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Notification Lead Time */}
      <View style={styles.subSection}>
        <Text style={styles.subLabel}>Reminder Alert:</Text>
        <View style={styles.pillRow}>
          {LEAD_TIME_OPTIONS.map(opt => {
            const isSelected = leadTimeMinutes === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pill, isSelected && styles.pillSelected]}
                onPress={() => onChangeLeadTimeMinutes(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pillTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
  subSection: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dayTextSelected: {
    color: colors.white,
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  intervalInput: {
    width: 60,
    height: 42,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
  unitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  unitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitBtnSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  unitTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
});
