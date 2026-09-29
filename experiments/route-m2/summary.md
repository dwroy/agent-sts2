# M2 路线回放汇总（tools/route-replay.ts 生成）

## map/route-plan（22 张地图，DeepSeek + KNOWLEDGE_PREFIX=full）

- 首答合法：22/22 (100%)；补问一次后合法：22/22 (100%)
- 覆盖：1 幕 9、2 幕 7、3 幕 6；带飞行靴（剩余次数 > 0）4 张；进阶 9/8
- 首答错误类型（按题计）：无
- 每题（含补问）：耗时中位数 37.0 s、最长 158.2 s；输入 token 中位数 123499（缓存命中合计 1957376/2710436 (72%)）；输出 token 中位数 9314；模型调用 22 次；成本合计 $0.524

| 局 | 进阶 | 幕 | 层 | 靴 | 节点 | 首答 | 最终 | 首答问题 | 路线 | 耗时 s | 输入/命中/输出 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2ZCKFSKXTL4E | 9 | 1 | 1 | 0 | 59 | ✓ | ✓ |  | r1c1 普通战 → r2c1 问号 → r3c1 普通战 → r4c2 问号 → r5c2 普通战 → r6c3 休息 → r7c3 普通战 → r8c2 精英 → r9c1 宝箱 → r10c0 休息 → r11c0 商店 → r12c1 问号 → r13c1 精英 → r14c0 商店 → r15c0 休息 → r16c3 Boss | 4.3 | 123584/8192/680 |
| SK1USHSB1U7U | 9 | 1 | 1 | 0 | 49 | ✓ | ✓ |  | r1c0 普通战 → r2c0 问号 → r3c0 商店 → r4c0 普通战 → r5c1 问号 → r6c0 休息 → r7c1 精英 → r8c1 商店 → r9c1 宝箱 → r10c1 休息 → r11c1 普通战 → r12c2 休息 → r13c2 商店 → r14c2 问号 → r15c2 休息 → r16c3 Boss | 4.3 | 123584/8192/680 |
| W2TBR2YUMQ5Y | 9 | 1 | 11 | 0 | 51 | ✓ | ✓ |  | r11c3 休息 → r12c3 普通战 → r13c2 普通战 → r14c2 普通战 → r15c2 休息 → r16c3 Boss | 4.3 | 123584/8192/680 |
| VBHZ77A3N496 | 9 | 1 | 12 | 0 | 55 | ✓ | ✓ |  | r12c3 问号 → r13c3 普通战 → r14c2 普通战 → r15c3 休息 → r16c3 Boss | 97.2 | 123722/8192/24189 |
| N01X6BBAYMHT | 9 | 1 | 7 | 0 | 62 | ✓ | ✓ |  | r7c5 休息 → r8c5 精英 → r9c6 宝箱 → r10c5 休息 → r11c6 精英 → r12c6 休息 → r13c6 商店 → r14c6 普通战 → r15c5 休息 → r16c3 Boss | 100.1 | 123172/8192/24353 |
| 9CDEMGKTJ77N | 9 | 1 | 1 | 0 | 66 | ✓ | ✓ |  | r1c2 普通战 → r2c2 普通战 → r3c2 问号 → r4c1 普通战 → r5c2 商店 → r6c2 休息 → r7c1 普通战 → r8c2 精英 → r9c2 宝箱 → r10c2 普通战 → r11c2 休息 → r12c2 普通战 → r13c1 普通战 → r14c1 普通战 → r15c2 休息 → r16c3 Boss | 20.3 | 123499/120960/4938 |
| SK1USHSB1U7U | 9 | 2 | 28 | 0 | 53 | ✓ | ✓ |  | r11c6 休息 → r12c6 普通战 → r13c6 问号 → r14c6 休息 → r15c3 Boss | 13.3 | 123724/119040/3075 |
| VBHZ77A3N496 | 9 | 2 | 27 | 0 | 64 | ✓ | ✓ |  | r10c4 问号 → r11c4 精英 → r12c4 普通战 → r13c4 问号 → r14c4 休息 → r15c3 Boss | 16.3 | 124057/120448/3675 |
| 8KD7ENEY773Y | 9 | 2 | 25 | 0 | 58 | ✓ | ✓ |  | r8c3 宝箱 → r9c3 商店 → r10c4 普通战 → r11c4 休息 → r12c3 精英 → r13c2 问号 → r14c3 休息 → r15c3 Boss | 158.2 | 123478/120576/31927 |
| TYZH5GB5N2UL | 9 | 2 | 23 | 0 | 52 | ✓ | ✓ |  | r6c3 休息 → r7c3 普通战 → r8c4 宝箱 → r9c5 休息 → r10c6 问号 → r11c6 问号 → r12c6 精英 → r13c6 普通战 → r14c6 休息 → r15c3 Boss | 92.6 | 123379/120576/23592 |
| 8V0HD9Y207WY | 9 | 2 | 18 | 0 | 59 | ✓ | ✓ |  | r1c3 普通战 → r2c2 普通战 → r3c2 问号 → r4c3 问号 → r5c2 问号 → r6c1 问号 → r7c0 普通战 → r8c0 宝箱 → r9c1 休息 → r10c0 商店 → r11c1 休息 → r12c1 普通战 → r13c0 商店 → r14c0 休息 → r15c3 Boss | 36.7 | 123737/120960/9314 |
| DHGT6Z3Q7VAP | 9 | 2 | 27 | 0 | 54 | ✓ | ✓ |  | r10c3 商店 → r11c2 休息 → r12c1 普通战 → r13c0 商店 → r14c0 休息 → r15c3 Boss | 21.5 | 123941/120960/4578 |
| RTF3KZLZPV2L | 8 | 3 | 34 | 0 | 55 | ✓ | ✓ |  | r1c4 普通战 → r2c4 问号 → r3c4 商店 → r4c4 问号 → r5c3 问号 → r6c3 普通战 → r7c3 宝箱 → r8c3 精英 → r9c2 商店 → r10c1 休息 → r11c0 普通战 → r12c1 普通战 → r13c2 休息 → r14c3 Boss | 79.3 | 123939/120960/17873 |
| H7W047ZCEBSA | 8 | 3 | 39 | 0 | 54 | ✓ | ✓ |  | r6c1 休息 → r7c1 宝箱 → r8c2 问号 → r9c2 休息 → r10c3 问号 → r11c3 普通战 → r12c4 问号 → r13c4 休息 → r14c3 Boss | 51.6 | 123398/120704/13293 |
| SK1USHSB1U7U | 9 | 3 | 41 | 0 | 51 | ✓ | ✓ |  | r8c6 问号 → r9c6 问号 → r10c6 休息 → r11c6 精英 → r12c5 问号 → r13c6 休息 → r14c3 Boss | 19.6 | 121937/118272/4559 |
| M6P7KAWMF6BC | 8 | 3 | 44 | 0 | 54 | ✓ | ✓ |  | r11c3 问号 → r12c4 普通战 → r13c5 休息 → r14c3 Boss | 45.8 | 121953/384/11883 |
| ZPPVDTSFJXJM | 8 | 3 | 36 | 0 | 51 | ✓ | ✓ |  | r3c1 问号 → r4c1 商店 → r5c1 普通战 → r6c1 问号 → r7c1 宝箱 → r8c0 休息 → r9c0 商店 → r10c0 问号 → r11c0 精英 → r12c0 问号 → r13c0 休息 → r14c3 Boss | 37.0 | 124418/119040/7969 |
| QZQU8860HG2F | 8 | 3 | 34 | 0 | 57 | ✓ | ✓ |  | r1c1 普通战 → r2c1 问号 → r3c2 普通战 → r4c2 普通战 → r5c3 普通战 → r6c3 休息 → r7c3 宝箱 → r8c3 商店 → r9c3 休息 → r10c4 精英 → r11c3 普通战 → r12c4 问号 → r13c3 休息 → r14c3 Boss | 39.3 | 121917/118656/9805 |
| NHL75AQZSMFS | 8 | 1 | 15 | 2 | 64 | ✓ | ✓ |  | r15c5 休息 → r16c3 Boss | 5.7 | 121877/116992/1144 |
| 90JG88HCJ6XV | 8 | 1 | 8 | 1 | 63 | ✓ | ✓ |  | r8c0 问号 → r9c0 宝箱 → r10c0 休息 → r11c0 精英 → r12c0 休息 → r13c1 普通战 → r14c1 普通战 → r15c2 休息 → r16c3 Boss | 77.5 | 121756/118272/15261 |
| VSRG9P80R1ZB | 9 | 2 | 23 | 2 | 58 | ✓ | ✓ |  | r6c0 商店 → r7c0 休息 → r8c1 宝箱 → r9c1 普通战 → r10c1 休息 → r11c0 普通战 → r12c0 商店 → r13c1 普通战 → r14c2 休息 → r15c3 Boss | 51.1 | 121886/118656/13544 |
| EN55E3C1WLHP | 8 | 1 | 5 | 3 | 59 | ✓ | ✓ |  | r5c5 普通战 → r6c4 普通战 → r7c3 休息 → r8c3 普通战 → r9c3 宝箱 → r10c3 精英 → r11c2 商店 → r12c0 休息 → r13c0 普通战 → r14c0 问号 → r15c1 休息 → r16c3 Boss | 52.5 | 123894/120960/11523 |

