# silent / THE_INSATIABLE B4 原日志核实（20261007-215921）

dispatch_base=734c08608055167fd220800439dbf7407cff6e57。无候选源码，未发布。

触发 key、角色、boss、mode、校准 SHA、5 个死亡局和14个原逐回合keys均已核实，见 trigger-verification.json / evidence-key-verification.json。live启动源码与基准一致，首次合live无变化；live知识刷新只读保存清单。

冻结提取491尝试/197实际结局：143赢54死，293次SL预测死亡截尾，另外1次缺T1手牌。107 tune及2026-10-06T02:46:11.648000切点固定，val73→90，全部新增进val。

沙虫50尝试：17实际结局（12赢5死）/33 SL截尾；tune9（7赢2死），val8（5赢3死）。原实盘死亡局C48LLXBGKXQ9 A0 F33T11、XYYQYBRM2A01 A1 F33T10、XBD8Z9XLPCPN A10 F33T3、8JRE1C4H4Z2W A10 F33T11、WQZVENQ7DTRP A10 F33T11均由SL实际died及0HP核实。截尾不补败局。

2221帧由只读索引定位states.jsonl字节偏移，逐帧SHA存target-frames.jsonl。实际结局逐回合覆盖：{'1': 17, '2': 17, '3': 17, '4': 16, '5': 16, '6': 15, '7': 14, '8': 14, '9': 9, '10': 6, '11': 4}。截尾覆盖另存target-audit-summary.json，不与实际覆盖相加。98个回合起点攻击意图（力量/虚弱后）吻合已有表，128次相邻沙坑变化全吻合，128次力量变化含25次Salivate全吻合；T2 17场6张逃离均3入抽牌堆(含已抽手牌)、3入弃牌堆。此核实来自silent原日志，不继承其他角色机制经验。

缺少机制校正依据，暂不改全局/角色规则，未以val选参数。整场模型策略与实际打法差异仍须结合冻结配对结果说明，不能从5场触发偏差发明机制或声称实盘改后必胜。

初稿错误保留history：provenance占位import退出1、root cwd缺tsx退出1、审计power id键误用、compact piles card_ids与*计数误读。后两者为离线审计解析错误，纠正后全部上述核实成立，不计为游戏错误或放宽验收。没有候选故撤实现红/恢复绿不适用，fails_without_fix不得记true。

重放命令、before/after、原基准验收、检查与最终台账待原固定运行完成后补齐。
