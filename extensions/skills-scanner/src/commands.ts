/**
 * Command handlers module
 */

import { existsSync, execSync } from "node:fs";
import { join, basename } from "node:path";
import { promisify } from "node:util";
import { exec } from "node:child_process";
import { runScan } from "./scanner.js";
import { buildDailyReport } from "./report.js";
import { loadState, saveState, expandPath } from "./state.js";
import { isVenvReady } from "./deps.js";
import { generateConfigGuide } from "./config.js";
import { ensureCronJob } from "./cron.js";
import type { ScannerConfig } from "./types.js";

const execAsync = promisify(exec);

export function createCommandHandlers(
  cfg: ScannerConfig,
  apiUrl: string,
  scanDirs: string[],
  behavioral: boolean,
  useLLM: boolean,
  policy: string,
  preInstallScan: string,
  onUnsafe: string,
  venvPython: string,
  scanScript: string,
  logger: any
) {
  async function handleScanCommand(args: string): Promise<any> {
    if (!args) {
      return {
        text: "用法：`/skills-scanner scan <路径> [--detailed] [--behavioral] [--recursive] [--report]`",
      };
    }

    if (!isVenvReady(venvPython)) {
      return { text: "⏳ Python 依赖尚未就绪，请稍后重试或查看日志" };
    }

    const parts = args.split(/\s+/);
    const targetPath = expandPath(parts.find((p) => !p.startsWith("--")) ?? "");
    const detailed = parts.includes("--detailed");
    const useBehav = parts.includes("--behavioral") || behavioral;
    const recursive = parts.includes("--recursive");
    const isReport = parts.includes("--report");

    if (!targetPath) {
      return { text: "❌ 请指定扫描路径" };
    }

    if (!existsSync(targetPath)) {
      return { text: `❌ 路径不存在: ${targetPath}` };
    }

    const isSingleSkill = existsSync(join(targetPath, "SKILL.md"));

    if (isReport) {
      if (scanDirs.length === 0) {
        return { text: "⚠️ 未找到可扫描目录，请检查配置" };
      }
      const report = await buildDailyReport(
        scanDirs,
        useBehav,
        apiUrl,
        useLLM,
        policy,
        logger,
        venvPython,
        scanScript
      );
      return { text: report };
    } else if (isSingleSkill) {
      const res = await runScan(venvPython, scanScript, "scan", targetPath, {
        detailed,
        behavioral: useBehav,
        apiUrl,
        useLLM,
        policy,
      });
      const icon = res.exitCode === 0 ? "✅" : "❌";
      return { text: `${icon} 扫描完成\n\`\`\`\n${res.output}\n\`\`\`` };
    } else {
      const res = await runScan(venvPython, scanScript, "batch", targetPath, {
        recursive,
        detailed,
        behavioral: useBehav,
        apiUrl,
        useLLM,
        policy,
      });
      const icon = res.exitCode === 0 ? "✅" : "❌";
      return { text: `${icon} 批量扫描完成\n\`\`\`\n${res.output}\n\`\`\`` };
    }
  }

  async function handleStatusCommand(): Promise<any> {
    const state = loadState() as any;
    const alerts: string[] = state.pendingAlerts ?? [];

    const lines = [
      "📋 *Skills Scanner 状态*",
      `API 地址: ${apiUrl}`,
      `Python 依赖: ${isVenvReady(venvPython) ? "✅ 就绪" : "❌ 未就绪"}`,
      `安装前扫描: ${preInstallScan === "on" ? `✅ 监听中 (${onUnsafe})` : "❌ 已禁用"}`,
      `扫描策略: ${policy}`,
      `LLM 分析: ${useLLM ? "✅ 启用" : "❌ 禁用"}`,
      `行为分析: ${behavioral ? "✅ 启用" : "❌ 禁用"}`,
      `上次扫描: ${state.lastScanAt ? new Date(state.lastScanAt).toLocaleString("zh-CN") : "从未"}`,
      `扫描目录:\n${scanDirs.map((d) => `  • ${d}`).join("\n")}`,
    ];

    if (isVenvReady(venvPython)) {
      lines.push("", "🔍 *API 服务检查*");
      try {
        const cmd = `"${venvPython}" "${scanScript}" --api-url "${apiUrl}" health`;
        const env = { ...process.env };
        delete env.http_proxy;
        delete env.https_proxy;
        delete env.HTTP_PROXY;
        delete env.HTTPS_PROXY;
        delete env.all_proxy;
        delete env.ALL_PROXY;

        const { stdout, stderr } = await execAsync(cmd, { timeout: 5000, env });
        const output = (stdout + stderr).trim();

        if (output.includes("✓") || output.includes("OK")) {
          lines.push(`API 服务: ✅ 正常`);
          const jsonMatch = output.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const healthData = JSON.parse(jsonMatch[0]);
              if (healthData.analyzers_available) {
                lines.push(`可用分析器: ${healthData.analyzers_available.join(", ")}`);
              }
            } catch {}
          }
        } else {
          lines.push(`API 服务: ❌ 不可用`);
        }
      } catch (err: any) {
        lines.push(`API 服务: ❌ 连接失败`);
        lines.push(`错误: ${err.message}`);
      }
    }

    if (alerts.length > 0) {
      lines.push("", `🔔 *待查告警 (${alerts.length} 条):*`);
      alerts.slice(-5).forEach((a) => lines.push(`  ${a}`));
      saveState({ ...state, pendingAlerts: [] });
    }

    lines.push("", "🕐 *定时任务*");
    if (state.cronJobId && state.cronJobId !== "manual-created") {
      lines.push(`状态: ✅ 已注册 (${state.cronJobId})`);
    } else {
      lines.push("状态: ❌ 未注册");
      lines.push("💡 使用 `/skills-scanner cron register` 注册");
    }

    return { text: lines.join("\n") };
  }

  async function handleConfigCommand(args: string): Promise<any> {
    const action = args.trim().toLowerCase() || "show";

    if (action === "show" || action === "") {
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
      return { text: "```\n" + configGuide + "\n```" };
    } else if (action === "reset") {
      const state = loadState() as any;
      saveState({ ...state, configReviewed: false });
      return {
        text: "✅ 配置审查标记已重置\n下次重启 Gateway 时将再次显示配置向导",
      };
    } else {
      return { text: "用法: `/skills-scanner config [show|reset]`" };
    }
  }

  async function handleCronCommand(args: string): Promise<any> {
    const action = args.trim().toLowerCase() || "status";
    const state = loadState() as any;

    if (action === "register") {
      const oldJobId = state.cronJobId;
      if (oldJobId && oldJobId !== "manual-created") {
        try {
          execSync(`openclaw cron remove ${oldJobId}`, { encoding: "utf-8", timeout: 5000 });
        } catch {}
      }

      saveState({ ...state, cronJobId: undefined });
      await ensureCronJob(logger);

      const newState = loadState() as any;
      if (newState.cronJobId) {
        return { text: `✅ 定时任务注册成功\n任务 ID: ${newState.cronJobId}` };
      } else {
        return { text: "❌ 定时任务注册失败，请查看日志" };
      }
    } else if (action === "unregister") {
      if (!state.cronJobId) {
        return { text: "⚠️ 未找到已注册的定时任务" };
      }

      try {
        execSync(`openclaw cron remove ${state.cronJobId}`, {
          encoding: "utf-8",
          timeout: 5000,
        });
        saveState({ ...state, cronJobId: undefined });
        return { text: `✅ 定时任务已删除: ${state.cronJobId}` };
      } catch (err: any) {
        return { text: `❌ 删除失败: ${err.message}` };
      }
    } else {
      const lines = ["🕐 *定时任务状态*"];
      if (state.cronJobId && state.cronJobId !== "manual-created") {
        lines.push(`任务 ID: ${state.cronJobId}`);
        lines.push(`执行时间: 每天 08:00 (Asia/Shanghai)`);
        lines.push("状态: ✅ 已注册");
      } else {
        lines.push("状态: ❌ 未注册");
        lines.push("", "💡 使用 `/skills-scanner cron register` 注册");
      }
      return { text: lines.join("\n") };
    }
  }

  function getHelpText(): string {
    return [
      "🔍 *Skills Scanner - 帮助*",
      "",
      "═══ 扫描命令 ═══",
      "`/skills-scanner scan <路径> [选项]`",
      "",
      "选项:",
      "• `--detailed` - 显示详细发现",
      "• `--behavioral` - 启用行为分析",
      "• `--recursive` - 递归扫描子目录",
      "• `--report` - 生成日报格式",
      "",
      "示例:",
      "```",
      "/skills-scanner scan ~/.openclaw/skills/my-skill",
      "/skills-scanner scan ~/.openclaw/skills --recursive",
      "/skills-scanner scan ~/.openclaw/skills --report",
      "```",
      "",
      "═══ 其他命令 ═══",
      "• `/skills-scanner status` - 查看状态",
      "• `/skills-scanner config [show|reset]` - 配置管理",
      "• `/skills-scanner cron [register|unregister|status]` - 定时任务管理",
    ].join("\n");
  }

  return {
    handleScanCommand,
    handleStatusCommand,
    handleConfigCommand,
    handleCronCommand,
    getHelpText,
  };
}
