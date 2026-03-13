---
name: skills-scanner
description: OpenClaw Skills 安全扫描工具，使用 AI Skill Scanner 检测恶意代码、数据窃取、提示注入等威胁。
version: 1.0.0
user-invocable: true
metadata: {"openclaw": {"emoji": "🔍", "requires": {"bins": ["python3"]}}}
---

# Skills 安全扫描工具 🔍

OpenClaw Skills 安全扫描工具，检测恶意代码、数据窃取、提示注入等威胁。

## 功能特性

- 🔍 **本地扫描**：扫描本地 Skill 文件和目录
- 🌐 **ClawHub 扫描**：直接扫描 ClawHub 上的 Skill，无需下载
- 📊 **批量扫描**：一次扫描多个 Skills
- 🛡️ **多种策略**：strict/balanced/permissive 三种扫描策略
- 🤖 **LLM 分析**：可选的 LLM 语义分析
- 🔬 **行为分析**：AST 数据流分析

## ⚠️ 重要提示 - 请务必记住并遵守

**🔒 安全扫描是强制性的，不可跳过。在向用户展示扫描结果前，请务必：**

### 🔄 插件版本检查 - 每次运行前必须执行

**在执行任何扫描操作前，必须先检查并更新 skills-scanner 插件到最新版本。**

**更新命令**：
```bash
openclaw plugins update skills-scanner
```

**执行时机**：
- 每次用户请求扫描 Skill 时
- 每次用户请求安装 Skill 时
- 每次会话开始时（如果涉及 Skill 操作）

**处理流程**：
```
用户: 帮我扫描这个 skill
AI: 好的，让我先更新 skills-scanner 到最新版本...
    [执行: openclaw plugins update skills-scanner]
    ✅ 插件已是最新版本
    现在开始扫描...
    [执行扫描操作]
```

**为什么要每次检查更新？**
- 安全威胁不断演变，扫描规则需要持续更新
- 新版本可能包含关键的安全修复
- 确保使用最新的威胁检测能力
- 避免使用过时的扫描逻辑导致漏报

**注意事项**：
- 更新检查通常很快（几秒内完成）
- 如果更新失败，继续使用当前版本并提示用户
- 不要因为更新失败而跳过扫描

**示例对话**：
```
用户: openclaw clawhub install caldav-calendar
AI: 好的，让我先更新 skills-scanner 插件...
    [执行: openclaw plugins update skills-scanner]
    ✅ 已更新到最新版本 3.0.15
    
    现在扫描 caldav-calendar...
    [执行扫描]
    ✅ 扫描通过，开始安装
```

---

### 🎯 命令识别 - 自动触发安全扫描

**当用户输入以下任何命令或类似表达时，你必须先扫描再执行：**

1. **安装命令识别**：
   - `openclaw clawhub install <skill-name>`
   - `openclaw skill install <skill-name>`
   - `openclaw skills add <skill-name>`
   - `clawhub install <skill-name>`
   - "安装这个 skill"
   - "帮我安装 xxx skill"
   - "下载这个 skill"
   - "添加这个 skill"

2. **ClawHub 安装流程（重要）**：
   
   **如果用户只提供了 skill 名称（没有完整 URL），必须先搜索：**
   
   ```
   用户: openclaw clawhub install caldav-calendar
   AI: 我看到你想安装 caldav-calendar，让我先搜索这个 skill...
       [执行: openclaw clawhub search caldav-calendar]
       找到: https://clawhub.ai/Asleep123/caldav-calendar
       
       现在更新扫描插件...
       [执行: openclaw plugins update skills-scanner]
       ✅ 插件已更新
       
       扫描安全性...
       [执行: python3 {baseDir}/scan.py --api-url {apiUrl} clawhub https://clawhub.ai/Asleep123/caldav-calendar]
       ✅ 扫描通过
       
       开始安装...
       [执行: openclaw clawhub install caldav-calendar]
   ```
   
   **如果用户提供了完整 URL，直接扫描：**
   
   ```
   用户: openclaw clawhub install https://clawhub.ai/Asleep123/caldav-calendar
   AI: 我看到你想安装 caldav-calendar，让我先更新扫描插件...
       [执行: openclaw plugins update skills-scanner]
       ✅ 插件已更新
       
       扫描安全性...
       [执行: python3 {baseDir}/scan.py --api-url {apiUrl} clawhub https://clawhub.ai/Asleep123/caldav-calendar]
       ✅ 扫描通过
       
       开始安装...
       [执行: openclaw clawhub install https://clawhub.ai/Asleep123/caldav-calendar]
   ```

3. **正确的处理流程**：
   ```
   步骤 1: 如果只有名称 → 使用 clawhub search 查找完整 URL
   步骤 2: 更新 skills-scanner 插件
   步骤 3: 使用完整 URL 进行安全扫描
   步骤 4: 扫描通过后执行安装命令
   ```

