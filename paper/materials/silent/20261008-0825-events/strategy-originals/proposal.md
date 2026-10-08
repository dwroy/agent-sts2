# 静默猎手本批策略提案与逐项处置

来源调度batch：20261008-075538-strategy-proposal；scratch任务：20261008-075540-strategy-proposal。基线main已无冲突快进到07ea18676886c0492c98dee8b1fb2e1862942dd3。仅自己工作，没有派下级；只核本角色日志和knowledge/characters/silent。merge=live。授权Roy-2026-10-07-learning只是权限，不是游戏事实。

## 本批有限实现：花园幽灵鳗跨轮胆小7

关联派发项silent-proposal-246daedaa3021847，账本silent-0211、silent-0209。来源经验任务20261007-153133-experience-update及补链20261007-170244-strategy-proposal；实现任务为本batch。

CA5KE8GFJ9X2，silent A10 F9，T2/T3/T4。同一enemy_id=PHANTASMAL_GARDENER、index=0、max_hp=31；前后都四只活敌，没有死亡导致序号重排：T2 28→21HP且0→7挡，T3 21→15且0→7挡，T4 15→9且0→7挡。原始states字节对8407952655→8407981624、8408122113→8408150708、8408264649→8408294058。固定六帧保存agent/tests/silent-gardener-skittish-evidence.json，原日志只读。

旧行为：turn-solver已有当前轮首张非致死攻击完成后补挡路径；rollout.ts的laterTurnSim每次移除skittish，此后政策调用没有接回。现场T2读到7仍不能阻止后轮把该敌当无胆小。
新行为：boardRolloutInput仅silent A10提供观察开关；后轮仅PHANTASMAL_GARDENER且该实体当前SKITTISH_POWER=7时接回skittish=7。当前轮消费/多段规则、其他实体/层数/进阶/角色保持等价。数据里的血量、伤害仍按原现场和当前进阶数据库路径，不改房间代价五样本门槛。只改变事实推演，不删候选，不新增固定击杀序、权重或SL/药水规则。

反例/限制：四敌扣血不等于退场；T2群伤全体各扣7仍四敌在场，另一目标顺序没有完整实打。原宽提案缺同敌同轮两次非致死失血的独立触发边界，本子项不改当前轮首触发消费规则。一个来源局的连续三轮是机制重复，不能计三独立局或声称胜率提升。未观察其他层数/角色的跨轮规则不推广。

拟合：不拟权重/阈值。固定六帧是发现与回归集；受控两次6伤攻击探针只验证后轮7挡确实进入求解器，不称原实盘完整选线。后移新局胜率验证未完成。
验证：原帧逐步重放、live输入适配→五轮推演及整场policy调用、铁甲/未知角色/A9/A11/不同敌ID/不同层数等价。源码两文件撤到base后新接线用例须失败，恢复须通过，再用agent/tools/test-sandbox.sh。测试固定夹具且禁止读取刷新知识文件，不调LLM/网络。
预期影响：减少后轮把已见胆小7忽略造成的伤害高估；是否改变选线/获胜未知。回退：逆向本有限源码提交，只撤开关和后轮接线，保留日志/账本/并行改动。实际live后才记录版本、旧新规则和Roy双通知，由运维核祖先并登记shipped。

## 10项原派发项（全部保留边界）

### silent-proposal-c20b5139dd0dff71

原提案：冻结当前技能效果和污染逐击血价；当前进阶从观测数据库取攻击，保留所有选项。。证据：DUZUBAJ3A8GP F27 T4/T5；账本silent-0168（完整原ID列表见dispatched-proposals.json）。旧/拟行为、原反例及验证要求逐字保留在同目录silent-proposal-c20b5139dd0dff71.md。
本批处置waiting：仅观察火花3→6一次增长，缺第二次增长及周期隔离，不能拟合跨轮火花规则；技能的挡/毒收益和同资源少技能整战替线仍缺。

### silent-proposal-ae9e692d680e3819

原提案：提案：逐实体记录已观察的抢夺/返还与负属性，再验证当前方案，不设置固定击杀序。。证据：5PM6JAQG6FNQ F39 T4—T6；账本silent-0183、0005（完整原ID列表见dispatched-proposals.json）。旧/拟行为、原反例及验证要求逐字保留在同目录silent-proposal-ae9e692d680e3819.md。
本批处置waiting：首试T4后玩家力量−4→0已核，但POSSESS_STRENGTH_POWER现场amount=1；不能将敌当前力量或玩家负力量直接当来源独立的被夺量。缺返敏、同轮击杀后续攻击及临时/多来源返还分账。

### silent-proposal-246daedaa3021847

原提案：冻结攻击后补挡/退场；若调整胆小消费需独立多次非致死攻击证据，保留所有目标。。证据：CA5KE8GFJ9X2 F9 T2—T4；账本silent-0211、0209（完整原ID列表见dispatched-proposals.json）。旧/拟行为、原反例及验证要求逐字保留在同目录silent-proposal-246daedaa3021847.md。
本批处置waiting：跨轮胆小7字段丢失有本批有限子提案修复；原宽项仍缺同敌同轮两次非致死失血的独立触发/消费边界及另一杀序整战结果，不将有限子项当整项完成。

