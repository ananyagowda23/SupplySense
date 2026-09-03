import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Recommendation } from '@/types/supplyChain';
import { StatusBadge } from './StatusBadge';

interface AIRecommendationCardProps {
  recommendation: Recommendation;
  onPressDetails?: (recommendation: Recommendation) => void;
}

export function AIRecommendationCard({
  recommendation,
  onPressDetails,
}: AIRecommendationCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1800,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Format currency in Indian Rupees format (e.g. +₹42,000)
  const formattedProfitImpact = `+₹${recommendation.expectedProfitImpact.toLocaleString('en-IN')}`;

  const borderColor = pulseAnim.interpolate({
    inputRange: [0.4, 1],
    outputRange: [theme.border, theme.primary + '80'],
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: borderColor,
        },
        Shadows.card,
      ]}>
      {/* Top Header Row: Product Name & Action Badge */}
      <View style={styles.topRow}>
        <View style={styles.productGroup}>
          <Text style={[styles.productName, { color: theme.text }]} numberOfLines={1}>
            {recommendation.productName}
          </Text>
          {recommendation.supplier && (
            <View style={styles.supplierRow}>
              <MaterialIcons name="storefront" size={12} color={theme.textMuted} />
              <Text style={[styles.supplierText, { color: theme.textMuted }]} numberOfLines={1}>
                {recommendation.supplier}
              </Text>
            </View>
          )}
        </View>

        <StatusBadge type="action" value={recommendation.action} />
      </View>

      {/* Details Grid */}
      <View style={[styles.detailsGrid, { backgroundColor: theme.surfaceSubtle }]}>
        {/* Quantity or Amount */}
        <View style={styles.gridItem}>
          <Text style={[styles.gridLabel, { color: theme.textMuted }]}>
            {recommendation.action === 'DISCOUNT' ? 'Discount Rate' : 'Quantity'}
          </Text>
          <Text style={[styles.gridValue, { color: theme.text }]}>
            {recommendation.action === 'DISCOUNT' && recommendation.discountPercentage
              ? `${recommendation.discountPercentage}%`
              : `${recommendation.quantity} units`}
          </Text>
        </View>

        {/* AI Confidence */}
        <View style={styles.gridItem}>
          <Text style={[styles.gridLabel, { color: theme.textMuted }]}>Confidence</Text>
          <View style={styles.confidenceRow}>
            <MaterialIcons name="auto-awesome" size={12} color={theme.aiAccent} />
            <Text style={[styles.gridValue, { color: theme.aiAccent }]}>
              {recommendation.confidence}%
            </Text>
          </View>
        </View>

        {/* Expected Impact */}
        <View style={styles.gridItem}>
          <Text style={[styles.gridLabel, { color: theme.textMuted }]}>Expected Profit Impact</Text>
          <Text style={[styles.gridValue, { color: theme.success }]}>
            {formattedProfitImpact}
          </Text>
        </View>

        {/* Risk Level */}
        <View style={styles.gridItem}>
          <Text style={[styles.gridLabel, { color: theme.textMuted }]}>Risk Level</Text>
          <StatusBadge type="risk" value={recommendation.riskLevel} size="sm" />
        </View>
      </View>

      {/* Footer Action Button */}
      <View style={styles.footerRow}>
        <Text numberOfLines={1} style={[styles.reasoningSnippet, { color: theme.textSecondary }]}>
          {recommendation.reasoning}
        </Text>
        <TouchableOpacity
          style={[styles.detailsButton, { backgroundColor: theme.primary }]}
          onPress={() => onPressDetails?.(recommendation)}
          activeOpacity={0.8}
          accessibilityLabel={`View details for ${recommendation.productName}`}>
          <Text style={styles.detailsButtonText}>View Details</Text>
          <MaterialIcons name="arrow-forward" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  productGroup: {
    flex: 1,
  },
  productName: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: -0.3,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  supplierText: {
    fontSize: Typography.fontSizes.xs,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    rowGap: Spacing.sm,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 4,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.medium,
    marginBottom: 2,
  },
  gridValue: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  reasoningSnippet: {
    fontSize: Typography.fontSizes.xs,
    flex: 1,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  detailsButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
});
