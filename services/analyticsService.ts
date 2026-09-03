import { SimulationService } from './simulationService';
import { SupplierService } from './supplierService';
import { SimulationResult } from '@/types/supplyChain';
import { API_BASE_URL } from '@/constants/config';

export type AnalyticsTimeRange = '7D' | '30D' | '90D' | '1Y';

export interface AnalyticsSummary {
  projectedProfit: string;
  projectedProfitTrend: string;
  serviceLevel: string;
  serviceLevelPrevious: string;
  serviceLevelTarget: string;
  stockoutRate: string;
  stockoutRateTrend: string;
  inventoryValue: string;
  holdingCost: string;
  supplyRisk: string;
}

export interface InventoryPerformanceMetrics {
  turnoverRate: string;
  daysOfInventory: number;
  overstockValue: string;
  understockValue: string;
  healthyPercent: number;
  lowStockPercent: number;
  criticalPercent: number;
}

export interface StockoutRiskAnalytics {
  currentStockoutRate: string;
  productsAtRiskCount: number;
  expectedStockoutsCount: number;
  highRiskProducts: Array<{
    id: string;
    name: string;
    sku: string;
    daysToStockout: number;
    risk: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  }>;
}

export interface SupplierAnalyticsItem {
  id: string;
  name: string;
  supplierId: string;
  reliabilityScore: number;
  onTimeDeliveryRate: number;
  leadTimeDays: number;
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface RiskDistributionMetrics {
  lowPercent: number;
  mediumPercent: number;
  highPercent: number;
  criticalPercent: number;
}

export interface AnalyticsInsight {
  id: string;
  icon: string;
  title: string;
  text: string;
  category: 'SERVICE_LEVEL' | 'STOCKOUT_RISK' | 'SUPPLIER' | 'POLICY';
}

export const TIME_RANGE_OPTIONS: AnalyticsTimeRange[] = ['7D', '30D', '90D', '1Y'];

export class AnalyticsService {
  /**
   * Get Executive Analytics Summary metrics for selected time range (synchronous return with fallback)
   */
  static getAnalyticsSummary(range: AnalyticsTimeRange): AnalyticsSummary {
    const multipliers: Record<AnalyticsTimeRange, { profit: string; profitTrend: string; service: string }> = {
      '7D': { profit: '₹1.28L', profitTrend: '+4.1%', service: '97.8%' },
      '30D': { profit: '₹5.24L', profitTrend: '+8.4%', service: '98.4%' },
      '90D': { profit: '₹14.8L', profitTrend: '+12.1%', service: '98.1%' },
      '1Y': { profit: '₹58.2L', profitTrend: '+15.6%', service: '97.5%' },
    };

    const current = multipliers[range];

    return {
      projectedProfit: current.profit,
      projectedProfitTrend: `${current.profitTrend} vs prev period`,
      serviceLevel: current.service,
      serviceLevelPrevious: '95.7%',
      serviceLevelTarget: '97.0%',
      stockoutRate: '0.8%',
      stockoutRateTrend: '-0.4%',
      inventoryValue: '₹24.6L',
      holdingCost: '₹1.42L',
      supplyRisk: 'Medium',
    };
  }

  /**
   * Get Inventory Performance metrics
   */
  static getInventoryMetrics(range: AnalyticsTimeRange): InventoryPerformanceMetrics {
    const rangeMultiplier = range === '7D' ? 0.25 : range === '30D' ? 1 : range === '90D' ? 2.8 : 11;
    return {
      turnoverRate: '6.8x',
      daysOfInventory: 21,
      overstockValue: `₹${(2.1 * rangeMultiplier).toFixed(1)}L`,
      understockValue: `₹${(8.4 * rangeMultiplier).toFixed(1)}L`,
      healthyPercent: 68,
      lowStockPercent: 21,
      criticalPercent: 11,
    };
  }

  /**
   * Get Stockout Risk Analytics
   */
  static getStockoutRiskAnalytics(): StockoutRiskAnalytics {
    return {
      currentStockoutRate: '0.8%',
      productsAtRiskCount: 12,
      expectedStockoutsCount: 4,
      highRiskProducts: [
        { id: 'inv-101', name: 'Semiconductor X-400', sku: 'SEM-1042', daysToStockout: 4, risk: 'CRITICAL' },
        { id: 'inv-102', name: 'Li-Ion Battery Pack', sku: 'BAT-2041', daysToStockout: 6, risk: 'HIGH' },
        { id: 'inv-109', name: '4K IPS Monitor 27"', sku: 'DISP-5021', daysToStockout: 8, risk: 'MEDIUM' },
      ],
    };
  }

