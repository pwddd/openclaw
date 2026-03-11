/**
 * Dependency management module
 */

import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { promisify } from "node:util";
import { exec } from "node:child_process";
import { join } from "node:path";

const execAsync = promisify(exec);

export function hasUv(): boolean {
  try {
    execSync("uv --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function isVenvReady(venvPython: string): boolean {
  if (!existsSync(venvPython)) return false;

  try {
    execSync(`"${venvPython}" -c "import requests"`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export async function ensureDeps(
  skillDir: string,
  venvPython: string,
  logger: any
): Promise<boolean> {
  if (isVenvReady(venvPython)) {
    logger.info("[skills-scanner] Python dependencies ready (requests installed)");
    return true;
  }

  if (!hasUv()) {
    logger.warn(
      "[skills-scanner] uv not installed: brew install uv or curl -LsSf https://astral.sh/uv/install.sh | sh"
    );
    return false;
  }

  logger.info("[skills-scanner] Installing Python dependencies...");

  try {
    const venvDir = join(skillDir, ".venv");

    if (existsSync(venvDir)) {
      logger.info("[skills-scanner] Cleaning old virtual environment...");
      rmSync(venvDir, { recursive: true, force: true });
    }

    await execAsync(`uv venv "${venvDir}" --python 3.10`);
    logger.info("[skills-scanner] Virtual environment created");

    logger.info("[skills-scanner] Installing requests...");
    await execAsync(`uv pip install --python "${venvPython}" requests>=2.31.0`);

    execSync(`"${venvPython}" -c "import requests"`, { stdio: "ignore" });
    logger.info("[skills-scanner] ✅ Dependencies installed successfully");
    return true;
  } catch (err: any) {
    logger.error(`[skills-scanner] ⚠️  Dependency installation failed: ${err.message}`);
    return false;
  }
}
