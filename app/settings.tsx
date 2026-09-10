import React, { useState } from 'react';
import {
  Alert as RNAlert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SettingsService } from '@/services/settingsService';
import { AIPreferences, NotificationPreferences } from '@/types/supplyChain';
import { useAuth } from '@/context/AuthContext';

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { user, organization, role, permissions, logout, switchOrganization } = useAuth();

  // Local settings state
  const [workspace] = useState(SettingsService.getWorkspaceSettings());
  const [aiPrefs, setAiPrefs] = useState<AIPreferences>(SettingsService.getAIPreferences());
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(SettingsService.getNotificationPreferences());
  const [simPrefs] = useState(SettingsService.getSimulationPreferences());

  // Edit Profile Modal state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.full_name || 'Enterprise User');
  const [editRole, setEditRole] = useState(role || 'MANAGER');
  const [editEmail, setEditEmail] = useState(user?.email || '');

  const canEditSettings = permissions.includes('settings.write') || role === 'ADMIN';
  const canManageUsers = permissions.includes('users.write') || role === 'ADMIN';

  const handleSaveProfile = () => {
    setIsEditingProfile(false);
    RNAlert.alert('Profile Saved', 'Your workspace profile information has been updated.');
  };

  const handleToggleAiRecs = (val: boolean) => {
    const updated = SettingsService.updateAIPreferences({ enableAIRecommendations: val });
    setAiPrefs(updated);
  };

  const handleToggleRequireApproval = (val: boolean) => {
    const updated = SettingsService.updateAIPreferences({ requireApprovalBeforeAction: val });
    setAiPrefs(updated);
  };

  const handleSetConfidence = (val: number) => {
    const updated = SettingsService.updateAIPreferences({ confidenceThreshold: val });
    setAiPrefs(updated);
  };

  const handleSetRiskTolerance = (val: 'LOW' | 'MEDIUM' | 'HIGH') => {
    const updated = SettingsService.updateAIPreferences({ riskTolerance: val });
    setAiPrefs(updated);
  };

  const handleSetSupplierStrategy = (val: 'LOWEST_COST' | 'FASTEST_DELIVERY' | 'LOWEST_RISK' | 'BALANCED') => {
    const updated = SettingsService.updateAIPreferences({ supplierStrategy: val });
    setAiPrefs(updated);
  };

  const handleToggleNotif = (key: keyof NotificationPreferences, val: boolean) => {
    const updated = SettingsService.updateNotificationPreferences({ [key]: val });
    setNotifPrefs(updated);
  };

  const handleClearDemoData = () => {
    RNAlert.alert(
      'Clear Cache',
      'Are you sure you want to reset workspace cache? Baseline organization configuration will remain intact.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: () => RNAlert.alert('Cache Reset', 'Local session cache cleared.'),
        },
      ]
    );
  };

  const handleSignOut = () => {
    RNAlert.alert(
      'Sign Out',
      'Are you sure you want to sign out of SupplySense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (err) {
              console.error('Logout error:', err);
            }
          },
        },
      ]
    );
  };

  const displayName = user?.full_name || 'Enterprise User';
  const displayEmail = user?.email || 'user@organization.com';
  const displayRole = role || 'MEMBER';
  const displayOrg = organization?.name || 'SupplySense Workspace';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* 1. Top Header Bar */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: theme.border }]}
          activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.darkTeal }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Manage your SupplySense workspace
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. User Profile Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
          <View style={styles.profileRow}>
            <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>{displayName.charAt(0)}</Text>
            </View>

            <View style={styles.profileMeta}>
              <Text style={[styles.profileName, { color: theme.text }]}>{displayName}</Text>
              <Text style={[styles.profileRole, { color: theme.deepTeal }]}>{displayRole}</Text>
              <Text style={[styles.profileOrg, { color: theme.textSecondary }]}>
                {displayOrg} • {displayEmail}
              </Text>
            </View>
          </View>

          {canEditSettings && (
            <TouchableOpacity
              style={[styles.editProfileBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primary + '30' }]}
              onPress={() => setIsEditingProfile(true)}
              activeOpacity={0.8}>
              <MaterialIcons name="edit" size={16} color={theme.deepTeal} />
              <Text style={[styles.editProfileBtnText, { color: theme.darkTeal }]}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 3. Workspace Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>WORKSPACE</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Organization</Text>
              <Text style={[styles.settingValText, { color: theme.textSecondary }]}>{workspace.organization}</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />

            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Environment</Text>
              <View style={[styles.pillBadge, { backgroundColor: theme.successBg }]}>
                <Text style={[styles.pillBadgeText, { color: theme.success }]}>{workspace.environment}</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />

            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Active Location</Text>
              <Text style={[styles.settingValText, { color: theme.deepTeal }]}>{workspace.activeLocation}</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />

            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Data Status</Text>
              <Text style={[styles.settingValText, { color: theme.textMuted }]}>
                {workspace.dataStatus} • Synced {workspace.lastSynchronized}
              </Text>
            </View>
          </View>
        </View>

        {/* 4. AI Decision Preferences Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>AI DECISION PREFERENCES</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
            <View style={styles.settingSwitchRow}>
              <View style={styles.switchTextGroup}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>AI Recommendations</Text>
                <Text style={[styles.settingDesc, { color: theme.textMuted }]}>
                  Generate automated reorder and inventory actions
                </Text>
              </View>
              <Switch
                value={aiPrefs.enableAIRecommendations}
                onValueChange={handleToggleAiRecs}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />

            <View style={styles.settingSwitchRow}>
              <View style={styles.switchTextGroup}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Require Approval Before Action</Text>
                <Text style={[styles.settingDesc, { color: theme.textMuted }]}>
                  Human operations lead must approve AI PO recommendations
                </Text>
              </View>
              <Switch
                value={aiPrefs.requireApprovalBeforeAction}
                onValueChange={handleToggleRequireApproval}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />

            <View style={styles.settingCol}>
              <Text style={[styles.settingLabel, { color: theme.text, marginBottom: 4 }]}>
                AI Confidence Threshold ({aiPrefs.confidenceThreshold}%)
              </Text>
              <View style={styles.pillsRow}>
                {[70, 80, 90].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.choicePill,
                      {
                        backgroundColor: aiPrefs.confidenceThreshold === t ? theme.primary : theme.surfaceSubtle,
                        borderColor: aiPrefs.confidenceThreshold === t ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => handleSetConfidence(t)}>
                    <Text
                      style={[
                        styles.choicePillText,
                        { color: aiPrefs.confidenceThreshold === t ? '#FFFFFF' : theme.textSecondary },
                      ]}>
                      {t}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />

            <View style={styles.settingCol}>
              <Text style={[styles.settingLabel, { color: theme.text, marginBottom: 4 }]}>Risk Tolerance</Text>
              <View style={styles.pillsRow}>
                {(['LOW', 'MEDIUM', 'HIGH'] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.choicePill,
                      {
                        backgroundColor: aiPrefs.riskTolerance === r ? theme.primary : theme.surfaceSubtle,
                        borderColor: aiPrefs.riskTolerance === r ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => handleSetRiskTolerance(r)}>
                    <Text
                      style={[
                        styles.choicePillText,
                        { color: aiPrefs.riskTolerance === r ? '#FFFFFF' : theme.textSecondary },
                      ]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />

            <View style={styles.settingCol}>
              <Text style={[styles.settingLabel, { color: theme.text, marginBottom: 4 }]}>
                Preferred Supplier Strategy
              </Text>
              <View style={styles.wrapPillsRow}>
                {[
                  { label: 'Lowest Cost', val: 'LOWEST_COST' },
                  { label: 'Fastest Delivery', val: 'FASTEST_DELIVERY' },
                  { label: 'Lowest Risk', val: 'LOWEST_RISK' },
                  { label: 'Balanced', val: 'BALANCED' },
                ].map((strat) => (
                  <TouchableOpacity
                    key={strat.val}
                    style={[
                      styles.choicePill,
                      {
                        backgroundColor: aiPrefs.supplierStrategy === strat.val ? theme.deepTeal : theme.surfaceSubtle,
                        borderColor: aiPrefs.supplierStrategy === strat.val ? theme.deepTeal : theme.border,
                      },
                    ]}
                    onPress={() => handleSetSupplierStrategy(strat.val as any)}>
                    <Text
                      style={[
                        styles.choicePillText,
                        { color: aiPrefs.supplierStrategy === strat.val ? '#FFFFFF' : theme.textSecondary },
                      ]}>
                      {strat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* 5. Notifications Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>NOTIFICATIONS</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
            <View style={styles.settingSwitchRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Critical Stock Alerts</Text>
              <Switch
                value={notifPrefs.criticalStockAlerts}
                onValueChange={(val) => handleToggleNotif('criticalStockAlerts', val)}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />

            <View style={styles.settingSwitchRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>AI Recommendations</Text>
              <Switch
                value={notifPrefs.aiRecommendations}
                onValueChange={(val) => handleToggleNotif('aiRecommendations', val)}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />

            <View style={styles.settingSwitchRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Supplier Risk Alerts</Text>
              <Switch
                value={notifPrefs.supplierRiskAlerts}
                onValueChange={(val) => handleToggleNotif('supplierRiskAlerts', val)}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />

            <View style={styles.settingSwitchRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Simulation Complete</Text>
              <Switch
                value={notifPrefs.simulationComplete}
                onValueChange={(val) => handleToggleNotif('simulationComplete', val)}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />

            <View style={styles.settingSwitchRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Daily Summary</Text>
              <Switch
                value={notifPrefs.dailySummary}
                onValueChange={(val) => handleToggleNotif('dailySummary', val)}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>
          </View>
        </View>

        {/* 6. Simulation Preferences Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SIMULATION PREFERENCES</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Default Duration</Text>
              <Text style={[styles.settingValText, { color: theme.deepTeal }]}>{simPrefs.defaultDurationDays} Days</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />

            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Default Policies</Text>
              <Text style={[styles.settingValText, { color: theme.textSecondary }]}>
                {simPrefs.defaultPolicies.join(', ')}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />

            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Default Metrics</Text>
              <Text style={[styles.settingValText, { color: theme.textMuted }]}>
                {simPrefs.defaultComparisonMetrics.join(' • ')}
              </Text>
            </View>
          </View>
        </View>

        {/* 7. Appearance Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>APPEARANCE</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Current Theme</Text>
              <Text style={[styles.settingValText, { color: theme.primary }]}>SupplySense Light</Text>
            </View>
          </View>
        </View>

        {/* 8. Data & Privacy Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DATA & PRIVACY</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
            <TouchableOpacity style={styles.linkRow} onPress={() => RNAlert.alert('Data Sources', 'Using local mock inventory data.')}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Data Sources</Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />

            <TouchableOpacity style={styles.linkRow} onPress={() => RNAlert.alert('Export Data', 'CSV / JSON export ready.')}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Export Data</Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />

            <TouchableOpacity style={styles.linkRow} onPress={handleClearDemoData}>
              <Text style={[styles.settingLabel, { color: theme.danger }]}>Clear Demo Data</Text>
              <MaterialIcons name="delete-outline" size={18} color={theme.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 9. About & Support Sections */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ABOUT & SUPPORT</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
            <View style={styles.aboutHeader}>
              <Text style={[styles.aboutTitle, { color: theme.darkTeal }]}>SupplySense</Text>
              <Text style={[styles.aboutDesc, { color: theme.textSecondary }]}>
                AI-powered supply-chain decision intelligence platform.
              </Text>
              <Text style={[styles.aboutMeta, { color: theme.textMuted }]}>Version 1.0.0 • Environment: Demo</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />

            <TouchableOpacity style={styles.linkRow} onPress={() => RNAlert.alert('Help Center', 'Documentation & Knowledge Base.')}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Help Center</Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />

            <TouchableOpacity style={styles.linkRow} onPress={() => RNAlert.alert('Contact Support', 'support@supplysense.ai')}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Contact Support</Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 10. Restrained Sign Out Button */}
        <TouchableOpacity
          style={[styles.signOutBtn, { backgroundColor: theme.dangerBg, borderColor: theme.dangerBorder }]}
          onPress={handleSignOut}
          activeOpacity={0.8}>
          <MaterialIcons name="logout" size={18} color={theme.danger} />
          <Text style={[styles.signOutBtnText, { color: theme.danger }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={isEditingProfile} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
            <Text style={[styles.modalTitle, { color: theme.darkTeal }]}>Edit Profile</Text>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surfaceSubtle, color: theme.text, borderColor: theme.border }]}
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Role</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surfaceSubtle, color: theme.text, borderColor: theme.border }]}
              value={editRole}
              onChangeText={setEditRole}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surfaceSubtle, color: theme.text, borderColor: theme.border }]}
              value={editEmail}
              onChangeText={setEditEmail}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: theme.border }]}
                onPress={() => setIsEditingProfile(false)}>
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: theme.primary }]}
                onPress={handleSaveProfile}>
                <Text style={styles.modalSaveText}>Save Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl + 30,
    gap: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
  },
  profileMeta: {
    flex: 1,
  },
  profileName: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  profileRole: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    marginTop: 1,
  },
  profileOrg: {
    fontSize: 11,
    marginTop: 2,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  editProfileBtnText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  sectionContainer: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: 0.5,
    marginLeft: 4,
    marginBottom: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  settingSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTextGroup: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  settingCol: {
    paddingVertical: 2,
  },
  settingLabel: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  settingDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  settingValText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  pillBadgeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  wrapPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  choicePill: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  choicePillText: {
    fontSize: 11,
    fontWeight: Typography.fontWeights.bold,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs + 2,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  aboutHeader: {
    marginBottom: Spacing.xs,
  },
  aboutTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  aboutDesc: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  aboutMeta: {
    fontSize: 10,
    marginTop: 4,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  signOutBtnText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
    marginBottom: 4,
  },
  input: {
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    fontSize: Typography.fontSizes.xs,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalCancelBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  modalSaveBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
});
