/**
 * State management module
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";
import type { ScanState, ScannerConfig } from "./types.js";

const STATE_DIR = join(os.homedir(), ".openclaw", "skills-scanner");
const STATE_FILE = join(STATE_DIR, "state.json");

export function loadState(): ScanState {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

export function saveState(s: ScanState): void {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

export function isFirstRun(cfg: ScannerConfig): boolean {
  const state = loadState() as any;

  if (state.configReviewed) {
    return false;
  }

  const isDefaultConfig =
    !cfg.apiUrl &&
    (!cfg.scanDirs || cfg.scanDirs.length === 0) &&
    cfg.behavioral !== true &&
    cfg.useLLM !== true &&
    cfg.policy !== "strict" &&
    cfg.policy !== "permissive" &&
    cfg.preInstallScan !== "off" &&
    cfg.onUnsafe !== "delete" &&
    cfg.onUnsafe !== "warn";

  return isDefaultConfig;
}

export function markConfigReviewed(): void {
  const state = loadState() as any;
  saveState({ ...state, configReviewed: true });
}

export function expandPath(p: string): string {
  return p.replace(/^~/, os.homedir());
}

export function defaultScanDirs(): string[] {
  const dirs = [
    join(os.homedir(), ".openclaw", "skills"),
    join(os.homedir(), ".openclaw", "workspace", "skills"),
  ];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  return dirs;
}

export { STATE_DIR, STATE_FILE };
