import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { InventoryHealthSummary } from '@/types/supplyChain';

interface InventoryHealthCardProps {
  data: InventoryHealthSummary;
}

export function InventoryHealthCard({ data }: InventoryHealthCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [animValue]);

  const healthyWidth = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${data.healthyPercent}%`],
  });

  const lowStockWidth = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${data.lowStockPercent}%`],
  });

  const criticalWidth = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${data.criticalPercent}%`],
  });

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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <MaterialIcons name="donut-large" size={20} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Inventory Health</Text>
        </View>
        <Text style={[styles.subText, { color: theme.textMuted }]}>
          {data.totalProducts} Total SKUs
        </Text>
      </View>

      {/* Segmented Visual Progress Bar */}
      <View style={styles.barContainer}>
        <Animated.View
          style={[
            styles.barSegment,
            {
              width: healthyWidth,
              backgroundColor: theme.success,
              borderTopLeftRadius: BorderRadius.sm,
              borderBottomLeftRadius: BorderRadius.sm,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.barSegment,
            {
              width: lowStockWidth,
              backgroundColor: theme.warning,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.barSegment,
            {
              width: criticalWidth,
              backgroundColor: theme.danger,
              borderTopRightRadius: BorderRadius.sm,
              borderBottomRightRadius: BorderRadius.sm,
            },
          ]}
        />
      </View>

      {/* Legend Breakdown */}
      <View style={styles.legendGrid}>
        {/* Healthy */}
        <View style={[styles.legendItem, { backgroundColor: theme.surfaceSubtle }]}>
          <View style={styles.legendTop}>
            <View style={[styles.dot, { backgroundColor: theme.success }]} />
            <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>Healthy</Text>
          </View>
          <Text style={[styles.legendPercent, { color: theme.text }]}>
            {data.healthyPercent}%
          </Text>
          <Text style={[styles.legendCount, { color: theme.textMuted }]}>
            {data.healthyCount} SKUs
          </Text>
        </View>

        {/* Low Stock */}
        <View style={[styles.legendItem, { backgroundColor: theme.surfaceSubtle }]}>
          <View style={styles.legendTop}>
            <View style={[styles.dot, { backgroundColor: theme.warning }]} />
            <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>Low Stock</Text>
          </View>
          <Text style={[styles.legendPercent, { color: theme.text }]}>
            {data.lowStockPercent}%
          </Text>
          <Text style={[styles.legendCount, { color: theme.textMuted }]}>
            {data.lowStockCount} SKUs
          </Text>
        </View>

        {/* Critical */}
        <View style={[styles.legendItem, { backgroundColor: theme.surfaceSubtle }]}>
          <View style={styles.legendTop}>
            <View style={[styles.dot, { backgroundColor: theme.danger }]} />
            <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>Critical</Text>
          </View>
          <Text style={[styles.legendPercent, { color: theme.text }]}>
            {data.criticalPercent}%
          </Text>
          <Text style={[styles.legendCount, { color: theme.textMuted }]}>
            {data.criticalCount} SKUs
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginVertical: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  subText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
  },
  barContainer: {
    height: 12,
    flexDirection: 'row',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  barSegment: {
    height: '100%',
  },
  legendGrid: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  legendItem: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  legendTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
  },
  legendPercent: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
  },
  legendCount: {
    fontSize: 10,
    marginTop: 2,
  },
});