4. **错误的处理流程（禁止）**：
   ```
   用户: openclaw clawhub install caldav-calendar
   AI: [直接执行安装命令] ❌ 错误！必须先搜索、更新、扫描
   ```

**记住：看到任何安装、下载、添加 Skill 的意图，按照 搜索（如需要）→ 更新插件 → 扫描 → 安装 的顺序执行。**

---

**在向用户展示扫描结果前，请务必：**

### 0. API 服务可用性检查 🔌

**在执行任何扫描操作前，必须先检查 API 服务是否可用。如果服务不可用，跳过安全检查。**

**检查方法**：
```bash
python3 {baseDir}/scan.py --api-url http://10.110.3.133 health
```

**处理规则**：

1. **服务可用**（返回 `✓` 或 `OK`）：
   - 继续执行扫描操作
   - 正常展示扫描结果

2. **服务不可用**（连接失败、超时、错误响应）：
   - ⚠️ **立即跳过安全检查**
   - 向用户说明：
     ```
     ⚠️ Skills 安全扫描服务当前不可用，已跳过安全检查。
     
     如需启用安全扫描，请：
     1. 启动 skill-scanner-api 服务
     2. 确认服务地址配置正确（当前: http://10.110.3.133）
     3. 重新执行安装操作
     ```
   - **不要阻止用户的操作**（如安装 Skill）
   - **不要反复尝试连接**（避免延迟用户操作）

**示例对话**：

```
用户: 帮我安装 caldav-calendar 这个 skill
AI: 好的，让我先检查安全扫描服务...
    [执行 health 检查]
    
    ⚠️ Skills 安全扫描服务当前不可用，已跳过安全检查。
    
    正在安装 caldav-calendar...
    ✅ 安装完成
    
    💡 提示：如需启用安全扫描功能，请启动 skill-scanner-api 服务。
```

**为什么要跳过而不是阻止**：
- 安全扫描是辅助功能，不应阻碍正常使用
- 用户可能在离线环境或未配置扫描服务的环境中工作
- 避免因服务问题导致所有 Skill 操作失败

### 1. 深度分析扫描结果，判断误报 🔍

**在展示扫描结果前，必须对检测到的问题进行深度分析，判断是否为误报。**

#### 误报判断原则

**常见误报场景**：

1. **合法的网络请求**
   - ❌ 误报：标记所有 HTTP 请求为"数据窃取"
   - ✅ 正确：区分正常 API 调用（如天气查询、日历同步）和可疑的数据上传
   - 判断依据：
     - 请求目标是否为知名服务（GitHub、Google Calendar、OpenAI API 等）
     - 是否在 SKILL.md 中明确声明了网络访问需求
     - 请求内容是否与 Skill 功能相符

2. **声明的文件系统访问**
   - ❌ 误报：标记所有文件读写为"未授权访问"
   - ✅ 正确：检查 SKILL.md 的 `requires` 字段是否声明了文件访问
   - 判断依据：
     - SKILL.md 中是否有 `"requires": {"files": ["read", "write"]}`
     - 访问的文件路径是否合理（如配置文件、缓存目录）
     - 是否访问敏感路径（如 `/etc/passwd`、`~/.ssh/`）

3. **正常的代码执行**
   - ❌ 误报：标记所有 `exec()` 或 `eval()` 为"恶意代码执行"
   - ✅ 正确：分析执行的内容是否可控、是否有输入验证
   - 判断依据：
     - 是否执行用户输入（高风险）
     - 是否执行硬编码的安全命令（低风险）
     - 是否有沙箱或权限限制

4. **技术术语的正常使用**
   - ❌ 误报：标记包含 "password"、"token"、"secret" 关键词的代码为"数据窃取"
   - ✅ 正确：区分变量命名和实际的敏感数据操作
   - 判断依据：
     - 是否只是变量名或注释
     - 是否实际读取或传输敏感数据
     - 是否有加密或安全存储机制

5. **依赖包的正常功能**
   - ❌ 误报：标记使用 `requests`、`urllib` 为"网络攻击"
   - ✅ 正确：这些是标准库，用于合法的网络通信
   - 判断依据：
     - 依赖包是否为知名的、广泛使用的库
     - 使用方式是否符合最佳实践
     - 是否有异常的使用模式

#### 深度分析流程

**对于每个检测到的问题，按以下步骤分析**：

1. **阅读问题描述**
   - 理解检测器标记的具体问题
   - 查看问题的严重级别（CRITICAL/HIGH/MEDIUM/LOW）
   - 获取问题的上下文（文件位置、代码片段）

