import collections,json,subprocess
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');N='JBX9JLH46KVN'
C=json.load(open(O/'changes.json'));M=json.load(open(O/'ledger-map.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};records=[]
def cli(args,data=None):
 p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner'/args[0]),*args[1:]],input=json.dumps(data,ensure_ascii=False) if data else None,capture_output=True,text=True)
 records.append({'命令':args,'数据':data,'stdout':p.stdout,'stderr':p.stderr,'退出码':p.returncode});(O/'registration-cli.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
 assert p.returncode==0,p.stderr
 return p.stdout.strip()
known={}
for ident in dict.fromkeys(i for v in M.values() for i in v):
 known[ident]=json.loads(cli(['ledger.py','show',ident]));(O/('ledger-source-'+ident+'.json')).write_text(json.dumps(known[ident],ensure_ascii=False,indent=2)+'\n')
floors={'silent-0019':43,'silent-0020':47,'silent-0021':48,'silent-0012':49,'silent-0005':48,'silent-0027':48,'silent-0037':48,'silent-0028':49,'silent-0024':48,'silent-0059':48,'silent-0025':48,'silent-0010':48,'silent-0243':34,'silent-0278':48,'silent-0228':49,'silent-0294':49,'silent-0331':49,'silent-0221':36}
for ident in known:
 linked=[c for c in C if ident in M[c['id']]]
 data={'id':ident,'by':'learner:experience-update','where':{'experience':[c['id'] for c in linked]},'note':'第129次经验及代码提案预关联；保留旧claim/首证/prior/状态/版本历史，源提交后登记proposed。'}
 if not any(x['run']==N and x.get('role')=='support' for x in known[ident]['evidence']):
  data['evidence']=[{'run':N,'floor':floors[ident],'role':'support','note':'原字节/实帧已核，细节见changes.json和verification.json；'+linked[0]['after']['lesson']}]
 cli(['ledger.py','update'],data)
resources=['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation','silent-double-boss-resource-handoff','silent-wither-end-turn-loss','silent-aeonglass-artifact-growth-sl']
potions=['silent-alchemize-potion-resource-observation','silent-poison-potion-observed-application','silent-test-subject-phase-reset']
mechanisms=[c['id'] for c in C if c['id'] not in resources+potions]
groups={'resources':resources,'mechanisms':mechanisms,'potions':potions}
texts={
'resources':('首boss毒胜后保血候选生成与连续战资源验收',['combat','sl','terminal'],'旧行为：当前只读live turn-solver.ts:3839在winsFight时提前返回，combat-plan.ts:3298/3301立即执行无药胜线；现有连战HP估值不能比较未生成候选。复盘silent-0271已登记，本任务不重复新建纯bug。拟议行为：独立strategy-proposal用JBX9JLH46KVN F48T9 s320565/320566固定帧复现17血0挡4能量、敌62血26毒/触媒2、留9伤凋萎、可打11挡防御和两后空翻，生成仍然结束首boss且能比较实际出口HP的保血候选，随后按已观察A10连战上下文估值，不把一场胜利当整局终战。F48T8原生存者→毒爆实清177损28，防守候选报清57损12并未实打，两线连战模拟皆0%未校准；不能说多留9/16血必胜，不能以有限模拟全死替代真正必死或新增SL门槛。路线各房资源、六火166回复和跨战重建分账；不拟新固定路线血线/药价/终局系数。'),
'mechanisms':('实际敏捷牌挡、触媒毒结和延后挡的兑现时点',['combat','terminal'],'旧行为：角色已学多数机制，完整dirty运行树未保存，当前源码只定位接线；不由历史单局胜负断言所有公式都错。拟议行为：独立任务先用实帧与现有live等价性核验；若偏差可复现，再按本角色层数和时间修复。F48末两步法+建6敏，翻滚10在T6轮初兑现，蜃景20毒/6敏实26挡；毒爆20+12毒在触媒2下立即93、结束再84，HP仍损28；F49药后3→5敏不追补旧后空翻8挡，翻滚只当前9、未来9，不能把未活到未来计当前。触媒未启毒没有对象，属性和能力不能跨战继承。卷轴T1挡22对24，上限80→78只漏一次；跨幕37/80→71、9/80→65与连战8→8分开。力量多段收益沿本角色历史LYBHQ1X230ZB四击多4复核；未知倍率/其他角色保持。'),
'potions':('实验体0费技能加力、满槽炼制与敏捷药实际收益',['combat','potion','sl','terminal'],'旧行为：F49末T1 Jev原选结束被SL换为0费炼制，仍使实验体9→12力、虚弱意图23→25；敏捷药T1未饮，T2才实3→5敏。d312209理由写选药但chosen为end_turn，不能拿理由当饮药。拟议行为：独立strategy-proposal按实际技能/能力/药水类别与时点核预算，0费炼制仍应付激怒3加力；药水不加敌力，敏捷不追补旧挡，产药与实饮效用分别评价。本局16次炼制完成只有14瓶入槽，F38T1/F43T1满槽两次药栏无增无换，不能计作新资源；先核现有合法动作和满槽收益接线是否等价。POISON_POTION剥制品后7→13毒，敌512血当步不变；同瓶SL复用不计新获得。F49六试同8血空药和前16抽均败、末17挡对25，只有局部时点对照，无不炼制/早喝/留药整场胜果；不规定统一禁技能/禁炼制/早喝或新持有价，不以已授权为补数据理由。')}
proposals=[]
for name,ids in groups.items():
 title,domains,body=texts[name];ledger=list(dict.fromkeys(i for ident in ids for i in M[ident]))
 if name=='resources':ledger.append('silent-0271')
 lines=['# '+title,'','角色silent；本次直接观察A10，机制沿本角色历史进阶分布复核。来源任务experience-update/20261009-120922，实现任务strategy-proposal。账本：'+','.join(ledger)+'。','',body,'','## 证据与反例','','| 条目 | 支持/反例、进阶 | 已核案例 |','| --- | --- | --- |']
 for c in C:
  if c['id'] in ids:
   e=c['after'];lines.append(f'| {e["id"]} | {e["n_support"]}/{e["n_contradict"]}；{dict(collections.Counter(R[r]["ascension"] for r in e["evidence"]))} | {e["lesson"]} |')
 lines+=['','完整12位evidence/contradicting见changes.json、mechanism-evidence.json，原日志偏移/SHA见raw-verification.json。支持数为主题证据局数，不冒称逐公式单因实验；失败不当机制反例。','', '## 拟合方法、时间切分与缺数据','','旧165完局为校验时间前缀，新JBX9JLH46KVN为后续观察。截至2026-10-09T03:30:50.069Z只用silent，低阶与A10分开报告。F48五试1赢/前32抽相同、F49六试0赢/前16抽相同；后续出牌/抽弃/生成药水同变，无法区分每个变更的单因和随机产物影响。不拟新药价、SL阈值或终局参数。','', '缺完整dirty源码、前四F48/前五F49退出和实死帧、毒末击逐次毛伤、永久敌GUID、护栏/保血候选/早喝/留药/改路线与构筑的受控整战胜果、实验体未观察后阶段。证据不足保留现有行为并waiting。','', '## 验证、预期影响和回退','','固定实盘帧验证候选生成/分类/时点与现有实现；不运行play、不联网、不跑boss模拟池。源码交独立strategy-proposal、自测并按live流程合入，无关角色和未观察进阶保持等价。预期避免遗漏保血候选与预支未执行资源，不保证本局转胜。若已有等价实现，只有真实live祖先源码commit可登记duplicate/implemented；本次均pending，不冒称shipped。回退源码commit或经验到experience-before.json，保留并行刷新。','', 'Roy-2026-10-07-learning提供规则修改授权，不提供游戏事实；实际源码上线后先date并按eval版本/decision-log/Roy双通知登记。']
 path=O/f'proposal-{name}.md';path.write_text('\n'.join(lines)+'\n')
 item={'character':'silent','ledger':ledger,'runs':[N],'source_task':'experience-update','target_task':'strategy-proposal','domains':domains,'summary':title+'；缺整战对照的参数保持原行为','proposal':str(path),'experience':ids,'rule_changes':True,'authorization':'Roy-2026-10-07-learning'}
 (O/f'proposal-{name}.json').write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n');pid=cli(['code_proposals.py','add','--character','silent'],item);proposals.append(pid);print(pid)
(O/'code-proposals-results.json').write_text(json.dumps(proposals,ensure_ascii=False,indent=2)+'\n');(O/'ledger-added.json').write_text('[]\n')
