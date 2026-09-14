import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTasks } from '../context/TaskContext';
import { PlanDayItem, TaskCreatePayload, TaskPriority } from '../types';
import { colors } from '../theme/colors';
import { PriorityBadge } from './PriorityBadge';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPlanAccepted?: () => void;
}

const EXAMPLE_PROMPTS = [
  'I need to study Physics for 3 hours today.',
  'Team sync at 10am, coding for 2 hours, grocery shopping at 6pm.',
  'Morning workout 45 mins, review PRs 1 hour, dentist at 3pm.',
];

export const AIPlannerModal: React.FC<Props> = ({ visible, onClose, onPlanAccepted }) => {
  const { planDay, createBatchTasks } = useTasks();

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [generatedPlan, setGeneratedPlan] = useState<{
    summary: string;
    items: PlanDayItem[];
    conflict_notes?: string[];
  } | null>(null);

  const handleGenerate = async (customPrompt?: string) => {
    const textToUse = customPrompt || prompt;
    if (!textToUse.trim()) {
      setErrorMsg('Please enter what you want to accomplish today.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await planDay({ prompt: textToUse.trim() });
      setGeneratedPlan({
        summary: res.summary,
        items: res.items,
        conflict_notes: res.conflict_notes,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = (index: number, field: keyof PlanDayItem, value: any) => {
    if (!generatedPlan) return;
    const newItems = [...generatedPlan.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setGeneratedPlan({ ...generatedPlan, items: newItems });
  };

  const handleRemoveItem = (index: number) => {
    if (!generatedPlan) return;
    const newItems = generatedPlan.items.filter((_, i) => i !== index);
    setGeneratedPlan({ ...generatedPlan, items: newItems });
  };

  const handleAcceptPlan = async () => {
    if (!generatedPlan || generatedPlan.items.length === 0) return;

    setSaving(true);
    setErrorMsg(null);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const payloads: TaskCreatePayload[] = generatedPlan.items.map((it) => {
        const timeFormatted =
          it.start_time.length === 5 ? `${it.start_time}:00` : it.start_time;
        return {
          title: it.title,
          description: it.description || undefined,
          start_date: it.start_date || todayStr,
          start_time: timeFormatted,
          timezone: 'Asia/Kolkata',
          recurrence_type: 'ONE_TIME',
          priority: it.priority || 'MEDIUM',
          lead_time_minutes: 10,
          reminder_mode: it.reminder_mode || 'NOTIFICATION',
          smart_escalation: it.smart_escalation ?? false,
        };
      });

      await createBatchTasks(payloads);
      setGeneratedPlan(null);
      setPrompt('');
      if (onPlanAccepted) onPlanAccepted();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to schedule planned tasks.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={16} color={colors.primaryLight} />
              </View>
              <Text style={styles.title}>AI Daily Planner</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.subtitle}>
              Tell MyDay what you need to get done. The AI creates a conflict-free daily schedule considering your existing tasks.
            </Text>

            {/* Error Message */}
            {errorMsg && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.danger} style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* Prompt Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. I need to study Physics for 3 hours today."
                placeholderTextColor={colors.textMuted}
                value={prompt}
                onChangeText={setPrompt}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Quick Inspiration Chips */}
            <Text style={styles.chipsLabel}>Quick Inspiration:</Text>
            <View style={styles.chipsContainer}>
              {EXAMPLE_PROMPTS.map((ex, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.chip}
                  onPress={() => {
                    setPrompt(ex);
                    handleGenerate(ex);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipText} numberOfLines={1}>
                    "{ex}"
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Generate Button */}
            <TouchableOpacity
              style={styles.generateBtn}
              onPress={() => handleGenerate()}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name="flash" size={18} color={colors.white} style={{ marginRight: 8 }} />
                  <Text style={styles.generateBtnText}>Plan My Day</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Generated Schedule Section */}
            {generatedPlan && (
              <View style={styles.resultsSection}>
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsTitle}>Proposed Daily Schedule</Text>
                  <Text style={styles.resultsCount}>{generatedPlan.items.length} Tasks</Text>
                </View>
                <Text style={styles.summaryNote}>{generatedPlan.summary}</Text>

                {/* Conflict notices */}
                {generatedPlan.conflict_notes && generatedPlan.conflict_notes.length > 0 && (
                  <View style={styles.conflictBox}>
                    <Text style={styles.conflictTitle}>Existing Commitments Considered:</Text>
                    {generatedPlan.conflict_notes.map((note, i) => (
                      <Text key={i} style={styles.conflictItem}>
                        • {note}
                      </Text>
                    ))}
                  </View>
                )}

                {/* List of planned tasks */}
                {generatedPlan.items.map((item, index) => (
                  <View key={item.id || index} style={styles.planCard}>
                    <View style={styles.planCardTop}>
                      {/* Time & Duration */}
                      <View style={styles.timeBadge}>
                        <Ionicons name="time-outline" size={13} color={colors.primaryLight} style={{ marginRight: 4 }} />
                        <TextInput
                          style={styles.timeInput}
                          value={item.start_time.slice(0, 5)}
                          onChangeText={(val) => handleUpdateItem(index, 'start_time', val)}
                        />
                        <Text style={styles.durationText}>({item.duration_minutes}m)</Text>
                      </View>

                      {/* Priority Selector */}
                      <TouchableOpacity
                        onPress={() => {
                          const order: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
                          const curIdx = order.indexOf(item.priority);
                          const nextP = order[(curIdx + 1) % order.length];
                          handleUpdateItem(index, 'priority', nextP);
                        }}
                      >
                        <PriorityBadge priority={item.priority} />
                      </TouchableOpacity>

                      {/* Remove Button */}
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => handleRemoveItem(index)}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>

                    {/* Task Title (Editable) */}
                    <TextInput
                      style={styles.itemTitleInput}
                      value={item.title}
                      onChangeText={(val) => handleUpdateItem(index, 'title', val)}
                    />

                    {/* Feature Badges Row (Alarm mode & Escalation) */}
                    <View style={styles.badgesRow}>
                      <TouchableOpacity
                        style={[
                          styles.modeBadge,
                          item.reminder_mode === 'ALARM' && styles.modeBadgeActive,
                        ]}
                        onPress={() => {
                          handleUpdateItem(
                            index,
                            'reminder_mode',
                            item.reminder_mode === 'ALARM' ? 'NOTIFICATION' : 'ALARM'
                          );
                        }}
                      >
                        <Ionicons
                          name={item.reminder_mode === 'ALARM' ? 'alarm' : 'notifications-outline'}
                          size={12}
                          color={item.reminder_mode === 'ALARM' ? colors.danger : colors.textMuted}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.modeBadgeText,
                            item.reminder_mode === 'ALARM' && { color: colors.danger, fontWeight: '700' },
                          ]}
                        >
                          {item.reminder_mode === 'ALARM' ? 'Alarm Mode' : 'Notification'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.modeBadge,
                          item.smart_escalation && styles.escalationBadgeActive,
                        ]}
                        onPress={() => handleUpdateItem(index, 'smart_escalation', !item.smart_escalation)}
                      >
                        <Ionicons
                          name="flame"
                          size={12}
                          color={item.smart_escalation ? colors.warning : colors.textMuted}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.modeBadgeText,
                            item.smart_escalation && { color: colors.warning, fontWeight: '700' },
                          ]}
                        >
                          {item.smart_escalation ? 'Escalation ON' : 'No Escalation'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {item.reasoning ? (
                      <Text style={styles.reasoningText}>💡 {item.reasoning}</Text>
                    ) : null}
                  </View>
                ))}

                {/* Accept Plan Button */}
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={handleAcceptPlan}
                  disabled={saving || generatedPlan.items.length === 0}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color={colors.white} style={{ marginRight: 8 }} />
                      <Text style={styles.acceptBtnText}>
                        Accept & Add {generatedPlan.items.length} Tasks to Schedule
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerGlow,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    flex: 1,
  },
  inputContainer: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 12,
  },
  textInput: {
    color: colors.textPrimary,
    fontSize: 14,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  chipsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  chipsContainer: {
    gap: 6,
    marginBottom: 14,
  },
  chip: {
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  chipText: {
    color: colors.primaryLight,
    fontSize: 12,
  },
  generateBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  generateBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  resultsSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  summaryNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  conflictBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  conflictTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  conflictItem: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeInput: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
    minWidth: 40,
  },
  durationText: {
    color: colors.textMuted,
    fontSize: 11,
    marginLeft: 2,
  },
  removeBtn: {
    padding: 4,
  },
  itemTitleInput: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 4,
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeBadgeActive: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerGlow,
  },
  escalationBadgeActive: {
    borderColor: colors.warning,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  modeBadgeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  reasoningText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },
  acceptBtn: {
    flexDirection: 'row',
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    elevation: 4,
  },
  acceptBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 14,
  },
});
