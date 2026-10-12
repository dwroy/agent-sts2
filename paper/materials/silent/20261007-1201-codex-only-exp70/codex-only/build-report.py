import csv
import datetime as dt
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).parent


def read(name):
    return json.loads((ROOT / name).read_text())


source = read('source-manifest.json')
integration = read('integration-manifest.json') if (ROOT / 'integration-manifest.json').exists() else None
sink = read('sink-source-manifest.json') if (ROOT / 'sink-source-manifest.json').exists() else None
stats = read('statistics-diff.json')
history = read('history-coverage.json')
quota = read('quota-followup.json')
deployment = read('deployment.json') if (ROOT / 'deployment.json').exists() else {'status': 'pending'}
rows = list(csv.DictReader((ROOT / 'run-classification.csv').open()))
named_ids = ['MCCK2602T1SR', 'UJ0K3G10609Y', 'U8K28UUGYP3U', 'L9SGRBB5R698', 'D4LJ9QMGFB8Q']
named = [next(r for r in rows if r['run_id'] == rid) for rid in named_ids]
call_coverage = [
    ('路线', 'map/route-plan, merged map/route', '缺事实的多选路线停止；单一合法推进保持原职责'),
    ('选牌/选择', 'reward/card, selection/add/remove/upgrade', '恢复后固定 REST/reward/event 夹具只执行一次动作'),
    ('事件', 'event/choose/plan/act-plan', '预算到期也不跳过脑题；程序故障零动作'),
    ('商店', 'shop/plan', '七类生产路由参数化验证，安全闸不能另选'),
    ('休息', 'rest/plan', '保留连续超时十分钟休息，期间心跳与取消'),
    ('整局计划', 'run-plan and merged run_plan', '必须有成功回答，合并题漏字段重问同一题'),
    ('既有战斗计划', 'fight-plan', 'Codex 不可用不转 Jev；Jev 战斗执行/代码求解保持'),
]
tests = {
    'original_source': source,
    'ablation': read('ablation.json'),
    'ablation_metrics_final': read('ablation-metrics-final.json'),
    'integration_first_attempt': {'rc': 1, 'log': 'test-integration.log', 'tsc': 0, 'files': 220, 'cases': 2354, 'failed': 1,
        'failure': 'rollout-live.test.ts: unchanged rollout ranking, card index 2 versus 0; no combat planner source modified'},
    'integration_isolated_retry': {'rc': 0, 'log': 'rollout-integration-retry.log', 'passed': 1, 'skipped': 14},
    'baseline_isolated_check': {'rc': int((ROOT / 'rollout-baseline.rc').read_text()), 'log': 'rollout-baseline.log', 'base': read('baseline-regression.json')},
    'integration_python': {'rc': 0, 'cases': 136, 'log': 'python-integration.log'},
    'integration_full_retry': {'rc': int((ROOT / 'test-integration-retry.rc').read_text()) if (ROOT / 'test-integration-retry.rc').exists() else None, 'log': 'test-integration-retry.log'},
    'integration_full_retry_failure': 'sl-any-draw.test.ts: expected superset search not truncated, received truncated=true; combat solver sources unchanged',
    'serial_invocation_rejected': {'rc': 1, 'log': 'test-integration-serial.log', 'reason': 'duplicate maxWorkers 4,1 option; Vitest did not run'},
    'integration_single_worker': {'rc': int((ROOT / 'test-integration-single-worker.rc').read_text()) if (ROOT / 'test-integration-single-worker.rc').exists() else None, 'log': 'test-integration-single-worker.log', 'workers': 1},
    'final_sink_source': {'rc': int((ROOT / 'test-sink-source.rc').read_text()) if (ROOT / 'test-sink-source.rc').exists() else None, 'log': 'test-sink-source.log', 'workers': 1},
    'sink_ablation': read('ablation-wait-sink.json'),
    'live': deployment.get('tests', {}),
    'development_history': [
        {'log': 'targeted-1.log', 'failed': 1, 'reason': 'resetFightMemory export regression during this feature; original export restored, targeted-2.log 80 passed'},
        {'log': 'targeted-4.log', 'failed': 1, 'reason': 'fixed-memory event fixture did not advance away from the event; fixture corrected, targeted-5.log 34 passed'},
        {'log': 'python-all.log', 'errors': 6, 'skipped': 35, 'reason': 'system Python lacks duckdb; existing root virtualenv used without installation'},
        {'log': 'python-venv.log', 'failed': 2, 'reason': 'historical raw metrics fixtures lacked brain logs; explicit all-engine CLI compatibility added to fixtures; python-venv-2.log passed'},
    ],
    'main_fast_forward_blocked': read('deployment-main-fast-forward-blocked.json'),
    'inherited_records_whitespace': deployment.get('inherited_records_whitespace_check'),
}
artifacts = ['before/cuts.json', 'run-classification.csv', 'provenance.json', 'statistics-diff.json',
             'oct7-quota-period.json', 'quota-followup.json', 'history-coverage.json',
             'brain-usage-all-engines.json', 'curve-reconciliation.json', 'climb-actual.json',
             'ablation.json', 'ablation-metrics-final.json', 'ablation-wait-sink.json', 'source-manifest.json', 'integration-manifest.json', 'sink-source-manifest.json', 'paper-performance-actual.json', 'main-runtime-activation.json', 'deployment.json', 'deployment-main-fast-forward-blocked.json', 'final-verification.json']
