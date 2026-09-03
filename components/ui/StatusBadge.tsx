import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Typography, BorderRadius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ActionType, AlertSeverity, RiskLevel } from '@/types/supplyChain';

interface StatusBadgeProps {
  type: 'risk' | 'severity' | 'action' | 'status' | 'priority';
  value: RiskLevel | AlertSeverity | ActionType | string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ type, value, size = 'md' }: StatusBadgeProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  let bg = theme.surfaceSubtle;
  let text = theme.textSecondary;
  let border = theme.border;

  const normalized = value.toString().toUpperCase();

  if (type === 'risk' || type === 'severity' || type === 'priority') {
    if (normalized === 'HIGH' || normalized === 'CRITICAL') {
      bg = theme.dangerBg;
      text = theme.danger;
      border = theme.dangerBorder;
    } else if (normalized === 'MEDIUM' || normalized === 'WARNING') {
      bg = theme.warningBg;
      text = theme.warning;
      border = theme.warningBorder;
    } else if (normalized === 'LOW' || normalized === 'INFO') {
      bg = theme.successBg;
      text = theme.success;
      border = theme.successBorder;
    }
  } else if (type === 'action') {
    if (normalized === 'ORDER') {
      bg = theme.accentLight;
      text = theme.accent;
      border = theme.infoBorder;
    } else if (normalized === 'EXPEDITE') {
      bg = theme.warningBg;
      text = theme.warning;
      border = theme.warningBorder;
    } else if (normalized === 'DISCOUNT') {
      bg = theme.successBg;
      text = theme.success;
      border = theme.successBorder;
    } else if (normalized === 'TRANSFER') {
      bg = theme.infoBg;
      text = theme.info;
      border = theme.infoBorder;
    }
  } else {
    if (normalized === 'IN_STOCK' || normalized === 'HEALTHY') {
      bg = theme.successBg;
      text = theme.success;
      border = theme.successBorder;
    } else if (normalized === 'LOW_STOCK') {
      bg = theme.warningBg;
      text = theme.warning;
      border = theme.warningBorder;
    } else if (normalized === 'CRITICAL') {
      bg = theme.dangerBg;
      text = theme.danger;
      border = theme.dangerBorder;
    } else if (normalized === 'SURPLUS') {
      bg = theme.infoBg;
      text = theme.info;
      border = theme.infoBorder;
    }
  }

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderColor: border,
          paddingHorizontal: isSmall ? Spacing.xs + 2 : Spacing.sm + 2,
          paddingVertical: isSmall ? 2 : Spacing.xs,
        },
      ]}>
      <Text
        style={[
          styles.badgeText,
          {
            color: text,
            fontSize: isSmall ? Typography.fontSizes.xs : Typography.fontSizes.sm,
          },
        ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontWeight: Typography.fontWeights.semibold,
    letterSpacing: 0.3,
  },
});
