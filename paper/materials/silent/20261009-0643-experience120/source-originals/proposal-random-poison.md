# 静默多敌随机施毒的目标进度与总毒挡分开，不以伪确定分配保证胜利

角色silent；新证据A10；来源experience-update/20261009-061302，独立实现strategy-proposal。授权Roy-2026-10-07-learning不提供游戏事实。
账本：silent-0007,silent-0010,silent-0295
经验：silent-bouncing-flask-poison,silent-mirage-poison-card-block,silent-deadly-poison-application

## 旧行为、已核证据与新行为
F31第2/3/4试T3普通药瓶三份3毒母体只分到3，母体2→5、血55不变，下一轮50血余4毒；第2/4试两幼虫各3，第3试同一幼虫6。题面把母体55→44余10毒并24/24赢，总毒结11却可与实盘相同，母体差6。蜃景总11挡实6→17/0→11均兑现，不能用总挡正确证明指定目标进度正确。旧G8NHLL09DLBX、CNKR125PFHJ5的0295同根因未修队列保持；本局是Jev选线而非combat/lethal，不冒报新的自动斩杀保证。独立任务核当前turn-solver.ts随机施毒仍最高HP+挡选靶，枚举已观察分配或保守未定标记，严格必死闸不扩大。四试前30抽序相同均败，T2/T4探索、随机分配和幼虫数同变，不能宣称单一目标变更或运气造成勝败。普通致命在F30T8将5→10毒、只按6剩血计已结，不把加层当即时伤或胜率。

- silent-bouncing-flask-poison；旧经验：弹跳药瓶按实际次数、分配与毒结算兑现，多敌不保证指定目标收尾。机制：普通3毒×3次、升级3毒×4次；制品逐次阻毒，施毒不即时伤，最高血目标不等最坏随机分配。搭配：触媒增结算次数、毒雾补毒，随机未发生不预定。决定胜负的战斗：19支持/0反例，单牌整战胜因未控（n=19）。典型案例：G8NHLL09DLBX母体随机毒未终结；PF90JTU0UZ5M A10巨兽T1普通药瓶实加9毒、250血当步不变，普通触媒后结9＋8=17，中和3另计，本体轮末230；多敌分配未定不套单敌结果。；新经验：弹跳药瓶按实际次数、分配与毒结算兑现，多敌不保证指定目标收尾。机制：普通3毒×3次、升级3毒×4次；制品逐次阻毒，施毒不即时伤，最高血目标不等最坏分配。搭配：持续毒/蜃景分核总毒与母体进度，随机未发生不预定。决定胜负的战斗：20支持/0反例，单牌整战胜因未控（n=20）。典型案例：G8NHLL09DLBX母体随机毒未终结；KSX97DF5H3NY A10 F31第2—4试T3母体只获3、结5至50，题报结11至44且24/24赢；总毒11可相同而分配不同。四试同前30抽序均败，目标/幼虫数/落毒同变，不定换线或运气单因。；支持：C48LLXBGKXQ9,T082DRCUHRRD,R0HEV5E3QT6G,XYYQYBRM2A01,K3676LU8B0UH,CSBR5CRDWQNB,ZZMYZ5UBCG72,1NZ8FE5F34R9,1LMBFGSMCWKU,ENKYQMS9W4ZD,2SU6XN2AEJRD,HMVJKM56S4Q8,JQPT83P8KDSZ,NB8KCF6HRGVF,HSX4HYATB4E2,YQL8RZ8BWN1E,G8NHLL09DLBX,CNKR125PFHJ5,PF90JTU0UZ5M,KSX97DF5H3NY；反例：；适用[0, 20]；账本silent-0007。

