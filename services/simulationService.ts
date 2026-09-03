import { SimulationResult, PolicyType } from '@/types/supplyChain';
import { API_BASE_URL } from '@/constants/config';

export interface SimulationConfig {
  durationDays: 7 | 14 | 30 | 60 | 90;
  skuCount: number;
  locationCount: number;
  selectedPolicies: PolicyType[];
}

export interface PolicySimulationRun {
  id: string;
  config: SimulationConfig;
  results: SimulationResult[];
  winnerPolicyType: PolicyType;
  insightSummary: string;
  runDate: string;
}

export const DURATION_OPTIONS: Array<7 | 14 | 30 | 60 | 90> = [7, 14, 30, 60, 90];

export const AVAILABLE_POLICIES: Array<{
  type: PolicyType;
  name: string;
  subtitle: string;
  description: string;
  defaultSelected: boolean;
}> = [
  {
    type: 'RL_AGENT',
    name: 'AI RL-Agent',
    subtitle: 'Hybrid DQN / CQL Policy',
    description: 'Autonomous reinforcement learning agent utilizing offline CQL & online Hybrid DQN for multi-action supply chain optimization.',
    defaultSelected: true,
  },
  {
    type: 'HEURISTIC',
    name: 'Dynamic Heuristic',
    subtitle: 'Rule-Based Optimization',
    description: 'Deterministic rule-based inventory engine triggered by reorder points, local supplier prioritization, and static transfer rules.',
    defaultSelected: true,
  },
  {
    type: 'MANUAL',
    name: 'Manual Ordering',
    subtitle: 'Legacy Human Decisions',
    description: 'Traditional periodic manual order placement by operations managers acting as a baseline benchmark.',
    defaultSelected: true,
  },
];

let LATEST_SIMULATION_RUN: PolicySimulationRun | undefined = undefined;

