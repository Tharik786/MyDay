import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TaskStatus } from '../types';
import { colors } from '../theme/colors';

interface Props {
  status: TaskStatus;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'ACTIVE':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: colors.success, border: 'rgba(16, 185, 129, 0.3)' };
      case 'PAUSED':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: colors.warning, border: 'rgba(245, 158, 11, 0.3)' };
      case 'COMPLETED':
        return { bg: 'rgba(99, 102, 241, 0.15)', text: colors.primaryLight, border: 'rgba(99, 102, 241, 0.3)' };
      case 'OVERDUE':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: colors.danger, border: 'rgba(239, 68, 68, 0.3)' };
      default:
        return { bg: colors.surfaceElevated, text: colors.textSecondary, border: colors.border };
    }
  };

  const style = getBadgeStyle();

  return (
    <View style={[styles.container, { backgroundColor: style.bg, borderColor: style.border }]}>
      <View style={[styles.dot, { backgroundColor: style.text }]} />
      <Text style={[styles.text, { color: style.text }]}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
