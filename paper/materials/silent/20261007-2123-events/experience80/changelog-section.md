## 2026-10-07 静默猎手 第八十次增量：1 局 A10（version 2026-10-07.26，分支 exp-silent，4b6396bd）

### 来源

- 记录时间2026-10-07T21:16:49+08:00。只合并YQL8RZ8BWN1E静默猎手A10复盘（根notes/lessons.md:5519）与原始日志；runs.jsonl:585确认SILENT/A10/F17败、b0b0e679+dirty，结束2026-10-07T11:52:08.518Z。无角色跳过，last_seen取run-1007-1952文件名，dirty源码不能复原。按局号抽571决策/582状态/6 SL/3 run-plans；状态按时间二分seek后验run_id及character_id，偏移另存；18脑请求均Codex、DeepSeek时间窗0，兼容ds字段不当实际引擎。
- 开工工作区干净，git merge --no-edit main成功；读README/最新STATE/决定末尾/学习及代码提案协议、铁甲首次构建方法及最近两次增量方法、本角色最近两节。独立执行，无下级agent；所有临时文件仅本批scratch，抽取及分析nice19单进程，未跑boss模拟池。
- 汇总截至2026-10-07T11:52:08.518Z：104静默完局，A0—A10局数7/3/2/1/4/1/11/7/1/3/64；1529房94实死，A10为815房64实死。104局均有本角色复盘，无新增只进数字局；历史只进数字局不擅加机制支持。其他角色、无character旧局、进行中及切点后排除；全引擎观察证据不代纯Codex爬塔成绩。
- 旧103局逐局重算：fights/nexts/rests/cards/ends/attempts/growth七数组、血量档及房型、节点转移、回血/SL逐行对上第79节。baseline-check.json保留1519→1529、1419→1424、663→666、34639→34931、9720→9821、596→602、2569→2569；无数字口径差异。
- 沿上一节：首COMBAT HP−同房最终尝试退出结算HP，死亡单列，负回复保留；Monster走廊与Unknown问号战分开。入血/max HP分<25%、[25%,40%)、[40%,60%)、≥60%；REST/SHOP/普通EVENT关联下一更高层第一战、Ancient排除/多源可同战/回血后战去重。SL判死截断不补攻击/毒，只有末试实死；六试是一战一局。
- 开工154 active/49461字<55000；新增0、更新11（补证据11、只数字0）、退役0，定稿154 active/48612字。压短药瓶/毒药重复案例并更新典型案例，旧全文在experience-before.json/changes.json，不合并独立条目或改预算。机制[0,20]；生存者条目从[6,20]改为机制[0,20]，不外推低阶最优弃牌；路线/休息/构筑沿[8,20]。
- 全部九赢战资源链：F2 67/81→63损4、F3 63→63、F4 63→62损1、F5 62/81→47/86净损15（果汁回5后操作损20）、F6 47→18损29、F7 18→14损4、F12 39→35损4、F13 35→35、F15 35→32损3；房内净损60/操作损65。F9锻造不回血，F11 14→39/F16 32→57实回50，牡蛎11/果汁5分列；五次SL恢复239与同存档两药复原不算路线回血/新获十瓶。独立获药6/use16/弃0，无未走线和提前喝药整战对照。

### 对照数据检查的主题

