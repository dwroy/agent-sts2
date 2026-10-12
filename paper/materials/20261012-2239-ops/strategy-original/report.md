# 静默策略提案消费报告

记录时间：2026-10-12T22:22:32+08:00（写入前已运行date）。

本批10项均waiting：原帧支持局部机制和换线血价，但尚不足以验收宽提案、补全未观察分支或修改排序。无源码/知识修改、无提交、无合入、无新eval版本、无shipped；不把已有局部功能当本批实现。

## 身份与范围

- batch=20261012-221302-strategy-proposal，task=strategy-proposal，character=silent，reason=proposal，工作树与宿主一致；只处理dispatch.json中的10个proposal_ids，无proposal_repair、research_request或implementation_request。
- 普通专题条件不匹配（仅查看指定deck-size请求，其batch为20261010-150327），不承接别的研究。开工git status干净；git merge --no-edit main返回Already up to date，base与HEAD均为538d0101cbfb1b6b048557e0ba8ece899a1f2a79。
- 六局runs.jsonl均唯一SILENT/A10，运行代码均带dirty；当前源码只用作现状核查，不能冒充旧局完整运行树。
- 已读README、最新STATE、decision-log末尾、学习协议、代码提案文档；核对原提案及SHA、30个本角色账本id和当前silent相关经验。不引用其他角色知识，未运行play、联网或调用模型。

## 证据与独立重核

六局原始日志冻结：4062条状态、3941条决策、38条SL记录、6条run-config，共8047条；六条runs身份另保存。raw-evidence-manifest.json逐条记录路径、原行号、字节偏移、长度和SHA。focused-states.json包含本批关注房间1103条状态摘录；其数量不是独立实验数。原提案和原失败材料保留。

四组同指纹比较已同时核原决策指纹、observed_ts对应状态、下一轮状态及净变化，见paired-decisions.json与paired-observations.json：

| 证据 | 实损（原/替） | 敌HP净扣（原/替） | 限制 |
|---|---:|---:|---|
| 8JRE F33 T2 首/三试 | 3/15 | 10/17 | 五轮死亡0/24与5/24不同；后损封顶不等于同死率 |
| YF0L F48 T1 二/三试 | 0/9 | 45/38 | 未执行防御续步，不能用候选预测替实际 |
| XP2S F33 T3 首/二试 | 9/14 | 24/27 | 全败样本不能拟固定血价系数 |
| XP2S F33 T1 首/末试 | 2/10 | 25/34 | 替线另建1力量；后续抽序/出牌未控制 |

这些是整轮观测区间的净变化，不是单卡因果或完整候选执行认证。技能污染/加压/返力/电击增长/阶段清毒/临时减力/敏捷取得顺序的逐帧证据、反例、账本和验收缺口逐项写在proposal.md。

## 已有源码与消费者

source-verification.json固定检查时live=433f0fe7d733150c8ce3322d6f6d120887489571。11条路径的当前工作树字节均与该live提交相同，所列来源commit均为实际live祖先。此为已有局部功能核查，10个父提案均没有据此登记duplicate：

- a8b1f8be153fe4f3a34146117546c2178f2e446b：同题SL候选/资源事实；不是整轮实际结果。
- bade647f9fe4c9103b40e2f26b26296692ad24b7：单次派发回执；whole_plan_executed为null。
- 8698c581dac6c7e957f50a381586960a6d0c9b57：实验体当前阶段及相邻能力/HP端点；poison_damage_already_dealt为null。
- 04921bd785ac6838066522f91ea0bb6ab95cb6a1：离线执行/终局端点；完整候选及单卡因果仍未知。
- 当前进阶事实读取保留首样本；房间成本常量MEASURED_ROOM_MIN_N/ROOM_COST_MIN_N均5，未修改门槛。

本批直接用冻结输入调用现有learner/audit-selection.ts，使用根已安装tsx loader，无网络、无新依赖、无修改node_modules链接。四个完整单局消费者成功：5PM6 83段、8JRE 113段、YF0L 204段、XP2S 123段，523段完整候选结果均null。端点事实可以读回，不能据此认证全部中间执行或累计收益。

另外两局完整输入失败并保留：DUZU在d268789/268818/268864、CA5在d267143出现重复decision_id，现有消费者拒绝它们。未删除重复行或改拒绝规则；另存DUZU F27（45决策/47状态，8段）及CA5 F13（26决策/33状态，4段）的有界输入，均成功，12段完整候选结果仍null。两次有界成功不冒称两局全量消费者成功。完整命令和退出码在consumer-receipt.json/focused-consumer-receipt.json，失败stderr仍保留。

## 验证、记录和未实现原因

本次没有源码实现，因此撤源码失败/恢复通过不适用；未运行tsc、vitest或沙箱全套，tests={"tsc":null,"vitest":null,"cases":null}。上述是已有消费者的离线证据读取，不计作新回归或上线测试。

初次数据结构探针对非战斗combat=null使用list时TypeError；随后改为选择有效combat，仅影响只读探针。一次工具在bubblewrap构建阶段因项目外失效路径ENOENT失败，命令未执行，同权限重试成功；另有几次rg预期文件路径不存在，后改用rg --files定位。这些不是游戏规则失败，均不作为成功测试。

仅通过根learner/ledger.py update追加本报告和提案链接，by=learner:strategy-proposal；本批没有新学习claim，不改既有status/version/claim（包括原已shipped的限定范围），不把既有账本降级为proposed。原队列状态由最终proposal_results交宿主消费，未直接改队列或learn.json、未另建重复id。30个原id的更新输入/CLI回执保存在本目录；未重写历史复盘。

未实施范围：未见分支的来源/实体身份/覆甲条件、跨重规划完整执行及累计资源归因、受控完整胜线与独立验证。逐项缺数据理由见proposal.md和result.json。没有新的源码可合live，不制造合入/版本/上线通知；本角色及其他角色行为保持原状。

供运维接续：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261012-221302/learner/runs/20261012-221323-strategy-proposal/proposal.md。本报告：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261012-221302/learner/runs/20261012-221323-strategy-proposal/report.md。账本链接不是经验发布或实际大脑采用的证明；原父项继续等待后续有针对性的新证据。

## 交付核验

2026-10-12T22:27:09+08:00（已先date）：8047条冻结原行按原偏移与SHA全部一致，六局身份各唯一；30条CLI实际写入逐字段一致，未写status/version/claim/evidence。10项proposal_results覆盖派发id且无重复。HEAD仍为base，git status与对base差异均空。gitleaks对本批材料扫描约380.24MB，退出0、无泄漏；日志见gitleaks.log。最终核验见verification.json，材料指纹见materials.sha256.json。
