import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Alert } from '@/types/supplyChain';
import { StatusBadge } from './StatusBadge';

interface AlertCardProps {
  alert: Alert;
  onPressAlert?: (alert: Alert) => void;
}

export function AlertCard({ alert, onPressAlert }: AlertCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const getSeverityIcon = () => {
    switch (alert.severity) {
      case 'CRITICAL':
        return { name: 'error-outline' as const, color: theme.danger };
      case 'WARNING':
        return { name: 'warning-amber' as const, color: theme.warning };
      case 'INFO':
        return { name: 'info-outline' as const, color: theme.info };
      default:
        return { name: 'notifications' as const, color: theme.icon };
    }
  };

  const iconInfo = getSeverityIcon();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPressAlert?.(alert)}
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: alert.severity === 'CRITICAL' ? theme.dangerBorder : theme.border,
        },
        Shadows.card,
      ]}>
      {/* Alert Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <MaterialIcons name={iconInfo.name} size={18} color={iconInfo.color} />
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {alert.title}
          </Text>
        </View>

        <StatusBadge type="severity" value={alert.severity} size="sm" />
      </View>

      {/* Alert Message */}
      <Text style={[styles.message, { color: theme.textSecondary }]}>
        {alert.message}
      </Text>

      {/* Footer Info */}
      <View style={styles.footerRow}>
        <View style={styles.timeGroup}>
          <MaterialIcons name="schedule" size={12} color={theme.textMuted} />
          <Text style={[styles.timestamp, { color: theme.textMuted }]}>
            {alert.timestamp}
          </Text>
        </View>

        {alert.actionRequired && (
          <View style={styles.actionGroup}>
            <Text style={[styles.actionText, { color: theme.accent }]}>
              {alert.actionRequired}
            </Text>
            <MaterialIcons name="chevron-right" size={14} color={theme.accent} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    flex: 1,
  },
  message: {
    fontSize: Typography.fontSizes.sm,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestamp: {
    fontSize: Typography.fontSizes.xs,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
  },
});
