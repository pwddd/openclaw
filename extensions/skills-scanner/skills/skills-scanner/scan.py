# /// script
# dependencies = [
#   "requests>=2.31.0",
# ]
# ///
"""
OpenClaw Skills 安全扫描器 (HTTP 客户端)
通过 HTTP API 调用远程 skill-scanner-api 服务

注意：此脚本使用系统 Python 运行，需确保已安装 requests 依赖
"""

import sys
import os
import json
import argparse
import tempfile
import zipfile
import time
from pathlib import Path
from typing import Optional, Dict, Any, List

# 依赖检查
try:
    import requests
except ImportError as e:
    print("❌ requests 未安装。")
    print(f"   导入错误: {e}")
    print("   请运行: pip install requests")
    sys.exit(1)


# 配置
DEFAULT_API_URL = "https://110.vemic.com/skills-scanner"
REQUEST_TIMEOUT = 180  # 3 分钟


# 颜色输出
USE_COLOR = sys.stdout.isatty()

def c(text, code):
    return f"\033[{code}m{text}\033[0m" if USE_COLOR else text

RED    = lambda t: c(t, "31")
YELLOW = lambda t: c(t, "33")
GREEN  = lambda t: c(t, "32")
CYAN   = lambda t: c(t, "36")
BOLD   = lambda t: c(t, "1")
DIM    = lambda t: c(t, "2")


