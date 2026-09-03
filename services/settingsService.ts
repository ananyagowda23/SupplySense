import {
  UserProfile,
  WorkspaceSettings,
  AIPreferences,
  NotificationPreferences,
  SimulationPreferences,
} from '@/types/supplyChain';
import { API_BASE_URL } from '@/constants/config';

let CURRENT_PROFILE: UserProfile = {
  name: 'Ananya',
  role: 'Supply Chain Operations Lead',
  organization: 'SupplySense Demo',
  email: 'ananya@example.com',
};

let CURRENT_WORKSPACE: WorkspaceSettings = {
  organization: 'SupplySense Demo',
  environment: 'Demo',
  activeLocation: 'Hyderabad DC',
  dataStatus: 'Mock Data',
  lastSynchronized: 'Just now',
};

let CURRENT_AI_PREFS: AIPreferences = {
  enableAIRecommendations: true,
  requireApprovalBeforeAction: true,
  confidenceThreshold: 80,
  riskTolerance: 'MEDIUM',
  supplierStrategy: 'BALANCED',
};

let CURRENT_NOTIF_PREFS: NotificationPreferences = {
  criticalStockAlerts: true,
  aiRecommendations: true,
  supplierRiskAlerts: true,
  simulationComplete: true,
  dailySummary: false,
};

let CURRENT_SIM_PREFS: SimulationPreferences = {
  defaultDurationDays: 30,
  defaultPolicies: ['RL_AGENT', 'HEURISTIC', 'MANUAL'],
  defaultComparisonMetrics: ['Profit', 'Service Level', 'Stockout Rate', 'Holding Cost'],
};

export class SettingsService {
  /**
   * User Profile
   */
  static getUserProfile(): UserProfile {
    return { ...CURRENT_PROFILE };
  }

  static updateUserProfile(updates: Partial<UserProfile>): UserProfile {
    CURRENT_PROFILE = { ...CURRENT_PROFILE, ...updates };
    return CURRENT_PROFILE;
  }

  /**
   * Workspace Settings
   */
  static getWorkspaceSettings(): WorkspaceSettings {
    return { ...CURRENT_WORKSPACE };
  }

  /**
   * AI Preferences
   */
  static getAIPreferences(): AIPreferences {
    return { ...CURRENT_AI_PREFS };
  }

  static updateAIPreferences(updates: Partial<AIPreferences>): AIPreferences {
    CURRENT_AI_PREFS = { ...CURRENT_AI_PREFS, ...updates };
    return CURRENT_AI_PREFS;
  }

  /**
   * Notification Preferences
   */
  static getNotificationPreferences(): NotificationPreferences {
    return { ...CURRENT_NOTIF_PREFS };
  }

  static updateNotificationPreferences(updates: Partial<NotificationPreferences>): NotificationPreferences {
    CURRENT_NOTIF_PREFS = { ...CURRENT_NOTIF_PREFS, ...updates };
    return CURRENT_NOTIF_PREFS;
  }

  /**
   * Simulation Preferences
   */
  static getSimulationPreferences(): SimulationPreferences {
    return { ...CURRENT_SIM_PREFS };
  }

  static updateSimulationPreferences(updates: Partial<SimulationPreferences>): SimulationPreferences {
    CURRENT_SIM_PREFS = { ...CURRENT_SIM_PREFS, ...updates };
    return CURRENT_SIM_PREFS;
  }
}
