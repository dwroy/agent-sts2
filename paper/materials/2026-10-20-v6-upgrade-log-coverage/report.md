# 六张升级牌的日志漏收修复与 F8 对照

本批修复了日志生成器漏收，W0 从 330/660 恢复为 660/660；**方向投影仍全 unknown，不能据此关闭 V6 恢复阻塞**。未启局、发送模型请求、执行游戏动作、移除 STOP、修改 live 或派学习。

## 原因与修复范围

生成器是 `knowledge/builders/build-card-upgrades.py`。原脚本只统计费用和 dynamic_values.base_value，最终 `if entry["vars"] or "cost" in entry` 才输出。这六张牌的升级前后费用与动态基础数值相同，差异存在于实际 `resolved_rules_text`，因此全部被过滤。原正则另外要求固定字段顺序，并把 dynamic_values 前的文本限制在 900 字符。

改为解析实际 JSON 卡对象；保留原 numeric contract，为文字变化追加 `faces`：完整、未附魔、未修改、战斗外的实际牌组牌面，以及原日志偏移、行 SHA256、字段路径、局号、角色、进阶、楼层、时间和支持该精确牌面的独立局数。两侧证据不足仍不生成条目，不把缺字段补零，不从规则模板推导升级数值。新增按牌 ID 局部重生成，避免无关知识漂移。

`card-upgrades.json` 从 199 条变为 205 条，仅新增所列六张，既有 199 条逐对象严格相等。`source-verification.json` 已逐一从原偏移读回 12 个完整原始行，核对行哈希、局号及所有保留字段。`n` 是去重卡对象数，`faces[].n_runs` 才是精确牌面对应的独立局数，不能当成收益或因果证据。

| ID | 未升级牌面支持局数 | 升级牌面支持局数 | 升级牌面证据局 |
| --- | ---: | ---: | --- |
| AFTERIMAGE | 57 | 18 | LRN0HPZ0FZS1 |
| MALAISE | 53 | 12 | KAY522KT5NXR |
| CALCULATED_GAMBLE | 80 | 9 | R0HEV5E3QT6G |
| MIRAGE | 60 | 16 | F9PP859XZ3RJ |
| INFINITE_BLADES | 20 | 1 | 2L1BNN9ZJEFU |
| SPEEDSTER | 15 | 3 | 4Y94N8RDPGPM |

消费者只追加格式，并在 `v6-start.ts` 构造缺失牌/升级牌时转交原样记录的完整牌面，避免只把 upgraded 改 true 而保留基础文字。已经持有的升级实例原样保留；升级当前未升级实例保留实例元数据；附魔或修改值不能用未修改牌面覆盖，继续拒绝。缺升级证据守卫保留。没有新增游戏机制判断或手填游戏数值，铁甲原 numeric 路径不变。

完整日志有一条包含目标 ID 的损坏 JSON 行：偏移 12147505958，SHA256 `ad26f8bc1a55745b083208f3e4b1613c84667bcfc78195217f09d2e2d1ae4dc5`。首次扫描遇此行退出；修复为排除整行、不尝试从坏 JSON 恢复卡片，输出 `generation-audit.json`。其余 12 份直接证据均完整可读，未依赖损坏行。

## 冻结题结果

固定 F8 题来自 MWMR855QHTWR，Silent A10，seed 240896327，题面 SHA256 `939adc5524b69a399d736ed2cdf1c37b6df6ec284aa70f61f7b8a15d880690f9`，原字节副本保存在 `f8-card-1.json`（重现脚本直接读此副本）。运行 nice19、串行离线模拟，fetch 明确禁止，无 Jev/DeepSeek 请求。17 个正式 R2 组合，方向权重使用固定均分；该历史题没有冻结的大脑方向回答或实际 V6 路线。属于回溯诊断，不能作为无未来信息泄漏的效果评估。

原包：代码基线 170052a4630377a0f74ccaf789acd8aaca8ed565，history SHA256 `4858fedc44da6d43a49ea23716199897df1398c65900f931893156bd4e3cb40b`，cores SHA256 `377920574ce7859f5e39dd01aad495947140226777e742251ac850004ae0cbe6`。重测包：main b0aacef41，包含 eb92ebe3e 的全部 17 组合历史指标；精确字节哈希见 `projection-benchmark-r2-history.json`。

两份历史包均得到同样的准备结果（有效组合×选项行 33，每行 20 个样本；重复使用同一调度，不是 660 份独立历史观测）：

