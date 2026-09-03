import { Supplier, SupplierType, PurchaseOrder, RiskLevel } from '@/types/supplyChain';
import { API_BASE_URL } from '@/constants/config';

export interface SupplierFilterOptions {
  searchQuery?: string;
  supplierType?: 'ALL' | 'LOCAL' | 'OVERSEAS';
  risk?: 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category?: string;
  region?: string;
}

export interface SupplierSummaryMetrics {
  totalSuppliers: number;
  activeSuppliers: number;
  averageReliability: string;
  averageReliabilityNumeric: number;
  activePOs: number;
}

export const SUPPLIER_TYPES: Array<{ label: string; value: 'ALL' | 'LOCAL' | 'OVERSEAS' }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Local', value: 'LOCAL' },
  { label: 'Overseas', value: 'OVERSEAS' },
];

export const SUPPLIER_RISK_OPTIONS = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const SUPPLIER_CATEGORIES = [
  'All',
  'Electronics',
  'Automotive',
  'Healthcare',
  'Grocery',
  'Industrial',
  'Packaging',
];

export const SUPPLIER_REGIONS = [
  'All',
  'India',
  'East Asia',
  'Southeast Asia',
  'Europe',
  'Middle East',
  'North America',
];

const RAW_SUPPLIER_DATA: Supplier[] = [
  {
    id: 'sup-101',
    supplierId: 'SUP-1024',
    name: 'Silicon Dynamics Pvt. Ltd.',
    supplierType: 'LOCAL',
    category: 'Electronics',
    region: 'India',
    location: 'Hyderabad, Telangana',
    contactEmail: 'orders@silicondynamics.in',
    phone: '+91 40 4920 1820',
    leadTimeDays: 4,
    reliabilityScore: 94,
    activeOrdersCount: 8,
    riskRating: 'LOW',
    unitCostAverage: 1200,
    onTimeDeliveryRate: 95,
    qualityScore: 97,
    fillRate: 98,
    cancellationRate: 0.8,
    disruptionProbability: 0.03,
    riskFactors: ['High power grid dependency during summer peak', 'Single manufacturing plant in IDA Uppal'],
    recentDisruptions: ['Minor 1-day port customs delay (June 2026)'],
    aiRecommendation: {
      preferredSupplierId: 'sup-101',
      preferredSupplierName: 'Silicon Dynamics Pvt. Ltd.',
      targetProduct: 'Semiconductor X-400',
      leadTimeDeltaDays: -4,
      costDiffPercent: 8,
      confidence: 92,
      reasoning: 'Although local unit cost is 8% higher than overseas alternatives, the 4-day lead time cuts stockout risk by 74%.',
    },
  },
  {
    id: 'sup-102',
    supplierId: 'SUP-2088',
    name: 'Global Components Ltd.',
    supplierType: 'OVERSEAS',
    category: 'Electronics',
    region: 'East Asia',
    location: 'Hsinchu, Taiwan',
    contactEmail: 'export@globalcomp.tw',
    phone: '+886 3 578 9000',
    leadTimeDays: 14,
    reliabilityScore: 91,
    activeOrdersCount: 12,
    riskRating: 'MEDIUM',
    unitCostAverage: 980,
    onTimeDeliveryRate: 89,
    qualityScore: 98,
    fillRate: 96,
    cancellationRate: 1.5,
    disruptionProbability: 0.12,
    riskFactors: ['Ocean freight route bottleneck', 'Typhoon season shipping delays'],
    recentDisruptions: ['Typhoon shipping detour (+3 days, July 2026)'],
    aiRecommendation: {
      preferredSupplierId: 'sup-101',
      preferredSupplierName: 'Silicon Dynamics',
      targetProduct: 'Semiconductor X-400',
      leadTimeDeltaDays: -10,
      costDiffPercent: 12,
      confidence: 88,
      reasoning: 'Switching 30% volume to Local supplier mitigates overseas shipping bottleneck risks during peak Q3.',
    },
  },
  {
    id: 'sup-103',
    supplierId: 'SUP-3012',
    name: 'VoltCharge Energy Corp',
    supplierType: 'LOCAL',
    category: 'Electronics',
    region: 'India',
    location: 'Bangalore, Karnataka',
    contactEmail: 'b2b@voltcharge.co.in',
    phone: '+91 80 2839 4011',
    leadTimeDays: 5,
    reliabilityScore: 82,
    activeOrdersCount: 5,
    riskRating: 'HIGH',
    unitCostAverage: 850,
    onTimeDeliveryRate: 80,
    qualityScore: 92,
    fillRate: 88,
    cancellationRate: 3.2,
    disruptionProbability: 0.22,
    riskFactors: ['Raw material lithium cell shortage', 'Labor strike risk at Peenya plant'],
    recentDisruptions: ['Component supply shortage delay (+5 days, May 2026)'],
  },
  {
    id: 'sup-104',
    supplierId: 'SUP-4091',
    name: 'Apex Computing Components',
    supplierType: 'OVERSEAS',
    category: 'Electronics',
    region: 'North America',
    location: 'Austin, TX, USA',
    contactEmail: 'supply@apexcomp.com',
    phone: '+1 512 809 1100',
    leadTimeDays: 8,
    reliabilityScore: 97,
    activeOrdersCount: 6,
    riskRating: 'LOW',
    unitCostAverage: 48000,
    onTimeDeliveryRate: 98,
    qualityScore: 99,
    fillRate: 99,
    cancellationRate: 0.2,
    disruptionProbability: 0.02,
    riskFactors: ['Air cargo tariff fluctuations'],
    recentDisruptions: ['None in last 12 months'],
  },
  {
    id: 'sup-105',
    supplierId: 'SUP-5102',
    name: 'Precision Auto Parts Pvt Ltd',
    supplierType: 'LOCAL',
    category: 'Automotive',
    region: 'India',
    location: 'Chennai, Tamil Nadu',
    contactEmail: 'sales@precisionauto.in',
    phone: '+91 44 2430 9081',
    leadTimeDays: 6,
    reliabilityScore: 75,
    activeOrdersCount: 4,
    riskRating: 'HIGH',
    unitCostAverage: 1400,
    onTimeDeliveryRate: 72,
    qualityScore: 88,
    fillRate: 82,
    cancellationRate: 4.5,
    disruptionProbability: 0.28,
    riskFactors: ['Monsoon flooding in Sriperumbudur hub', 'Steel raw material cost volatility'],
    recentDisruptions: ['Factory maintenance shutdown (+4 days, July 2026)'],
  },
  {
    id: 'sup-106',
    supplierId: 'SUP-6033',
    name: 'MedTech Supplies India',
    supplierType: 'LOCAL',
    category: 'Healthcare',
    region: 'India',
    location: 'Mumbai, Maharashtra',
    contactEmail: 'contact@medtechsupplies.in',
    phone: '+91 22 6120 4400',
    leadTimeDays: 3,
    reliabilityScore: 91,
    activeOrdersCount: 7,
    riskRating: 'MEDIUM',
    unitCostAverage: 350,
    onTimeDeliveryRate: 92,
    qualityScore: 96,
    fillRate: 94,
    cancellationRate: 1.1,
    disruptionProbability: 0.08,
    riskFactors: ['High demand volatility in regional healthcare sector'],
    recentDisruptions: ['Customs clearance hold for raw latex (+2 days, April 2026)'],
  },
  {
    id: 'sup-107',
    supplierId: 'SUP-7140',
    name: 'EcoPack India Packaging Ltd',
    supplierType: 'LOCAL',
    category: 'Packaging',
    region: 'India',
    location: 'Hyderabad, Telangana',
    contactEmail: 'sales@ecopack.in',
    phone: '+91 40 2715 8890',
    leadTimeDays: 3,
    reliabilityScore: 98,
    activeOrdersCount: 3,
    riskRating: 'LOW',
    unitCostAverage: 45,
    onTimeDeliveryRate: 99,
    qualityScore: 98,
    fillRate: 100,
    cancellationRate: 0.1,
    disruptionProbability: 0.01,
    riskFactors: ['Minor paper pulp price adjustments'],
    recentDisruptions: ['None'],
  },
  {
    id: 'sup-108',
    supplierId: 'SUP-8201',
    name: 'GreenFields Agriculture Co-op',
    supplierType: 'LOCAL',
    category: 'Grocery',
    region: 'India',
    location: 'Guntur, Andhra Pradesh',
    contactEmail: 'b2b@greenfields.org.in',
    phone: '+91 863 223 9081',
    leadTimeDays: 4,
    reliabilityScore: 89,
    activeOrdersCount: 2,
    riskRating: 'MEDIUM',
    unitCostAverage: 420,
    onTimeDeliveryRate: 88,
    qualityScore: 94,
    fillRate: 91,
    cancellationRate: 2.0,
    disruptionProbability: 0.15,
    riskFactors: ['Monsoon rain impact on harvesting schedule'],
    recentDisruptions: ['Unseasonal rain delay (+3 days, May 2026)'],
  },
  {
    id: 'sup-109',
    supplierId: 'SUP-9330',
    name: 'FluidMotion Systems GmbH',
    supplierType: 'OVERSEAS',
    category: 'Industrial',
    region: 'Europe',
    location: 'Stuttgart, Germany',
    contactEmail: 'export@fluidmotion.de',
    phone: '+49 711 890 2200',
    leadTimeDays: 10,
    reliabilityScore: 96,
    activeOrdersCount: 0,
    riskRating: 'LOW',
    unitCostAverage: 6500,
    onTimeDeliveryRate: 97,
    qualityScore: 99,
    fillRate: 98,
    cancellationRate: 0.3,
    disruptionProbability: 0.04,
    riskFactors: ['Red Sea transit route detour (+4 days)'],
    recentDisruptions: ['Suez Canal maritime congestion (+4 days, March 2026)'],
  },
];

