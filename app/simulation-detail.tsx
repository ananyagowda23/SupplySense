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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SimulationService } from '@/services/simulationService';
import { PolicyType } from '@/types/supplyChain';

export default function SimulationDetailScreen() {
  const router = useRouter();
  const { runId, policyType } = useLocalSearchParams<{ runId?: string; policyType?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const result = runId && policyType
    ? SimulationService.getSimulationResult(runId, policyType as PolicyType)
    : SimulationService.getLatestSimulationRun()?.results[0];

  if (!result) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: theme.border }]}>
            <MaterialIcons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Simulation Result Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isRL = result.policyType === 'RL_AGENT';
  const isHeuristic = result.policyType === 'HEURISTIC';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* 1. Header Bar */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: theme.border }]}
          activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.darkTeal }]}>{result.policyName}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {result.durationDays}-Day Policy Simulation Breakdown
          </Text>
        </View>

        {result.isBestOverall && (
          <View style={[styles.winnerBadge, { backgroundColor: theme.successBg, borderColor: theme.successBorder }]}>
            <Text style={[styles.winnerBadgeText, { color: theme.success }]}>🏆 Best</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Simulation Environment Context Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
          <View style={styles.metaRow}>
            <View style={styles.metaCell}>
              <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Simulation Horizon</Text>
              <Text style={[styles.metaVal, { color: theme.deepTeal }]}>{result.durationDays} Days</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Product Scope</Text>
              <Text style={[styles.metaVal, { color: theme.text }]}>{result.skuCount} SKUs</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Network Scope</Text>
              <Text style={[styles.metaVal, { color: theme.text }]}>{result.locationCount} Hubs</Text>
            </View>
          </View>

          {/* Key Metric Snapshot Grid */}
          <View style={[styles.metricsGrid, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderSubtle }]}>
            <View style={styles.metricCell}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Service Level</Text>
              <Text style={[styles.metricVal, { color: theme.success }]}>{result.serviceLevel}%</Text>
            </View>

            <View style={styles.metricCell}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Stockout Rate</Text>
              <Text style={[styles.metricVal, { color: result.stockoutRate > 4 ? theme.danger : theme.text }]}>
                {result.stockoutRate}%
              </Text>
            </View>

            <View style={styles.metricCell}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Holding Cost</Text>
              <Text style={[styles.metricVal, { color: theme.text }]}>
                ₹{result.totalHoldingCost.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.metricCell}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Projected Profit</Text>
              <Text style={[styles.metricVal, { color: theme.deepTeal }]}>
                ₹{result.projectedProfit.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* 3. Action Execution Breakdown */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
          <Text style={[styles.cardTitle, { color: theme.text, marginBottom: Spacing.sm }]}>Action Execution Metrics</Text>

          <View style={styles.actionsGrid}>
            <View style={[styles.actionStatCell, { backgroundColor: theme.surfaceSubtle }]}>
              <Text style={[styles.actionStatVal, { color: theme.primary }]}>{result.totalOrders}</Text>
              <Text style={[styles.actionStatLabel, { color: theme.textSecondary }]}>Purchase Orders</Text>
            </View>

            <View style={[styles.actionStatCell, { backgroundColor: theme.surfaceSubtle }]}>
              <Text style={[styles.actionStatVal, { color: theme.deepTeal }]}>{result.totalTransfers}</Text>
              <Text style={[styles.actionStatLabel, { color: theme.textSecondary }]}>Transfers</Text>
            </View>

            <View style={[styles.actionStatCell, { backgroundColor: theme.surfaceSubtle }]}>
              <Text style={[styles.actionStatVal, { color: theme.warning }]}>{result.totalExpedites}</Text>
              <Text style={[styles.actionStatLabel, { color: theme.textSecondary }]}>Expedites</Text>
            </View>

            <View style={[styles.actionStatCell, { backgroundColor: theme.surfaceSubtle }]}>
              <Text style={[styles.actionStatVal, { color: theme.success }]}>{result.totalDiscounts}</Text>
              <Text style={[styles.actionStatLabel, { color: theme.textSecondary }]}>Discounts</Text>
            </View>
          </View>

          <View style={styles.rewardRow}>
            <Text style={[styles.rewardLabel, { color: theme.textSecondary }]}>Average Step Reward Score:</Text>
            <Text style={[styles.rewardVal, { color: theme.deepTeal }]}>+{result.averageReward}</Text>
          </View>
        </View>

        {/* 4. Policy Model Architecture Rationale */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
          <View style={styles.rationaleHeaderRow}>
            <MaterialIcons
              name={isRL ? 'auto-awesome' : isHeuristic ? 'rule' : 'person'}
              size={20}
              color={isRL ? theme.deepTeal : theme.primary}
            />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Policy Architecture Rationale</Text>
          </View>

          {isRL ? (
            <View>
              <Text style={[styles.policySubTitle, { color: theme.darkTeal }]}>Hybrid DQN + Conservative Q-Learning (CQL)</Text>
              <Text style={[styles.policyBodyText, { color: theme.text }]}>
                The RL agent evaluates the high-dimensional supply-chain state space (on-hand stock, lead times, order velocity, supplier reliability) and selects the action with the highest expected long-term reward.
              </Text>
              <Text style={[styles.actionSpaceTitle, { color: theme.textSecondary, marginTop: Spacing.xs }]}>Discrete Action Space Heads:</Text>
              <Text style={[styles.actionSpaceBody, { color: theme.textMuted }]}>
                • NOOP: Maintain current parameters when buffer is safe.{'\n'}
                • ORDER: Issue purchase order to preferred supplier.{'\n'}
                • TRANSFER: Shift surplus stock between network warehouses.{'\n'}
                • EXPEDITE: Upgrade active PO delivery to air freight.{'\n'}
                • DISCOUNT: Apply temporary price discount to clear aging stock.
              </Text>
            </View>
          ) : isHeuristic ? (
            <View>
              <Text style={[styles.policySubTitle, { color: theme.darkTeal }]}>Rule-Based Inventory Optimization (s, S)</Text>
              <Text style={[styles.policyBodyText, { color: theme.text }]}>
                The heuristic policy operates on fixed reorder thresholds and deterministic decision rules:
              </Text>
              <Text style={[styles.actionSpaceBody, { color: theme.textMuted, marginTop: 4 }]}>
                1. Issue order whenever stock dips below safety threshold (s).{'\n'}
                2. Order quantity scales to target ceiling (S).{'\n'}
                3. Prioritize local suppliers during high disruption risk windows.
              </Text>
            </View>
          ) : (
            <View>
              <Text style={[styles.policySubTitle, { color: theme.darkTeal }]}>Legacy Manual Ordering Benchmark</Text>
              <Text style={[styles.policyBodyText, { color: theme.text }]}>
                Simulates traditional human decision-making: periodic weekly order placement with static safety stock buffers. Acts as a baseline benchmark.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  winnerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  winnerBadgeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
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
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  metaCell: {
    alignItems: 'center',
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.medium,
  },
  metaVal: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    rowGap: Spacing.sm,
  },
  metricCell: {
    width: '50%',
    paddingHorizontal: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.medium,
    marginBottom: 2,
  },
  metricVal: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  cardTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginVertical: Spacing.xs,
  },
  actionStatCell: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs + 2,
    alignItems: 'center',
  },
  actionStatVal: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  actionStatLabel: {
    fontSize: 9,
    fontWeight: Typography.fontWeights.medium,
    marginTop: 2,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  rewardLabel: {
    fontSize: Typography.fontSizes.xs,
  },
  rewardVal: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  rationaleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  policySubTitle: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: 4,
  },
  policyBodyText: {
    fontSize: Typography.fontSizes.xs,
    lineHeight: 18,
  },
  actionSpaceTitle: {
    fontSize: 11,
    fontWeight: Typography.fontWeights.bold,
  },
  actionSpaceBody: {
    fontSize: 11,
    lineHeight: 18,
  },
});
