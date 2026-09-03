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
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  SupplierService,
  SUPPLIER_TYPES,
  SUPPLIER_RISK_OPTIONS,
  SUPPLIER_CATEGORIES,
  SUPPLIER_REGIONS,
} from '@/services/supplierService';
import { Supplier } from '@/types/supplyChain';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AnimatedMetricValue } from '@/components/ui/AnimatedMetricValue';

export default function SuppliersScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Summary Metrics
  const summary = useMemo(() => SupplierService.getSupplierSummary(), []);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierType, setSupplierType] = useState<'ALL' | 'LOCAL' | 'OVERSEAS'>('ALL');
  const [selectedRisk, setSelectedRisk] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Filtered dataset
  const filteredSuppliers = useMemo(() => {
    return SupplierService.getSuppliers({
      searchQuery,
      supplierType,
      risk: selectedRisk as any,
      category: selectedCategory,
      region: selectedRegion,
    });
  }, [searchQuery, supplierType, selectedRisk, selectedCategory, selectedRegion]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSupplierType('ALL');
    setSelectedRisk('ALL');
    setSelectedCategory('All');
    setSelectedRegion('All');
    setShowAdvancedFilters(false);
  };

  const handleSupplierPress = (supplier: Supplier) => {
    router.push({
      pathname: '/supplier-detail' as any,
      params: { id: supplier.id },
    });
  };

  const renderSupplierCard = ({ item }: { item: Supplier }) => {
    const isLocal = item.supplierType === 'LOCAL';

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}
        onPress={() => handleSupplierPress(item)}
        activeOpacity={0.75}>
        {/* Top Header Row */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: Spacing.xs }}>
            <View style={styles.nameRow}>
              <Text style={[styles.supplierName, { color: theme.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View
                style={[
                  styles.typeBadge,
                  {
                    backgroundColor: isLocal ? theme.primaryLight : theme.surfaceSubtle,
                    borderColor: isLocal ? theme.primary + '50' : theme.border,
                  },
                ]}>
                <Text style={[styles.typeBadgeText, { color: isLocal ? theme.deepTeal : theme.textSecondary }]}>
                  {isLocal ? 'Local' : 'Overseas'}
                </Text>
              </View>
            </View>
            <Text style={[styles.supplierMetaText, { color: theme.textMuted }]}>
              {item.supplierId} • {item.category} • {item.region}
            </Text>
          </View>

          <StatusBadge type="risk" value={item.riskRating} size="sm" />
        </View>

        {/* Metrics Grid */}
        <View style={[styles.metricsGrid, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderSubtle }]}>
          <View style={styles.metricCol}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Reliability</Text>
            <Text style={[styles.metricVal, { color: item.reliabilityScore >= 90 ? theme.success : theme.warning }]}>
              {item.reliabilityScore}%
            </Text>
          </View>

          <View style={styles.metricCol}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Lead Time</Text>
            <Text style={[styles.metricVal, { color: theme.text }]}>{item.leadTimeDays} days</Text>
          </View>

          <View style={styles.metricCol}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Active POs</Text>
            <Text style={[styles.metricVal, { color: theme.deepTeal }]}>{item.activeOrdersCount} POs</Text>
          </View>
        </View>

        {/* Card Footer Chevron Row */}
        <View style={styles.cardFooter}>
          <Text style={[styles.locationText, { color: theme.textMuted }]} numberOfLines={1}>
            📍 {item.location}
          </Text>
          <View style={styles.viewDetailGroup}>
            <Text style={[styles.viewDetailText, { color: theme.primary }]}>Performance & Risk</Text>
            <MaterialIcons name="chevron-right" size={18} color={theme.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
          <Text style={[styles.title, { color: theme.darkTeal }]}>Suppliers</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Manage supplier performance, costs and risk
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.filterToggleBtn,
            {
              backgroundColor: showAdvancedFilters ? theme.primaryLight : theme.surfaceSubtle,
              borderColor: showAdvancedFilters ? theme.primary : theme.border,
            },
          ]}
          onPress={() => setShowAdvancedFilters(!showAdvancedFilters)}>
          <MaterialIcons
            name="tune"
            size={20}
            color={showAdvancedFilters ? theme.primary : theme.icon}
          />
        </TouchableOpacity>
      </View>

      {/* 2. Summary KPI Cards Row (4 Compact Cards with Count-up Animations) */}
      <View style={[styles.summaryContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
            <AnimatedMetricValue value={`${summary.totalSuppliers}`} style={[styles.summaryValText, { color: theme.text }]} />
            <Text style={[styles.summaryLabelText, { color: theme.textSecondary }]}>Total</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: theme.primaryLight, borderColor: theme.primary + '30' }]}>
            <AnimatedMetricValue value={`${summary.activeSuppliers}`} style={[styles.summaryValText, { color: theme.deepTeal }]} />
            <Text style={[styles.summaryLabelText, { color: theme.deepTeal }]}>Active</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: theme.successBg, borderColor: theme.successBorder }]}>
            <AnimatedMetricValue value={summary.averageReliability} style={[styles.summaryValText, { color: theme.success }]} />
            <Text style={[styles.summaryLabelText, { color: theme.success }]}>Avg Reliability</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
            <AnimatedMetricValue value={`${summary.activePOs}`} style={[styles.summaryValText, { color: theme.text }]} />
            <Text style={[styles.summaryLabelText, { color: theme.textSecondary }]}>Active POs</Text>
          </View>
        </View>

        {/* 3. Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <MaterialIcons name="search" size={20} color={theme.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search suppliers..."
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

        {/* 4. Supplier Type Filter Chips */}
        <View style={styles.typeChipsRow}>
          {SUPPLIER_TYPES.map((typeObj) => {
            const isSelected = supplierType === typeObj.value;
            return (
              <TouchableOpacity
                key={typeObj.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.surfaceSubtle,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setSupplierType(typeObj.value)}>
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? '#FFFFFF' : theme.textSecondary },
                  ]}>
                  {typeObj.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 5. Filter Drawer */}
        {showAdvancedFilters && (
          <View style={[styles.advancedFilterDrawer, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
            <View style={styles.drawerHeaderRow}>
              <Text style={[styles.drawerTitle, { color: theme.text }]}>Filters</Text>
              <TouchableOpacity onPress={handleResetFilters}>
                <Text style={[styles.resetText, { color: theme.primary }]}>Reset All</Text>
              </TouchableOpacity>
            </View>

            {/* Risk Filter */}
            <Text style={[styles.drawerSectionLabel, { color: theme.textSecondary }]}>Risk Rating</Text>
            <View style={styles.miniChipsRow}>
              {SUPPLIER_RISK_OPTIONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.miniChip,
                    selectedRisk === r && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  onPress={() => setSelectedRisk(r)}>
                  <Text style={[styles.miniChipText, selectedRisk === r ? { color: '#FFFFFF' } : { color: theme.textSecondary }]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category Filter */}
            <Text style={[styles.drawerSectionLabel, { color: theme.textSecondary, marginTop: Spacing.xs }]}>Category</Text>
            <View style={styles.miniChipsRow}>
              {SUPPLIER_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.miniChip,
                    selectedCategory === cat && { backgroundColor: theme.deepTeal, borderColor: theme.deepTeal },
                  ]}
                  onPress={() => setSelectedCategory(cat)}>
                  <Text style={[styles.miniChipText, selectedCategory === cat ? { color: '#FFFFFF' } : { color: theme.textSecondary }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Region Filter */}
            <Text style={[styles.drawerSectionLabel, { color: theme.textSecondary, marginTop: Spacing.xs }]}>Region</Text>
            <View style={styles.miniChipsRow}>
              {SUPPLIER_REGIONS.map((reg) => (
                <TouchableOpacity
                  key={reg}
                  style={[
                    styles.miniChip,
                    selectedRegion === reg && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  onPress={() => setSelectedRegion(reg)}>
                  <Text style={[styles.miniChipText, selectedRegion === reg ? { color: '#FFFFFF' } : { color: theme.textSecondary }]}>
                    {reg}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* 6. Virtualized Supplier List */}
      <FlatList
        data={filteredSuppliers}
        keyExtractor={(item) => item.id}
        renderItem={renderSupplierCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={40} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No suppliers found</Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
              Try adjusting your search term or active filters.
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    gap: Spacing.md,
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
  filterToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
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
  typeChipsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs + 2,
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
  advancedFilterDrawer: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  drawerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  drawerTitle: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  resetText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
  },
  drawerSectionLabel: {
    fontSize: 11,
    fontWeight: Typography.fontWeights.medium,
    marginBottom: 4,
  },
  miniChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
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
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl + 30,
    gap: Spacing.sm,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  supplierName: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
  },
  supplierMetaText: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  metricCol: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.medium,
    marginBottom: 2,
  },
  metricVal: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  locationText: {
    fontSize: Typography.fontSizes.xs,
    flex: 1,
    marginRight: Spacing.xs,
  },
  viewDetailGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailText: {
    fontSize: Typography.fontSizes.xs,
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
  emptySub: {
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
