export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  organization_name: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  role: string;
  organization_id: string;
  user_id?: string;
  expires_in?: number;
}

export interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  organization_id: string;
  organization_name: string;
  role: string;
  permissions: string[];
  organizations?: OrganizationInfo[];
}

export interface SwitchOrganizationRequest {
  organization_id: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  organization: OrganizationInfo | null;
  role: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}
