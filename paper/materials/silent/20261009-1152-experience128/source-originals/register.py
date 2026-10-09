import collections,json,subprocess
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');N='XZUJR08FW801'
C=json.load(open(O/'changes.json'));M=json.load(open(O/'ledger-map.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};rows=[]
def cli(args,data=None):
 p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner'/args[0]),*args[1:]],input=json.dumps(data,ensure_ascii=False) if data else None,capture_output=True,text=True)
 rows.append({'命令':args,'数据':data,'stdout':p.stdout,'stderr':p.stderr,'退出码':p.returncode});(O/'registration-cli.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
 assert p.returncode==0,p.stderr
 return p.stdout.strip()
known={}
for ident in dict.fromkeys(i for v in M.values() for i in v):
 known[ident]=json.loads(cli(['ledger.py','show',ident]));(O/('ledger-source-'+ident+'.json')).write_text(json.dumps(known[ident],ensure_ascii=False,indent=2)+'\n')
for ident in known:
 linked=[c for c in C if ident in M[c['id']]]
 data={'id':ident,'by':'learner:experience-update','where':{'experience':[c['id'] for c in linked]},'note':'第128次经验/提案预关联；只追加，保持旧claim/首证/prior/状态/版本与所有证据。源提交后登记proposed。'}
 if not any(x['run']==N and x.get('role')=='support' for x in known[ident]['evidence']):
  floor=17 if ident in ['silent-0224','silent-0227'] else 29
  data['evidence']=[{'run':N,'floor':floor,'role':'support','note':'静默原字节与历史复核，具体窗口见本批changes.json/verification.json；'+linked[0]['after']['lesson']}]
 cli(['ledger.py','update'],data)
resources=['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation','silent-obscura-summon-growth']
potions=['silent-foul-potion-slot-replacement-observation','silent-weak-potion-hatching-window-observation']
mechanisms=[c['id'] for c in C if c['id'] not in resources+potions]
groups={'resources':resources,'mechanisms':mechanisms,'potions':potions}
texts={
'resources':('真实生成后缀、赢战资源链与SL边界验收',['combat','sl','terminal','structure'],'旧行为：升级隐秘匕首Cards被当draw，普通版修复未覆盖升级；F29第二试原题标抽2并接暗影/挡/药，实际弃两张再生成两刀后重问，原后缀未执行。F18投影三房入口56，实际46/23/5，赢战、事件付血及未到营火均须分账。拟议新行为：按已核A6 ENKYQMS9W4ZD F19T2和A10 F29T1升级牌文弃2/生成2刀（6伤）建模，跨弃牌选择以真实手牌重算后缀，不预支虚假抽牌/格挡/药水。路线/终局读取实盘赢战消耗、事件付血、实际恢复，显示条件投影与未兑现未来火；SL前三次拦在T2不等结算，四试并未覆盖全部未展示分支。先核固定回放；没有休息替锻造、改路线或其他SL门槛受控胜负，不改现有阈值、不宣称修后F29必胜。'),
'mechanisms':('已建立毒雾、暗影、临时减力及敌成长逐帧对齐',['combat','terminal'],'旧行为：本角色已学多项机制，当前模型应读取实际层数/现场招式；完整dirty运行源码未知。拟议新行为：在独立strategy-proposal先核现有live是否等价，确认已完成牌、轮初被动与结束预算分别兑现。F17毒雾3/轮初3至19，滑溜前三轮净清3/3/8；T9镣铐减9力令12→3、T10恢复4/22攻但毒收尾。F25暗影使基础5挡各10；甲虫醒后18/20/弱16攻、临时负力未停止下轮成长；石虫即使其他敌掉血仍下轮眩晕。F29末10牌挡＋3覆甲对20需损7，5血死亡截断只扣5；本轮雾2没有下一轮补毒。抱抱先生轮初群伤、跨幕实回49另计。只针对现有源码与实帧可复现偏差改公式/接线，已等价可核live祖先源码按duplicate，缺数据waiting；不修改无证据的固定目标顺序。'),
'potions':('低血满槽复合更换与孵化后虚弱有效窗口',['combat','potion','terminal','structure'],'旧行为：F28两种弃药选项的二幕boss模拟都0胜/约3轮，未按复合动作区分最终药栏；污浊作用对象含自伤但本局数值仍占位。5血丢毒药/无色换两污浊，四次未饮，候选挡后双喝被弃牌重问替换，最终两瓶仍在。拟议新行为：题面明确逐槽旧资源/丢弃/新得、首步代理模拟与完整复合动作缺数值范围；不能把双瓶或下一boss投影作为当前走廊已兑现续命。固定帧验虚弱药给F27孵化1卵后WEAK3在同槽同ID同血连续变体窗口消失，下一轮幼虫各5攻无弱，禁止预算把旧卵层数直接复制到新攻击者。无永久实体GUID/其他变体证据，限定此已见窗口；未饮污浊数值未知，不用模型12自伤充当本局实测，不立早喝/禁用/母体固定目标规则。')}
proposals=[]
for name,ids in groups.items():
 title,domains,body=texts[name];ledger=list(dict.fromkeys(i for ident in ids for i in M[ident]))
 if name=='resources':ledger.append('silent-0334')
 lines=['# '+title,'','角色silent，直接新证据A10，隐秘匕首升级缺口另有本角色A6首证。source_task=experience-update，target_task=strategy-proposal。账本：'+','.join(ledger)+'。','',body,'','## 证据与范围','','| 条目 | 支持/反例、证据进阶 | 已核数字与案例 |','| --- | --- | --- |']
 for c in C:
  if c['id'] not in ids:continue
  e=c['after'];lines.append(f'| {e["id"]} | {e["n_support"]}/{e["n_contradict"]}；{dict(collections.Counter(R[r]["ascension"] for r in e["evidence"]))} | {e["lesson"]} |')
 lines+=['','全部12位evidence/contradicting和参数明细保留changes.json/mechanism-evidence.json；层/回合见对应原记录与该表，F29四试同5血/双药但抽牌/后缀多处变更，并非只改一个变量。失败不当机制反例，泛主题局数不当每公式独立隔离样本。','', '## 拟合、验证与缺数据','','旧164局为时间前缀校验，新XZUJR08FW801为后续验收；不拟合未受控药价、路线/SL门槛或胜率。用固定逐帧数据验证，不运行play、不联网、不跑boss模拟池；无关角色、未观察等级与现有等价分支保持。独立实现自测按test-sandbox及合live流程。','', '缺完整运行dirty源码、前三SL退出/毒结算、独立末覆甲/攻击逐击帧、永久敌GUID、F25T4/F27T3预测差异单因、改线/休息/早喝/留旧药/另一目标整战实打、污浊实际剂量与未到后续节点资源。不能由局部改良声称整场转胜。','', '## 影响、回退与授权','','预期纠正已核模型/资源接线和未兑现收益，先核当前live；无证据保持规则并waiting，已实现只在实际live祖先源码可核时duplicate，不冒称implemented/shipped。本批仅经验前缀，源码由独立任务实现；回退实际源码commit或对应范围，经验可恢复experience-before.json。Roy-2026-10-07-learning为规则授权，不为游戏知识；源码上线后按日期、eval版本及Roy双通知登记。']
 path=O/f'proposal-{name}.md';path.write_text('\n'.join(lines)+'\n')
 item={'character':'silent','ledger':ledger,'runs':[N]+(['ENKYQMS9W4ZD'] if name=='resources' else []),'source_task':'experience-update','target_task':'strategy-proposal','domains':domains,'summary':title+'；证据不足的门槛保留原行为','proposal':str(path),'experience':ids,'rule_changes':True,'authorization':'Roy-2026-10-07-learning'}
 (O/f'proposal-{name}.json').write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n');pid=cli(['code_proposals.py','add','--character','silent'],item);assert pid.startswith('silent-proposal-');proposals.append(pid);print(pid)
(O/'code-proposals-results.json').write_text(json.dumps(proposals,ensure_ascii=False,indent=2)+'\n');(O/'ledger-added.json').write_text('[]\n')
