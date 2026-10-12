# Roy 已授权独立功能：Codex-only 大脑等待与统计口径

本批沿 fix-batch 完成事件回报，是新架构／统计功能；未登记游戏知识或 bug-infra，未修其他队列或 boss 校准。

功能已合入 live `910604a4471ad4470e563d6d4e16d05bdcb78758`，固定发布 `f8dd742d64b073225cf54f221a9b24cfc6612fdd`／`V4.codex-only1`；main 同步 `c8e477d356fc805a2ca24bc07fab4d974f378490`，54 个功能文件逐 blob 与 live 一致。live 与主检出候选 tsc／Vitest 2363 例及 paths 11 项通过，Python 136 项通过。shipped 与完整沙箱外检查仍由运维／调度核实。

原基线 `c3732c7f49b6f42385ad12d4ecad015eac16c335`；原源码 `856007edb088f572e5eabcf2e833df15c32ac649`；部署状态 `released_ops_verification_pending`。逐源码提交、自测、实际合入、固定树及并发记录合并历史见 report.json。

## 大脑调用与失败路径

| 脑题 | 调用覆盖 | 行为／固定验证 |
|---|---|---|
| 路线 | map/route-plan, merged map/route | 缺事实的多选路线停止；单一合法推进保持原职责 |
| 选牌/选择 | reward/card, selection/add/remove/upgrade | 恢复后固定 REST/reward/event 夹具只执行一次动作 |
| 事件 | event/choose/plan/act-plan | 预算到期也不跳过脑题；程序故障零动作 |
| 商店 | shop/plan | 七类生产路由参数化验证，安全闸不能另选 |
| 休息 | rest/plan | 保留连续超时十分钟休息，期间心跳与取消 |
| 整局计划 | run-plan and merged run_plan | 必须有成功回答，合并题漏字段重问同一题 |
| 既有战斗计划 | fight-plan | Codex 不可用不转 Jev；Jev 战斗执行/代码求解保持 |

生产 createRouter 强制 Codex，历史按题型引擎与 BRAIN_FALLBACK 不再决定大脑。未读／改 .env，Roy 去掉其回退变量只作为交接事实。Jev 战斗执行、代码模拟求解保持原职责。BrainBlockedError 穿过旧 Jev／代码回退 catch；安全闸拒绝脑答案直接记录程序故障，不能替选。

额度、登录、限流、预检、服务不可用、连续超时及空／无效答案在当前题的动作安全点等待。退避 5/15/30/60/120/300 秒后封顶 300 秒，每段睡眠 ≤1 秒；连续两次超时保留十分钟休息。每次重试重新通过 Codex 预检和新额度保护，不绕过 key/登录/隔离检查。相同 question_id 和输入持续重问，不存在重试耗尽后的代答出口。TypeError、程序／协议错误停止并记录，绝不无条件吞异常。

logs/brain-wait.json 原子标记与 brain-wait.jsonl 记录 pid/run_id/question_id/decision_type/原因/时间/重试/原预算/暂停时长。15 秒心跳，暂停／恢复／取消／故障向 ops/inbox-dev.md 幂等通知一次；重试不刷屏。正常额度恢复自动在同进程继续原题／原局。暂停段从首个失败请求到恢复成功回复结束（含探测、失败与最终成功调用），不消耗原 max-minutes 或 combat grace；其余普通处理仍消耗原预算，全部墙钟与费用保留。显式调用数限额不重置，耗尽后等待运维保留原存档调整重启。

SIGINT/SIGTERM、ops/STOP 可取消；CLI 75／78 令 autoplay 停留同局，不生成失败战绩、不重开、不重启风暴。程序修复后清终止标记可恢复原存档，不能绕过预检。首次／终止日志或通知写失败也包装保留原 cause 的 BrainBlockedError/fault，释放心跳计时器并退出 78；终止标记无法写入时 autoplay 隔离等待，需运维明确恢复循环和原存档。stall/watch 只接受 45 秒内且真实 play pid 身份符合的心跳，死亡或陈旧标记照常报警。运行时收件箱逻辑有固定临时夹具；本任务未直接改根 notes/ops。

## 实际来源与一致统计定义

政策 codex-successful-brain-v1 只用 brain.jsonl 成功回答的实际 engine。新 accepted=true；旧 answer 非 null 且无 error/problems。每 (question_id, engine) 成功一次，旧无题号按行计；主脑题与合并附带 map/route、run-plan 分开计。失败、ds_*／deepseek_calls 和启动配置不能证明回答引擎。纯 Codex 还要求所有已记脑题解决；混合、缺引擎／缺日志／未解决归类不默认纳入。未记题不能恢复，coverage 仅声明 all_logged_questions_resolved。

| 点名局号 | 来源 | Codex 成功 | DeepSeek 成功 | 默认纳入 |
|---|---|---:|---:|---|
| MCCK2602T1SR | deepseek | 0 | 9 | 否 |
| UJ0K3G10609Y | deepseek | 0 | 45 | 否 |
| U8K28UUGYP3U | deepseek | 0 | 10 | 否 |
| L9SGRBB5R698 | deepseek | 0 | 16 | 否 |
| D4LJ9QMGFB8Q | deepseek | 0 | 21 | 否 |

10 月 7 日逐局来自实际日志（北京时间自然日，后续审计切点 2026-10-07T03:51:35.970833+00:00）。不是仅硬编码上述五局；全部历史逐局分类见 run-classification.csv。