| 主题 | 数据 | 结论 |
| --- | --- | --- |
| 毒雾（silent-noxious-fumes-growth） | 支持48/反例0；各阶{'0': 4, '1': 2, '2': 2, '4': 4, '5': 1, '6': 4, '7': 1, '8': 1, '9': 3, '10': 26} | 毒雾普通/升级建2/3层，后续玩家轮初补毒，建立不即时施毒且可叠加。 |
| 触媒（silent-accelerant-triggers） | 支持38/反例0；各阶{'0': 3, '2': 1, '3': 1, '4': 1, '6': 2, '7': 1, '8': 1, '9': 1, '10': 27} | 触媒增加毒结算次数、不倍增层数，普通/升级建1/2且自身不施毒。 |
| 弹跳药瓶（silent-bouncing-flask-poison） | 支持16/反例0；各阶{'0': 3, '1': 2, '2': 2, '4': 2, '6': 2, '9': 1, '10': 4} | 弹跳药瓶按次数、分配与毒结算兑现，不把尚存毒当实伤。 |
| 致命毒药（silent-deadly-poison-application） | 支持30/反例0；各阶{'0': 5, '1': 1, '2': 1, '3': 1, '4': 1, '6': 3, '7': 2, '8': 1, '10': 15} | 致命毒药普通/升级施5/7毒，不即时扣血。 |
| 尖啸（silent-piercing-wail-temporary-strength） | 支持48/反例0；各阶{'0': 3, '1': 2, '2': 1, '3': 1, '5': 1, '6': 4, '7': 2, '8': 1, '9': 2, '10': 31} | 尖啸临时降力按敌当前攻击段数兑现，不当恒定挡或永久降力。 |
| silent-strength-weak-observation（silent-strength-weak-observation） | 支持100/反例0；各阶{'0': 7, '1': 3, '2': 2, '3': 1, '4': 4, '5': 1, '6': 11, '7': 7, '8': 1, '9': 3, '10': 60} | 力量逐击影响攻击、敏捷逐张影响卡牌挡，临时减益与独立成长分账。 |
| silent-deck-burst-observation（silent-deck-burst-observation） | 支持99/反例0；各阶{'0': 6, '1': 3, '2': 2, '3': 1, '4': 4, '5': 1, '6': 11, '7': 7, '8': 1, '9': 3, '10': 60} | 观察：持有、计划与本战已建能力分账，支付和生存窗口限制持续攻防兑现。 |
| silent-giant-explosion-window（silent-giant-explosion-window） | 支持20/反例0；各阶{'0': 2, '1': 1, '2': 1, '4': 1, '5': 1, '6': 4, '10': 10} | 巨兽本体归零后仍须承受自爆，击杀时点与当轮血挡共同验收。 |
| 生存者（silent-survivor-neutralize-discard） | 支持3/反例0；各阶{'6': 1, '10': 2} | 观察：生存者后的弃牌可拆掉原方案的攻击、抽牌或虚弱，须按新手牌重核。 |
| silent-route-hp-observation（silent-route-hp-observation） | 支持104/反例0；各阶{'0': 7, '1': 3, '2': 2, '3': 1, '4': 4, '5': 1, '6': 11, '7': 7, '8': 1, '9': 3, '10': 64} | 观察：按实际入血与下一战敌人核路线血价，未来营火/无精英不保证安全。A10共64局，二幕Monster<25%为7房3死、25–40%为6房2死；三幕Elite≥60%为10房1死/活损中位52，A8一局/A9三局另列。 |
| silent-rest-buffer-observation（silent-rest-buffer-observation） | 支持104/反例0；各阶{'0': 7, '1': 3, '2': 2, '3': 1, '4': 4, '5': 1, '6': 11, '7': 7, '8': 1, '9': 3, '10': 64} | 观察：只计实际完成回复，后战胜负另核、不预支未来营火。A10 64局352火/243次回血实回5770，去重225后战35死（15.56%）/活损中位24；A8七后战0死/A9十五后战1死。 |
| 本局SL对照 | 同57/86、两药六试0赢；本体T12/T12/T11/T12/T12/T9、自爆50/50/47/50/50/41；末26血13挡对41，完整需损28差2 | 早三轮少9自爆，仍不等胜；T6少挡/T7药瓶/T8触媒等均变，不把整战差异单因归一步或运气 |
| 同指纹弃牌 | 首/末T3指纹相同，六次都选生存者接猎杀者，再弃猎杀者；原29伤/损3，实13毒伤/损0 | 少16伤也省3血；原后继抽2没建立，保留线未实打，不认定弃牌必败/纯bug |
| 残壳毒水 | 末T10毒2→8、HP26/挡13/自爆41不变 | 不把占位体施毒当新需伤、即时保命或已降低固定自爆；提前用药胜负未知 |
| 毒雾历史异常复核 | 54实际施放局569记录，2/3/6增层283/285/1；1LMBFGSMCWKU A4 F45 T1有投斧，首牌毒雾+牌面3、能力0→6 | 一次派发含两次实放，与逐次3及叠层一致；不当反例或新增未知规则。已有证据48局，其他六局不擅补机制支持 |
| 触媒历史 | 45实际施放局366动作，增1/2为231/135；支持38局 | 实放与证据分母分开，不把一局多放算独立支持 |
| 蒸汽跨进阶 | 20支持局，已核T2：A0/A1/A2/A4/A5/A6为15、A10为20 | 条目明确20只为A10案例；按当前蒸汽核自爆，不向低阶外推20 |

A8/A9/A10非空战房血档；A0—A7每格与旧值相同，完整列表在audit.json：

