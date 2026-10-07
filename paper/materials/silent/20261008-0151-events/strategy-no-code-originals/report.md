# 静默猎手策略任务回报

生成时间：2026-10-08 01:48:26 +0800。调度batch：20261008-014011-strategy-proposal；任务scratch：20261008-014012-strategy-proposal。

本次10个派发提案均为waiting。已重新核对六局原始证据与当前源码，没有足够证据确定新的预算、启动、目标、SL或血价规则；神化的已观察升级差值成立，完整升级/跨抽弃模型仍有缺口。没有新增源码提交、live合入或eval版本，没有登记implemented、duplicate或shipped。各项证据、反例、旧/新行为、验证与回退完整见本目录[proposal.md](proposal.md)及十份原提案副本。

完整base：88693c08d8c418b694805eecfbf6ec11ecde35ab；核验live：28f7f8ecfaaf04a33882ba73cba15c783063b0b9。开工git status为空，git merge --no-edit main无冲突；该基线合并不计为本批策略实现。最终HEAD须与base相同，工作树保持干净。merge=live已确认；无新增源码，按无改动流程merged=null，未执行live锁/刷新/合并/合后测试流程。此前遗留的懒惰重放源码790b76d00dc23dedb970cb82a00cb3db6ff1cbb7保留，未在本批合入或冒称上线。

六局均经runs.jsonl及逐状态核实为SILENT A10。本次直接从只读logs抽取3432帧、3306决策，六局逐字节状态SHA256与上次一致；十份原提案Markdown指纹与专用队列一致。只读本batch的proposal_ids，无proposal_repair。关联账本26项与静默经验19项已核对；重打按同一局计，不增加独立样本分母，也未读取其他角色知识。

## 本次逐项处置

| 提案ID | 证据局号/层/回合 | 账本ID | 处置与缺数据 |
|---|---|---|---|
| silent-proposal-89354805ee4d7e77 | VLZ6CCT8AQ0A F35T1/F43T1—2/F45T1 | silent-0237, silent-0238 | waiting：已核F35/F43手牌升级差值；缺未见升级/附魔的可核转换、逐卡实例及跨抽弃完整输入。当前UpgradeDelta漏勒紧/减力/毒能力字段，不能把局部手牌数字拼为整体已实现。 |
| silent-proposal-f2bfceddb1898dca | VLZ6CCT8AQ0A F43T1—5/F44/F45T1、T4—5 | silent-0106, silent-0019, silent-0201 | waiting：模拟成熟度展示已有live祖先45161a51c2c6b7e4a499b13cf749c4108193bbf5；缺同总预算、同盘固定随机输入的MC对照、样本收益/候选稳定性曲线，且神化完整传播未覆盖。不能据单次707ms和1/12样本拟合预算、药价或目标规则。 |
| silent-proposal-283a164780d11e69 | VLZ6CCT8AQ0A F35T1/F43T1—2/F45T1 | silent-0237, silent-0238 | waiting：与89354805同一神化传播缺口；经验链保留。缺未见升级/附魔逐卡转换及跨抽弃完整输入，已有升级勒紧子项未实现神化。 |
| silent-proposal-ebbfe3b97548756d | VLZ6CCT8AQ0A F43T1、T3—5/F44/F45T3、T5 | silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019 | waiting：升级勒紧子项已有live源码5e80e683daa08ae2569733b3b541cb523d7fe861；14账本/15经验的整体请求仍缺神化完整传播与持续输出/资源共同冻结的复合验收。局部源码祖先不能关闭全部请求；原本已上线的机制和版本保持。 |
| silent-proposal-e5b87be50f28f311 | 8JRE1C4H4Z2W F33首/三试T2、二试T5、末试T11/F17T6 | silent-0079, silent-0021, silent-0125, silent-0018 | waiting：原日志有decision_id及SL原/替换文本，但三题chosen_order为空、HP护栏只有理由文本；缺统一阶段候选身份、完整执行/重规划配对，不能据局部血价改SL或护栏阈值。 |
| silent-proposal-49632bc4878fb597 | CA5KE8GFJ9X2 F13T1、T3、T5 | silent-0005, silent-0231 | waiting：加压力量0→4→8、无弱喷水11→15→19及虚弱后11/14可核；该局计划步法未取得，不能补敏捷收益。缺四条属性/减益/成长路径共同冻结的本角色调用与完整源码对照；未核出需要新增统一攻防权重的证据。 |
| silent-proposal-66532328a585941f | 5PM6JAQG6FNQ F39末试T2/F33T1—2 | silent-0021, silent-0009 | waiting：重新核原帧：F39向无毒目标打冒泡，能量5→4、玩家29HP及敌状态不变。缺同血量、构筑、抽序下不同启动顺序的完整结局与可复现收益函数；不能据未兑现组件拟合构筑/启动权重。 |
| silent-proposal-43a76a31ba7bdcfa | 61E2QS63Y9WU F17T5—7 | silent-0030, silent-0027 | waiting：负敏捷−2、两防御各3共6挡及17毒成立；本局60HP首试七轮胜。缺相同起始资源和完整抽序下另一可救活SL线路，不能用首试胜调整SL范围/换线偏好。 |
| silent-proposal-5264153a4a4b0e5c | 61E2QS63Y9WU F23T4—5 | silent-0039, silent-0209 | waiting：T4本体线47伤/15损兑现，幻象14→2仍可攻击；另一focus幻象39伤/零损只为未实打候选。缺A10召唤/航行/复活完整组合调用及另一目标序后续实打。3f69541b已有敌HP审计不能证明召唤/复活模拟和目标排序全部完成。 |
| silent-proposal-bddfa690a84e03d0 | DUZUBAJ3A8GP F30T1—6（四试） | silent-0128, silent-0079 | waiting：睡3/2/1、T4醒、T5尖啸、T6恢复成长至4力/22攻击可核，四试均败；c7578f37608526591edd86041cee5a28c3894fee已有当前进阶后轮伤害子项。缺同抽同资源的另一完整获胜线及睡眠/眩晕/醒来组合验收，不能以全败样本拟合少挡换伤的血价。 |

