/**
 * Dependency management module
 */

import { execSync, exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

function detectPythonCommand(): string | null {
  try {
    execSync("python3 --version", { stdio: "ignore" });
    return "python3";
  } catch {
    try {
      execSync("python --version", { stdio: "ignore" });
      return "python";
    } catch {
      return null;
    }
  }
}

export const getPythonCommand = (): string | null => detectPythonCommand();
export const hasPython = (): boolean => detectPythonCommand() !== null;

export function isRequestsInstalled(pythonCmd: string | null): boolean {
  if (!pythonCmd) return false;
  try {
    execSync(`${pythonCmd} -c "import requests"`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export const isPythonReady = (pythonCmd: string | null): boolean =>
  hasPython() && isRequestsInstalled(pythonCmd);

export async function ensureDeps(pythonCmd: string | null, logger: any): Promise<boolean> {
  const resolvedPython = pythonCmd ?? getPythonCommand();

  if (!resolvedPython) {
    logger.error("[skills-scanner] Python not found. Please install Python 3.10+:");
    logger.error("[skills-scanner]   - macOS: brew install python3");
    logger.error("[skills-scanner]   - Linux: apt-get install python3 python3-pip");
    logger.error("[skills-scanner]   - Windows: https://www.python.org/downloads/");
    return false;
  }

  if (isRequestsInstalled(resolvedPython)) {
    logger.info("[skills-scanner] Python dependencies ready (requests installed)");
    return true;
  }

  logger.info(`[skills-scanner] Installing requests package using ${resolvedPython}...`);

  try {
    await execAsync(`${resolvedPython} -m pip install --user --quiet "requests>=2.31.0"`, {
      timeout: 120000,
    });

    if (isRequestsInstalled(resolvedPython)) {
      logger.info("[skills-scanner] Dependencies installed successfully");
      return true;
    } else {
      throw new Error("requests package not found after installation");
    }
  } catch (err: any) {
    logger.error(`[skills-scanner] Dependency installation failed: ${err.message}`);
    logger.error(`[skills-scanner] Please install manually:`);
    logger.error(`[skills-scanner]   ${resolvedPython} -m pip install --user requests`);
    logger.error(`[skills-scanner] Or with sudo:`);
    logger.error(`[skills-scanner]   sudo ${resolvedPython} -m pip install requests`);
    return false;
  }
}
