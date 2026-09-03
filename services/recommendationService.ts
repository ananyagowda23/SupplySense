import { Recommendation, ActionType } from '@/types/supplyChain';
import { API_BASE_URL } from '@/constants/config';

export interface RecommendationFilterOptions {
  actionFilter?: 'ALL' | 'CRITICAL' | 'ORDER' | 'TRANSFER' | 'EXPEDITE' | 'DISCOUNT' | 'NO_OP';
  sortBy?: 'CONFIDENCE' | 'PRIORITY' | 'IMPACT' | 'RECENT';
}

export interface RecommendationSummaryMetrics {
  activeRecommendations: number;
  criticalActions: number;
  optimizationOpportunity: string;
  optimizationOpportunityNumeric: number;
  averageConfidence: string;
  averageConfidenceNumeric: number;
}

export interface AIDecisionLog {
  id: string;
  recommendationId: string;
  productName: string;
  action: ActionType;
  decision: 'APPROVED' | 'MODIFIED' | 'REJECTED';
  timestamp: string;
  timeAgo: string;
}

export const ACTION_FILTER_OPTIONS: Array<{ label: string; value: 'ALL' | 'CRITICAL' | 'ORDER' | 'TRANSFER' | 'EXPEDITE' | 'DISCOUNT' | 'NO_OP' }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Critical Only', value: 'CRITICAL' },
  { label: 'Order', value: 'ORDER' },
  { label: 'Transfer', value: 'TRANSFER' },
  { label: 'Expedite', value: 'EXPEDITE' },
  { label: 'Discount', value: 'DISCOUNT' },
  { label: 'No Action', value: 'NO_OP' },
];

export const SORT_OPTIONS: Array<{ label: string; value: 'CONFIDENCE' | 'PRIORITY' | 'IMPACT' | 'RECENT' }> = [
  { label: 'Confidence', value: 'CONFIDENCE' },
  { label: 'Priority', value: 'PRIORITY' },
  { label: 'Expected Impact', value: 'IMPACT' },
  { label: 'Most Recent', value: 'RECENT' },
];

