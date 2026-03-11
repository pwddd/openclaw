# Skills Scanner Plugin

OpenClaw Skills 安全扫描插件，用于检测 Skills 中的潜在安全威胁。

## 功能特性

- 🔍 **自动扫描**: 监听 Skills 目录，自动扫描新安装的 Skill
- 📊 **定时日报**: 每天自动生成安全扫描报告
- 🛡️ **多种策略**: 支持 strict/balanced/permissive 三种扫描策略
- 🤖 **LLM 分析**: 可选的 LLM 语义分析
- 🔒 **自动隔离**: 检测到不安全的 Skill 自动隔离或删除

## 安装

```bash
# 从本地安装（开发）
openclaw plugins install ./extensions/skills-scanner

# 从 npm 安装（发布后）
openclaw plugins install @openclaw/skills-scanner
```

## 配置

在 `~/.openclaw/openclaw.json` 或工作区配置中添加：

```json
{
  "plugins": {
    "entries": {
      "skills-scanner": {
        "enabled": true,
        "config": {
          "apiUrl": "http://localhost:8000",
          "scanDirs": ["~/.openclaw/skills", "~/.openclaw/workspace/skills"],
          "behavioral": false,
          "useLLM": false,
          "policy": "balanced",
          "preInstallScan": "on",
          "onUnsafe": "quarantine"
        }
      }
    }
  }
}
```

### 配置说明

- `apiUrl`: 扫描 API 服务地址（需要先启动 skill-scanner-api 服务）
- `scanDirs`: 要监控的 Skills 目录列表
- `behavioral`: 是否启用行为分析（深度扫描，较慢）
- `useLLM`: 是否使用 LLM 进行语义分析
- `policy`: 扫描策略
  - `strict`: 严格模式，发现任何可疑行为都标记为不安全
  - `balanced`: 平衡模式（推荐）
  - `permissive`: 宽松模式，只标记明确的威胁
- `preInstallScan`: 是否在安装时自动扫描
  - `on`: 启用（推荐）
  - `off`: 禁用
- `onUnsafe`: 发现不安全 Skill 的处理方式
  - `quarantine`: 移入隔离目录（推荐）
  - `delete`: 直接删除
  - `warn`: 仅警告，不处理

## 使用方法

### 聊天命令

```
/skills-scanner scan <路径> [选项]    # 扫描 Skill
/skills-scanner status                # 查看状态
/skills-scanner config [操作]         # 配置管理
/skills-scanner cron [操作]           # 定时任务管理
/skills-scanner help                  # 帮助信息
```

#### 扫描选项

- `--detailed`: 显示详细的安全发现
- `--behavioral`: 启用行为分析
- `--recursive`: 递归扫描子目录
- `--report`: 生成日报格式

#### 示例

```
/skills-scanner scan ~/.openclaw/skills/my-skill
/skills-scanner scan ~/.openclaw/skills --recursive
/skills-scanner scan ~/.openclaw/skills --report
/skills-scanner status
```

### CLI 命令

```bash
# 扫描单个 Skill
openclaw skills-scan scan <path> [--detailed] [--behavioral]

# 批量扫描目录
openclaw skills-scan batch <directory> [--recursive] [--detailed]

# 生成日报
openclaw skills-scan report

# 检查 API 服务健康状态
openclaw skills-scan health
```

## 前置要求

### 1. 安装 uv（Python 包管理器）

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# 或使用 Homebrew
brew install uv
```

### 2. 启动扫描 API 服务

插件需要连接到 skill-scanner-api 服务进行实际的安全扫描。

```bash
# 启动服务（假设你已经有这个服务）
skill-scanner-api
```

默认服务地址为 `http://localhost:8000`，可以在配置中修改。

## 工作流程

1. **插件启动**: 自动安装 Python 依赖（requests）
2. **文件监控**: 监听配置的 Skills 目录
3. **自动扫描**: 检测到新 Skill 时自动触发扫描
4. **结果处理**: 根据配置隔离/删除/警告不安全的 Skill
5. **定时日报**: 每天 08:00 生成安全报告

## 故障排除

### Python 依赖安装失败

```bash
# 手动安装依赖
cd extensions/skills-scanner/skills/skills-scanner
uv venv .venv --python 3.10
uv pip install --python .venv/bin/python requests>=2.31.0
```

### API 服务连接失败

1. 确保 skill-scanner-api 服务正在运行
2. 检查配置中的 `apiUrl` 是否正确
3. 运行健康检查：`openclaw skills-scan health`

### 定时任务未注册

```bash
# 手动注册定时任务
/skills-scanner cron register

# 或使用 CLI
openclaw cron add \
  --name "skills-daily-report" \
  --cron "0 8 * * *" \
  --tz "Asia/Shanghai" \
  --session isolated \
  --message "请执行 /skills-scanner scan --report 并把结果发送到此渠道" \
  --announce
```

## 开发

### 目录结构

