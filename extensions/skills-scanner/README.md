# Skills Scanner Plugin

OpenClaw Skills 安全扫描插件，用于检测 Skills 中的潜在安全威胁。

## 功能特性

- 🔍 **自动扫描**: 监听 Skills 目录，自动扫描新安装的 Skill
- 🌐 **ClawHub 扫描**: 直接扫描 ClawHub 上的 Skill，无需手动下载
- 📊 **定时周报**: 每周一自动生成安全扫描报告
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
          "apiUrl": "http://10.110.3.133",
          "scanDirs": ["~/.openclaw/skills", "~/.openclaw/workspace/skills"],
          "behavioral": false,
          "useLLM": false,
          "policy": "balanced",
          "preInstallScan": "on",
          "onUnsafe": "warn"
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
  - `warn`: 仅警告，不处理（推荐）
  - `quarantine`: 移入隔离目录
  - `delete`: 直接删除

## 使用方法

### 聊天命令

```
/skills-scanner scan <路径> [选项]    # 扫描 Skill
/skills-scanner scan clawhub <URL> [选项]  # 扫描 ClawHub Skill
/skills-scanner health                # 健康检查
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
/skills-scanner scan clawhub https://clawhub.ai/username/project
/skills-scanner scan clawhub https://clawhub.ai/Asleep123/caldav-calendar --detailed
/skills-scanner health
```

### CLI 命令

```bash
# 扫描单个 Skill
openclaw skills-scan scan <path> [--detailed] [--behavioral]

# 扫描 ClawHub Skill
openclaw skills-scan clawhub <url> [--detailed] [--behavioral]

# 批量扫描目录
openclaw skills-scan batch <directory> [--recursive] [--detailed]

# 生成日报
openclaw skills-scan report

# 检查 API 服务健康状态
openclaw skills-scanner health
```

## 前置要求

### 1. Python 3.10+（必需）

插件需要 Python 3.10 或更高版本。

#### 安装 Python

**macOS**
```bash
brew install python3
```

**Linux (Ubuntu/Debian)**
```bash
sudo apt-get update
sudo apt-get install python3 python3-pip
```

**Windows**
1. 访问 https://www.python.org/downloads/
2. 下载 Python 3.10+ 安装程序
3. 运行安装程序，**务必勾选 "Add Python to PATH"**
4. 安装完成后，打开命令提示符验证：
   ```cmd
   python --version
   ```

**验证安装**
```bash
# macOS/Linux
python3 --version

# Windows
python --version
```

### 2. 启动扫描 API 服务

插件需要连接到 skill-scanner-api 服务进行实际的安全扫描。

```bash
# 启动服务（假设你已经有这个服务）
skill-scanner-api
```

默认服务地址为 `http://10.110.3.133`，可以在配置中修改。

## 工作流程

1. **插件启动**: 自动安装 Python 依赖（requests）
2. **文件监控**: 监听配置的 Skills 目录
3. **自动扫描**: 检测到新 Skill 时自动触发扫描
4. **结果处理**: 根据配置隔离/删除/警告不安全的 Skill
5. **定时周报**: 每周一 12:05 自动生成安全报告

## 故障排除

### Python 依赖安装失败

**macOS/Linux**
```bash
# 手动安装依赖
cd extensions/skills-scanner/skills/skills-scanner
python3 -m pip install --user "requests>=2.31.0"
```

**Windows**
```cmd
# 手动安装依赖
cd extensions\skills-scanner\skills\skills-scanner
python -m pip install --user "requests>=2.31.0"
```

### Windows 特定问题

#### Python 命令未找到

如果提示 `python is not recognized`：
1. 确认 Python 已安装：打开"设置" → "应用" → 查找 Python
2. 将 Python 添加到 PATH：
   - 打开"系统属性" → "环境变量"
   - 在"系统变量"中找到 `Path`
   - 添加 Python 安装路径（通常是 `C:\Users\<用户名>\AppData\Local\Programs\Python\Python3xx\`）
   - 添加 Scripts 路径（通常是 `C:\Users\<用户名>\AppData\Local\Programs\Python\Python3xx\Scripts\`）
3. 重启命令提示符或 PowerShell

#### 权限问题

如果遇到权限错误：
```cmd
# 使用 --user 标志安装到用户目录
python -m pip install --user requests

