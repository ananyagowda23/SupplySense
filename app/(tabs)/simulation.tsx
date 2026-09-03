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
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  SimulationService,
  AVAILABLE_POLICIES,
  DURATION_OPTIONS,
  PolicySimulationRun,
} from '@/services/simulationService';
import { PolicyType, SimulationResult } from '@/types/supplyChain';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AnimatedMetricValue } from '@/components/ui/AnimatedMetricValue';

export default function SimulationScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Setup state
  const [selectedDuration, setSelectedDuration] = useState<7 | 14 | 30 | 60 | 90>(30);
  const [selectedPolicies, setSelectedPolicies] = useState<PolicyType[]>(['RL_AGENT', 'HEURISTIC', 'MANUAL']);

  // Simulation execution & progress state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0);
  const [currentRun, setCurrentRun] = useState<PolicySimulationRun | undefined>(
    SimulationService.getLatestSimulationRun()
  );

  const simProgressSteps = [
    'Preparing simulation engine...',
    'Loading supply-chain state (209 SKUs)...',
    'Generating demand scenarios...',
    'Evaluating policy runs across 30 days...',
    'Calculating rewards & stockout rates...',
    'Comparing multi-objective metrics...',
    'Simulation complete!',
  ];

  const handleTogglePolicy = (policyType: PolicyType) => {
    if (selectedPolicies.includes(policyType)) {
      if (selectedPolicies.length <= 2) {
        return; // Enforce minimum 2 policies
      }
      setSelectedPolicies(selectedPolicies.filter((p) => p !== policyType));
    } else {
      setSelectedPolicies([...selectedPolicies, policyType]);
    }
  };

  const handleRunSimulation = async () => {
    if (selectedPolicies.length < 2) return;

    setIsSimulating(true);
    setSimStep(0);

    const stepInterval = setInterval(() => {
      setSimStep((prev) => {
        if (prev < simProgressSteps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(stepInterval);
          return prev;
        }
      });
    }, 350);

    setTimeout(async () => {
      const runResult = await SimulationService.runSimulation({
        durationDays: selectedDuration,
        skuCount: 209,
        locationCount: 8,
        selectedPolicies,
      });

      setCurrentRun(runResult);
      setIsSimulating(false);
    }, 2500);
  };

  const handleCardPress = (result: SimulationResult) => {
    router.push({
      pathname: '/simulation-detail' as any,
      params: { runId: result.runId, policyType: result.policyType },
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* 1. Header */}
      <View style={[styles.headerContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.darkTeal }]}>Policy Simulation</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Compare supply-chain strategies before making decisions
        </Text>

        {/* 2. Simulation Setup Controls */}
        <View style={[styles.setupCard, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
          <View style={styles.setupRow}>
            <View style={styles.setupInfoCell}>
              <Text style={[styles.setupLabel, { color: theme.textSecondary }]}>Products</Text>
              <Text style={[styles.setupVal, { color: theme.text }]}>209 SKUs</Text>
            </View>

            <View style={styles.setupInfoCell}>
              <Text style={[styles.setupLabel, { color: theme.textSecondary }]}>Locations</Text>
              <Text style={[styles.setupVal, { color: theme.text }]}>8 Hubs</Text>
            </View>

            <View style={styles.setupInfoCell}>
              <Text style={[styles.setupLabel, { color: theme.textSecondary }]}>Horizon</Text>
              <Text style={[styles.setupVal, { color: theme.deepTeal }]}>{selectedDuration} Days</Text>
            </View>
          </View>

          {/* Duration Selector Pills */}
          <Text style={[styles.durationTitle, { color: theme.textSecondary }]}>Simulation Duration:</Text>
          <View style={styles.durationPillsRow}>
            {DURATION_OPTIONS.map((days) => {
              const isSelected = selectedDuration === days;
              return (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.durationPill,
                    {
                      backgroundColor: isSelected ? theme.primary : theme.surface,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setSelectedDuration(days)}>
                  <Text
                    style={[
                      styles.durationPillText,
                      { color: isSelected ? '#FFFFFF' : theme.textSecondary },
                    ]}>
                    {days}d
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 3. Policy Selection Section */}
        <View style={[styles.sectionBox, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Comparison Policies</Text>
            <Text style={[styles.sectionMinText, { color: theme.textMuted }]}>Min. 2 Required</Text>
          </View>

          {AVAILABLE_POLICIES.map((pol) => {
            const isChecked = selectedPolicies.includes(pol.type);
            return (
              <TouchableOpacity
                key={pol.type}
                style={[
                  styles.policyToggleCard,
                  {
                    backgroundColor: isChecked ? theme.primaryLight : theme.surfaceSubtle,
                    borderColor: isChecked ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => handleTogglePolicy(pol.type)}
                activeOpacity={0.8}>
                <View style={styles.policyToggleTop}>
                  <View style={styles.policyTitleGroup}>
                    <Text style={[styles.policyNameText, { color: isChecked ? theme.darkTeal : theme.text }]}>
                      {pol.name}
                    </Text>
                    <Text style={[styles.policySubtitleText, { color: theme.textSecondary }]}>
                      • {pol.subtitle}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isChecked ? theme.primary : 'transparent',
                        borderColor: isChecked ? theme.primary : theme.border,
                      },
                    ]}>
                    {isChecked && <MaterialIcons name="check" size={14} color="#FFFFFF" />}
                  </View>
                </View>

                <Text style={[styles.policyDescText, { color: theme.textMuted }]}>{pol.description}</Text>
              </TouchableOpacity>
            );
          })}

          {/* Prominent Run Simulation Button */}
          <PrimaryButton
            title={isSimulating ? simProgressSteps[simStep] : '▶ Run Policy Simulation'}
            onPress={handleRunSimulation}
            disabled={isSimulating || selectedPolicies.length < 2}
            size="lg"
            style={{ marginTop: Spacing.sm }}
          />
        </View>

        {/* 4. Multi-Step Simulation Progress Banner */}
        {isSimulating && (
          <View style={[styles.progressBanner, { backgroundColor: theme.surface, borderColor: theme.primary }, Shadows.card]}>
            <View style={styles.progressStepRow}>
              <MaterialIcons name="sync" size={18} color={theme.primary} />
              <Text style={[styles.progressStepText, { color: theme.text }]}>{simProgressSteps[simStep]}</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.borderSubtle }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${((simStep + 1) / simProgressSteps.length) * 100}%`,
                    backgroundColor: theme.primary,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* 5. Simulation Results Section */}
        {currentRun ? (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeaderRow}>
              <Text style={[styles.resultsTitle, { color: theme.text }]}>Simulation Results ({currentRun.config.durationDays} Days)</Text>
              <Text style={[styles.resultsTime, { color: theme.textMuted }]}>Ran {new Date(currentRun.runDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>

            {/* Results Cards List */}
            {currentRun.results.map((result) => {
              const isWinner = result.isBestOverall;

              return (
                <TouchableOpacity
                  key={result.id}
                  style={[
                    styles.resultCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: isWinner ? theme.primary : theme.border,
                      borderWidth: isWinner ? 2 : 1,
                    },
                    Shadows.card,
                  ]}
                  onPress={() => handleCardPress(result)}
                  activeOpacity={0.8}>
                  {/* Card Header & Best Overall Badge */}
                  <View style={styles.resultCardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.winnerBadgeRow}>
                        <Text style={[styles.resultPolicyName, { color: theme.text }]}>{result.policyName}</Text>
                        {isWinner && (
                          <View style={[styles.bestBadge, { backgroundColor: theme.successBg, borderColor: theme.successBorder }]}>
                            <MaterialIcons name="emoji-events" size={12} color={theme.success} />
                            <Text style={[styles.bestBadgeText, { color: theme.success }]}>🏆 Best Overall</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.resultPolicyDesc, { color: theme.textMuted }]}>{result.description}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={theme.primary} />
                  </View>

                  {/* 4 Performance Result Metrics */}
                  <View style={[styles.resultMetricsGrid, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderSubtle }]}>
                    <View style={styles.resMetricCell}>
                      <Text style={[styles.resMetricLabel, { color: theme.textSecondary }]}>Service Level</Text>
                      <AnimatedMetricValue value={`${result.serviceLevel}%`} style={[styles.resMetricVal, { color: theme.success }]} />
                    </View>

                    <View style={styles.resMetricCell}>
                      <Text style={[styles.resMetricLabel, { color: theme.textSecondary }]}>Stockout Rate</Text>
                      <AnimatedMetricValue value={`${result.stockoutRate}%`} style={[styles.resMetricVal, { color: result.stockoutRate > 4 ? theme.danger : theme.text }]} />
                    </View>

                    <View style={styles.resMetricCell}>
                      <Text style={[styles.resMetricLabel, { color: theme.textSecondary }]}>Holding Cost</Text>
                      <AnimatedMetricValue value={`₹${(result.totalHoldingCost / 100000).toFixed(2)}L`} style={[styles.resMetricVal, { color: theme.text }]} />
                    </View>

                    <View style={styles.resMetricCell}>
                      <Text style={[styles.resMetricLabel, { color: theme.textSecondary }]}>Projected Profit</Text>
                      <AnimatedMetricValue value={`₹${(result.projectedProfit / 100000).toFixed(2)}L`} style={[styles.resMetricVal, { color: theme.deepTeal }]} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* 6. Policy Visual Comparison Bar Chart */}
            <View style={[styles.sectionBox, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
              <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: Spacing.xs }]}>Visual Policy Comparison</Text>

              {/* Service Level Comparison Bars */}
              <Text style={[styles.compMetricTitle, { color: theme.textSecondary }]}>Service Level (%)</Text>
              {currentRun.results.map((res) => (
                <View key={`comp-sl-${res.id}`} style={styles.compBarRow}>
                  <Text style={[styles.compBarLabel, { color: theme.text }]} numberOfLines={1}>{res.policyName}</Text>
                  <View style={[styles.compBarTrack, { backgroundColor: theme.borderSubtle }]}>
                    <View style={[styles.compBarFill, { width: `${res.serviceLevel}%`, backgroundColor: res.isBestOverall ? theme.primary : theme.textSecondary }]} />
                  </View>
                  <Text style={[styles.compBarVal, { color: theme.text }]}>{res.serviceLevel}%</Text>
                </View>
              ))}

              {/* Projected Profit Comparison Bars */}
              <Text style={[styles.compMetricTitle, { color: theme.textSecondary, marginTop: Spacing.sm }]}>Projected Profit (INR)</Text>
              {currentRun.results.map((res) => {
                const maxProfit = Math.max(...currentRun.results.map((r) => r.projectedProfit));
                const pct = (res.projectedProfit / maxProfit) * 100;
                return (
                  <View key={`comp-prof-${res.id}`} style={styles.compBarRow}>
                    <Text style={[styles.compBarLabel, { color: theme.text }]} numberOfLines={1}>{res.policyName}</Text>
                    <View style={[styles.compBarTrack, { backgroundColor: theme.borderSubtle }]}>
                      <View style={[styles.compBarFill, { width: `${pct}%`, backgroundColor: res.isBestOverall ? theme.success : theme.deepTeal }]} />
                    </View>
                    <Text style={[styles.compBarVal, { color: theme.text }]}>₹{(res.projectedProfit / 100000).toFixed(1)}L</Text>
                  </View>
                );
              })}
            </View>

            {/* 7. Simulation Insight & Trade-off View */}
            <View style={[styles.sectionBox, { backgroundColor: theme.primaryLight, borderColor: theme.primary + '40' }]}>
              <View style={styles.insightHeaderRow}>
                <MaterialIcons name="lightbulb" size={20} color={theme.deepTeal} />
                <Text style={[styles.insightTitle, { color: theme.darkTeal }]}>Simulation Insight</Text>
              </View>

              <Text style={[styles.insightBodyText, { color: theme.text }]}>{currentRun.insightSummary}</Text>

              <Text style={[styles.tradeOffTitle, { color: theme.darkTeal, marginTop: Spacing.sm }]}>Multi-Objective Trade-offs:</Text>
              <Text style={[styles.tradeOffBody, { color: theme.textSecondary }]}>
                • Optimizing Service Level requires strategic safety stock buffers which slightly increase Holding Costs.
                {'\n'}• Autonomous RL policies balance order frequency and inter-warehouse transfers to maximize Net Profit while protecting against disruption risks.
              </Text>
            </View>
          </View>
        ) : (
          /* Empty State before first simulation run */
          <View style={styles.emptyStateContainer}>
            <MaterialIcons name="insights" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Simulation Results Yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Configure your comparison policies above and tap Run Policy Simulation to benchmark strategies.
            </Text>
          </View>
        )}
      </ScrollView>
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
  title: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  setupCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  setupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  setupInfoCell: {
    alignItems: 'center',
    flex: 1,
  },
  setupLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.medium,
  },
  setupVal: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    marginTop: 2,
  },
  durationTitle: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.medium,
    marginBottom: 4,
  },
  durationPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  durationPill: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  durationPillText: {
    fontSize: 11,
    fontWeight: Typography.fontWeights.bold,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl + 30,
    gap: Spacing.md,
  },
  sectionBox: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  sectionMinText: {
    fontSize: 11,
    fontWeight: Typography.fontWeights.medium,
  },
  policyToggleCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  policyToggleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  policyTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  policyNameText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  policySubtitleText: {
    fontSize: Typography.fontSizes.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyDescText: {
    fontSize: Typography.fontSizes.xs,
    lineHeight: 16,
  },
  progressBanner: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  progressStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  progressStepText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  resultsContainer: {
    gap: Spacing.md,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultsTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  resultsTime: {
    fontSize: Typography.fontSizes.xs,
  },
  resultCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  resultCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  winnerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  resultPolicyName: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: 3,
  },
  bestBadgeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
  },
  resultPolicyDesc: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  resultMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
    rowGap: Spacing.xs,
  },
  resMetricCell: {
    width: '50%',
    paddingHorizontal: 4,
  },
  resMetricLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.medium,
    marginBottom: 2,
  },
  resMetricVal: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  compMetricTitle: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    marginTop: 4,
    marginBottom: 6,
  },
  compBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 6,
  },
  compBarLabel: {
    width: 100,
    fontSize: 11,
    fontWeight: Typography.fontWeights.medium,
  },
  compBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  compBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  compBarVal: {
    width: 50,
    fontSize: 11,
    fontWeight: Typography.fontWeights.bold,
    textAlign: 'right',
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
  insightBodyText: {
    fontSize: Typography.fontSizes.sm,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  tradeOffTitle: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  tradeOffBody: {
    fontSize: Typography.fontSizes.xs,
    lineHeight: 18,
    marginTop: 4,
  },
  emptyStateContainer: {
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
