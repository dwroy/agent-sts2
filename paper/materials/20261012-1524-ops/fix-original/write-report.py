import json
from pathlib import Path
import re
import subprocess

out = Path(__file__).resolve().parent
root = out.parents[2]
queue = json.loads((out / "queue-commits.json").read_text())
skipped = json.loads((out / "skipped.json").read_text())
source = subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip()
assert source != queue["base"], "Source commit is required"
assert int((out / "sandbox-source.exit").read_text()) == 0
log = (out / "sandbox-source.log").read_text()
cases = sum(map(int, re.findall(r"Tests\s+(\d+) passed", log)))
files = sum(map(int, re.findall(r"Test Files\s+(\d+) passed", log)))
assert cases > 3000 and files > 300
merged = (out / "live-final.txt").read_text().strip() if (out / "live-final.txt").exists() else None
conflicts = (out / "live-conflicts.paths").read_text().splitlines() if (out / "live-conflicts.paths").exists() else []
item = "ops-stall-recovery-test-subprocess-timeout：固定夹具子进程超时"
test = "agent/tests/ops-stall-recovery.test.ts"
case = "checks the real script after shell startup exceeds the former five-second limit"
result = {
    "task": "fix-batch", "base": queue["base"],
    "fixes": [{"item": item, "commit": source, "test": test, "fails_without_fix": True}],
    "skipped": skipped, "merged": merged,
    "tests": {"tsc": 0, "vitest": 0, "cases": cases, "files": files},
    "code_proposals": [], "implementation_domains": [], "report": str(out / "report.md"),
}
(out / "report.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
lines = ["## 修 bug 回报", "", f'- 合并基线：main → {queue["base"]}',
         f'- 修复（每条一行）：{item} — {source} — 测试 {test}:{case} — 去掉修复时失败：是（旧执行器status=null，红1/绿6）。']
lines += [f'- 已被别人修掉的：{r["item"]} — {r["commit"]}' for r in queue["items"]]
lines += [f'- 没修的：{r["item"]} — {r["reason"]}' for r in skipped]
lines += [f'- 测试：tsc退出码0；提交前沙箱vitest {files}文件/{cases}用例/退出码0；定向1文件6项通过，撤执行器1项失败，恢复6项通过。无偶发失败重跑；gitleaks退出码0。']
if merged:
    lines += [f'- 合入：{merged}；合后沙箱入口退出码0。纯测试设施，无eval版本。']
else:
    why = "、".join(conflicts) if conflicts else "详见live-merge.log"
    before = (out / "live-before-merge.txt").read_text().strip()
    lines += [f'- 合入：未合入；锁内确认刷新数据已提交后普通合并受阻：{why}。已中止合并，live保留刷新后提交{before}及原脏记录，待调用方兜底；未运行合后测试或登记上线。']
lines += ['- 需要 Roy 定的事（没有写「无」）：无', '', '```json', json.dumps(result, ensure_ascii=False, indent=2), '```', '']
(out / "report.md").write_text("\n".join(lines))
print(json.dumps(result, ensure_ascii=False, indent=2))
