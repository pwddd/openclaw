/**
 * Skills Scanner 类型定义
 */

export interface ScannerConfig {
  apiUrl?: string;
  scanDirs?: string[];
  behavioral?: boolean;
  useLLM?: boolean;
  policy?: "strict" | "balanced" | "permissive";
  preInstallScan?: "on" | "off";
  onUnsafe?: "quarantine" | "delete" | "warn";
  injectSecurityGuidance?: boolean;
}

export interface ScanState {
  lastScanAt?: string;
  lastUnsafeSkills?: string[];
  configReviewed?: boolean;
  cronJobId?: string;
  pendingAlerts?: string[];
}

export interface ScanOptions {
  detailed?: boolean;
  behavioral?: boolean;
  recursive?: boolean;
  jsonOut?: string;
  apiUrl?: string;
  useLLM?: boolean;
  policy?: string;
}

export interface ScanResult {
  exitCode: number;
  output: string;
}

export interface ScanRecord {
  name?: string;
  path?: string;
  is_safe?: boolean;
  error?: string;
  max_severity?: string;
  findings?: number;
}

export type OnUnsafeAction = "quarantine" | "delete" | "warn";
