import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TaskContext';
import { colors } from '../theme/colors';
import { notificationManager } from '../notifications/notificationManager';

export const SettingsScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { syncNotifications } = useTasks();

  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);
  const [isSyncingNotifs, setIsSyncingNotifs] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const granted = await notificationManager.requestPermissions();
    setNotifGranted(granted);
  };

  const handleSyncNotifications = async () => {
    setIsSyncingNotifs(true);
    try {
      const count = await syncNotifications();
      Alert.alert(
        'Notifications Synced',
        `Rescheduled ${count} upcoming local notifications successfully.`
      );
    } catch (err: any) {
      Alert.alert('Sync Failed', err.message || 'Could not sync notifications');
    } finally {
      setIsSyncingNotifs(false);
    }
  };

  const handleTestNotification = async () => {
    await notificationManager.sendTestAlarmAlert();
    Alert.alert(
      'Test Alarm Triggered (3s)',
      'Lock your phone or exit the app now! The alarm alert will pop up on your lock screen with sound and action buttons.'
    );
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of MyDay?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.screenTitle}>Settings</Text>

      {/* Profile Section */}
      <View style={styles.card}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.full_name || 'MyDay User'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>
      </View>

      {/* Notifications Section */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="notifications-outline" size={20} color={colors.primaryLight} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Local Notifications</Text>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingTitle}>Permission Status</Text>
            <Text style={styles.settingDesc}>
              {notifGranted ? 'Notifications Allowed' : 'Permission Not Granted'}
            </Text>
          </View>
          <TouchableOpacity style={styles.changeBtn} onPress={checkPermissions}>
            <Text style={styles.changeBtnText}>Check</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.actionRowBtn}
          onPress={handleSyncNotifications}
          disabled={isSyncingNotifs}
        >
          <Ionicons name="sync-outline" size={18} color={colors.primaryLight} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.actionRowTitle}>Resync All Local Notifications</Text>
            <Text style={styles.actionRowDesc}>Refreshes device alarm schedules after restart</Text>
          </View>
          {isSyncingNotifs ? (
            <ActivityIndicator size="small" color={colors.primaryLight} />
          ) : (
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          )}
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.actionRowBtn} onPress={handleTestNotification}>
          <Ionicons name="volume-high-outline" size={18} color={colors.warning} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.actionRowTitle}>Test Notification Alert</Text>
            <Text style={styles.actionRowDesc}>Triggers an immediate test reminder with sound</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} style={{ marginRight: 8 }} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
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
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingTextCol: {
    flex: 1,
    marginRight: 10,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  settingDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  changeBtn: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  changeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actionRowDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerGlow,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 10,
  },
  logoutText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 15,
  },
});
