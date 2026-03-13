/**
 * OpenClaw Plugin: skills-scanner
 *
 * Security scanner for OpenClaw Skills to detect potential threats.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { join } from "node:path";
import os from "node:os";
import { existsSync } from "node:fs";
import type { ScannerConfig } from "./src/types.js";
import { skillsScannerConfigSchema, generateConfigGuide } from "./src/config.js";
import {
  loadState,
  saveState,
  expandPath,
  defaultScanDirs,
  isFirstRun,
  markConfigReviewed,
} from "./src/state.js";
import { ensureDeps, getPythonCommand, isPythonReady } from "./src/deps.js";
import { runScan } from "./src/scanner.js";
import { buildDailyReport } from "./src/report.js";
import { ensureCronJob, checkCronJobStatus } from "./src/cron.js";
import { startWatcher } from "./src/watcher.js";
import { createCommandHandlers } from "./src/commands.js";
import { SKILLS_SECURITY_GUIDANCE } from "./src/prompt-guidance.js";
import { PROMPT_INJECTION_GUARD } from "./src/prompt-injection-guard.js";
import { HIGH_RISK_OPERATION_GUARD } from "./src/high-risk-operation-guard.js";

// Constants
const PLUGIN_ROOT = process.env.OPENCLAW_PLUGIN_ROOT || __dirname;
const SKILL_DIR = join(PLUGIN_ROOT, "skills", "skills-scanner");
const SCAN_SCRIPT = join(SKILL_DIR, "scan.py");
const STATE_DIR = join(os.homedir(), ".openclaw", "skills-scanner");
const QUARANTINE_DIR = join(STATE_DIR, "quarantine");

const PYTHON_CMD = getPythonCommand();

export default function register(api: OpenClawPluginApi) {
  const cfg: ScannerConfig =
    api.config?.plugins?.entries?.["skills-scanner"]?.config ?? {};
  const apiUrl = cfg.apiUrl ?? "http://10.110.3.133";
  const scanDirs =
    (cfg.scanDirs?.map(expandPath) ?? []).filter(existsSync).length > 0
      ? cfg.scanDirs!.map(expandPath)
      : defaultScanDirs();
  const behavioral = cfg.behavioral ?? false;
  const useLLM = cfg.useLLM ?? false;
  const policy = cfg.policy ?? "balanced";
  const preInstallScan = cfg.preInstallScan ?? "on";
  const onUnsafe = cfg.onUnsafe ?? "warn";
  const injectSecurityGuidance = cfg.injectSecurityGuidance ?? true;
  const enablePromptInjectionGuard = cfg.enablePromptInjectionGuard ?? false;
  const enableHighRiskOperationGuard = cfg.enableHighRiskOperationGuard ?? false;

  api.logger.info("[skills-scanner] ═══════════════════════════════════════");
  api.logger.info("[skills-scanner] Plugin loading...");
  api.logger.info(`[skills-scanner] API URL: ${apiUrl}`);
  api.logger.info(`[skills-scanner] Scan directories: ${scanDirs.join(", ")}`);
  api.logger.info(
    `[skills-scanner] Python dependencies: ${isPythonReady(PYTHON_CMD) ? "✅ Ready" : "❌ Not installed"}`
  );

  // Inject system prompt guidance (can be disabled via config)
  if (injectSecurityGuidance) {
    // Build combined guidance
    const guidanceParts = [SKILLS_SECURITY_GUIDANCE];
    
    if (enablePromptInjectionGuard) {
      guidanceParts.push(PROMPT_INJECTION_GUARD);
    }
    
    if (enableHighRiskOperationGuard) {
      guidanceParts.push(HIGH_RISK_OPERATION_GUARD);
    }
    
    const combinedGuidance = guidanceParts.join("\n\n");
    
    api.on("before_prompt_build", async () => ({
      prependSystemContext: combinedGuidance,
    }));
    
    api.logger.info("[skills-scanner] ✅ Security guidance injected into system prompt");
    if (enablePromptInjectionGuard) {
      api.logger.info("[skills-scanner]    - Prompt injection guard enabled");
    }
    if (enableHighRiskOperationGuard) {
      api.logger.info("[skills-scanner]    - High-risk operation guard enabled");
    }
  } else {
    api.logger.info("[skills-scanner] ⏭️  Security guidance injection disabled");
  }

  // Check if first run
  const firstRun = isFirstRun(cfg);
  if (firstRun) {
    api.logger.info("[skills-scanner] 🎉 First run detected");
    const configGuide = generateConfigGuide(
      cfg,
      apiUrl,
      scanDirs,
      behavioral,
      useLLM,
      policy,
      preInstallScan,
      onUnsafe
    );
    console.log(configGuide);
    markConfigReviewed();
  }

  // Install dependencies immediately
  if (!isPythonReady(PYTHON_CMD)) {
    api.logger.info("[skills-scanner] Installing Python dependencies...");
    ensureDeps(PYTHON_CMD, api.logger)
      .then((success) => {
        if (success) {
          api.logger.info("[skills-scanner] ✅ Dependencies installed");
        }
      })
      .catch((err) => {
        api.logger.error(`[skills-scanner] Dependency installation failed: ${err.message}`);
      });
  }

  // Helper for watcher alerts
  function persistWatcherAlert(msg: string): void {
    const state = loadState();
    const alerts: string[] = (state as any).pendingAlerts ?? [];
    alerts.push(`[${new Date().toLocaleString("en-US")}] ${msg}`);
    saveState({ ...state, pendingAlerts: alerts } as any);
    api.logger.warn(`[skills-scanner] ${msg}`);
  }

  // Service: Install deps + start watcher
  let stopWatcher: (() => void) | null = null;

  api.registerService({
    id: "skills-scanner-setup",
    start: async () => {
      api.logger.info("[skills-scanner] 🚀 Service starting...");

      const depsReady = await ensureDeps(PYTHON_CMD, api.logger);

      if (!depsReady) {
        api.logger.error("[skills-scanner] ❌ Dependencies installation failed");
        return;
      }

      api.logger.info("[skills-scanner] Python dependencies ready (requests installed)");

      if (preInstallScan === "on" && scanDirs.length > 0) {
        api.logger.info(`[skills-scanner] 📁 Starting file monitoring: ${scanDirs.length} directories`);
        stopWatcher = startWatcher(
          scanDirs,
          onUnsafe,
          behavioral,
          apiUrl,
          useLLM,
          policy,
          persistWatcherAlert,
          api.logger,
          PYTHON_CMD,
          SCAN_SCRIPT,
          QUARANTINE_DIR
        );
        api.logger.info("[skills-scanner] ✅ File monitoring started");
      } else {
        api.logger.info("[skills-scanner] ⏭️  Pre-install scan disabled");
      }

      // Auto-register cron job
      api.logger.info("[skills-scanner] 🕐 Setting up weekly report cron job...");
      await ensureCronJob(api.logger);
    },
    stop: () => {
      api.logger.info("[skills-scanner] 🛑 Service stopping...");
      stopWatcher?.();
      stopWatcher = null;
    },
  });

  // Command handlers
  const handlers = createCommandHandlers(
    cfg,
    apiUrl,
    scanDirs,
    behavioral,
    useLLM,
    policy,
    preInstallScan,
    onUnsafe,
    PYTHON_CMD,
    SCAN_SCRIPT,
    api.logger
  );

  // Chat command: /skills-scanner
  api.registerCommand({
    name: "skills-scanner",
    description: "Skills 安全扫描工具。用法: /skills-scanner <子命令> [参数]",
    acceptsArgs: true,
    requireAuth: true,
    handler: async (ctx: any) => {
      const args = (ctx.args ?? "").trim();

      if (!args) {
        return {
          text: [
            "🔍 *Skills Scanner - 安全扫描工具*",
            "",
            "可用命令:",
            "• `/skills-scanner scan <路径> [选项]` - 扫描 Skill",
            "• `/skills-scanner health` - 健康检查",
            "• `/skills-scanner config [操作]` - 配置管理",
            "• `/skills-scanner cron [操作]` - 定时任务管理",
            "",
            "扫描选项:",
            "• `--detailed` - 显示详细发现",
            "• `--behavioral` - 启用行为分析",
            "• `--recursive` - 递归扫描子目录",
            "• `--report` - 生成日报格式",
            "",
            "示例:",
            "```",
            "/skills-scanner scan ~/my-skill",
            "/skills-scanner scan ~/skills --recursive",
            "/skills-scanner health",
            "```",
            "",
            "💡 使用 `/skills-scanner help` 查看详细帮助",
          ].join("\n"),
        };
      }

      const parts = args.split(/\s+/);
      const subCommand = parts[0].toLowerCase();
      const subArgs = parts.slice(1).join(" ");

      if (subCommand === "scan") {
        return await handlers.handleScanCommand(subArgs);
      } else if (subCommand === "health") {
        return await handlers.handleHealthCommand();
      } else if (subCommand === "config") {
        return await handlers.handleConfigCommand(subArgs);
      } else if (subCommand === "cron") {
        return await handlers.handleCronCommand(subArgs);
      } else if (subCommand === "help" || subCommand === "--help" || subCommand === "-h") {
        return { text: handlers.getHelpText() };
      } else {
        return {
          text: `❌ 未知子命令: ${subCommand}\n\n使用 \`/skills-scanner help\` 查看帮助`,
        };
      }
    },
  });

  // Gateway RPC methods
  api.registerGatewayMethod("skillsScanner.scan", async ({ respond, params }: any) => {
    const { path: p, mode = "scan", recursive = false, detailed = false } = params ?? {};
    if (!p) return respond(false, { error: "Missing path parameter" });
    if (!isPythonReady(PYTHON_CMD))
      return respond(false, { error: "Python dependencies not ready" });
    const res = await runScan(PYTHON_CMD, SCAN_SCRIPT, mode === "batch" ? "batch" : "scan", expandPath(p), {
      recursive,
      detailed,
      behavioral,
      apiUrl,
      useLLM,
      policy,
    });
    respond(res.exitCode === 0, {
      output: res.output,
      exitCode: res.exitCode,
      is_safe: res.exitCode === 0,
    });
  });

  api.registerGatewayMethod("skillsScanner.report", async ({ respond }: any) => {
    if (!isPythonReady(PYTHON_CMD))
      return respond(false, { error: "Python dependencies not ready" });
    if (scanDirs.length === 0) return respond(false, { error: "No scan directories found" });
    const report = await buildDailyReport(
      scanDirs,
      behavioral,
      apiUrl,
      useLLM,
      policy,
      api.logger,
      PYTHON_CMD,
      SCAN_SCRIPT
    );
    respond(true, { report, state: loadState() });
  });

  // CLI commands
  api.registerCli(
    ({ program }: any) => {
      const cmd = program.command("skills-scanner").description("OpenClaw Skills 安全扫描工具");

      cmd
        .command("scan <path>")
        .description("扫描单个 Skill")
        .option("--detailed", "显示所有发现")
        .option("--behavioral", "启用行为分析")
        .action(async (p: string, opts: any) => {
          const res = await runScan(PYTHON_CMD, SCAN_SCRIPT, "scan", expandPath(p), {
            ...opts,
            apiUrl,
            useLLM,
            policy,
          });
          console.log(res.output);
          process.exit(res.exitCode);
        });

      cmd
        .command("batch <directory>")
        .description("批量扫描目录")
        .option("--recursive", "递归扫描子目录")
        .option("--detailed", "显示所有发现")
        .option("--behavioral", "启用行为分析")
        .action(async (d: string, opts: any) => {
          const res = await runScan(PYTHON_CMD, SCAN_SCRIPT, "batch", expandPath(d), {
            ...opts,
            apiUrl,
            useLLM,
            policy,
          });
          console.log(res.output);
          process.exit(res.exitCode);
        });

      cmd
        .command("report")
        .description("生成日报")
        .action(async () => {
          const report = await buildDailyReport(
            scanDirs,
            behavioral,
            apiUrl,
            useLLM,
            policy,
            console,
            PYTHON_CMD,
            SCAN_SCRIPT
          );
          console.log(report);
        });

      cmd
        .command("health")
        .description("检查 API 服务健康状态")
        .action(async () => {
          if (!isPythonReady(PYTHON_CMD)) {
            console.error("❌ Python 依赖未就绪");
            process.exit(1);
          }

          try {
            const { exec } = await import("node:child_process");
            const { promisify } = await import("node:util");
            const execAsync = promisify(exec);

            const cmd = `"${PYTHON_CMD}" "${SCAN_SCRIPT}" --api-url "${apiUrl}" health`;
            const env = { ...process.env };
            delete env.http_proxy;
            delete env.https_proxy;
            delete env.HTTP_PROXY;
            delete env.HTTPS_PROXY;
            delete env.all_proxy;
            delete env.ALL_PROXY;

            const { stdout, stderr } = await execAsync(cmd, { timeout: 5000, env });
            const output = (stdout + stderr).trim();
            console.log(output);

            if (output.includes("✓") || output.includes("OK")) {
              process.exit(0);
            } else {
              process.exit(1);
            }
          } catch (err: any) {
            console.error(`❌ 连接失败: ${err.message}`);
            console.error(`\n💡 请确保 skill-scanner-api 服务正在运行：`);
            console.error(`   skill-scanner-api`);
            process.exit(1);
          }
        });
    },
    { commands: ["skills-scanner"] }
  );

  api.logger.info("[skills-scanner] ✅ Plugin registered");
}