let RAW_RECOMMENDATIONS_DATA: Recommendation[] = [
  {
    id: 'rec-001',
    productId: 'prod-101',
    productName: 'Semiconductor X-400',
    sku: 'SEM-1042',
    location: 'Hyderabad DC',
    action: 'ORDER',
    quantity: 250,
    supplier: 'Local Components Pvt. Ltd.',
    supplierId: 'sup-101',
    confidence: 91,
    priority: 'HIGH',
    expectedProfitImpact: 18000,
    serviceLevelImpact: 2.4,
    expectedStockoutRiskImpact: -14,
    expectedHoldingCostImpact: -4000,
    riskLevel: 'LOW',
    reasoning: 'Stock buffer projected to deplete below safety threshold in 4 days due to order velocity spike. Ordering 250 units via Local Supplier restores optimal service level.',
    explainabilityFactors: [
      'Current stock (128 units) is below reorder threshold (100 units)',
      'Order demand velocity increased by 18% over last 7 days',
      'Local supplier lead time (4 days) cuts stockout probability from 48% to 14%',
      'Net expected profit gain of ₹18,000 after holding cost adjustment',
    ],
    currentStock: 128,
    safetyStock: 40,
    reorderPoint: 100,
    currentDemand: 18,
    decisionState: 'PENDING',
    createdAt: '2026-08-09T08:30:00Z',
  },
  {
    id: 'rec-002',
    productId: 'prod-102',
    productName: 'Li-Ion Battery Pack 5000mAh',
    sku: 'BAT-2041',
    location: 'Bangalore DC',
    action: 'EXPEDITE',
    quantity: 150,
    supplier: 'VoltCharge Energy Corp (Express)',
    supplierId: 'sup-103',
    confidence: 95,
    priority: 'CRITICAL',
    expectedProfitImpact: 42000,
    serviceLevelImpact: 4.8,
    expectedStockoutRiskImpact: -32,
    expectedHoldingCostImpact: -1500,
    riskLevel: 'HIGH',
    reasoning: 'High stockout probability within 48 hours. Expediting active purchase order PO-10484 prevents critical line stoppage.',
    explainabilityFactors: [
      'Current stock (32 units) leaves only 2 days of supply remaining',
      'Active PO-10484 is currently delayed by 3 days in processing',
      'Expediting shipment cuts arrival time from 8 days to 3 days',
      'Prevents estimated production loss valued at ₹42,000',
    ],
    currentStock: 32,
    safetyStock: 25,
    reorderPoint: 60,
    currentDemand: 14,
    decisionState: 'PENDING',
    createdAt: '2026-08-09T09:15:00Z',
  },
  {
    id: 'rec-003',
    productId: 'prod-105',
    productName: 'Surgical Glove Box (Pack of 100)',
    sku: 'HLTH-3310',
    location: 'Mumbai Hub',
    action: 'TRANSFER',
    quantity: 80,
    supplier: 'Hyderabad DC (Inter-Warehouse)',
    supplierId: 'sup-106',
    confidence: 93,
    priority: 'HIGH',
    expectedProfitImpact: 14500,
    serviceLevelImpact: 3.1,
    expectedStockoutRiskImpact: -22,
    expectedHoldingCostImpact: -2200,
    riskLevel: 'MEDIUM',
    reasoning: 'Transferring 80 units from surplus stock at Hyderabad DC resolves low stock condition 3 days faster than placing a new supplier order.',
    explainabilityFactors: [
      'Hyderabad DC has 450 units of excess surplus inventory above safety stock',
      'Mumbai Hub stock is projected to reach zero within 3 days',
      'Inter-warehouse transit time is only 24 hours vs 5 days supplier lead time',
      'Saves ₹14,500 in potential stockout penalties',
    ],
    currentStock: 64,
    safetyStock: 50,
    reorderPoint: 80,
    currentDemand: 22,
    decisionState: 'PENDING',
    createdAt: '2026-08-09T07:45:00Z',
  },
  {
    id: 'rec-004',
    productId: 'prod-106',
    productName: 'Corrugated Shipping Box XL',
    sku: 'PKG-1120',
    location: 'Hyderabad DC',
    action: 'DISCOUNT',
    quantity: 400,
    discountPercentage: 15,
    supplier: 'EcoPack India Ltd',
    supplierId: 'sup-107',
    confidence: 88,
    priority: 'MEDIUM',
    expectedProfitImpact: 12000,
    serviceLevelImpact: 0.8,
    expectedStockoutRiskImpact: 0,
    expectedHoldingCostImpact: -6500,
    riskLevel: 'LOW',
    reasoning: 'Apply 15% bulk discount to clear 400 units of aging packaging inventory before warehouse lease space reallocation.',
    explainabilityFactors: [
      'Current inventory (1,450 units) exceeds maximum storage ceiling by 35%',
      'Holding cost accumulation is ₹2 per unit/day on idle stock',
      '15% promotional discount expected to accelerate sales turnover by 2.4x',
      'Frees up 120 sq ft of high-demand warehouse storage space',
    ],
    currentStock: 1450,
    safetyStock: 300,
    reorderPoint: 500,
    currentDemand: 85,
    decisionState: 'PENDING',
    createdAt: '2026-08-09T06:20:00Z',
  },
  {
    id: 'rec-005',
    productId: 'prod-103',
    productName: 'Enterprise Laptop Pro 15',
    sku: 'LAP-9012',
    location: 'Hyderabad Store 1',
    action: 'NO_OP',
    quantity: 0,
    supplier: 'Apex Computing Components',
    supplierId: 'sup-104',
    confidence: 98,
    priority: 'LOW',
    expectedProfitImpact: 0,
    serviceLevelImpact: 0.0,
    expectedStockoutRiskImpact: 0,
    expectedHoldingCostImpact: 0,
    riskLevel: 'LOW',
    reasoning: 'No replenishment or price action required. Current inventory buffer (45 units) is optimal for steady demand forecast.',
    explainabilityFactors: [
      'Stock level (45 units) is safely above reorder point (30 units)',
      'Sales velocity is stable at 5 units/day',
      'Supplier lead time is reliable at 6 days',
      'Zero action minimizes unnecessary working capital commitment',
    ],
    currentStock: 45,
    safetyStock: 15,
    reorderPoint: 30,
    currentDemand: 5,
    decisionState: 'PENDING',
    createdAt: '2026-08-09T10:00:00Z',
  },
  {
    id: 'rec-006',
    productId: 'prod-104',
    productName: 'Industrial Brake Pad Set Assembly',
    sku: 'AUTO-7821',
    location: 'Chennai DC',
    action: 'ORDER',
    quantity: 120,
    supplier: 'Precision Auto Parts',
    supplierId: 'sup-105',
    confidence: 89,
    priority: 'CRITICAL',
    expectedProfitImpact: 28000,
    serviceLevelImpact: 5.2,
    expectedStockoutRiskImpact: -45,
    expectedHoldingCostImpact: -3200,
    riskLevel: 'HIGH',
    reasoning: 'Available stock (18 units) has dropped below safety threshold (20 units). Immediate PO placement prevents automotive line idle time.',
    explainabilityFactors: [
      'Current stock (18 units) is critically low with 10 units reserved',
      'Supplier lead time is 12 days; immediate order needed to bridge gap',
      'Ordering 120 units satisfies 20-day projected automotive assembly demand',
      'Prevents contractual SLA delay penalties of ₹28,000',
    ],
    currentStock: 18,
    safetyStock: 20,
    reorderPoint: 40,
    currentDemand: 6,
    decisionState: 'PENDING',
    createdAt: '2026-08-09T08:10:00Z',
  },
];

