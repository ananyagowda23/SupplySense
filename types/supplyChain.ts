export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type ActionType = 'ORDER' | 'TRANSFER' | 'EXPEDITE' | 'DISCOUNT' | 'NO_OP';

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stockLevel: number;
  reorderPoint: number;
  leadTimeDays: number;
  supplierId: string;
  supplierName: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'CRITICAL' | 'SURPLUS';
}

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  location: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityOnOrder: number;
  safetyStock: number;
  reorderPoint: number;
  dailyDemand: number;
  unitCost: number;
  unitPrice: number;
  holdingCostPerUnit: number;
  supplierId: string;
  supplierName: string;
  leadTimeDays: number;
  supplierReliability: number;
  activePurchaseOrders: number;
  riskLevel: RiskLevel;
  stockoutProbability: number;
  estimatedDaysToStockout: number;
  healthStatus: 'HEALTHY' | 'LOW_STOCK' | 'CRITICAL';
  aiReplenishment?: {
    action: ActionType;
    quantity: number;
    recommendedSupplier: string;
    expectedArrivalDays: number;
    confidence: number;
    reasoning: string;
  };
  demandTrend?: DemandInventoryPoint[];
}

export type SupplierType = 'LOCAL' | 'OVERSEAS';

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  productName: string;
  quantity: number;
  orderDate: string;
  expectedArrival: string;
  status: 'IN_TRANSIT' | 'PROCESSING' | 'DELIVERED' | 'DELAYED';
  totalCost: number;
}

export interface Supplier {
  id: string;
  supplierId: string; // e.g. SUP-1024
  name: string;
  supplierType: SupplierType;
  category: string;
  region: string; // e.g. India, East Asia, Europe
  location: string;
  contactEmail: string;
  phone?: string;
  leadTimeDays: number;
  reliabilityScore: number; // 0 - 100
  activeOrdersCount: number;
  riskRating: RiskLevel;

  // RL & Analytics Data Fields
  unitCostAverage: number;
  onTimeDeliveryRate: number; // e.g. 94%
  qualityScore: number; // e.g. 97%
  fillRate: number; // e.g. 98%
  cancellationRate: number; // e.g. 1.5%
  disruptionProbability: number; // e.g. 0.05
  riskFactors: string[];
  recentDisruptions: string[];

  // Mock AI Supplier Recommendation
  aiRecommendation?: {
    preferredSupplierId: string;
    preferredSupplierName: string;
    targetProduct: string;
    leadTimeDeltaDays: number;
    costDiffPercent: number;
    confidence: number;
    reasoning: string;
  };
}

export interface Recommendation {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  location: string;
  action: ActionType; // 'ORDER' | 'TRANSFER' | 'EXPEDITE' | 'DISCOUNT' | 'NO_OP'
  quantity: number;
  discountPercentage?: number;
  supplier?: string;
  supplierId?: string;
  confidence: number; // e.g. 91 (91%)
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  expectedProfitImpact: number; // in INR e.g. 18000
  serviceLevelImpact: number; // e.g. 2.4 (+2.4%)
  expectedStockoutRiskImpact: number; // e.g. -14 (-14%)
  expectedHoldingCostImpact: number; // e.g. -4000 (-₹4,000)
  riskLevel: RiskLevel;
  reasoning: string;
  explainabilityFactors: string[];
  currentStock: number;
  safetyStock: number;
  reorderPoint: number;
  currentDemand: number;
  decisionState?: 'PENDING' | 'APPROVED' | 'MODIFIED' | 'REJECTED';
  decisionDate?: string;
  decisionNotes?: string;
  createdAt: string;
}

export type PolicyType = 'RL_AGENT' | 'HEURISTIC' | 'MANUAL';

export interface SimulationResult {
  id: string;
  runId: string;
  policyName: string;
  policyType: PolicyType;
  description: string;
  durationDays: number;
  skuCount: number;
  locationCount: number;
  serviceLevel: number; // e.g. 98.4
  stockoutRate: number; // e.g. 0.8
  totalHoldingCost: number; // e.g. 142000
  projectedProfit: number; // e.g. 524000
  totalOrders: number;
  totalTransfers: number;
  totalExpedites: number;
  totalDiscounts: number;
  averageReward: number; // e.g. +42.5
  overallScore: number;
  isBestOverall?: boolean;
  runDate: string;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  productId?: string;
  supplierId?: string;
  actionRequired?: string;
}

export type ActivityType =
  | 'AI_RECOMMENDATION'
  | 'ORDER'
  | 'TRANSFER'
  | 'EXPEDITE'
  | 'DISCOUNT'
  | 'SUPPLIER_UPDATE'
  | 'INVENTORY_UPDATE'
  | 'SIMULATION'
  | 'ALERT'
  | 'MANUAL_OVERRIDE'
  | 'SYSTEM';

export type ActorSource = 'AI Agent' | 'Operations' | 'System' | 'Simulation Engine';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  actor: ActorSource;
  title: string;
  description: string;
  timestamp: string;
  timeGroup: 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS';

  // Entity relations
  productId?: string;
  productName?: string;
  sku?: string;
  location?: string;
  supplierId?: string;
  supplierName?: string;
  recommendationId?: string;
  simulationId?: string;

  // Operational payload
  action?: ActionType;
  quantity?: number;
  confidence?: number;
  expectedProfitImpact?: number;
  serviceLevelImpact?: number;

  // AI Decision & Manual Override Audit
  humanDecision?: 'APPROVED' | 'MODIFIED' | 'REJECTED';
  originalAiRecommendation?: string;
  humanAction?: string;
  overrideReason?: string;

  // Simulation Payload
  simulationMetrics?: {
    durationDays: number;
    policiesEvaluated: string[];
    winnerPolicy: string;
    serviceLevel: number;
    projectedProfit: number;
    stockoutRate: number;
  };
}

export interface KPIMetric {
  id: string;
  label: string;
  value: string;
  rawNumericValue: number;
  change: string; // e.g. "+3.2%" or "-1.5%"
  isPositiveTrend: boolean;
  context: string; // e.g. "vs last month"
  icon: string;
}

export interface DemandInventoryPoint {
  day: string; // e.g. "Day 1", "Aug 1"
  demand: number;
  availableInventory: number;
}

export interface InventoryHealthSummary {
  healthyPercent: number;
  lowStockPercent: number;
  criticalPercent: number;
  healthyCount: number;
  lowStockCount: number;
  criticalCount: number;
  totalProducts: number;
}

export interface UserProfile {
  name: string;
  role: string;
  organization: string;
  email: string;
  avatarUrl?: string;
}

export interface WorkspaceSettings {
  organization: string;
  environment: 'Demo' | 'Staging' | 'Production';
  activeLocation: string;
  dataStatus: string;
  lastSynchronized?: string;
}

export interface AIPreferences {
  enableAIRecommendations: boolean;
  requireApprovalBeforeAction: boolean;
  confidenceThreshold: number; // e.g. 80
  riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  supplierStrategy: 'LOWEST_COST' | 'FASTEST_DELIVERY' | 'LOWEST_RISK' | 'BALANCED';
}

export interface NotificationPreferences {
  criticalStockAlerts: boolean;
  aiRecommendations: boolean;
  supplierRiskAlerts: boolean;
  simulationComplete: boolean;
  dailySummary: boolean;
}

export interface SimulationPreferences {
  defaultDurationDays: 7 | 14 | 30 | 60 | 90;
  defaultPolicies: PolicyType[];
  defaultComparisonMetrics: string[];
}
