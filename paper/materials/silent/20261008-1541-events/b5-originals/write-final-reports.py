"""Render final records from completed original tools; never synthesize missing metrics."""
import datetime
import json
from pathlib import Path

S = Path(__file__).resolve().parent
ROOT = S.parents[2]


def read(name):
    return json.loads((S / name).read_text())


evidence = read('evidence.original.json')
before, after = read('before-trust.json'), read('after-trust.json')
gate, checks, pair = read('acceptance.json'), read('checks-summary.json'), read('pair-integrity.json')
ledger, archive = read('ledger-receipt.json'), read('archive-receipt.json')
live, rank, tune = read('live-audit.json'), read('ranking-summary.json'), read('tune-analysis.json')
assert not gate['accepted'] and gate['isolation']['passed']
assert before['split'] == after['split']
assert gate['isolation']['base'] == gate['isolation']['head'] == evidence['dispatch_base']
assert ledger['rc'] == 0 and ledger['ids']
base = evidence['dispatch_base']
paper = ROOT / 'paper/materials/silent/boss-sim-b5-QUEEN-20261008-112135.md'
artifact = Path(archive['path']).relative_to(ROOT)
lines = [
    '# 静默／女王 B5 校正批次 20261008-112135：rejected', '',
    '本批没有合格源码候选。冻结女王实际结局 15 场，调参 8 场、验证 7 场（3 胜 4 败），距离原 B5/B2 准入的至少 10 场还差 3 场。同 base 配对不声称校正收益；原验收拒绝，无 live 合入、无版本、无可信名单修改。', '',
    f'Roy 2026-10-07 12:11/12:35、notes/fix-queue-v4.md B4/B5 标准流程与 docs/boss-sim.md §13/14 已授权本批核实和验收。不可变证据 key/SHA256：`{evidence["key"]}` / `6661d598df1747524ca8eb5d65dfdb64f8078e9dcfd351f50ed36ce693f6c77f`；dispatch_base、source head 均为 `{base}`。启动工作树干净，live 与该 base 相同，合 live 返回 already up to date。之后没有改动生产源码或验收工具。', '',
    f'原根目录 ledger CLI 登记 rejected：`{", ".join(ledger["ids"])}`；kind=fight，触发局/回合和局号来源在请求与回执。独立分支 `boss-sim-silent-queen-20261008-112135` 保留，不把 rejected 写成 shipped。运维/调度完成通道复核验收并管理十场新实际战斗和新校准冷却，本报告不冒报后续事件。', '',
    '## 冻结输入与实际结局', '',
    '冻结 127 个已结束 SILENT 局、582 个 boss 尝试、233 个可用开场（169 won、64 died）。348 次 predicted_death（含一场同时缺开场）与另 1 次缺首回合手牌排除。原调参 107 个 keys 和 UTC 切点 2026-10-06T02:46:11.648000 不变，验证 113→126；13 个新增开场只进 val，没有整局/牌组跨两侧。', '',
    '女王 54 个 SL 尝试：39 predicted_death 截尾、8 won、7 died；所有 15 个实际结局均可用。原触发小集 13 场新增 PD9AYQVMLQW6 F48 won、9R916WW0V65N F49 died，两场同时进入配对两侧且仅进验证。F49 独立，不把 F48 胜当通关。39 次截尾 end_hp=null，不根据最后仍有血的帧推断死局。', '',
    '实际胜败由原 SL/结束证据核实；原提取器对 died 取 end_hp=0，对 won 取最后日志帧、SL 上报、同楼层后续帧中已知血量的最小值，保留战后治疗和漏末帧的边界。queen-terminal-hp-audit.json 同列原末帧/上报/提取器端点；13/15 的提取器端点与 SL 上报相同，未手工替换另外两场。', '',
    '原 states/decisions/SL 的字节 off、len、SHA256 与哈希核验留存 queen-states.compact.json（632 帧）、queen-decisions.inventory.json（622 行）、queen-sl-byte-audit.json（54 行）、queen-censor-source-integrity.json（54 个开场原字节核验）。触发 7 个死亡局、最近 20 局中的 3 个死亡局和 evidence key 均按原角色日志复算，见 trigger-audit.json。', '',
    '## 同数据、同源配对验收', '',
    f'使用原 backtest.ts，每起点 200 样本，seed=1+fights 原始行号×101，t1/pre。基准全量 {pair["rows_before"]} 行；after 女王原入口另重放 {pair["queen_replayed_rows"]} 行，其他 boss {pair["other_boss_reused_rows"]} 行按键与固定模型 SHA 核对后复用当次基准。复用不是沿用旧小集档案。仅墙钟 sim.ms 不参与语义比较；所有差异留存 pair-integrity.json：{len(pair["queen_semantic_mismatches"])} 项。', '',
    '基准由已完成原串行前缀 276 行（138 场）与原 runner --keys 的两组剩余 48/47 场串行重放拼成。两组键互斥、补齐全部 233 场；各调用保留完整 fights 文件，选择发生在原 runner 内，原行索引 seed 不变。before-partition.receipt.json / before-assembly.receipt.json 保存分区、固定前缀原字节 SHA 和完整输出 SHA。原整批串行记录单独保留、不假称其提前完成；旧等待协调器的输出路径与日志 inode 改名映射在 history.json，未向对局/调度或重放进程发送信号。', '',
    f'dataset SHA256=`{pair["dataset_sha256"]}`，sources SHA256=`{pair["sources_sha256"]}`，turns SHA256=`{pair["turns_sha256"]}`。before/after split、数据、结局和逐回合覆盖相同；两份 trust.py 自然拟合整个 tune 的全局映射，验证不拟合。模拟失败原行保留，不补造概率。', '',
    '| 起点 | 女王验证 n / 打穿回合 | before→after Brier | 预测→实际胜率（两侧） | 打穿比 before→after | 整体验证 Brier before→after |',
    '|---|---|---|---|---|---|',
]
for start in ('t1', 'pre'):
    old, new = before['bosses']['QUEEN'][start], after['bosses']['QUEEN'][start]
    lines.append(f'| {start} | {old["n"]} / {old["leak_turns"]} | {old["brier"]}→{new["brier"]} | {old["mean_pred"]}→{old["actual_win"]} | {old["leak_ratio"]}→{new["leak_ratio"]} | {before["overall"][start]["brier"]}→{after["overall"][start]["brier"]} |')
