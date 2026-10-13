# 本批静默猎手原提案逐项核验

本批仅处理 learn.json 已领取的十个原 id；task=strategy-proposal、character=silent、reason=proposal、工作树绑定一致，无 research_request/implementation_request/proposal_repair。普通专题文件绑定旧批次，因此不承接该专题，也不读取其他专题替代身份。开工工作树干净，git merge --no-edit main 为 Already up to date，base=4d6f7edcd300dfb3b7123fd3754dfc545d64ed80。全部原 Markdown SHA256 与队列一致，关联账本均为 silent。

## 证据、反例与观察范围

- KEN58SH9SLZ6 A10：F3T2、F4T1、F5T2、F11T1/T2、F15T1共7次饮用；F12实际26→53、F16实际46→75。本次重新读取原始饮用动作和状态，不将实喝的零损战当未喝也零损。缺留药的完整替代战。
- TXZ6RVMQA09D A10：F48第2/3试T6，states 281479→281484与281535→281539，损3/净扣36对损0/净扣27；states 281563、281565、281566分别首胜4、次战开场4、开场后0。换线后续牌序不恒定，三次尝试是一局，未见连续通关对照。
- WQZVENQ7DTRP A10 F33：第2/3试T9，states 282075→282079及282144→282148，损13/净扣24对损22/净扣39；末T7 states 282330→282331沙坑4→5。后者说明付血也可能有延时收益，不能用单一总保血规则抹掉另一生存截止；原提案所述末轮死亡来源内部顺序仍未知。
- NHA2KW0RB7VP A10 F33：states 283391→283397，HP30→29、两敌合408→400；末次283502→283507，HP30→23、合408→384。跨轮净扣8/24包含自动轮初伤，不能当卡牌毛伤；两敌均活，原六试全败不能拟合胜率。
- Q6M2Y34MWKRE A10 F8/F9及1913SE84AXQF A10 F29/F31：重新核原始入口/退出窗口，精英胜后2血与入口46的链保持；早喝完整替线缺失，锻造/休息改变路线条件，不能用投影误差直接拟合价值。
- 本批新补读8AGEGLG40SV3 A10完整状态/决策：F24锻造不回血；F25 39→33、F27 33→19、F29实际休息40→61、F30赢61→40、F31带槽0毒药以40血进入千足虫，末T4生命0。F29入火前19→40与实际休息40→61分开，F24羽毛回血也不能算锻造收益。F31后段死后重接25属于观察支持，不能以净敌血差冒称完整毛伤或留药能救局。
- 本批新补读DWW8GX3UQCQM A10 F33T2/T3：致命毒药+牌面7实际0→14，后续蛇咬+10使11→21。首次与后续窗口的UNSETTLING_LAMP原对象完全一致、stack=null，没有现场消费计数；不能因手牌未出/当前毒为0/回合数推定首次可用。跨动作追踪、恢复和制品等未观察交互仍需明确实现与固定验证。
- 对局身份全部经根 logs/runs.jsonl 核为 SILENT；十派发锚点外只使用原提案所关联静默证据及上述两个补证局。K3676LU8B0UH只核原提案/账本身份，未冒称本批重放其原始机制窗口；未读取其他角色知识。

