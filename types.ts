
// Re-export Product Types
export * from './modules/products/types';

export type AttributeDisplayType = 'radio' | 'select' | 'pills';
export type AttributeCreationMode = 'always' | 'dynamic' | 'no_variant';

export interface OdooCurrency {
  id: number;
  name: string;
  symbol: string;
  position: 'after' | 'before';
  active: boolean;
  rate?: number; // Odoo Rate (e.g. 1.0 for base, or 0.xxx)
  inverse_rate?: number; // Calculated (e.g. 530 for USD if Base is YER)
}

export interface OdooAttribute {
    id: number;
    name: string;
    display_type: string;
}

export interface OdooAttributeValue {
    id: number;
    name: string;
    attribute_id: [number, string]; // [id, name]
}

export interface OdooPricelist {
    id: number;
    name: string;
    currencyId: number;
    currencyName: string;
}

export interface GlobalAttributeConfig {
  displayType: AttributeDisplayType;
  creationMode: AttributeCreationMode;
}

export enum ProcessingStep {
  REVIEW = 'REVIEW',
  EXPORT_CONFIG = 'EXPORT_CONFIG',
}

export enum ActiveTab {
  VARIANTS = 'VARIANTS',
  TEMPLATES = 'TEMPLATES',
  ATTRIBUTES = 'ATTRIBUTES',
  UOMS = 'UOMS',
  PRICELISTS = 'PRICELISTS', // Added
  CONNECTION = 'CONNECTION',
  MIGRATION = 'MIGRATION',
}

export type AppMode = 'demo' | 'live';
export type ViewMode = 'list' | 'grid';

export interface DashboardStat {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  bg: string;
  trend?: string;
}

export interface OdooConfig {
  name?: string; // Profile name
  url: string;
  db: string;
  username: string;
  password?: string;
  apiToken?: string;
  enablePricelists?: boolean; // New feature flag
}

// Notification System
export type NotificationType = 'success' | 'error' | 'info';
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
}

export interface OdooExportData {
  attributes: any[];
  attributeValues: any[];
  productTemplates: any[];
  productVariants: any[];
}

// --- System Health & Permissions ---

export interface ModelPermission {
    exists: boolean;
    read: boolean;
    write: boolean;
    create: boolean;
    unlink: boolean;
}

export interface RestApiConfig {
    get: boolean;
    post: boolean;
    put: boolean;
    delete: boolean;
}

export interface SystemHealthReport {
    status: 'success' | 'error' | 'warning';
    backend_version?: string;
    odoo_version?: string;
    rest_api_config?: Record<string, RestApiConfig>;
    model_access?: Record<string, ModelPermission>;
    user_groups?: Record<string, boolean>;
    error?: string; // If the check itself fails
}

export interface SyncIssue {
    severity: 'critical' | 'warning';
    model: string;
    code: string;
    message_ar: string;
    message_en: string;
    action?: string;
    impact?: string;
}

export interface SyncCapabilities {
    canRead: boolean;
    canWrite: boolean;
    canCreate: boolean;
    canDelete: boolean;
}

export interface PreCheckResult {
    canSync: boolean;
    capabilities: SyncCapabilities;
    criticalIssues: SyncIssue[];
    warnings: SyncIssue[];
    summary: {
        total_issues: number;
        critical_count: number;
        warning_count: number;
    };
}

// --- Migration State Machine Types ---

export type MigrationPhase = 'IDLE' | 'ANALYZING' | 'RESOLVING' | 'MIGRATING' | 'PAUSED' | 'DONE';

export type TaskStatus = 'pending' | 'success' | 'failed' | 'skipped';

export interface MigrationLog {
    timestamp: number;
    level: 'info' | 'warn' | 'error' | 'success';
    message: string;
    details?: any;
}

export interface UomConflict {
    localUom: string;
    resolvedOdooId: number | null; // null means not resolved yet
}

export interface MigrationTask {
    id: string;
    type: 'attribute' | 'value' | 'template' | 'variant_update';
    name: string;
    data: any;
    status: TaskStatus;
    error?: string;
    retries: number;
}

export interface MigrationState {
    id: string; // Session ID
    phase: MigrationPhase;
    progress: number;
    uomConflicts: UomConflict[];
    tasks: MigrationTask[];
    logs: MigrationLog[];
    currentTaskIndex: number;
    lastUpdated: number;
}

export interface AiSuggestion {
    id: string;
    suggestedTemplate: string;
    attributes: {
        name: string;
        value: string;
    }[];
}
