# #71 玩家 A10 整局学习库存

本项只补充原外部学习入口的运营库存，不产生游戏结论。原 `learn.lock`、账号/额度、磁盘、四道及自有槽、注册屏障、原生消费核验、退役、候选与 K1 发布门继续负责实际准入。对局大脑继续只查询本地已发布知识。

`ops/external_stock.py` 在原 Silent `check_jobs` 的低库存入口、外部派发结束及原 external 完成回调内运行；每次最多补三个计划，无新定时器、模型调度器或强制 tick。控制不存在时不启用；Ironclad 不调用补库存。原 `notes/strategy-external-silent.json` 的字节和计划不改，新计划来自独立运营 overlay，排在旧计划之后，只进入 A 道。

## 一次性登记缓存

先由原集成员完成实际 ROOT 组合检查，再由原 ops 在主运行根登记。必须带齐七个运行源码叶：`codex-ops-learn.py`、`learner_jobs.py`、`strategy_external_jobs.py`、`strategy_backfill_jobs.py`、`external_stock.py`、`external_stock_source.py`、`external_stock_cli.py`；LIVE 无部署叶。不单装接线、不改旧批绑定。七叶是本分支delta范围；共享叶先沿固定提交合并到实际ROOT组合，按组合后的SHA准入，不覆盖并行改动。

登记器只读取已存在的 #54 脱敏投影缓存及已固定统计包，不打开 SQLite 原库，不下载、不查询网络或玩家标识。`--cache` 必须是原 safe-cache 的 `runs.json.gz`，`--cache-receipt` 是其原 `receipt.json`；文件名与体积在读源字节前检查，拒绝原库路径。程序核原缓存 SHA、数据库身份、投影/SQL SHA、逐记录内容 SHA、原版本/build分母和字段白名单。缓存不在原记载位置时，ops 先定位原回执与原对象；缺失保持 `source_missing`，不重抓数据或补造路径。

```bash
nice -n 19 python3 -B ops/external_stock_cli.py --root "$PWD" prepare \
  --cache data/external/issue54-safe-cache/runs.json.gz \
  --cache-receipt data/external/issue54-safe-cache/receipt.json \
  --contract docs/learning-protocol.md \
  --contract docs/brain-strategies.md \
  --contract docs/knowledge-typed-tools.md \
  --contract docs/knowledge-runtime.md \
  --contract docs/learning-code-proposals.md
```

独立 state-dir 沿原实例使用 `--state-dir <该root内原目录>`，不得重绑为别的实例。登记在原 learn.lock 内非阻塞执行，并核原发布/磁盘准入；锁忙稍后由原 ops 重试。登记不启动学习者或触发 Git/full。成功后等待原自然 tick。

原 #54 代表局的全部内容窗口保守保留为 `legacy_reserved`，其中包括旧 c3 五对；这不是“已读”证明。登记还按旧 A 道原manifest的aggregate与显式selection引用核SHA、扫描完整窗口指纹，连未核原生启动的声明窗口也保守预留，证明保存在 `legacy-scope.json`；整局缺稳定身份则拒绝登记，不推定未读。新库存优先从更广的同一安全缓存选未覆盖窗口，不能把旧 `processed`、历史 remaining 或库条目数量当覆盖率。登记同时保存旧 A 道计划的精确来源边界；之后新增或替换手工 A 来源时，自动库存停止为 `source_invalid`，由原 ops 核新来源的覆盖/parent/理由后显式接续，不能自动清空旧预留。其他道计划变化不触发此门。原范围未明的历史输入继续保留，不能借本项重新研究同证据。

默认尝试读取已存在的 `knowledge/characters/silent/build-statistics-v1/run-index.json`。只有其 external manifest/model SHA 与本次包相同，才冻结自有 A10 失败簇计数供选窗优先级使用；版本未知照原样保留，外部分母贡献为零，不算同版本效果或独立胜率。没有对应自有快照时明确记缺口，不推造阶段/流派。`--own-index` 可指定同根原固定快照。

## 有界计划与恢复

工程初值是每单元目标 40 条完整记录、至少三个已校验后续计划；不是统计门槛。输入上限 256000 bytes，内容上下文部分上限 128000 bytes，取两者较小值；单记录页默认 24000 bytes。单元因字节预算或同版本余量不足而拆小，manifest 写真实数、短缺、胜败数及不可比的簇/终止幕分组，不能跨版本补够 40。完整指全部已记录节点，缺事件题面、药水、真实入场快照和玩家意图仍未知。

先取 v0.111.0，其次其他版本/build分别成批，保留完整build；未知build独立标注，不与已知补丁混合。旧主版本下的不同补丁也不能凑足40。同版本/build按已观察簇、终止阶段轮转并交替胜负，优先已登记的自有失败簇；比较范围只是事后描述，不声称初始状态相同、因果或玩法语义。开发不命名流派、不写游戏规则。

