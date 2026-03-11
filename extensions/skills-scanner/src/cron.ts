/**
 * Cron job management module
 */

import { execSync } from "node:child_process";
import { loadState, saveState } from "./state.js";

const CRON_JOB_NAME = "skills-daily-report";
const CRON_SCHEDULE = "0 8 * * *";
const CRON_TIMEZONE = "Asia/Shanghai";

export async function ensureCronJob(logger: any): Promise<void> {
  const state = loadState() as any;

  logger.info("[skills-scanner] ─────────────────────────────────────");
  logger.info("[skills-scanner] 🕐 Checking cron job...");

  try {
    let jobs: any[] = [];
    try {
      const listResult = execSync("openclaw cron list --format json", {
        encoding: "utf-8",
        timeout: 5000,
      });
      jobs = JSON.parse(listResult.trim());
    } catch (listErr: any) {
      logger.debug("[skills-scanner] JSON format not supported, trying text parsing");
      try {
        const listResult = execSync("openclaw cron list", {
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

    const existingJob = jobs.find(
      (j: any) =>
        j.name === CRON_JOB_NAME ||
        j.jobName === CRON_JOB_NAME ||
        j.id === state.cronJobId
    );

    if (existingJob) {
      const jobId = existingJob.id || existingJob.jobId || state.cronJobId;

      const needsUpdate =
        existingJob.schedule !== CRON_SCHEDULE ||
        existingJob.timezone !== CRON_TIMEZONE;

      if (needsUpdate) {
        logger.info(`[skills-scanner] 🔄 Job config changed, updating...`);
        try {
          execSync(`openclaw cron remove ${jobId}`, {
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

    logger.info("[skills-scanner] 📝 Creating cron job...");

    const cronCmd = [
      "openclaw cron add",
      `--name "${CRON_JOB_NAME}"`,
      `--cron "${CRON_SCHEDULE}"`,
      `--tz "${CRON_TIMEZONE}"`,
      "--session isolated",
      '--message "Please run /skills-scanner scan --report and send results to this channel"',
      "--announce",
    ].join(" ");

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
        `[skills-scanner] 📅 Schedule: Daily at ${CRON_SCHEDULE.split(" ")[1]}:${CRON_SCHEDULE.split(" ")[0]} (${CRON_TIMEZONE})`
      );
    } else {
      logger.info("[skills-scanner] ✅ Job creation command executed");
      logger.debug(`[skills-scanner] Output: ${result.trim()}`);
      saveState({ ...state, cronJobId: "created-unknown-id" });
    }
  } catch (err: any) {
    logger.warn("[skills-scanner] ⚠️  Auto-registration failed");
    logger.debug(`[skills-scanner] Error details: ${err.message}`);

    if (err.message.includes("permission") || err.message.includes("EACCES")) {
      logger.error("[skills-scanner] ❌ Permission denied, please run with admin privileges");
    } else if (
      err.message.includes("command not found") ||
      err.message.includes("ENOENT")
    ) {
      logger.error("[skills-scanner] ❌ openclaw command not found, please check installation");
    } else {
      logger.info("[skills-scanner] 💡 Please manually register cron job:");
      logger.info("[skills-scanner]");
      logger.info("[skills-scanner]   openclaw cron add \\");
      logger.info(`[skills-scanner]     --name "${CRON_JOB_NAME}" \\`);
      logger.info(`[skills-scanner]     --cron "${CRON_SCHEDULE}" \\`);
      logger.info(`[skills-scanner]     --tz "${CRON_TIMEZONE}" \\`);
      logger.info("[skills-scanner]     --session isolated \\");
      logger.info(
        '[skills-scanner]     --message "Please run /skills-scanner scan --report and send results to this channel" \\'
      );
      logger.info("[skills-scanner]     --announce");
      logger.info("[skills-scanner]");
    }
  }
}
