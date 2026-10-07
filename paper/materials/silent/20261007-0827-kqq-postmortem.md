# 复盘批次 20261007-081301 闭环记录

2026-10-07 08:30，处理08:27 learner-done，KQQELQSZ382Z复盘齐全、学习者exit0。

- SILENT A10 F17族母，六次均64/75入场、5次SL；前五次判死读档，末次T13以5血6挡对虚弱后20攻击，完整需损14、差9血，已结算10毒后敌32/233血，死亡帧余9毒不预支。末次直接71+毒130=201。14组需伤/实伤及13组实损已由学习者verification.json核对；实际boss死亡需求与代码余血−9一致，不作打法分析。
- 原文14325字节/SHA256 8a8b1aefc245d216183d6b5cff4d14bbbe2e7a811a8efd26e59fa4161e33a975，含08:24:40三项追加勘误；早期KAY蛇咬实际0费、首次到手第二次T5、尖啸引用时间.815Z，更正与旧正文并存。10行台账SHA256 203df0714bf498023225e3ef0314a37f97a15a7e534a95403af77e3283df3bf6，原回报/stderr/分析/核对及脚本等15份小原件逐字节归档，6份大件及完整事件流留源并记录指纹。
- 2add：0219 bug-infra、0220 mechanic，均首证KAY/A0，先验分别no/unknown、observed；8旧项各1update，其中0216新增1条repeat，其余support。所有旧claim/首证/先验/状态/版本/历史不重置，/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 220 item(s), 0 problem(s)。旧0216仍首证K367/A1/prior=no，0220真实机制不入bug队列。
- 新0219是SNAKEBITE施毒名单遗漏、独立少报7；当前T4差9包含旧八折少2，旧0216首试T4独立少6。已入非阻塞修复队列并报开发收件箱/Roy，交学习者实现固定验证后自行合入，不保证整场转胜、不添加游戏知识公式。来源行号为只读live定位，开局f8e01696+dirty不当可复现源码。
- 用时1471.942秒；实际brain 9 Codex/7 DeepSeek，19条脑决策12 Codex/7 DeepSeek（含商店续问），兼容deepseek_calls=16不当实际引擎分类。Jev155、低信心45、护栏替换0、独立药水3/喝8因SL恢复同瓶；未执行替线/最优原线比例/boss时钟等保持未记录。F16模拟592样本raw win0/calibrated0.0474，实战差额不当同条件误差分布；独立boss校准按075131任务。
- 随后nice19 paper_dataset.py --no-raw另记固定切点与校验；只提交自身记录及本批学习者台账，不改live，不启动新对局或等待新事件。