### silent-proposal-52f1e1bd2e7db0ed

原提案：第一观测起使用当前进阶HP/攻击事实，冻结加压与弱；保留房间代价五样本门槛。。证据：CA5KE8GFJ9X2 F13 T1—T5；账本silent-0231（完整原ID列表见dispatched-proposals.json）。旧/拟行为、原反例及验证要求逐字保留在同目录silent-proposal-52f1e1bd2e7db0ed.md。
本批处置waiting：现场加压两次各+4、覆甲9/9/8/7/6已核；缺逐来源减层条件隔离和加压/覆甲联合调用覆盖，不以显示层数推完整规则。

### silent-proposal-6dd8bbff876be528

原提案：复验现有HIGH_VOLTAGE_POWER逐实体增长，当前进阶攻击从DB读；新召唤者不继承旧实体计数。。证据：5PM6JAQG6FNQ F38 T3/T4；账本silent-0233、0209（完整原ID列表见dispatched-proposals.json）。旧/拟行为、原反例及验证要求逐字保留在同目录silent-proposal-6dd8bbff876be528.md。
本批处置waiting：同爪牙力量2→4、攻击17→19已核；首次出现已力量2，缺出现前至首次成长连续帧，不能确定新实体首次成长/旧计数边界；先杀替线未执行。

### silent-proposal-578e415a259e6835

原提案：核验静默沙虫同指纹SL实付血价、已建攻防与毒结算、候选及资源分账；证据不足保留原选择规则。证据：8JRE1C4H4Z2W F33 首/第三试T2、第二试T5；F17 T6；账本silent-0079、0021、0125、0018及原链接（完整原ID列表见dispatched-proposals.json）。旧/拟行为、原反例及验证要求逐字保留在同目录silent-proposal-578e415a259e6835.md。
本批处置waiting：同指纹实损3/15、扣10/17及0/24与5/24死亡可核；缺原答/护栏/SL/未执行续步/重规划统一生命周期和完整关联回归，规则参数另缺完整同资源胜线。

### silent-proposal-c0767768bf6a7ab1

原提案：全败SL替换与覆盖重放应分列同轮资源代价及未执行续步；先实现事实核验，禁止探索或惩罚系数缺受控胜局证据。。证据：YF0LXT1QSTGG F48 第二/第三试T1；F33 第二试；账本silent-0079（完整原ID列表见dispatched-proposals.json）。旧/拟行为、原反例及验证要求逐字保留在同目录silent-proposal-c0767768bf6a7ab1.md。
本批处置waiting：实损0/9、扣45/38不等于候选0/10、54/36；缺覆盖重放至实际最终派发/未执行续步的统一结构化关联，F33胜试反对全面禁止探索，缺受控整战胜线。

### silent-proposal-a46bdb7fe711d79a

原提案：实验体候选区分阶段、已建能力与已兑现毒/挡收益；零毒触媒和后取得敏捷不预支，动作排序调整证据不足。。证据：YF0LXT1QSTGG F48 末试T3—T5；账本silent-0021、0027、0028、0085（完整原ID列表见dispatched-proposals.json）。旧/拟行为、原反例及验证要求逐字保留在同目录silent-proposal-a46bdb7fe711d79a.md。
本批处置waiting：新阶段212无旧毒、零毒触媒及后来敏捷不追补23挡已核；缺持有/建立/派发的统一阶段候选覆盖，前五试已建能力仍败，不足拟合启动优先级。

### silent-proposal-1044224808015e5c

原提案：核验A10双蟹B2零胜并列的SL换线血价，分列当轮损失、输出与成长；缺独立胜线时保留原行为，不以零差宣称安全。。证据：XP2SL33HT0D9 F33 首/第二试T3、首/末试T1；账本silent-0079（完整原ID列表见dispatched-proposals.json）。旧/拟行为、原反例及验证要求逐字保留在同目录silent-proposal-1044224808015e5c.md。
本批处置waiting：同指纹T3实损9/14、扣24/27；T1实损2/10、扣25/34且替线确立力量1。缺重规划最终派发到成长兑现的全链及相同抽序完整胜线/独立后续验证，B2零差不证明安全。

### silent-proposal-7cbc6005db712ba9

原提案：用本角色日志核验双蟹朝向、临时减力、船夹板T2格挡与能力实际兑现；补缺失条件参考，保留原出牌权重和未验证条件。。证据：XP2SL33HT0D9 F33 末试T2/T4/T5；账本silent-0021、0005、0007、0063、0065、0241、0242（完整原ID列表见dispatched-proposals.json）。旧/拟行为、原反例及验证要求逐字保留在同目录silent-proposal-7cbc6005db712ba9.md。
本批处置waiting：14挡、镣铐−9恢复、火箭57→38→28及末轮毒已核；缺这些事实到最终派发的联合调用覆盖，未观察船夹板额外来源/轮次，不扩写优先级。

各项不以已有单一公式或本次有限子项冒报整个提案duplicate/implemented。原经验、复盘、首证、历史状态均保留；不重复写复盘。报告及最终JSON交运维和机械调度消费；未实现项待本角色新局补证。