| 进阶 | 幕 | 房型 | 血档 | 房/局 | 死/率 | 活损中位 |
| --- | --- | --- | --- | --- | --- | --- |
| A8 | 1 | Monster | ≥60% | 5/1 | 0/0.00% | 3 |
| A8 | 1 | Elite | ≥60% | 3/1 | 0/0.00% | 5 |
| A8 | 1 | Boss | ≥60% | 1/1 | 0/0.00% | 20 |
| A8 | 2 | Monster | ≥60% | 6/1 | 0/0.00% | 4.5 |
| A8 | 2 | Elite | ≥60% | 2/1 | 0/0.00% | 2.0 |
| A8 | 2 | Boss | ≥60% | 1/1 | 0/0.00% | 19 |
| A8 | 3 | Monster | ≥60% | 5/1 | 0/0.00% | 0 |
| A8 | 3 | Unknown | ≥60% | 1/1 | 0/0.00% | 17 |
| A8 | 3 | Boss | ≥60% | 1/1 | 0/0.00% | 10 |
| A9 | 1 | Monster | 25–40% | 2/2 | 0/0.00% | 1.0 |
| A9 | 1 | Monster | 40–60% | 2/2 | 0/0.00% | 0.5 |
| A9 | 1 | Monster | ≥60% | 9/3 | 0/0.00% | 6 |
| A9 | 1 | Elite | ≥60% | 4/3 | 0/0.00% | 38.5 |
| A9 | 1 | Unknown | ≥60% | 1/1 | 0/0.00% | 20 |
| A9 | 1 | Boss | 40–60% | 2/2 | 0/0.00% | 33.5 |
| A9 | 1 | Boss | ≥60% | 1/1 | 0/0.00% | 27 |
| A9 | 2 | Monster | 25–40% | 1/1 | 0/0.00% | 1 |
| A9 | 2 | Monster | 40–60% | 4/2 | 0/0.00% | 18.5 |
| A9 | 2 | Monster | ≥60% | 8/3 | 0/0.00% | 3.0 |
| A9 | 2 | Elite | ≥60% | 3/3 | 0/0.00% | 25 |
| A9 | 2 | Unknown | <25% | 1/1 | 0/0.00% | 4 |
| A9 | 2 | Boss | 40–60% | 2/2 | 1/50.00% | 37 |
| A9 | 2 | Boss | ≥60% | 1/1 | 0/0.00% | 40 |
| A9 | 3 | Monster | 40–60% | 1/1 | 1/100.00% | None |
| A9 | 3 | Monster | ≥60% | 4/2 | 0/0.00% | 6.0 |
| A9 | 3 | Unknown | ≥60% | 1/1 | 0/0.00% | 0 |
| A9 | 3 | Boss | ≥60% | 1/1 | 0/0.00% | 72 |
| A10 | 1 | Monster | <25% | 8/7 | 2/25.00% | 5.0 |
| A10 | 1 | Monster | 25–40% | 7/6 | 0/0.00% | 7 |
| A10 | 1 | Monster | 40–60% | 45/28 | 0/0.00% | 7 |
| A10 | 1 | Monster | ≥60% | 262/64 | 1/0.38% | 3 |
| A10 | 1 | Elite | <25% | 1/1 | 1/100.00% | None |
| A10 | 1 | Elite | 40–60% | 6/6 | 3/50.00% | 25 |
| A10 | 1 | Elite | ≥60% | 44/38 | 2/4.55% | 25.0 |
| A10 | 1 | Unknown | 25–40% | 4/4 | 0/0.00% | 14.5 |
| A10 | 1 | Unknown | 40–60% | 10/10 | 0/0.00% | 4.0 |
| A10 | 1 | Unknown | ≥60% | 37/31 | 0/0.00% | 3 |
| A10 | 1 | Boss | 25–40% | 1/1 | 1/100.00% | None |
| A10 | 1 | Boss | 40–60% | 8/8 | 5/62.50% | 36 |
| A10 | 1 | Boss | ≥60% | 46/46 | 8/17.39% | 42.5 |
| A10 | 2 | Monster | <25% | 7/6 | 3/42.86% | 3.0 |
| A10 | 2 | Monster | 25–40% | 6/5 | 2/33.33% | -1.0 |
| A10 | 2 | Monster | 40–60% | 24/20 | 0/0.00% | 9.5 |
| A10 | 2 | Monster | ≥60% | 111/41 | 1/0.90% | 10.5 |
| A10 | 2 | Elite | 40–60% | 1/1 | 1/100.00% | None |
| A10 | 2 | Elite | ≥60% | 21/17 | 2/9.52% | 32 |
| A10 | 2 | Unknown | <25% | 1/1 | 0/0.00% | 0 |
| A10 | 2 | Unknown | 25–40% | 3/3 | 1/33.33% | 3.5 |
| A10 | 2 | Unknown | 40–60% | 4/4 | 1/25.00% | 37 |
| A10 | 2 | Unknown | ≥60% | 17/13 | 0/0.00% | 15 |
| A10 | 2 | Boss | 25–40% | 2/2 | 1/50.00% | 29 |
| A10 | 2 | Boss | 40–60% | 2/2 | 1/50.00% | 10 |
| A10 | 2 | Boss | ≥60% | 26/26 | 6/23.08% | 42.5 |
| A10 | 3 | Monster | <25% | 7/5 | 2/28.57% | 2 |
| A10 | 3 | Monster | 25–40% | 4/4 | 2/50.00% | 3.0 |
| A10 | 3 | Monster | 40–60% | 12/10 | 3/25.00% | 17 |
| A10 | 3 | Monster | ≥60% | 52/22 | 2/3.85% | 17.5 |
| A10 | 3 | Elite | ≥60% | 10/8 | 1/10.00% | 52 |
| A10 | 3 | Unknown | <25% | 1/1 | 0/0.00% | -2 |
| A10 | 3 | Unknown | 25–40% | 1/1 | 0/0.00% | 0 |
| A10 | 3 | Unknown | 40–60% | 1/1 | 0/0.00% | 0 |
| A10 | 3 | Unknown | ≥60% | 7/6 | 0/0.00% | 9 |
| A10 | 3 | Boss | <25% | 3/3 | 3/100.00% | None |
| A10 | 3 | Boss | 25–40% | 1/1 | 1/100.00% | None |
| A10 | 3 | Boss | 40–60% | 3/3 | 3/100.00% | None |
| A10 | 3 | Boss | ≥60% | 9/8 | 5/55.56% | 57.0 |

