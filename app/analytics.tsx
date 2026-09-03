import React, { useState, useMemo } from 'react';
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
import {
  AnalyticsService,
  AnalyticsTimeRange,
  TIME_RANGE_OPTIONS,
} from '@/services/analyticsService';
import { getDemandVsInventoryData } from '@/services/mockData';
import { DemandVsInventoryChart } from '@/components/ui/DemandVsInventoryChart';
import { AnimatedMetricValue } from '@/components/ui/AnimatedMetricValue';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function AnalyticsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Time Range selector state
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('30D');

  // Dynamic analytics data queries based on timeRange
  const summary = useMemo(() => AnalyticsService.getAnalyticsSummary(timeRange), [timeRange]);
  const inventoryMetrics = useMemo(() => AnalyticsService.getInventoryMetrics(timeRange), [timeRange]);
  const stockoutRisk = useMemo(() => AnalyticsService.getStockoutRiskAnalytics(), []);
  const supplierPerf = useMemo(() => AnalyticsService.getSupplierPerformance(), []);
  const policyPerf = useMemo(() => AnalyticsService.getPolicyPerformance(), []);
  const riskDist = useMemo(() => AnalyticsService.getRiskDistribution(), []);
  const insights = useMemo(() => AnalyticsService.getInsights(timeRange), [timeRange]);

  const demandVsInventory = useMemo(() => getDemandVsInventoryData(), []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* 1. Top Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { borderColor: theme.border }]}
            activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: theme.darkTeal }]}>Analytics</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Understand performance across your supply chain
            </Text>
          </View>
        </View>

        {/* 2. Time Range Selector Pills */}
        <View style={[styles.timeRangeBar, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
          {TIME_RANGE_OPTIONS.map((range) => {
            const isSelected = timeRange === range;
            return (
              <TouchableOpacity
                key={range}
                style={[
                  styles.timeRangePill,
                  {
                    backgroundColor: isSelected ? theme.primary : 'transparent',
                    borderColor: isSelected ? theme.primary : 'transparent',
                  },
                ]}
                onPress={() => setTimeRange(range)}>
                <Text
                  style={[
                    styles.timeRangeText,
                    { color: isSelected ? '#FFFFFF' : theme.textSecondary },
                  ]}>
                  {range}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 3. Executive Metrics Grid (2x3 Compact Cards with Count-up Animations) */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Projected Profit</Text>
            <AnimatedMetricValue value={summary.projectedProfit} style={[styles.kpiVal, { color: theme.deepTeal }]} />
            <Text style={[styles.kpiTrend, { color: theme.success }]}>{summary.projectedProfitTrend}</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Service Level</Text>
            <AnimatedMetricValue value={summary.serviceLevel} style={[styles.kpiVal, { color: theme.success }]} />
            <Text style={[styles.kpiTrend, { color: theme.textMuted }]}>Target: {summary.serviceLevelTarget}</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Stockout Rate</Text>
            <AnimatedMetricValue value={summary.stockoutRate} style={[styles.kpiVal, { color: theme.text }]} />
            <Text style={[styles.kpiTrend, { color: theme.success }]}>{summary.stockoutRateTrend}</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Inventory Value</Text>
            <AnimatedMetricValue value={summary.inventoryValue} style={[styles.kpiVal, { color: theme.text }]} />
            <Text style={[styles.kpiTrend, { color: theme.textMuted }]}>209 SKUs</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Holding Cost</Text>
            <AnimatedMetricValue value={summary.holdingCost} style={[styles.kpiVal, { color: theme.text }]} />
            <Text style={[styles.kpiTrend, { color: theme.success }]}>-2.1% efficiency</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Supply Risk</Text>
            <Text style={[styles.kpiVal, { color: theme.warning }]}>{summary.supplyRisk}</Text>
            <Text style={[styles.kpiTrend, { color: theme.warning }]}>2 Critical items</Text>
          </View>
        </View>

        {/* 4. Demand Trend Analytics Chart */}
        <DemandVsInventoryChart data={demandVsInventory} />

        {/* 5. Inventory Performance Section */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
          <Text style={[styles.cardTitle, { color: theme.text, marginBottom: Spacing.sm }]}>Inventory Performance</Text>

          <View style={[styles.metricsStrip, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderSubtle }]}>
            <View style={styles.stripCell}>
              <Text style={[styles.stripLabel, { color: theme.textSecondary }]}>Turnover Rate</Text>
              <Text style={[styles.stripVal, { color: theme.deepTeal }]}>{inventoryMetrics.turnoverRate}</Text>
            </View>

            <View style={styles.stripCell}>
              <Text style={[styles.stripLabel, { color: theme.textSecondary }]}>Days of Inv.</Text>
              <Text style={[styles.stripVal, { color: theme.text }]}>{inventoryMetrics.daysOfInventory} Days</Text>
            </View>

            <View style={styles.stripCell}>
              <Text style={[styles.stripLabel, { color: theme.textSecondary }]}>Overstock</Text>
              <Text style={[styles.stripVal, { color: theme.warning }]}>{inventoryMetrics.overstockValue}</Text>
            </View>

            <View style={styles.stripCell}>
              <Text style={[styles.stripLabel, { color: theme.textSecondary }]}>Understock</Text>
              <Text style={[styles.stripVal, { color: theme.danger }]}>{inventoryMetrics.understockValue}</Text>
            </View>
          </View>

          {/* Segmented Stock Breakdown Bar */}
          <Text style={[styles.breakdownTitle, { color: theme.textSecondary }]}>Stock Health Breakdown:</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barSeg, { width: `${inventoryMetrics.healthyPercent}%`, backgroundColor: theme.success }]} />
            <View style={[styles.barSeg, { width: `${inventoryMetrics.lowStockPercent}%`, backgroundColor: theme.warning }]} />
            <View style={[styles.barSeg, { width: `${inventoryMetrics.criticalPercent}%`, backgroundColor: theme.danger }]} />
          </View>
          <View style={styles.breakdownLegendRow}>
            <Text style={[styles.legendTag, { color: theme.success }]}>Healthy {inventoryMetrics.healthyPercent}%</Text>
            <Text style={[styles.legendTag, { color: theme.warning }]}>Low Stock {inventoryMetrics.lowStockPercent}%</Text>
            <Text style={[styles.legendTag, { color: theme.danger }]}>Critical {inventoryMetrics.criticalPercent}%</Text>
          </View>
        </View>

        {/* 6. Service Level & Target Indicator */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Service Level SLA</Text>
            <View style={[styles.targetTag, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.targetTagText, { color: theme.deepTeal }]}>Target: {summary.serviceLevelTarget}</Text>
            </View>
          </View>

          <View style={styles.slaBigRow}>
            <Text style={[styles.slaBigVal, { color: theme.success }]}>{summary.serviceLevel}</Text>
            <View style={styles.slaContextCol}>
              <Text style={[styles.slaPrevText, { color: theme.textSecondary }]}>Previous Period: {summary.serviceLevelPrevious}</Text>
              <Text style={[styles.slaAchieveText, { color: theme.success }]}>+1.4% above SLA commitment</Text>
            </View>
          </View>
        </View>

        {/* 7. Stockout Risk Analytics */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
          <Text style={[styles.cardTitle, { color: theme.text, marginBottom: Spacing.xs }]}>Stockout Risk Analytics</Text>

          <View style={[styles.riskSummaryBox, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderSubtle }]}>
            <View style={styles.riskStatCell}>
              <Text style={[styles.riskStatVal, { color: theme.success }]}>{stockoutRisk.currentStockoutRate}</Text>
              <Text style={[styles.riskStatLabel, { color: theme.textSecondary }]}>Stockout Rate</Text>
            </View>
            <View style={styles.riskStatCell}>
              <Text style={[styles.riskStatVal, { color: theme.warning }]}>{stockoutRisk.productsAtRiskCount}</Text>
              <Text style={[styles.riskStatLabel, { color: theme.textSecondary }]}>SKUs at Risk</Text>
            </View>
            <View style={styles.riskStatCell}>
              <Text style={[styles.riskStatVal, { color: theme.danger }]}>{stockoutRisk.expectedStockoutsCount}</Text>
              <Text style={[styles.riskStatLabel, { color: theme.textSecondary }]}>Est. Stockouts</Text>
            </View>
          </View>

          <Text style={[styles.riskProductsTitle, { color: theme.textSecondary }]}>High Risk SKUs (Days to Stockout):</Text>
          {stockoutRisk.highRiskProducts.map((p) => (
            <View key={p.id} style={styles.riskProductRow}>
              <Text style={[styles.riskProductName, { color: theme.text }]}>{p.name} ({p.sku})</Text>
              <View style={styles.riskProductTagGroup}>
                <Text style={[styles.riskDaysText, { color: p.risk === 'CRITICAL' ? theme.danger : theme.warning }]}>
                  {p.daysToStockout} days remaining
                </Text>
                <StatusBadge type="risk" value={p.risk} size="sm" />
              </View>
            </View>
          ))}
        </View>

        {/* 8. Supplier Performance Comparison Table */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
          <Text style={[styles.cardTitle, { color: theme.text, marginBottom: Spacing.sm }]}>Top Supplier Comparison</Text>

          {supplierPerf.map((sup) => (
            <TouchableOpacity
              key={sup.id}
              style={[styles.supplierRow, { borderBottomColor: theme.borderSubtle }]}
              onPress={() => router.push({ pathname: '/supplier-detail' as any, params: { id: sup.id } })}
              activeOpacity={0.75}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.supNameText, { color: theme.text }]}>{sup.name}</Text>
                <Text style={[styles.supMetaText, { color: theme.textMuted }]}>
                  Reliability: {sup.reliabilityScore}% • On-Time: {sup.onTimeDeliveryRate}% • Lead: {sup.leadTimeDays}d
                </Text>
              </View>

              <StatusBadge type="risk" value={sup.riskRating} size="sm" />
            </TouchableOpacity>
          ))}
        </View>

        {/* 9. Policy Performance Comparison (Shared Simulation Data) */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
          <Text style={[styles.cardTitle, { color: theme.text, marginBottom: Spacing.sm }]}>Policy Performance Benchmark</Text>

          {policyPerf.map((pol) => {
            const isWinner = pol.isBestOverall;

            return (
              <View key={pol.id} style={[styles.policyPerfBox, { backgroundColor: theme.surfaceSubtle, borderColor: isWinner ? theme.primary : theme.borderSubtle }]}>
                <View style={styles.policyPerfHeader}>
                  <Text style={[styles.policyPerfName, { color: theme.text }]}>{pol.policyName}</Text>
                  {isWinner && (
                    <View style={[styles.winnerBadge, { backgroundColor: theme.successBg }]}>
                      <Text style={[styles.winnerBadgeText, { color: theme.success }]}>🏆 Best Policy</Text>
                    </View>
                  )}
                </View>

                <View style={styles.policyPerfGrid}>
                  <View style={styles.polMetricCell}>
                    <Text style={[styles.polLabel, { color: theme.textSecondary }]}>Service</Text>
                    <Text style={[styles.polVal, { color: theme.success }]}>{pol.serviceLevel}%</Text>
                  </View>

                  <View style={styles.polMetricCell}>
                    <Text style={[styles.polLabel, { color: theme.textSecondary }]}>Stockout</Text>
                    <Text style={[styles.polVal, { color: pol.stockoutRate > 4 ? theme.danger : theme.text }]}>{pol.stockoutRate}%</Text>
                  </View>

                  <View style={styles.polMetricCell}>
                    <Text style={[styles.polLabel, { color: theme.textSecondary }]}>Holding</Text>
                    <Text style={[styles.polVal, { color: theme.text }]}>₹{(pol.totalHoldingCost / 100000).toFixed(1)}L</Text>
                  </View>

                  <View style={styles.polMetricCell}>
                    <Text style={[styles.polLabel, { color: theme.textSecondary }]}>Profit</Text>
                    <Text style={[styles.polVal, { color: theme.deepTeal }]}>₹{(pol.projectedProfit / 100000).toFixed(1)}L</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* 10. Risk Distribution Section */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
          <Text style={[styles.cardTitle, { color: theme.text, marginBottom: Spacing.xs }]}>Supply Chain Risk Distribution</Text>

          <View style={styles.barTrack}>
            <View style={[styles.barSeg, { width: `${riskDist.lowPercent}%`, backgroundColor: theme.success }]} />
            <View style={[styles.barSeg, { width: `${riskDist.mediumPercent}%`, backgroundColor: theme.warning }]} />
            <View style={[styles.barSeg, { width: `${riskDist.highPercent}%`, backgroundColor: theme.danger }]} />
            <View style={[styles.barSeg, { width: `${riskDist.criticalPercent}%`, backgroundColor: theme.dangerBorder }]} />
          </View>

          <View style={styles.riskDistLegendRow}>
            <Text style={[styles.legendTag, { color: theme.success }]}>Low {riskDist.lowPercent}%</Text>
            <Text style={[styles.legendTag, { color: theme.warning }]}>Medium {riskDist.mediumPercent}%</Text>
            <Text style={[styles.legendTag, { color: theme.danger }]}>High {riskDist.highPercent}%</Text>
            <Text style={[styles.legendTag, { color: theme.dangerBorder }]}>Critical {riskDist.criticalPercent}%</Text>
          </View>
        </View>

        {/* 11. Key Analytics Insights Cards */}
        <View style={[styles.card, { backgroundColor: theme.primaryLight, borderColor: theme.primary + '40' }]}>
          <View style={styles.insightHeaderRow}>
            <MaterialIcons name="auto-awesome" size={20} color={theme.deepTeal} />
            <Text style={[styles.insightTitle, { color: theme.darkTeal }]}>Key Analytics Insights</Text>
          </View>

          {insights.map((ins) => (
            <View key={ins.id} style={styles.insightItemRow}>
              <MaterialIcons name={ins.icon as any} size={16} color={theme.deepTeal} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.insightItemTitle, { color: theme.text }]}>{ins.title}</Text>
                <Text style={[styles.insightItemText, { color: theme.textSecondary }]}>{ins.text}</Text>
              </View>
            </View>
          ))}
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
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
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  timeRangeBar: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: 3,
    marginVertical: Spacing.xs,
  },
  timeRangePill: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  timeRangeText: {
    fontSize: 11,
    fontWeight: Typography.fontWeights.bold,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl + 30,
    gap: Spacing.md,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  kpiCard: {
    width: '48.5%',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.medium,
  },
  kpiVal: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    marginVertical: 2,
  },
  kpiTrend: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.semibold,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  cardTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  targetTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  targetTagText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
  },
  slaBigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.xs,
  },
  slaBigVal: {
    fontSize: 36,
    fontWeight: Typography.fontWeights.bold,
  },
  slaContextCol: {
    flex: 1,
  },
  slaPrevText: {
    fontSize: Typography.fontSizes.xs,
  },
  slaAchieveText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    marginTop: 2,
  },
  metricsStrip: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  stripCell: {
    flex: 1,
    alignItems: 'center',
  },
  stripLabel: {
    fontSize: 9,
    fontWeight: Typography.fontWeights.medium,
  },
  stripVal: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    marginTop: 2,
  },
  breakdownTitle: {
    fontSize: 11,
    fontWeight: Typography.fontWeights.medium,
    marginBottom: 4,
  },
  barTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  barSeg: {
    height: '100%',
  },
  breakdownLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  riskDistLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendTag: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.semibold,
  },
  riskSummaryBox: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  riskStatCell: {
    flex: 1,
    alignItems: 'center',
  },
  riskStatVal: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  riskStatLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.medium,
    marginTop: 2,
  },
  riskProductsTitle: {
    fontSize: 11,
    fontWeight: Typography.fontWeights.bold,
    marginTop: Spacing.xs,
    marginBottom: 4,
  },
  riskProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  riskProductName: {
    fontSize: Typography.fontSizes.xs,
    flex: 1,
    marginRight: Spacing.xs,
  },
  riskProductTagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  riskDaysText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 1,
  },
  supNameText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  supMetaText: {
    fontSize: 10,
    marginTop: 2,
  },
  policyPerfBox: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  policyPerfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  policyPerfName: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  winnerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  winnerBadgeText: {
    fontSize: 9,
    fontWeight: Typography.fontWeights.bold,
  },
  policyPerfGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  polMetricCell: {
    flex: 1,
  },
  polLabel: {
    fontSize: 9,
    fontWeight: Typography.fontWeights.medium,
  },
  polVal: {
    fontSize: 11,
    fontWeight: Typography.fontWeights.bold,
    marginTop: 1,
  },
  insightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  insightTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  insightItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: Spacing.xs,
  },
  insightItemTitle: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  insightItemText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 1,
  },
});