| 原提案 | 证据与既有账本 | 处置及缺口 |
|---|---|---|
| silent-proposal-08eaa60bcc449852 | KEN58SH9SLZ6；silent-0019, silent-0020 | waiting：KEN七次饮用和两次真实回复可复现；新8AGE亦只有实际资源链，缺同资源同牌序的未饮用/留药到boss完整对照，不能校准持药价格。 |
| silent-proposal-92920295a648b540 | TXZ6RVMQA09D；silent-0228, silent-0255 | waiting：TX第二/三试T6为损3扣36与损0扣27，首boss胜后4血于下一房开场归零；已有连战接续，但缺同抽序连续通关的受控替线，不改SL或终局权重。 |
| silent-proposal-a327449c331efbc1 | WQZVENQ7DTRP；silent-0079, silent-0018 | waiting：WQ同盘T9多损9多净扣15，T7逃离增加沙坑1轮；已有候选资源诊断，缺双截止排序的完整受控后继和可验证收益，不能拟固定血价。 |
| silent-proposal-a099e89437e942bb | 02HB4L0C3C67, 4D4J8USKCPAV, F4QKG4J1AJJZ, JLN5SK17W4FQ, LS8035TB32P3, NB8KCF6HRGVF, S9UZAK0JP0C0, SADL3CGYTGSR, WQZVENQ7DTRP；silent-0030, silent-0257, silent-0258 | waiting：狡诈3/2/0、基础6及模拟容量已实现；本批无新的穿插饮用完整派发/跨轮保留手位证据，生成后真实重规划不能当合成候选整线已执行。 |
| silent-proposal-47910f82a1fdd98f | TXZ6RVMQA09D, WQZVENQ7DTRP；silent-0018, silent-0019, silent-0020, silent-0021, silent-0025, silent-0079, silent-0198, silent-0228, silent-0255 | waiting：王室猛毒无血瓶开场扣4及连续boss接续已实现；合并提案还含SL血价、留药和路线预算，缺这些分支完整受控后继及未知回血/复活组合顺序。 |
| silent-proposal-f1374df72d8e6a25 | 1913SE84AXQF, Q6M2Y34MWKRE；silent-0019, silent-0020, silent-0050, silent-0253 | waiting：Q6精英胜后2血与1913入口46已核；早喝候选未完整执行、锻造改变路线条件，8AGE新链也非受控对照，缺可拟新药价/终局权重的同预算后继。 |
| silent-proposal-38a49e6c97f31eea | 1913SE84AXQF, Q6M2Y34MWKRE；silent-0006, silent-0011, silent-0025, silent-0044, silent-0050, silent-0064, silent-0133, silent-0253, silent-0259, silent-0261, silent-0262 | waiting：普通无挡紧勒及已观察千足虫重接已有子实现；新8AGE证实死后重接25但不能补全部再生/荆棘/增益的联合消费者重放及误差隔离后的用药、SL整战验证。 |
| silent-proposal-ef0e38a5dbd3bc07 | 1913SE84AXQF, Q6M2Y34MWKRE；silent-0019, silent-0020, silent-0021 | waiting：实际营火、锻造、事件与胜战出口可核；8AGE F29实际40→61而F30又损21后进精英，仍无另休息/早用药/不付事件血价的完整路线对照或预算校准。 |
| silent-proposal-7f820c02d39bfaea | NHA2KW0RB7VP；silent-0079 | waiting：NHA同开场原线跨轮净扣8损1、替线净扣24损7且两敌均活，六试全败；候选比较不等完整派发，缺独立成对后继胜负及同预算饱和排序校准。 |
| silent-proposal-04b6b430759815ed | NHA2KW0RB7VP, K3676LU8B0UH, SADL3CGYTGSR；silent-0005, silent-0006, silent-0021, silent-0011, silent-0065, silent-0264, silent-0079, silent-0133, silent-0169, silent-0189, silent-0013, silent-0053, silent-0162, silent-0265 | waiting：精确切击及已观察蟹朝向子公式已实现；DWW新窗口0→14毒后蛇咬11→21支持油灯首次/后续差异，但遗物stack=null且字段恒同，跨动作/SL消费追踪与未知负面组合尚未验证。 |

## 预期行为、验证与回退

本批保留现行行为，没有新增参数或源码。已有确定数值子公式不需要独立胜局才能成立；但它们的成立也不能关闭原提案的完整资源、消费者与排序范围。对尚未接线的消费状态明确保留缺口，不把“机制支持”和“生产消费者验证”混为一项。

独立回查329条原窗口的字节offset/length/SHA256与JSON逐条一致，另补核1259条8AGE/DWW记录；共950状态、638决策，16个实际原始证据局。20项固定端点/差额/遗物字段断言通过，仅为证据核验。冻结清单raw-manifest.json，观察states.json/decisions.json，结果evidence-verification.json/facts-verification.json。未用本批拟合参数，未跑在线play、LLM或网络；SL尝试、同回合帧和模拟样本不作独立局。

核已有live祖先见source-review.json。没有生产源码修改，不需回退源码；保留原源码、父要求、未证范围、提案和失败历史。以后若具备完整固定消费者输入，确定机制可单独实现并验证；涉及价值与探索排序的变更须先隔离机制误差，按局和时间前后划分验证。其他角色和未观察进阶行为保持。