A10源节点入血档到下一实战；多源可同战，其他阶完整行在audit.json/transfers：

| 幕 | 源房 | 血档 | 源节点/不同战 | 死/率 | 活损中位 |
| --- | --- | --- | --- | --- | --- |
| 1 | REST | <25% | 23/21 | 8/34.78% | 9 |
| 1 | REST | 25–40% | 29/29 | 5/17.24% | 20.0 |
| 1 | REST | 40–60% | 69/58 | 4/5.80% | 14 |
| 1 | REST | ≥60% | 81/70 | 2/2.47% | 21 |
| 1 | SHOP | <25% | 6/6 | 1/16.67% | 13 |
| 1 | SHOP | 25–40% | 3/3 | 0/0.00% | 6 |
| 1 | SHOP | 40–60% | 22/22 | 1/4.55% | 10 |
| 1 | SHOP | ≥60% | 48/47 | 1/2.08% | 4 |
| 1 | EVENT | <25% | 7/7 | 2/28.57% | 9 |
| 1 | EVENT | 25–40% | 8/7 | 3/37.50% | 17 |
| 1 | EVENT | 40–60% | 32/28 | 2/6.25% | 10.0 |
| 1 | EVENT | ≥60% | 92/85 | 2/2.17% | 4.0 |
| 2 | REST | <25% | 11/11 | 2/18.18% | 10 |
| 2 | REST | 25–40% | 23/22 | 4/17.39% | 19 |
| 2 | REST | 40–60% | 41/34 | 2/4.88% | 19 |
| 2 | REST | ≥60% | 32/31 | 3/9.38% | 25 |
| 2 | SHOP | <25% | 3/3 | 0/0.00% | 0 |
| 2 | SHOP | 25–40% | 8/8 | 3/37.50% | 6 |
| 2 | SHOP | 40–60% | 9/8 | 0/0.00% | 33 |
| 2 | SHOP | ≥60% | 37/31 | 1/2.70% | 12.0 |
| 2 | EVENT | <25% | 11/9 | 3/27.27% | 3.5 |
| 2 | EVENT | 25–40% | 14/10 | 5/35.71% | 11 |
| 2 | EVENT | 40–60% | 18/14 | 0/0.00% | 7.0 |
| 2 | EVENT | ≥60% | 59/47 | 1/1.69% | 14.0 |
| 3 | REST | <25% | 11/11 | 6/54.55% | 18 |
| 3 | REST | 25–40% | 9/9 | 4/44.44% | 15 |
| 3 | REST | 40–60% | 7/7 | 1/14.29% | 44.5 |
| 3 | REST | ≥60% | 16/14 | 0/0.00% | 32.0 |
| 3 | SHOP | <25% | 4/4 | 1/25.00% | 0 |
| 3 | SHOP | 25–40% | 4/3 | 1/25.00% | 9 |
| 3 | SHOP | 40–60% | 6/6 | 1/16.67% | 32 |
| 3 | SHOP | ≥60% | 9/9 | 0/0.00% | 2 |
| 3 | EVENT | <25% | 5/5 | 2/40.00% | 7 |
| 3 | EVENT | 25–40% | 8/7 | 0/0.00% | 13.0 |
| 3 | EVENT | 40–60% | 11/7 | 0/0.00% | 32 |
| 3 | EVENT | ≥60% | 13/11 | 0/0.00% | 13 |

各阶独立局/营火/SL分母：

