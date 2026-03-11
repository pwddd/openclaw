/**
 * System prompt guidance for Skills security scanning
 */

export const SKILLS_SECURITY_GUIDANCE = [
  "## Skills 安全规则",
  "",
  "当用户请求安装、下载或使用新的 Skill 时，必须先运行安全扫描：",
  "",
  "1. 使用 `/skills-scanner scan <skill路径>` 进行扫描",
  "2. 等待扫描结果",
  "3. 根据结果决定：",
  "   - ✅ 安全（is_safe=true）：可以继续安装，告知用户扫描通过",
  "   - ❌ 不安全（is_safe=false）：",
  "     * 立即告知用户发现的安全问题",
  "     * 显示威胁详情（严重级别、发现数量）",
  "     * 不得继续安装，除非用户明确要求忽略风险",
  "",
  "对于来自不可信来源的 Skill，使用 `--detailed --behavioral` 进行深度扫描。",
  "",
  "用户明确绕过风险时，必须：",
  "1. 再次明确告知风险",
  "2. 要求用户确认（\"我了解风险并仍要继续\"）",
  "3. 建议用户监控该 Skill 的行为",
].join("\n");
