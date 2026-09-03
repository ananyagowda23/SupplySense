import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface HeaderProps {
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  unreadCount?: number;
}

export function Header({ onNotificationPress, onProfilePress, unreadCount = 3 }: HeaderProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top row: Brand & Action Icons */}
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <View style={[styles.logoIconBg, { backgroundColor: theme.deepTeal }]}>
            <MaterialIcons name="auto-graph" size={18} color="#FFFFFF" />
          </View>
          <Text style={[styles.brandTitle, { color: theme.darkTeal }]}>SupplySense</Text>
          <View style={[styles.aiBadge, { backgroundColor: theme.accentLight, borderColor: theme.border, borderWidth: 1 }]}>
            <Text style={[styles.aiBadgeText, { color: theme.aiAccent }]}>AI</Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          {/* Notification Bell */}
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={onNotificationPress}
            activeOpacity={0.7}
            accessibilityLabel="Notifications">
            <MaterialIcons name="notifications-none" size={22} color={theme.icon} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.danger }]}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* User Profile Avatar */}
          <TouchableOpacity
            style={[styles.profileButton, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}
            onPress={onProfilePress}
            activeOpacity={0.7}
            accessibilityLabel="Profile">
            <Text style={[styles.profileText, { color: theme.deepTeal }]}>AN</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Greeting & Subtitle */}
      <View style={styles.greetingContainer}>
        <Text style={[styles.greeting, { color: theme.text }]}>Good morning</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {"Here's what's happening across your supply chain."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoIconBg: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: -0.5,
  },
  aiBadge: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  aiBadgeText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: Typography.fontWeights.bold,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  greetingContainer: {
    marginTop: Spacing.xs,
  },
  greeting: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.regular,
    marginTop: 2,
  },
});