const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po-101',
    poNumber: 'PO-10482',
    supplierId: 'sup-101',
    productName: 'Semiconductor X-400',
    quantity: 250,
    orderDate: '2026-08-04',
    expectedArrival: '2026-08-10',
    status: 'IN_TRANSIT',
    totalCost: 300000,
  },
  {
    id: 'po-102',
    poNumber: 'PO-10483',
    supplierId: 'sup-102',
    productName: 'Display Assembly 15"',
    quantity: 120,
    orderDate: '2026-07-28',
    expectedArrival: '2026-08-14',
    status: 'IN_TRANSIT',
    totalCost: 117600,
  },
  {
    id: 'po-103',
    poNumber: 'PO-10484',
    supplierId: 'sup-103',
    productName: 'Li-Ion Battery Pack 5000mAh',
    quantity: 150,
    orderDate: '2026-08-01',
    expectedArrival: '2026-08-09',
    status: 'PROCESSING',
    totalCost: 127500,
  },
  {
    id: 'po-104',
    poNumber: 'PO-10485',
    supplierId: 'sup-105',
    productName: 'Brake Pad Set Assembly',
    quantity: 100,
    orderDate: '2026-08-02',
    expectedArrival: '2026-08-12',
    status: 'DELAYED',
    totalCost: 140000,
  },
  {
    id: 'po-105',
    poNumber: 'PO-10486',
    supplierId: 'sup-106',
    productName: 'Surgical Glove Box',
    quantity: 500,
    orderDate: '2026-08-05',
    expectedArrival: '2026-08-08',
    status: 'DELIVERED',
    totalCost: 175000,
  },
];