计划身份由 `source + character + ascension + version + content_sha256 + 完整节点窗口 + task_type` 去重；计划 ID 再固定问题版本与有序窗口。路径、重新导出或进程重启不生成新窗口。相同证据的新问题不能走自动补货，须原研究入口明确 parent 和理由，并保留旧账。

控制在忽略的 `notes/strategy-external-stock-silent.json`，库存、不可变 manifest/work-spec/记录、状态在原 state-dir 的 `external-stock/`。库存文件 fsync 后原子替换并同步目录，再允许原 wrapper 注册。登记成功才由原 batch barrier 放行；原 checkpoint 仍负责 wrapper/batch 身份。库存丢失但已有原绑定时停止并恢复原库存，不借当前输入重建新任务。

失败、lost、未证退役的 native owner、候选待发布等仍占原道/容量，窗口不回到未分配。没有自动递增 generation 或自动重学；原显式重试仍须原退役证明及原有限重试门。控制 `hold=true`、`enabled=false` 和逐窗口 `blocked_records` 不自动解除。回调重复不再补货；原报告、失败和旧绑定不改写。

## 阅读、提炼和发布分账

学习者按冻结 work-spec 调用原 ROOT reader，一次一条完整窗口：

```bash
nice -n 19 python3 -B /原项目根/ops/external_stock_cli.py \
  --root /原项目根 --state-dir /原项目根/ops/codex-ops read \
  --batch <原批次> --plan <绑定plan_id> --key <窗口key>
```

reader 核原运行批次、原来源/manifest/完整窗口 SHA。必须让工具返回整页；截断仍为 unread。宿主只承认同一原生 session/turn 中有匹配 call_id 的工具输出所保存的完整 canonical 页面；用户文字、后续 turn、仅标记、工具返回被截断及自行填 read 均不算读完。这证明页面交付给原学习会话，不证明模型理解或知识正确。

新批报告除原 `external_results` 外，须按窗口顺序写：

- `external_reading=[{key,status:read|unread,reason}]`。
- `external_coverage=[{key,state:pending|excluded|candidate,reason,destinations:[]}]`。unread 只能 pending；反证/排除结果可保留 excluded，但没有正式知识含义。candidate 的 destinations 须与原 external_results 的目标完全相同，目标文件在既有来源/限制字段引用窗口 key。

报告 Markdown 内 JSON 与最终 JSON 同步核验这些字段。完成验证只对 stock 新绑定启用，旧报告保持原合同。纯候选/反证走原无源码完成路径；有正式知识增量则继续原绑定 K1 callback、提案审计和 publisher，不为内容批创建源码提交或完整检查。

覆盖分别保存 allocation、reading、distillation、publication、consumption。一个批次发布不把全部输入算成入库证据：须对应 candidate 窗口、实际 K1 receipt、候选字节 SHA 和已发布候选 files 中的窗口引用匹配。之后只记 `consumption=pending`；本项不代填工具读回、自然采用或收益。

## 状态、停止和原 ops 验收

```bash
nice -n 19 python3 -B ops/external_stock_cli.py --root "$PWD" status
# 逐窗口明细只读：加 status --details
```

简报带采样时间、缓存独立记录、保守历史预留、未分配记录、实际已读独立记录、ready 计划/记录、原 worker PID/存活和退役状态、最新真实产出、发布批次及被引用窗口。`cursor` 只表示已规划预留数；不是读完或覆盖率。worker 状态是原 tick 的采样，不冒实时无延迟。完整明细在 `external-stock/status.json`。

停止原因分别为 `not_configured/disabled/hold/queue_disabled/publication_hold/account_draining`、`source_missing/source_invalid`、`input_budget/data_exhausted`、`quota:<原reason>/disk_capacity/lane_owner/worker_limit`。`inventory_state` 单列库存状态；配额或道位限制可以与已有 ready 库存并存。后续仅原自然 tick 重查，不忙循环、不强启动。

原 ops 运行验收至少保留以下实际证据，再回 issue #71：

1. 部署七叶与固定交付 SHA、一次性源缓存/投影/分母/历史预留登记、原控制及库存读回。
2. 原自然入口连续两批自动选择不同内容窗口，原 wrapper/PID、native 首提示/上下文、原 owner 退役、实际完整页和完成回调；没有手写第二批计划或强 tick。
3. 至少一批真实提炼，经原 K1 runtime 发布，再用生产本地工具核相同版本/条目/来源正文。自动开工、退出0、processed、固定测试都不能替代这些实据。
4. 收益继续按正常生产 Silent A10、实际引擎/首次尝试/SL 分账；不为验收开局，不关闭 #51 等学习/胜率父项。

回退只关闭本控制的 enabled，保留在途原合同、缓存、库存、对象、报告、K1 和 owner；不要删除绑定或复用窗口。若停用接线源码，待原在途 owner 与新批停点核清后按原集成流程回退七叶；不改 live/STOP、共享权限、服务档或预算。
