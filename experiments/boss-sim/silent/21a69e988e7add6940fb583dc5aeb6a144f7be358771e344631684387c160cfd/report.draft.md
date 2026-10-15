# 静默boss校准刷新进度初稿（2026-10-15 16:05:08 CST）

Roy 已授权新功能；fix-batch只作调度通道。不处理其他队列bug，不改策略阈值。

基线 ac7dc94915cfc25ea6bd3db16de821b4db4a0c89；合main前后工作树干净。实际提取303个结束SILENT局、1321次boss尝试、545次可用实际结局，新增23场/9局/20胜3败。775次预测死亡截断、1个实际结局缺开场被排除。固定107调参keys与UTC切点2026-10-06T02:46:11.648000，计划只扩验证415→438；最终模拟成功分母、Brier、可信名单尚待重放，不以初稿宣称通过。

冻结模型7e1193cef9467416bc10c8e344a49f4fd98390c7的210输入SHA已核。只展开所需Git输入，不保存整仓库tar；当前工作树在该清单有101项不同，未声明当前生产模型重新验证。旧522场及逐回合输入完全一致；4个历史对照除耗时外一致。

原始开场1319个逐offset/length/SHA/角色/进阶核；1321尝试全部有开场前run-config版本元信息，完整dirty运行树及局中切码未知。来源见dataset/、opening-source-integrity.json、new-outcome-integrity.json、fight-code-provenance.json。F49新增4场，F48胜不等于整局胜。

Python校准12、定期派发48、自动化45项固定测试退出0。最初默认刷新在提取阶段受控中断130；后续原提取器退出0。首次沙箱tsc已完成、候选前vitest受控中断130，无完成摘要、不算通过或代码失败。重放保留8个起点检查点，剩余分两片nice19、两Node及两transpiler最多四个计算进程。最终候选完整原沙箱/实际消费者/live锁内发布尚未执行。

账本、源码提交与live合入尚未进行，不冒标shipped、自然采用、正式release_id或外部全套通过。code_proposals=[]，implementation_domains=[]。所有失败/中断、旧档案和日志保留。