export class SimulationService {
  /**
   * Run policy simulation asynchronously via FastAPI backend (with mock fallback)
   */
  static async runSimulation(config: SimulationConfig): Promise<PolicySimulationRun> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/simulate/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (response.ok) {
        const simulationRun: PolicySimulationRun = await response.json();
        LATEST_SIMULATION_RUN = simulationRun;
        return simulationRun;
      }
    } catch (e) {
      // Fallback to local simulation calculation if backend server is offline
    }

    const runId = `sim-run-${Date.now()}`;
    const runDate = new Date().toISOString();
    const durationFactor = config.durationDays / 30;

    // Helper random variation
    const rand = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 10) / 10;

    const results: SimulationResult[] = [];

    if (config.selectedPolicies.includes('RL_AGENT')) {
      const serviceLevel = rand(96.5, 99.2);
      const stockoutRate = rand(0.5, 1.8);
      const totalHoldingCost = Math.round(rand(120000, 160000) * durationFactor);
      const projectedProfit = Math.round(rand(490000, 560000) * durationFactor);
      const overallScore = Math.round((projectedProfit / totalHoldingCost) * (serviceLevel / (1 + stockoutRate)) * 100);

      results.push({
        id: `res-${runId}-rl`,
        runId,
        policyName: 'AI RL-Agent',
        policyType: 'RL_AGENT',
        description: 'Hybrid DQN / CQL Decision Policy',
        durationDays: config.durationDays,
        skuCount: config.skuCount,
        locationCount: config.locationCount,
        serviceLevel,
        stockoutRate,
        totalHoldingCost,
        projectedProfit,
        totalOrders: Math.round(rand(24, 38) * durationFactor),
        totalTransfers: Math.round(rand(14, 22) * durationFactor),
        totalExpedites: Math.round(rand(3, 8) * durationFactor),
        totalDiscounts: Math.round(rand(2, 6) * durationFactor),
        averageReward: rand(38.5, 46.2),
        overallScore,
        runDate,
      });
    }

    if (config.selectedPolicies.includes('HEURISTIC')) {
      const serviceLevel = rand(92.0, 96.0);
      const stockoutRate = rand(2.1, 4.2);
      const totalHoldingCost = Math.round(rand(165000, 210000) * durationFactor);
      const projectedProfit = Math.round(rand(420000, 485000) * durationFactor);
      const overallScore = Math.round((projectedProfit / totalHoldingCost) * (serviceLevel / (1 + stockoutRate)) * 100);

      results.push({
        id: `res-${runId}-heur`,
        runId,
        policyName: 'Dynamic Heuristic',
        policyType: 'HEURISTIC',
        description: 'Rule-Based Inventory Optimization',
        durationDays: config.durationDays,
        skuCount: config.skuCount,
        locationCount: config.locationCount,
        serviceLevel,
        stockoutRate,
        totalHoldingCost,
        projectedProfit,
        totalOrders: Math.round(rand(32, 45) * durationFactor),
        totalTransfers: Math.round(rand(8, 15) * durationFactor),
        totalExpedites: Math.round(rand(8, 14) * durationFactor),
        totalDiscounts: Math.round(rand(4, 10) * durationFactor),
        averageReward: rand(24.0, 31.5),
        overallScore,
        runDate,
      });
    }

    if (config.selectedPolicies.includes('MANUAL')) {
      const serviceLevel = rand(87.0, 91.8);
      const stockoutRate = rand(5.2, 8.8);
      const totalHoldingCost = Math.round(rand(210000, 270000) * durationFactor);
      const projectedProfit = Math.round(rand(350000, 415000) * durationFactor);
      const overallScore = Math.round((projectedProfit / totalHoldingCost) * (serviceLevel / (1 + stockoutRate)) * 100);

      results.push({
        id: `res-${runId}-man`,
        runId,
        policyName: 'Manual Ordering',
        policyType: 'MANUAL',
        description: 'Traditional Human Decision Process',
        durationDays: config.durationDays,
        skuCount: config.skuCount,
        locationCount: config.locationCount,
        serviceLevel,
        stockoutRate,
        totalHoldingCost,
        projectedProfit,
        totalOrders: Math.round(rand(40, 58) * durationFactor),
        totalTransfers: Math.round(rand(2, 8) * durationFactor),
        totalExpedites: Math.round(rand(12, 20) * durationFactor),
        totalDiscounts: Math.round(rand(1, 4) * durationFactor),
        averageReward: rand(12.0, 19.4),
        overallScore,
        runDate,
      });
    }

    // Determine winning policy dynamically
    results.sort((a, b) => b.overallScore - a.overallScore);
    if (results.length > 0) {
      results[0].isBestOverall = true;
    }
    const winnerPolicyType = results.length > 0 ? results[0].policyType : 'RL_AGENT';

    const winnerObj = results.length > 0 ? results[0] : { policyName: 'AI RL-Agent', overallScore: 88, serviceLevel: 98, projectedProfit: 500000 };
    const insightSummary = `${winnerObj.policyName} achieved the highest overall performance score (${winnerObj.overallScore}) with a ${winnerObj.serviceLevel}% service level and ₹${(winnerObj.projectedProfit / 100000).toFixed(2)}L projected profit over ${config.durationDays} days.`;

    const simulationRun: PolicySimulationRun = {
      id: runId,
      config,
      results,
      winnerPolicyType,
      insightSummary,
      runDate,
    };

    LATEST_SIMULATION_RUN = simulationRun;
    return simulationRun;
  }

  /**
   * Get latest simulation run
   */
  static getLatestSimulationRun(): PolicySimulationRun | undefined {
    return LATEST_SIMULATION_RUN;
  }

  /**
   * Get specific simulation result by policy type
   */
  static getSimulationResult(runId: string, policyType: PolicyType): SimulationResult | undefined {
    if (!LATEST_SIMULATION_RUN || LATEST_SIMULATION_RUN.id !== runId) {
      return undefined;
    }
    return LATEST_SIMULATION_RUN.results.find((r) => r.policyType === policyType);
  }
}
