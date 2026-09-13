import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TaskContext';
import { colors } from '../theme/colors';
import { API_BASE_URL, updateApiClientBaseUrl, apiClient } from '../api/client';
import { notificationManager } from '../notifications/notificationManager';
import { getCommonTimezones } from '../utils/dateUtils';

export const SettingsScreen: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const { syncNotifications } = useTasks();

  const [apiUrl, setApiUrl] = useState(API_BASE_URL);
  const [selectedTz, setSelectedTz] = useState(user?.timezone || 'UTC');
  const [showTzPicker, setShowTzPicker] = useState(false);
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [isSyncingNotifs, setIsSyncingNotifs] = useState(false);

  const commonTzs = getCommonTimezones();

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const granted = await notificationManager.requestPermissions();
    setNotifGranted(granted);
  };

  const handleSaveApiUrl = async () => {
    setIsTestingApi(true);
    try {
      updateApiClientBaseUrl(apiUrl);
      // Ping health endpoint
      const res = await apiClient.get('/health', { timeout: 4000 });
      if (res.data?.status === 'ok') {
        Alert.alert('Connection Successful', `Connected to MyDay API at ${apiUrl}`);
      } else {
        Alert.alert('Response Received', `Server replied: ${JSON.stringify(res.data)}`);
      }
    } catch (err: any) {
      Alert.alert(
        'Connection Warning',
        `Saved URL, but test request failed: ${err.message}. Make sure the FastAPI server is running.`
      );
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleUpdateTz = async (tz: string) => {
    setSelectedTz(tz);
    setShowTzPicker(false);
    try {
      await updateUser({ timezone: tz });
      Alert.alert('Success', `Default timezone updated to ${tz}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update timezone');
    }
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
    await notificationManager.sendTestNotification();
    Alert.alert('Test Sent', 'A notification will appear in 2 seconds.');
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

        {/* Timezone Selector */}
        <View style={styles.settingItem}>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingTitle}>Default Timezone</Text>
            <Text style={styles.settingDesc}>Current: {selectedTz}</Text>
          </View>
          <TouchableOpacity
            style={styles.changeBtn}
            onPress={() => setShowTzPicker(!showTzPicker)}
          >
            <Text style={styles.changeBtnText}>Change</Text>
          </TouchableOpacity>
        </View>

        {showTzPicker && (
          <View style={styles.tzDropdown}>
            {commonTzs.map(tz => (
              <TouchableOpacity
                key={tz}
                style={[styles.tzItem, tz === selectedTz && styles.tzItemSelected]}
                onPress={() => handleUpdateTz(tz)}
              >
                <Text style={[styles.tzItemText, tz === selectedTz && styles.tzItemTextSelected]}>
                  {tz}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
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

      {/* Backend API Configuration */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="server-outline" size={20} color={colors.accent} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Backend API Endpoint</Text>
        </View>
        <Text style={styles.settingDesc}>
          Set the server URL. Use your PC's LAN IP when testing on a physical phone via Expo Go.
        </Text>

        <View style={styles.urlInputRow}>
          <TextInput
            style={styles.urlInput}
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="http://192.168.1.100:8000/api/v1"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
        </View>

        {/* Quick Presets */}
        <View style={styles.presetRow}>
          <TouchableOpacity
            style={styles.presetChip}
            onPress={() => setApiUrl('http://10.168.18.165:8000/api/v1')}
          >
            <Text style={[styles.presetText, { color: colors.primaryLight, fontWeight: '700' }]}>PC Wi-Fi (10.168.18.165)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.presetChip}
            onPress={() => setApiUrl('http://10.0.2.2:8000/api/v1')}
          >
            <Text style={styles.presetText}>Emulator (10.0.2.2)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.presetChip}
            onPress={() => setApiUrl('http://127.0.0.1:8000/api/v1')}
          >
            <Text style={styles.presetText}>Localhost</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.testBtn}
          onPress={handleSaveApiUrl}
          disabled={isTestingApi}
        >
          {isTestingApi ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.testBtnText}>Save & Test Connection</Text>
          )}
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
    marginBottom: 16,
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
  tzDropdown: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    marginTop: 10,
    maxHeight: 180,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tzItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tzItemSelected: {
    backgroundColor: colors.primaryGlow,
  },
  tzItemText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  tzItemTextSelected: {
    color: colors.primaryLight,
    fontWeight: '700',
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
  urlInputRow: {
    marginTop: 10,
    marginBottom: 8,
  },
  urlInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.surfaceElevated,
  },
  presetText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  testBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  testBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
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
