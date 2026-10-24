# 静默 A10 蜡烛输入 1 的添火事实接线

批次：20261024-231317-strategy-proposal；原提案：silent-proposal-167b20d3b7105257；账本：silent-0328，关联 silent-0185/0186。来源任务为 postmortem / experience-update，实现任务为 strategy-proposal。仅处理 assigned-proposals.json 的十个 id，不承接其他专题，不适用普通流派扩展。

## 旧行为与拟行为

旧 silentCandleRestFacts 对 KINDLE 输入 0 参考 5，输入 1 仍 null；V6 休息题在原事实生成之前返回。候选仅对 Silent、A10、未熔化 PUMPKIN_CANDLE、现场整数 stack=1 且有合法启用 KINDLE 时补参考 6。HEAL/SMITH 保留现场充能 1；其他正量、无效值、未知/其他进阶不变。普通/oneshot 和 V6 题面分别固定读回；V6 KINDLE 的 resources_after、changes 及 unknown_reason 保持原来的未知身份，不把参考变成整场模拟。

保持所有合法选项、HP/牌组、路线、评分、添火优先级、药价与 SL 阈值。其他角色保持等价。候选源码为 agent/src/hand/screens/rest.ts，固定夹具与测试分别为 agent/tests/silent-candle-positive-evidence.json、agent/tests/silent-candle-rest.test.ts。

## 原始证据与身份

J8PHG72DGD90，Silent A10，F29 营火，无战斗回合。decisions 原行 304744 的精确 decision_id=5c16285a-2258-4dcf-9b3b-d6b79936da3c：chosen=choose_rest_option index2，expect=KINDLE，result=completed。脑原行 9568 显式 run_id 同局，question/options 与这条 decision 的原题逐字段完全相等；答案 choice=o2，accepted=true，problems=[]。question_id 只作原件字段保留，不用它或时间邻近建立所属局。

states 原行 312605：offset=9720737278，bytes=26201，SHA256=6f5590cb60fd2c7ea586c54882847dd3ee1bad1acebb3e8d16d97a5b3913ea6e；原行312606：offset=9720763479，bytes=24908，SHA256=aed4e6f30487e0eb64b52bb71c2cce8a0d0389bdab8919835fed33b568ee88d1。身份由 state.run_id/fingerprint.run 一致给出；原始字节已 seek 读回验 SHA。stack 实际 1→6、HP50/74、28张完整牌组不变。离开营火原行312607仍6。完整原行及其冻结source_size在 review/candle-raw.json；其他原题/答案/结果与身份出处在 review/ 与 question-coverage.json。

## 样本、反例与限制

一局一次添火，不增加原支持分母，不拟参数。固定原帧作功能验证，后续新局才可作独立观察。旧0→5分支不证明任意n+5，其他正充能与上限未知。原题512次boss模拟没有KINDLE结果；6%是原50血基线，不能叫添火胜率。J8本局最终败于F33，不能由充能正确推出应该优先添火、早建能力能赢或新规则有收益。当前正式经验已提到2→7，该局不在本批，候选不借它扩大输入范围。

## 验证、失败和发布门

初次定向检查因共享 node_modules/.vite-temp 只读 EROFS 而未启动，保留 *.initial；--configLoader runner 使用现有入口支持的配置加载方式，未改依赖/排除名单。有效撤源码检查 3失败/9通过，恢复后普通/oneshot/V6共12通过。首轮生产tsc发现新增JSON字段类型错误，改用既有numOrNull作显式数值解析；初败保留 sandbox-initial-tsc.log，最终检查结果另见 report.md，不把早期0冒最终源码通过。

在原 ops/live-merge.lock 内只读冻结三方知识：live=487ce58924ff9e511cfbf76bfaad73608d310de3，incoming=520a2b7a3771dac00fc7d6126ae26c2fc6275edc，共同祖先cd2f11496e6f8957c59ef72f70b2c6596cce6e63。knowledge/catalog.json 可合；knowledge/characters/silent/v6-history.json 的 scratch git merge-file 退出1。按任务第4节冲突即停，未提交刷新、未实际merge、未覆盖live；原件为 live-merge-preflight.json 及 merge-check-*。候选尚无正式源码commit或live祖先，因此原id保持waiting，不能登记implemented/duplicate/shipped。

## 后续与回退

原ops先协调现有刷新数据冲突，并取得完整宿主检查；只能对本批精确源码/夹具/测试核验并实际发布后补原提案的实现commit与版本。旧失败候选、账本、首证与先验保持，不新建重复id。回退仅撤本候选补丁，恢复输入1为null及旧V6题面；保留证据。当前未上线，不发送已上线双通知、不追加上线决定或eval发布号。实际消费、自然选择与收益分别待验。