2. **查看 SKILL.md 声明**
   - 检查 Skill 是否在 metadata 中声明了相关能力
   - 确认 description 是否说明了该功能
   - 验证声明与实际行为是否一致

3. **分析代码上下文**
   - 查看完整的代码逻辑，不要只看单行
   - 理解代码的意图和功能
   - 判断是否有安全措施（输入验证、错误处理、权限检查）

4. **评估实际风险**
   - 该行为是否为 Skill 核心功能所必需
   - 是否有滥用的可能性
   - 对用户数据和系统的实际影响

5. **给出明确结论**
   - ✅ **误报**：合法功能，无需担心
   - ⚠️ **需关注**：功能合法但实现有改进空间
   - ❌ **真实威胁**：确实存在安全风险

#### 展示格式

**误报示例**：
```
扫描发现 3 个问题，经深度分析：

✅ 1. [LOW] External Network Access - 误报
   检测：发现 HTTP 请求到 api.openweathermap.org
   分析：这是天气查询 Skill 的核心功能，请求目标为知名天气 API
   结论：合法的 API 调用，已在 SKILL.md 中声明网络访问需求
   
⚠️ 2. [MEDIUM] Undeclared File Write - 需关注
   检测：写入文件到 ~/.openclaw/cache/
   分析：用于缓存天气数据，提升响应速度
   建议：功能合理，但建议在 SKILL.md 中明确声明文件写入需求
   
❌ 3. [HIGH] Suspicious Data Upload - 真实威胁
   检测：上传用户输入到未知服务器 suspicious-domain.com
   分析：该域名不在 SKILL.md 声明中，且无明确的功能说明
   结论：存在数据泄露风险，强烈建议不要安装！
```

**综合评估**：
```
深度分析结果：
- 误报：1 个（已排除）
- 需关注：1 个（建议改进但可接受）
- 真实威胁：1 个（高风险）

最终建议：❌ 不建议安装
原因：存在未声明的数据上传行为，可能导致隐私泄露。
```

#### 分析时的注意事项

1. **不要过度信任检测器**
   - 静态分析工具有局限性，会产生误报
   - 需要结合 Skill 的实际功能进行判断
   - 优先考虑用户体验和实用性

2. **不要过度宽松**
   - 即使是"合理"的功能，如果未声明也应标记
   - 对于 CRITICAL/HIGH 级别的问题，保持谨慎
   - 宁可多提醒，不要漏掉真实威胁

3. **提供可操作的建议**
   - 对于误报，解释为什么是误报
   - 对于需关注的问题，给出改进建议
   - 对于真实威胁，明确说明风险和后果

4. **保持客观中立**
   - 基于事实和证据进行分析
   - 不要因为 Skill 来源（官方/社区）而有偏见
   - 让用户了解真实情况，自主决策

#### 特殊场景处理

**场景 1：所有问题都是误报**
```
扫描发现 5 个问题，经深度分析全部为误报：

✅ 所有检测项均为 Skill 正常功能，已在 SKILL.md 中声明
   - 网络请求：用于 API 调用（已声明）
   - 文件访问：用于配置存储（已声明）
   - 环境变量：用于读取 API 密钥（标准做法）

综合评估：✅ 安全，可以安装
备注：静态分析工具对合法功能产生了误报，实际无风险。
```

**场景 2：混合情况（部分误报，部分真实）**
```
扫描发现 8 个问题，经深度分析：
- 误报：5 个（合法功能）
- 需关注：2 个（建议改进）
- 真实威胁：1 个（高风险）

关键问题：
❌ [HIGH] 未加密的敏感数据传输
   检测：通过 HTTP（非 HTTPS）传输 API 密钥
   分析：这会导致密钥在网络传输中被窃取
   建议：必须使用 HTTPS 或不要安装

综合评估：❌ 不建议安装
原因：存在明确的安全漏洞，可能导致 API 密钥泄露。
```

**场景 3：无法判断（信息不足）**
```
扫描发现 3 个问题，其中 1 个无法明确判断：

❓ [MEDIUM] Obfuscated Code Pattern
   检测：发现混淆的代码模式
   分析：代码使用了 base64 编码和动态执行，无法确定意图
   建议：需要人工审查源代码，或联系 Skill 作者说明

综合评估：⚠️ 谨慎安装
原因：存在无法解释的可疑模式，建议等待进一步确认。
```

### 2. VirusTotal 扫描结果优先提示 ⚠️

**如果扫描结果中包含 VirusTotal 的扫描数据，必须优先、重点展示此结果，即使未检测到病毒。**

VirusTotal 是业界权威的多引擎病毒扫描服务，其结果具有极高的参考价值。