| 分支 | 修复前 | 修复后 | 前后样本哈希 |
| --- | --- | --- | --- |
| Wk / samples | 660/660 | 660/660 | 2515373ed9cd7ea54d831f0cb6dc31fc177084faf29d6f7c63446115d9d1aebc |
| W0 / general | 330/660 | 660/660 | d0e6c6cf1fb077efa861b030dd7ee53db3aef640eef5460c7dcce3aa143a4530 |

没有删除、重抽、替换样本或降低样本数。首次前后对照错误复用了会缓存 null 的同一工厂，导致 after 仍 330/660；该控制实验原件保留在 `opening-guard-cached-control-diagnostic.json`。最终对照为两侧分别新建工厂，避免把旧的拒绝结果当成新数据结果；完整逐样本结果在两个 opening-guard JSON 中。

| 历史包 | 题目 | 实测耗时 ms | 方向 win 已知/总数 | 完成战斗样本 |
| --- | --- | ---: | --- | ---: |
| 原包 | 冷 pick 5s | 4544 | 0/288 | 13 |
| 原包 | 热 pick 5s | 4554 | 0/288 | 289 |
| 原包 | act 60s | 60995 | 0/72 | 1824 |
| R2 全组合包 | 冷 pick 5s | 4548 | 0/288 | 0 |
| R2 全组合包 | 热 pick 5s | 4538 | 0/288 | 126 |
| R2 全组合包 | act 60s | 59531 | 0/72 | 1952 |

这些战斗输出全部 terminal，capped/timeUp 都是 0；完成一部分战斗不等于组合的配对期望完整。仍有 simulation_budget_exceeded、budget_remaining_unknown、formation_unknown、expectation_unknown、continuous_joint_unknown；`unknown_opening_entry_hp_or_empirical_sample` 也可能由该函数在准备时耗尽预算产生，不能再直接归因于这六张升级牌。两个包中唯一本底无法准备的目标均是 `f48:then:f49:unknown`，原因 ordered_pair_unobserved_in_first_boss_cohort（目标概率约 0.6885）。各阶段完整计数、目标与运行诊断见 benchmark JSON；耗时包含同机其他工作的资源竞争，不作为性能回归阈值。

## 限制与下一步

本批证明的是日志数据可读和准备守卫恢复，未证明所有升级效果完整模拟。原模型对固有、单牌保留、MIRAGE 升级后的通用效果仍有限；没有因补回牌面而自行添加这些机制。`partial_model` / `raw_simulation_not_calibrated` 等原有标签保留，不能把观察牌面当成战斗模型已核验。其他数值升级消费者仍按其原 numeric contract 工作，本批没有扩大其规则范围。

建议 watcher 接着用本批相同样本检查配对结果完整性、准备/调度预算及 remaining unknown；大面积 unknown 的安全网和 live 真实烟测仍由原 owner 执行。正式上线后由 ops 沿原发布锁核号、运输和消费者读回；本批不修改 live，不关闭恢复或学习父要求。

## 重现与检查

```bash
nice -n 19 /usr/bin/python3 knowledge/builders/build-card-upgrades.py \
  /home/dw/Projects/agent-sts2/logs/states.jsonl \
  --cards AFTERIMAGE MALAISE CALCULATED_GAMBLE MIRAGE INFINITE_BLADES SPEEDSTER \
  --audit paper/materials/2026-10-20-v6-upgrade-log-coverage/generation-audit.json
/usr/bin/python3 -m unittest discover -s knowledge/builders -p test_card_upgrades.py -v
# 从对应代码/历史包基线运行；脚本默认使用当前工作树 knowledge。
PATH="$HOME/.local/node/bin:$PATH" nice -n 19 agent/node_modules/.bin/tsx \
  paper/materials/2026-10-20-v6-upgrade-log-coverage/opening-guard-diagnostic.ts
```

检查最终状态见 `checks.json`；固定数据覆盖六张原始牌面、原日志来源、字段重排/长文本、缺证/修改值/战斗内拒绝、独立局计数、损坏行审计、局部刷新幂等及其余数据不变、v6-start 实际牌面传递与原实例保留。全部使用固定数据。

最终检查：tsc 通过；Vitest 597 文件、5715 项通过、2 跳过；Python 5 项通过；gitleaks 差异扫描通过。变基到 83dcc7f47 后，agent/knowledge/learner 与受测提交逐树相同，复用全量结果并补跑 tsc 通过；原始 Vitest 输出以 gzip 保留，解压字节与本地原日志相同。
