import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { ReschedulePayload } from '../types';
import { getCommonTimezones } from '../utils/dateUtils';

interface Props {
  visible: boolean;
  onClose: () => void;
  onReschedule: (payload: ReschedulePayload) => Promise<void>;
  initialDate?: string;
  initialTime?: string;
  initialTimezone?: string;
}

export const RescheduleModal: React.FC<Props> = ({
  visible,
  onClose,
  onReschedule,
  initialDate,
  initialTime,
  initialTimezone,
}) => {
  const [newDate, setNewDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState(initialTime ? initialTime.slice(0, 5) : '09:00');
  const [newTimezone, setNewTimezone] = useState(initialTimezone || 'UTC');
  const [loading, setLoading] = useState(false);
  const [showTzPicker, setShowTzPicker] = useState(false);

  const commonTzs = getCommonTimezones();

  const handleSave = async () => {
    setLoading(true);
    try {
      // Ensure seconds are included: "HH:MM:00"
      const formattedTime = newTime.length === 5 ? `${newTime}:00` : newTime;
      await onReschedule({
        new_date: newDate,
        new_time: formattedTime,
        new_timezone: newTimezone,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="calendar" size={24} color={colors.primaryLight} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Reschedule Task</Text>
          <Text style={styles.subtitle}>Set a new date and time for this reminder</Text>

          {/* Date Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="calendar-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="2026-09-15"
                placeholderTextColor={colors.textMuted}
                value={newDate}
                onChangeText={setNewDate}
              />
            </View>
          </View>

          {/* Time Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Time (HH:MM 24-hr)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="time-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="09:00"
                placeholderTextColor={colors.textMuted}
                value={newTime}
                onChangeText={setNewTime}
              />
            </View>
          </View>

          {/* Timezone Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Timezone</Text>
            <TouchableOpacity
              style={styles.tzButton}
              onPress={() => setShowTzPicker(!showTzPicker)}
            >
              <Text style={styles.tzButtonText}>{newTimezone}</Text>
              <Ionicons name={showTzPicker ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {showTzPicker && (
              <ScrollView style={styles.tzDropdown} nestedScrollEnabled>
                {commonTzs.map(tz => (
                  <TouchableOpacity
                    key={tz}
                    style={[styles.tzItem, tz === newTimezone && styles.tzItemSelected]}
                    onPress={() => {
                      setNewTimezone(tz);
                      setShowTzPicker(false);
                    }}
                  >
                    <Text style={[styles.tzItemText, tz === newTimezone && styles.tzItemTextSelected]}>
                      {tz}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>Update Schedule</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  tzButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 46,
  },
  tzButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  tzDropdown: {
    maxHeight: 140,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tzItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tzItemSelected: {
    backgroundColor: colors.primaryGlow,
  },
  tzItemText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  tzItemTextSelected: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