| 进阶 | 局 | 战房/实死 | 火/回血/非回血 | 实回血 | 后战/死/活损中位 | 真重打场/尝试/赢尝试 |
| --- | --- | --- | --- | --- | --- | --- |
| A0 | 7 | 123/6 | 55/25/30 | 523 | 23/4/27 | 8/33/4 |
| A1 | 3 | 44/2 | 21/9/12 | 238 | 8/2/35.0 | 3/14/1 |
| A2 | 2 | 39/1 | 14/10/4 | 188 | 10/1/11 | 1/6/0 |
| A3 | 1 | 22/0 | 10/8/2 | 195 | 8/0/17.5 | 0/0/0 |
| A4 | 4 | 77/3 | 30/22/8 | 476 | 21/2/14 | 2/10/0 |
| A5 | 1 | 19/0 | 9/6/3 | 127 | 6/0/20.0 | 1/2/1 |
| A6 | 11 | 184/10 | 81/52/29 | 1219 | 46/4/12.0 | 8/35/3 |
| A7 | 7 | 133/6 | 56/31/25 | 743 | 27/5/16.0 | 7/31/1 |
| A8 | 1 | 25/0 | 9/8/7 | 111 | 7/0/10 | 0/0/0 |
| A9 | 3 | 48/2 | 21/16/5 | 341 | 15/1/34.0 | 3/10/2 |
| A10 | 64 | 815/64 | 352/243/111 | 5770 | 225/35/24.0 | 62/283/18 |

- 营火按节点，回血/非回血按动作，帐篷允许同火兼做，不能直接相加。低血改线只观察：本局F7改无精英后仍败；MGA0CZDDKC0P休22→43后走廊损17活/4D4J8USKCPAV休1→22后损1活，D4LJ9QMGFB8Q事件13/BVF22RSFVBS9事件21后走廊死；敌/牌/间隔不同，旧线未实打，无因果安全线。
- 全史真正SL95场424试30赢；20证据局巨兽7场真正重打/25试/4赢尝试（全部遭遇尝试38次/赢17）。本局没有赢的那次；A0首证两试一赢、初始牌序前22张相同，但后续抽牌与动作均有变化；本局首末T3同指纹只支持局部兑现差异，不凭全程同抽牌或运气解释胜负。

### 经验库自己带偏或写了没被执行的地方

- 实际DeepSeek推理0、18次脑请求均Codex；无显式经验ID引文，不编造DS引用。F1原话「先补输出，营火夹护后期精英，保血应对自爆。」；F7实改无精英线，F9选择升级而未回血；F15原答译「第二触媒加强现有毒成长，较快击杀限制敌成长与巨兽自爆」，末试确实少9自爆仍败，不把计划本身当误导证据。完整原话在journal-quotes.json。
- F16原答译「回血到57提供最强生存改善；毒成长已建立，血与防御须覆盖最后自爆」；实休32→57，但末26+13<41，没取得计划所求步法；不把未来格挡预支。F1药瓶皮套回答结果not dispatched: state changed while deciding，实际骨骰/失物盒/牡蛎，不虚记额外两药。
- T3原方案后继猎杀者被弃，末试初题原话「Jev chose plan 1/2 (生存者, 猎杀者 -> 瀑布巨兽) with confidence 0.70; code rank 1」，弃牌题原话「Jev chose 猎杀者 with confidence 0.84」，重问防御后实际13毒伤/零损。不沿用原29伤/损3与下轮抽2。药水题写「数值未知、药水表未加载/持有价0」，不能当已验证无价值；只核残壳即时效果，未制定提前用药规则。

### 机制推理

| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |
| --- | --- | --- | --- | --- |
| 毒雾 | 无阻挡时每轮补a，k层触媒至多结算k+1次、每次毒减1；毒充足时净变a−(k+1)，层数不等实伤。搭配：先实建毒源/触媒与生存窗口，换战清能力。 | 48/0；{'0': 4, '1': 2, '2': 2, '4': 4, '5': 1, '6': 4, '7': 1, '8': 1, '9': 3, '10': 26} | YQL8RZ8BWN1E A10巨兽T1雾2不即时施毒；单触媒下7毒逐轮结7+6后补2仍7，双触媒T8结16+15+14后T9补2仅15。YF0LXT1QSTGG末试未建雾/未施毒，单建触媒无毒伤。 | silent-noxious-fumes-growth |
| 触媒 | k层至多k+1次，每次毒减1、零停止；普通p≥2为2p−1，升级p≥3为3p−3，实际扣血受剩血/阶段/限伤约束。搭配：毒雾补量与额外消耗分账，无毒无收益。 | 38/0；{'0': 3, '2': 1, '3': 1, '4': 1, '6': 2, '7': 1, '8': 1, '9': 1, '10': 27} | YQL8RZ8BWN1E A10 T7单触媒16+15=31毒；T8第二普通触媒叠1→2、16+15+14=45，T9三结42杀本体却仍自爆败。VLZ6CCT8AQ0A枢纽12/16毒三结33/45；YF0LXT1QSTGG新阶段建2但零毒。 | silent-accelerant-triggers |
| 弹跳药瓶 | 普通3毒×3次=9、升级3毒×4次=12；制品逐次阻减益，多敌分配不保证均匀，施毒动作不即时扣血。搭配：触媒增加结算次数、毒雾补层，挡延长可活窗口；技能污染/重放另核。 | 16/0；{'0': 3, '1': 2, '2': 2, '4': 2, '6': 2, '9': 1, '10': 4} | YQL8RZ8BWN1E A10末T7普通药瓶7→16毒、128血不变，当轮31毒加9直伤扣40，末仍自爆败。HSX4HYATB4E2沙漏首试三跳耗三制品无毒，第二先清制品才建9；ENKYQMS9W4ZD升级药瓶三放建36毒。 | silent-bouncing-flask-poison |
| 致命毒药 | 每次按现层结毒再减1，制品可阻施毒，头骨补量/触媒次数/无实体/限伤/剩血与阶段另核。搭配：毒雾维持毒源、触媒放大已存在毒，技能副作用与生存窗口分账。 | 30/0；{'0': 5, '1': 1, '2': 1, '3': 1, '4': 1, '6': 3, '7': 2, '8': 1, '10': 15} | YQL8RZ8BWN1E A10巨兽T1升级0→7毒、250血不变，触媒1结7+6=13，雾补2后仍7；T9本体剩42毒杀后占位体重新2毒，不延用旧15。LRN0HPZ0FZS1制品1→0无毒；D4LJ9QMGFB8Q外骨骼毒5→12，受9限伤只扣9留2。 | silent-deadly-poison-application |
| 尖啸 | 普通/升级减6/8，逐击加力量再核虚弱，玩家易伤与下一轮恢复另核。搭配：多段招式重复受益，仍需真实牌挡，不把临时减力预支到自爆。 | 48/0；{'0': 3, '1': 2, '2': 1, '3': 1, '5': 1, '6': 4, '7': 2, '8': 1, '9': 2, '10': 31} | YQL8RZ8BWN1E A10巨兽T6敌力0→−6、14→8；末试仅斗篷6挡损2，首试再防御共11挡零损，T7负力消失。751FN9QM9MHQ异鱼F11三击1×3→0，另两单击7→1/8→2。 | silent-piercing-wail-temporary-strength |
| silent-strength-weak-observation | 当前力量逐段核虚弱，卡牌挡加敏捷再核脆弱，毒/遗物挡另算。搭配：多段攻击与多张挡牌重复收益，能力须实建、可活结算。 | 100/0；{'0': 7, '1': 3, '2': 2, '3': 1, '4': 4, '5': 1, '6': 11, '7': 7, '8': 1, '9': 3, '10': 60} | YQL8RZ8BWN1E A10玩家未建力/敏，防御5、生存者8；T6敌力−6令14→8，斗篷6仍损2，下轮负力撤回。KV0JHNJCKXLS恶魔加3力使三击9×3→12×3多9；YF0LXT1QSTGG四力四小刀本体32、消耗另4。 | silent-strength-weak-observation |
| silent-deck-burst-observation | 轮初补毒与结束结算分别核，叠能力须现有毒源，换阶段重核敌状态。搭配：抽牌/防御/敏捷须实际取得与打出，不将局部输出当整战胜率。 | 99/0；{'0': 6, '1': 3, '2': 2, '3': 1, '4': 4, '5': 1, '6': 11, '7': 7, '8': 1, '9': 3, '10': 60} | YQL8RZ8BWN1E A10两普通触媒叠2、雾2与药瓶实兑现毒，T9毒杀42血本体，比首试早3轮且少一次15回血，仍26血13挡对41自爆差2败；计划步法未取得、玩家全战零敏。YF0LXT1QSTGG触媒2但新阶段零毒，额外毒伤0。 | silent-deck-burst-observation |
| silent-giant-explosion-window | A10已见蒸汽T2=20后每轮+3，本体结束时固定下一轮自爆；血{@2:HP:WATERFALL_GIANT}，残壳999999999不计新需伤。搭配：本体毒伤、回血与残壳来袭分账，残壳施毒不当补血或挡。 | 20/0；{'0': 2, '1': 1, '2': 1, '4': 1, '5': 1, '6': 4, '10': 10} | YQL8RZ8BWN1E A10同场六试0赢，首T12杀→T13自爆50，末T9毒杀→T10自爆41，少9仍26+13<41；末轮毒水2→8毒、自爆仍41。2K4H3JEJHRSB T9杀后24挡对41损17活。 | silent-giant-explosion-window |
| 生存者 | 被弃后继牌未实放就不产生原效果；生存者普通8挡与后继收益分账。搭配：当前来袭、剩挡、保留牌与取消的伤害/抽牌/减伤一起验收。 | 3/0；{'6': 1, '10': 2} | YQL8RZ8BWN1E A10六试T3原选生存者接猎杀者却弃猎杀者，原29伤/损3变实际13毒伤/损0，少16伤也省3血、未建下轮抽2。53FLQ68CETW0 A6弃中和损0→1；V0383V5S9BCQ弃中和留切割18挡对24损6。 | silent-survivor-neutralize-discard |