```
extensions/skills-scanner/
├── package.json              # npm 包配置
├── openclaw.plugin.json      # 插件元数据
├── README.md                 # 文档
├── index.ts                  # 插件入口
├── src/                      # 源代码
│   ├── config.ts            # 配置管理
│   ├── scanner.ts           # 扫描逻辑
│   ├── watcher.ts           # 文件监控
│   ├── cron.ts              # 定时任务
│   ├── commands.ts          # 命令处理
│   └── types.ts             # 类型定义
└── skills/
    └── skills-scanner/
        ├── scan.py          # Python 扫描脚本
        └── .venv/           # Python 虚拟环境（自动创建）
```

## 许可证

MIT
- `scanDirs`: 要监控的目录列表
- `behavioral`: 启用行为分析（更准确但较慢）
- `useLLM`: 启用 LLM 语义分析
- `policy`: 扫描策略 (`strict` / `balanced` / `permissive`)
- `preInstallScan`: 安装前扫描 (`on` / `off`)
- `onUnsafe`: 不安全时的处理 (`quarantine` / `delete` / `warn`)
- `injectSecurityGuidance`: 向 AI 系统提示词注入安全规则（默认 `true`）

## 🆕 AI 安全提示功能

当 `injectSecurityGuidance` 启用时（默认启用），插件会自动向 AI 的系统提示词注入安全规则，要求 AI 在用户请求安装 Skills 时先进行扫描。

### 效果示例

```
用户: 帮我安装这个 Skill

AI: 好的，让我先进行安全扫描...
    [运行 /skills-scanner scan ~/Downloads/awesome-skill]
    
    ✅ 扫描完成：awesome-skill 安全检查通过
    未检测到安全威胁，可以安全安装。
    
    现在为您安装...
```

### 禁用方法

如果不需要这个功能，可以通过以下方式禁用：

**方法 1：通过配置禁用**

```json
{
  "plugins": {
    "entries": {
      "skills-scanner": {
        "config": {
          "injectSecurityGuidance": false
        }
      }
    }
  }
}
```

**方法 2：通过 hook 控制禁用**

```json
{
  "plugins": {
    "entries": {
      "skills-scanner": {
        "hooks": {
          "allowPromptInjection": false
        }
      }
    }
  }
}
```

## 使用方法

### 聊天命令

```bash
# 扫描单个 Skill
/skills-scanner scan ~/my-skill

# 详细扫描
/skills-scanner scan ~/my-skill --detailed

# 深度扫描（行为分析）
/skills-scanner scan ~/my-skill --detailed --behavioral

# 批量扫描
/skills-scanner scan ~/.openclaw/skills --recursive

# 生成日报
/skills-scanner scan ~/.openclaw/skills --report

# 查看状态
/skills-scanner status

# 配置管理
/skills-scanner config show
/skills-scanner config reset

# 定时任务管理
/skills-scanner cron register
/skills-scanner cron status
/skills-scanner cron unregister
```

### CLI 命令

```bash
# 扫描单个 Skill
openclaw skills-scanner scan ~/my-skill

# 批量扫描
openclaw skills-scanner batch ~/.openclaw/skills --recursive

# 生成日报
openclaw skills-scanner report

# 健康检查
openclaw skills-scanner health
```

## 扫描方式

插件支持 7 种扫描方式：

1. **手动单个扫描**（聊天命令）：用户主动扫描单个 Skill
2. **手动批量扫描**（聊天命令）：用户主动扫描多个 Skills
3. **CLI 命令扫描**：通过命令行工具扫描
4. **自动文件监控**：实时监控目录，自动扫描新 Skill
5. **定时任务扫描**：每天 08:00 自动生成日报
6. **RPC 方法扫描**：供其他插件或程序调用
7. **AI 主动扫描**：AI 在用户请求安装 Skills 时自动扫描（需启用 `injectSecurityGuidance`）

## 依赖要求

- Python 3.10+
- uv（Python 包管理器）
- skill-scanner-api 服务（需要单独运行）

### 安装依赖

```bash
# macOS
brew install uv

# Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# 启动 API 服务
skill-scanner-api
```

## 故障排查

### Python 依赖未就绪

```bash
# 手动安装依赖
cd extensions/skills-scanner/skills/skills-scanner
uv venv .venv --python 3.10
uv pip install --python .venv/bin/python requests
```

### API 服务连接失败

```bash
# 检查 API 服务状态
openclaw skills-scanner health

# 确保 API 服务正在运行
skill-scanner-api
```

## 开发

### 项目结构

```
extensions/skills-scanner/
├── index.ts                 # 插件入口
├── package.json
├── openclaw.plugin.json     # 插件配置
├── README.md
├── src/
│   ├── commands.ts          # 命令处理器
│   ├── config.ts            # 配置管理
│   ├── cron.ts              # 定时任务
│   ├── deps.ts              # 依赖管理
│   ├── prompt-guidance.ts   # 系统提示词注入 🆕
│   ├── report.ts            # 报告生成
│   ├── scanner.ts           # 扫描执行
│   ├── state.ts             # 状态管理
│   ├── types.ts             # 类型定义
│   └── watcher.ts           # 文件监控
└── skills/
    └── skills-scanner/
        ├── SKILL.md         # Skill 文档
        └── scan.py          # Python 扫描脚本
```

## 许可证

MIT