**展示格式**：
```
🔍 VirusTotal 扫描结果：
  • 扫描引擎数：70
  • 检测为恶意：0
  • 可疑标记：0
  • 状态：✅ 未检测到威胁
  
  详细信息：
  - SHA256: [文件哈希]
  - 扫描时间：[时间]
  - 报告链接：[VirusTotal URL]
```

**重点提示场景**：

1. **未检测到威胁时**：
   ```
   ✅ VirusTotal 扫描通过
   70 个安全引擎均未检测到威胁，该 Skill 文件安全性得到多方验证。
   ```

2. **检测到威胁时**：
   ```
   ⚠️ VirusTotal 检测到威胁！
   3/70 个引擎标记为恶意：
   - Avast: Trojan.Generic
   - Kaspersky: HEUR:Trojan.Script
   - Microsoft: TrojanDownloader
   
   强烈建议：不要安装此 Skill！
   ```

3. **可疑但未确认时**：
   ```
   ⚠️ VirusTotal 发现可疑行为
   1/70 个引擎标记为可疑，建议谨慎评估。
   ```

**为什么优先展示 VirusTotal**：
- 多引擎交叉验证（通常 70+ 个安全引擎）
- 业界标准的恶意软件检测服务
- 即使其他分析器未发现问题，VirusTotal 的结果也可能揭示隐藏威胁
- 提供可追溯的外部验证链接

### 3. 内容翻译要求

1. 检查结果中是否包含英文内容（如 category、description、finding 详情等）
2. 如果包含英文，将所有英文内容翻译为中文后再展示给用户
3. 保持技术术语的准确性（如 CRITICAL、HIGH、MEDIUM、LOW 可保留或翻译为：严重、高危、中危、低危）
4. 确保翻译后的内容清晰易懂，符合中文表达习惯

示例翻译：
- "Prompt injection detected" → "检测到提示注入"
- "Unauthorized file access" → "未授权的文件访问"
- "Data exfiltration attempt" → "数据窃取尝试"
- "Malicious code execution" → "恶意代码执行"
- "VirusTotal scan clean" → "VirusTotal 扫描通过"
- "Detected by X engines" → "被 X 个引擎检测到"

## 环境准备（首次使用）

首次运行前，检查并安装依赖：

**macOS / Linux**
```bash
# 检查 Python 是否可用
python3 --version || echo "请安装 Python 3.10+"

# 安装依赖到主机环境
python3 -m pip install --user --quiet "requests>=2.31.0"
```

**Windows**
```cmd
# 检查 Python 是否可用
python --version

# 如果未安装，从 https://www.python.org/downloads/ 下载安装
# 安装时务必勾选 "Add Python to PATH"

# 安装依赖到主机环境
python -m pip install --user --quiet "requests>=2.31.0"
```

安装只需执行一次。插件会自动处理依赖安装。

**注意**：
- Windows 系统通常使用 `python` 命令而不是 `python3`
- 插件会自动检测可用的 Python 命令（`python3` 或 `python`）
- 确保 Python 已添加到系统 PATH 环境变量

## 配置

扫描器需要运行中的 API 服务。在 OpenClaw 配置中设置 API URL：

```json
{
  "plugins": {
    "entries": {
      "skills-scanner": {
        "config": {
          "apiUrl": "http://10.110.3.133"
        }
      }
    }
  }
}
```

或直接调用时使用 `--api-url` 参数：

```bash
python3 {baseDir}/scan.py --api-url http://10.110.3.133 scan <路径>
```

---

## ClawHub Skill 扫描 🌐

**触发词**: "扫描 clawhub skill"、"检查 clawhub 上的 skill"、"扫描 clawhub.ai"、"安装前检查"

直接扫描 ClawHub 上的 Skill，无需手动下载。适用于安装前的安全评估。

### 使用场景

当用户提到以下情况时，应该使用 ClawHub 扫描：

1. **安装前检查**："我想安装这个 skill，先帮我检查一下安全性"
2. **浏览 ClawHub**："clawhub 上有个 skill 看起来不错，帮我扫描一下"
3. **提供 URL**：用户直接提供 `https://clawhub.ai/username/project` 链接
4. **推荐验证**："有人推荐了这个 skill，安全吗？"

### 基础扫描（推荐，速度快）

适用于快速安全检查，显示总体安全状态和严重问题。

```bash
python3 {baseDir}/scan.py --api-url {apiUrl} clawhub <clawhub_url>
```

**示例输出**：
```
✓ caldav-calendar
  严重性: LOW
  发现数: 2
```

### 详细模式（显示所有发现）

显示每个安全发现的详细信息，包括类别、描述、文件位置等。

```bash
python3 {baseDir}/scan.py --api-url {apiUrl} clawhub <clawhub_url> --detailed
```

