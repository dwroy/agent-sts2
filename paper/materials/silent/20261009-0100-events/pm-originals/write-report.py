import json
from pathlib import Path
P=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-001302-postmortem')
assert json.loads((P/'final-verified.json').read_text())['result']=='通过'
added=list(json.loads((P/'ledger-result.json').read_text())['added'].values())
updated=json.loads((P/'ledger-result.json').read_text())['updated']
proposals=[p['id'] for p in json.loads((P/'proposal-result.json').read_text())]
result={'task':'postmortem','appended':['LY83ZMTFVKJH'],'skipped':[],
 'bugs':[{'run':'LY83ZMTFVKJH','where':'agent/src/reflex/card-model.ts:1036','what':'普通紧勒后续逐牌失血漏推演，T7少2、T10少4；silent-0260及fix-queue-v4已有','new':False}],
 'ledger':{'added':added,'updated':updated,'repeats':['silent-0260'],'check':0},
 'code_proposals':proposals,'implementation_domains':['combat','sl','terminal','structure'],'report':str(P/'report.md')}
body='''## 复盘回报

- 已追加：LY83ZMTFVKJH（A10，第21层，虱虫之祖 LOUSE_PROGENITOR：T12以1血9挡对33攻击阵亡，敌剩4血；含因果措辞勘误，数字不变）。
- 新的纯 bug（file:line，每条一行；没有写「无」）：
  - 无；紧勒漏推演为旧bug silent-0260，fix-queue-v4已有。
- 写成「未记录」的项：LY83ZMTFVKJH：完整dirty源码、部分毛伤及新生体退场顺序、前两次SL退出帧和末轮攻击、实际最优线执行比例、部分推演差额来源、未到节点及boss资源、boss时钟需伤/估伤、Jev缓存命中和实际费用；Jev选择结束回合的原因文本也未记录。
- 学习账本：LY83ZMTFVKJH：新增silent-0314、silent-0315、silent-0316；更新silent-0260、silent-0209、silent-0019、silent-0261（老错silent-0260）；`ledger.py check`退出码0。
- 代码提案（证据/账本/CLI id/实现任务，证据不足明确写限制）：
  - F21 T7/T10紧勒预测8/20、实际10/24 → silent-0260、silent-0261 → silent-proposal-04cbbf6b3a547aea → strategy-proposal；穿挡、升级和重放缺证，不声称修后必胜。
  - F20 T2正卡进度21.464但HP换算未知、T5携牌逃脱 → silent-0314、silent-0315 → silent-proposal-c3ef922a9a5f8285 → strategy-proposal；无救牌实盘对照，保留未知，不设固定HP价格。
  - F17两试T5弃牌重算/退场窗口、F17→F21完整资源链 → silent-0209、silent-0019、silent-0316 → silent-proposal-a64db052a552608b → strategy-proposal；两试后续不同，现有证据不支持固定集火或SL阈值。三项仅登记，未实现或上线。
'''
report=body+'\n```json\n'+json.dumps(result,ensure_ascii=False,indent=2)+'\n```\n'
(P/'report.md').write_text(report)
(P/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(P/'exploration-failures.md').write_text('''# 探索失败与更正保留

- 初期两次工具编排输入出现JavaScript语法错误，未执行对应shell；已重新发起有效读取。
- 原抽取探索中曾因无questions、result为字符串、手牌无card_type而出现字段访问错误；改按实际记录结构解析，原抽取与analysis.txt保留。
- 搜索不存在的card-effects、thief-cost及机制文件路径未找到；后来通过实际目录和现有源码定位。最后检查中误查reflex/explorer.ts、src/decide.ts不存在，正确SL引用来自combat-plan.ts导入src/sl/explore.ts；没有据错误路径作结论。
- 正文草稿和核验脚本保留；追加后发现“Jev因此选择”含未证实因果，已另追加勘误。估值、HP、伤害与死亡数字不变。
- 本次账本T7连续三帧范围最初写308031—308032；另经ledger.py update追加说明正确完整范围308030—308032。旧行保留，正文没有该范围错误。
- 原始按局号抽取、资源工具输出、先验材料、提案JSON/Markdown、CLI标准输出与错误输出、追加字节收据及最终核验均留在本任务目录。CLI写入和最终核验均成功。
''')
print('报告已保存：'+str(P/'report.md'))
print(json.dumps(result,ensure_ascii=False))