# 或以管理员身份运行命令提示符
```

#### 路径分隔符问题

Windows 使用反斜杠 `\` 作为路径分隔符，但插件会自动处理。如果手动指定路径，可以使用：
- 反斜杠：`C:\Users\username\.openclaw\skills`
- 正斜杠：`C:/Users/username/.openclaw/skills`（推荐，跨平台兼容）

### API 服务连接失败

1. 确保 skill-scanner-api 服务正在运行
2. 检查配置中的 `apiUrl` 是否正确
3. 运行健康检查：`openclaw skills-scan health`

### 定时任务未注册

定时任务会在插件启动时自动注册。如果需要手动注册：

```bash
# 手动注册定时任务
/skills-scanner cron setup

# 或使用 CLI
openclaw cron add \
  --name "skills-weekly-report" \
  --cron "5 12 * * 1" \
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
        └── scan.py          # Python 扫描脚本
```

## 许可证

MIT
- `scanDirs`: 要监控的目录列表
- `behavioral`: 启用行为分析（更准确但较慢）
- `useLLM`: 启用 LLM 语义分析
- `policy`: 扫描策略 (`strict` / `balanced` / `permissive`)
- `preInstallScan`: 安装前扫描 (`on` / `off`)
- `onUnsafe`: 不安全时的处理 (`warn` / `quarantine` / `delete`)
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

# 健康检查
/skills-scanner health

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

插件支持 8 种扫描方式：

1. **手动单个扫描**（聊天命令）：用户主动扫描单个 Skill
2. **手动批量扫描**（聊天命令）：用户主动扫描多个 Skills
3. **ClawHub 扫描**（聊天命令/CLI）：直接扫描 ClawHub 上的 Skill
4. **CLI 命令扫描**：通过命令行工具扫描
5. **自动文件监控**：实时监控目录，自动扫描新 Skill
6. **定时任务扫描**：每周一 12:05 自动生成周报
7. **RPC 方法扫描**：供其他插件或程序调用
8. **AI 主动扫描**：AI 在用户请求安装 Skills 时自动扫描（需启用 `injectSecurityGuidance`）

## ClawHub 扫描

插件支持直接扫描 ClawHub 上的 Skill，无需手动下载。这对于在安装前评估 Skill 的安全性非常有用。

### 使用方法

#### 聊天命令

```bash
# 基础扫描
/skills-scanner scan clawhub https://clawhub.ai/username/project

# 详细扫描
/skills-scanner scan clawhub https://clawhub.ai/username/project --detailed

# 启用行为分析
/skills-scanner scan clawhub https://clawhub.ai/username/project --behavioral

# 启用 LLM 分析（需要配置 API 密钥）
/skills-scanner scan clawhub https://clawhub.ai/username/project --detailed --behavioral
```

#### CLI 命令

```bash
# 基础扫描
openclaw skills-scanner clawhub https://clawhub.ai/username/project

# 详细扫描
openclaw skills-scanner clawhub https://clawhub.ai/username/project --detailed

# 使用严格策略
openclaw skills-scanner clawhub https://clawhub.ai/username/project --policy strict

# 输出 JSON 结果
openclaw skills-scanner clawhub https://clawhub.ai/username/project --json result.json
```

### 工作原理

1. 用户提供 ClawHub URL（例如：`https://clawhub.ai/username/project`）
2. 插件将 URL 发送到 skill-scanner-api 服务
3. API 服务自动从 ClawHub 下载 Skill 包
4. 执行安全扫描并返回结果
5. 插件显示扫描结果

### 优势

- **无需下载**：不需要手动下载 Skill 到本地
- **快速评估**：在安装前快速了解 Skill 的安全状况
- **自动化**：可以集成到 CI/CD 流程中
- **一致性**：使用与本地扫描相同的安全策略和分析器

## 依赖要求

- Python 3.10+
- skill-scanner-api 服务（需要单独运行）

### 安装依赖

```bash
# 确保 Python 已安装
python3 --version

# 启动 API 服务
skill-scanner-api
```

## 故障排查

### Python 依赖未就绪

```bash
# 手动安装依赖
cd extensions/skills-scanner/skills/skills-scanner
python3 -m pip install --user "requests>=2.31.0"
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
