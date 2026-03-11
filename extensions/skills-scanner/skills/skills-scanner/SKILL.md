---
name: skills-scanner
description: OpenClaw Skills 安全扫描工具，使用 Cisco AI Skill Scanner 检测恶意代码、数据窃取、提示注入等威胁。
version: 1.0.0
user-invocable: true
metadata: {"openclaw": {"emoji": "🔍", "requires": {"bins": ["uv", "python3"]}, "install": [{"id": "uv-brew", "kind": "brew", "formula": "uv", "bins": ["uv"], "label": "安装 uv (macOS)", "os": ["darwin"]}, {"id": "uv-curl", "kind": "download", "url": "https://astral.sh/uv/install.sh", "label": "安装 uv (Linux)", "os": ["linux"]}]}}
---

# Skills 安全扫描工具 🔍

OpenClaw Skills 安全扫描工具，检测恶意代码、数据窃取、提示注入等威胁。

## 重要提示

**在向用户展示扫描结果前，请务必：**
1. 检查结果中是否包含英文内容（如 category、description、finding 详情等）
2. 如果包含英文，将所有英文内容翻译为中文后再展示给用户
3. 保持技术术语的准确性（如 CRITICAL、HIGH、MEDIUM、LOW 可保留或翻译为：严重、高危、中危、低危）
4. 确保翻译后的内容清晰易懂，符合中文表达习惯

示例翻译：
- "Prompt injection detected" → "检测到提示注入"
- "Unauthorized file access" → "未授权的文件访问"
- "Data exfiltration attempt" → "数据窃取尝试"
- "Malicious code execution" → "恶意代码执行"

## 环境准备（首次使用）

首次运行前，检查并安装依赖：

```bash
# 检查 uv 是否可用
which uv || echo "请安装 uv: brew install uv 或 curl -LsSf https://astral.sh/uv/install.sh | sh"

# 安装依赖到隔离虚拟环境
uv venv {baseDir}/.venv --python 3.10 --quiet
uv pip install --python {baseDir}/.venv/bin/python requests --quiet
```

安装只需执行一次。

## 配置

扫描器需要运行中的 API 服务。在 OpenClaw 配置中设置 API URL：

```json
{
  "plugins": {
    "entries": {
      "skills-scanner": {
        "config": {
          "apiUrl": "http://localhost:8000"
        }
      }
    }
  }
}
```

或直接调用时使用 `--api-url` 参数：

```bash
{baseDir}/.venv/bin/python {baseDir}/scan.py --api-url http://localhost:8000 scan <路径>
```

---

## 单个 Skill 扫描

**触发词**: "扫描 skill"、"检查这个 skill"、"安全检查 [路径]"

### 基础扫描（推荐，速度快）

```bash
{baseDir}/.venv/bin/python {baseDir}/scan.py --api-url {apiUrl} scan <skill路径>
```

### 详细模式（显示所有发现）

```bash
{baseDir}/.venv/bin/python {baseDir}/scan.py --api-url {apiUrl} scan <skill路径> --detailed
```

### 深度扫描（加入行为分析）

```bash
{baseDir}/.venv/bin/python {baseDir}/scan.py --api-url {apiUrl} scan <skill路径> --detailed --behavioral
```

### 最强扫描（加入 LLM 语义分析）

```bash
{baseDir}/.venv/bin/python {baseDir}/scan.py --api-url {apiUrl} scan <skill路径> --detailed --behavioral --llm
```

---

## 批量扫描

**触发词**: "批量扫描"、"扫描所有 skills"、"检查 skills 目录"

### 扫描指定目录下的所有 Skills

```bash
{baseDir}/.venv/bin/python {baseDir}/scan.py --api-url {apiUrl} batch <目录路径>
```

### 递归扫描（含子目录）

```bash
{baseDir}/.venv/bin/python {baseDir}/scan.py --api-url {apiUrl} batch <目录路径> --recursive
```

### 批量扫描并输出 JSON 报告

```bash
{baseDir}/.venv/bin/python {baseDir}/scan.py --api-url {apiUrl} batch <目录路径> --detailed --json /tmp/scan-report.json
```

### 常用目录示例

扫描 OpenClaw 默认 skills 目录：
```bash
{baseDir}/.venv/bin/python {baseDir}/scan.py --api-url {apiUrl} batch ~/.openclaw/skills
```

扫描 workspace skills：
```bash
{baseDir}/.venv/bin/python {baseDir}/scan.py --api-url {apiUrl} batch ~/.openclaw/workspace/skills --recursive
```

---

## 健康检查

检查 API 服务是否运行：

```bash
{baseDir}/.venv/bin/python {baseDir}/scan.py --api-url {apiUrl} health
```

---

## 结果解读

| 状态 | 含义 |
|------|------|
| ✅ 安全 | 未检测到 HIGH/CRITICAL 问题，可正常使用 |
| ⚠️ 需关注 | 存在 LOW/MEDIUM 问题，建议人工复核 |
| ❌ 发现问题 | 存在 HIGH/CRITICAL 威胁，**强烈建议不要安装** |

### 严重级别说明

- **CRITICAL**: 主动利用尝试（数据窃取、代码注入）
- **HIGH**: 危险模式（提示注入、未授权访问）
- **MEDIUM**: 可疑行为（未声明的能力、误导性描述）
- **LOW**: 轻微风险，需人工判断

---

## 参数说明

| 参数 | 说明 |
|------|------|
| `--api-url <url>` | API 服务地址（默认: http://localhost:8000） |
| `--detailed` | 显示每条 finding 的完整详情 |
| `--behavioral` | 启用 AST 数据流分析（更准确，稍慢） |
| `--llm` | 启用 LLM 语义分析（最准确，需 API 支持） |
| `--recursive` | 批量扫描时递归子目录 |
| `--json <文件>` | 将结果保存为 JSON 文件 |
| `--policy <strict\|balanced\|permissive>` | 扫描策略（默认: balanced） |

---

## 注意事项

- **扫描结果不等于安全保证**。`is_safe=True` 表示未检测到已知威胁模式，不代表 skill 绝对安全。
- 扫描使用静态分析，不会执行任何 skill 中的代码。
- 退出码 `0` 表示安全，`1` 表示存在问题（便于 CI/CD 集成）。
- `{apiUrl}` 占位符会自动替换为插件配置中的 API URL。
