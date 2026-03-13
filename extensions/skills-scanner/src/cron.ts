/**
 * Cron job management module
 */

import { execSync } from "node:child_process";
import { loadState, saveState } from "./state.js";

const CRON_JOB_NAME = "skills-weekly-report";
const CRON_SCHEDULE = "5 12 * * 1";  // 每周一 12:05
const CRON_TIMEZONE = "Asia/Shanghai";

/**
 * Detect the correct OpenClaw command (openclaw vs npx openclaw)
 */
export function getOpenClawCommand(): string {
  // 1. Check environment variable
  if (process.env.OPENCLAW_CLI_PATH) {
    return process.env.OPENCLAW_CLI_PATH;
  }

  // 2. Check if running via npx
  const argv1 = process.argv[1];
  if (argv1?.includes("npx") || argv1?.includes("_npx")) {
    return "npx openclaw";
  }
  
  if (process.env.npm_execpath?.includes("npx")) {
    return "npx openclaw";
  }

  // 3. Try global openclaw command
  try {
    execSync("openclaw --version", { 
      encoding: "utf-8", 
      timeout: 3000,
      stdio: "pipe" 
    });
    return "openclaw";
  } catch {
    // openclaw command not available
  }

  // 4. Try npx as fallback
  try {
    execSync("npx openclaw --version", { 
      encoding: "utf-8", 
      timeout: 5000,
      stdio: "pipe"
    });
    return "npx openclaw";
  } catch {
    // npx also not available
  }

  // 5. Default to openclaw (will fail with clear error)
  return "openclaw";
}

/**
 * Create cron job via CLI
 */
async function ensureCronJobViaCLI(logger: any): Promise<void> {
  const openclawCmd = getOpenClawCommand();
  logger.info(`[skills-scanner] Using CLI command: ${openclawCmd}`);
  
  // Test if command is available
  try {
    const testResult = execSync(`${openclawCmd} --version`, {
      encoding: "utf-8",
      timeout: 5000,
      stdio: "pipe"
    });
    logger.info(`[skills-scanner] Command test successful: ${testResult.trim()}`);
  } catch (testErr: any) {
    logger.error(`[skills-scanner] ❌ Command not available: ${testErr.message}`);
    logger.info(`[skills-scanner] 💡 Please ensure OpenClaw is installed and accessible`);
    logger.info(`[skills-scanner] 💡 Try running: ${openclawCmd} --version`);
    return;
  }
  
  const state = loadState() as any;

  try {
    let jobs: any[] = [];
    try {
      const listResult = execSync(`${openclawCmd} cron list --format json`, {
        encoding: "utf-8",
        timeout: 5000,
      });
      jobs = JSON.parse(listResult.trim());
    } catch (listErr: any) {
      logger.debug("[skills-scanner] JSON format not supported, trying text parsing");
      try {
        const listResult = execSync(`${openclawCmd} cron list`, {
          encoding: "utf-8",
          timeout: 5000,
        });
        if (listResult.includes(CRON_JOB_NAME)) {
          logger.info(`[skills-scanner] ✅ Found existing job: ${CRON_JOB_NAME}`);
          if (!state.cronJobId) {
            saveState({ ...state, cronJobId: "manual-created" });
          }
          return;
        }
      } catch {
        logger.debug("[skills-scanner] Cannot list cron jobs, may be permission issue");
      }
    }

    // Find all jobs with the same name (to detect duplicates)
    const existingJobs = jobs.filter(
      (j: any) =>
        j.name === CRON_JOB_NAME ||
        j.jobName === CRON_JOB_NAME
    );

    // If multiple jobs exist with the same name, remove duplicates
    if (existingJobs.length > 1) {
      logger.warn(`[skills-scanner] ⚠️  Found ${existingJobs.length} duplicate jobs, cleaning up...`);
      
      // Keep the first one, remove the rest
      for (let i = 1; i < existingJobs.length; i++) {
        const jobId = existingJobs[i].id || existingJobs[i].jobId;
        try {
          execSync(`${openclawCmd} cron remove ${jobId}`, {
            encoding: "utf-8",
            timeout: 5000,
          });
          logger.info(`[skills-scanner] ✅ Removed duplicate job: ${jobId}`);
        } catch (removeErr: any) {
          logger.warn(`[skills-scanner] ⚠️  Failed to remove duplicate job ${jobId}: ${removeErr.message}`);
        }
      }
    }

    // Check if we have an existing job (after cleanup)
    const existingJob = existingJobs.length > 0 ? existingJobs[0] : 
                        jobs.find((j: any) => j.id === state.cronJobId);

    if (existingJob) {
      const jobId = existingJob.id || existingJob.jobId || state.cronJobId;

      const needsUpdate =
        existingJob.schedule !== CRON_SCHEDULE ||
        existingJob.timezone !== CRON_TIMEZONE;

      if (needsUpdate) {
        logger.info(`[skills-scanner] 🔄 Job config changed, updating...`);
        try {
          execSync(`${openclawCmd} cron remove ${jobId}`, {
            encoding: "utf-8",
            timeout: 5000,
          });
          logger.info(`[skills-scanner] ✅ Removed old job: ${jobId}`);
        } catch (removeErr: any) {
          logger.warn(`[skills-scanner] ⚠️  Failed to remove old job: ${removeErr.message}`);
          if (state.cronJobId !== jobId) {
            saveState({ ...state, cronJobId: jobId });
          }
          logger.info(`[skills-scanner] ✅ Keeping existing job: ${jobId}`);
          return;
        }
      } else {
        if (state.cronJobId !== jobId) {
          saveState({ ...state, cronJobId: jobId });
          logger.info(`[skills-scanner] ✅ Found existing job: ${jobId}`);
        } else {
          logger.info(`[skills-scanner] ✅ Job already exists: ${jobId}`);
        }
        return;
      }
    }

    logger.info("[skills-scanner] 📝 Creating cron job via CLI...");

    // Create cron job with --announce and --channel last
    // This will deliver to the last place the agent replied
    const cronCmd = [
      `${openclawCmd} cron add`,
      `--name "${CRON_JOB_NAME}"`,
      `--cron "${CRON_SCHEDULE}"`,
      `--tz "${CRON_TIMEZONE}"`,
      "--session isolated",
      '--message "/skills-scanner scan --report"',
      "--announce",
      "--channel last",
    ].join(" ");

    logger.info(`[skills-scanner] Executing: ${cronCmd}`);

    const result = execSync(cronCmd, { encoding: "utf-8", timeout: 10000 });

    const jobIdMatch =
      result.match(/Job ID[:\s]+([a-zA-Z0-9-]+)/i) ||
      result.match(/jobId[:\s]+([a-zA-Z0-9-]+)/i) ||
      result.match(/id[:\s]+([a-zA-Z0-9-]+)/i);

    if (jobIdMatch) {
      const cronJobId = jobIdMatch[1];
      saveState({ ...state, cronJobId });
      logger.info(`[skills-scanner] ✅ Job created successfully: ${cronJobId}`);
      logger.info(
        `[skills-scanner] 📅 Schedule: Every Monday at 12:05 (${CRON_TIMEZONE})`
      );
      logger.info("[skills-scanner] 📬 Reports will be delivered to the last active channel");
    } else {
      logger.info("[skills-scanner] ✅ Job creation command executed");
      logger.debug(`[skills-scanner] Output: ${result.trim()}`);
      saveState({ ...state, cronJobId: "created-unknown-id" });
    }
  } catch (err: any) {
    logger.warn("[skills-scanner] ⚠️  Auto-registration failed");
    logger.warn(`[skills-scanner] Error: ${err.message || err}`);
    
    // Log stderr if available
    if (err.stderr) {
      logger.warn(`[skills-scanner] stderr: ${err.stderr}`);
    }
    if (err.stdout) {
      logger.warn(`[skills-scanner] stdout: ${err.stdout}`);
    }

    if (err.message.includes("permission") || err.message.includes("EACCES")) {
      logger.error("[skills-scanner] ❌ Permission denied, please run with admin privileges");
    } else if (
      err.message.includes("command not found") ||
      err.message.includes("ENOENT")
    ) {
      logger.error(`[skills-scanner] ❌ ${openclawCmd} command not found, please check installation`);
      logger.info(`[skills-scanner] 💡 Current PATH: ${process.env.PATH}`);
    } else {
      logger.info("[skills-scanner] 💡 Please manually register cron job:");
      logger.info("[skills-scanner]");
      logger.info(`[skills-scanner]   ${openclawCmd} cron add \\`);
      logger.info(`[skills-scanner]     --name "${CRON_JOB_NAME}" \\`);
      logger.info(`[skills-scanner]     --cron "${CRON_SCHEDULE}" \\`);
      logger.info(`[skills-scanner]     --tz "${CRON_TIMEZONE}" \\`);
      logger.info("[skills-scanner]     --session isolated \\");
      logger.info(
        '[skills-scanner]     --message "/skills-scanner scan --report" \\'
      );
      logger.info("[skills-scanner]     --announce \\");
      logger.info("[skills-scanner]     --channel last");
      logger.info("[skills-scanner]");
      logger.info("[skills-scanner] 💡 Or specify a target channel:");
      logger.info("[skills-scanner]     --channel feishu --target chat:<chatId>");
      logger.info("[skills-scanner]");
    }
  }
}