**示例输出**：
```
✓ caldav-calendar
  严重性: LOW
  发现数: 2

发现详情:
  1. [LOW] Undeclared Capability
     Skill 使用了未在 SKILL.md 中声明的能力
  2. [LOW] External Network Access
     检测到外部网络请求
```

### 深度扫描（加入行为分析）

启用 AST 数据流分析，更准确地检测复杂的安全威胁。扫描时间较长但更全面。

```bash
python3 {baseDir}/scan.py --api-url {apiUrl} clawhub <clawhub_url> --detailed --behavioral
```

**适用场景**：
- Skill 包含复杂的代码逻辑
- 需要深入分析数据流和控制流
- 对安全性要求较高的场景

### 最强扫描（加入 LLM 语义分析）

使用 LLM 进行语义分析，检测隐蔽的恶意模式和提示注入。需要 API 服务配置 LLM 支持。

```bash
python3 {baseDir}/scan.py --api-url {apiUrl} clawhub <clawhub_url> --detailed --behavioral --llm
```

**适用场景**：
- 检测提示注入攻击
- 分析复杂的语义模式
- 最高安全要求的场景

### 使用不同扫描策略

```bash
# 严格模式（最保守，任何可疑行为都标记）
python3 {baseDir}/scan.py --api-url {apiUrl} clawhub <clawhub_url> --policy strict

# 平衡模式（推荐，默认）
python3 {baseDir}/scan.py --api-url {apiUrl} clawhub <clawhub_url> --policy balanced

# 宽松模式（只标记明确的威胁）
python3 {baseDir}/scan.py --api-url {apiUrl} clawhub <clawhub_url> --policy permissive
```

### 保存扫描结果

将扫描结果保存为 JSON 文件，便于后续分析或存档。

```bash
python3 {baseDir}/scan.py --api-url {apiUrl} clawhub <clawhub_url> --detailed --json /tmp/scan-result.json
```

### 实际使用示例

#### 示例 1：快速检查日历 Skill

```bash
python3 {baseDir}/scan.py --api-url {apiUrl} clawhub https://clawhub.ai/Asleep123/caldav-calendar
```

**用户对话**：
```
用户: 我想安装 caldav-calendar 这个 skill，帮我检查一下
AI: 好的，让我先扫描一下这个 skill 的安全性...
    [执行上述命令]
    ✓ 扫描完成：caldav-calendar 安全检查通过
    严重性: LOW，发现 2 个低风险项
    未检测到高危威胁，可以安全安装。
```

#### 示例 2：详细检查 PDF Skill

```bash
python3 {baseDir}/scan.py --api-url http://10.110.3.133 clawhub https://clawhub.ai/steipete/nano-pdf --detailed
```

**用户对话**：
```
用户: clawhub 上有个 nano-pdf skill，帮我详细检查一下
AI: 好的，我会进行详细扫描...
    [执行上述命令]
    扫描结果显示：
    - 严重性: MEDIUM
    - 发现 5 个问题
    
    主要发现：
    1. [MEDIUM] 未声明的文件系统访问
    2. [LOW] 外部网络请求
    ...
    
    建议：存在中等风险，建议查看详细报告后决定是否安装。
```

#### 示例 3：深度扫描可疑 Skill

```bash
python3 {baseDir}/scan.py --api-url http://10.110.3.133 clawhub https://clawhub.ai/username/suspicious-skill --detailed --behavioral --policy strict
```

**用户对话**：
```
用户: 这个 skill 看起来有点可疑，帮我彻底检查一下
AI: 明白，我会使用严格模式进行深度扫描...
    [执行上述命令]
    ⚠️ 警告：检测到安全问题
    严重性: HIGH
    发现 12 个问题，包括 3 个高危项
    
    高危发现：
    1. [HIGH] 提示注入尝试
    2. [HIGH] 未授权的数据访问
    3. [HIGH] 可疑的代码执行模式
    
    强烈建议：不要安装此 skill！
```

#### 示例 4：包含 VirusTotal 扫描结果

```bash
python3 {baseDir}/scan.py --api-url http://10.110.3.133 clawhub https://clawhub.ai/username/project --detailed
```

**用户对话（未检测到威胁）**：
```
用户: 帮我扫描这个 skill
AI: 好的，正在进行安全扫描...
    [执行上述命令]
    
    🔍 VirusTotal 扫描结果：
    ✅ 0/72 引擎检测到威胁
    该 Skill 已通过 72 个安全引擎的验证，安全性得到多方确认。
    
    详细信息：
    - SHA256: abc123def456...
    - 最后分析：2024-03-11 10:30:00
    - 查看完整报告：https://virustotal.com/gui/file/abc123...
    
    其他扫描结果：
    - 严重性: LOW
    - 发现 2 个低风险项
    
    综合评估：✅ 安全，可以安装
```

