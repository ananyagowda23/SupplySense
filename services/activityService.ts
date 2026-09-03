import { ActivityItem, ActivityType, ActorSource } from '@/types/supplyChain';
import { API_BASE_URL } from '@/constants/config';

export interface ActivityFilterOptions {
  typeFilter?: 'ALL' | 'AI' | 'INVENTORY' | 'ORDERS' | 'SUPPLIERS' | 'SIMULATION' | 'ALERTS';
  dateFilter?: 'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS';
  searchQuery?: string;
}

export interface ActivitySummaryMetrics {
  todayEvents: number;
  aiDecisions: number;
  alertsCount: number;
  manualActions: number;
}

export const ACTIVITY_TYPE_FILTERS: Array<{ label: string; value: 'ALL' | 'AI' | 'INVENTORY' | 'ORDERS' | 'SUPPLIERS' | 'SIMULATION' | 'ALERTS' }> = [
  { label: 'All', value: 'ALL' },
  { label: 'AI', value: 'AI' },
  { label: 'Inventory', value: 'INVENTORY' },
  { label: 'Orders', value: 'ORDERS' },
  { label: 'Suppliers', value: 'SUPPLIERS' },
  { label: 'Simulation', value: 'SIMULATION' },
  { label: 'Alerts', value: 'ALERTS' },
];

export const DATE_FILTER_OPTIONS: Array<{ label: string; value: 'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' }> = [
  { label: 'All Dates', value: 'ALL' },
  { label: 'Today', value: 'TODAY' },
  { label: 'Yesterday', value: 'YESTERDAY' },
  { label: 'Last 7 Days', value: 'LAST_7_DAYS' },
];

const RAW_ACTIVITIES_DATA: ActivityItem[] = [
  // --- TODAY ---
  {
    id: 'act-101',
    type: 'AI_RECOMMENDATION',
    actor: 'AI Agent',
    title: 'AI Order Recommendation Generated',
    description: 'Hybrid DQN engine generated ORDER recommendation for 250 units of Semiconductor X-400 with 91% confidence score.',
    timestamp: '10 min ago',
    timeGroup: 'TODAY',
    productId: 'prod-101',
    productName: 'Semiconductor X-400',
    sku: 'SEM-1042',
    location: 'Hyderabad DC',
    supplierId: 'sup-101',
    supplierName: 'Silicon Dynamics',
    action: 'ORDER',
    quantity: 250,
    confidence: 91,
    expectedProfitImpact: 18000,
    serviceLevelImpact: 2.4,
  },
  {
    id: 'act-102',
    type: 'ORDER',
    actor: 'Operations',
    title: 'Purchase Order Approved',
    description: 'Operations Manager approved AI order recommendation for 250 units of Semiconductor X-400.',
    timestamp: '12 min ago',
    timeGroup: 'TODAY',
    productId: 'prod-101',
    productName: 'Semiconductor X-400',
    sku: 'SEM-1042',
    location: 'Hyderabad DC',
    supplierId: 'sup-101',
    supplierName: 'Silicon Dynamics',
    action: 'ORDER',
    quantity: 250,
    confidence: 91,
    humanDecision: 'APPROVED',
    originalAiRecommendation: 'ORDER 250 units via Silicon Dynamics',
  },
  {
    id: 'act-103',
    type: 'ALERT',
    actor: 'System',
    title: 'Supply Risk Alert Triggered',
    description: 'Overseas transport delay flagged for Motor Controller shipment SUP-2088 (lead time +2 days).',
    timestamp: '1 hour ago',
    timeGroup: 'TODAY',
    productId: 'prod-102',
    productName: 'Li-Ion Battery Pack 5000mAh',
    sku: 'BAT-2041',
    location: 'Bangalore DC',
    supplierId: 'sup-103',
    supplierName: 'VoltCharge Energy',
  },
  {
    id: 'act-104',
    type: 'SIMULATION',
    actor: 'Simulation Engine',
    title: 'Policy Simulation Completed',
    description: 'Executed 30-day policy simulation comparing RL Agent vs Heuristic vs Manual Ordering. RL Agent won with 98.4% service level.',
    timestamp: '2 hours ago',
    timeGroup: 'TODAY',
    simulationId: 'sim-run-demo',
    simulationMetrics: {
      durationDays: 30,
      policiesEvaluated: ['AI RL-Agent', 'Dynamic Heuristic', 'Manual Ordering'],
      winnerPolicy: 'AI RL-Agent',
      serviceLevel: 98.4,
      projectedProfit: 524000,
      stockoutRate: 0.8,
    },
  },
  {
    id: 'act-105',
    type: 'MANUAL_OVERRIDE',
    actor: 'Operations',
    title: 'AI Quantity Recommendation Override',
    description: 'Operations manager modified recommended order quantity for Corrugated Shipping Box XL from 400 to 250 units.',
    timestamp: '3 hours ago',
    timeGroup: 'TODAY',
    productId: 'prod-106',
    productName: 'Corrugated Shipping Box XL',
    sku: 'PKG-1120',
    location: 'Hyderabad DC',
    humanDecision: 'MODIFIED',
    originalAiRecommendation: 'DISCOUNT 400 units at 15% off',
    humanAction: 'ORDER 250 units at standard unit price',
    overrideReason: 'Existing purchase order PO-10486 already covers projected packaging demand for next fortnight.',
  },

  // --- YESTERDAY ---
  {
    id: 'act-201',
    type: 'TRANSFER',
    actor: 'Operations',
    title: 'Inter-Warehouse Stock Transfer Executed',
    description: 'Dispatched 80 units of Surgical Gloves from Hyderabad DC to Mumbai Hub to resolve low stock alert.',
    timestamp: 'Yesterday, 04:30 PM',
    timeGroup: 'YESTERDAY',
    productId: 'prod-105',
    productName: 'Surgical Glove Box (Pack of 100)',
    sku: 'HLTH-3310',
    location: 'Mumbai Hub',
    action: 'TRANSFER',
    quantity: 80,
    humanDecision: 'APPROVED',
  },
  {
    id: 'act-202',
    type: 'INVENTORY_UPDATE',
    actor: 'System',
    title: 'Safety Stock Threshold Adjusted',
    description: 'System automatically updated safety stock threshold for N95 Respirator Masks from 80 to 100 units based on demand velocity.',
    timestamp: 'Yesterday, 02:15 PM',
    timeGroup: 'YESTERDAY',
    productId: 'prod-111',
    productName: 'N95 Respirator Mask',
    sku: 'HLTH-1022',
    location: 'Chennai DC',
  },
  {
    id: 'act-203',
    type: 'SUPPLIER_UPDATE',
    actor: 'System',
    title: 'Supplier Reliability Rating Updated',
    description: 'Precision Auto Parts reliability score adjusted from 78% to 75% due to Sriperumbudur hub delays.',
    timestamp: 'Yesterday, 11:00 AM',
    timeGroup: 'YESTERDAY',
    supplierId: 'sup-105',
    supplierName: 'Precision Auto Parts',
  },
  {
    id: 'act-204',
    type: 'EXPEDITE',
    actor: 'Operations',
    title: 'Purchase Order Expedite Requested',
    description: 'Upgraded shipping transport for PO-10484 to express air freight to prevent production line stoppage.',
    timestamp: 'Yesterday, 09:15 AM',
    timeGroup: 'YESTERDAY',
    productId: 'prod-102',
    productName: 'Li-Ion Battery Pack',
    sku: 'BAT-2041',
    location: 'Bangalore DC',
    supplierId: 'sup-103',
    action: 'EXPEDITE',
    quantity: 150,
  },

  // --- LAST 7 DAYS ---
  {
    id: 'act-301',
    type: 'DISCOUNT',
    actor: 'Operations',
    title: 'Promotional Inventory Discount Applied',
    description: 'Applied 15% clearance discount on aging stock of Bubble Wrap rolls at Bangalore DC.',
    timestamp: '3 days ago',
    timeGroup: 'LAST_7_DAYS',
    productId: 'prod-112',
    productName: 'Biodegradable Bubble Wrap',
    sku: 'PKG-4011',
    location: 'Bangalore DC',
    action: 'DISCOUNT',
    quantity: 150,
  },
  {
    id: 'act-302',
    type: 'SYSTEM',
    actor: 'System',
    title: 'Automated Demand Forecast Model Retrained',
    description: 'System retrained 30-day demand forecasting model across all 209 active enterprise SKUs.',
    timestamp: '5 days ago',
    timeGroup: 'LAST_7_DAYS',
  },
];