export class SupplierService {
  /**
   * Get all suppliers with optional filtering options
   */
  static getSuppliers(options?: SupplierFilterOptions): Supplier[] {
    let result = [...RAW_SUPPLIER_DATA];

    if (!options) return result;

    // Search query filter (matches name, supplierId, category, region, supplierType)
    if (options.searchQuery && options.searchQuery.trim().length > 0) {
      const q = options.searchQuery.trim().toLowerCase();
      result = result.filter(
        (sup) =>
          sup.name.toLowerCase().includes(q) ||
          sup.supplierId.toLowerCase().includes(q) ||
          sup.category.toLowerCase().includes(q) ||
          sup.region.toLowerCase().includes(q) ||
          sup.supplierType.toLowerCase().includes(q)
      );
    }

    // Supplier Type filter
    if (options.supplierType && options.supplierType !== 'ALL') {
      result = result.filter((sup) => sup.supplierType === options.supplierType);
    }

    // Risk Rating filter
    if (options.risk && options.risk !== 'ALL') {
      result = result.filter((sup) => sup.riskRating === options.risk);
    }

    // Category filter
    if (options.category && options.category !== 'All') {
      result = result.filter(
        (sup) => sup.category.toLowerCase() === options.category?.toLowerCase()
      );
    }

    // Region filter
    if (options.region && options.region !== 'All') {
      result = result.filter(
        (sup) => sup.region.toLowerCase() === options.region?.toLowerCase()
      );
    }

    return result;
  }

  /**
   * Get supplier by ID
   */
  static getSupplierById(id: string): Supplier | undefined {
    return RAW_SUPPLIER_DATA.find((sup) => sup.id === id || sup.supplierId === id);
  }

  /**
   * Get purchase orders for a given supplier
   */
  static getPurchaseOrdersForSupplier(supplierId: string): PurchaseOrder[] {
    return MOCK_PURCHASE_ORDERS.filter(
      (po) => po.supplierId === supplierId || supplierId === 'ALL'
    );
  }

  /**
   * Get summary metrics across the supplier network
   */
  static getSupplierSummary(): SupplierSummaryMetrics {
    const totalSuppliers = 24;
    const activeSuppliers = 19;
    const activePOs = 47;
    const averageReliabilityNumeric = 93.6;

    return {
      totalSuppliers,
      activeSuppliers,
      averageReliability: `${averageReliabilityNumeric}%`,
      averageReliabilityNumeric,
      activePOs,
    };
  }
}