let RECENT_AI_DECISIONS: AIDecisionLog[] = [
  {
    id: 'dec-1',
    recommendationId: 'rec-099',
    productName: 'Semiconductor X-400',
    action: 'ORDER',
    decision: 'APPROVED',
    timestamp: '2026-08-09T10:20:00Z',
    timeAgo: '10 min ago',
  },
  {
    id: 'dec-2',
    recommendationId: 'rec-098',
    productName: 'Corrugated Box XL',
    action: 'TRANSFER',
    decision: 'MODIFIED',
    timestamp: '2026-08-09T09:30:00Z',
    timeAgo: '1 hour ago',
  },
  {
    id: 'dec-3',
    recommendationId: 'rec-097',
    productName: '4K IPS Monitor 27"',
    action: 'EXPEDITE',
    decision: 'REJECTED',
    timestamp: '2026-08-09T07:15:00Z',
    timeAgo: '3 hours ago',
  },
];

let IS_FETCHING_RECOMMENDATIONS = false;

export class RecommendationService {
  /**
   * Asynchronously fetch live recommendations from FastAPI backend and update local cache
   */
  static async fetchRecommendations(options?: RecommendationFilterOptions): Promise<Recommendation[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/recommendations`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          RAW_RECOMMENDATIONS_DATA = data;
        }
      }
    } catch (e) {
      // Keep local fallback if offline
    }
    return RecommendationService.getRecommendations(options);
  }

  /**
   * Get filtered recommendations list (synchronous array return)
   */
  static getRecommendations(options?: RecommendationFilterOptions): Recommendation[] {
    // Trigger non-blocking background fetch if not currently fetching
    if (!IS_FETCHING_RECOMMENDATIONS) {
      IS_FETCHING_RECOMMENDATIONS = true;
      RecommendationService.fetchRecommendations().finally(() => {
        IS_FETCHING_RECOMMENDATIONS = false;
      });
    }

    let result = Array.isArray(RAW_RECOMMENDATIONS_DATA) ? [...RAW_RECOMMENDATIONS_DATA] : [];

    if (!options) return result;

    // Action filter
    if (options.actionFilter && options.actionFilter !== 'ALL') {
      if (options.actionFilter === 'CRITICAL') {
        result = result.filter((r) => r.priority === 'CRITICAL');
      } else {
        result = result.filter((r) => r.action === options.actionFilter);
      }
    }

    // Sort by
    if (options.sortBy) {
      switch (options.sortBy) {
        case 'CONFIDENCE':
          result.sort((a, b) => b.confidence - a.confidence);
          break;
        case 'PRIORITY': {
          const priorityWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          result.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);
          break;
        }
        case 'IMPACT':
          result.sort((a, b) => b.expectedProfitImpact - a.expectedProfitImpact);
          break;
        case 'RECENT':
          result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
      }
    }

    return result;
  }

  /**
   * Get single recommendation by ID
   */
  static getRecommendationById(id: string): Recommendation | undefined {
    return RAW_RECOMMENDATIONS_DATA.find((r) => r.id === id);
  }

  /**
   * Submit decision (Approve, Modify, Reject) - validates FastAPI backend POST response before reporting success
   */
  static async submitDecision(
    id: string,
    decision: 'APPROVED' | 'MODIFIED' | 'REJECTED',
    notes?: string
  ): Promise<{ success: boolean; recommendation: Recommendation | undefined; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/recommendations/${id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, decisionNotes: notes }),
      });

      if (!response.ok) {
        return {
          success: false,
          recommendation: undefined,
          message: `Backend error (${response.status}): Could not record decision.`,
        };
      }
    } catch (e) {
      return {
        success: false,
        recommendation: undefined,
        message: 'Network error: Backend server is unreachable.',
      };
    }

    const recIndex = RAW_RECOMMENDATIONS_DATA.findIndex((r) => r.id === id);

    if (recIndex === -1) {
      return { success: false, recommendation: undefined, message: 'Recommendation not found' };
    }

    // Update recommendation decision state
    RAW_RECOMMENDATIONS_DATA[recIndex] = {
      ...RAW_RECOMMENDATIONS_DATA[recIndex],
      decisionState: decision,
      decisionDate: new Date().toISOString(),
      decisionNotes: notes,
    };

    const targetRec = RAW_RECOMMENDATIONS_DATA[recIndex];

    // Prepend to decision log
    const newLog: AIDecisionLog = {
      id: `dec-${Date.now()}`,
      recommendationId: id,
      productName: targetRec.productName,
      action: targetRec.action,
      decision,
      timestamp: new Date().toISOString(),
      timeAgo: 'Just now',
    };
    RECENT_AI_DECISIONS = [newLog, ...RECENT_AI_DECISIONS];

    return {
      success: true,
      recommendation: targetRec,
      message: `Decision recorded (${decision}).`,
    };
  }

  /**
   * Get recent AI decision history log
   */
  static getRecentAIDecisions(): AIDecisionLog[] {
    return RECENT_AI_DECISIONS;
  }

  /**
   * Get AI summary metrics
   */
  static getAISummaryMetrics(): RecommendationSummaryMetrics {
    const activeRecommendations = RAW_RECOMMENDATIONS_DATA.filter(
      (r) => !r.decisionState || r.decisionState === 'PENDING'
    ).length;
    const criticalActions = RAW_RECOMMENDATIONS_DATA.filter((r) => r.priority === 'CRITICAL').length;
    const totalImpact = RAW_RECOMMENDATIONS_DATA.reduce((acc, r) => acc + r.expectedProfitImpact, 0);
    const avgConfidence = Math.round(
      RAW_RECOMMENDATIONS_DATA.reduce((acc, r) => acc + r.confidence, 0) / (RAW_RECOMMENDATIONS_DATA.length || 1)
    );

    return {
      activeRecommendations,
      criticalActions,
      optimizationOpportunity: '₹64K',
      optimizationOpportunityNumeric: totalImpact,
      averageConfidence: `${avgConfidence}%`,
      averageConfidenceNumeric: avgConfidence,
    };
  }
}