| 局号 | 来源 | 成功回答数 | 结束情况 |
|---|---|---|---|
| VPW8YH7A4QFM | codex | {"codex": 49} | 已结束 |
| DPYF2BAA3DKT | codex | {"codex": 47} | 已结束 |
| CRK2HNYKSCZC | codex | {"codex": 10} | 已结束 |
| HUVEPWQAHWFU | codex | {"codex": 34} | 已结束 |
| UMVLWER4CD98 | codex | {"codex": 50} | 已结束 |
| TU3XB4CAEDAW | codex | {"codex": 40} | 已结束 |
| V0383V5S9BCQ | codex | {"codex": 10} | 已结束 |
| 8R5CXD5C8PW8 | codex | {"codex": 35} | 已结束 |
| QNTW139MGECA | codex | {"codex": 33} | 已结束 |
| HSX4HYATB4E2 | codex | {"codex": 49} | 已结束 |
| WYB0NCD6W83J | codex | {"codex": 14} | 已结束 |
| 87LCSDR5P3DL | codex | {"codex": 10} | 已结束 |
| TKXQ6L4N9A6U | codex | {"codex": 22} | 已结束 |
| 02HB4L0C3C67 | codex | {"codex": 12} | 已结束 |
| T3FW7R2R2306 | codex | {"codex": 8} | 已结束 |
| P5HT1272P5SB | codex | {"codex": 25} | 已结束 |
| KQQELQSZ382Z | mixed | {"codex": 9, "deepseek": 7} | 已结束 |
| YLYLZWHA0GKU | codex | {"codex": 42} | 已结束 |
| 7ZUC4VPMDS41 | codex | {"codex": 18} | 已结束 |
| 2Y27VAYZDA02 | codex | {"codex": 21} | 已结束 |
| TDLBRNA0R05B | codex | {"codex": 49} | 已结束 |
| MCT1GPTL8D35 | codex | {"codex": 42} | 已结束 |
| W7BHM8U02RKG | codex | {"codex": 16} | 已结束 |
| 01H1533KSS5C | codex | {"codex": 5} | 切点仍在局中 |

初始封存窗口的七次额度耗尽回退都属于 KQQELQSZ382Z：北京时间 07:33–07:38，选牌／休息题；实际 Codex 9、DeepSeek 7，归 mixed 并排除默认战绩。原失败／回退行摘要与时间见 oct7-quota-period.json，最新后续窗口见 quota-followup.json；早先后续窗口另存，不丢历史。

未知历史 389 局，结束区间 2026-09-24T04:01:23.825Z 至 2026-10-04T05:44:09.872Z：371 缺脑日志、18 有未解决脑题。均不造引擎，显式 --include-non-codex 重现旧总口径。

## 固定切点的统计差异

before/cuts.json 保存所有字节切点；567 已结束局（481 铁甲、86 静默）。先归档旧 paper/data，再产生 scratch 新表与全引擎兼容表，不回改任何旧报告。

| 角色／来源 | 局数 | 胜 | 首次胜 | SL 胜 | 平均层 |
|---|---:|---:|---:|---:|---:|
| ironclad/原全量 | 481 | 24 | 20 | 4 | 30.318 |
| ironclad/codex | 7 | 1 | 0 | 1 | 37.0 |
| ironclad/deepseek | 77 | 7 | 6 | 1 | 36.935 |
| ironclad/mixed | 8 | 0 | 0 | 0 | 37.875 |
| ironclad/unknown | 389 | 16 | 14 | 2 | 28.733 |
| ironclad/other | 0 | 0 | 0 | 0 | None |
| silent/原全量 | 86 | 10 | 6 | 4 | 33.547 |
| silent/codex | 78 | 10 | 6 | 4 | 34.308 |
| silent/deepseek | 5 | 0 | 0 | 0 | 21.0 |
| silent/mixed | 3 | 0 | 0 | 0 | 34.667 |
| silent/unknown | 0 | 0 | 0 | 0 | None |
| silent/other | 0 | 0 | 0 | 0 | None |

metrics、论文绩效、学习曲线、自动 climb 与胜局通知共用实际来源政策；角色隔离、首次／SL 继续分账。默认与 --include-non-codex 均输出来源／数量／排除理由。论文 runs.csv 保留原全部局及来源；证据台账不随绩效过滤。真实 567 局调用生产论文 performance_group 得到相同默认／全引擎局数、胜数、首次／SL，见 paper-performance-actual.json；未冒称完整生产 paper_dataset 管线已运行（该脚本等主检出正常刷新）。来源混合／未知的胜利不得自动升阶。实际两角色旧全量与纯 Codex 最高胜均 A9，下一阶均 A10；固定高阶其他引擎胜利夹具证明不会偷偷升阶。

排除绩效不排除任何请求/token/费用，成本原始总账和来源分组全部保留。每 Codex 胜费用以整个实验已知费用为分子，不能作单局边际费用；原始胜数另列。历史兼容费用估值明确不是实际引擎定价，新成本输出按实际调用来源计；缺历史费用不能造价。学习曲线新增 ascension 未知桶保留原首个缺进阶铁甲局，纯／全口径和首次／SL 对账见 curve-reconciliation.json。

铁甲只受到 Roy 明确要求的全局引擎等待／来源口径差异；未改游戏策略、求解器、知识或角色数据。

## 测试与有意义的撤源验证

所有新测试固定数据／内存客户端，不运行真实 LLM、网络或 play CLI。最后 36 项 Codex-only 固定测试（初版 34）覆盖七类脑题、额度／登录／预检、空答、恢复同题仅一次动作、程序异常、预算／取消／退避／心跳与通知，以及事件／通知两种记录路径在首次和三类终止上的八种故障场景；Python 新功能 9 项及全套 136 项通过。最早源提交 sandbox tsc 0、216 文件 2331 例，另串行 paths 11 例；移植树单 worker 220 文件 2354 例／paths 11 通过；最终日志故障保护源码整套结果见 final_sink_source，固定排除理由保持原脚本，完整套件交外部调度。

