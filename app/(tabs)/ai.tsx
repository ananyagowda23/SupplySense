import React, { useState, useMemo } from 'react';
import {
  FlatList,
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
  RecommendationService,
  ACTION_FILTER_OPTIONS,
  SORT_OPTIONS,
} from '@/services/recommendationService';
import { Recommendation } from '@/types/supplyChain';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AnimatedMetricValue } from '@/components/ui/AnimatedMetricValue';

type ActionFilterType = 'ALL' | 'CRITICAL' | 'ORDER' | 'TRANSFER' | 'EXPEDITE' | 'DISCOUNT' | 'NO_OP';
type SortType = 'CONFIDENCE' | 'PRIORITY' | 'IMPACT' | 'RECENT';

export default function AIScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Summary Metrics
  const summary = useMemo(() => RecommendationService.getAISummaryMetrics(), []);

  // Filter & Sort State
  const [actionFilter, setActionFilter] = useState<ActionFilterType>('ALL');
  const [sortBy, setSortBy] = useState<SortType>('CONFIDENCE');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Filtered dataset
  const recommendations = useMemo(() => {
    return RecommendationService.getRecommendations({
      actionFilter,
      sortBy,
    });
  }, [actionFilter, sortBy]);

  // Recent decisions
  const recentDecisions = useMemo(() => RecommendationService.getRecentAIDecisions(), []);

  const handleRecommendationPress = (rec: Recommendation) => {
    router.push({
      pathname: '/recommendation-detail' as any,
      params: { id: rec.id },
    });
  };

  const renderRecommendationCard = ({ item }: { item: Recommendation }) => {
    const isCritical = item.priority === 'CRITICAL';
    const isHigh = item.priority === 'HIGH';
    const actionColor =
      item.action === 'ORDER'
        ? theme.primary
        : item.action === 'EXPEDITE'
        ? theme.danger
        : item.action === 'TRANSFER'
        ? theme.deepTeal
        : item.action === 'DISCOUNT'
        ? theme.warning
        : theme.textSecondary;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: isCritical ? theme.danger + '80' : isHigh ? theme.primary + '60' : theme.border,
          },
          Shadows.card,
        ]}
        onPress={() => handleRecommendationPress(item)}
        activeOpacity={0.8}>
        {/* Top Header Badge Row */}
        <View style={styles.cardTopRow}>
          <View style={[styles.aiBadge, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}>
            <MaterialIcons name="auto-awesome" size={14} color={theme.deepTeal} />
            <Text style={[styles.aiBadgeText, { color: theme.deepTeal }]}>AI RECOMMENDATION</Text>
          </View>

          <StatusBadge type="priority" value={item.priority} size="sm" />
        </View>

        {/* Product Title & Location */}
        <Text style={[styles.productName, { color: theme.text }]} numberOfLines={1}>
          {item.productName}
        </Text>
        <Text style={[styles.productMetaText, { color: theme.textMuted }]}>
          SKU: {item.sku} • {item.location}
        </Text>

        {/* Recommended Action Pill */}
        <View style={[styles.actionBanner, { backgroundColor: actionColor + '15', borderColor: actionColor + '40' }]}>
          <Text style={[styles.actionLabel, { color: actionColor }]}>
            {item.action === 'ORDER' && `ORDER ${item.quantity} units`}
            {item.action === 'TRANSFER' && `TRANSFER ${item.quantity} units`}
            {item.action === 'EXPEDITE' && `EXPEDITE PO Delivery`}
            {item.action === 'DISCOUNT' && `DISCOUNT ${item.discountPercentage}%`}
            {item.action === 'NO_OP' && `NO ACTION REQUIRED`}
          </Text>
        </View>

        {/* Supplier Snippet if applicable */}
        {item.supplier ? (
          <Text style={[styles.supplierText, { color: theme.textSecondary }]} numberOfLines={1}>
            Supplier: <Text style={{ color: theme.text, fontWeight: '600' }}>{item.supplier}</Text>
          </Text>
        ) : null}

        {/* Expected Impact & Confidence Metrics */}
        <View style={[styles.impactBox, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderSubtle }]}>
          <View style={styles.impactCol}>
            <Text style={[styles.impactLabel, { color: theme.textSecondary }]}>Confidence</Text>
            <Text style={[styles.impactVal, { color: item.confidence >= 90 ? theme.success : theme.warning }]}>
              {item.confidence}%
            </Text>
          </View>

          <View style={styles.impactCol}>
            <Text style={[styles.impactLabel, { color: theme.textSecondary }]}>Service Impact</Text>
            <Text style={[styles.impactVal, { color: theme.success }]}>+{item.serviceLevelImpact}%</Text>
          </View>

          <View style={styles.impactCol}>
            <Text style={[styles.impactLabel, { color: theme.textSecondary }]}>Est. Net Profit</Text>
            <Text style={[styles.impactVal, { color: theme.deepTeal }]}>
              +₹{item.expectedProfitImpact.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Card Footer Button */}
        <View style={styles.cardFooter}>
          <Text style={[styles.decisionStateText, { color: item.decisionState ? theme.success : theme.textMuted }]}>
            {item.decisionState ? `Status: ${item.decisionState}` : 'Pending Operations Review'}
          </Text>

          <View style={[styles.reviewBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.reviewBtnText}>Review Decision</Text>
            <MaterialIcons name="arrow-forward" size={14} color="#FFFFFF" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* 1. Top Header */}
      <View style={[styles.headerContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.darkTeal }]}>AI Supply Chain Intelligence</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              AI-powered decisions for your supply chain
            </Text>
          </View>

          {/* AI Engine Status Indicator Badge */}
          <View style={[styles.engineStatusBadge, { backgroundColor: theme.primaryLight, borderColor: theme.primary + '40' }]}>
            <View style={[styles.engineDot, { backgroundColor: theme.success }]} />
            <View>
              <Text style={[styles.engineLabel, { color: theme.textMuted }]}>AI ENGINE</Text>
              <Text style={[styles.engineState, { color: theme.deepTeal }]}>Ready</Text>
            </View>
          </View>
        </View>

        {/* 2. Summary KPI Cards Row (4 Compact Cards with Count-up Animations) */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
            <AnimatedMetricValue value={`${summary.activeRecommendations}`} style={[styles.summaryValText, { color: theme.text }]} />
            <Text style={[styles.summaryLabelText, { color: theme.textSecondary }]}>Active Recs</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: theme.dangerBg, borderColor: theme.dangerBorder }]}>
            <AnimatedMetricValue value={`${summary.criticalActions}`} style={[styles.summaryValText, { color: theme.danger }]} />
            <Text style={[styles.summaryLabelText, { color: theme.danger }]}>Critical Actions</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: theme.primaryLight, borderColor: theme.primary + '30' }]}>
            <AnimatedMetricValue value={summary.optimizationOpportunity} style={[styles.summaryValText, { color: theme.deepTeal }]} />
            <Text style={[styles.summaryLabelText, { color: theme.deepTeal }]}>Opt. Opportunity</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: theme.successBg, borderColor: theme.successBorder }]}>
            <AnimatedMetricValue value={summary.averageConfidence} style={[styles.summaryValText, { color: theme.success }]} />
            <Text style={[styles.summaryLabelText, { color: theme.success }]}>Avg Confidence</Text>
          </View>
        </View>

        {/* 3. Action Filter Chips Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
          {ACTION_FILTER_OPTIONS.map((actionObj) => {
            const isSelected = actionFilter === actionObj.value;
            return (
              <TouchableOpacity
                key={actionObj.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.surfaceSubtle,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setActionFilter(actionObj.value)}>
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? '#FFFFFF' : theme.textSecondary },
                  ]}>
                  {actionObj.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 4. Sort Dropdown Bar */}
        <View style={styles.sortBar}>
          <Text style={[styles.resultCountText, { color: theme.textMuted }]}>
            Showing {recommendations.length} recommendations
          </Text>

          <TouchableOpacity
            style={[styles.sortBtn, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}
            onPress={() => setShowSortMenu(!showSortMenu)}>
            <MaterialIcons name="sort" size={16} color={theme.primary} />
            <Text style={[styles.sortBtnText, { color: theme.text }]}>
              Sort: {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sort Menu Options */}
        {showSortMenu && (
          <View style={[styles.sortMenu, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {SORT_OPTIONS.map((sortObj) => (
              <TouchableOpacity
                key={sortObj.value}
                style={[
                  styles.sortMenuItem,
                  sortBy === sortObj.value && { backgroundColor: theme.primaryLight },
                ]}
                onPress={() => {
                  setSortBy(sortObj.value);
                  setShowSortMenu(false);
                }}>
                <Text
                  style={[
                    styles.sortMenuItemText,
                    { color: sortBy === sortObj.value ? theme.deepTeal : theme.text },
                  ]}>
                  {sortObj.label}
                </Text>
                {sortBy === sortObj.value && <MaterialIcons name="check" size={16} color={theme.deepTeal} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* 5. Recommendations Virtualized List & Recent AI Decisions */}
      <FlatList
        data={recommendations}
        keyExtractor={(item) => item.id}
        renderItem={renderRecommendationCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View style={[styles.decisionsSection, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
            <View style={styles.decisionsHeader}>
              <MaterialIcons name="history" size={18} color={theme.deepTeal} />
              <Text style={[styles.decisionsTitle, { color: theme.text }]}>Recent AI Decisions</Text>
            </View>

            {recentDecisions.map((dec) => (
              <View key={dec.id} style={[styles.decisionRow, { borderBottomColor: theme.borderSubtle }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.decisionItemName, { color: theme.text }]}>{dec.productName}</Text>
                  <Text style={[styles.decisionActionText, { color: theme.textMuted }]}>
                    {dec.action} • {dec.timeAgo}
                  </Text>
                </View>

                <View
                  style={[
                    styles.decisionStateBadge,
                    {
                      backgroundColor:
                        dec.decision === 'APPROVED'
                          ? theme.successBg
                          : dec.decision === 'MODIFIED'
                          ? theme.warningBg
                          : theme.dangerBg,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.decisionStateBadgeText,
                      {
                        color:
                          dec.decision === 'APPROVED'
                            ? theme.success
                            : dec.decision === 'MODIFIED'
                            ? theme.warning
                            : theme.danger,
                      },
                    ]}>
                    {dec.decision}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={40} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No recommendations match your filters.</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              SupplySense is actively monitoring your supply chain parameters.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
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
  engineStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 6,
  },
  engineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  engineLabel: {
    fontSize: 8,
    fontWeight: Typography.fontWeights.bold,
  },
  engineState: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginVertical: Spacing.xs,
  },
  summaryCard: {
    flex: 1,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  summaryLabelText: {
    fontSize: 9,
    fontWeight: Typography.fontWeights.medium,
    marginTop: 2,
  },
  filterChipsRow: {
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 4,
  },
  resultCountText: {
    fontSize: Typography.fontSizes.xs,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: 4,
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: Typography.fontWeights.medium,
  },
  sortMenu: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.xs,
    marginTop: 4,
    marginBottom: 4,
  },
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.sm,
  },
  sortMenuItemText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl + 30,
    gap: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: 4,
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  productMetaText: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  actionBanner: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    marginVertical: Spacing.xs + 2,
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  supplierText: {
    fontSize: Typography.fontSizes.xs,
    marginBottom: Spacing.xs,
  },
  impactBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  impactCol: {
    flex: 1,
  },
  impactLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.medium,
    marginBottom: 2,
  },
  impactVal: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  decisionStateText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  reviewBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  decisionsSection: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  decisionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  decisionsTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  decisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 1,
  },
  decisionItemName: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  decisionActionText: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  decisionStateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  decisionStateBadgeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.fontSizes.sm,
    textAlign: 'center',
    marginTop: 4,
  },
});
