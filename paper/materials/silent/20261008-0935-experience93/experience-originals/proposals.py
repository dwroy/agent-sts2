import json,subprocess
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');N='ZTRGYYMLR8SC';C=json.load(open(O/'changes.json'))['entries'];F={r['id']:r for r in json.load(open(O/'ledger-fold.json'))}
def cli(script,command,obj,label,extra=()):
 data=json.dumps(obj,ensure_ascii=False);(O/(label+'-input.json')).write_text(data+'\n');p=subprocess.run(['python3',str(ROOT/'learner'/script),command,*extra],input=data,text=True,capture_output=True);(O/(label+'.log')).write_text(p.stdout+p.stderr);p.check_returncode();return p.stdout.strip()
ting=next(c['after'] for c in C if c['before'] is None);T=json.load(open(O/'historical-tingsha.json'));ev=[]
for run in ting['evidence']:
 r=next(r for r in T if r['run']==run and r['delta']==3);ev.append(dict(run=run,floor=r['floor'],turn=r['turn'],role='support',note='单张弃牌的实际选择前后帧，铜钹使一敌HP/挡合计减3；ULP另7次滑溜同现只1，未隔离其因果。详见historical-tingsha.json，不推广固定3或整战胜因。'))
first=ev[0]['run'];new=dict(by='learner:experience-update',character='silent',kind='mechanic',claim=ting['lesson'],evidence=ev,first_run=first,prior='unknown',prior_note='最早可核窗口来自卡牌要求的强制单弃，不能由完成强制弃牌反推预训练已懂铜钹或主动做对构筑/打法；无更早可比的主动选择和受控整战。',status='proposed',where=dict(experience=[ting['id']]),note='全史仅本角色；先登记提案来源，提交后追加commit/changelog；不标accepted/shipped/代码implemented。')
newid=cli('ledger.py','add',new,'ledger-add');F[newid]=dict(new,id=newid)
mapping={'silent-strength-weak-observation':['silent-0012'],'silent-frail-card-block':['silent-0013'],'silent-piercing-wail-temporary-strength':['silent-0046'],'silent-heart-of-iron-plating':['silent-0277'],'silent-fan-of-knives-capacity':['silent-0149'],'silent-rest-buffer-observation':['silent-0020'],'silent-route-hp-observation':['silent-0019'],'silent-deck-burst-observation':['silent-0021','silent-0125'],'silent-kin-poison-sl-observation':['silent-0012'],ting['id']:[newid]}
cases={'silent-strength-weak-observation':(17,7),'silent-frail-card-block':(17,14),'silent-piercing-wail-temporary-strength':(17,5),'silent-heart-of-iron-plating':(17,2),'silent-fan-of-knives-capacity':(11,1),'silent-rest-buffer-observation':(16,None),'silent-route-hp-observation':(11,3),'silent-deck-burst-observation':(17,13),'silent-kin-poison-sl-observation':(17,14)}
updates={}
for c in C:
 for lid in mapping[c['id']]:
  u=updates.setdefault(lid,dict(id=lid,by='learner:experience-update',where=dict(experience=[]),evidence=[],note='第93批经验提交前提案来源关联；保留原首证/prior/claim/repeat及旧上线历史，源提交后改proposed，打法源码独立strategy-proposal。'))
  u['where']['experience'].append(c['id']);known={r['run'] for r in F[lid]['evidence']}|{r['run'] for r in u['evidence']}
  if c['id']!=ting['id'] and N not in known:
   f,t=cases[c['id']];r=dict(run=N,floor=f,role='support',note='第93批本角色原帧核实'+c['id']+'；真实时点/层数与候选、整战因果分账，见facts.json/terminal-facts.json/changes.json。')
   if t is not None:r['turn']=t
   u['evidence'].append(r)
for u in updates.values():
 if not u['evidence']:u.pop('evidence')