撤去四项关键生产源码（router、factory、ascent、metrics）的对应能力，固定运行时 9 项失败／25 跳过；metrics 撤过滤失败（最新固定夹具全量 6 与预期 3 不同）。恢复逐字节相同后测试通过。最后日志故障保护单独撤 wait.ts 到 a307 父实现，新两项测试 2 失败／34 跳过；恢复源后 36 项全部通过，保留原 cause 和退出类型、释放计时器的差别可复现。原红绿日志、脚本与 SHA 保留，绝非只撤测试或镜像实现断言。

集成首轮：tsc 0，220 文件 2354 例，旧 rollout-live 出牌索引断言 1 失败；单独重跑通过，未含功能的 a0e4 固定基线相同用例通过。完整重跑另一旧 sl-any-draw 搜索断言 1 失败（truncated=true），未改其求解器。两轮历史保留，不称已证明根因。首次单 worker 追加参数被 Vitest 拒绝，未跑例；因此给 test-sandbox.sh 加 SANDBOX_WORKERS=1..4 可选项，默认仍 4，排除名单与全部断言原样保留。单 worker 完整集成结果与 live 合后固定树检查见 report.json；未混入战斗求解修复。首次直接合源历史预检有文档／记录冲突，保留失败并改用只移植本功能 53 项加测试 worker 配置的分支，未携带未授权主检出历史。

编写期间的失败同样保留：本功能改动曾漏掉 resetFightMemory 导出，恢复原导出后对应 80 项通过；事件内存夹具未推进画面导致 15 秒超时，修正夹具后 34 项通过；系统 Python 缺 duckdb 产生 6 导入错误／35 跳过，使用已有虚拟环境，无安装；两个旧 metrics 原全量期望在新默认口径下失败，改为显式全引擎兼容夹具后通过。

## 发布与未完成事项

