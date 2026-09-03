import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface StockHealthBarProps {
  currentStock: number;
  safetyStock: number;
  reorderPoint: number;
  healthStatus: 'HEALTHY' | 'LOW_STOCK' | 'CRITICAL';
  maxCapacity?: number;
}

export function StockHealthBar({
  currentStock,
  safetyStock,
  reorderPoint,
  healthStatus,
  maxCapacity,
}: StockHealthBarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Calculate proportional percentages
  const maxVal = maxCapacity || Math.max(currentStock, reorderPoint * 1.5, safetyStock * 2, 100);
  const currentPct = Math.min(100, Math.max(0, (currentStock / maxVal) * 100));
  const safetyPct = Math.min(100, Math.max(0, (safetyStock / maxVal) * 100));
  const reorderPct = Math.min(100, Math.max(0, (reorderPoint / maxVal) * 100));

  const barColor =
    healthStatus === 'CRITICAL'
      ? theme.danger
      : healthStatus === 'LOW_STOCK'
      ? theme.warning
      : theme.success;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text }]}>Stock Health Visual</Text>
        <View style={[styles.statusBadge, { backgroundColor: barColor + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: barColor }]} />
          <Text style={[styles.statusBadgeText, { color: barColor }]}>
            {healthStatus === 'CRITICAL' ? 'Critical' : healthStatus === 'LOW_STOCK' ? 'Low Stock' : 'Healthy'}
          </Text>
        </View>
      </View>

      {/* Main Stock Bar Track */}
      <View style={[styles.barTrack, { backgroundColor: theme.borderSubtle }]}>
        {/* Fill level */}
        <View style={[styles.barFill, { width: `${currentPct}%`, backgroundColor: barColor }]} />

        {/* Safety Stock Marker line */}
        <View style={[styles.markerLine, { left: `${safetyPct}%`, backgroundColor: theme.danger }]}>
          <View style={[styles.markerLabelContainer, { backgroundColor: theme.danger }]}>
            <Text style={styles.markerText}>Safety</Text>
          </View>
        </View>

        {/* Reorder Point Marker line */}
        <View style={[styles.markerLine, { left: `${reorderPct}%`, backgroundColor: theme.warning }]}>
          <View style={[styles.markerLabelContainer, { backgroundColor: theme.warning }]}>
            <Text style={styles.markerText}>Reorder</Text>
          </View>
        </View>
      </View>

      {/* Legend & Details Grid */}
      <View style={styles.legendGrid}>
        <View style={styles.legendItem}>
          <Text style={[styles.legendValue, { color: theme.text }]}>{currentStock} units</Text>
          <View style={styles.legendLabelRow}>
            <View style={[styles.dot, { backgroundColor: barColor }]} />
            <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>Current Stock</Text>
          </View>
        </View>

        <View style={styles.legendItem}>
          <Text style={[styles.legendValue, { color: theme.warning }]}>{reorderPoint} units</Text>
          <View style={styles.legendLabelRow}>
            <View style={[styles.dot, { backgroundColor: theme.warning }]} />
            <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>Reorder Point</Text>
          </View>
        </View>

        <View style={styles.legendItem}>
          <Text style={[styles.legendValue, { color: theme.danger }]}>{safetyStock} units</Text>
          <View style={styles.legendLabelRow}>
            <View style={[styles.dot, { backgroundColor: theme.danger }]} />
            <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>Safety Stock</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
  },
  barTrack: {
    height: 24,
    borderRadius: BorderRadius.md,
    position: 'relative',
    overflow: 'visible',
    marginBottom: Spacing.xl,
    marginTop: Spacing.xs,
  },
  barFill: {
    height: '100%',
    borderRadius: BorderRadius.md,
  },
  markerLine: {
    position: 'absolute',
    top: -4,
    bottom: -4,
    width: 2,
    zIndex: 2,
    alignItems: 'center',
  },
  markerLabelContainer: {
    position: 'absolute',
    bottom: -22,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  markerText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: Typography.fontWeights.bold,
  },
  legendGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
  },
  legendItem: {
    alignItems: 'flex-start',
  },
  legendValue: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: 2,
  },
  legendLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  legendLabel: {
    fontSize: Typography.fontSizes.xs,
  },
});
