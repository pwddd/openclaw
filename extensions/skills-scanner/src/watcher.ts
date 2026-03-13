/**
 * File watcher module for pre-installation scanning
 */

import { watch as fsWatch, existsSync, renameSync, rmSync } from "node:fs";
import { join, basename } from "node:path";
import { mkdirSync } from "node:fs";
import { runScan } from "./scanner.js";
import type { OnUnsafeAction } from "./types.js";

export async function handleNewSkill(
  skillPath: string,
  onUnsafe: OnUnsafeAction,
  behavioral: boolean,
  apiUrl: string,
  useLLM: boolean,
  policy: string,
  notifyFn: (msg: string) => void,
  logger: any,
  pythonCmd: string | null,
  scanScript: string,
  quarantineDir: string
): Promise<void> {
  if (!existsSync(join(skillPath, "SKILL.md"))) return;
  
  const name = basename(skillPath);
  logger.info(`[skills-scanner] 🔍 检测到新 Skill，开始安装前扫描: ${name}`);
  notifyFn(`🔍 检测到新 Skill \`${name}\`，正在安全扫描...`);

  const res = await runScan(pythonCmd, scanScript, "scan", skillPath, {
    behavioral,
    detailed: true,
    apiUrl,
    useLLM,
    policy,
  });

  if (res.exitCode === 0) {
    notifyFn(`✅ \`${name}\` 安全检查通过，可以正常使用。`);
    return;
  }

  let action = "";
  try {
    if (onUnsafe === "quarantine") {
      mkdirSync(quarantineDir, { recursive: true });
      const dest = join(quarantineDir, `${name}-${Date.now()}`);
      renameSync(skillPath, dest);
      action = `已移入隔离目录：\`${dest}\``;
    } else if (onUnsafe === "delete") {
      rmSync(skillPath, { recursive: true, force: true });
      action = "已自动删除";
    } else {
      action = "仅警告，Skill 已保留（请谨慎使用）";
    }
  } catch (e: any) {
    action = `处置失败：${e.message}`;
  }

  notifyFn(
    [
      `❌ *安全警告：\`${name}\` 未通过扫描*`,
      `处置：${action}`,
      "```",
      res.output.slice(0, 600),
      "```",
    ].join("\n")
  );
}

export function startWatcher(
  dirs: string[],
  onUnsafe: OnUnsafeAction,
  behavioral: boolean,
  apiUrl: string,
  useLLM: boolean,
  policy: string,
  notifyFn: (msg: string) => void,
  logger: any,
  pythonCmd: string | null,
  scanScript: string,
  quarantineDir: string
): () => void {
  const timers = new Map<string, NodeJS.Timeout>();

  const watchers = dirs.map((dir) => {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    logger.info(`[skills-scanner] 👁  监听目录：${dir}`);

    return fsWatch(dir, { persistent: false }, (_evt, filename) => {
      if (!filename) return;
      const skillPath = join(dir, filename);
      if (!existsSync(skillPath)) return;

      const prev = timers.get(skillPath);
      if (prev) clearTimeout(prev);
      timers.set(
        skillPath,
        setTimeout(() => {
          timers.delete(skillPath);
          handleNewSkill(
            skillPath,
            onUnsafe,
            behavioral,
            apiUrl,
            useLLM,
            policy,
          notifyFn,
          logger,
          pythonCmd,
          scanScript,
          quarantineDir
        );
        }, 500)
      );
    });
  });

  return () => {
    watchers.forEach((w) => w.close());
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
    logger.info("[skills-scanner] 目录监听已停止");
  };
}