```json
{
  "status": "released_ops_verification_pending",
  "integration_source": "88fe83e50b254853748a45ecc8a10de370c82f08",
  "version": "V4.codex-only1",
  "original_source": "856007edb088f572e5eabcf2e833df15c32ac649",
  "tests": {
    "sandbox": {
      "rc": 0,
      "log": "test-live.log",
      "tsc": 0,
      "workers": 1,
      "summary": [
        [
          "223 passed (223)",
          ""
        ],
        [
          "",
          "2363 passed (2363)"
        ],
        [
          "1 passed (1)",
          ""
        ],
        [
          "",
          "11 passed (11)"
        ]
      ],
      "sha256": "79b4102f4b6dca0a7970dede512900e5130b639ec1b90df2f0c797149b80a1fb"
    },
    "python": {
      "rc": 0,
      "log": "python-live.log",
      "sha256": "ef468aaa3718536bd72add6d45ff6ed945e14eefbeed47d2bf3f7b04ea4dcadf"
    },
    "main_publication": {
      "rc": 0,
      "workers": 1,
      "log": "test-main-publication.log",
      "sha256": "bcca1bc7e373677f17601a1100a3d862c55348f0e0300f5e80b0527abda39c2d"
    }
  },
  "shipped": false,
  "checks_pending": true,
  "lock_acquired": "2026-10-07T03:17:02.596204+00:00",
  "refresh_confirmation": {
    "stable_seconds": 3,
    "paths": [
      "notes/monster-db-check.md",
      "notes/fight-value-backtest-silent.md"
    ],
    "fingerprints": {
      "notes/monster-db-check.md": "d85d1ef78d8a6e79f18371e1a6313025eebac71338ea28290d821b58c15a4db4",
      "notes/fight-value-backtest-silent.md": "7e24123ccc8ac83ef4cd56753c6ff9050c439fb4b5d3394933525cc1044150f1"
    },
    "process_scope": "sandbox process namespace only; not a claim of complete host process inspection",
    "lock": "/home/dw/Projects/agent-sts2/ops/live-merge.lock"
  },
  "overlap": [],
  "refresh_commit": "4647cf35df3e1602fd2d69100e09eb04b02253ce",
  "before_code": "4647cf35df3e1602fd2d69100e09eb04b02253ce",
  "before_tree": "5b6b9d74667367ab5afb90a6e60a5aaa9975bd3c",
  "preflight": {
    "rc": 0,
    "log": "preflight-live.txt"
  },
  "actual_merge": "910604a4471ad4470e563d6d4e16d05bdcb78758",
  "merged_tree": "8b15e0550339fc9399a035a94d70e9729315c418",
  "knowledge_blobs_preserved": true,
  "fixed_check_commit": "910604a4471ad4470e563d6d4e16d05bdcb78758",
  "fixed_check_tree": "8b15e0550339fc9399a035a94d70e9729315c418",
  "release_date_command": "2026-10-07 11:32",
  "release_entry": {
    "name": "V4.codex-only1",
    "family": "V4",
    "commit": "910604a4471ad4470e563d6d4e16d05bdcb78758",
    "source": "decision-log 2026-10-07 11:32: Roy authorized Codex-only waiting and codex-successful-brain-v1 performance/climb policy; global engine/source behavior only"
  },
  "decision_log_line": "- 2026-10-07 11:32 Codex学习者上线Roy09:00已授权独立功能：Codex-only大脑等待与统计口径；原源码856007edb088f572e5eabcf2e833df15c32ac649、仅本功能最终源88fe83e50b254853748a45ecc8a10de370c82f08→实际live代码910604a4471ad4470e563d6d4e16d05bdcb78758，唯一V4.codex-only1。路线/选牌/事件/商店/休息/整局及既有战斗计划不可用在原题有界退避等待，恢复仍Codex；取消/程序故障保留原局，首次/终止日志写失败也保留原因并退出脑故障78，心跳/收件箱/stall/autoplay禁止代答与重启风暴，Jev战斗执行/代码求解原职责保持。brain.jsonl实际成功引擎为统一绩效/论文/学习曲线/climb口径，DeepSeek/混合/未知默认排除但原战绩/证据/成本全部保留、旧快照不改；固定切点静默86局10胜→78局10胜，五点名局均DeepSeek，额度回退KQQELQSZ382Z为Codex9/DeepSeek7混合。源tsc/vitest0、Python136通过；集成两轮旧rollout排名/SL搜索各1失败、单项及未含功能基线核验后单worker全套通过，原历史/重复worker参数拒绝保留；日志故障保护撤源2失败/恢复36通过，live合后沙箱/Python通过（完整日志和固定树见报告）。根锁内全部刷新4647cf35df3e1602fd2d69100e09eb04b02253ce、重叠空/预检0、已提交知识逐blob保持；铁甲仅Roy指定全局引擎等待/来源差异，无策略/知识改变，不混其他修复或boss校准。新架构不冒标游戏知识或bug-infra；shipped及完整外部固定树检查由运维/调度核实，主检出同步随后登记。报告/home/dw/Projects/agent-sts2/learner/runs/20261007-091119-codex-only-brain/report.md与report.json；不停当前对局、不运行play、不改env/key/prompt、不推送。\n",
  "release_commit": "f8dd742d64b073225cf54f221a9b24cfc6612fdd",
  "release_tree": "e038ea3001db752d4d4749dfe2c781c77464e8fb",
  "refresh_files_retained": false,
  "refresh_after_tests": {
    "notes/monster-db-check.md": "3d1b673f6d6b9feac7c1f74bf4907c726fb3c5cc057b5660af59b0a20c2a403e",
    "notes/fight-value-backtest-silent.md": "7e24123ccc8ac83ef4cd56753c6ff9050c439fb4b5d3394933525cc1044150f1"
  },
  "main_runtime_activation": {
    "before": "555dc09590361bd4e0570b78c722fd2815951ecf",
    "main_runtime_merge": "42eb0fa7bd03a44fdaa972b4008e02e2db7b0023",
    "source": "856007edb088f572e5eabcf2e833df15c32ac649",
    "dirty_paths_before": [
      "notes/monster-db-check.md",
      "ops/autoplay.log",
      "ops/inbox-dev.md",
      "ops/restarts.log",
      "ops/win-notified",
      "paper/materials/ironclad/cost.md",
      "paper/materials/learning/ledger.jsonl",
      "paper/materials/none/cost.md",
      "paper/materials/unattributed/cost.md"
    ],
    "dirty_paths_after": [
      "notes/monster-db-check.md",
      "ops/autoplay.log",
      "ops/inbox-dev.md",
      "ops/restarts.log",
      "ops/win-notified",
      "paper/materials/ironclad/cost.md",
      "paper/materials/learning/ledger.jsonl",
      "paper/materials/none/cost.md",
      "paper/materials/unattributed/cost.md"
    ],
    "preflight": 0,
    "gitleaks": 0,
    "source_tests": "source-manifest.json",
    "latest_wait_guard_and_worker_profile_pending_publication_sync": false
  },
  "main_before": "9d753e50317b8185e7dde28855f54b1158f56e8c",
  "main_dirty_preserved_paths": [
    "notes/lessons.md",
    "notes/monster-db-check.md",
    "ops/autoplay.log",
    "ops/inbox-dev.md",
    "ops/restarts.log",
    "ops/win-notified",
    "paper/data/cost-curve-ironclad.csv",
    "paper/data/cost-curve-silent.csv",
    "paper/data/cost-silent.csv",
    "paper/data/cost-sources.json",
    "paper/data/cost-unattributed.csv",
    "paper/materials/ironclad/cost.md",
    "paper/materials/learning/ledger.jsonl",
    "paper/materials/none/cost.md",
    "paper/materials/silent/cost.md",
    "paper/materials/unattributed/cost.md"
  ],
  "main_source_merge": "9d753e50317b8185e7dde28855f54b1158f56e8c",
  "main_record_date_command": "2026-10-07 11:33",
  "main_sync_phase": "complete",
  "main_records_source": "c8e477d356fc805a2ca24bc07fab4d974f378490",
  "main_records_race": {
    "candidate": "43847ae4af6ebbf012f4e019679853649e0566e9",
    "advanced_root": "d58bac3f4a0d5ae35a2ba0aaa79b1e36433b400a",
    "advanced_paths": [
      "notes/lessons.md",
      "notes/ops-handoff.md",
      "paper/data/README.md",
      "paper/data/commits.csv",
      "paper/data/cost-curve-silent.csv",
      "paper/data/cost-silent.csv",
      "paper/data/cost-sources.json",
      "paper/data/cost-unattributed.csv",
      "paper/data/decisions_by_label.csv",
      "paper/data/learning-curve-ironclad.csv",
      "paper/data/learning-curve-silent.csv",
      "paper/data/runs.csv",
      "paper/data/summary.json",
      "paper/data/verification.json",
      "paper/materials/decision-log.md",
      "paper/materials/ironclad/cost.md",
      "paper/materials/learning/ledger.jsonl",
      "paper/materials/none/cost.md",
      "paper/materials/silent/20261007-1136-two-postmortems.md",
      "paper/materials/silent/20261007-1136-two-postmortems/2Y27VAYZDA02-deepseek-reasoning.jsonl",
      "paper/materials/silent/20261007-1136-two-postmortems/2Y27VAYZDA02-details.txt",
      "paper/materials/silent/20261007-1136-two-postmortems/2Y27VAYZDA02-metrics.txt",
      "paper/materials/silent/20261007-1136-two-postmortems/2Y27VAYZDA02-summary.txt",
      "paper/materials/silent/20261007-1136-two-postmortems/TDLBRNA0R05B-deepseek-reasoning.jsonl",
      "paper/materials/silent/20261007-1136-two-postmortems/TDLBRNA0R05B-details.txt",
      "paper/materials/silent/20261007-1136-two-postmortems/TDLBRNA0R05B-metrics.txt",
      "paper/materials/silent/20261007-1136-two-postmortems/TDLBRNA0R05B-summary.txt",
      "paper/materials/silent/20261007-1136-two-postmortems/analyze-source.txt",
      "paper/materials/silent/20261007-1136-two-postmortems/completion-err.txt",
      "paper/materials/silent/20261007-1136-two-postmortems/completion-out.txt",
      "paper/materials/silent/20261007-1136-two-postmortems/details-source.txt",
      "paper/materials/silent/20261007-1136-two-postmortems/extract-source.txt",
      "paper/materials/silent/20261007-1136-two-postmortems/ledger-original.jsonl",
      "paper/materials/silent/20261007-1136-two-postmortems/lessons-original.txt",
      "paper/materials/silent/20261007-1136-two-postmortems/manifest.json",
      "paper/materials/silent/20261007-1136-two-postmortems/metrics-source.txt",
      "paper/materials/silent/20261007-1136-two-postmortems/ops-archive-result.json",
      "paper/materials/silent/20261007-1136-two-postmortems/ops-manifest.json",
      "paper/materials/silent/20261007-1136-two-postmortems/ops-paper-capture.json",
      "paper/materials/silent/20261007-1136-two-postmortems/ops-paper-dataset.txt",
      "paper/materials/silent/20261007-1136-two-postmortems/plans.jsonl",
      "paper/materials/silent/cost.md",
      "paper/materials/unattributed/cost.md"
    ]
  },
  "inherited_records_whitespace_check": {
    "rc": 2,
    "task_delta_check": 0,
    "log": "main-records-inherited-whitespace.log",
    "foreign_committed_bytes_unchanged": true
  },
  "main_publication_source": "43847ae4af6ebbf012f4e019679853649e0566e9",
  "main_synced": "c8e477d356fc805a2ca24bc07fab4d974f378490",
  "main_tree": "59d473d395e1bb024006bc3ac99a99fba8b50940",
  "main_dirty_status_before_records_sync": [
    "M notes/monster-db-check.md",
    " M ops/autoplay.log",
    " M ops/inbox-dev.md",
    " M ops/restarts.log",
    " M ops/win-notified",
    " M paper/data/cost-curve-ironclad.csv",
    " M paper/data/cost-curve-silent.csv",
    " M paper/data/cost-silent.csv",
    " M paper/data/cost-sources.json",
    " M paper/data/cost-unattributed.csv",
    " M paper/materials/learning/ledger.jsonl",
    " M paper/materials/silent/cost.md",
    "?? notes/run-1005-0114-T082DRCUHRRD.md",
    "?? notes/run-1005-0148-1HC609GTLGN3.md",
    "?? notes/run-1005-0248-R0HEV5E3QT6G.md",
    "?? notes/run-1005-0347-KAY522KT5NXR.md",
    "?? notes/run-1005-0414-E6AVMMVCSRPC.md",
    "?? notes/run-1005-0505-XYYQYBRM2A01.md",
    "?? notes/run-1005-0602-K3676LU8B0UH.md",
    "?? notes/run-1005-0645-CSBR5CRDWQNB.md",
    "?? notes/run-1005-0739-ZZMYZ5UBCG72.md",
    "?? notes/run-1005-0841-10GPK5XGHCK3.md",
    "?? notes/run-1005-0913-1NZ8FE5F34R9.md",
    "?? notes/run-1005-0952-F9PP859XZ3RJ.md",
    "?? notes/run-1005-1054-9YBKCNBFP0X5.md",
    "?? notes/run-1005-1136-1LMBFGSMCWKU.md",
    "?? notes/run-1005-1223-ZE8F192FKX24.md",
    "?? notes/run-1005-1231-FH2HB2X17F2H.md",
    "?? notes/run-1005-1337-UACFSW4VDDLD.md",
    "?? notes/run-1005-1419-VN7RQJMJEFMX.md",
    "?? notes/run-1005-1440-75X1BARMNZ03.md",
    "?? notes/run-1005-1524-ARKQLHG6RS4W.md",
    "?? notes/run-1005-1604-6EV5V6PJJS9D.md",
    "?? notes/run-1005-1628-8CFMW9SAGFWQ.md",
    "?? notes/run-1005-1727-2L1BNN9ZJEFU.md",
    "?? notes/run-1005-1840-53FLQ68CETW0.md",
    "?? notes/run-1005-1924-ENKYQMS9W4ZD.md",
    "?? notes/run-1005-2015-2SU6XN2AEJRD.md",
    "?? notes/run-1005-2122-SADL3CGYTGSR.md",
    "?? notes/run-1005-2210-Z6CFLDR3N4SB.md",
    "?? notes/run-1005-2241-3KME36ADUE4U.md",
    "?? notes/run-1005-2340-VLV17NUSFS61.md",
    "?? notes/run-1006-0013-9YT51CK8RC39.md",
    "?? notes/run-1006-0115-2PVLGRBGUX9S.md",
    "?? notes/run-1006-0157-4Y94N8RDPGPM.md",
    "?? notes/run-1006-0242-LLYSRQQ35AVW.md",
    "?? notes/run-1006-0320-HMVJKM56S4Q8.md",
    "?? notes/run-1006-0404-F4QKG4J1AJJZ.md",
    "?? notes/run-1006-0451-G403VCZ3BH1B.md",
    "?? notes/run-1006-0513-MGA0CZDDKC0P.md",
    "?? notes/run-1006-0559-25226ZFLNR1J.md",
    "?? notes/run-1006-0655-JLN5SK17W4FQ.md",
    "?? notes/run-1006-0755-JMH5C51RLN4E.md",
    "?? notes/run-1006-0847-9TG1RP5LFAAK.md",
    "?? notes/run-1006-0914-JQPT83P8KDSZ.md",
    "?? notes/run-1006-0951-4D4J8USKCPAV.md",
    "?? notes/run-1006-1018-TD1HVGS7H6LB.md",
    "?? notes/run-1006-1049-PJ2LL9KU7FHD.md",
    "?? notes/run-1006-1200-S9UZAK0JP0C0.md",
    "?? notes/run-1006-1216-MCCK2602T1SR.md",
    "?? notes/run-1006-1326-UJ0K3G10609Y.md",
    "?? notes/run-1006-1341-U8K28UUGYP3U.md",
    "?? notes/run-1006-1416-L9SGRBB5R698.md",
    "?? notes/run-1006-1441-D4LJ9QMGFB8Q.md",
    "?? notes/run-1006-1537-0NZXA12NLDMH.md",
    "?? notes/run-1006-1614-4ANT8D00TP72.md",
    "?? notes/run-1006-1644-XBD8Z9XLPCPN.md",
    "?? notes/run-1006-1735-PU80F84P6HPN.md",
    "?? notes/run-1006-1803-NB8KCF6HRGVF.md",
    "?? notes/run-1006-1910-5X2GHKJ89PN1.md",
    "?? notes/run-1006-1948-TCFAHJ9K19VY.md",
    "?? notes/run-1006-2036-LS8035TB32P3.md",
    "?? notes/run-1006-2135-L704TLETMZBM.md",
    "?? notes/run-1006-2158-KUZVERN40NGK.md",
    "?? notes/run-1006-2225-BVF22RSFVBS9.md",
    "?? notes/run-1006-2334-ZVYUL2YP3518.md",
    "?? notes/run-1007-0019-VPW8YH7A4QFM.md",
    "?? notes/run-1007-0112-DPYF2BAA3DKT.md",
    "?? notes/run-1007-0123-CRK2HNYKSCZC.md",
    "?? notes/run-1007-0200-HUVEPWQAHWFU.md",
    "?? notes/run-1007-0308-UMVLWER4CD98.md",
    "?? notes/run-1007-0350-TU3XB4CAEDAW.md",
    "?? notes/run-1007-0401-V0383V5S9BCQ.md",
    "?? notes/run-1007-0436-8R5CXD5C8PW8.md",
    "?? notes/run-1007-0503-QNTW139MGECA.md",
    "?? notes/run-1007-0552-HSX4HYATB4E2.md",
    "?? notes/run-1007-0605-WYB0NCD6W83J.md",
    "?? notes/run-1007-0616-87LCSDR5P3DL.md",
    "?? notes/run-1007-0636-TKXQ6L4N9A6U.md",
    "?? notes/run-1007-0647-02HB4L0C3C67.md",
    "?? notes/run-1007-0658-T3FW7R2R2306.md",
    "?? notes/run-1007-0723-P5HT1272P5SB.md",
    "?? notes/run-1007-0752-KQQELQSZ382Z.md",
    "?? notes/run-1007-0832-YLYLZWHA0GKU.md",
    "?? notes/run-1007-0903-7ZUC4VPMDS41.md",
    "?? notes/run-1007-0940-2Y27VAYZDA02.md",
    "?? notes/run-1007-1044-TDLBRNA0R05B.md",
    "?? notes/run-1007-1123-MCT1GPTL8D35.md",
    "?? notes/run-1007-1144-W7BHM8U02RKG.md",
    "?? ops/cost-refresh.log",
    "?? paper/data/history/",
    "?? paper/data/learning-curve-ironclad.csv.before-20261007T034111659483Z",
    "?? paper/data/learning-curve-silent.csv.before-20261007T034111831356Z"
  ],
  "main_dirty_status_after_records_sync": [
    "M notes/monster-db-check.md",
    " M ops/autoplay.log",
    " M ops/inbox-dev.md",
    " M ops/restarts.log",
    " M ops/win-notified",
    " M paper/data/cost-curve-ironclad.csv",
    " M paper/data/cost-curve-silent.csv",
    " M paper/data/cost-silent.csv",
    " M paper/data/cost-sources.json",
    " M paper/data/cost-unattributed.csv",
    " M paper/materials/learning/ledger.jsonl",
    " M paper/materials/silent/cost.md",
    "?? notes/run-1005-0114-T082DRCUHRRD.md",
    "?? notes/run-1005-0148-1HC609GTLGN3.md",
    "?? notes/run-1005-0248-R0HEV5E3QT6G.md",
    "?? notes/run-1005-0347-KAY522KT5NXR.md",
    "?? notes/run-1005-0414-E6AVMMVCSRPC.md",
    "?? notes/run-1005-0505-XYYQYBRM2A01.md",
    "?? notes/run-1005-0602-K3676LU8B0UH.md",
    "?? notes/run-1005-0645-CSBR5CRDWQNB.md",
    "?? notes/run-1005-0739-ZZMYZ5UBCG72.md",
    "?? notes/run-1005-0841-10GPK5XGHCK3.md",
    "?? notes/run-1005-0913-1NZ8FE5F34R9.md",
    "?? notes/run-1005-0952-F9PP859XZ3RJ.md",
    "?? notes/run-1005-1054-9YBKCNBFP0X5.md",
    "?? notes/run-1005-1136-1LMBFGSMCWKU.md",
    "?? notes/run-1005-1223-ZE8F192FKX24.md",
    "?? notes/run-1005-1231-FH2HB2X17F2H.md",
    "?? notes/run-1005-1337-UACFSW4VDDLD.md",
    "?? notes/run-1005-1419-VN7RQJMJEFMX.md",
    "?? notes/run-1005-1440-75X1BARMNZ03.md",
    "?? notes/run-1005-1524-ARKQLHG6RS4W.md",
    "?? notes/run-1005-1604-6EV5V6PJJS9D.md",
    "?? notes/run-1005-1628-8CFMW9SAGFWQ.md",
    "?? notes/run-1005-1727-2L1BNN9ZJEFU.md",
    "?? notes/run-1005-1840-53FLQ68CETW0.md",
    "?? notes/run-1005-1924-ENKYQMS9W4ZD.md",
    "?? notes/run-1005-2015-2SU6XN2AEJRD.md",
    "?? notes/run-1005-2122-SADL3CGYTGSR.md",
    "?? notes/run-1005-2210-Z6CFLDR3N4SB.md",
    "?? notes/run-1005-2241-3KME36ADUE4U.md",
    "?? notes/run-1005-2340-VLV17NUSFS61.md",
    "?? notes/run-1006-0013-9YT51CK8RC39.md",
    "?? notes/run-1006-0115-2PVLGRBGUX9S.md",
    "?? notes/run-1006-0157-4Y94N8RDPGPM.md",
    "?? notes/run-1006-0242-LLYSRQQ35AVW.md",
    "?? notes/run-1006-0320-HMVJKM56S4Q8.md",
    "?? notes/run-1006-0404-F4QKG4J1AJJZ.md",
    "?? notes/run-1006-0451-G403VCZ3BH1B.md",
    "?? notes/run-1006-0513-MGA0CZDDKC0P.md",
    "?? notes/run-1006-0559-25226ZFLNR1J.md",
    "?? notes/run-1006-0655-JLN5SK17W4FQ.md",
    "?? notes/run-1006-0755-JMH5C51RLN4E.md",
    "?? notes/run-1006-0847-9TG1RP5LFAAK.md",
    "?? notes/run-1006-0914-JQPT83P8KDSZ.md",
    "?? notes/run-1006-0951-4D4J8USKCPAV.md",
    "?? notes/run-1006-1018-TD1HVGS7H6LB.md",
    "?? notes/run-1006-1049-PJ2LL9KU7FHD.md",
    "?? notes/run-1006-1200-S9UZAK0JP0C0.md",
    "?? notes/run-1006-1216-MCCK2602T1SR.md",
    "?? notes/run-1006-1326-UJ0K3G10609Y.md",
    "?? notes/run-1006-1341-U8K28UUGYP3U.md",
    "?? notes/run-1006-1416-L9SGRBB5R698.md",
    "?? notes/run-1006-1441-D4LJ9QMGFB8Q.md",
    "?? notes/run-1006-1537-0NZXA12NLDMH.md",
    "?? notes/run-1006-1614-4ANT8D00TP72.md",
    "?? notes/run-1006-1644-XBD8Z9XLPCPN.md",
    "?? notes/run-1006-1735-PU80F84P6HPN.md",
    "?? notes/run-1006-1803-NB8KCF6HRGVF.md",
    "?? notes/run-1006-1910-5X2GHKJ89PN1.md",
    "?? notes/run-1006-1948-TCFAHJ9K19VY.md",
    "?? notes/run-1006-2036-LS8035TB32P3.md",
    "?? notes/run-1006-2135-L704TLETMZBM.md",
    "?? notes/run-1006-2158-KUZVERN40NGK.md",
    "?? notes/run-1006-2225-BVF22RSFVBS9.md",
    "?? notes/run-1006-2334-ZVYUL2YP3518.md",
    "?? notes/run-1007-0019-VPW8YH7A4QFM.md",
    "?? notes/run-1007-0112-DPYF2BAA3DKT.md",
    "?? notes/run-1007-0123-CRK2HNYKSCZC.md",
    "?? notes/run-1007-0200-HUVEPWQAHWFU.md",
    "?? notes/run-1007-0308-UMVLWER4CD98.md",
    "?? notes/run-1007-0350-TU3XB4CAEDAW.md",
    "?? notes/run-1007-0401-V0383V5S9BCQ.md",
    "?? notes/run-1007-0436-8R5CXD5C8PW8.md",
    "?? notes/run-1007-0503-QNTW139MGECA.md",
    "?? notes/run-1007-0552-HSX4HYATB4E2.md",
    "?? notes/run-1007-0605-WYB0NCD6W83J.md",
    "?? notes/run-1007-0616-87LCSDR5P3DL.md",
    "?? notes/run-1007-0636-TKXQ6L4N9A6U.md",
    "?? notes/run-1007-0647-02HB4L0C3C67.md",
    "?? notes/run-1007-0658-T3FW7R2R2306.md",
    "?? notes/run-1007-0723-P5HT1272P5SB.md",
    "?? notes/run-1007-0752-KQQELQSZ382Z.md",
    "?? notes/run-1007-0832-YLYLZWHA0GKU.md",
    "?? notes/run-1007-0903-7ZUC4VPMDS41.md",
    "?? notes/run-1007-0940-2Y27VAYZDA02.md",
    "?? notes/run-1007-1044-TDLBRNA0R05B.md",
    "?? notes/run-1007-1123-MCT1GPTL8D35.md",
    "?? notes/run-1007-1144-W7BHM8U02RKG.md",
    "?? ops/cost-refresh.log",
    "?? paper/data/history/",
    "?? paper/data/learning-curve-ironclad.csv.before-20261007T034111659483Z",
    "?? paper/data/learning-curve-silent.csv.before-20261007T034111831356Z"
  ],
  "main_runtime_dirty_paths_after": [
    "notes/monster-db-check.md",
    "ops/autoplay.log",
    "ops/inbox-dev.md",
    "ops/restarts.log",
    "ops/win-notified",
    "paper/data/cost-curve-ironclad.csv",
    "paper/data/cost-curve-silent.csv",
    "paper/data/cost-silent.csv",
    "paper/data/cost-sources.json",
    "paper/data/cost-unattributed.csv",
    "paper/materials/learning/ledger.jsonl",
    "paper/materials/silent/cost.md"
  ],
  "main_feature_paths_identical": [
    "README.md",
    "agent/src/brain/brain.ts",
    "agent/src/brain/engines/codex-usage.ts",
    "agent/src/brain/engines/codex.ts",
    "agent/src/brain/llm/deepseek.ts",
    "agent/src/brain/router.ts",
    "agent/src/brain/source.ts",
    "agent/src/brain/wait.ts",
    "agent/src/core/index.ts",
    "agent/src/eye/run-config.ts",
    "agent/src/hand/loop.ts",
    "agent/src/memory/ascension-target.ts",
    "agent/tests/brain-claude.test.ts",
    "agent/tests/brain-codex-usage.test.ts",
    "agent/tests/brain-codex.test.ts",
    "agent/tests/brain-deepseek.test.ts",
    "agent/tests/brain-knowledge.test.ts",
    "agent/tests/brain-router.test.ts",
    "agent/tests/brain-source-fixtures.json",
    "agent/tests/build-decider.test.ts",
    "agent/tests/cards-view-memo.test.ts",
    "agent/tests/codex-only-brain.test.ts",
    "agent/tests/codex_only_stats_test.py",
    "agent/tests/eval_calibration_test.py",
    "agent/tests/eval_metrics_test.py",
    "agent/tests/event-settle.test.ts",
    "agent/tests/execution-gate.test.ts",
    "agent/tests/jev-prompt-log.test.ts",
    "agent/tests/jev-retry.test.ts",
    "agent/tests/journal-replay.test.ts",
    "agent/tests/learning_ledger_test.py",
    "agent/tests/legacy-brain.ts",
    "agent/tests/loop.test.ts",
    "agent/tests/multi-character.test.ts",
    "agent/tests/oneshot-support.ts",
    "agent/tests/prefix-facts.test.ts",
    "agent/tests/run-config.test.ts",
    "agent/tests/run-plan-merge.test.ts",
    "agent/tests/sl-loop.test.ts",
    "agent/tests/turn-start-settle.test.ts",
    "agent/tools/test-sandbox.sh",
    "docs/codex-only-brain.md",
    "docs/learning-protocol.md",
    "eval/brain_source.py",
    "eval/cost.py",
    "eval/learning-curve.py",
    "eval/metrics.py",
    "ops/autoplay.sh",
    "ops/brain_wait.py",
    "ops/codex-ops-learn.py",
    "ops/metrics.py",
    "ops/paper_dataset.py",
    "ops/stall-check.sh",
    "ops/watch-autoplay.py"
  ],
  "main_feature_paths_with_other_changes": [],
  "main_sync_failure_history": "deployment-main-fast-forward-blocked.json",
  "main_feature_source_sync_commit": "d6f05cdabc17b3b82df06bf96d76a2745436da8f",
  "main_sync_log_commit": "c8e477d356fc805a2ca24bc07fab4d974f378490",
  "main_sync_registration_date": "2026-10-07 11:52",
  "main_sync_registration_line": "- 2026-10-07 11:52 Codex学习者登记Roy已授权Codex-only独立功能主检出同步：实际源码/记录合入d6f05cdabc17b3b82df06bf96d76a2745436da8f，54个功能文件与live固定发布f8dd742d64b073225cf54f221a9b24cfc6612fdd逐blob一致；live检查树8b15e0550339fc9399a035a94d70e9729315c418、固定发布树e038ea3001db752d4d4749dfe2c781c77464e8fb、唯一版本V4.codex-only1。主检出候选43847ae4af6ebbf012f4e019679853649e0566e9的tsc0、Vitest223文件2363例及paths11通过；主检出测试期间运维追加记录导致快进受阻，原失败保留，仅在独占工作树合并双方追加记录/数据，未改他人已提交转录/CSV字节及运行时脏数据，无源码变化故不重跑已通过检查。shipped和固定发布树完整沙箱外检查/运行中脚本加载由运维核实；报告/home/dw/Projects/agent-sts2/learner/runs/20261007-091119-codex-only-brain/report.md与report.json，完成沿fix-batch通道回报。\n",
  "main_sync_registration_tests": "records-only; inherited code blobs equal tested candidate and fixed live release"
}
```