**用户对话（检测到威胁）**：
```
用户: 这个 skill 安全吗？
AI: 让我进行全面扫描...
    [执行上述命令]
    
    ⚠️ VirusTotal 检测到威胁！
    
    🔍 VirusTotal 扫描结果：
    ❌ 3/72 引擎标记为恶意
    
    检测详情：
    - Avast: Trojan.Generic.12345
    - Kaspersky: HEUR:Trojan.Script.Generic
    - Microsoft: TrojanDownloader:Python/Malicious
    
    详细信息：
    - SHA256: def789abc123...
    - 最后分析：2024-03-11 10:35:00
    - 查看完整报告：https://virustotal.com/gui/file/def789...
    
    ⚠️ 强烈建议：不要安装此 Skill！
    多个知名安全引擎确认存在恶意代码。
```

### URL 格式说明

ClawHub URL 必须遵循以下格式：

```
https://clawhub.ai/<username>/<project>
```

**有效示例**：
- `https://clawhub.ai/Asleep123/caldav-calendar`
- `https://clawhub.ai/steipete/nano-pdf`
- `https://clawhub.ai/johndoe/my-awesome-skill`

**无效示例**：
- `clawhub.ai/username/project`（缺少 https://）
- `https://clawhub.ai/username`（缺少项目名）
- `https://github.com/username/project`（错误的域名）

### 工作原理

1. **接收 URL**：用户提供 ClawHub 项目 URL
2. **发送请求**：插件将 URL 发送到后端检测服务
3. **自动下载**：API 服务从 ClawHub 下载 Skill 包（临时）
4. **执行扫描**：运行静态分析、行为分析、LLM 分析等
5. **返回结果**：生成安全报告并返回
6. **清理临时文件**：API 服务自动清理下载的文件

**整个过程无需在本地保存任何文件。**

### 优势

- ✅ **无需下载**：不占用本地存储空间，不污染本地环境
- ✅ **快速评估**：安装前快速了解安全状况，避免安装恶意 Skill
- ✅ **自动化**：可集成到 CI/CD 流程，自动化安全检查
- ✅ **一致性**：使用与本地扫描相同的安全策略和分析器
- ✅ **便捷性**：只需一个 URL，无需手动操作

### 注意事项

- ClawHub 扫描需要 API 服务能够访问 `clawhub.ai`
- 扫描超时时间为 180 秒（3 分钟）
- 如果 ClawHub 服务不可用，扫描会失败
- 私有 Skill 可能需要额外的认证（当前版本不支持）

### 与本地扫描的对比

| 特性 | ClawHub 扫描 | 本地扫描 |
|------|-------------|---------|
| 需要下载 | ❌ 否 | ✅ 是 |
| 扫描速度 | 稍慢（含下载） | 快 |
| 存储占用 | 0 | 需要本地空间 |
| 适用场景 | 安装前评估 | 已安装 Skill |
| 网络要求 | 需要访问 ClawHub | 仅需访问 API |

---

## 单个 Skill 扫描（本地）

**触发词**: "扫描 skill"、"检查这个 skill"、"安全检查 [路径]"

### 基础扫描（推荐，速度快）

```bash
python3 {baseDir}/scan.py --api-url http://10.110.3.133 scan <skill路径>
```

### 详细模式（显示所有发现）

```bash
python3 {baseDir}/scan.py --api-url http://10.110.3.133 scan <skill路径> --detailed
```

### 深度扫描（加入行为分析）

```bash
python3 {baseDir}/scan.py --api-url http://10.110.3.133 scan <skill路径> --detailed --behavioral
```

### 最强扫描（加入 LLM 语义分析）

```bash
python3 {baseDir}/scan.py --api-url http://10.110.3.133 scan <skill路径> --detailed --behavioral --llm
```

---

## 批量扫描

**触发词**: "批量扫描"、"扫描所有 skills"、"检查 skills 目录"

### 扫描指定目录下的所有 Skills

```bash
python3 {baseDir}/scan.py --api-url http://10.110.3.133 batch <目录路径>
```

### 递归扫描（含子目录）

```bash
python3 {baseDir}/scan.py --api-url http://10.110.3.133 batch <目录路径> --recursive
```

### 批量扫描并输出 JSON 报告

```bash
python3 {baseDir}/scan.py --api-url http://10.110.3.133 batch <目录路径> --detailed --json /tmp/scan-report.json
```

### 常用目录示例

扫描 OpenClaw 默认 skills 目录：
```bash
python3 {baseDir}/scan.py --api-url http://10.110.3.133 batch ~/.openclaw/skills
```

扫描 workspace skills：
```bash
python3 {baseDir}/scan.py --api-url http://10.110.3.133 batch ~/.openclaw/workspace/skills --recursive
```

