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
  ActivityService,
  ACTIVITY_TYPE_FILTERS,
  DATE_FILTER_OPTIONS,
} from '@/services/activityService';
import { ActivityItem, ActivityType } from '@/types/supplyChain';
import { AnimatedMetricValue } from '@/components/ui/AnimatedMetricValue';

type TypeFilterType = 'ALL' | 'AI' | 'INVENTORY' | 'ORDERS' | 'SUPPLIERS' | 'SIMULATION' | 'ALERTS';
type DateFilterType = 'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS';

export default function ActivityScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Summary Metrics
  const summary = useMemo(() => ActivityService.getActivitySummaryMetrics(), []);

  // Filter State
  const [typeFilter, setTypeFilter] = useState<TypeFilterType>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('ALL');

  // Query activities
  const activities = useMemo(() => {
    return ActivityService.getActivities({
      typeFilter,
      dateFilter,
    });
  }, [typeFilter, dateFilter]);

  // Group activities chronologically by timeGroup
  const groupedActivities = useMemo(() => {
    const today = activities.filter((a) => a.timeGroup === 'TODAY');
    const yesterday = activities.filter((a) => a.timeGroup === 'YESTERDAY');
    const last7 = activities.filter((a) => a.timeGroup === 'LAST_7_DAYS');

    const sections: { title: string; data: ActivityItem[] }[] = [];
    if (today.length > 0) sections.push({ title: 'TODAY', data: today });
    if (yesterday.length > 0) sections.push({ title: 'YESTERDAY', data: yesterday });
    if (last7.length > 0) sections.push({ title: 'LAST 7 DAYS', data: last7 });

    return sections;
  }, [activities]);

  const getActivityIcon = (type: ActivityType): keyof typeof MaterialIcons.glyphMap => {
    switch (type) {
      case 'AI_RECOMMENDATION':
        return 'auto-awesome';
      case 'ORDER':
        return 'shopping-cart';
      case 'TRANSFER':
        return 'swap-horiz';
      case 'EXPEDITE':
        return 'flight-takeoff';
      case 'DISCOUNT':
        return 'local-offer';
      case 'SUPPLIER_UPDATE':
        return 'domain';
      case 'INVENTORY_UPDATE':
        return 'inventory';
      case 'SIMULATION':
        return 'insights';
      case 'ALERT':
        return 'warning';
      case 'MANUAL_OVERRIDE':
        return 'edit';
      default:
        return 'settings';
    }
  };

  const getActivityColor = (type: ActivityType, actor: string) => {
    if (type === 'ALERT') return theme.danger;
    if (actor === 'AI Agent') return theme.deepTeal;
    if (actor === 'Operations') return theme.primary;
    if (actor === 'Simulation Engine') return theme.warning;
    return theme.textSecondary;
  };

  const handleActivityPress = (item: ActivityItem) => {
    router.push({
      pathname: '/activity-detail' as any,
      params: { id: item.id },
    });
  };

  const renderActivityCard = (item: ActivityItem) => {
    const iconName = getActivityIcon(item.type);
    const color = getActivityColor(item.type, item.actor);

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}
        onPress={() => handleActivityPress(item)}
        activeOpacity={0.75}>
        {/* Top Header Row */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.titleGroup}>
            <View style={[styles.iconBg, { backgroundColor: color + '15' }]}>
              <MaterialIcons name={iconName} size={18} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.timestampText, { color: theme.textMuted }]}>
                {item.timestamp}
              </Text>
            </View>
          </View>

          {/* Actor / Source Badge */}
          <View style={[styles.actorBadge, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderSubtle }]}>
            <Text style={[styles.actorBadgeText, { color }]}>{item.actor}</Text>
          </View>
        </View>

        {/* Description Text */}
        <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>
          {item.description}
        </Text>

        {/* Optional Entity Meta Row */}
        {item.productName || item.supplierName ? (
          <View style={[styles.metaBar, { backgroundColor: theme.surfaceSubtle }]}>
            {item.productName ? (
              <Text style={[styles.metaText, { color: theme.text }]} numberOfLines={1}>
                📦 {item.productName} ({item.sku})
              </Text>
            ) : null}
            {item.supplierName ? (
              <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
                🏢 {item.supplierName}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Footer Link */}
        <View style={styles.cardFooter}>
          <View style={styles.viewDetailGroup}>
            <Text style={[styles.viewDetailText, { color: theme.primary }]}>View Audit Log</Text>
            <MaterialIcons name="chevron-right" size={16} color={theme.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* 1. Header Bar */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { borderColor: theme.border }]}
            activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: theme.darkTeal }]}>Activity</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Track decisions, events and supply-chain changes
            </Text>
          </View>
        </View>

        {/* 2. Summary KPI Cards Row (4 Compact Cards with Count-up Animations) */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
            <AnimatedMetricValue value={`${summary.todayEvents}`} style={[styles.summaryValText, { color: theme.text }]} />
            <Text style={[styles.summaryLabelText, { color: theme.textSecondary }]}>Today Events</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: theme.primaryLight, borderColor: theme.primary + '30' }]}>
            <AnimatedMetricValue value={`${summary.aiDecisions}`} style={[styles.summaryValText, { color: theme.deepTeal }]} />
            <Text style={[styles.summaryLabelText, { color: theme.deepTeal }]}>AI Decisions</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: theme.dangerBg, borderColor: theme.dangerBorder }]}>
            <AnimatedMetricValue value={`${summary.alertsCount}`} style={[styles.summaryValText, { color: theme.danger }]} />
            <Text style={[styles.summaryLabelText, { color: theme.danger }]}>Alerts</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: theme.successBg, borderColor: theme.successBorder }]}>
            <AnimatedMetricValue value={`${summary.manualActions}`} style={[styles.summaryValText, { color: theme.success }]} />
            <Text style={[styles.summaryLabelText, { color: theme.success }]}>Manual Actions</Text>
          </View>
        </View>

        {/* 3. Filter Chips (Horizontal Scrollable) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
          {ACTIVITY_TYPE_FILTERS.map((fObj) => {
            const isSelected = typeFilter === fObj.value;
            return (
              <TouchableOpacity
                key={fObj.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.surfaceSubtle,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setTypeFilter(fObj.value)}>
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? '#FFFFFF' : theme.textSecondary },
                  ]}>
                  {fObj.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 4. Date Filter Pills Row */}
        <View style={styles.datePillsRow}>
          {DATE_FILTER_OPTIONS.map((dObj) => {
            const isSelected = dateFilter === dObj.value;
            return (
              <TouchableOpacity
                key={dObj.value}
                style={[
                  styles.datePill,
                  {
                    backgroundColor: isSelected ? theme.deepTeal : 'transparent',
                    borderColor: isSelected ? theme.deepTeal : theme.border,
                  },
                ]}
                onPress={() => setDateFilter(dObj.value)}>
                <Text
                  style={[
                    styles.datePillText,
                    { color: isSelected ? '#FFFFFF' : theme.textSecondary },
                  ]}>
                  {dObj.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 5. Chronological Feed grouped by Date Header */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {groupedActivities.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={40} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No activity found</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Try changing your filters or date range.
            </Text>
          </View>
        ) : (
          groupedActivities.map((section) => (
            <View key={section.title} style={styles.groupSection}>
              <View style={styles.groupHeaderRow}>
                <Text style={[styles.groupTitleText, { color: theme.deepTeal }]}>{section.title}</Text>
                <View style={[styles.groupLine, { backgroundColor: theme.borderSubtle }]} />
              </View>

              {section.data.map(renderActivityCard)}
            </View>
          ))
        )}
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
  datePillsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  datePill: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  datePillText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl + 30,
    gap: Spacing.md,
  },
  groupSection: {
    marginBottom: Spacing.sm,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  groupTitleText: {
    fontSize: 11,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: 0.5,
  },
  groupLine: {
    flex: 1,
    height: 1,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    flex: 1,
    marginRight: Spacing.xs,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  timestampText: {
    fontSize: 10,
    marginTop: 1,
  },
  actorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  actorBadgeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
  },
  descriptionText: {
    fontSize: Typography.fontSizes.xs,
    lineHeight: 18,
    marginVertical: 2,
  },
  metaBar: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 4,
    marginTop: Spacing.xs,
    gap: 2,
  },
  metaText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.medium,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  viewDetailGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailText: {
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