- 每条evidence/contradicting及各进阶分母在experience.json/historical-facts.json；逐局核角色、实际施放或选择帧和敌人。局部机制收益与完整胜因分账；毒雾/触媒无毒、限伤、换阶段旧例保留，单张整战胜因未控。生存者pending选择帧按实际8挡及后续弃牌单独验，不能被只保留completed动作的卡牌汇总漏掉。
- 专用提案CLI：silent-proposal-7f6b8dd004796c82,silent-proposal-9733bb80f445aeae,silent-proposal-7a0d3e7d219d6661，source_task=experience-update、target_task=strategy-proposal；三份分别覆盖毒源/能力/临时减力、巨兽阶段/残壳用药/SL终局、弃牌承诺，domains combat/potion/sl/terminal。沿0250原提案来源但不改其observed状态；只pending，未implemented/shipped。

### 新增

- 无。同一机制合入旧条目，不造重复经验；纯SL指标bug不写给大脑。

### 更新

| 条目 | 支持局数 | 字符改前→后 | 新证据 |
| --- | --- | --- | --- |
| silent-noxious-fumes-growth | 47→48 | 247→243 | YQL8RZ8BWN1E |
| silent-accelerant-triggers | 37→38 | 256→269 | YQL8RZ8BWN1E |
| silent-bouncing-flask-poison | 15→16 | 571→259 | YQL8RZ8BWN1E |
| silent-deadly-poison-application | 29→30 | 764→259 | YQL8RZ8BWN1E |
| silent-piercing-wail-temporary-strength | 47→48 | 241→229 | YQL8RZ8BWN1E |
| silent-strength-weak-observation | 99→100 | 222→244 | YQL8RZ8BWN1E |
| silent-deck-burst-observation | 98→99 | 257→252 | YQL8RZ8BWN1E |
| silent-giant-explosion-window | 19→20 | 268→276 | YQL8RZ8BWN1E |
| silent-survivor-neutralize-discard | 2→3 | 280→252 | YQL8RZ8BWN1E |
| silent-route-hp-observation | 103→104 | 273→260 | YQL8RZ8BWN1E |
| silent-rest-buffer-observation | 103→104 | 217→204 | YQL8RZ8BWN1E |

- 11条均补本局证据，0条只改数字；旧证据/反例保持，置信度分档不变。药瓶/毒药压短旧重复案例，旧全文/来源留before/changes；无独立合并/退役压缩。

### 退役

- 无。本任务未修源码机制，事实机制与已有模型共存；未把整战死亡当机制公式反例。

### 和手写知识及代码冲突

- 本角色其余八文件均核哈希/元数据（other-knowledge.json）。七张生成表保留各自切点/训练口径：room-costs止04:49:44Z、93局且按MAP净损，monster-records止05:17:55Z/1383房，boss-damage按轮初/显示威胁，与本次战后净损不同，未覆盖成不等口径值；模型/可信度不由一次失败改系数。double-boss仅既有四局F49证据，本局F17不更新连续boss数据。无手写知识需改删，其他角色未读未改。
- 当前本树card-model.ts:1071—1072已读取毒雾/触媒动态量，部分机制已建模；独立任务先核实等价/实际live祖先源码，不能冒称新修。explore.ts:887—913残血求和/排序仍含占位血，复盘0250/原策略提案e18d3f18链保留；本任务只在巨兽条目保留真实阶段/数值事实，不写源码警告。弃牌题的原方案后继信息不足与重问省血须独立验证，不当已定位纯bug。

### 代码问题（不给 DS）

- 纯SL指标bug silent-0250留observed，未并进经验也不改其状态；占位HP排序与最长存活优先是两件事，未证明改序能赢。新任务沿提案链复用旧来源；本任务无源码/生成器/依赖/运维prompt修改。
- 离线查询误读一个不存在的sim文件路径，只有rg错误，无源码改动；原日志/脚本/初稿均保留。首次测试启动后跨进阶复核将蒸汽20限定A10，保留第一轮快照，再以最终JSON完整复测；这不是代码测试失败。

### 测试

