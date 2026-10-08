import json,subprocess,sys
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load(open(O/'changes.json'))['entries'];M=json.load(open(O/'ledger-map.json'))
L=list(dict.fromkeys(l for ls in M.values() for l in ls))
def cli(script,args,value):
 stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
 p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner'/script),*args],input=json.dumps(value,ensure_ascii=False),text=True,capture_output=True)
 with (O/'ledger-cli.log').open('a') as f:f.write(stamp+'\n'+json.dumps(value,ensure_ascii=False)+'\n'+p.stdout+p.stderr+'\n')
 assert p.returncode==0,p.stderr
 return p.stdout.strip()
if sys.argv[1]=='prepare':
 F=json.loads(subprocess.check_output(['python3',str(ROOT/'learner/ledger.py'),'fold'],text=True));F=F if isinstance(F,dict) else {e['id']:e for e in F}
 for lid in L:
  changes=[c for c in C if lid in M[c['id']]];known={e['run'] for e in F[lid]['evidence']}
  missing=list(dict.fromkeys(r for c in changes for r in c['after']['evidence'] if r not in known))
  v=dict(id=lid,by='learner:experience-update',where=dict(experience=[c['id'] for c in changes]),note='第114批提案预关联；原claim/首证/prior/状态/版本/support/repeat历史保留。850决策/966帧与旧148局同口径复算；实际支付、抽弃、毒与血药逐层/轮见本任务scratch，提交后登记proposed。')
  if missing:v['evidence']=[dict(run=r,role='support',note='本角色实帧/复盘重核：'+','.join(c['id'] for c in changes)+'；层/轮见history、gamble-history、verified与audit，不以持有自动认机制支持。') for r in missing]
  cli('ledger.py',['update'],v)
 specs=[
 ('mechanisms',['combat','potion'],[c['id'] for c in C if c['after']['scope'].split(':')[0] in ['card','relic','potion'] and c['id']!='silent-calculated-gamble-upgraded-hand-reset']+['silent-strength-weak-observation','silent-frail-card-block'],'静默毒/力敏/免费被动挡与持牌伤按实际结算核验'),
 ('handoff',['structure','combat','sl','terminal'],['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation','silent-act-transition-missing-hp-heal','silent-double-boss-resource-handoff'],'静默双boss真实血药和能力重建接续，模拟与实盘分账'),
 ('queen',['combat','sl'],['silent-queen-poison-window-sl-observation','silent-aeonglass-artifact-growth-sl','silent-lost-forgotten-possession'],'静默全败推演中的真实血价与SL执行后缀核验'),
 ('gamble',['combat','sl'],['silent-calculated-gamble-upgraded-hand-reset'],'静默计算下注+保留、全弃等量重抽及消耗的执行边界')]
 details={
 'mechanisms':['HEMND3SMQYB8 A10 F48T1毒雾+建3并补遗物7挡，随机尖啸1费→0、实减6力，弱下19→15；18挡覆盖攻击和凋萎3。T2步法建2敏；T3触媒+建2、22毒三结63；T4爆发22+9=31、即发31+30+29=90、剩28，再轮末28+27+26=81；净清183另含12直伤。','F48T4新凋萎6、7挡对22攻击，实际49→28需损21，原未见手牌时模型报18；沿silent-0297及复盘原提案去重，不凭晚重算声称能省3血。F48T3升级紧勒建3、后两牌各扣3，普通2/升级3子集分列；0260沿既有普通漏伤链，不扩大叠层/穿挡未知交互。','F49末T1步法2敏与冰晶7分源；T2敏捷药再+2，已有挡不补，后防御9；T3脆弱各牌扫腿11/斗篷7/防御6另核。F39负敏−4、2挡对13实损11，再生回2、净损9，五轮回15另账。黑暗镣铐F49T2暂减9使22→13、9挡损4，后轮恢复，强化另增力。'],
 'handoff':['HEMND3SMQYB8 A10九营火/六回血实回121/三升级，F30三虫37净损后11血，F32回21、32进沙虫胜15，跨幕回44到59。F47回16封顶70，F48缚魂+混沌70→25仅剩混沌，F49仍25无回复/奖励补给，六次全败。','已上线题面在F44/F47/F48后明确第二boss/中间不休息，本局无误认终战证据。先检查当前live已实现实际血药接续和终局评估，正确保持；固定同一样本胜后HP/药/能力重建与估值来源，不把首boss胜当全局胜。低可信/不足样本不给推演胜率0；未有第二场胜线，不拟固定HP权重、药价、保药时点或SL次数。'],
 'queen':['HEMND3SMQYB8 A10 F49六试25血混沌，前五T2判死9血9挡对22攻击未执行结算；五次恢复9→25及同一混沌不计回血80/新获5瓶。末试T3同10血4敏/99脆弱，两线24/24预计死亡，24挡/损3防御线未实打，18挡/损9毒雾实打至1，T4才每敌补3毒；末1血11挡对19完整需损8、至少差8血存活，敌剩501。','有限全败推演先记录即时真实血价和实建/待结毒，不把输出提升8残敌HP当无代价；无未执行防御线整战胜果，不强制固定防御排序或固定杀序。SL改序但全弃后原后缀不再实际可执行，必须以重算/续步记录比较；抽弃/药生成也变，不归单因或运气。F39两怪负力敏与再生净伤分源，不以净损9推只有9攻击伤。'],
 'gamble':['新机制首证R0HEV5E3QT6G A0 F25T3：牌自身离手后3旧牌换3新牌；HEMND3SMQYB8 A10 F48T2未打保留到T3，6换6且进入消耗；F49末T1 7换7后肾上腺素/中和/紧勒/扫腿均不在新手，旧SL方案后缀未执行。全部历史升级帧见gamble-history，支持与保留子集单列。','旧行为：普通版S1.fix12修复不能代表升级分支，复盘只读live card-model.ts:920仍用未升级条件，:1108收不到全弃/等量抽标志，turn-solver.ts:1676无法移除旧手牌。新行为：仅本角色已见升级文本接全弃/等量抽/消耗标志，未知重抽后截断确定后缀、执行器按新手重算；SL也跨同一边界。不改变其他角色、未知抽序或普通版已修行为。','纯bug账本silent-0317、真实机制0318分账；实现者先核当前live与原postmortem升级提案去重，若已有源码修复只在真实live祖先commit证实时登记duplicate/implemented。本任务不修源码、不把虚构后缀预测作为实际伤挡或胜果。']}
 ids=[]
 for name,domains,entries,summary in specs:
  ledgers=list(dict.fromkeys(l for e in entries for l in M[e]))
  if name=='mechanisms':ledgers+=['silent-0260','silent-0297']
  if name=='gamble':ledgers+=['silent-0317']
  lines=['# '+summary,'','角色silent；来源任务experience-update，实现任务strategy-proposal；授权Roy-2026-10-07-learning。','账本：'+','.join(ledgers)+'；经验：'+','.join(entries),'','## 旧规则、新观察与证据']
  for ident in entries:
   c=next(c for c in C if c['id']==ident);e=c['after']
   lines+=['- '+ident+'；旧：'+(c['before']['lesson'] if c['before'] else '此前无独立升级全弃机制条目')+'；新：'+e['lesson']+'；进阶'+str(e['asc'])+'；支持'+','.join(e['evidence'])+'；反例'+','.join(e.get('contradicting',[]))+'；账本'+','.join(M[ident])+'。']
  lines+=['','## 证据局号、层、回合、旧规则与新行为',*details[name],'','## 拟合方法、时间切分、缺数据、验证与回退','旧148完局截至2026-10-08T15:44:39.242Z为历史兼容核验；新局截至16:31:21.905Z为后时段发现样本，后续silent新完局才作独立留出。SL多试不当独立局；本任务未拟合硬血线、药水持有价、终局权重或SL参数。先查当前live/原提案；正确保持，已见确定机制偏差才窄修，缺受控胜果先waiting并写具体限制。','固定验证使用本scratch原始966状态/850决策/9SL、58关键核验及全部历史支持原帧；回归包括毒叠层/阶段、牌挡与被动挡分源、负敏、旧挡不倒补、全弃后合法手牌和未知抽边界。完整dirty运行源码未知；未选路线/早喝/替代整战胜线/凋萎内部全序和时钟校准缺证，不补预训练玩法。','预期使已观察机制与模型/题面一致，不保证转胜。保持原test-sandbox入口、固定排除和60000预算；回退独立源码commit至父版，保留经验/账本与失败历史；其他角色及未观察进阶行为等价。实际上线后date双通知Roy旧/新、证据/账本/任务、影响与回退。','本任务仅登记pending，不修改打法源码，不声称implemented或shipped；只有实际live祖先源码commit可登记implemented。','']
  path=O/('proposal-'+name+'.md');path.write_text('\n'.join(lines))
  v=dict(character='silent',ledger=ledgers,runs=['HEMND3SMQYB8'],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(path),experience=entries,rule_changes=True,authorization='Roy-2026-10-07-learning')
  (O/('proposal-'+name+'.json')).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
  output=cli('code_proposals.py',['add','--character','silent'],v)
  try:pid=json.loads(output)['id']
  except (json.JSONDecodeError,TypeError):pid=output
  ids.append(pid)
 (O/'proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n');print(json.dumps(ids))
elif sys.argv[1]=='after':
 commit=(O/'source-commit.txt').read_text().strip();heading=(O/'changelog-heading.txt').read_text().strip()
 for lid in L:
  cli('ledger.py',['update'],dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=[c['id'] for c in C if lid in M[c['id']]],commits=[commit],changelog=[heading]),note='第114批经验已在本分支测试提交；支持/反例及首证/prior历史保持。实际live合入及shipped由运维完成事件核实，不把经验文字当提案源码实现。'))
 (O/'ledger-results.json').write_text(json.dumps(dict(added=[],proposed=L,retired=[]),ensure_ascii=False,indent=2)+'\n');print('登记proposed',len(L))
