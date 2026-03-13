/**
 * 配置管理模块
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawPluginConfigSchema } from "openclaw/plugin-sdk";
import type { ScannerConfig } from "./types.js";

export const skillsScannerConfigSchema: OpenClawPluginConfigSchema = {
  safeParse: (value: unknown) => {
    try {
      const config = value as ScannerConfig;
      
      // 验证 policy
      if (config.policy && !["strict", "balanced", "permissive"].includes(config.policy)) {
        return {
          success: false,
          error: {
            issues: [{
              path: ["policy"],
              message: "policy 必须是 strict、balanced 或 permissive"
            }]
          }
        };
      }
      
      // 验证 preInstallScan
      if (config.preInstallScan && !["on", "off"].includes(config.preInstallScan)) {
        return {
          success: false,
          error: {
            issues: [{
              path: ["preInstallScan"],
              message: "preInstallScan 必须是 on 或 off"
            }]
          }
        };
      }
      
      // 验证 onUnsafe
      if (config.onUnsafe && !["quarantine", "delete", "warn"].includes(config.onUnsafe)) {
        return {
          success: false,
          error: {
            issues: [{
              path: ["onUnsafe"],
              message: "onUnsafe 必须是 quarantine、delete 或 warn"
            }]
          }
        };
      }
      
      return { success: true, data: config };
    } catch (err) {
      return {
        success: false,
        error: {
          issues: [{
            path: [],
            message: String(err)
          }]
        }
      };
    }
  },
  
  uiHints: {
    apiUrl: {
      label: "API 服务地址",
      help: "扫描 API 服务的 URL 地址",
      placeholder: "https://110.vemic.com/skills-scanner"
    },
    scanDirs: {
      label: "扫描目录",
      help: "要监控的 Skills 目录列表，支持 ~ 路径"
    },
    behavioral: {
      label: "行为分析",
      help: "启用深度行为分析（较慢但更准确）"
    },
    useLLM: {
      label: "LLM 分析",
      help: "使用 LLM 进行语义分析"
    },
    policy: {
      label: "扫描策略",
      help: "strict=严格 / balanced=平衡（推荐）/ permissive=宽松"
    },
    preInstallScan: {
      label: "安装前扫描",
      help: "监听新 Skill 并自动扫描"
    },
    onUnsafe: {
      label: "不安全处理",
      help: "warn=仅警告（推荐）/ quarantine=隔离 / delete=删除"
    }
  }
};

export function generateConfigGuide(
  cfg: ScannerConfig,
  apiUrl: string,
  scanDirs: string[],
  behavioral: boolean,
  useLLM: boolean,
  policy: string,
  preInstallScan: string,
  onUnsafe: string
): string {
  return [
    "",
    "╔════════════════════════════════════════════════════════════════╗",
    "║  🎉 Skills Scanner 首次运行 - 配置向导                         ║",
    "╚════════════════════════════════════════════════════════════════╝",
    "",
    "当前使用默认配置。建议根据您的需求自定义配置：",
    "",
    "📋 当前配置：",
    `  • API 服务地址: ${apiUrl}`,
    `  • 扫描目录: ${scanDirs.length} 个（自动检测）`,
    `  • 行为分析: ${behavioral ? "✅ 启用" : "❌ 禁用"}`,
    `  • LLM 分析: ${useLLM ? "✅ 启用" : "❌ 禁用"}`,
    `  • 扫描策略: ${policy}`,
    `  • 安装前扫描: ${preInstallScan === "on" ? "✅ 启用" : "❌ 禁用"}`,
    `  • 不安全处理: ${onUnsafe}`,
    "",
    "🔧 配置文件位置：",
    "  ~/.openclaw/config.json",
    "",
    "📝 推荐配置示例：",
    "",
    "```json",
    "{",
    '  "plugins": {',
    '    "entries": {',
    '      "skills-scanner": {',
    '        "enabled": true,',
    '        "config": {',
    '          "apiUrl": "https://110.vemic.com/skills-scanner",',
    '          "scanDirs": ["~/.openclaw/skills"],',
    '          "behavioral": false,',
    '          "useLLM": false,',
    '          "policy": "balanced",',
    '          "preInstallScan": "on",',
    '          "onUnsafe": "warn"',
    '        }',
    '      }',
    '    }',
    '  }',
    "}",
    "```",
    "",
    "💡 配置说明：",
    "",
    "1. apiUrl        默认 https://110.vemic.com/skills-scanner，需先启动 skill-scanner-api 服务",
    "2. scanDirs      可添加多个目录（默认自动检测 ~/.openclaw/skills）",
    "3. behavioral    false=快速扫描（推荐），true=深度分析",
    "4. useLLM        false=不使用 LLM（推荐），true=语义分析",
    "5. policy        strict / balanced（推荐）/ permissive",
    "6. preInstallScan on=监听新 Skill 并自动扫描（推荐），off=禁用",
    "7. onUnsafe      warn=仅警告（推荐），quarantine=隔离，delete=删除",
    "",
    "🚀 快速开始：",
    "  编辑配置文件后重启 Gateway",
    "  /skills-scanner health",
    "",
    "提示：此消息只在首次运行时显示。",
    "════════════════════════════════════════════════════════════════",
  ].join("\n");
}
