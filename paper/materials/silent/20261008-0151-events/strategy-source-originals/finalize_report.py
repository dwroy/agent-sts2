import datetime as dt
import json
from pathlib import Path
import re
import subprocess

scratch = Path(__file__).resolve().parent
tree = scratch.parents[2]
live = tree.parent / "live"
base = "4bc20104aa872bf7cc367773024055c878bb67f2"
dispatch = json.loads((scratch / "dispatch.json").read_text())
proposals = json.loads((scratch / "dispatched-proposals.json").read_text())
source = (scratch / "source-commit.txt").read_text().strip()
assert (scratch / "pre-commit-sandbox.rc").read_text().strip() == "0"
log = (scratch / "pre-commit-sandbox.log").read_text()
cases = sum(int(n) for n in re.findall(r"Tests\s+(\d+) passed", log))
files = sum(int(n) for n in re.findall(r"Test Files\s+(\d+) passed", log))
assert cases > 14 and files > 1
ancestor = subprocess.run(["git", "-C", str(live), "merge-base", "--is-ancestor", source, "HEAD"]).returncode == 0
merged = None
if ancestor and (scratch / "post-merge-sandbox.rc").exists() and (scratch / "post-merge-sandbox.rc").read_text().strip() == "0":
    merged = (scratch / "live-source-merge.txt").read_text().strip()
blocked = (scratch / "live-preflight-blocked.txt").read_text().strip() if (scratch / "live-preflight-blocked.txt").exists() else ""
preview = (scratch / "live-merge-preview.txt").read_text() if (scratch / "live-merge-preview.txt").exists() else ""
conflicts = re.findall(r"CONFLICT \([^)]*\):.*? in (.+)", preview)
results = json.loads((scratch / "proposal-results-draft.json").read_text())
target = "silent-proposal-a0853bed869d77fa"
reason = "已按KV0JHNJCKXLS F33T8与silent-0245/0247实现并固定验证懒惰额度；SL权重仍缺完整受控胜线，保持原规则。"
if merged:
    results.append({"id": target, "state": "implemented", "commit": source, "reason": reason})
else:
    reason += f" 本地源码{source}尚非实际live实现：{blocked}；保留源码及原失败，交运维保留并行记录兜底后再核祖先，不登记implemented/shipped。"
    results.append({"id": target, "state": "waiting", "reason": reason})
order = {ident: i for i, ident in enumerate(dispatch["proposal_ids"])}
results.sort(key=lambda row: order[row["id"]])
report = {"task": "strategy-proposal", "base": base, "runs": dispatch["runs"], "fixes": [source],
          "skipped": [{"id": r["id"], "reason": r["reason"]} for r in results if r["id"] != target],
          "merged": merged, "tests": {"tsc": 0, "vitest": 0, "cases": cases},
          "code_proposals": dispatch["proposal_ids"], "implementation_domains": ["combat"],
          "proposal_results": results, "report": str(scratch / "report.md")}
(scratch / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
(scratch / "proposal-results.json").write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n")
table = []
for row in results:
    item = next(p for p in proposals if p["id"] == row["id"])
    table.append(f"| {row['id']} | {row['state']} | {', '.join(item['ledger'])} | {row['reason']} |")
text = f"""# 静默猎手策略任务回报

生成时间：{dt.datetime.now().astimezone().strftime('%Y-%m-%d %H:%M:%S %z')}。batch 20261008-010309-strategy-proposal；完整base {base}。本批七局均已核runs.jsonl为SILENT A10。工作树同步main无冲突后创建独立功能分支。

源码提交：{source}。实现懒惰额度中的普通防御重放1；源码及固定输入共7路径。领域combat。其余9项逐项保留waiting，不冒认已有子模型完成完整提案。原队列ID已由code_proposals.py add复验去重，返回{target}，没有重复制造待办。所有原稿、证据、账本快照和失败日志保留。

## 证据和范围

KV0JHNJCKXLS A10 F33末试T8，states279574—279577、decisions273512—273514；账本silent-0245（模型缺口）/silent-0247（机制观察），来源postmortem/20261007-194301、实现strategy-proposal/20261008-010309。旧日志计划“防御、打击、中和；hp -0/dmg34”，现场防御重放14挡后打击，手动计数2而中和被锁，1血对16/14挡实死，总伤31。

新模型将该已观察额度与手动计数分开，在求解、固定序列、重规划/重启以及后续五轮/整场模拟传播。只适用silent A10懒惰3与普通防御重放1；最后一名额重放及其他自动牌边界标未知并保留选项。原慢速/柔嫩/凋萎和其他角色/进阶路径保持等价，固定铁甲元数据等价及原凋萎回归通过。没有证据宣称另一合法先手能赢整场；SL权重、喝药/留药、终局权重和架构均未改。

另外按原始offset/SHA直接核验5PM/DUZ/CA5相关66帧，XP/751原复盘指定范围225帧、YF指定范围124帧分别保存。不同尝试不扩独立样本分母；未来新结束的silent A10局作按时间后置验证。详见proposal.md、other-raw-proof.json、paired-source-summary.json、yf-source-summary.json。

## 验证

- 最终14例固定回归：撤生产源码7失败/7通过、退出1；恢复14通过/退出0。日志target-final-withdrawn.log与target-final-restored.log完整保存。原凋萎重放10例另与新14例合跑24通过，target-ready.log保存。
- 初稿夹具漏state_version/session造成12例失败，补回原帧必需字段；随后有1条断言误把最后名额未知线当成已确定非法，按原提案范围核“无未知标记的非法线”，保留未知选项。两次初始失败target-first.log/target-second.log完整保留，未放宽实际前缀、名额、死亡或撤源码红绿断言。
- 提交前原入口bash tools/test-sandbox.sh、SANDBOX_WORKERS=1：tsc0/vitest0/总退出0，共{files}文件、{cases}例；pre-commit-sandbox.log/rc保存。未因高负载超时重跑；不冒称沙箱外完整套件通过。
- 暂存diff经过gitleaks，退出0、无泄漏；未读key/.env、未联网/调用LLM、未运行play、未安装依赖或推送。

## 合入与交接

{('源码实际成为live祖先，合后原沙箱入口通过。' if merged else '源码尚未实际合入live，merged=null；合后测试未执行，没有新eval版本或Roy规则上线通知，不登记shipped。')}

{blocked}。锁内等知识刷新并保存刷新数据；合前提交号见live-before-merge.txt，刷新回执见live-refresh-commit.log；知识重叠清单见knowledge-overlap.txt，整枝预检见live-merge-preview.txt。发现冲突即停止，未覆盖记录或撤回刷新。冲突路径：{', '.join(conflicts) if conflicts else '见预检原件'}。

运维交接：{scratch / 'proposal.md'}。如需兜底，仅移植该源码提交的7路径，并保留live并行数据/记录；实际合入后再跑合后入口、登记唯一行为版本与Roy双通知，再由运维核祖先及CLI shipped。当前本批仅经根目录learner/ledger.py追加proposed、提案/提交链接，不直接改账本或标shipped。原首证/先验/支持/重复/历史版本保持。

## 每个派发ID的处置

| ID | 状态 | 账本 | 理由及限制 |
|---|---|---|---|
{chr(10).join(table)}

最终JSON见report.json。源码、初稿、缺数据和失败日志均保留。
"""
(scratch / "report.md").write_text(text)
print(json.dumps({"source": source, "merged": merged, "tests": report["tests"], "files": files, "conflicts": len(conflicts)}, ensure_ascii=False))
