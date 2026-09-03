import React, { useState, useMemo } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { InventoryService, CATEGORIES, LOCATIONS } from '@/services/inventoryService';
import { InventoryItem } from '@/types/supplyChain';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AnimatedMetricValue } from '@/components/ui/AnimatedMetricValue';

type StatusFilterType = 'ALL' | 'HEALTHY' | 'LOW_STOCK' | 'CRITICAL';

export default function InventoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Data summary metrics
  const summary = useMemo(() => InventoryService.getInventorySummary(), []);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedLocation, setSelectedLocation] = useState<string>('All Locations');
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Filtered dataset via InventoryService
  const filteredItems = useMemo(() => {
    return InventoryService.getInventoryItems({
      searchQuery,
      status: statusFilter,
      category: selectedCategory,
      location: selectedLocation,
    });
  }, [searchQuery, statusFilter, selectedCategory, selectedLocation]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setSelectedCategory('All');
    setSelectedLocation('All Locations');
    setShowFiltersModal(false);
  };

  const handleItemPress = (item: InventoryItem) => {
    router.push({
      pathname: '/inventory-detail',
      params: { id: item.id },
    } as any);
  };

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const isCritical = item.healthStatus === 'CRITICAL';
    const isLow = item.healthStatus === 'LOW_STOCK';
    const indicatorColor = isCritical ? theme.danger : isLow ? theme.warning : theme.success;

    return (
      <TouchableOpacity
        style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.75}>
        {/* Top Header Row */}
        <View style={styles.itemHeaderRow}>
          <View style={styles.itemTitleGroup}>
            <View style={[styles.statusIndicatorDot, { backgroundColor: indicatorColor }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
                {item.productName}
              </Text>
              <Text style={[styles.skuLocationText, { color: theme.textMuted }]} numberOfLines={1}>
                SKU: {item.sku} • {item.location}
              </Text>
            </View>
          </View>

          <StatusBadge type="status" value={item.healthStatus} size="sm" />
        </View>

        {/* Category & Location Badges */}
        <View style={styles.badgeTagRow}>
          <View style={[styles.tagBadge, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.tagBadgeText, { color: theme.deepTeal }]}>{item.category}</Text>
          </View>
          <View style={[styles.tagBadge, { backgroundColor: theme.surfaceSubtle }]}>
            <MaterialIcons name="place" size={11} color={theme.textSecondary} />
            <Text style={[styles.tagBadgeText, { color: theme.textSecondary }]}>{item.location}</Text>
          </View>
        </View>

        {/* Metrics Grid Row */}
        <View style={[styles.itemMetricsBox, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderSubtle }]}>
          <View style={styles.metricColumn}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Current Stock</Text>
            <Text style={[styles.metricValue, { color: indicatorColor }]}>{item.quantityOnHand} units</Text>
          </View>

          <View style={styles.metricColumn}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Reorder Pt</Text>
            <Text style={[styles.metricValue, { color: theme.text }]}>{item.reorderPoint} units</Text>
          </View>

          <View style={styles.metricColumn}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Unit Cost</Text>
            <Text style={[styles.metricValue, { color: theme.text }]}>₹{item.unitCost.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Footer Chevron Row */}
        <View style={styles.itemFooterRow}>
          <Text style={[styles.supplierSnippet, { color: theme.textMuted }]} numberOfLines={1}>
            Supplier: {item.supplierName}
          </Text>
          <View style={styles.tapDetailsGroup}>
            <Text style={[styles.tapDetailsText, { color: theme.primary }]}>View Details</Text>
            <MaterialIcons name="chevron-right" size={18} color={theme.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* 1. Header Container */}
      <View style={[styles.headerContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTextGroup}>
            <Text style={[styles.headerTitle, { color: theme.darkTeal }]}>Inventory</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              Manage products, stock levels and locations
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.iconBtn,
                {
                  backgroundColor: showFiltersModal ? theme.primaryLight : theme.surfaceSubtle,
                  borderColor: showFiltersModal ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setShowFiltersModal(!showFiltersModal)}
              accessibilityLabel="Filter">
              <MaterialIcons
                name="tune"
                size={20}
                color={showFiltersModal ? theme.primary : theme.icon}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Summary KPI Cards Row (4 Compact Cards with Count-up Animations) */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
            <AnimatedMetricValue value={`${summary.totalSKUs}`} style={[styles.summaryValue, { color: theme.text }]} />
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Total SKUs</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: theme.primaryLight, borderColor: theme.primary + '30' }]}>
            <AnimatedMetricValue value={summary.totalValue} style={[styles.summaryValue, { color: theme.deepTeal }]} />
            <Text style={[styles.summaryLabel, { color: theme.deepTeal }]}>Value</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: theme.warningBg, borderColor: theme.warningBorder }]}>
            <AnimatedMetricValue value={`${summary.lowStockPercent}%`} style={[styles.summaryValue, { color: theme.warning }]} />
            <Text style={[styles.summaryLabel, { color: theme.warning }]}>Low Stock</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: theme.dangerBg, borderColor: theme.dangerBorder }]}>
            <AnimatedMetricValue value={`${summary.criticalPercent}%`} style={[styles.summaryValue, { color: theme.danger }]} />
            <Text style={[styles.summaryLabel, { color: theme.danger }]}>Critical</Text>
          </View>
        </View>

        {/* 3. Real-Time Search Field */}
        <View style={[styles.searchBar, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <MaterialIcons name="search" size={20} color={theme.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search products, SKU..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="cancel" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* 4. Status Filter Chips */}
        <View style={styles.filterChipsRow}>
          {(['ALL', 'HEALTHY', 'LOW_STOCK', 'CRITICAL'] as StatusFilterType[]).map((status) => {
            const isSelected = statusFilter === status;
            const chipLabel =
              status === 'ALL'
                ? 'All'
                : status === 'HEALTHY'
                ? 'Healthy'
                : status === 'LOW_STOCK'
                ? 'Low Stock'
                : 'Critical';

            return (
              <TouchableOpacity
                key={status}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.surfaceSubtle,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setStatusFilter(status)}>
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? '#FFFFFF' : theme.textSecondary },
                  ]}>
                  {chipLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 5. Filter Drawer / Dropdown */}
        {showFiltersModal && (
          <View style={[styles.advancedFilterBox, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
            <View style={styles.filterBoxHeader}>
              <Text style={[styles.advancedTitle, { color: theme.text }]}>Category Filter</Text>
              <TouchableOpacity onPress={handleResetFilters}>
                <Text style={[styles.resetText, { color: theme.primary }]}>Reset All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.miniChipsRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.miniChip,
                    selectedCategory === cat && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  onPress={() => setSelectedCategory(cat)}>
                  <Text style={[styles.miniChipText, selectedCategory === cat ? { color: '#FFFFFF' } : { color: theme.textSecondary }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.advancedTitle, { color: theme.text, marginTop: Spacing.sm }]}>Location Filter</Text>
            <View style={styles.miniChipsRow}>
              {LOCATIONS.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={[
                    styles.miniChip,
                    selectedLocation === loc && { backgroundColor: theme.deepTeal, borderColor: theme.deepTeal },
                  ]}
                  onPress={() => setSelectedLocation(loc)}>
                  <Text style={[styles.miniChipText, selectedLocation === loc ? { color: '#FFFFFF' } : { color: theme.textSecondary }]}>
                    {loc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* 6. Virtualized Product Inventory List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={40} color={theme.textMuted} />
            <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No matching inventory items</Text>
            <Text style={[styles.emptyStateSub, { color: theme.textSecondary }]}>
              Try clearing your search query or adjusting active filters.
            </Text>
            <TouchableOpacity
              style={[styles.resetBtn, { backgroundColor: theme.primary }]}
              onPress={handleResetFilters}>
              <Text style={styles.resetBtnText}>Reset Filters</Text>
            </TouchableOpacity>
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
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.medium,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    height: 40,
    marginTop: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSizes.sm,
    paddingVertical: 0,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
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
  advancedFilterBox: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  filterBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  advancedTitle: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  resetText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
  },
  miniChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  miniChip: {
    paddingHorizontal: Spacing.xs + 4,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  miniChipText: {
    fontSize: 11,
    fontWeight: Typography.fontWeights.medium,
  },
  listContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl + 30,
    gap: Spacing.sm,
  },
  itemCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  itemTitleGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    flex: 1,
    marginRight: Spacing.xs,
  },
  statusIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  itemName: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  skuLocationText: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  badgeTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 2,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.semibold,
  },
  itemMetricsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  metricColumn: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.medium,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  itemFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  supplierSnippet: {
    fontSize: Typography.fontSizes.xs,
    flex: 1,
    marginRight: Spacing.xs,
  },
  tapDetailsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tapDetailsText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
    paddingHorizontal: Spacing.lg,
  },
  emptyStateTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    marginTop: Spacing.sm,
  },
  emptyStateSub: {
    fontSize: Typography.fontSizes.sm,
    textAlign: 'center',
    marginTop: 4,
  },
  resetBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
});