- 原入口bash tools/test-sandbox.sh（SANDBOX_WORKERS=1、固定排除/固定数据）：最终tsc 0，vitest 0，239文件/2511例。原日志/rc在test-source*.log/rc，测试次数2；首轮结果{'tsc': 0, 'vitest': 0, 'files': 239, 'cases': 2511}，无失败超时则不另扩测。外部完整套件由调度器据实际合入另补。
- JSON/60k预算/12位局号及角色/支持反例数/旧七数组及房档/节点/回血/SL/582帧571决策/六试同指纹弃牌/毒雾触媒药瓶毒药尖啸/蒸汽与残壳药水/固定切片/diff --check/gitleaks/check-experience通过，missing=[]。
- 学习账本仅CLI：新增无；proposed silent-0011,silent-0027,silent-0007,silent-0046,silent-0006,silent-0021,silent-0017,silent-0205,silent-0019,silent-0020；退役无；check 0。只追加来源/新支持/源提交/本节，首证/先验/claim/旧support/repeat/version与所有历史保持，未accepted/shipped。
- live实际合入：None；刷新提交：None；刷新后/合前：31914e4ba652d6e8466a4a99f04128005166ecf2；合后沙箱：None；知识重叠：[]；结果：锁内合并预检冲突，按任务停止、不硬解。
- CONFLICT (content): Merge conflict in eval/versions.json
- CONFLICT (content): Merge conflict in knowledge/characters/silent/boss-damage.json
- CONFLICT (content): Merge conflict in knowledge/characters/silent/fight-value-gates.json
- CONFLICT (content): Merge conflict in knowledge/characters/silent/fight-value.json
- CONFLICT (content): Merge conflict in knowledge/characters/silent/monster-records.json
- CONFLICT (content): Merge conflict in knowledge/characters/silent/outcome-stats.json
- CONFLICT (content): Merge conflict in knowledge/characters/silent/room-costs.json
- CONFLICT (content): Merge conflict in knowledge/common/card-upgrades.json
- CONFLICT (content): Merge conflict in knowledge/common/monster-db.json
- CONFLICT (content): Merge conflict in knowledge/common/move-model.json
- CONFLICT (modify/delete): notes/fight-value-backtest-silent.md deleted in 4b6396bd462ca61bb13d082fdc73fdf5d0cf610a and modified in 31914e4ba652d6e8466a4a99f04128005166ecf2.  Version 31914e4ba652d6e8466a4a99f04128005166ecf2 of notes/fight-value-backtest-silent.md left in tree.
- CONFLICT (content): Merge conflict in notes/fix-queue-v4.md
- CONFLICT (content): Merge conflict in notes/for-dai.md
- CONFLICT (content): Merge conflict in notes/lessons.md
- CONFLICT (content): Merge conflict in notes/ops-handoff.md
- CONFLICT (content): Merge conflict in ops/inbox-dev.md
- CONFLICT (content): Merge conflict in paper/data/README.md
- CONFLICT (content): Merge conflict in paper/data/commits.csv
- CONFLICT (content): Merge conflict in paper/data/cost-curve-silent.csv
- CONFLICT (content): Merge conflict in paper/data/cost-silent.csv
- CONFLICT (content): Merge conflict in paper/data/cost-sources.json
- CONFLICT (content): Merge conflict in paper/data/cost-unattributed.csv
- CONFLICT (content): Merge conflict in paper/data/decisions_by_label.csv
- CONFLICT (content): Merge conflict in paper/data/learning-curve-silent.csv
- CONFLICT (content): Merge conflict in paper/data/runs.csv
- CONFLICT (content): Merge conflict in paper/data/summary.json
- CONFLICT (content): Merge conflict in paper/data/verification.json
- CONFLICT (content): Merge conflict in paper/materials/decision-log.md
- CONFLICT (content): Merge conflict in paper/materials/experience-changelog-silent.md
- CONFLICT (content): Merge conflict in paper/materials/learning/ledger.jsonl
- CONFLICT (content): Merge conflict in paper/materials/silent/cost.md

### 切片大小

- 固定种子20260929，从截至本切点state.run.character_id=SILENT的原始状态抽最高A9/A10各20×COMBAT/REWARD/MAP/EVENT/REST/SHOP=240配对；CHARACTER=silent调用官方knowledge-slice.ts，common/其他静默知识冻结，池/样本/时刻在sample-manifest.json。不是V4整份前缀大小。

| 进阶/界面 | 改前中位/最大（字） | 改后中位/最大（字） | 配对增量中位 |
| --- | --- | --- | --- |
| a10-combat | 2837.0/3762 | 2860.0/3785 | 23.0 |
| a10-event | 2359.5/3206 | 2363.5/3206 | 0.0 |
| a10-map | 2558.0/3162 | 2532.0/3136 | -26.0 |
| a10-rest | 2115.0/2858 | 2102.0/2845 | -13.0 |
| a10-reward | 2473.0/3988 | 2472.0/3478 | -5.0 |
| a10-shop | 3810.0/5111 | 3805.0/5106 | -5.0 |
| a9-combat | 3342.0/3762 | 3365.0/3785 | 23.0 |
| a9-event | 2429.5/3510 | 2429.5/3510 | 0.0 |
| a9-map | 2742.0/3162 | 2716.0/3136 | -26.0 |
| a9-rest | 2346.0/2858 | 2333.0/2845 | -13.0 |
| a9-reward | 2477.0/3117 | 2472.0/3112 | -5.0 |
| a9-shop | 3510.0/5340 | 3505.0/5335 | -5.0 |

- 整体中位2672.0→2703.0（+31字），配对增量中位-5.0、最大增量31；最大5340→5335字。active154→154、正文49461→48612字，高82/中46/低26；A8适用146条45405字、A9适用147条45689字、A10适用150条46811字。需要Dai定的知识事项：无。
