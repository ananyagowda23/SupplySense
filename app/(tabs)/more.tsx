import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  route: string;
  badge?: string;
  color?: string;
}

export default function MoreScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user, role, organization } = useAuth();

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'US';

  const menuItems: MenuItem[] = [
    {
      id: 'products',
      title: 'Products',
      subtitle: 'Manage catalog, SKUs, reorder thresholds & lead times',
      icon: 'inventory',
      route: '/products',
      color: theme.accent,
    },
    {
      id: 'suppliers',
      title: 'Suppliers',
      subtitle: 'Supplier performance, reliability scores & active POs',
      icon: 'domain',
      route: '/suppliers',
      color: theme.success,
    },
    {
      id: 'analytics',
      title: 'Analytics',
      subtitle: 'Cost breakdown, stockout risk curves & SLA metrics',
      icon: 'insert-chart',
      route: '/analytics',
      color: theme.info,
    },
    {
      id: 'activity',
      title: 'Activity Feed',
      subtitle: 'Audit logs, system events & decision tracking history',
      icon: 'history',
      route: '/activity',
      badge: '3 New',
      color: theme.warning,
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'App preferences, notifications & enterprise profile',
      icon: 'settings',
      route: '/settings',
      color: theme.textSecondary,
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: theme.text }]}>Operations & Hub</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          SupplySense Enterprise Modules
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View
          style={[
            styles.userCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            Shadows.card,
          ]}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.text }]}>{user?.full_name || 'Enterprise User'}</Text>
            <Text style={[styles.userRole, { color: theme.textMuted }]}>
              {role || 'MANAGER'} • {organization?.name || 'SupplySense Org'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/settings' as any)}
            style={[styles.editBtn, { borderColor: theme.border }]}>
            <MaterialIcons name="edit" size={16} color={theme.icon} />
          </TouchableOpacity>
        </View>

        {/* Menu Items List */}
        <View style={styles.menuList}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => router.push(item.route as any)}
              style={[
                styles.menuCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
                Shadows.card,
              ]}>
              <View
                style={[
                  styles.menuIconBg,
                  { backgroundColor: `${item.color || theme.accent}15` },
                ]}>
                <MaterialIcons
                  name={item.icon}
                  size={22}
                  color={item.color || theme.accent}
                />
              </View>

              <View style={styles.menuTextGroup}>
                <View style={styles.menuTitleRow}>
                  <Text style={[styles.menuTitle, { color: theme.text }]}>
                    {item.title}
                  </Text>
                  {item.badge && (
                    <View style={[styles.badge, { backgroundColor: theme.warningBg }]}>
                      <Text style={[styles.badgeText, { color: theme.warning }]}>
                        {item.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.menuSubtitle, { color: theme.textMuted }]}>
                  {item.subtitle}
                </Text>
              </View>

              <MaterialIcons name="chevron-right" size={20} color={theme.icon} />
            </TouchableOpacity>
          ))}
        </View>

        {/* App Version Footnote */}
        <View style={styles.footer}>
          <Text style={[styles.versionText, { color: theme.textMuted }]}>
            SupplySense Mobile v1.0.0 • Enterprise Edition
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl + 20,
    gap: Spacing.lg,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  userRole: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuList: {
    gap: Spacing.md,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  menuIconBg: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextGroup: {
    flex: 1,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  menuTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  menuSubtitle: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 3,
    lineHeight: 16,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  versionText: {
    fontSize: Typography.fontSizes.xs,
  },
});
