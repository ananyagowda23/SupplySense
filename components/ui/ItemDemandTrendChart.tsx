import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DemandInventoryPoint } from '@/types/supplyChain';

interface ItemDemandTrendChartProps {
  data?: DemandInventoryPoint[];
  title?: string;
}

export function ItemDemandTrendChart({
  data,
  title = '30-Day Demand Trend',
}: ItemDemandTrendChartProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Default fallback data if item doesn't have custom demand trend
  const chartData = data || [
    { day: 'Day 1', demand: 32, availableInventory: 200 },
    { day: 'Day 5', demand: 35, availableInventory: 180 },
    { day: 'Day 10', demand: 42, availableInventory: 160 },
    { day: 'Day 15', demand: 38, availableInventory: 145 },
    { day: 'Day 20', demand: 44, availableInventory: 130 },
    { day: 'Day 25', demand: 40, availableInventory: 115 },
    { day: 'Day 30', demand: 45, availableInventory: 98 },
  ];

  const maxDemand = Math.max(...chartData.map((d) => d.demand), 50);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Daily Demand (Units/Day)</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        {chartData.map((item, index) => {
          const barHeightPct = Math.min(100, Math.max(15, (item.demand / maxDemand) * 100));
          return (
            <View key={index} style={styles.columnContainer}>
              <Text style={[styles.demandValueText, { color: theme.primary }]}>{item.demand}</Text>
              
              <View style={[styles.barTrack, { backgroundColor: theme.borderSubtle }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${barHeightPct}%`,
                      backgroundColor: theme.primary,
                    },
                  ]}
                />
              </View>

              <Text style={[styles.dayText, { color: theme.textSecondary }]}>{item.day}</Text>
            </View>
          );
        })}
      </ScrollView>
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
  header: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  subtitle: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  scrollContainer: {
    paddingRight: Spacing.md,
    alignItems: 'flex-end',
    height: 140,
  },
  columnContainer: {
    width: 44,
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  demandValueText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: 4,
  },
  barTrack: {
    width: 14,
    height: 80,
    borderRadius: BorderRadius.full,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 6,
  },
  barFill: {
    width: '100%',
    borderRadius: BorderRadius.full,
  },
  dayText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.medium,
  },
});
