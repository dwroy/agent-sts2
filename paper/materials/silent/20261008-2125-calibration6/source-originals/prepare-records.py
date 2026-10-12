"""Save this calibration batch's proposed ledger payload and publication report."""
import json
from pathlib import Path
import shutil

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
trust = json.loads((ROOT / "knowledge/characters/silent/boss-trust.json").read_text())
artifact = trust["refresh"]["artifact"]
archive = HERE / artifact
new = json.loads((HERE / "new-fights.json").read_text())
report = ROOT / "paper/materials/silent/boss-sim-calibration.md"
extras = (
    "\n## 本批输入及重放审计\n\n"
    "本批任务为 Roy 已授权新功能的定期校准刷新，新增20次实际结局（13胜/7死），仅扩展验证134→154。"
    "107调参keys、UTC切点、各起点整体Platt及进阶项选择均与上一发布相同，未使用新验证集拟合。\n\n"
    "261个开场已按原始states偏移/长度/SHA256逐一核实，我方状态完全一致。旧241场输入、行序、回合记录、"
    "数值源码、模型数据及game-data与上批相同；本批源码差异仅Codex引擎/cache和经验题面文字，"
    "离线数值流程不读取这些差异。5条旧样本重放除耗时外完全相同后，复用旧指纹目录的482条原结果，"
    "全部20场新样本重放t1/pre共40条，seed仍按完整数据原始行号计算。不是冒称全量重新模拟。"
    "初始全量重放主动中断exit130，5条部分结果和原日志完整保留在本批scratch。"
    "result-reuse-audit.json及source/input审计保存复用来源、旧/新模型指纹和边界。\n\n"
    "A10有170个可用开场，215个boss部件HP和开场记录均来自A10；有伤害记录的49个招式中48项来自A10，"
    "实验体BIG_POUNCE一项仍由A9估值（45×1，角色内比率1，n=4）；27个无伤害记录条目不是已验证的伤害。"
    "35个开场需按既有模型修正首击数值，已统一按DB输入，不另添加机制。"
    "F49实际结局9次、可用开场8次；F48战胜不等于整局通关。"
    "完整输入审计见opening-source-integrity.json、opening-audit.json、model-input-audit.json。\n\n"
    "合入仅同步本批静默boss-trust、报告和新指纹目录；其他角色和任何费用/药水/保血/目标/SL阈值保持原样。"
    "live后续知识刷新沿锁内流程保留；本报告验证固定模型及样本，不冒称未来模型版本或实际策略收益。\n"
)
report.write_text(report.read_text() + extras)
(archive / "published-report.md").write_bytes(report.read_bytes())
for name in ("previous-trust.json", "result-reuse-audit.json", "opening-source-integrity.json", "opening-audit.json",
             "first-hit-audit-identifiers.json", "model-input-audit.json", "input-audit-summary.json", "new-fights.json",
             "model-changes.json", "idempotency-audit.json", "refresh.log", "refresh.exit", "new-replay.log", "new-replay.exit",
             "source-python-fixed.log", "source-python-fixed.exit", "source-dispatch-fixed.log", "source-dispatch-fixed.exit"):
    shutil.copyfile(HERE / name, archive / name)
initial = next(p for p in HERE.glob("*/results/results-0.jsonl") if p.parent.parent != archive)
shutil.copyfile(initial, archive / "initial-interrupted-results.jsonl")
parent = ROOT / "experiments/boss-sim/silent" / json.loads((HERE / "previous-trust.json").read_text())["refresh"]["artifact"]
shutil.copyfile(parent / "published-report.md", archive / "previous-published-report.md")
shutil.copyfile(Path("/home/dw/Projects/agent-sts2/data/game-data.json"), archive / "game-data-input.json")
(archive / "README.md").write_text(
    "# 静默boss校准固定批次\n\n"
    "任务20261008-204304-silent-boss-calibration；Roy授权新功能刷新，143完局/649尝试/261可用，"
    "固定107调参/154验证。20新实际结局触发，旧目录不覆盖。\n\n"
    "provenance.json保存数值源码及数据指纹；result-reuse-audit.json明确复用241旧场及重放20新场。"
    "原报告report.md与补充审计published-report.md均留存，previous-published-report.md保留上批。"
    "completed.json封存原生成文件；audit-manifest.json封存新增审计/测试。"
    "来源states开场已逐项SHA256核对；所有记录仅SILENT完局，SL截断不是实败。\n"
)
b2, b3 = trust["overall"]["t1"], trust["overall"]["pre"]
f49 = {s: trust["stage_metrics"][s]["F49"]["val"]["n"] for s in ("t1", "pre")}
claim = (f"Roy授权静默boss校准刷新新增20次实际结局（13胜/7死），143完局649尝试261可用；"
         f"固定107调参与切点，新样本仅扩验证134→154。B2/B3各106实际拟合、154验证，"
         f"Brier {b2['brier']}/{b3['brier']}，逐boss原四门槛下达标{len(trust['trusted_b2'])}/{len(trust['trusted_b3'])}项；"
         f"A10残差{trust['residuals']['t1']['val']['A10']['gap']}/{trust['residuals']['pre']['val']['A10']['gap']}。"
         f"F49实际9/可用8/验证{f49}，失败指标及缺口保留；A0–4/A5–9验证均0。复用已核实数值等价的旧结果，不新增策略阈值。")
payload = {"character": "silent", "kind": "fight", "claim": claim, "first_run": new[0]["run_id"],
           "prior": "unknown", "prior_note": "旧校准已有；新增结局的样本外校准及准入本批核实，不从旧名单推定策略收益。Roy授权架构，不提供游戏事实。",
           "status": "proposed", "by": "learner:silent-boss-calibration",
           "evidence": [{"run": r["run_id"], "floor": r["floor"], "turn": 1, "role": "support",
                         "note": f"新增实际结局{r['outcome']}，A{r['asc']}，尝试{r['attempt']}，局级代码{r['code']}；key={r['key']}；任务20261008-204304-silent-boss-calibration"} for r in new],
           "where": {"knowledge": ["knowledge/characters/silent/boss-trust.json"], "proposal": ["paper/materials/silent/boss-sim-calibration.md"]},
           "note": "授权新功能定期校准；非bug-infra。仅提出本批统计数据，上线由运维确认后登记shipped；未改出牌/药水/SL/终局策略，不新增代码提案。"}
(HERE / "ledger-add.json").write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n")
print(claim)