export class ActivityService {
  /**
   * Get filtered chronological activities feed
   */
  static getActivities(options?: ActivityFilterOptions): ActivityItem[] {
    let result = [...RAW_ACTIVITIES_DATA];

    if (!options) return result;

    // Search query filter
    if (options.searchQuery && options.searchQuery.trim().length > 0) {
      const q = options.searchQuery.trim().toLowerCase();
      result = result.filter(
        (act) =>
          act.title.toLowerCase().includes(q) ||
          act.description.toLowerCase().includes(q) ||
          (act.productName && act.productName.toLowerCase().includes(q)) ||
          (act.sku && act.sku.toLowerCase().includes(q)) ||
          (act.supplierName && act.supplierName.toLowerCase().includes(q)) ||
          act.actor.toLowerCase().includes(q)
      );
    }

    // Date filter
    if (options.dateFilter && options.dateFilter !== 'ALL') {
      result = result.filter((act) => act.timeGroup === options.dateFilter);
    }

    // Activity type filter
    if (options.typeFilter && options.typeFilter !== 'ALL') {
      switch (options.typeFilter) {
        case 'AI':
          result = result.filter((act) => act.type === 'AI_RECOMMENDATION' || act.actor === 'AI Agent');
          break;
        case 'INVENTORY':
          result = result.filter((act) => act.type === 'INVENTORY_UPDATE' || act.type === 'TRANSFER');
          break;
        case 'ORDERS':
          result = result.filter((act) => act.type === 'ORDER' || act.type === 'EXPEDITE');
          break;
        case 'SUPPLIERS':
          result = result.filter((act) => act.type === 'SUPPLIER_UPDATE');
          break;
        case 'SIMULATION':
          result = result.filter((act) => act.type === 'SIMULATION');
          break;
        case 'ALERTS':
          result = result.filter((act) => act.type === 'ALERT');
          break;
      }
    }

    return result;
  }

  /**
   * Get single activity item by ID
   */
  static getActivityById(id: string): ActivityItem | undefined {
    return RAW_ACTIVITIES_DATA.find((act) => act.id === id);
  }

  /**
   * Get summary counts for activity dashboard header
   */
  static getActivitySummaryMetrics(): ActivitySummaryMetrics {
    const todayEvents = RAW_ACTIVITIES_DATA.filter((a) => a.timeGroup === 'TODAY').length;
    const aiDecisions = RAW_ACTIVITIES_DATA.filter((a) => a.actor === 'AI Agent' || a.type === 'AI_RECOMMENDATION').length;
    const alertsCount = RAW_ACTIVITIES_DATA.filter((a) => a.type === 'ALERT').length;
    const manualActions = RAW_ACTIVITIES_DATA.filter((a) => a.actor === 'Operations' || a.type === 'MANUAL_OVERRIDE').length;

    return {
      todayEvents,
      aiDecisions,
      alertsCount,
      manualActions,
    };
  }
}
