# 核心组合经验上线后的静默 A10 漏斗

实际 live 上线：2026-10-10T10:40:42+08:00，提交 8e74493d92f757a88f15dffb48e2f5336c0cd0ac，版本 S1.exp147。10:42:12 是补验收时间。
完成局切点：2026-10-10T15:50:45.179000+08:00。原始 A10 已结束 161 局，纯 Codex 合格 154 局。
上线后新开且已结束 9 局，尚不足 20 局；比较上线前最近 20 个合格完成局。跨界一局单列。正在进行的局不计入。
boss 列表示实际进入战斗；百分比以各组开局数为分母，含 SL 与首试分开。

## 最终结果（含 SL）

| 阶段 | 上线前最近 20 局 | 上线后新开局 |
|---|---:|---:|
| 一幕 boss | 19/20（95.0%） | 7/9（77.8%） |
| 进入二幕 | 18/20（90.0%） | 7/9（77.8%） |
| 二幕 boss | 13/20（65.0%） | 3/9（33.3%） |
| 进入三幕 | 10/20（50.0%） | 3/9（33.3%） |
| 三幕首 boss | 6/20（30.0%） | 3/9（33.3%） |
| 三幕第二 boss | 1/20（5.0%） | 2/9（22.2%） |
| 通关 | 0/20（0.0%） | 0/9（0.0%） |

## 首试结果

| 阶段 | 上线前最近 20 局 | 上线后新开局 |
|---|---:|---:|
| 一幕 boss | 19/20（95.0%） | 7/9（77.8%） |
| 进入二幕 | 15/20（75.0%） | 5/9（55.6%） |
| 二幕 boss | 11/20（55.0%） | 3/9（33.3%） |
| 进入三幕 | 5/20（25.0%） | 3/9（33.3%） |
| 三幕首 boss | 3/20（15.0%） | 3/9（33.3%） |
| 三幕第二 boss | 0/20（0.0%） | 2/9（22.2%） |
| 通关 | 0/20（0.0%） | 0/9（0.0%） |

## 上线后逐局

| 局号 | 首试终层 | 最终终层 | 通关 |
|---|---:|---:|---|
| KDBWARERSGYW | 48 | 48 | 否 |
| TFYU1MY8NEJ1 | 49 | 49 | 否 |
| 49HL2N70CHMU | 49 | 49 | 否 |
| F1TP5W6GF56Q | 23 | 23 | 否 |
| EMRME965K74Q | 9 | 9 | 否 |
| 0DTPVHFXJ319 | 23 | 23 | 否 |
| JYTQSFJ96MG2 | 9 | 9 | 否 |
| DW8M3G2PV3N7 | 17 | 27 | 否 |
| 675CHRV9HVQ3 | 17 | 22 | 否 |

## 实际知识输入核验

- 9 局共 256 道接受的 Codex 大脑题使用 full 知识前缀，实际客户端 instructions 摘要均与大脑系统提示摘要对应。启动经验版本 .5/.6/.8 的四条核心条目与上线原件逐对象一致。
- 跨界局 5BU7ZE1PWLSX：上线前启动、上线后结束，32 道大脑题全部为旧 .4 前缀，最后题 10:21:38，单列为未暴露四条新经验，未混进上线后组。
- 知识前缀会局中刷新，不能只用开局提交号判断每题输入；逐题保留 prefix/system 摘要与客户端请求摘要及原行偏移/SHA。
- 日志未逐题保存完整 system 文本。完整前缀加载与版本保留可核实，但没有显式引用四个条目 ID 的答案；不能将相似构筑措辞归因于某条经验。

## 描述性结果

- 上线后 9 局仍 0 胜；三幕首 boss 3/9，进入第二 boss 2/9；这几局首试也达到同样三幕后段。
- 含 SL 二幕入口 7/9 → 二幕 boss 3/7，途中损失 4 局；另 2 局在一幕 boss 前结束。
- 相比上线前最近 20 局，第二 boss 到达比例上升，但进入三幕比例下降；尚未形成整体改善或通关证据。样本不足 20 且同期有其他代码/经验更新，不能估计四条核心经验的独立收益。

## 复现与限制

- The post sample has not reached 20 completed runs.
- Boss columns mean entry into observed combat, not boss victory.
- First attempt stops at the earliest logged predicted_death; it is not a counterfactual without SL.
- Release-time membership does not itself prove adoption of a particular build. Runtime exposure is separately checked against actual prompt metadata.
- Concurrent changes and small unmatched samples prevent attributing any difference specifically to the four core-build lessons.
- 已复现上次 153 局的逐局首试/最终结果，原 126 局历史切点也一致。所有已结束合格局分为 pre/cross/post，互不重叠。
- analysis.json 保存上线切点、各组局号和计数；funnel-snapshot/ 冻结原始选行及 LogDB 结果；exposure/ 保存实际输入链核验。只做统计和留档，不改知识、游戏代码、版本、调度或对局。
