import React, { useState } from 'react';
import {
  Alert as RNAlert,
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
import { RecommendationService } from '@/services/recommendationService';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function RecommendationDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const rec = (params.id ? RecommendationService.getRecommendationById(params.id) : undefined) || RecommendationService.getRecommendations()[0];
  const [decisionState, setDecisionState] = useState<'PENDING' | 'APPROVED' | 'MODIFIED' | 'REJECTED'>(rec?.decisionState || 'PENDING');

  if (!rec) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: theme.border }]}>
            <MaterialIcons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Recommendation Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleDecision = async (decision: 'APPROVED' | 'MODIFIED' | 'REJECTED') => {
    const res = await RecommendationService.submitDecision(rec.id, decision);
    if (res.success) {
      setDecisionState(decision);
      RNAlert.alert(
        `Decision: ${decision}`,
        res.message,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      RNAlert.alert('Decision Failed', res.message);
    }
  };

  const confidenceColor =
    rec.confidence >= 85 ? theme.success : rec.confidence >= 70 ? theme.warning : theme.danger;

  const confidenceLabel =
    rec.confidence >= 85 ? 'High Confidence' : rec.confidence >= 70 ? 'Medium Confidence' : 'Low Confidence';

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
          <Text style={[styles.title, { color: theme.darkTeal }]} numberOfLines={1}>
            {rec.productName}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            SKU: {rec.sku} • {rec.location}
          </Text>
        </View>

        <StatusBadge type="priority" value={rec.priority} size="sm" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Action Banner Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
          <View style={styles.aiTagRow}>
            <MaterialIcons name="auto-awesome" size={16} color={theme.deepTeal} />
            <Text style={[styles.aiTagText, { color: theme.deepTeal }]}>HYBRID DQN ACTION RECOMMENDATION</Text>
          </View>

          <View style={[styles.actionHighlightBox, { backgroundColor: theme.primaryLight, borderColor: theme.primary + '40' }]}>
            <Text style={[styles.actionHeadline, { color: theme.deepTeal }]}>
              {rec.action === 'ORDER' && `ORDER ${rec.quantity} UNITS`}
              {rec.action === 'TRANSFER' && `TRANSFER ${rec.quantity} UNITS`}
              {rec.action === 'EXPEDITE' && `EXPEDITE PO SHIPMENT`}
              {rec.action === 'DISCOUNT' && `APPLY ${rec.discountPercentage}% DISCOUNT`}
              {rec.action === 'NO_OP' && `NO ACTION REQUIRED`}
            </Text>
            {rec.supplier && (
              <Text style={[styles.actionSubhead, { color: theme.textSecondary }]}>
                Supplier: <Text style={{ color: theme.text, fontWeight: '600' }}>{rec.supplier}</Text>
              </Text>
            )}
          </View>

          {/* Current Inventory Snapshot Grid */}
          <Text style={[styles.snapshotTitle, { color: theme.textSecondary }]}>Current Inventory Context:</Text>
          <View style={[styles.snapshotGrid, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderSubtle }]}>
            <View style={styles.snapshotCell}>
              <Text style={[styles.snapshotLabel, { color: theme.textSecondary }]}>On Hand</Text>
              <Text style={[styles.snapshotVal, { color: theme.text }]}>{rec.currentStock} units</Text>
            </View>
            <View style={styles.snapshotCell}>
              <Text style={[styles.snapshotLabel, { color: theme.textSecondary }]}>Safety Stock</Text>
              <Text style={[styles.snapshotVal, { color: theme.text }]}>{rec.safetyStock} units</Text>
            </View>
            <View style={styles.snapshotCell}>
              <Text style={[styles.snapshotLabel, { color: theme.textSecondary }]}>Reorder Pt</Text>
              <Text style={[styles.snapshotVal, { color: theme.text }]}>{rec.reorderPoint} units</Text>
            </View>
            <View style={styles.snapshotCell}>
              <Text style={[styles.snapshotLabel, { color: theme.textSecondary }]}>Daily Demand</Text>
              <Text style={[styles.snapshotVal, { color: theme.text }]}>{rec.currentDemand} /day</Text>
            </View>
          </View>
        </View>

        {/* 3. Explainability Section ("Why SupplySense recommends this") */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
          <View style={styles.explainHeaderRow}>
            <MaterialIcons name="psychology" size={20} color={theme.deepTeal} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Why SupplySense recommends this</Text>
          </View>

          <Text style={[styles.explainSummaryText, { color: theme.text }]}>
            {`"${rec.reasoning}"`}
          </Text>

          <Text style={[styles.factorsLabel, { color: theme.textSecondary }]}>Key Operational Drivers:</Text>
          {rec.explainabilityFactors.map((factor, index) => (
            <View key={index} style={styles.factorRow}>
              <MaterialIcons name="check-circle" size={16} color={theme.success} />
              <Text style={[styles.factorText, { color: theme.text }]}>{factor}</Text>
            </View>
          ))}
        </View>

        {/* 4. Confidence Visualization */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
          <View style={styles.confHeaderRow}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Model Confidence</Text>
            <Text style={[styles.confScoreText, { color: confidenceColor }]}>
              {rec.confidence}% ({confidenceLabel})
            </Text>
          </View>

          <View style={[styles.confTrack, { backgroundColor: theme.borderSubtle }]}>
            <View style={[styles.confFill, { width: `${rec.confidence}%`, backgroundColor: confidenceColor }]} />
          </View>
          <Text style={[styles.confSubtext, { color: theme.textMuted }]}>
            Evaluated across 1,000 simulated RL policy runs.
          </Text>
        </View>

        {/* 5. Expected Impact Section */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
          <Text style={[styles.cardTitle, { color: theme.text, marginBottom: Spacing.sm }]}>Projected Operational Impact</Text>

          <View style={styles.impactGrid}>
            <View style={[styles.impactCard, { backgroundColor: theme.successBg, borderColor: theme.successBorder }]}>
              <Text style={[styles.impactCardLabel, { color: theme.success }]}>Service Level</Text>
              <Text style={[styles.impactCardVal, { color: theme.success }]}>+{rec.serviceLevelImpact}%</Text>
            </View>

            <View style={[styles.impactCard, { backgroundColor: theme.primaryLight, borderColor: theme.primary + '30' }]}>
              <Text style={[styles.impactCardLabel, { color: theme.deepTeal }]}>Stockout Risk</Text>
              <Text style={[styles.impactCardVal, { color: theme.deepTeal }]}>{rec.expectedStockoutRiskImpact}%</Text>
            </View>

            <View style={[styles.impactCard, { backgroundColor: theme.successBg, borderColor: theme.successBorder }]}>
              <Text style={[styles.impactCardLabel, { color: theme.success }]}>Projected Profit</Text>
              <Text style={[styles.impactCardVal, { color: theme.success }]}>
                +₹{rec.expectedProfitImpact.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={[styles.impactCard, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
              <Text style={[styles.impactCardLabel, { color: theme.textSecondary }]}>Holding Cost</Text>
              <Text style={[styles.impactCardVal, { color: theme.text }]}>
                -₹{Math.abs(rec.expectedHoldingCostImpact).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* 6. Decision Actions Bar (Approve / Modify / Reject) */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
          <Text style={[styles.cardTitle, { color: theme.text, marginBottom: Spacing.xs }]}>Operations Decision</Text>
          <Text style={[styles.decisionNoteText, { color: theme.textMuted }]}>
            Current State: <Text style={{ color: theme.primary, fontWeight: '700' }}>{decisionState}</Text> • Demo Mode
          </Text>

          <View style={styles.actionBtnRow}>
            <TouchableOpacity
              style={[styles.decisionBtn, { backgroundColor: theme.success }]}
              onPress={() => handleDecision('APPROVED')}
              activeOpacity={0.8}>
              <MaterialIcons name="check" size={18} color="#FFFFFF" />
              <Text style={styles.decisionBtnText}>Approve</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.decisionBtn, { backgroundColor: theme.warning }]}
              onPress={() => handleDecision('MODIFIED')}
              activeOpacity={0.8}>
              <MaterialIcons name="edit" size={18} color="#FFFFFF" />
              <Text style={styles.decisionBtnText}>Modify</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.decisionBtn, { backgroundColor: theme.danger }]}
              onPress={() => handleDecision('REJECTED')}
              activeOpacity={0.8}>
              <MaterialIcons name="close" size={18} color="#FFFFFF" />
              <Text style={styles.decisionBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
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
  aiTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  aiTagText: {
    fontSize: 9,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: 0.5,
  },
  actionHighlightBox: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  actionHeadline: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    textAlign: 'center',
  },
  actionSubhead: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 4,
  },
  snapshotTitle: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  snapshotGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
  },
  snapshotCell: {
    alignItems: 'center',
    flex: 1,
  },
  snapshotLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.medium,
    marginBottom: 2,
  },
  snapshotVal: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  explainHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  cardTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  explainSummaryText: {
    fontSize: Typography.fontSizes.sm,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  factorsLabel: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: Spacing.xs,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  factorText: {
    fontSize: Typography.fontSizes.xs,
    flex: 1,
    lineHeight: 18,
  },
  confHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  confScoreText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  confTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginVertical: 4,
  },
  confFill: {
    height: '100%',
    borderRadius: 5,
  },
  confSubtext: {
    fontSize: 10,
    marginTop: 4,
  },
  impactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  impactCard: {
    width: '48%',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  impactCardLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.medium,
    marginBottom: 2,
  },
  impactCardVal: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  decisionNoteText: {
    fontSize: Typography.fontSizes.xs,
    marginBottom: Spacing.sm,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  decisionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  decisionBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
});
