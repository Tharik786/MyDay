import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Modal,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { TaskProvider, useTasks } from './src/context/TaskContext';
import { colors } from './src/theme/colors';
import { ScreenTab, Task } from './src/types';
import { registerInAppAlarmListener } from './src/notifications/notificationManager';
import { soundManager } from './src/services/soundManager';

import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { TasksScreen } from './src/screens/TasksScreen';
import { CreateEditTaskScreen } from './src/screens/CreateEditTaskScreen';
import { TaskDetailsScreen } from './src/screens/TaskDetailsScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

const ANDROID_STATUS_BAR = Platform.OS === 'android'
  ? Math.max(Constants.statusBarHeight || 0, StatusBar.currentHeight || 0, 48)
  : (Constants.statusBarHeight || 0);

const MainNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { selectedTask, setSelectedTask, completeTask, snoozeTask } = useTasks();

  const [currentTab, setCurrentTab] = useState<ScreenTab>('home');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeAlarm, setActiveAlarm] = useState<{ taskId?: number; title: string; body?: string } | null>(null);

  useEffect(() => {
    const unsub = registerInAppAlarmListener((alarm) => {
      setActiveAlarm(alarm);
    });
    return unsub;
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primaryLight} />
        <Text style={styles.loadingText}>Loading MyDay...</Text>
      </View>
    );
  }

  // Unauthenticated Flow
  if (!user) {
    return <AuthScreen />;
  }

  const isSubScreen = !!editingTask || !!selectedTask;

  const renderCurrentScreen = () => {
    switch (currentTab) {
      case 'home':
        return (
          <HomeScreen
            onNavigateToCreate={() => setCurrentTab('create')}
            onNavigateToTasks={() => setCurrentTab('tasks')}
            onSelectTask={(t) => setSelectedTask(t)}
            onNavigateToSettings={() => setCurrentTab('settings')}
          />
        );
      case 'tasks':
        return (
          <TasksScreen
            onSelectTask={(t) => setSelectedTask(t)}
            onNavigateToCreate={() => setCurrentTab('create')}
          />
        );
      case 'create':
        return (
          <CreateEditTaskScreen
            onBack={() => setCurrentTab('home')}
            onSaved={() => setCurrentTab('tasks')}
          />
        );
      case 'history':
        return <HistoryScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return null;
    }
  };

  const renderActiveScreen = () => {
    if (editingTask) {
      return (
        <CreateEditTaskScreen
          editingTask={editingTask}
          onBack={() => setEditingTask(null)}
          onSaved={() => {
            setEditingTask(null);
            setCurrentTab('tasks');
          }}
        />
      );
    }

    if (selectedTask) {
      return (
        <TaskDetailsScreen
          task={selectedTask}
          onBack={() => setSelectedTask(null)}
          onEdit={(task) => {
            setEditingTask(task);
            setSelectedTask(null);
          }}
        />
      );
    }

    return renderCurrentScreen();
  };

  const tabs: { id: ScreenTab; label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
    { id: 'tasks', label: 'Tasks', icon: 'list-outline', iconActive: 'list' },
    { id: 'create', label: 'New', icon: 'add-circle-outline', iconActive: 'add-circle' },
    { id: 'history', label: 'History', icon: 'time-outline', iconActive: 'time' },
    { id: 'settings', label: 'Settings', icon: 'settings-outline', iconActive: 'settings' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="light" />
      <View style={styles.screenBody}>{renderActiveScreen()}</View>

      {/* In-App Active Alarm Modal Popup */}
      {activeAlarm && (
        <Modal transparent animationType="fade" visible={!!activeAlarm}>
          <View style={styles.alarmOverlay}>
            <View style={styles.alarmCard}>
              <View style={styles.alarmIconBadge}>
                <Ionicons name="alarm" size={36} color={colors.white} />
              </View>
              <Text style={styles.alarmHeader}>🚨 TASK ALARM ALERT</Text>
              <Text style={styles.alarmTitle}>{activeAlarm.title}</Text>
              {activeAlarm.body ? (
                <Text style={styles.alarmBody}>{activeAlarm.body}</Text>
              ) : null}

              <TouchableOpacity
                style={styles.alarmTurnOffBtn}
                onPress={async () => {
                  await soundManager.stopAlarm();
                  if (activeAlarm.taskId) {
                    await completeTask(activeAlarm.taskId).catch(console.warn);
                  }
                  setActiveAlarm(null);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-done" size={20} color={colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.alarmTurnOffText}>Turn Off / Mark Done</Text>
              </TouchableOpacity>

              <View style={styles.alarmSubActions}>
                <TouchableOpacity
                  style={styles.alarmSnoozeBtn}
                  onPress={async () => {
                    await soundManager.stopAlarm();
                    if (activeAlarm.taskId) {
                      await snoozeTask(activeAlarm.taskId, { duration_minutes: 10 }).catch(console.warn);
                    }
                    setActiveAlarm(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={styles.alarmSnoozeText}>Snooze 10m</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.alarmDismissBtn}
                  onPress={async () => {
                    await soundManager.stopAlarm();
                    setActiveAlarm(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.alarmDismissText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Bottom Tab Bar (Only visible on main screens) */}
      {!isSubScreen && (
        <View style={styles.bottomBar}>
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            const isCreate = tab.id === 'create';
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabItem, isCreate && styles.createTabItem]}
                onPress={() => {
                  setSelectedTask(null);
                  setEditingTask(null);
                  setCurrentTab(tab.id);
                }}
                activeOpacity={0.7}
              >
                {isCreate ? (
                  <View style={styles.createBtnCircle}>
                    <Ionicons name="add" size={26} color={colors.white} />
                  </View>
                ) : (
                  <>
                    <Ionicons
                      name={isActive ? tab.iconActive : tab.icon}
                      size={22}
                      color={isActive ? colors.primaryLight : colors.textMuted}
                    />
                    <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                      {tab.label}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <TaskProvider>
        <MainNavigator />
      </TaskProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: ANDROID_STATUS_BAR,
  },
  screenBody: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 14,
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    height: 64,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  createTabItem: {
    top: -12,
  },
  createBtnCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 3,
  },
  tabLabelActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  // In-app Alarm Modal Styles
  alarmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alarmCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  alarmIconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  alarmHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.danger,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  alarmTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  alarmBody: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  alarmTurnOffBtn: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 4,
  },
  alarmTurnOffText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  alarmSubActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  alarmSnoozeBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alarmSnoozeText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  alarmDismissBtn: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alarmDismissText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
});
