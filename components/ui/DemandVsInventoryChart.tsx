import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DemandInventoryPoint } from '@/types/supplyChain';

interface DemandVsInventoryChartProps {
  data: DemandInventoryPoint[];
}

export function DemandVsInventoryChart({ data }: DemandVsInventoryChartProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [selectedIndex, setSelectedIndex] = useState<number | null>(data.length - 1);

  // Maximum value for scaling graph heights
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.demand, d.availableInventory)),
    600
  );

  const selectedPoint = selectedIndex !== null ? data[selectedIndex] : data[data.length - 1];

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
      {/* Chart Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <MaterialIcons name="show-chart" size={20} color={theme.accent} />
            <Text style={[styles.title, { color: theme.text }]}>Demand vs Inventory</Text>
          </View>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            30-Day Operational Velocity & Buffer Analysis
          </Text>
        </View>
      </View>

      {/* Interactive Legend & Tooltip Summary */}
      <View style={[styles.legendBar, { backgroundColor: theme.surfaceSubtle }]}>
        <View style={styles.legendGroup}>
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, { backgroundColor: theme.accent }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>Demand</Text>
            {selectedPoint && (
              <Text style={[styles.valText, { color: theme.text }]}>
                {selectedPoint.demand} u
              </Text>
            )}
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, { backgroundColor: theme.success }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>Available</Text>
            {selectedPoint && (
              <Text style={[styles.valText, { color: theme.text }]}>
                {selectedPoint.availableInventory} u
              </Text>
            )}
          </View>
        </View>

        {selectedPoint && (
          <Text style={[styles.selectedDayText, { color: theme.textMuted }]}>
            {selectedPoint.day}
          </Text>
        )}
      </View>

      {/* Chart Scrollable Container */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}>
        {data.map((point, index) => {
          const isSelected = selectedIndex === index;

          const demandHeight = (point.demand / maxVal) * 110;
          const invHeight = (point.availableInventory / maxVal) * 110;

          return (
            <TouchableOpacity
              key={point.day}
              activeOpacity={0.7}
              onPress={() => setSelectedIndex(index)}
              style={[
                styles.barColumn,
                isSelected && { backgroundColor: theme.surfaceSubtle, borderRadius: BorderRadius.sm },
              ]}>
              <View style={styles.barsHolder}>
                {/* Demand Bar */}
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(demandHeight, 6),
                      backgroundColor: isSelected ? theme.accent : 'rgba(59, 130, 246, 0.65)',
                    },
                  ]}
                />

                {/* Available Inventory Bar */}
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(invHeight, 6),
                      backgroundColor: isSelected ? theme.success : 'rgba(16, 185, 129, 0.65)',
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.dayLabel,
                  { color: isSelected ? theme.accent : theme.textMuted },
                  isSelected && { fontWeight: Typography.fontWeights.bold },
                ]}>
                {point.day.replace('Day ', 'D')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer Insight */}
      <View style={styles.footerRow}>
        <MaterialIcons name="insights" size={14} color={theme.textMuted} />
        <Text style={[styles.footerText, { color: theme.textMuted }]}>
          Replenishment arrived Day 15. Stock crossover warning projected Day 30.
        </Text>
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
    marginBottom: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  subtitle: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  legendBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  legendGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendIndicator: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: Typography.fontSizes.xs,
  },
  valText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    marginLeft: 2,
  },
  selectedDayText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
  },
  scrollContainer: {
    paddingHorizontal: 2,
    alignItems: 'flex-end',
    height: 145,
    gap: 6,
  },
  barColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 28,
    paddingVertical: 4,
  },
  barsHolder: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 115,
  },
  bar: {
    width: 9,
    borderRadius: 3,
  },
  dayLabel: {
    fontSize: 9,
    marginTop: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  footerText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
});
