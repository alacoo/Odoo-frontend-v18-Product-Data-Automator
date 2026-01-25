
export type AppMode = 'demo' | 'live';

export enum ProcessingStep {
  REVIEW = 'REVIEW',
  EXPORT_CONFIG = 'EXPORT_CONFIG'
}

export enum ActiveTab {
  VARIANTS = 'VARIANTS',
  TEMPLATES = 'TEMPLATES',
  ATTRIBUTES = 'ATTRIBUTES',
  UOMS = 'UOMS',
  PRICELISTS = 'PRICELISTS',
  MIGRATION = 'MIGRATION',
  CONNECTION = 'CONNECTION'
}

export interface Attribute {
  name: string;
  value: string;
}

export type OdooTracking = 'none' | 'lot' | 'serial';

export interface ParsedProduct {
  id: string;
  rawInput: string;
  templateName: string;
  defaultCode: string;
  uom: string;
  attributes: Attribute[];
  price?: number;
  standard_price?: number;
  currency?: string;
  multiCurrencyPrices?: { currency: string; price: number }[];
  detailedType: 'product' | 'service' | 'consu';
  tracking: OdooTracking;
  barcode?: string;
  weight?: number;
  sale_ok?: boolean;
  purchase_ok?: boolean;
  qty_available?: number;
  virtual_available?: number;
  categ_name?: string;
  is_favorite?: boolean;
  image?: string;
  allow_variable_dimensions?: boolean;
  price_per_sqm?: number;
  variant_price_per_sqm?: number;
  incomeAccountName?: string;
  incomeAccountId?: number;
}

export interface OdooConfig {
  name?: string;
  url: string;
  db: string;
  username: string;
  password?: string;
  enablePricelists?: boolean;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export interface SyncCapabilities {
  canRead: boolean;
  canWrite: boolean;
  canCreate: boolean;
  canDelete: boolean;
}

export interface AiSuggestion {
  id: string;
  suggestedTemplate: string;
  attributes: { name: string; value: string }[];
}

export interface OdooCurrency {
  id: number;
  name: string;
  symbol: string;
  position: string;
  active: boolean;
  rate: number;
  inverse_rate: number;
}

export interface OdooPricelist {
  id: number;
  name: string;
  currencyId: number;
  currencyName: string;
}

export interface SystemHealthReport {
  status: 'ok' | 'warning' | 'error';
  error?: string;
  odoo_version?: string;
  rest_api_config?: any;
  model_access?: any;
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

export type AttributeCreationMode = 'always' | 'dynamic' | 'no_variant';
export type AttributeDisplayType = 'select' | 'radio' | 'pills';

export interface GlobalAttributeConfig {
  displayType: AttributeDisplayType;
  creationMode: AttributeCreationMode;
}

export interface OdooAttribute {
  id: number;
  name: string;
  display_type: AttributeDisplayType;
  create_variant?: AttributeCreationMode;
}

export interface OdooAttributeValue {
  id: number;
  name: string;
  attribute_id: [number, string];
}

export type MigrationPhase = 'IDLE' | 'ANALYZING' | 'RESOLVING' | 'MIGRATING' | 'PAUSED' | 'DONE';

export interface UomConflict {
  localUom: string;
  resolvedOdooId: number | null;
}

export interface MigrationTask {
  id: string;
  type: 'attribute' | 'value' | 'template';
  name: string;
  data: any;
  status: 'pending' | 'success' | 'failed' | 'skipped';
  error?: string;
  retries: number;
}

export interface MigrationLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: any;
}

export interface MigrationState {
  id: string;
  phase: MigrationPhase;
  progress: number;
  uomConflicts: UomConflict[];
  tasks: MigrationTask[];
  logs: MigrationLog[];
  currentTaskIndex: number;
  lastUpdated: number;
}

export interface OdooExportData {
    attributes: any[];
    attributeValues: any[];
    productTemplates: any[];
    productVariants: any[];
}

export interface DashboardStat {
  label: string;
  value: string | number;
  icon: any;
  color: string;
}
