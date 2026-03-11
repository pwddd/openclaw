/**
 * Scanner module - handles Python script execution
 */

import { promisify } from "node:util";
import { exec } from "node:child_process";
import type { ScanOptions, ScanResult } from "./types.js";

const execAsync = promisify(exec);

export async function runScan(
  venvPython: string,
  scanScript: string,
  mode: "scan" | "batch",
  target: string,
  opts: ScanOptions = {}
): Promise<ScanResult> {
  const args = [mode, target];
  if (opts.detailed) args.push("--detailed");
  if (opts.behavioral) args.push("--behavioral");
  if (opts.recursive) args.push("--recursive");
  if (opts.useLLM) args.push("--llm");
  if (opts.policy) args.push("--policy", opts.policy);
  if (opts.jsonOut) args.push("--json", opts.jsonOut);
  if (opts.apiUrl) args.unshift("--api-url", opts.apiUrl);

  const cmd = `"${venvPython}" "${scanScript}" ${args.map((a) => `"${a}"`).join(" ")}`;

  try {
    const env = { ...process.env };
    // Remove proxy env vars to avoid connection issues
    delete env.http_proxy;
    delete env.https_proxy;
    delete env.HTTP_PROXY;
    delete env.HTTPS_PROXY;
    delete env.all_proxy;
    delete env.ALL_PROXY;

    const { stdout, stderr } = await execAsync(cmd, {
      timeout: 180_000,
      env,
    });
    return { exitCode: 0, output: (stdout + stderr).trim() };
  } catch (err: any) {
    return {
      exitCode: err.code ?? 1,
      output: (err.stdout + err.stderr || "").trim() || err.message,
    };
  }
}