/**
 * Check cron job status and provide setup instructions if needed
 */
export function checkCronJobStatus(logger: any): void {
  const state = loadState() as any;
  
  logger.info("[skills-scanner] ─────────────────────────────────────");
  
  if (state.cronJobId) {
    logger.info(`[skills-scanner] ✅ Cron job registered: ${state.cronJobId}`);
    logger.info("[skills-scanner] 📅 Weekly reports will be sent every Monday at 12:05 (Asia/Shanghai)");
  } else {
    logger.info("[skills-scanner] 💡 Cron job not configured yet");
    logger.info("[skills-scanner]");
    logger.info("[skills-scanner] To enable weekly security reports, run:");
    logger.info("[skills-scanner]");
    logger.info("[skills-scanner]   npx openclaw cron add \\");
    logger.info(`[skills-scanner]     --name "${CRON_JOB_NAME}" \\`);
    logger.info(`[skills-scanner]     --cron "${CRON_SCHEDULE}" \\`);
    logger.info(`[skills-scanner]     --tz "${CRON_TIMEZONE}" \\`);
    logger.info("[skills-scanner]     --session isolated \\");
    logger.info(
      '[skills-scanner]     --message "/skills-scanner scan --report" \\'
    );
    logger.info("[skills-scanner]     --announce \\");
    logger.info("[skills-scanner]     --channel last");
    logger.info("[skills-scanner]");
    logger.info("[skills-scanner] Or use: /skills-scanner cron setup");
  }
  
  logger.info("[skills-scanner] ─────────────────────────────────────");
}

/**
 * Ensure cron job exists via CLI (for manual setup command)
 */
export async function ensureCronJob(logger: any): Promise<void> {
  logger.info("[skills-scanner] 🕐 Setting up cron job...");
  
  await ensureCronJobViaCLI(logger);
}
