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
import { SupplierService } from '@/services/supplierService';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function SupplierDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const supplier = id ? SupplierService.getSupplierById(id) : SupplierService.getSuppliers()[0];
  const purchaseOrders = supplier ? SupplierService.getPurchaseOrdersForSupplier(supplier.id) : [];

  if (!supplier) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: theme.border }]}>
            <MaterialIcons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Supplier Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isLocal = supplier.supplierType === 'LOCAL';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: theme.border }]}
          activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.darkTeal }]}>{supplier.name}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {supplier.supplierId} • {supplier.category}
          </Text>
        </View>

        <StatusBadge type="risk" value={supplier.riskRating} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Supplier Basic Info Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
          <View style={styles.infoMetaRow}>
            <View style={[styles.typeTag, { backgroundColor: isLocal ? theme.primaryLight : theme.surfaceSubtle }]}>
              <MaterialIcons name={isLocal ? 'home' : 'flight-takeoff'} size={14} color={isLocal ? theme.deepTeal : theme.textSecondary} />
              <Text style={[styles.typeTagText, { color: isLocal ? theme.deepTeal : theme.textSecondary }]}>
                {isLocal ? 'Local Supplier' : 'Overseas Supplier'}
              </Text>
            </View>
            <Text style={[styles.regionText, { color: theme.textMuted }]}>Region: {supplier.region}</Text>
          </View>

          <Text style={[styles.addressText, { color: theme.textSecondary }]}>
            📍 {supplier.location}
          </Text>
          <Text style={[styles.contactText, { color: theme.textMuted }]}>
            ✉ {supplier.contactEmail} {supplier.phone ? `• 📞 ${supplier.phone}` : ''}
          </Text>

          {/* 4 Key Performance Overview Metrics */}
          <View style={[styles.metricsGrid, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderSubtle }]}>
            <View style={styles.metricCell}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Reliability Score</Text>
              <Text style={[styles.metricValue, { color: supplier.reliabilityScore >= 90 ? theme.success : theme.warning }]}>
                {supplier.reliabilityScore}%
              </Text>
            </View>

            <View style={styles.metricCell}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Lead Time</Text>
              <Text style={[styles.metricValue, { color: theme.text }]}>{supplier.leadTimeDays} Days</Text>
            </View>

            <View style={styles.metricCell}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Avg Unit Cost</Text>
              <Text style={[styles.metricValue, { color: theme.text }]}>₹{supplier.unitCostAverage.toLocaleString('en-IN')}</Text>
            </View>

            <View style={styles.metricCell}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Active POs</Text>
              <Text style={[styles.metricValue, { color: theme.deepTeal }]}>{supplier.activeOrdersCount}</Text>
            </View>
          </View>
        </View>

        {/* 2. Performance Metrics Section */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
          <Text style={[styles.cardSectionTitle, { color: theme.text }]}>Performance Metrics</Text>

          {/* On-Time Delivery */}
          <View style={styles.perfProgressRow}>
            <View style={styles.perfLabelGroup}>
              <Text style={[styles.perfLabel, { color: theme.textSecondary }]}>On-Time Delivery</Text>
              <Text style={[styles.perfVal, { color: theme.text }]}>{supplier.onTimeDeliveryRate}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.borderSubtle }]}>
              <View style={[styles.progressFill, { width: `${supplier.onTimeDeliveryRate}%`, backgroundColor: theme.success }]} />
            </View>
          </View>

          {/* Quality Score */}
          <View style={styles.perfProgressRow}>
            <View style={styles.perfLabelGroup}>
              <Text style={[styles.perfLabel, { color: theme.textSecondary }]}>Quality Score</Text>
              <Text style={[styles.perfVal, { color: theme.text }]}>{supplier.qualityScore}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.borderSubtle }]}>
              <View style={[styles.progressFill, { width: `${supplier.qualityScore}%`, backgroundColor: theme.primary }]} />
            </View>
          </View>

          {/* Fill Rate */}
          <View style={styles.perfProgressRow}>
            <View style={styles.perfLabelGroup}>
              <Text style={[styles.perfLabel, { color: theme.textSecondary }]}>Fill Rate</Text>
              <Text style={[styles.perfVal, { color: theme.text }]}>{supplier.fillRate}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.borderSubtle }]}>
              <View style={[styles.progressFill, { width: `${supplier.fillRate}%`, backgroundColor: theme.deepTeal }]} />
            </View>
          </View>

          {/* Cancellation Rate */}
          <View style={styles.perfProgressRow}>
            <View style={styles.perfLabelGroup}>
              <Text style={[styles.perfLabel, { color: theme.textSecondary }]}>Cancellation Rate</Text>
              <Text style={[styles.perfVal, { color: supplier.cancellationRate > 2 ? theme.danger : theme.textSecondary }]}>
                {supplier.cancellationRate}%
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.borderSubtle }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, supplier.cancellationRate * 10)}%`,
                    backgroundColor: supplier.cancellationRate > 2 ? theme.danger : theme.warning,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* 3. Supply Risk Section */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardSectionTitle, { color: theme.text }]}>Supply Risk & Vulnerabilities</Text>
            <StatusBadge type="risk" value={supplier.riskRating} size="sm" />
          </View>

          <Text style={[styles.subSectionTitle, { color: theme.textSecondary }]}>Identified Risk Factors:</Text>
          {supplier.riskFactors.map((factor, index) => (
            <View key={index} style={styles.bulletItem}>
              <Text style={[styles.bulletDot, { color: theme.warning }]}>•</Text>
              <Text style={[styles.bulletText, { color: theme.text }]}>{factor}</Text>
            </View>
          ))}

          <Text style={[styles.subSectionTitle, { color: theme.textSecondary, marginTop: Spacing.md }]}>Recent Disruptions:</Text>
          {supplier.recentDisruptions.map((disruption, index) => (
            <View key={index} style={styles.bulletItem}>
              <Text style={[styles.bulletDot, { color: theme.danger }]}>•</Text>
              <Text style={[styles.bulletText, { color: theme.textMuted }]}>{disruption}</Text>
            </View>
          ))}
        </View>

        {/* 4. Active Purchase Orders Section */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
          <Text style={[styles.cardSectionTitle, { color: theme.text }]}>Recent Purchase Orders</Text>

          {purchaseOrders.length === 0 ? (
            <Text style={[styles.emptyOrdersText, { color: theme.textMuted }]}>No active purchase orders for this supplier.</Text>
          ) : (
            purchaseOrders.map((po) => {
              const statusColor =
                po.status === 'DELIVERED'
                  ? theme.success
                  : po.status === 'IN_TRANSIT'
                  ? theme.primary
                  : po.status === 'DELAYED'
                  ? theme.danger
                  : theme.warning;

              return (
                <View key={po.id} style={[styles.poRow, { borderBottomColor: theme.borderSubtle }]}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.poNumberGroup}>
                      <Text style={[styles.poNumber, { color: theme.text }]}>{po.poNumber}</Text>
                      <View style={[styles.poStatusBadge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.poStatusText, { color: statusColor }]}>{po.status.replace('_', ' ')}</Text>
                      </View>
                    </View>
                    <Text style={[styles.poProductText, { color: theme.textSecondary }]}>
                      {po.productName} • {po.quantity} units
                    </Text>
                    <Text style={[styles.poDateText, { color: theme.textMuted }]}>
                      Expected Arrival: {po.expectedArrival}
                    </Text>
                  </View>

                  <Text style={[styles.poCostText, { color: theme.darkTeal }]}>
                    ₹{po.totalCost.toLocaleString('en-IN')}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* 5. AI Supplier Recommendation Card */}
        {supplier.aiRecommendation ? (
          <View style={[styles.aiCard, { backgroundColor: theme.primaryLight, borderColor: theme.primary + '50' }]}>
            <View style={styles.aiHeaderRow}>
              <View style={styles.aiTitleGroup}>
                <MaterialIcons name="auto-awesome" size={20} color={theme.deepTeal} />
                <Text style={[styles.aiTitle, { color: theme.darkTeal }]}>AI Supplier Optimization</Text>
              </View>

              <View style={[styles.aiConfidenceBadge, { backgroundColor: theme.surface }]}>
                <Text style={[styles.aiConfidenceText, { color: theme.deepTeal }]}>
                  {supplier.aiRecommendation.confidence}% Confidence
                </Text>
              </View>
            </View>

            <Text style={[styles.aiReasoningText, { color: theme.text }]}>
              {`"${supplier.aiRecommendation.reasoning}"`}
            </Text>

            <View style={styles.aiDetailGrid}>
              <View style={styles.aiDetailCell}>
                <Text style={[styles.aiDetailLabel, { color: theme.textSecondary }]}>Target Item</Text>
                <Text style={[styles.aiDetailVal, { color: theme.text }]}>{supplier.aiRecommendation.targetProduct}</Text>
              </View>
              <View style={styles.aiDetailCell}>
                <Text style={[styles.aiDetailLabel, { color: theme.textSecondary }]}>Lead Time Impact</Text>
                <Text style={[styles.aiDetailVal, { color: theme.success }]}>{supplier.aiRecommendation.leadTimeDeltaDays} Days</Text>
              </View>
              <View style={styles.aiDetailCell}>
                <Text style={[styles.aiDetailLabel, { color: theme.textSecondary }]}>Cost Delta</Text>
                <Text style={[styles.aiDetailVal, { color: theme.text }]}>+{supplier.aiRecommendation.costDiffPercent}%</Text>
              </View>
            </View>

            <View style={styles.mockTagRow}>
              <Text style={styles.mockTagText}>MOCK RECOMMENDATION • RL BACKEND INTEGRATION READY</Text>
            </View>
          </View>
        ) : null}
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
  infoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: Typography.fontWeights.bold,
  },
  regionText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
  },
  addressText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    marginTop: Spacing.xs,
  },
  contactText: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginTop: Spacing.md,
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
  metricValue: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  cardSectionTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: Spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  perfProgressRow: {
    marginBottom: Spacing.sm,
  },
  perfLabelGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  perfLabel: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
  },
  perfVal: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  subSectionTitle: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    marginTop: Spacing.xs,
    marginBottom: 4,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 2,
  },
  bulletDot: {
    fontSize: 14,
    lineHeight: 16,
  },
  bulletText: {
    fontSize: Typography.fontSizes.xs,
    flex: 1,
  },
  emptyOrdersText: {
    fontSize: Typography.fontSizes.xs,
    fontStyle: 'italic',
  },
  poRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  poNumberGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  poNumber: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  poStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  poStatusText: {
    fontSize: 9,
    fontWeight: Typography.fontWeights.bold,
  },
  poProductText: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  poDateText: {
    fontSize: 10,
    marginTop: 2,
  },
  poCostText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  aiCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  aiTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  aiTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  aiConfidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  aiConfidenceText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
  },
  aiReasoningText: {
    fontSize: Typography.fontSizes.xs,
    fontStyle: 'italic',
    marginVertical: Spacing.xs,
    lineHeight: 18,
  },
  aiDetailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  aiDetailCell: {
    flex: 1,
  },
  aiDetailLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.medium,
  },
  aiDetailVal: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    marginTop: 2,
  },
  mockTagRow: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  mockTagText: {
    fontSize: 9,
    fontWeight: Typography.fontWeights.bold,
    color: '#086B68',
    letterSpacing: 0.5,
  },
});
