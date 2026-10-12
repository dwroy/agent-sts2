import json
from pathlib import Path
p=Path(__file__).parent.resolve();ids=['silent-0020','silent-0125','silent-0278','silent-0005','silent-0011','silent-0046','silent-0057','silent-0142','silent-0259']; proposals=[(p/f'proposal-{x}-result.json').read_text().strip() for x in ['combat','potion']]
obj={'task':'postmortem','appended':['E6DYYXRX7GVE'],'skipped':[],'bugs':[],'ledger':{'added':[],'updated':ids,'repeats':[],'check':0},'code_proposals':proposals,'implementation_domains':['combat','potion','terminal'],'report':str(p/'report.md')}
report='''## 复盘回报
- 已追加：E6DYYXRX7GVE（A10，第45层，灵魂枢纽 SOUL_NEXUS：T6剩3血0挡对17攻击阵亡，毒结算后敌剩40血）。
- 新的纯 bug：
  - 无。
- 写成「未记录」的项：E6DYYXRX7GVE：完整dirty源码；F33首试退出／末轮结算；F5／F33逐源毛伤、真实总需伤及末击过量；永久敌实体ID及F14同帧击杀先后；完整最优方案执行率；护栏、药水、路线和构筑的受控反事实；F45T4初题差1血的原因；旧boss时钟及实打／估值比；未访F46—F49资源；Jev缓存、实际扣费及Codex费用。
- 学习账本：E6DYYXRX7GVE：新增无；更新 '''+'、'.join(ids)+'''（均为support，已确认老错重犯无）；`ledger.py check`退出码0。
- 代码提案（均关联独立strategy-proposal，尚未实现）：
  - '''+proposals[0]+'''：F33重打T2、F45T1—T2证据；账本silent-0125／0057／0005；验证护栏血价、生成重问及能力兑现。缺整场对照，保留阈值。
  - '''+proposals[1]+'''：F33首试T11、F45T6证据；账本silent-0278／0011；把已核六毒接入普通楼层同线预算。没有早喝胜率对照，不制定饮用门槛。

```json
'''+json.dumps(obj,ensure_ascii=False)+'''\n```
'''
(p/'report.md').write_text(report);(p/'report.json').write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n');print(report)