- silent-mirage-poison-card-block；旧经验：蜃景按施放时活敌毒总量给牌挡，后来施毒不追补。机制：加现场敏后核脆弱/暗影倍率，施放不耗毒、重放逐次核。搭配：启毒与可活窗口合核，零毒零敏0挡。决定胜负的战斗：17支持/0反例，单卡整战未控（n=17）。典型案例：NEWRFAYKTQHR先毒11挡、倒序4；QHK1XQ928TTM A10双蟹末T2两敌毒7＋3、敏1/暗影1，实补(10＋1)×2＝22，旧12→34；未来挡不预支。；新经验：蜃景按施放时活敌毒总量给牌挡，后来施毒不追补。机制：加现场敏后核脆弱/暗影倍率，施放不耗毒、重放逐次核。搭配：启毒与可活窗口合核，总挡正确不保证随机毒集中母体。决定胜负的战斗：18支持/0反例，单卡整战未控（n=18）。典型案例：NEWRFAYKTQHR先毒11挡、倒序4；KSX97DF5H3NY A10母体第2/4试T3毒5＋3＋3=11，蜃景实6→17、防御到22、零损；母体只实结5而非题面11，三次后续试均T5败，毒分配与总挡分开核。；支持：Y6GM2CHWJBEY,CSBR5CRDWQNB,ZZMYZ5UBCG72,F9PP859XZ3RJ,ZE8F192FKX24,ARKQLHG6RS4W,LLYSRQQ35AVW,4ANT8D00TP72,DUZUBAJ3A8GP,KV0JHNJCKXLS,K2JAGKVJAWZJ,NEWRFAYKTQHR,H1T1F8ML9FUE,AD3QSC3P41JU,BJLTVSYXCSGS,Y5H4CFAQ2WTG,QHK1XQ928TTM,KSX97DF5H3NY；反例：；适用[0, 20]；账本silent-0010。

- silent-deadly-poison-application；旧经验：致命毒药普通/升级施5/7毒，不即时扣血。机制：实结按当前毒再减1，制品/头骨/触媒/无实体/阶段另核。搭配：须活到结算，污染技能血价与被动伤独立。决定胜负的战斗：33支持/0反例，单卡整战胜因未控（n=33）。典型案例：D4LJ9QMGFB8Q毒受限伤留2；PF90JTU0UZ5M A10异螨第3/4试同T1底板，重放致命毒药替防御整轮扣26→31、HP3→1而原线零损；实结多5不当即时免攻，后继不同且无整战胜对照。；新经验：致命毒药普通/升级施5/7毒，不即时扣血。机制：实结按当前毒再减1，制品/头骨/触媒/阶段另核，过量毒按剩血截断。搭配：持续毒补层与存活结算窗口合核，不预支免攻。决定胜负的战斗：34支持/0反例，单卡整战胜因未控（n=34）。典型案例：D4LJ9QMGFB8Q毒受限伤留2；KSX97DF5H3NY A10 F30T8雾已补到5毒，普通致命再5→10，敌6血当步不变、结算仅计6而实赢19血；末母体战T4实4→9毒仍T5败，无替代牌序整场胜线。；支持：Y6GM2CHWJBEY,LRN0HPZ0FZS1,T082DRCUHRRD,1HC609GTLGN3,KAY522KT5NXR,K3676LU8B0UH,ZZMYZ5UBCG72,10GPK5XGHCK3,1NZ8FE5F34R9,75X1BARMNZ03,ARKQLHG6RS4W,6EV5V6PJJS9D,2PVLGRBGUX9S,4Y94N8RDPGPM,LLYSRQQ35AVW,JLN5SK17W4FQ,JMH5C51RLN4E,9TG1RP5LFAAK,JQPT83P8KDSZ,4D4J8USKCPAV,TD1HVGS7H6LB,L9SGRBB5R698,D4LJ9QMGFB8Q,NB8KCF6HRGVF,TCFAHJ9K19VY,BVF22RSFVBS9,ZVYUL2YP3518,HSX4HYATB4E2,WYB0NCD6W83J,YQL8RZ8BWN1E,G8NHLL09DLBX,CNKR125PFHJ5,PF90JTU0UZ5M,KSX97DF5H3NY；反例：；适用[0, 20]；账本silent-0007。

## 方法、时间切分与缺数据
旧155静默完局截至2026-10-08T20:48:22.147Z为核验基线，新局截至21:18:53.395Z为增量，后续完局作独立留出。旧七数组/血档/节点/回血/SL逐行复算；作用顺序用每次动作前后和下一轮实帧，支持局数与尝试数分开。没有拟合权重/阈值；缺完整dirty运行源码、前三次SL退出结算、随机孵化/攻击内部时序、留药/换线/护栏/早建能力的整场受控反事实、实际最优完整执行率和订阅实际费用。出现集合仅检索，不算完整机制支持。

## 验证、预期影响与回退
固定真实状态验证建立前后、逐牌挡/覆甲/力与易伤、随机毒分配/总量/母体HP、终局与资源来源；照原test-sandbox，预算和其他角色/未观察条件保持等价。先核当前源码与既有live实现去重；充分本角色证据才改已授权规则，不足waiting并保留原行为。预期减少未兑现收益与伪确定分配，不承诺翻盘。独立源码回退恢复父提交，保留所有经验/日志/失败历史；实际规则上线先date双通知Roy旧/新规则、证据/账本/任务、影响与回退，不改运维prompt。数据提案和经验上线均不等于源码implemented/shipped。
