import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { TaskProvider, useTasks } from './src/context/TaskContext';
import { colors } from './src/theme/colors';
import { ScreenTab, Task } from './src/types';

import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { TasksScreen } from './src/screens/TasksScreen';
import { CreateEditTaskScreen } from './src/screens/CreateEditTaskScreen';
import { TaskDetailsScreen } from './src/screens/TaskDetailsScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

const MainNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { selectedTask, setSelectedTask } = useTasks();

  const [currentTab, setCurrentTab] = useState<ScreenTab>('home');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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

  // Sub-screens (Task Details or Edit Screen)
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

  // Active Tab View
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
      <View style={styles.screenBody}>{renderCurrentScreen()}</View>

      {/* Bottom Tab Bar */}
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
    paddingTop: StatusBar.currentHeight || 0,
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
});