manifest = {}
for name in artifacts:
    path = ROOT / name
    if path.is_file():
        data = path.read_bytes()
        manifest[name] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
for path in sorted(ROOT.glob('*.log')):
    data = path.read_bytes()
    manifest[path.name] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
for path in sorted(list(ROOT.glob('deployment-attempt-before-*.json')) + list(ROOT.glob('quota-followup-before-*.json'))):
    data = path.read_bytes()
    manifest[path.name] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
report = {
    'task': 'fix-batch', 'feature_request': '20261007-0900-roy-codex-only-brain',
    'item': 'Roy 已授权独立功能：Codex-only 大脑等待与统计口径',
    'generated_at': dt.datetime.now(dt.timezone.utc).isoformat(),
    'base': source['base'], 'source': source, 'integration': integration, 'final_sink_source': sink, 'deployment': deployment,
    'verification': read('final-verification.json'),
    'policy': 'codex-successful-brain-v1', 'call_coverage': call_coverage,
    'statistics': stats, 'named_runs': named, 'oct7_actual_logs': quota,
    'unknown_history': history, 'climb_actual': read('climb-actual.json'),
    'tests': tests, 'artifacts': manifest,
    'ironclad_scope': 'Roy explicitly authorized global Codex waiting and source policy only; no Ironclad knowledge or game strategy changes',
    'preserved': ['all raw logs', 'all engine token/cost accounting', 'learning evidence including excluded runs',
                  'first-try versus SL accounting', 'old paper snapshots', 'all test failures and blocked preflight history'],
    'skipped': ['other fix queue bugs', 'boss calibration', 'real LLM/game/play tests', 'env/key edits', 'dependencies/push',
                'historical reports rewriting', 'architecture mislabeled as game knowledge or bug-infra ledger'],
    'remaining': ['scheduler full external tsc/vitest on fixed release tree', 'ops verifies shipped and running root script versions',
                  'historical unlogged decisions cannot be reconstructed; explicit all-engine compatibility only'],
}
(ROOT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')

lines = [
    '# Roy 已授权独立功能：Codex-only 大脑等待与统计口径', '',
    '本批沿 fix-batch 完成事件回报，是新架构／统计功能；未登记游戏知识或 bug-infra，未修其他队列或 boss 校准。', '',
    f"功能已合入 live `{deployment['actual_merge']}`，固定发布 `{deployment['release_commit']}`／`{deployment['version']}`；main 同步 `{deployment['main_synced']}`，54 个功能文件逐 blob 与 live 一致。live 与主检出候选 tsc／Vitest 2363 例及 paths 11 项通过，Python 136 项通过。shipped 与完整沙箱外检查仍由运维／调度核实。", '',
    f"原基线 `{source['base']}`；原源码 `{source['source_commit']}`；部署状态 `{deployment.get('status')}`。逐源码提交、自测、实际合入、固定树及并发记录合并历史见 report.json。", '',
    '## 大脑调用与失败路径', '',
    '| 脑题 | 调用覆盖 | 行为／固定验证 |', '|---|---|---|',
]
lines += ['| ' + ' | '.join(row) + ' |' for row in call_coverage]
lines += ['',
    '生产 createRouter 强制 Codex，历史按题型引擎与 BRAIN_FALLBACK 不再决定大脑。未读／改 .env，Roy 去掉其回退变量只作为交接事实。Jev 战斗执行、代码模拟求解保持原职责。BrainBlockedError 穿过旧 Jev／代码回退 catch；安全闸拒绝脑答案直接记录程序故障，不能替选。', '',
    '额度、登录、限流、预检、服务不可用、连续超时及空／无效答案在当前题的动作安全点等待。退避 5/15/30/60/120/300 秒后封顶 300 秒，每段睡眠 ≤1 秒；连续两次超时保留十分钟休息。每次重试重新通过 Codex 预检和新额度保护，不绕过 key/登录/隔离检查。相同 question_id 和输入持续重问，不存在重试耗尽后的代答出口。TypeError、程序／协议错误停止并记录，绝不无条件吞异常。', '',
    'logs/brain-wait.json 原子标记与 brain-wait.jsonl 记录 pid/run_id/question_id/decision_type/原因/时间/重试/原预算/暂停时长。15 秒心跳，暂停／恢复／取消／故障向 ops/inbox-dev.md 幂等通知一次；重试不刷屏。正常额度恢复自动在同进程继续原题／原局。暂停段从首个失败请求到恢复成功回复结束（含探测、失败与最终成功调用），不消耗原 max-minutes 或 combat grace；其余普通处理仍消耗原预算，全部墙钟与费用保留。显式调用数限额不重置，耗尽后等待运维保留原存档调整重启。', '',
    'SIGINT/SIGTERM、ops/STOP 可取消；CLI 75／78 令 autoplay 停留同局，不生成失败战绩、不重开、不重启风暴。程序修复后清终止标记可恢复原存档，不能绕过预检。首次／终止日志或通知写失败也包装保留原 cause 的 BrainBlockedError/fault，释放心跳计时器并退出 78；终止标记无法写入时 autoplay 隔离等待，需运维明确恢复循环和原存档。stall/watch 只接受 45 秒内且真实 play pid 身份符合的心跳，死亡或陈旧标记照常报警。运行时收件箱逻辑有固定临时夹具；本任务未直接改根 notes/ops。', '',
    '## 实际来源与一致统计定义', '',
    '政策 codex-successful-brain-v1 只用 brain.jsonl 成功回答的实际 engine。新 accepted=true；旧 answer 非 null 且无 error/problems。每 (question_id, engine) 成功一次，旧无题号按行计；主脑题与合并附带 map/route、run-plan 分开计。失败、ds_*／deepseek_calls 和启动配置不能证明回答引擎。纯 Codex 还要求所有已记脑题解决；混合、缺引擎／缺日志／未解决归类不默认纳入。未记题不能恢复，coverage 仅声明 all_logged_questions_resolved。', '',
    '| 点名局号 | 来源 | Codex 成功 | DeepSeek 成功 | 默认纳入 |', '|---|---|---:|---:|---|',
]
lines += [f"| {r['run_id']} | {r['source']} | {r['codex']} | {r['deepseek']} | 否 |" for r in named]
lines += ['',
    '10 月 7 日逐局来自实际日志（北京时间自然日，后续审计切点 ' + quota['cut_time'] + '）。不是仅硬编码上述五局；全部历史逐局分类见 run-classification.csv。', '',
    '| 局号 | 来源 | 成功回答数 | 结束情况 |', '|---|---|---|---|',
]
for row in quota['all_oct7_runs_including_unfinished']:
    s = row['brain_source']
    lines.append(f"| {row['run_id']} | {s['source']} | {json.dumps(s['successful_answers'], ensure_ascii=False)} | {'已结束' if row.get('ended') else '切点仍在局中'} |")
lines += ['',
    '初始封存窗口的七次额度耗尽回退都属于 KQQELQSZ382Z：北京时间 07:33–07:38，选牌／休息题；实际 Codex 9、DeepSeek 7，归 mixed 并排除默认战绩。原失败／回退行摘要与时间见 oct7-quota-period.json，最新后续窗口见 quota-followup.json；早先后续窗口另存，不丢历史。', '',
    f"未知历史 {history['count']} 局，结束区间 {history['end_range'][0]} 至 {history['end_range'][1]}：371 缺脑日志、18 有未解决脑题。均不造引擎，显式 --include-non-codex 重现旧总口径。", '',
    '## 固定切点的统计差异', '',
    'before/cuts.json 保存所有字节切点；567 已结束局（481 铁甲、86 静默）。先归档旧 paper/data，再产生 scratch 新表与全引擎兼容表，不回改任何旧报告。', '',
    '| 角色／来源 | 局数 | 胜 | 首次胜 | SL 胜 | 平均层 |', '|---|---:|---:|---:|---:|---:|',
]
for role, st in stats.items():
    for name, record in [('原全量', st['old_all'])] + list(st['cohorts'].items()):
        lines.append(f"| {role}/{name} | {record['runs']} | {record['wins']} | {record['first_try_wins']} | {record['sl_wins']} | {record['mean_floor']} |")
lines += ['',
    'metrics、论文绩效、学习曲线、自动 climb 与胜局通知共用实际来源政策；角色隔离、首次／SL 继续分账。默认与 --include-non-codex 均输出来源／数量／排除理由。论文 runs.csv 保留原全部局及来源；证据台账不随绩效过滤。真实 567 局调用生产论文 performance_group 得到相同默认／全引擎局数、胜数、首次／SL，见 paper-performance-actual.json；未冒称完整生产 paper_dataset 管线已运行（该脚本等主检出正常刷新）。来源混合／未知的胜利不得自动升阶。实际两角色旧全量与纯 Codex 最高胜均 A9，下一阶均 A10；固定高阶其他引擎胜利夹具证明不会偷偷升阶。', '',
    '排除绩效不排除任何请求/token/费用，成本原始总账和来源分组全部保留。每 Codex 胜费用以整个实验已知费用为分子，不能作单局边际费用；原始胜数另列。历史兼容费用估值明确不是实际引擎定价，新成本输出按实际调用来源计；缺历史费用不能造价。学习曲线新增 ascension 未知桶保留原首个缺进阶铁甲局，纯／全口径和首次／SL 对账见 curve-reconciliation.json。', '',
    '铁甲只受到 Roy 明确要求的全局引擎等待／来源口径差异；未改游戏策略、求解器、知识或角色数据。', '',
    '## 测试与有意义的撤源验证', '',
    '所有新测试固定数据／内存客户端，不运行真实 LLM、网络或 play CLI。最后 36 项 Codex-only 固定测试（初版 34）覆盖七类脑题、额度／登录／预检、空答、恢复同题仅一次动作、程序异常、预算／取消／退避／心跳与通知，以及事件／通知两种记录路径在首次和三类终止上的八种故障场景；Python 新功能 9 项及全套 136 项通过。最早源提交 sandbox tsc 0、216 文件 2331 例，另串行 paths 11 例；移植树单 worker 220 文件 2354 例／paths 11 通过；最终日志故障保护源码整套结果见 final_sink_source，固定排除理由保持原脚本，完整套件交外部调度。', '',
    '撤去四项关键生产源码（router、factory、ascent、metrics）的对应能力，固定运行时 9 项失败／25 跳过；metrics 撤过滤失败（最新固定夹具全量 6 与预期 3 不同）。恢复逐字节相同后测试通过。最后日志故障保护单独撤 wait.ts 到 a307 父实现，新两项测试 2 失败／34 跳过；恢复源后 36 项全部通过，保留原 cause 和退出类型、释放计时器的差别可复现。原红绿日志、脚本与 SHA 保留，绝非只撤测试或镜像实现断言。', '',
    '集成首轮：tsc 0，220 文件 2354 例，旧 rollout-live 出牌索引断言 1 失败；单独重跑通过，未含功能的 a0e4 固定基线相同用例通过。完整重跑另一旧 sl-any-draw 搜索断言 1 失败（truncated=true），未改其求解器。两轮历史保留，不称已证明根因。首次单 worker 追加参数被 Vitest 拒绝，未跑例；因此给 test-sandbox.sh 加 SANDBOX_WORKERS=1..4 可选项，默认仍 4，排除名单与全部断言原样保留。单 worker 完整集成结果与 live 合后固定树检查见 report.json；未混入战斗求解修复。首次直接合源历史预检有文档／记录冲突，保留失败并改用只移植本功能 53 项加测试 worker 配置的分支，未携带未授权主检出历史。', '',
    '编写期间的失败同样保留：本功能改动曾漏掉 resetFightMemory 导出，恢复原导出后对应 80 项通过；事件内存夹具未推进画面导致 15 秒超时，修正夹具后 34 项通过；系统 Python 缺 duckdb 产生 6 导入错误／35 跳过，使用已有虚拟环境，无安装；两个旧 metrics 原全量期望在新默认口径下失败，改为显式全引擎兼容夹具后通过。', '',
    '## 发布与未完成事项', '',
    '```json', json.dumps(deployment, ensure_ascii=False, indent=2), '```', '',
    '实际流程在根 ops/live-merge.lock 内确认可见刷新稳定、保存全部刷新（含新文件），记录合前 SHA、重叠检查与预检；合后沙箱通过再 date、登记唯一版本／decision-log。沙箱只可见自己的进程命名空间，不能假称查看全部主机进程；文件状态／锁／两次稳定快照的可核验证据见部署文件。旧受阻、失败、刷新记录均保留。', '',
    '部署字段 refresh_files_retained=false 只表示检查期间另一个刷新更新了工作文件；原刷新字节已在 4647cf35 保存且为发布祖先，知识 blob 在本次代码合入前后相同，后续刷新未覆盖或回滚。本任务完成时 live 又有运维生成的知识刷新脏文件，保持原样。主检出检查期间其他运维提交推进，快进受阻记录已封存；在独占工作树只解决 decision-log 追加冲突，保留双方全部记录。其他所有已提交转录／CSV 字节保留；其中原有空白检查失败另存，自己的六项出站变更检查通过。已测候选的 54 个功能 blob 不变，因此记录合并与登记不重复跑源码检查。', '',
    '剩余为调度器固定发布树完整外部 tsc/vitest、运维核实 shipped／主检出运行脚本版本，以及无法补造的历史脑题来源。运行中局不停、不发游戏动作、不推送、不安装依赖、不改 prompt/key/.env。原始统计和全部证据路径及 SHA256 见 report.json。',
]
(ROOT / 'report.md').write_text('\n'.join(lines) + '\n')
print(ROOT / 'report.md')
