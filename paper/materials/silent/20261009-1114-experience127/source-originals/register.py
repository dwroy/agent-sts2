import collections,json,subprocess
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');N='E6DYYXRX7GVE'
C=json.load(open(O/'changes.json'));M=json.load(open(O/'ledger-map.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};rows=json.load(open(O/'registration-cli.json')) if (O/'registration-cli.json').exists() else []
def cli(args,data=None):
 p=subprocess.run(['python3',str(ROOT/'learner'/args[0]),*args[1:]],input=json.dumps(data,ensure_ascii=False) if data else None,capture_output=True,text=True)
 rows.append({'命令':args,'数据':data,'stdout':p.stdout,'stderr':p.stderr,'退出码':p.returncode});(O/'registration-cli.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
 assert p.returncode==0,p.stderr
 return p.stdout.strip()
new=C[-1]['after'];newkey=new['id']
if not M[newkey]:
 data={'by':'learner:experience-update','character':'silent','kind':'mechanic','claim':new['lesson'],'evidence':[{'run':r,'floor':next(x['floor'] for x in json.load(open(O/r/'analysis.json'))['mechanisms']) if False else None,'note':'实打建立INFINITE_BLADES_POWER1；完成动作和参数见mechanism-evidence.json，生成刀实际伤另核。','role':'support'} for r in new['evidence']], 'first_run':new['evidence'][0],'prior':'unknown','prior_note':'全部本角色历史完局中第一次已完成施放为F9PP859XZ3RJ A4；之前没有同卡可比实盘，本次不借模型预训练判断。','status':'observed','where':{'experience':[newkey]},'note':'经验分支预关联；源提交后proposed，独立strategy-proposal实现，未标accepted/shipped。'}
 for ev in data['evidence']:ev.pop('floor')
 ident=cli(['ledger.py','add','--character','silent'],data);assert ident.startswith('silent-');M[newkey]=[ident];(O/'ledger-map.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n');(O/'ledger-added.json').write_text(json.dumps([ident])+'\n')
known={}
for ident in dict.fromkeys(i for v in M.values() for i in v):
 known[ident]=json.loads(cli(['ledger.py','show',ident]));(O/('ledger-source-'+ident+'.json')).write_text(json.dumps(known[ident],ensure_ascii=False,indent=2)+'\n')
for ident in dict.fromkeys(i for v in M.values() for i in v):
 if any(x['命令']==['ledger.py','update'] and (x['数据'] or {}).get('id')==ident and x['退出码']==0 for x in rows):continue
 linked=[c for c in C if ident in M[c['id']]]
 data={'id':ident,'by':'learner:experience-update','where':{'experience':[c['id'] for c in linked]},'note':'第127次经验/提案预关联；保持旧首证/prior/claim/状态/版本与原证据，源提交后再登记proposed。'}
 if not any(x['run']==N for x in known[ident]['evidence']):data['evidence']=[{'run':N,'floor':45,'role':'support','note':'原字节、逐帧及历史复核通过；相关实盘结论见changes.json及verification.json。'+linked[0]['after']['lesson']}]
 cli(['ledger.py','update'],data)
groups={
 'resources':['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation'],
 'mechanisms':['silent-strength-weak-observation','silent-footwork-block','silent-noxious-fumes-growth','silent-piercing-wail-temporary-strength','silent-malaise-x-debuff','silent-eternal-feather-rest-arrival-heal','silent-captains-wheel-third-turn','silent-deadly-poison-application',newkey],
 'potions':['silent-poison-potion-observed-application','silent-regen-potion-decay-heal'],
 'sl':['silent-knowledge-demon-healing-sl-observation','silent-knowledge-demon-sloth-replay-observation']}
texts={
 'resources':('护栏生成后缀与实际恢复资源逐层核验','旧行为：护栏按8血容差换线，F33第2试T2预计损13→3、节点伤20→12，取消隐秘匕首生成两刀，原线没有实打。路线投影F42满血，实50/68；F43羽毛21与HEAL17回满，F45仍死。候选新行为：完整生成后缀/重问收益与即时血价分列，路线沿实际上一场胜战消耗、带骨肉/羽毛/休息资源传播；先固定回放诊断，不改无受控配对的护栏8阈值或路线血线，不能由终战死认定HEAL错误。',['combat','terminal']),
 'mechanisms':('逐牌敏捷、毒雾、生成刀及现场减力验收','旧行为：现有出牌模型已处理这些常见机制，完整运行dirty树未记录。候选新行为：先核现在live是否等价：灵魂枢纽F45T1步法3敏与冲刺13挡、T2五敏防御10、T3舵盘18另加扫腿+19；T4萎靡X2使34→32、T6尖啸减6力使21→17，不能套单点固定收益。毒雾3/6与直施毒/实际毒结算分源，无尽刀刃T2建1后T3—T6生成刀伤4/3/3/4，未施放群蛇/科学无收益。羽毛只到火回，未来不预支。仅有实帧与当前模型可复现偏差时修改对应公式/接线；已实现且live祖先源码可核就duplicate，缺数据waiting，不改无关角色。',['combat','terminal']),
 'potions':('已核六毒接入普通楼层预算并分账再生','旧行为：当前只读live combat-plan.ts:3135只在observedDouble两boss楼层设置observedPoison；reflex/card-model.ts:1618按该上下文才建POISON_POTION模型，F45十一选线仍数值未知/effect not simulated。候选新行为：用本角色已核无加量/无制品剂量6向普通楼层F33/F45上下文传入药效，饮用只加毒不即时扣血；与已有毒、毒雾补层、真实结算时点共同进入后续与终局预算。F33首试T11毒28→34/HP135不变、判死未结，SL恢复同瓶；F45T6毒22→28/HP68不变，实结到40、3血对17仍死。再生F12建立5层，四轮回14、承伤14、净零；不能按净零算无伤。药瓶160次/40局，常态/头骨/制品分支保留；不改持有药价或规定早喝回合，没有早喝/不喝整场对照，不宣称可转胜。',['combat','potion','terminal']),
 'sl':('恶魔同盘重打、限牌及实际毒收尾验收','旧行为：同房SL恢复血与原瓶，懒惰按实际牌名额，省血与少伤分列。候选新行为：用本局F33两次70血/同毒瓶开局的对照核恢复与重规划；首试T11三牌满、1能量扫腿+锁、药加6毒不加名额但未结毒即判死；重打T14零出牌结束、41毒经同轮毒雾补47、收44敌血，3血赢。保持同房首末统计、不将首试未结34毒当伤；记录回放在T1一致和后续抽牌/多回合变更，不能只把胜归T2护栏。无独立触发/换线门槛证据，保留SL原规则。',['combat','sl','terminal'])}
proposals=[]
for name,ids in groups.items():
 title,body,domains=texts[name];ledger=list(dict.fromkeys(i for ident in ids for i in M[ident]));lines=['# '+title,'','适用角色silent，直接观察A10；机制已观察历史进阶逐项列于下表。来源任务experience-update，目标独立strategy-proposal；账本'+','.join(ledger)+'。','',body,'','## 支持与反例','','| 条目 | 支持/反例与进阶 | 典型证据 |','| --- | --- | --- |']
 for c in C:
  if c['id'] not in ids:continue
  e=c['after'];lines.append(f'| {e["id"]} | {e["n_support"]}/{e["n_contradict"]}；{dict(collections.Counter(R[r]["ascension"] for r in e["evidence"]))} | {e["lesson"]} |')
 lines+=['','全部12位evidence/contradicting与参数明细见本目录changes.json、mechanism-evidence.json。新局d310056—310761/s318300—319051，关键原记录逐字节/SHA复核1476项；2590原字节与参数/角色/历史核验通过。泛主题支持局数不是每个参数独立隔离分母，死亡不是机制反例。','', '## 拟合与验证','','旧163局为历史校验，新局为时间顺序验收；不拟合无对照的胜率、药价或血阈值。固定逐帧回放，以本角色状态与现场招式值验证；生成/抽弃后重问同轮全后缀，不把生成前的候选扣血当整轮输出；测试不得跑play、联网或boss模拟池。其他角色与未观察机制等价；双boss原既有模型等价。','', '## 缺数据','','完整运行dirty源码、原护栏线/早喝/留药/改线整场实打、首试T11退出和毒结算帧、F33回血与毒混合帧各源毛伤、F45T4初题少1损的独立原因、未访F46—F49资源；不补造数据。现有实现等价且可证明live祖先源码时按duplicate处置，否则证据不足waiting并保留原规则，不冒称implemented/shipped。','', '## 预期影响与回退','','预期使已核机制、实际恢复与当前候选/终局预算一致，不承诺本局可赢。独立任务源码修改自测后合live、登记版本及Roy双通知；回退revert实际源码提交或限制药效范围，本次经验可恢复experience-before.json。Roy-2026-10-07-learning为规则修改授权，不为游戏事实。']
 path=O/f'proposal-{name}.md';path.write_text('\n'.join(lines)+'\n')
 item={'character':'silent','ledger':ledger,'runs':list(dict.fromkeys([N]+(new['evidence'] if newkey in ids else []))),'source_task':'experience-update','target_task':'strategy-proposal','domains':domains,'summary':title+'；缺受控胜负对照保留现有阈值','proposal':str(path),'experience':ids,'rule_changes':name=='potions','authorization':'Roy-2026-10-07-learning'}
 (O/f'proposal-{name}.json').write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n');pid=cli(['code_proposals.py','add','--character','silent'],item);assert pid.startswith('silent-proposal-');proposals.append(pid);print(pid)
(O/'code-proposals-results.json').write_text(json.dumps(proposals,ensure_ascii=False,indent=2)+'\n')
