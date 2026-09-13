import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSnooze: (durationMinutes: number) => Promise<void>;
  taskTitle?: string;
}

const PRESETS = [
  { label: '5 Mins', value: 5, icon: 'timer-outline' },
  { label: '15 Mins', value: 15, icon: 'alarm-outline' },
  { label: '30 Mins', value: 30, icon: 'hourglass-outline' },
  { label: '1 Hour', value: 60, icon: 'time-outline' },
  { label: '1 Day', value: 1440, icon: 'calendar-outline' },
];

export const SnoozeModal: React.FC<Props> = ({ visible, onClose, onSnooze, taskTitle }) => {
  const [customMins, setCustomMins] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSnooze = async (minutes: number) => {
    if (minutes <= 0) return;
    setLoading(true);
    try {
      await onSnooze(minutes);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = () => {
    const parsed = parseInt(customMins, 10);
    if (!isNaN(parsed) && parsed > 0) {
      handleSnooze(parsed);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="time" size={24} color={colors.warning} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Snooze Reminder</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {taskTitle ? `Select how long to delay "${taskTitle}"` : 'Select delay duration'}
          </Text>

          {/* Presets Grid */}
          <View style={styles.presetsGrid}>
            {PRESETS.map(preset => (
              <TouchableOpacity
                key={preset.value}
                style={styles.presetBtn}
                onPress={() => handleSnooze(preset.value)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons name={preset.icon as any} size={18} color={colors.primaryLight} style={{ marginRight: 6 }} />
                <Text style={styles.presetText}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Input */}
          <View style={styles.customContainer}>
            <TextInput
              style={styles.customInput}
              placeholder="Custom minutes..."
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={customMins}
              onChangeText={setCustomMins}
            />
            <TouchableOpacity
              style={styles.customBtn}
              onPress={handleCustomSubmit}
              disabled={loading || !customMins}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.customBtnText}>Snooze</Text>
              )}
            </TouchableOpacity>
          </View>
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
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
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
    lineHeight: 20,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  presetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  customContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  customInput: {
    flex: 1,
    height: 46,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    color: colors.textPrimary,
    fontSize: 14,
  },
  customBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
