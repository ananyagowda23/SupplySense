import React, { useState, useRef, useEffect } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getKPIMetrics,
  getInventoryHealth,
  getDemandVsInventoryData,
  getAIRecommendations,
  getAlerts,
} from '@/services/mockData';
import { Header } from '@/components/ui/Header';
import { KPICard } from '@/components/ui/KPICard';
import { InventoryHealthCard } from '@/components/ui/InventoryHealthCard';
import { DemandVsInventoryChart } from '@/components/ui/DemandVsInventoryChart';
import { AIRecommendationCard } from '@/components/ui/AIRecommendationCard';
import { AlertCard } from '@/components/ui/AlertCard';
import { QuickActionButton } from '@/components/ui/QuickActionButton';
import { Recommendation, Alert } from '@/types/supplyChain';

export default function DashboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const kpis = getKPIMetrics();
  const inventoryHealth = getInventoryHealth();
  const demandVsInventory = getDemandVsInventoryData();
  const aiRecommendations = getAIRecommendations();
  const alerts = getAlerts();

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  const handleRecommendationPress = (rec: Recommendation) => {
    router.push({
      pathname: '/recommendation-detail' as any,
      params: { id: rec.id },
    });
  };

  const handleAlertPress = (alertItem: Alert) => {
    if (alertItem.severity === 'CRITICAL') {
      router.push('/ai' as any);
    } else if (alertItem.severity === 'WARNING') {
      router.push('/suppliers' as any);
    } else {
      router.push('/activity' as any);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }>
          {/* Top Header */}
          <Header
            unreadCount={alerts.length}
            onNotificationPress={() => router.push('/activity' as any)}
            onProfilePress={() => router.push('/settings' as any)}
          />

          <View style={styles.body}>
          {/* KPI Metrics Grid (2x2) */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Executive Metrics</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
              Real-time KPIs
            </Text>
          </View>
          <View style={styles.kpiGrid}>
            {kpis.map((metric) => (
              <KPICard key={metric.id} metric={metric} />
            ))}
          </View>

          {/* Quick Actions Bar */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
          </View>
          <View style={styles.quickActionsGrid}>
            <QuickActionButton
              label="Add Product"
              icon="add-box"
              color={theme.accent}
              onPress={() => router.push('/products' as any)}
            />
            <QuickActionButton
              label="Add Supplier"
              icon="domain-add"
              color={theme.success}
              onPress={() => router.push('/suppliers' as any)}
            />
            <QuickActionButton
              label="Run Sim"
              icon="play-circle-outline"
              color={theme.warning}
              onPress={() => router.push('/simulation' as any)}
            />
            <QuickActionButton
              label="AI Insights"
              icon="auto-awesome"
              color={theme.primary}
              onPress={() => router.push('/ai' as any)}
            />
          </View>

          {/* Inventory Health Card */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Stock Breakdown</Text>
          </View>
          <InventoryHealthCard data={inventoryHealth} />

          {/* Demand vs Inventory Chart */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Demand & Capacity</Text>
          </View>
          <DemandVsInventoryChart data={demandVsInventory} />

          {/* AI Recommendations Section */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.titleWithIcon}>
              <MaterialIcons name="auto-awesome" size={20} color={theme.aiAccent} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>AI Recommendations</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/ai' as any)}>
              <Text style={[styles.viewAllText, { color: theme.aiAccent }]}>View All ({aiRecommendations.length})</Text>
            </TouchableOpacity>
          </View>

          {aiRecommendations.map((rec) => (
            <AIRecommendationCard
              key={rec.id}
              recommendation={rec}
              onPressDetails={handleRecommendationPress}
            />
          ))}

          {/* Supply Chain Alerts */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.titleWithIcon}>
              <MaterialIcons name="notifications-active" size={20} color={theme.danger} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Supply Chain Alerts</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/activity' as any)}>
              <Text style={[styles.viewAllText, { color: theme.accent }]}>Activity Feed</Text>
            </TouchableOpacity>
          </View>

          {alerts.map((alertItem) => (
            <AlertCard
              key={alertItem.id}
              alert={alertItem}
              onPressAlert={handleAlertPress}
            />
          ))}
        </View>
      </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl + 20,
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  sectionHeader: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  viewAllText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: Spacing.xs + 2,
    justifyContent: 'space-between',
  },
});
