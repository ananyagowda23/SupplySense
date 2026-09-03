import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { KPIMetric } from '@/types/supplyChain';

import { AnimatedMetricValue } from './AnimatedMetricValue';

interface KPICardProps {
  metric: KPIMetric;
}

export function KPICard({ metric }: KPICardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const getIconName = (name: string): keyof typeof MaterialIcons.glyphMap => {
    switch (name) {
      case 'account-balance-wallet':
        return 'account-balance-wallet';
      case 'verified':
        return 'verified';
      case 'trending-up':
        return 'trending-up';
      case 'warning':
        return 'warning';
      default:
        return 'analytics';
    }
  };

  const isRiskCard = metric.label.toLowerCase().includes('risk');

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
        Shadows.card,
      ]}>
      {/* Top row: Label & Icon */}
      <View style={styles.topRow}>
        <Text numberOfLines={1} style={[styles.label, { color: theme.textSecondary }]}>
          {metric.label}
        </Text>
        <View
          style={[
            styles.iconBg,
            {
              backgroundColor: isRiskCard
                ? theme.warningBg
                : theme.surfaceSubtle,
            },
          ]}>
          <MaterialIcons
            name={getIconName(metric.icon)}
            size={18}
            color={isRiskCard ? theme.warning : theme.primary}
          />
        </View>
      </View>

      {/* Main Metric Value with Animated Count-up */}
      <AnimatedMetricValue value={metric.value} style={[styles.value, { color: theme.text }]} />

      {/* Trend & Context Footnote */}
      <View style={styles.bottomRow}>
        <View
          style={[
            styles.trendBadge,
            {
              backgroundColor: metric.isPositiveTrend ? theme.successBg : theme.warningBg,
            },
          ]}>
          <MaterialIcons
            name={metric.isPositiveTrend ? 'arrow-upward' : 'priority-high'}
            size={12}
            color={metric.isPositiveTrend ? theme.success : theme.warning}
          />
          <Text
            style={[
              styles.trendText,
              { color: metric.isPositiveTrend ? theme.success : theme.warning },
            ]}>
            {metric.change}
          </Text>
        </View>
        <Text numberOfLines={1} style={[styles.contextText, { color: theme.textMuted }]}>
          {metric.context}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flex: 1,
    minWidth: '46%',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
    flex: 1,
  },
  iconBg: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: -0.5,
    marginVertical: Spacing.xs,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 2,
  },
  trendText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
  },
  contextText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.regular,
    flex: 1,
  },
});
