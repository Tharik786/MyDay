import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TaskPriority } from '../types';
import { colors } from '../theme/colors';

interface Props {
  priority: TaskPriority;
}

export const PriorityBadge: React.FC<Props> = ({ priority }) => {
  const color = colors.priorities[priority] || colors.textSecondary;

  return (
    <View style={[styles.container, { borderColor: `${color}40`, backgroundColor: `${color}15` }]}>
      <Text style={[styles.text, { color }]}>{priority}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