# HTTP 客户端
class SkillScannerClient:
    """skill-scanner HTTP API 客户端"""
    
    def __init__(self, base_url: str = DEFAULT_API_URL):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
    
    def health_check(self) -> Dict[str, Any]:
        """健康检查，返回详细信息"""
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=5)
            response.raise_for_status()
            return {
                'status': 'healthy',
                'data': response.json()
            }
        except requests.exceptions.ConnectionError:
            return {
                'status': 'unreachable',
                'error': f'无法连接到 {self.base_url}'
            }
        except requests.exceptions.Timeout:
            return {
                'status': 'timeout',
                'error': '请求超时'
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def scan_upload(
        self,
        skill_path: str,
        policy: str = "balanced",
        use_llm: bool = False,
        use_behavioral: bool = False
    ) -> Dict[str, Any]:
        """上传 ZIP 文件扫描（单个 Skill）
        
        API: POST /scan-upload
        - 上传 ZIP 文件
        - 服务器解压并查找 SKILL.md
        - 返回扫描结果
        """
        with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as tmp_zip:
            zip_path = tmp_zip.name
        
        try:
            self._create_zip(skill_path, zip_path)
            
            with open(zip_path, 'rb') as f:
                files = {'file': (os.path.basename(skill_path) + '.zip', f, 'application/zip')}
                data = {
                    'policy': policy,
                    'use_llm': str(use_llm).lower(),
                    'use_behavioral': str(use_behavioral).lower(),
                    # Enable in-depth safety checks by default
                    'use_zip_virus': 'true',
                    'enable_meta': 'true',
                }
                
                response = self.session.post(
                    f"{self.base_url}/scan-upload",
                    files=files,
                    data=data,
                    timeout=REQUEST_TIMEOUT
                )
                response.raise_for_status()
                return response.json()
        finally:
            if os.path.exists(zip_path):
                os.unlink(zip_path)
    
    def scan_batch_upload(
        self,
        skill_paths: List[str],
        policy: str = "balanced",
        use_llm: bool = False,
        use_behavioral: bool = False
    ) -> List[Dict[str, Any]]:
        """批量上传多个 Skill（客户端循环）"""
        results = []
        
        for i, skill_path in enumerate(skill_paths, 1):
            print(f"[{i}/{len(skill_paths)}] 正在扫描: {skill_path}")
            
            try:
                result = self.scan_upload(
                    skill_path,
                    policy=policy,
                    use_llm=use_llm,
                    use_behavioral=use_behavioral
                )
                results.append({
                    'path': skill_path,
                    'success': True,
                    'result': result
                })
                status = "✓" if result.get('is_safe', False) else "✗"
                print(f"  {status} {result.get('skill_name', 'Unknown')}: {result.get('findings_count', 0)} 个发现")
            except Exception as e:
                results.append({
                    'path': skill_path,
                    'success': False,
                    'error': str(e)
                })
                print(f"  ✗ 失败: {e}")
        
        return results
    
    def scan_clawhub(
        self,
        clawhub_url: str,
        policy: str = "balanced",
        use_llm: bool = False,
        use_behavioral: bool = True
    ) -> Dict[str, Any]:
        """扫描 ClawHub 上的 Skill
        
        API: POST /scan-clawhub
        - 提供 ClawHub URL
        - 服务器自动下载并扫描
        - 返回扫描结果
        
        Args:
            clawhub_url: ClawHub 项目 URL (例如: https://clawhub.ai/username/project)
            policy: 扫描策略
            use_llm: 是否启用 LLM 分析
            use_behavioral: 是否启用行为分析
        """
        data = {
            'clawhub_url': clawhub_url,
            'policy': policy,
            'use_llm': use_llm,
            'use_behavioral': use_behavioral,
            'llm_provider': 'anthropic',
            'use_virustotal': False,
            'use_aidefense': False,
            'use_trigger': False,
            'use_zip_virus': True,
            'enable_meta': True
        }
        
        response = self.session.post(
            f"{self.base_url}/scan-clawhub",
            json=data,
            timeout=REQUEST_TIMEOUT
        )
        response.raise_for_status()
        return response.json()
    
    @staticmethod
    def _create_zip(source_dir: str, zip_path: str):
        """创建 ZIP 文件"""
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            source_path = Path(source_dir)
            for file_path in source_path.rglob('*'):
                if file_path.is_file():
                    arcname = file_path.relative_to(source_path.parent)
                    zipf.write(file_path, arcname)


# 格式化输出
def format_scan_result(result: Dict[str, Any], detailed: bool = False) -> str:
    """格式化扫描结果"""
    lines = []
    
    skill_name = result.get('skill_name', 'Unknown')
    is_safe = result.get('is_safe', False)
    max_severity = result.get('max_severity', 'NONE')
    findings_count = result.get('findings_count', 0)
    
    status_icon = GREEN("✓") if is_safe else RED("✗")
    lines.append(f"{status_icon} {BOLD(skill_name)}")
    lines.append(f"  严重性: {_severity_color(max_severity)}")
    lines.append(f"  发现数: {findings_count}")
    
    if detailed and findings_count > 0:
        findings = result.get('findings', [])
        lines.append("")
        lines.append(BOLD("发现详情:"))
        for i, finding in enumerate(findings[:10], 1):
            severity = finding.get('severity', 'UNKNOWN')
            category = finding.get('category', 'Unknown')
            description = finding.get('description', 'No description')
            lines.append(f"  {i}. [{_severity_color(severity)}] {category}")
            lines.append(f"     {description}")
        
        if len(findings) > 10:
            lines.append(f"  ... 还有 {len(findings) - 10} 条发现")
    
    return "\n".join(lines)


def format_batch_result(result: Dict[str, Any]) -> str:
    """格式化批量扫描结果"""
    lines = []
    
    total = result.get('total_skills_scanned', 0)
    safe = result.get('safe_skills', 0)
    unsafe = result.get('unsafe_skills', 0)
    
    lines.append(BOLD("批量扫描结果"))
    lines.append(f"  总计: {total} 个 Skills")
    lines.append(f"  安全: {GREEN(str(safe))}")
    lines.append(f"  问题: {RED(str(unsafe))}")
    
    if unsafe > 0:
        skills = result.get('skills', [])
        unsafe_skills = [s for s in skills if not s.get('is_safe', True)]
        lines.append("")
        lines.append(BOLD("问题 Skills:"))
        for skill in unsafe_skills[:10]:
            name = skill.get('skill_name', 'Unknown')
            severity = skill.get('max_severity', 'UNKNOWN')
            count = skill.get('findings_count', 0)
            lines.append(f"  • {name} [{_severity_color(severity)}] - {count} 条发现")
    
    return "\n".join(lines)


def _severity_color(severity: str) -> str:
    """严重性着色"""
    severity_upper = severity.upper()
    if severity_upper in ('CRITICAL', 'HIGH'):
        return RED(severity_upper)
    elif severity_upper == 'MEDIUM':
        return YELLOW(severity_upper)
    elif severity_upper == 'LOW':
        return CYAN(severity_upper)
    else:
        return DIM(severity_upper)


# 命令行接口
def main():
    parser = argparse.ArgumentParser(
        description="OpenClaw Skills 安全扫描器 (HTTP 客户端)",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        '--api-url',
        default=DEFAULT_API_URL,
        help=f'API 服务地址 (默认: {DEFAULT_API_URL})'
    )
    
    subparsers = parser.add_subparsers(dest='command', help='命令')
    
    # scan 命令
    scan_parser = subparsers.add_parser('scan', help='扫描单个 Skill（上传 ZIP）')
    scan_parser.add_argument('path', help='Skill 目录路径')
    scan_parser.add_argument('--detailed', action='store_true', help='显示详细发现')
    scan_parser.add_argument('--behavioral', action='store_true', help='启用行为分析')
    scan_parser.add_argument('--llm', action='store_true', help='启用 LLM 分析')
    scan_parser.add_argument('--policy', default='balanced', choices=['strict', 'balanced', 'permissive'], help='扫描策略')
    scan_parser.add_argument('--json', metavar='FILE', help='输出 JSON 到文件')
    
    # batch 命令（客户端批量上传）
    batch_parser = subparsers.add_parser('batch', help='批量扫描多个 Skills（客户端循环）')
    batch_parser.add_argument('paths', nargs='+', help='多个 Skill 目录路径')
    batch_parser.add_argument('--behavioral', action='store_true', help='启用行为分析')
    batch_parser.add_argument('--llm', action='store_true', help='启用 LLM 分析')
    batch_parser.add_argument('--policy', default='balanced', choices=['strict', 'balanced', 'permissive'], help='扫描策略')
    batch_parser.add_argument('--json', metavar='FILE', help='输出 JSON 到文件')
    
    # clawhub 命令
    clawhub_parser = subparsers.add_parser('clawhub', help='扫描 ClawHub 上的 Skill')
    clawhub_parser.add_argument('url', help='ClawHub 项目 URL (例如: https://clawhub.ai/username/project)')
    clawhub_parser.add_argument('--detailed', action='store_true', help='显示详细发现')
    clawhub_parser.add_argument('--behavioral', dest='behavioral', action='store_true', help='启用行为分析')
    clawhub_parser.add_argument('--no-behavioral', dest='behavioral', action='store_false', help='关闭行为分析')
    clawhub_parser.set_defaults(behavioral=True)
    clawhub_parser.add_argument('--llm', action='store_true', help='启用 LLM 分析')
    clawhub_parser.add_argument('--policy', default='balanced', choices=['strict', 'balanced', 'permissive'], help='扫描策略')
    clawhub_parser.add_argument('--json', metavar='FILE', help='输出 JSON 到文件')
    
    # health 命令
    subparsers.add_parser('health', help='健康检查')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    client = SkillScannerClient(args.api_url)
    
    try:
        if args.command == 'health':
            health_result = client.health_check()
            
            if health_result['status'] == 'healthy':
                print(GREEN("✓") + " API 服务正常")
                
                data = health_result.get('data', {})
                if data:
                    print(f"  版本: {data.get('version', 'Unknown')}")
                    analyzers = data.get('analyzers_available', [])
                    if analyzers:
                        print(f"  可用分析器: {', '.join(analyzers)}")
                    print(json.dumps(data))
                
                sys.exit(0)
            else:
                print(RED("✗") + f" API 服务不可用: {args.api_url}")
                error = health_result.get('error', '未知错误')
                print(f"  错误: {error}")
                sys.exit(1)
        
        elif args.command == 'scan':
            print(f"正在扫描: {args.path}")
            result = client.scan_upload(
                args.path,
                policy=args.policy,
                use_llm=args.llm,
                use_behavioral=args.behavioral
            )
            
            if args.json:
                with open(args.json, 'w') as f:
                    json.dump(result, f, indent=2)
                print(f"结果已保存到: {args.json}")
            else:
                print(format_scan_result(result, args.detailed))
            
            sys.exit(0 if result.get('is_safe', False) else 1)
        
        elif args.command == 'batch':
            print(f"正在批量扫描 {len(args.paths)} 个 Skills...")
            results = client.scan_batch_upload(
                args.paths,
                policy=args.policy,
                use_llm=args.llm,
                use_behavioral=args.behavioral
            )
            
            total = len(results)
            success = sum(1 for r in results if r['success'])
            failed = total - success
            
            if args.json:
                with open(args.json, 'w') as f:
                    json.dump(results, f, indent=2)
                print(f"\n结果已保存到: {args.json}")
            
            print(f"\n批量扫描完成: {success}/{total} 成功, {failed} 失败")
            sys.exit(0 if failed == 0 else 1)
        
        elif args.command == 'clawhub':
            print(f"正在扫描 ClawHub Skill: {args.url}")
            result = client.scan_clawhub(
                args.url,
                policy=args.policy,
                use_llm=args.llm,
                use_behavioral=args.behavioral
            )
            
            if args.json:
                with open(args.json, 'w') as f:
                    json.dump(result, f, indent=2)
                print(f"结果已保存到: {args.json}")
            else:
                print(format_scan_result(result, args.detailed))
            
            sys.exit(0 if result.get('is_safe', False) else 1)
    
    except requests.exceptions.ConnectionError:
        print(RED("✗") + f" 无法连接到 API 服务: {args.api_url}")
        print("请确保 skill-scanner-api 服务正在运行")
        sys.exit(1)
    except requests.exceptions.Timeout:
        print(RED("✗") + " 请求超时")
        sys.exit(1)
    except requests.exceptions.HTTPError as e:
        print(RED("✗") + f" HTTP 错误: {e}")
        if e.response is not None:
            try:
                error_detail = e.response.json()
                print(f"详情: {error_detail}")
            except:
                print(f"响应: {e.response.text}")
        sys.exit(1)
    except Exception as e:
        print(RED("✗") + f" 错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
