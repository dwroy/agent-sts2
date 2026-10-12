"""Write the rejected batch report from completed, immutable result records."""
from datetime import datetime
import hashlib
import json
from pathlib import Path
import subprocess

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
e = json.loads((OUT / 'dispatch-evidence.json').read_text())
b = json.loads((OUT / 'before-trust.json').read_text())
a = json.loads((OUT / 'after-trust.json').read_text())
gate = json.loads((OUT / 'acceptance.json').read_text())
checks = json.loads((OUT / 'sandbox-summary.json').read_text())
pair = json.loads((OUT / 'paired-replay-proof.json').read_text())
guard = json.loads((OUT / 'live-guard-latest.json').read_text())
ledger_ids = (OUT / 'ledger-ids.txt').read_text().split()
assert gate['accepted'] is False and ledger_ids
assert b == a and b['split'] == a['split']
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip() == e['dispatch_base']
assert not subprocess.check_output(['git', 'diff', '--name-only', '--', 'agent', 'knowledge'], cwd=ROOT, text=True).strip()


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


identity = {'evidence_key': e['key'], 'base': e['dispatch_base'],
            'dataset': sha(OUT / 'dataset/fights.jsonl'), 'split': sha(OUT / 'split.json'),
            'before_trust': sha(OUT / 'before-trust.json'),
            'acceptance': sha(OUT / 'acceptance.json'), 'batch': '20261007-215921-fix-batch'}