## 核验结果与限制

证据校验脚本退出0，原始文件与结果见evidence-verification.log/rc、evidence-manifest.json及additional-verification.json。F35/F43能量7→5、手牌升级、场外deck不变已核；VLZ的631帧有牌堆聚合文本，4761个条目无逐卡dynamic_values，不把“有聚合文本”误报为“没有牌堆”。base与固定live均无APOTHEOSIS接线；UpgradeDelta缺勒紧、临时减力、毒雾、触媒字段。限定已观察卡的局部模型可继续开发，未知转换和完整传播仍须保留未知，不能只标known=true或以固定分替代升级。没有完整获胜反事实不是修纯数值模型的障碍，它只限制策略阈值/优先级结论。

8JRE同盘首/三试T2指纹相同，原/换线0/24与5/24死亡、本轮3/15血价及10/17伤害原件保存；HP护栏在理由文本中，三个关键决策chosen_order均未记录，不能把单个派发动作当成整线完成。保留原答、护栏、SL和重规划的责任分账，未从6次重打拟合新阈值。F39无毒目标冒泡实扣1能、敌状态不变；61E2负敏捷与双防御、DUZ末轮22攻击/死亡原帧均通过断言。

已有局部源码5e80e683daa08ae2569733b3b541cb523d7fe861（升级勒紧）、45161a51c2c6b7e4a499b13cf749c4108193bbf5（模拟成熟度）、3f69541b5d3259dac94d3395bfe3da47936b4de9（敌HP离线审计）、c7578f37608526591edd86041cee5a28c3894fee（当前进阶后轮伤害）均为核验live的实际祖先，四次检查退出0，详见source-verification.json。它们没有覆盖本批整体请求，不以子项关闭整体。

本批未改源码：撤源码失败/恢复通过未执行，tsc/vitest与原沙箱入口未执行，cases=0；最终JSON用null表示未跑，证据断言退出0不当作生产测试成功。没有源码提交或待合入修改，未执行提交前gitleaks；未执行网络/LLM调用、play、npm install、推送或进程终止，未读取key/.env/游戏二进制。铁甲与其他角色代码等价。

## CLI记录和运维交接

仅经根目录learner/ledger.py追加26项本次提案链接/by=learner:strategy-proposal；未上线条目保持proposed，已有shipped经验不降级，不重复加support/repeat。十份原输入通过根code_proposals.py add --character silent复验去重，全部返回原ID，未增加无关提案或直接修改队列状态。proposal_results由调度器消费，保留waiting待新增证据重派。CLI输入/回执见ledger-update-input.jsonl、ledger-update.log/rc、registration-results.json，账本检查与机械报告检查另保存。

请运维接收本目录proposal.md与report.md；本次无新提交、合入提交或版本可登记shipped。以后只对明确缺口补数据，不重写历史复盘；六局发现/复核帧不能称独立盲测，阈值拟合须按局号和结束时间后移验证。所有初稿、原件、缺数据与读路径失败说明保留在scratch。最终JSON见report.json。

最终检查：根账本267项、0问题；proposal_dispatch.no_change接受报告，10项处置完整、提案链接0错误、原Markdown指纹全部一致；HEAD等于完整base，git status为空。详见final-verification.json，以上属于记录/回报核验，不是tsc/vitest测试。
