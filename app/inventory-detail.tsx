import React, { useState } from 'react';
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
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { InventoryService } from '@/services/inventoryService';
import { StockHealthBar } from '@/components/ui/StockHealthBar';
import { ItemDemandTrendChart } from '@/components/ui/ItemDemandTrendChart';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ActionConfirmationModal } from '@/components/ui/ActionConfirmationModal';
import { ActionType } from '@/types/supplyChain';

export default function InventoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Selected action for modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);

  // Retrieve item from service layer
  const item = id ? InventoryService.getInventoryItemById(id) : InventoryService.getInventoryItems()[0];

  if (!item) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Item Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleOpenAction = (action: ActionType) => {
    setSelectedAction(action);
    setModalVisible(true);
  };

  const availableStock = item.quantityOnHand - item.quantityReserved;
  const inventoryValue = item.quantityOnHand * item.unitCost;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* Header bar */}
      <View style={[styles.headerBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { borderColor: theme.border }]}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Item Details</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>{item.sku}</Text>
        </View>
        <StatusBadge type="status" value={item.healthStatus} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* 1. Product Information Overview */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.productTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.productName, { color: theme.text }]}>{item.productName}</Text>
              <Text style={[styles.productCategory, { color: theme.textSecondary }]}>
                {item.category} • {item.location}
              </Text>
            </View>
            <View style={[styles.riskBadge, {
              backgroundColor: item.riskLevel === 'HIGH' ? theme.dangerBg : item.riskLevel === 'MEDIUM' ? theme.warningBg : theme.successBg
            }]}>
              <Text style={[styles.riskBadgeText, {
                color: item.riskLevel === 'HIGH' ? theme.danger : item.riskLevel === 'MEDIUM' ? theme.warning : theme.success
              }]}>
                {item.riskLevel} RISK
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Stock Health Visual */}
        <StockHealthBar
          currentStock={item.quantityOnHand}
          safetyStock={item.safetyStock}
          reorderPoint={item.reorderPoint}
          healthStatus={item.healthStatus}
        />

        {/* 3. Detailed Metrics 2x3 Grid */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Operational Metrics</Text>
          <View style={styles.grid2x3}>
            <View style={styles.metricCell}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Quantity On Hand</Text>
              <Text style={[styles.metricValue, { color: theme.text }]}>{item.quantityOnHand} units</Text>
            </View>

            <View style={styles.metricCell}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>On Order</Text>
              <Text style={[styles.metricValue, { color: theme.accent }]}>{item.quantityOnOrder} units</Text>
            </View>

            <View style={styles.metricCell}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Reserved Stock</Text>
              <Text style={[styles.metricValue, { color: theme.textSecondary }]}>{item.quantityReserved} units</Text>
            </View>

            <View style={styles.metricCell}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Available Stock</Text>
              <Text style={[styles.metricValue, { color: theme.primary }]}>{availableStock} units</Text>
            </View>

            <View style={styles.metricCell}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Reorder Point</Text>
              <Text style={[styles.metricValue, { color: theme.warning }]}>{item.reorderPoint} units</Text>
            </View>

            <View style={styles.metricCell}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Safety Stock</Text>
              <Text style={[styles.metricValue, { color: theme.danger }]}>{item.safetyStock} units</Text>
            </View>
          </View>
        </View>

        {/* 4. Supply & Procurement Info */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Supply & Procurement</Text>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Primary Supplier</Text>
            <Text style={[styles.infoValue, { color: theme.accent }]}>{item.supplierName}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Lead Time</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{item.leadTimeDays} Days</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Supplier Reliability</Text>
            <Text style={[styles.infoValue, { color: theme.success }]}>{item.supplierReliability}% Score</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Active Purchase Orders</Text>
            <Text style={[styles.infoValue, { color: theme.primary }]}>{item.activePurchaseOrders} Open POs</Text>
          </View>
        </View>

        {/* 5. Financial Overview */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Financial Breakdown</Text>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Unit Cost</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>₹{item.unitCost.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Total Inventory Value</Text>
            <Text style={[styles.infoValue, { color: theme.primary }]}>₹{inventoryValue.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Holding Cost / Unit</Text>
            <Text style={[styles.infoValue, { color: theme.textSecondary }]}>₹{item.holdingCostPerUnit}/unit</Text>
          </View>
        </View>

        {/* 6. Risk Analysis */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Risk Analysis</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Stockout Probability</Text>
            <Text style={[styles.infoValue, {
              color: item.stockoutProbability > 50 ? theme.danger : theme.success
            }]}>
              {item.stockoutProbability}%
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Est. Days to Stockout</Text>
            <Text style={[styles.infoValue, {
              color: item.estimatedDaysToStockout <= 3 ? theme.danger : theme.text
            }]}>
              {item.estimatedDaysToStockout} Days
            </Text>
          </View>
        </View>

        {/* 7. Demand Trend Chart */}
        <ItemDemandTrendChart data={item.demandTrend} />

        {/* 8. AI Replenishment Insight Card */}
        {item.aiReplenishment && (
          <View style={[styles.aiCard, { backgroundColor: theme.surfaceSubtle, borderColor: theme.accent + '40' }]}>
            <View style={styles.aiHeaderRow}>
              <View style={styles.aiTitleGroup}>
                <MaterialIcons name="auto-awesome" size={20} color={theme.accent} />
                <Text style={[styles.aiTitle, { color: theme.text }]}>AI Replenishment Strategy</Text>
              </View>

              <View style={[styles.confidenceBadge, { backgroundColor: theme.accentLight }]}>
                <Text style={[styles.confidenceText, { color: theme.accent }]}>
                  {item.aiReplenishment.confidence}% Confidence
                </Text>
              </View>
            </View>

            <Text style={[styles.aiActionText, { color: theme.accent }]}>
              Recommended: {item.aiReplenishment.action}
            </Text>

            <View style={styles.aiDetailGrid}>
              <View style={styles.aiDetailItem}>
                <Text style={[styles.aiDetailLabel, { color: theme.textSecondary }]}>Suggested Qty</Text>
                <Text style={[styles.aiDetailValue, { color: theme.text }]}>{item.aiReplenishment.quantity} units</Text>
              </View>
              <View style={styles.aiDetailItem}>
                <Text style={[styles.aiDetailLabel, { color: theme.textSecondary }]}>Target Supplier</Text>
                <Text style={[styles.aiDetailValue, { color: theme.text }]}>{item.aiReplenishment.recommendedSupplier}</Text>
              </View>
              <View style={styles.aiDetailItem}>
                <Text style={[styles.aiDetailLabel, { color: theme.textSecondary }]}>Expected Arrival</Text>
                <Text style={[styles.aiDetailValue, { color: theme.text }]}>{item.aiReplenishment.expectedArrivalDays} Days</Text>
              </View>
            </View>

            <Text style={[styles.aiReasonText, { color: theme.textSecondary }]}>
              {`"${item.aiReplenishment.reasoning}"`}
            </Text>

            <View style={styles.mockBadgeRow}>
              <Text style={styles.mockBadgeText}>MOCK INSIGHT ONLY</Text>
            </View>
          </View>
        )}

        {/* Space at bottom for action bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View style={[styles.bottomActionBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionOrderBtn, { backgroundColor: theme.primary }]}
          onPress={() => handleOpenAction('ORDER')}
          activeOpacity={0.8}>
          <MaterialIcons name="add-shopping-cart" size={18} color="#FFFFFF" />
          <Text style={styles.actionOrderText}>Order Stock</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: theme.border, backgroundColor: theme.background }]}
          onPress={() => handleOpenAction('TRANSFER')}
          activeOpacity={0.7}>
          <MaterialIcons name="swap-horiz" size={18} color={theme.text} />
          <Text style={[styles.actionBtnText, { color: theme.text }]}>Transfer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: theme.warning, backgroundColor: theme.warningBg }]}
          onPress={() => handleOpenAction('EXPEDITE')}
          activeOpacity={0.7}>
          <MaterialIcons name="speed" size={18} color={theme.warning} />
          <Text style={[styles.actionBtnText, { color: theme.warning }]}>Expedite</Text>
        </TouchableOpacity>
      </View>

      {/* Confirmation Modal */}
      <ActionConfirmationModal
        visible={modalVisible}
        actionType={selectedAction}
        productName={item.productName}
        sku={item.sku}
        defaultQuantity={item.aiReplenishment?.quantity || 250}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  headerSubtitle: {
    fontSize: Typography.fontSizes.xs,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: 2,
  },
  productCategory: {
    fontSize: Typography.fontSizes.xs,
  },
  riskBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: Spacing.md,
  },
  grid2x3: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
  },
  metricCell: {
    width: '50%',
    padding: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  metricLabel: {
    fontSize: Typography.fontSizes.xs,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  infoLabel: {
    fontSize: Typography.fontSizes.xs,
  },
  infoValue: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
  },
  aiCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  aiTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    marginLeft: 6,
  },
  confidenceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.semibold,
  },
  aiActionText: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: Spacing.sm,
  },
  aiDetailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  aiDetailItem: {
    flex: 1,
  },
  aiDetailLabel: {
    fontSize: 10,
  },
  aiDetailValue: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
  },
  aiReasonText: {
    fontSize: Typography.fontSizes.xs,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  mockBadgeRow: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  mockBadgeText: {
    fontSize: 9,
    fontWeight: Typography.fontWeights.bold,
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: Spacing.md,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginRight: Spacing.xs,
  },
  actionOrderBtn: {
    flex: 1.4,
    borderWidth: 0,
  },
  actionOrderText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    marginLeft: 6,
  },
  actionBtnText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    marginLeft: 4,
  },
});