实际流程在根 ops/live-merge.lock 内确认可见刷新稳定、保存全部刷新（含新文件），记录合前 SHA、重叠检查与预检；合后沙箱通过再 date、登记唯一版本／decision-log。沙箱只可见自己的进程命名空间，不能假称查看全部主机进程；文件状态／锁／两次稳定快照的可核验证据见部署文件。旧受阻、失败、刷新记录均保留。

部署字段 refresh_files_retained=false 只表示检查期间另一个刷新更新了工作文件；原刷新字节已在 4647cf35 保存且为发布祖先，知识 blob 在本次代码合入前后相同，后续刷新未覆盖或回滚。本任务完成时 live 又有运维生成的知识刷新脏文件，保持原样。主检出检查期间其他运维提交推进，快进受阻记录已封存；在独占工作树只解决 decision-log 追加冲突，保留双方全部记录。其他所有已提交转录／CSV 字节保留；其中原有空白检查失败另存，自己的六项出站变更检查通过。已测候选的 54 个功能 blob 不变，因此记录合并与登记不重复跑源码检查。

剩余为调度器固定发布树完整外部 tsc/vitest、运维核实 shipped／主检出运行脚本版本，以及无法补造的历史脑题来源。运行中局不停、不发游戏动作、不推送、不安装依赖、不改 prompt/key/.env。原始统计和全部证据路径及 SHA256 见 report.json。
