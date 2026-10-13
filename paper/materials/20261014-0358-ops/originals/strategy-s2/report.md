# 本批策略提案处置报告

结论：10个原提案均waiting；没有新增源码、知识数据、源码提交或live合入。已有确定机制和诊断只构成宽提案的子项覆盖，不能据此关闭整个父提案。

base=02d1e183dd84b67c2c12a9a6ccfe25502a7eac49；实际核源码时live HEAD=60d5206de96389c3430370c0dbb8704f32714d7a。本批派发runs=KEN58SH9SLZ6,TXZ6RVMQA09D,WQZVENQ7DTRP,02HB4L0C3C67,4D4J8USKCPAV,F4QKG4J1AJJZ,JLN5SK17W4FQ,LS8035TB32P3,NB8KCF6HRGVF,S9UZAK0JP0C0。详情和证据/账本逐项见proposal.md。

## 原始证据与核验范围

- 329条状态/决策与原日志逐条JSON一致，并保存原始行offset/length/SHA256；不是329个独立对局或完整全历史审计。
- 9局42次狡诈药水全部核对：添3/2/0分别37/2/3，新增刀升级且基础6，未把场上力量/弱导致的牌面4/7/8等当未升级反例。
- KEN7饮、真实回复27/29；TX第2/3试T6的3损36输出/0损27输出及首胜4血后F49开场死；WQ同指纹T9双向血价和T7沙坑；Q6/1913实际入口/退出HP与药栏；NHA六试跨轮8/24推进及1/7血价，均核原帧。
- 本批派发10锚点全部静默；原队列另外关联SADL3CGYTGSR、1913SE84AXQF、Q6M2Y34MWKRE、NHA2KW0RB7VP、K3676LU8B0UH，角色也已核。K367仅身份/原提案与账本核对，未冒称本批重放其原始机制窗口；Y6等只引用既有账本，不作为新证据。

## 已有子实现的真实live来源

下列提交均经git merge-base --is-ancestor核为实际live祖先；文件blob与源码范围见source-review.json。main/live的15个核查文件有5个blob不同，本批不把源码全树称为逐字相等、不合入或覆盖差异。下表仅登记已有子项，所有parent仍waiting。

| 子项 | 实际live祖先源码commit | 核查文件 |
|---|---|---|
| 狡诈药水确定生成/手位和王室猛毒无血瓶开场4血 | c09762601e54bfc1ef7a1a8ee50e3285a4fd1e5c | agent/tests/silent-cunning.test.ts；agent/src/sim/silent-opening.ts |
| 普通紧勒、七手精确切击、SL候选资源/预测诊断 | a8b1f8be153fe4f3a34146117546c2178f2e446b | agent/tests/silent-strangle.test.ts；agent/tests/silent-precise-cut-seven.test.ts；agent/src/reflex/silent-sl-comparison.ts |
| 静默已观察蟹朝向取整 | f2c7cc1a7288893bceae0f0b20304a2b1fae5f57 | agent/tests/silent-crusher-facing.test.ts |
| 连续boss固定消费者覆盖 | e1a467e18a0dfa8d99046a24ff4c0e1af59278c8 | agent/tests/silent-double-boss.test.ts |

源码消费者限制：CUNNING在模型生成、手位截断、模拟保留/消耗已有固定覆盖；combat-plan生成后按真实新手重规划，合成索引不直接执行。SL两种comparison明确标候选预测及actual_turn_result=null/execution=unverified；不能当完整执行或饱和准入校准。Royal opening只支持已观察静默A10无血瓶组合，新模拟扣4而现场/SL入口不重扣，未知伴随遗物/复活不外推。油灯无首次消费计数，跨动作/恢复追踪仍待独立实现验证。

## 逐项处置