  /**
   * Get Supplier Performance Analytics (uses SupplierService data)
   */
  static getSupplierPerformance(): SupplierAnalyticsItem[] {
    const suppliers = SupplierService.getSuppliers();
    return suppliers.slice(0, 4).map((sup) => ({
      id: sup.id,
      name: sup.name,
      supplierId: sup.supplierId,
      reliabilityScore: sup.reliabilityScore,
      onTimeDeliveryRate: sup.onTimeDeliveryRate,
      leadTimeDays: sup.leadTimeDays,
      riskRating: sup.riskRating as any,
    }));
  }

  /**
   * Get Policy Performance Analytics (shared data from SimulationService)
   */
  static getPolicyPerformance(): SimulationResult[] {
    const run = SimulationService.getLatestSimulationRun();
    if (run && run.results.length > 0) {
      return run.results;
    }

    // Default policy benchmarks if no run executed yet
    return [
      {
        id: 'sim-001',
        runId: 'sim-demo',
        policyName: 'AI RL-Agent',
        policyType: 'RL_AGENT',
        description: 'Hybrid DQN / CQL Policy',
        durationDays: 30,
        skuCount: 209,
        locationCount: 8,
        serviceLevel: 98.4,
        stockoutRate: 0.8,
        totalHoldingCost: 142000,
        projectedProfit: 524000,
        totalOrders: 28,
        totalTransfers: 16,
        totalExpedites: 4,
        totalDiscounts: 3,
        averageReward: 42.5,
        overallScore: 3580,
        isBestOverall: true,
        runDate: 'Today, 11:20 AM',
      },
      {
        id: 'sim-002',
        runId: 'sim-demo',
        policyName: 'Dynamic Heuristic',
        policyType: 'HEURISTIC',
        description: 'Rule-Based Optimization',
        durationDays: 30,
        skuCount: 209,
        locationCount: 8,
        serviceLevel: 94.1,
        stockoutRate: 3.2,
        totalHoldingCost: 189000,
        projectedProfit: 462000,
        totalOrders: 38,
        totalTransfers: 11,
        totalExpedites: 10,
        totalDiscounts: 6,
        averageReward: 28.2,
        overallScore: 2410,
        isBestOverall: false,
        runDate: 'Yesterday, 04:45 PM',
      },
      {
        id: 'sim-003',
        runId: 'sim-demo',
        policyName: 'Manual Ordering',
        policyType: 'MANUAL',
        description: 'Traditional Human Process',
        durationDays: 30,
        skuCount: 209,
        locationCount: 8,
        serviceLevel: 89.5,
        stockoutRate: 7.6,
        totalHoldingCost: 245000,
        projectedProfit: 381000,
        totalOrders: 48,
        totalTransfers: 4,
        totalExpedites: 16,
        totalDiscounts: 2,
        averageReward: 16.4,
        overallScore: 1450,
        isBestOverall: false,
        runDate: '3 days ago',
      },
    ];
  }

  /**
   * Get Risk Distribution metrics
   */
  static getRiskDistribution(): RiskDistributionMetrics {
    return {
      lowPercent: 62,
      mediumPercent: 27,
      highPercent: 9,
      criticalPercent: 2,
    };
  }

  /**
   * Dynamically generate actionable analytics insights
   */
  static getInsights(range: AnalyticsTimeRange): AnalyticsInsight[] {
    const summary = this.getAnalyticsSummary(range);
    return [
      {
        id: 'ins-1',
        icon: 'trending-up',
        title: 'Service Level Performance',
        text: `Service level achieved ${summary.serviceLevel} over the ${range} horizon, exceeding the ${summary.serviceLevelTarget} enterprise target by +1.4%.`,
        category: 'SERVICE_LEVEL',
      },
      {
        id: 'ins-2',
        icon: 'warning',
        title: 'Component Risk Bottleneck',
        text: 'Semiconductor X-400 accounts for 31% of total enterprise stockout risk due to elevated order demand velocity.',
        category: 'STOCKOUT_RISK',
      },
      {
        id: 'ins-3',
        icon: 'verified',
        title: 'Supplier Lead Time Superiority',
        text: 'Local suppliers achieved 6.2% higher on-time delivery (97.4%) and 4-day shorter lead times than overseas partners.',
        category: 'SUPPLIER',
      },
      {
        id: 'ins-4',
        icon: 'auto-awesome',
        title: 'RL Policy Holding Cost Savings',
        text: 'The AI RL-Agent policy reduced expected stockout penalty costs by ₹18,000 in the latest multi-objective simulation run.',
        category: 'POLICY',
      },
    ];
  }
}
