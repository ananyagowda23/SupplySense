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
import { ActivityService } from '@/services/activityService';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function ActivityDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const activity = id ? ActivityService.getActivityById(id) : ActivityService.getActivities()[0];

  if (!activity) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: theme.border }]}>
            <MaterialIcons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Audit Record Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isAI = activity.actor === 'AI Agent' || activity.type === 'AI_RECOMMENDATION';
  const isOverride = activity.type === 'MANUAL_OVERRIDE' || activity.humanDecision === 'MODIFIED';
  const isSimulation = activity.type === 'SIMULATION';

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
            {activity.title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Audit Log ID: {activity.id} • {activity.timestamp}
          </Text>
        </View>

        <View style={[styles.actorBadge, { backgroundColor: isAI ? theme.primaryLight : theme.surfaceSubtle }]}>
          <Text style={[styles.actorBadgeText, { color: isAI ? theme.deepTeal : theme.textSecondary }]}>
            {activity.actor}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Primary Event Context Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
          <View style={styles.cardTypeRow}>
            <Text style={[styles.typeText, { color: theme.primary }]}>{activity.type.replace('_', ' ')}</Text>
            <Text style={[styles.timestampText, { color: theme.textMuted }]}>{activity.timestamp}</Text>
          </View>

          <Text style={[styles.descriptionText, { color: theme.text }]}>{activity.description}</Text>

          {/* Related Entities Grid */}
          {(activity.productName || activity.supplierName || activity.location) && (
            <View style={[styles.entityGrid, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderSubtle }]}>
              {activity.productName && (
                <View style={styles.entityCell}>
                  <Text style={[styles.entityLabel, { color: theme.textSecondary }]}>Related Product</Text>
                  <Text style={[styles.entityVal, { color: theme.text }]}>{activity.productName} ({activity.sku})</Text>
                </View>
              )}
              {activity.location && (
                <View style={styles.entityCell}>
                  <Text style={[styles.entityLabel, { color: theme.textSecondary }]}>Location</Text>
                  <Text style={[styles.entityVal, { color: theme.text }]}>{activity.location}</Text>
                </View>
              )}
              {activity.supplierName && (
                <View style={styles.entityCell}>
                  <Text style={[styles.entityLabel, { color: theme.textSecondary }]}>Supplier Partner</Text>
                  <Text style={[styles.entityVal, { color: theme.text }]}>{activity.supplierName}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* 3. AI Decision Audit Section */}
        {isAI || activity.humanDecision ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
            <View style={styles.auditHeaderRow}>
              <MaterialIcons name="psychology" size={20} color={theme.deepTeal} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>AI Decision Audit Trail</Text>
            </View>

            <View style={[styles.auditBox, { backgroundColor: theme.primaryLight, borderColor: theme.primary + '40' }]}>
              <View style={styles.auditRow}>
                <Text style={[styles.auditLabel, { color: theme.textSecondary }]}>Original AI Recommendation:</Text>
                <Text style={[styles.auditVal, { color: theme.deepTeal }]}>
                  {activity.action ? `${activity.action} ${activity.quantity || ''} units` : activity.originalAiRecommendation || 'Automated optimization'}
                </Text>
              </View>

              {activity.confidence && (
                <View style={styles.auditRow}>
                  <Text style={[styles.auditLabel, { color: theme.textSecondary }]}>Model Confidence:</Text>
                  <Text style={[styles.auditVal, { color: theme.success }]}>{activity.confidence}% Confidence</Text>
                </View>
              )}

              {activity.humanDecision && (
                <View style={styles.auditRow}>
                  <Text style={[styles.auditLabel, { color: theme.textSecondary }]}>Human Decision:</Text>
                  <StatusBadge type="status" value={activity.humanDecision} size="sm" />
                </View>
              )}

              <View style={styles.auditRow}>
                <Text style={[styles.auditLabel, { color: theme.textSecondary }]}>Decision Source:</Text>
                <Text style={[styles.auditVal, { color: theme.text }]}>{activity.actor}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* 4. Manual Override Audit Section */}
        {isOverride ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
            <View style={styles.auditHeaderRow}>
              <MaterialIcons name="edit-attributes" size={20} color={theme.warning} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Operational Override Log</Text>
            </View>

            <View style={styles.overrideItem}>
              <Text style={[styles.overrideLabel, { color: theme.textSecondary }]}>Original AI Suggestion:</Text>
              <Text style={[styles.overrideVal, { color: theme.textMuted }]}>{activity.originalAiRecommendation || 'Standard reorder rule'}</Text>
            </View>

            <View style={styles.overrideItem}>
              <Text style={[styles.overrideLabel, { color: theme.textSecondary }]}>Human Executed Action:</Text>
              <Text style={[styles.overrideVal, { color: theme.warning }]}>{activity.humanAction || 'Modified order parameters'}</Text>
            </View>

            <View style={styles.overrideItem}>
              <Text style={[styles.overrideLabel, { color: theme.textSecondary }]}>Operational Reason for Override:</Text>
              <Text style={[styles.overrideReasonText, { color: theme.text }]}>
                {`"${activity.overrideReason || 'Manual adjustment based on external floor constraints.'}"`}
              </Text>
            </View>
          </View>
        ) : null}

        {/* 5. Simulation Execution Audit Section */}
        {isSimulation && activity.simulationMetrics ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
            <View style={styles.auditHeaderRow}>
              <MaterialIcons name="insights" size={20} color={theme.warning} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Simulation Audit Payload</Text>
            </View>

            <View style={[styles.simMetricsGrid, { backgroundColor: theme.surfaceSubtle }]}>
              <View style={styles.simCell}>
                <Text style={[styles.simLabel, { color: theme.textSecondary }]}>Horizon</Text>
                <Text style={[styles.simVal, { color: theme.text }]}>{activity.simulationMetrics.durationDays} Days</Text>
              </View>

              <View style={styles.simCell}>
                <Text style={[styles.simLabel, { color: theme.textSecondary }]}>Winning Policy</Text>
                <Text style={[styles.simVal, { color: theme.success }]}>{activity.simulationMetrics.winnerPolicy}</Text>
              </View>

              <View style={styles.simCell}>
                <Text style={[styles.simLabel, { color: theme.textSecondary }]}>Service Level</Text>
                <Text style={[styles.simVal, { color: theme.success }]}>{activity.simulationMetrics.serviceLevel}%</Text>
              </View>

              <View style={styles.simCell}>
                <Text style={[styles.simLabel, { color: theme.textSecondary }]}>Projected Profit</Text>
                <Text style={[styles.simVal, { color: theme.deepTeal }]}>₹{(activity.simulationMetrics.projectedProfit / 100000).toFixed(2)}L</Text>
              </View>
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
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  actorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  actorBadgeText: {
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
  cardTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  typeText: {
    fontSize: 11,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: 0.5,
  },
  timestampText: {
    fontSize: Typography.fontSizes.xs,
  },
  descriptionText: {
    fontSize: Typography.fontSizes.sm,
    lineHeight: 20,
    marginVertical: Spacing.xs,
  },
  entityGrid: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  entityCell: {
    marginBottom: 2,
  },
  entityLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.medium,
  },
  entityVal: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    marginTop: 1,
  },
  auditHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  auditBox: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  auditLabel: {
    fontSize: Typography.fontSizes.xs,
  },
  auditVal: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  overrideItem: {
    marginBottom: Spacing.xs,
  },
  overrideLabel: {
    fontSize: 11,
    fontWeight: Typography.fontWeights.medium,
  },
  overrideVal: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    marginTop: 2,
  },
  overrideReasonText: {
    fontSize: Typography.fontSizes.xs,
    fontStyle: 'italic',
    marginTop: 2,
    lineHeight: 18,
  },
  simMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    rowGap: Spacing.xs,
  },
  simCell: {
    width: '50%',
  },
  simLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.medium,
  },
  simVal: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    marginTop: 1,
  },
});