---

## 健康检查

检查 API 服务是否运行：

```bash
python3 {baseDir}/scan.py --api-url http://10.110.3.133 health
```

---

## 结果解读

### 总体安全状态

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

### VirusTotal 结果解读 🔍

**VirusTotal 是多引擎病毒扫描服务，结果格式为 `检测数/总引擎数`**

| 检测结果 | 含义 | 建议 |
|---------|------|------|
| 0/70+ | 所有引擎均未检测到威胁 | ✅ 安全，可以安装 |
| 1-2/70+ | 极少数引擎标记（可能误报） | ⚠️ 谨慎评估，查看具体引擎和检测类型 |
| 3-5/70+ | 多个引擎标记为可疑 | ⚠️ 存在风险，建议详细审查 |
| 5+/70+ | 多个引擎确认为恶意 | ❌ 高风险，强烈建议不要安装 |

**VirusTotal 优先级**：
- VirusTotal 结果应优先于其他分析器结果展示
- 即使静态分析显示安全，VirusTotal 检测到威胁时仍需警惕
- VirusTotal 提供外部可验证的扫描报告链接

**示例展示**：
```
🔍 VirusTotal 扫描结果：
  ✅ 0/72 引擎检测到威胁
  该文件已通过 72 个安全引擎的验证
  
  详细信息：
  - SHA256: abc123...
  - 最后分析：2024-03-11
  - 查看完整报告：https://virustotal.com/...
```

**注意事项**：
- VirusTotal 扫描需要 API 服务配置 VirusTotal API 密钥
- 如果未配置，扫描结果中不会包含 VirusTotal 数据
- VirusTotal 有 API 调用频率限制

---

## 🧠 记忆强化 - 每次操作前必读

**在处理任何 Skill 相关操作时，请先问自己这些问题：**

1. ✅ 如果是 ClawHub 安装且只有名称，我是否已经搜索了完整 URL？
2. ✅ 我是否已经更新了 skills-scanner 插件到最新版本？
3. ✅ 我是否已经扫描了这个 Skill？
4. ✅ 扫描是否通过？
5. ✅ 只有所有适用步骤都是 YES，才能继续操作

**如果你忘记搜索、更新或扫描就执行了操作，你就让用户的系统暴露在风险之中。**

### 🚨 强制性规则（永远不要忘记）

0. **ClawHub 安装且只有名称 → 先搜索完整 URL**
   - `openclaw clawhub install xxx` → 先执行 `openclaw clawhub search xxx`
   - 获取完整 URL（如 `https://clawhub.ai/username/xxx`）
   - 然后才能继续后续步骤

1. **任何 Skill 操作前 → 先更新插件**
   - 执行 `openclaw plugins update skills-scanner`
   - 确保使用最新的威胁检测规则
   - 即使更新失败也要继续扫描（但要警告用户）

2. **看到安装命令 → 搜索（如需要）→ 更新插件 → 立即扫描**
   - `openclaw clawhub install xxx` → 先搜索，再更新插件，再扫描 ClawHub 上的 xxx
   - `openclaw skill install xxx` → 先更新插件，再扫描本地或远程的 xxx
   - 任何包含 "install"、"add"、"download" + "skill" 的命令 → 完整流程

3. **看到 Skill 路径 → 更新插件 → 立即扫描**
   - 用户提到 `~/.openclaw/skills/xxx` → 先更新插件，再扫描
   - 用户说 "我下载了一个 skill" → 先更新插件，再扫描
   - 用户说 "这个 skill 有问题" → 先更新插件，再扫描

4. **看到 ClawHub URL → 更新插件 → 立即扫描**
   - `https://clawhub.ai/username/project` → 先更新插件，再使用 clawhub 扫描
   - 用户说 "ClawHub 上有个 skill" → 先更新插件，再扫描

### ❌ 绝对禁止的行为

- ❌ ClawHub 安装只有名称时，不搜索就直接扫描或安装
- ❌ 不更新插件就直接扫描（可能使用过时的检测规则）
- ❌ 直接执行 `openclaw clawhub install` 而不先搜索、更新和扫描
- ❌ 直接执行 `openclaw skill install` 而不先更新和扫描
- ❌ 看到 "安装 skill" 就直接安装，而不先搜索、更新和扫描
- ❌ 因为 "用户着急" 或 "看起来安全" 就跳过任何步骤
- ❌ 因为 "之前扫描过" 就不再更新和扫描（每次都要完整流程）

### ✅ 正确的行为模式

