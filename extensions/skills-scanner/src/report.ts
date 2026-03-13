/**
 * Report generation module
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { runScan } from "./scanner.js";
import { loadState, saveState, STATE_DIR } from "./state.js";
import type { ScanRecord } from "./types.js";

export async function buildDailyReport(
  dirs: string[],
  behavioral: boolean,
  apiUrl: string,
  useLLM: boolean,
  policy: string,
  logger: any,
  pythonCmd: string | null,
  scanScript: string
): Promise<string> {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const jsonOut = join(STATE_DIR, `report-${now.toISOString().slice(0, 10)}.json`);
  mkdirSync(STATE_DIR, { recursive: true });

  let total = 0;
  let safe = 0;
  let unsafe = 0;
  let errors = 0;
  const unsafeList: string[] = [];
  const allResults: ScanRecord[] = [];

  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    const tmpJson = join(STATE_DIR, `tmp-${Date.now()}.json`);
    await runScan(pythonCmd, scanScript, "batch", dir, {
      behavioral,
      recursive: true,
      jsonOut: tmpJson,
      apiUrl,
      useLLM,
      policy,
    });
    try {
      const rows: ScanRecord[] = JSON.parse(readFileSync(tmpJson, "utf-8"));
      try {
        rmSync(tmpJson);
      } catch {}
      for (const r of rows) {
        allResults.push(r);
        total++;
        if (r.error) errors++;
        else if (r.is_safe) safe++;
        else {
          unsafe++;
          unsafeList.push(r.name || basename(r.path ?? ""));
        }
      }
    } catch {
      logger.warn(`[skills-scanner] Cannot parse ${tmpJson}`);
    }
  }

  writeFileSync(jsonOut, JSON.stringify(allResults, null, 2));
  saveState({
    ...loadState(),
    lastScanAt: now.toISOString(),
    lastUnsafeSkills: unsafeList,
  });

  const lines = [`🔍 *Skills 安全日报* — ${dateStr} ${timeStr}`, "─".repeat(36)];
  if (total === 0) {
    lines.push("📭 未找到任何 Skill，请检查扫描目录。");
  } else {
    lines.push(`📊 扫描总计：${total} 个 Skill`);
    lines.push(`✅ 安全：${safe} 个`);
    lines.push(`❌ 问题：${unsafe} 个`);
    if (errors) lines.push(`⚠️  错误：${errors} 个`);
    if (unsafe > 0) {
      lines.push("", "🚨 *需要关注的 Skills：*");
      for (const name of unsafeList) {
        const r = allResults.find((x) => (x.name || basename(x.path ?? "")) === name);
        lines.push(`  • ${name} [${r?.max_severity ?? "?"}] — ${r?.findings ?? "?"} 条发现`);
      }
      lines.push("", "💡 运行 `/skills-scanner scan <路径> --detailed` 查看详情");
    } else {
      lines.push("", "🎉 所有 Skills 安全，未发现威胁。");
    }
  }
  lines.push("", `📁 完整报告：${jsonOut}`);
  return lines.join("\n");
}