| 原id | 状态 | 具体缺口 |
|---|---|---|
| silent-proposal-08eaa60bcc449852 | waiting | KEN58SH9SLZ6 的7次饮用和两次真实回复可复现；缺同资源、同牌序的未饮用/留药到boss整战对照，不能校准持药价或留药阈值。 |
| silent-proposal-92920295a648b540 | waiting | TXZ6RVMQA09D 已有连战资源接续；T6少损3也少扣9，后续牌序改变，首胜4血后F49开场死亡。缺同抽序且连续通关的替线，不调整SL或终局权重。 |
| silent-proposal-a327449c331efbc1 | waiting | WQZVENQ7DTRP 同指纹T9替线多损9/多扣15，T7逃离另有4血换沙坑1轮的收益；现有诊断已列资源差额，缺完整获胜对照及可校准的双截止排序条件。 |
| silent-proposal-a099e89437e942bb | waiting | 狡诈药水3/2/0生成与基础6已在live实现；生成后按真实手牌重规划，缺穿插饮用完整方案的实际派发、保留选择与跨轮手位消费者验证，不能将求解器候选当已执行整线。 |
| silent-proposal-47910f82a1fdd98f | waiting | 王室猛毒无血瓶开场扣4及连战结转已有live实现；旧合并提案还含SL双向血价、药水留用和路线资源预算，缺这些条件的完整受控后继战及未知回血/复活组合证据。 |
| silent-proposal-f1374df72d8e6a25 | waiting | Q6赢精英后2血接走廊死、1913入口46资源链已核；早喝敏捷候选未完整执行且路线实际锻造改变条件，缺同输入同预算整战/后继对照，不能拟新药价或HP权重。 |
| silent-proposal-38a49e6c97f31eea | waiting | 普通无挡紧勒子公式已在live接线；宽提案还含再生/荆棘/重接/能力分源与用药、SL整战验收，缺联合完整消费者重放及隔离机制误差后的独立胜负对照，不能整条标duplicate。 |
| silent-proposal-ef0e38a5dbd3bc07 | waiting | 1913实际锻造、回血和Q6精英出口资源可核；未到的未来营火无收益，缺另选休息/提前用药/不付事件血价的完整后继路线对照及通用资源预算校准。 |
| silent-proposal-7f820c02d39bfaea | waiting | NHA同开场替线跨轮敌净扣8→24且损血1→7，两侧均未杀、六试全败；现有候选诊断不提供完整执行结果，缺独立成对胜负与同预算排序校准，不改饱和SL准入。 |
| silent-proposal-04b6b430759815ed | waiting | 七/六/五手精确切击及已观察蟹朝向1→2子公式已有live实现；油灯快照无首次使用计数且跨动作/SL恢复状态尚未接线，其他负面/制品/叠层与早建能力整战对照缺失。 |

## 验证、失败和交付

没有生产源码改动，因此未做撤源码负对照、tsc、vitest、沙箱全套或gitleaks提交检查；这些字段均null，不能解释为0或通过。只运行离线原日志核验。初版核验脚本将dynamic_values错误当对象，实际是数组；evidence-verification.log保留TypeError，修正解析后evidence-verification-retry.log为295行核验通过，补成对窗口后evidence-verification-final.log为329行通过。未改游戏源码来修核验脚本。首次文档读取遇沙箱构建期消失工作树ENOENT，原错误保留且同权限重读成功，不当代码失败。

启动事件实际命令为gpt-6.1-sol、model_reasoning_effort=xhigh、service_tier=default，与本题high文字不同；本会话未修改或重启原任务。该记录仅核启动命令，无原生请求模型元数据，不能声称另行完成运行模型切换。

仅经根learner/ledger.py update为31个既有silent账本追加本批proposal/report链接与处置说明，不新增历史复盘、不改变旧claim/status/version、不给父项shipped。没有新代码提案，code_proposals仅沿用10个已派原id；implementation_domains=[]表示本批没有新实现。根请求/提案原文/learn.json均只读。运维需按原调度登记10项waiting及缺新证据范围；本报告和批次完成不关闭学习父要求。

产物：proposal.md、report.md、report.json、dispatch-proposals.json、run-index.json、ledger-input.json、source-review.json、evidence-verification.json、verified-source-rows.jsonl、核验初稿失败及后续日志；工作树和原日志保留。最终工作树/CLI读回见completion-verification.json与ledger-receipt.json。