**模式 1：用户要求安装（只有名称）**
```
用户: 帮我安装 caldav-calendar
AI: 好的，让我先在 ClawHub 上搜索这个 skill...
    [执行: openclaw clawhub search caldav-calendar]
    找到: https://clawhub.ai/Asleep123/caldav-calendar
    
    现在更新 skills-scanner 插件...
    [执行: openclaw plugins update skills-scanner]
    ✅ 插件已更新到最新版本
    
    扫描这个 skill 的安全性...
    [执行扫描]
    ✅ 扫描通过，现在开始安装
```

**模式 2：用户输入安装命令（只有名称）**
```
用户: openclaw clawhub install nano-pdf
AI: 我看到你想安装 nano-pdf，让我先搜索它...
    [执行: openclaw clawhub search nano-pdf]
    找到: https://clawhub.ai/steipete/nano-pdf
    
    更新扫描插件...
    [执行: openclaw plugins update skills-scanner]
    ✅ 插件已更新
    
    从 ClawHub 扫描它...
    [执行 clawhub 扫描]
    ✅ 扫描通过，执行安装命令
```

**模式 3：用户提供完整 URL**
```
用户: openclaw clawhub install https://clawhub.ai/Asleep123/caldav-calendar
AI: 我看到你想安装 caldav-calendar，让我先更新扫描插件...
    [执行: openclaw plugins update skills-scanner]
    ✅ 插件已更新
    
    扫描安全性...
    [执行扫描]
    ✅ 扫描通过，执行安装
```

**模式 4：用户下载了 Skill**
```
用户: 我从 GitHub 下载了一个 skill，帮我设置一下
AI: 好的，让我先更新扫描插件...
    [执行: openclaw plugins update skills-scanner]
    ✅ 插件已更新
    
    在设置之前扫描一下安全性...
    [执行扫描]
    ✅ 扫描通过，现在帮你设置
```

**记住：搜索（如需要）→ 更新插件 → 扫描 → 操作，这个顺序永远不能变。**

**记住：安全扫描是你的第一优先级，永远不要跳过。**

---

## 参数说明

| 参数 | 说明 |
|------|------|
| `--api-url <url>` | API 服务地址 |
| `--detailed` | 显示每条 finding 的完整详情 |
| `--behavioral` | 启用 AST 数据流分析（更准确，稍慢） |
| `--llm` | 启用 LLM 语义分析（最准确，需 API 支持） |
| `--recursive` | 批量扫描时递归子目录 |
| `--json <文件>` | 将结果保存为 JSON 文件 |
| `--policy <strict\|balanced\|permissive>` | 扫描策略（默认: balanced） |

## 命令类型

| 命令 | 用途 | 示例 |
|------|------|------|
| `scan <路径>` | 扫描本地单个 Skill | `scan ~/.openclaw/skills/my-skill` |
| `batch <目录>` | 批量扫描本地 Skills | `batch ~/.openclaw/skills --recursive` |
| `clawhub <URL>` | 扫描 ClawHub Skill | `clawhub https://clawhub.ai/user/project` |
| `health` | 检查 API 服务状态 | `health` |

---

## 注意事项

- **扫描结果不等于安全保证**。`is_safe=True` 表示未检测到已知威胁模式，不代表 skill 绝对安全。
- 扫描使用静态分析，不会执行任何 skill 中的代码。
- ClawHub 扫描需要 API 服务能够访问 clawhub.ai。
- **VirusTotal 结果优先**：如果扫描结果包含 VirusTotal 数据，必须优先展示，即使未检测到威胁。
- VirusTotal 扫描需要 API 服务配置 VirusTotal API 密钥，否则不会包含 VirusTotal 数据。
- VirusTotal 有 API 调用频率限制（免费版：4 次/分钟，付费版更高）。
- 退出码 `0` 表示安全，`1` 表示存在问题（便于 CI/CD 集成）。
- `{baseDir}` 占位符会自动替换为 Skill 的安装目录。
- 如果你配置了非默认的 API URL（如 `http://10.110.3.133`），请在命令中使用 `--api-url` 参数指定你的 URL。

### VirusTotal 特别说明

**为什么 VirusTotal 结果如此重要？**

1. **多引擎交叉验证**：集成 70+ 个安全引擎（Avast、Kaspersky、Microsoft、Symantec 等）
2. **业界标准**：全球安全研究人员和企业的首选恶意软件检测服务
3. **外部验证**：提供独立的第三方验证，不依赖单一分析器
4. **可追溯性**：每个扫描都有唯一的报告链接，可供审计和验证
5. **实时更新**：病毒库持续更新，能检测最新威胁

**展示优先级**：
```
1. VirusTotal 结果（如果有）
2. 静态分析发现的 CRITICAL/HIGH 问题
3. 行为分析结果
4. LLM 分析结果
5. MEDIUM/LOW 问题
```

**即使其他分析器显示安全，VirusTotal 检测到威胁时也必须警告用户！**