lines += ['', f'原 trust.py 的女王 T1 失败项：`{after["bosses"]["QUEEN"]["t1"]["failed"]}`；可信 B2：`{after["trusted_b2"]}`。原 immutable acceptance.py rc=1，拒绝原因 `{gate["reasons"]}`，strict improvement=`{gate["improved"]}`。', '',
          f'原验收从 dispatch_base 提取固定 runner，对同 base 的实盘 solver/五回合 14 个固定输入逐字节重放：passed={gate["isolation"]["passed"]}，SHA256=`{gate["isolation"]["output_sha256"]}`，保护源码差异 `{gate["isolation"]["shared_changes"]}`。没有候选字段、没有需证明的实盘/五回合读路径新增，铁甲源码和行为保持同 base 等价。', '',
          '逐回合原 per-turn.py 的两侧 tune/val、t1/pre 八份 JSON 和日志完整归档；实盘第一/最后帧状态与意图另存 queen-turn-boundaries.json，不把不同 SL 尝试拼成一条预测序列。', '',
          '## 调参侧机制与模拟策略', '',
          '35 个敌人/招式/已观察进阶组的攻击反解固定在 fixed-hit-mechanic-fixtures.json。ZZMYZ5UBCG72 A2 持有 PAPER_KRANE，原自身 relic 文本和攻击支持其弱化倍率 .6，其他条件按现有 .75 公式核对；初稿统一 .75 的冲突保留 tune-hit-inversion.json。扣除 PIERCING_WAIL_POWER 临时力量恢复后，26 次 Burn Bright 转换均净增 1，原 before/after 字节证据与未调整 +7/+9 数据均保留。', '',
          '现有整场模型固定攻击/力量推进存在进一步核对方向；本批只保存本角色、已观察条件证据，没有把它推到未知进阶、共享五回合或铁甲，也没有以单局概率偏差证明机制因果。无生产机制夹具/候选撤码红绿对照；不伪称 fails_without_fix=true。', '',
          '只在原 tune keys 探索原 runner 支持的 QUEEN threat=1/2；各 8 场×两个起点×200 样本。全局映射和 whole-run 3-fold OOF 都只使用 tune；未以验证选择参数，release_selection=null。两个加强 threat 的试验都降低打穿比，但 T1/pre 的女王 OOF Brier 均比 base 更差，因此没有形成合格源码候选。214 个调参起点完成后的初次分析与完整回放后的分析分别保留，不覆盖早期结果。', '',
          '| threat | 起点 | tune 女王 n | 原始 Brier | 女王 tune OOF Brier | 全体 tune OOF Brier | 打穿比 |',
          '|---|---|---|---|---|---|---|']