cli('ledger.py','update',list(updates.values()),'ledger-prelink')
(O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n');(O/'ledger-added.json').write_text(json.dumps([newid])+'\n');(O/'ledger-ids.json').write_text(json.dumps(sorted(updates))+'\n')
common='''角色silent，机制覆盖仅据自身A0—A10实帧，策略只限已观察A10；其他角色/未观察进阶保持等价。来源experience-update/20261008-085641-experience-update，第93批2026-10-08.10；目标任务strategy-proposal，授权Roy-2026-10-07-learning。本次不改打法源码。
新证ZTRGYYMLR8SC：A10/F17，同族六试68/70、铁心+瓶装潜能进场，前五判死截断、末T14实死；UTC首末决策2026-10-07T23:44:59.858Z—2026-10-08T00:21:56.238Z，594决策/607帧/16实际Codex脑/6 SL摘要/3计划；DeepSeek0。runs代码aa1e2136+dirty完整源码缺失，不以当前树冒认原代码。
历史截至末决策共123静默已结束局，旧122局七数组逐行、血档/节点后战/实回复/SL重算一致；runs.character和states.run.character_id双隔离。不用其他角色、缺角色旧局、进行中、切点后局。
拟合/切分：本轮不拟合出牌/药水/SL/终局权重、HP阈值或固定目标顺序。历史截止数据只诊断/做固定夹具，后续新完局时间留出验证；同局SL整体同组，不能拆作独立训练/验证。每项支持/反例及分阶见update-summary.json，动作不等独立局；无整场反事实或胜线则保持原规则并记录具体缺数据。
验证/回退：独立实施先核最新live入口，已有等价用实际live祖先源码commit记duplicate。若事实覆盖或机器记录缺失，单独最小修改/固定正反例/沙箱tsc+vitest/合前刷新预检/合后测试/唯一版本和双通知Roy；单独逆向撤实际实现净补丁，保留知识刷新/并行记录/账本。经验数据提交不称源码implemented/shipped。
'''
mechs=['silent-strength-weak-observation','silent-frail-card-block','silent-piercing-wail-temporary-strength','silent-heart-of-iron-plating','silent-fan-of-knives-capacity','silent-tingsha-discard-damage']
groups=[('mechanisms',mechs,['combat','potion','terminal'],'核验同族临时减力、脆弱、覆甲与铜钹/刀扇分源覆盖','''旧行为：代码可能已有等价机制，新证据不等新bug；先复核当前入口。新行为：攻击按段加现场力再核弱，牌挡逐牌加敏后折脆弱，被动覆甲/弃牌附伤独立，临时负力/能力只按真实时点，不跨战预支。
证据：ZTRG末T5普通尖啸敌力6/3/3→0/−3/−3，33攻→11，4覆甲后实损7；T6力恢复，T7仍26攻穿5牌挡+2覆甲损19。末T14两防御各3合6，对13攻完整损7，4血死；严格再需4血才活，显示hpAfter−3不是只损3。
铁心全史17局33实饮均覆甲增7且旧挡不变；本局F6一饮/同族六饮，boss末T2建7，T9归零。无晚喝/不喝完整对照，不修改饮用门槛。力量药全史41局58饮均+2；本局F11/F14实际建立且换战不继承。
刀扇F11T1能力药选择后实际施放：8手打出，添3刀至10、建1；2力小刀各6，赢战52→32。仅本场单敌，不补多目标伤害或单卡胜因。铜钹7局107次独立可配对的单张强制弃牌：100次一敌HP/挡合计减3；ULP4TN1GNHMK另7次Vantom滑溜同现减1，限伤因果未隔离。本局末T14投掷匕首原攻击后神官64，完成弃牌64→61额外3，后中和至58，附伤不可重复计原牌直伤。随机分布/多弃/其他減伤缺数据，不泛化。
预期影响：减少未兑现或重复计伤/格挡，现有等价则保留；不承诺此局变胜，不把药水时点、固定先能力或固定目标规则补入代码。
'''),('trace',[c['id'] for c in C if c['id'] not in mechs],['combat','potion','sl','terminal'],'保留候选护栏血价、真实执行与同族重打/路线资源链','''旧行为：三次HP护栏都符合当时现行阈值，不能报纯bug；13条SL重放不是13次新Jev决策。新行为：若已有追踪不充分，以层/尝试/回合/指纹贯通原答、护栏、SL重放、抽牌重问和真实整轮出口，候选局部省血不能累计成整场已得血或胜因。
三个同题面原/替候选：F11T3损25扣26→损20扣18，实际损20扣18；同族首T10局部损15扣12→损12扣3，实际仅该局部扣毒3；末T13损2扣7→损0扣0，实际4血/神官73不变。候选共省10/少24伤不是实战整场反事实；两次boss护栏额外预算已用尽、阈值0。末T13两线五轮24/24死、末T14仍败；无原线完整胜局，不拟阈值/成长或终局权重。
重打：同族七证据局31尝试3赢，其中真正重打六场30尝试2赢；A0背景，策略仅六个A10局。本局六次均先退信徒后神官但全败，末退场T7/T9、神官末余58；第2试换T1铁心/施毒目标和洗牌时点，抽牌同变，无单动作受控胜因，不能由失败定统一击杀序或把换序全称运气。
资源链：六胜房净损51，三休实回63，56−51+63=68入boss。新获7瓶/独立饮7瓶/主动弃0；含SL动作17饮中的10来自恢复两原瓶，五次恢复净HP66/64/66/66/62另计。F10才取餐券、之前两商店不补回血；未来营火/计划步法或毒雾不当现有资源，boss22牌无能力/力敏来源。末14轮净扣266/324不是预先校准的安全时钟；boss时钟未校准且F16模拟32不足300，保留实际与预测口径。
分阶血档与REST/SHOP/EVENT源节点的后战死亡率仅观察，源血/房型/构筑/用药未控，未走替路线/护栏原线/晚喝铁心的整战结果缺失。保持原路线/休息/药水/SL必死规则，只实施已核事实覆盖或缺失追踪；不从有限全败推演改变SL边界。
''')]
ids=[]
for name,eids,domains,summary,body in groups:
 lids=sorted({lid for e in eids for lid in mapping[e]});runs=list(dict.fromkeys(n for c in C if c['id'] in eids for n in c['new_runs']));p=O/f'proposal-{name}.md';p.write_text('# 静默猎手第93批：'+summary+'\n\n账本：'+','.join(lids)+'\n经验：'+','.join(eids)+'\n\n'+common+body)
 row=dict(character='silent',ledger=lids,runs=runs,source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(p),experience=eids,rule_changes=True,authorization='Roy-2026-10-07-learning');(O/f'proposal-{name}.json').write_text(json.dumps(row,ensure_ascii=False,indent=2)+'\n');ident=cli('code_proposals.py','add',row,'proposal-'+name+'-cli',('--character','silent'));ids.append(ident);print(ident)
(O/'proposal-ids.json').write_text(json.dumps(ids)+'\n')
