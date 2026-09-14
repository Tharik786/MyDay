import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { colors } from '../theme/colors';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  visible: boolean;
  type: ToastType;
  title?: string;
  message: string;
  onDismiss: () => void;
  duration?: number;
}

const ANDROID_STATUS_BAR = Platform.OS === 'android'
  ? Math.max(Constants.statusBarHeight || 0, StatusBar.currentHeight || 0, 48)
  : (Constants.statusBarHeight || 0);

export const Toast: React.FC<ToastProps> = ({
  visible,
  type,
  title,
  message,
  onDismiss,
  duration = 3500,
}) => {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    translateY.setValue(-120);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const getTheme = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle' as const,
          color: colors.success,
          bgColor: '#064E3B',
          borderColor: 'rgba(16, 185, 129, 0.4)',
        };
      case 'error':
        return {
          icon: 'alert-circle' as const,
          color: colors.danger,
          bgColor: '#7F1D1D',
          borderColor: 'rgba(239, 68, 68, 0.4)',
        };
      case 'info':
      default:
        return {
          icon: 'information-circle' as const,
          color: colors.primaryLight,
          bgColor: '#1E1B4B',
          borderColor: 'rgba(99, 102, 241, 0.4)',
        };
    }
  };

  const theme = getTheme();

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ translateY }],
          opacity,
          top: ANDROID_STATUS_BAR + 10,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.container, { backgroundColor: theme.bgColor, borderColor: theme.borderColor }]}
        onPress={handleDismiss}
        activeOpacity={0.9}
      >
        <Ionicons name={theme.icon} size={26} color={theme.color} style={styles.icon} />
        <View style={styles.content}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <Text style={styles.message}>{message}</Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={18} color="rgba(255, 255, 255, 0.6)" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
    elevation: 100,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
});
