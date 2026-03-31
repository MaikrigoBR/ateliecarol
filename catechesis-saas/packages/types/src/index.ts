export type Role = 'DEVELOPER' | 'ADMINISTRATOR' | 'TEACHER' | 'STUDENT';

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export type PaymentOwnershipMode = 'TENANT' | 'PLATFORM' | 'HYBRID';

export type ModuleStatus =
  | 'locked'
  | 'available'
  | 'in_progress'
  | 'awaiting_teacher'
  | 'completed';

export interface TenantBranding {
  displayName: string;
  shortName: string;
  primaryColor: string;
  accentColor: string;
  surfaceColor: string;
  heroTone: 'youth' | 'balanced' | 'institutional';
  logoUrl?: string;
}

export interface AudienceProfile {
  ageRangeLabel: string;
  youthFirst: boolean;
  inclusiveForAdults: boolean;
  toneOfVoice: 'gentle' | 'energized' | 'institutional';
  consentMode: 'self_service' | 'guardian_optional' | 'guardian_required';
}

export interface BillingPolicy {
  interval: number;
  intervalUnit: 'month' | 'quarter' | 'semester' | 'year';
  gracePeriodDays: number;
  retryPolicy: number[];
  paymentOwnershipMode: PaymentOwnershipMode;
}

export interface PedagogicalPolicy {
  minimumGrade: number;
  maxAttempts: number;
  releaseMode: 'manual' | 'scheduled' | 'performance_based';
  allowTeacherReopen: boolean;
}

export interface NotificationPolicy {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  whatsappEnabled: boolean;
}

export interface TenantSettings {
  locale: string;
  timezone: string;
  branding: TenantBranding;
  audience: AudienceProfile;
  billing: BillingPolicy;
  pedagogy: PedagogicalPolicy;
  notifications: NotificationPolicy;
}

export interface TenantSummary {
  id: string;
  slug: string;
  schemaName: string;
  status: 'active' | 'paused' | 'archived';
  customDomain?: string;
  paymentMode: PaymentOwnershipMode;
}

export interface CoursePlanSnapshot {
  planId: string;
  title: string;
  billing: BillingPolicy;
  pedagogy: PedagogicalPolicy;
  capturedAt: string;
}

export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  audienceLabel: string;
  moduleCount: number;
  progressLabel?: string;
}

export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  trend: string;
}

export interface UserMembership {
  tenantId: string;
  roles: Role[];
  displayName: string;
}

export interface AuthenticatedUser {
  identityId: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
  roles: Role[];
  globalRoles: string[];
  displayName: string;
}