for setting, starts in tune['configurations'].items():
    for start, row in starts.items():
        lines.append(f'| {setting} | {start} | {row["queen_n"]} | {row["raw_queen"]["brier"]} | {row["queen_oof_brier"]} | {row["global_oof_brier"]} | {row["raw_queen"]["leak"]["enemy_ratio"]} |')
lines += ['', '## 实盘整场预测与 B2 排序覆盖', '',
          f'原实盘预测覆盖 {live["all_turns"]["attempts"]} 个实际尝试、{live["all_turns"]["n"]} 回合；历史 chosen-line Brier={live["all_turns"]["brier"]:.6f}。历史 T1 7 场，预测 .470714、实际 .285714、Brier .134228；第一可用预测按场 8 条 Brier .117449。历史模型版本、样本 150–1200 和超时记录均保留，不能替代本批固定 200 样本校准。39 个回合中 19 个选择首线，35 个在两个配对 SE 内。各场首个预测平均校准差 .0035，是模型分歧，不是实盘胜率收益，不跨回合相加。', '',
          f'新固定排序输入覆盖 8 个首次可用点、69 个同尝试/回合原状态候选，以原 fingerprint 精确匹配。仅 {rank["complete_points"]}/{rank["points"]} 组能重构全部原选项；缺任意选项即跳过，不缩选项宣称收益。原记录缺 seed/逐样本 outcomes，重放使用原默认 seed=7、200 配对样本、无墙钟截断、原 compareLines 与两 SE 并列后存活 HP 中位数口径。', '',
          'VLV17NUSFS61 F48 T1（tune）最佳 plan4、原选 plan5，差 .005、配对 SE .005，仅 1 个“最佳胜而原选败”的样本，仍是胜率并列；XTSV1U9JD34T F49 T2（val）原选 plan3 和最佳 plan1 的胜败/血量完全并列。其余 6 组原选项缺失逐项归档，不能得出整体验证排序收益。', '',
          '## 原检查、失败历史与保存路径', '',
          f'原入口 `nice -n 19 bash tools/test-sandbox.sh`，PATH 加 ~/.local/node/bin，TMPDIR 为本批目录，SANDBOX_WORKERS=1；tsc={checks["tsc"]}、vitest={checks["vitest"]}、固定测试 {checks["cases"]} 例，原总 rc={checks["rc"]}。固定排除名单未改，不安装依赖，不运行 play，不停对局/调度，不联网或读取游戏包、key/.env。外部完整检查沿调度器原通道，本批不冒报。', '',
          '全部初稿失败保留 history.json、各原日志、tool-failures.original.jsonl/index.json：extraction wrapper cutoff 字段错误退出 1；初次根目录 tsx 调用模块缺失退出 1；排序时间过滤初稿/不完整选项/精确生成方案尝试保留；报告括号笔误退出 1；排序回执变量遮蔽 wrapper 退出 1（原重放 rc=0）；沙箱启动扫描撞并行临时文件消失，命令未启动、只读重试后成功。没有改弱调度/验收/断言，也没有扩范围。', '',
          f'原验收：`{S / "acceptance.json"}`；原检查：`{S / "test-sandbox.original.log"}`。固定完整档案：`{artifact}`，manifest SHA256=`{archive["manifest_sha256"]}`，{archive["files"]} 个文件。sources/fights/turns、split、两侧 provenance/results/trust、tune 试验、原字节审计、隔离输出、失败历史和固定角色/公共模型输入均保留；旧目录未覆盖。', '',
          f'最终回报：`{S / "report.md"}` / `{S / "report.json"}`；源码 commit=`{base}`，无候选则沿原 base 回报，merged=null、version=""。升级小结仅追加自己工作树 notes/silent-climb-report.md 引用。', '']
paper.parent.mkdir(parents=True, exist_ok=True)
paper.write_text('\n'.join(lines))
(S / 'report.md').write_text('\n'.join(lines))
report = {'task': 'fix-batch', 'base': base, 'fixes': [{'item': 'Roy 已授权独立功能：silent/QUEEN B5 校正', 'commit': base,
          'test': f'{S / "test-sandbox.original.log"}; {S / "acceptance.json"}', 'fails_without_fix': False}], 'skipped': [],
          'merged': None, 'tests': {key: checks[key] for key in ('tsc', 'vitest', 'cases')},
          'boss_sim': {'evidence_key': evidence['key'], 'outcome': 'rejected', 'acceptance': str(S / 'acceptance.json'), 'ledger_ids': ledger['ids']},
          'version': '', 'reports': [str(paper), str(S / 'report.md'), str(S / 'report.json')]}
(S / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=1)+'\n')
print(json.dumps(report, ensure_ascii=False))