## 路线块随选牌和事件最后一问（10 题）

- 多步事件：非最后一页 0 页，带路线块 0 页；最后一页 14 页，带路线块 14 页
- 路线修正结果：change 4、keep 6；首答路线有问题（补问）0 题

| 类型 | 局 | 层 | 题 | 最后一页 | 路线块 | 选择 | route | 结果 | 首答问题 | 耗时 s |
|---|---|---|---|---|---|---|---|---|---|---|
| card | 2ZCKFSKXTL4E | 11 | reward/card |  | ✓ | card0 | r11c5 r12c6 r13c6 r14c6 r15c6 r16c3 | change |  | 30.0 |
| card | SK1USHSB1U7U | 24 | reward/card |  | ✓ | skip | keep | keep |  | 55.2 |
| card | W2TBR2YUMQ5Y | 8 | reward/card |  | ✓ | card1 | keep | keep |  | 10.7 |
| card | VBHZ77A3N496 | 2 | reward/card |  | ✓ | card1 | keep | keep |  | 1.2 |
| card | N01X6BBAYMHT | 7 | reward/card |  | ✓ | card2 | r7c5 r8c5 r9c6 r10c5 r11c6 r12c6 r13c6 r14c6 r15c5 r16c3 | change |  | 17.6 |
| event | 9LSQ6WUSCCYQ | 27 | event/choose | true | ✓ |  |  |  |  |  |
| event | 9LSQ6WUSCCYQ | 27 | event/choose | true | ✓ |  |  |  |  |  |
| event | 9LSQ6WUSCCYQ | 27 | event/choose | true | ✓ | o1 | r10c0 r11c0 r12c1 r13c1 r14c1 r15c3 | change |  | 124.2 |
| event | JF99S7FY4WFU | 6 | event/choose | true | ✓ |  |  |  |  |  |
| event | JF99S7FY4WFU | 6 | event/plan | true | ✓ | o0:c0 | keep | keep |  | 28.4 |
| event | 8KD7ENEY773Y | 13 | event/choose | true | ✓ |  |  |  |  |  |
| event | 8KD7ENEY773Y | 13 | event/choose | true | ✓ |  |  |  |  |  |
| event | 8KD7ENEY773Y | 13 | event/choose | true | ✓ | o1 | r13c0 r14c1 r15c0 r16c3 | change |  | 76.3 |
| event | 0NZBAVFAT3JG | 20 | event/choose | true | ✓ |  |  |  |  |  |
| event | 0NZBAVFAT3JG | 20 | event/choose | true | ✓ |  |  |  |  |  |
| event | 0NZBAVFAT3JG | 20 | event/choose | true | ✓ | o0 | keep | keep |  | 31.1 |
| event | 0NZBAVFAT3JG | 6 | event/plan | true | ✓ |  |  |  |  |  |
| event | 0NZBAVFAT3JG | 6 | event/choose | true | ✓ |  |  |  |  |  |
| event | 0NZBAVFAT3JG | 6 | event/plan | true | ✓ | o0:c0 | keep | keep |  | 32.8 |