artifact_id = hashlib.sha256(json.dumps(identity, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
artifact = ROOT / 'experiments/boss-sim/silent' / artifact_id
paper = ROOT / 'paper/materials/silent/boss-sim-b4-THE_INSATIABLE-20261007-215921.md'
report = {'task': 'fix-batch', 'base': e['dispatch_base'],
          'fixes': [{'item': 'Roy 已授权独立功能：silent/THE_INSATIABLE B4 校正',
                     'commit': e['dispatch_base'],
                     'test': f'{OUT}/sandbox-checks.log; {OUT}/acceptance.json',
                     'fails_without_fix': False}],
          'skipped': [], 'merged': None, 'tests': checks['tests'],
          'boss_sim': {'evidence_key': e['key'], 'outcome': 'rejected',
                       'acceptance': str(OUT / 'acceptance.json'), 'ledger_ids': ledger_ids},
          'version': '', 'reports': [str(paper), str(OUT / 'report.md'), str(OUT / 'report.json'), str(artifact / 'report.md')]}
(OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=1) + '\n')

body = (OUT / 'report-outline.md').read_text().split('## 历史与最终回报待填')[0]
body = body.replace('正式 before/after、验收和检查完成后写最终报告，本文件只保留草稿。',
                    f'原版验收实际退出 {int((OUT / "acceptance.rc").read_text())}，原因：{"；".join(gate["reasons"])}。')
old = 'live 启动时与基准保护源码一致。候选期间 live 推进到 a881e27a54e458bd027244db12503e96197d6e51，保护范围涉及 brain/build-facts、knowledge/boss-phase、memory/run-plan、sim/boss-clock、sim/build-sim-facts；原验收 isolate 的范围检查自然失败。最终组合需范围外源码的重新验证，本批不扩范围、不替换 base，不把并行改动归本任务。'
new = f'live 启动时与基准保护源码一致；首次合 live 无变化。运行期间 live 推进到 {guard["head"]}，原 isolate 范围检查失败，保护变化为 `{json.dumps(guard["protected_changes"], ensure_ascii=False)}`。早期 a881e27a 的五路径失败与最新观察均保留，不能换 dispatch_base 绕过检查。最终组合需要范围外源码的重新验证，本批不扩范围，不把并行改动归本任务。'
assert old in body
body = body.replace(old, new)
body += '\nSL 截尾造成选择偏差：校准胜率以取得实际结局的尝试为条件，不能解释为初试胜率或允许 SL 的整局通关率。F48 胜只计该战，F49 是另一战，不推断 F48→F49 联合通关。样本横跨历史代码版本，验证的是本档案固定模型，不冒称后来 live 组合已经通过。授权原节为根目录 notes/fix-queue-v4.md 的 2026-10-07 12:11「B4 / B5 纳入标准流程」、docs/boss-sim.md §13/14 及本批 Roy 12:11/12:35 授权；门槛与隔离工具保持原版。\n'
body += '\n## 冻结配对结果\n\n'
body += f'完成 {pair["before_rows"]}/{pair["after_rows"]} 行 T1/pre 重放，197 场 × 两起点，均为 200 样本。目标 boss {pair["target_rows_independently_replayed"]} 行独立重复，除 sim.ms 耗时外所有记录相同；其他 boss {pair["other_boss_rows_reused_by_exact_key"]} 行按完全相同源码/输入与 exact key 核对复用。分段原件、重复核对及自然退出状态另存 parallel-replay-proof.json 与 history/exit-statuses.json。\n\n'
body += '| 范围 / 起点 | 验证 n | Brier before=after | 平均预测 / 实胜率 | 打穿比 | leak 回合对 | 失败标准 |\n|---|---|---|---|---|---|---|\n'
for start in ('t1', 'pre'):
    o = b['overall'][start]
    q = b['bosses'][e['boss']][start]
    body += f'| 整体 / {start} | {o["n"]} | {o["brier"]} | {o["mean_pred"]} / {o["actual_win"]} | {o["leak"]["enemy_ratio"]} | {o["leak"]["n"]} | — |\n'
    body += f'| THE_INSATIABLE / {start} | {q["n"]} | {q["brier"]} | {q["mean_pred"]} / {q["actual_win"]} | {q["leak_ratio"]} | {q["leak_turns"]} | {",".join(q["failed"])} |\n'
body += f'\n整体 T1/pre Brier 增量均为 0。两份原 trust.py 档案逐字节一致，SHA256 `{sha(OUT / "before-trust.json")}`；覆盖和结局逐项一致见 validation-coverage.json。总体 Platt 与进阶项的选择都只看原 tune，选择详情原样保留在 trust 的 selection/overall 内。自然 B2 可信 `{b["trusted_b2"]}`、B3 可信 `{b["trusted_b3"]}`；没有手写可信名单，也没有将生成档案覆盖到运行时 knowledge。\n\n'
body += f'调参候选 107 场，两起点模拟成功拟合均 {b["overall"]["t1"]["tune_n"]} 场；验证候选 90 场，两起点成功均 {b["overall"]["t1"]["n"]} 场。失败在 tune，验证集没有因此缺预测。\n\n'
body += f'模拟缺失原件：`{json.dumps(pair["errors"], ensure_ascii=False)}`。这些记录保留在两侧 results 中，原 trust.py 自然排除预测失败；原始可用数据总数不因此改写。目标 boss 两起点结局/逐回合覆盖一致。旧触发档案只有 5 个验证目标战，当前两侧均 8 个；旧指标仅解释触发，不用于冒称本批改善。\n\n'
body += '| 固定输入 | SHA256 |\n|---|---|\n'
for path in ['dataset/fights.jsonl', 'dataset/sources.jsonl', 'dataset/turns.jsonl', 'split.json']:
    body += f'| {path} | {sha(OUT / path)} |\n'
body += f'\n模型输入指纹 `{b["source"]["model_sha256"]}`，逐文件 SHA 见 before/after-provenance.json；固定游戏目录缓存和旧运行时校准档案见 fixed-input/。角色模型只使用静默数据，common 只沿用固定既有模型，没有复制铁甲经验。没有新增 fullFight 字段；源码完全等于基准，铁甲、实盘和五回合路径均保持原代码。\n\n'
body += '开场归一化是固定 runner 的既有口径：17 场目标中 2 场模型开场 HP 比原日志高 9，另 15 场相同；逐项原 offset/len/SHA 见 opening-normalization-audit.json。此项只证明输入变换，不发明 HP 波动机制，也不声称所有 HP/牌效果都已核实。归一化审计手牌 cost 字段为空，未据此得出费用机制；82 个完整原帧保留实际 energy_cost 等原字段。胜局 LRN0HPZ0FZS1 的 states 候选终局 HP=47、SL reported=48，沿原 extractor 取最小候选 47，保留原来源；终局缺下一帧的 enemy-turn loss 仍为 null。\n\n'
body += '## 原版验收与检查\n\n'
body += f'基准及 --head 都为 {e["dispatch_base"]}（无候选例外），不可换成 live 或记录提交。acceptance.py/trust.py/backtest-runner.ts/isolation.ts 与基准 Git 字节相同，基准验收备份及 SHA 见 baseline-gate-sha256.json。正式验收 `{OUT}/acceptance.json`，实际 rc=1、accepted=false；拒绝原因 `{gate["reasons"]}`。\n\n'
body += f'正式 BASE/BASE 隔离 passed={gate["isolation"]["passed"]}，固定实盘求解/五回合输出 SHA `{gate["isolation"]["output_sha256"]}`，逐字节相同；原输出在 acceptance/before.isolation.json 与 after.isolation.json。live 保护变化的范围失败是另一份记录，未与 BASE/BASE 隔离结果混淆。\n\n'
body += f'原 `nice -n 19 bash tools/test-sandbox.sh`，PATH 加 ~/.local/node/bin、TMPDIR 指本批目录、SANDBOX_WORKERS=1；实际结果 `{checks["tests"]}`、原入口 rc={checks["script_rc"]}，日志 `{OUT}/sandbox-checks.log`。无候选源码，撤实现红/恢复绿不适用，fails_without_fix=false；固定状态夹具只留证据，不冒充新增通过的单元测试。\n\n'
body += '初稿 provenance 占位 import、root cwd 缺 tsx、审计 power id 误用均实际 rc=1，纠正版本另记；compact piles 分组误读初稿 rc=0 但结果无效，原结果与纠正核实全部保留。默认 gitleaks 首次对证据 key 的 SHA256 报 generic-api-key/rc=1；经预先独立重算确认这是非凭据摘要，只加入该确切摘要值的例外并保留所有默认规则后通过，原命中、原 rc、核实与扫描配置均留存。提交前全部指定文件扫描另存 gitleaks-final.log/rc，未读取 key 文件或 .env。\n\n'
body += '## 拒绝台账、归档与后续通道\n\n'
body += f'根目录 ledger CLI 实际新增 kind=fight/status=rejected：`{ledger_ids}`，具体触发局/回合、范围与验收路径见 ledger-item.json/ledger-add.json。未修改旧 silent-0244 状态，未登记 proposed/accepted/shipped，未合 live、未持发布锁、未创建版本。没有可证实的范围内源码校正；tune .7 是未验证的后续线索，不能作为当前 after 或最终 live 组合。\n\n'
body += f'新独立档案 `{artifact}`，旧目录保持。原日志只读，未运行 play、联网、装依赖、读取游戏包或 key/.env，未停游戏/调度、未修改运维 prompt。记录提交留在独立分支；本回报直接交调度完成通道，不等待后续事件。调度器自行复核原基准/数据/隔离/rejected 台账并设置新战斗与校准冷却，本批不伪造 fix-done 或外部完整检查。\n\n'
body += f'完成时间 `{datetime.now().astimezone().isoformat()}`；复现命令、返回值和全部失败历史在本批归档。\n\n```json\n{json.dumps(report, ensure_ascii=False, indent=1)}\n```\n'
paper.write_text(body)
(OUT / 'report.md').write_text(body)
(OUT / 'planned-artifact-path.txt').write_text(str(artifact) + '\n')
print(json.dumps({'report': str(paper), 'artifact': str(artifact), 'ledger_ids': ledger_ids}, ensure_ascii=False))
