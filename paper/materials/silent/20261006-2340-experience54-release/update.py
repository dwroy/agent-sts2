import collections,copy,json,re,subprocess
from pathlib import Path
O=Path(__file__).parent; ROOT=O.parents[2]; RUN='BVF22RSFVBS9'
P=ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'
B=json.load(open(O/'experience-before.json'));X=copy.deepcopy(B);E={e['id']:e for e in X['entries']}
A=json.load(open(O/'audit.json'));M=json.load(open(O/'mechanisms.json'))
R={r['run_id']:r for r in json.load(open(O/RUN/'completed-runs.json'))}
rest=json.load(open(O/'rest-summary.json'))[-1]
stamp=subprocess.check_output(['date','+%Y-%m-%d'],text=True).strip()
newfacts={
'silent-strength-weak-observation':' BVF22RSFVBS9 A10三虫末T3尖啸+令石虫0→−8力、16→8，双防御10挡零损；T4临时减力撤回，甲虫滚动0力18，T5力2且虚弱为15；第3次T6力4无弱22。死亡战无玩家力敏，不预支未取得步法。',
'silent-noxious-fumes-growth':' BVF22RSFVBS9 A10仪式兽T1建2层，T4轮初补2后毒药加5到24，实毒24+23=47跨160清力、31血零损；新战三虫末T5才建2、随即死亡无下一玩家轮补毒，前战增长不能预支。',
'silent-accelerant-triggers':' BVF22RSFVBS9 A10仪式兽T3已有19毒，普通触媒建立1后实扣19+18=37；三虫末T1虽建1却无毒，前三轮只扣36/180，持有次数不能补足初毒或即时群伤。',
'silent-bubble-bubble-condition':' BVF22RSFVBS9 A10仪式兽T3已有10毒，普通冒泡实加9到19、敌血不即时变，随后建触媒1实扣37；只补有毒分支，没有新空打反例或单卡胜因。',
'silent-deadly-poison-application':' BVF22RSFVBS9 A10仪式兽T4轮初毒雾补2至19，普通毒药再施5到24、血不即时变；结束24+23=47实扣176→129跨160，毒雾/触媒和直伤分账。',
'silent-poisoned-stab-components':' BVF22RSFVBS9 A10 F14 T1普通刺击直6使缩小甲虫40→34、另施3毒；F19 T4地道虫挡吸收直伤而50血不变，仍把已有5毒加到8。直伤/格挡/施毒/随后触发分账。',
'silent-piercing-wail-temporary-strength':' BVF22RSFVBS9 A10三虫末T3升级使三敌各−8力，石虫16→8被10挡覆盖，T4石虫眩晕但甲虫醒后18另计；T5甲虫2力、弱后15仍杀4血0挡。局部减力不关闭其他敌成长。',
}
updated=list(newfacts)+['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation','silent-slumbering-beetle-wake-growth','silent-ceremonial-beast-threshold-growth-sl']
for ident in updated:
 e=E[ident];n=e['n_support'];assert RUN not in e['evidence'];e['evidence'].append(RUN);e['n_support']=len(e['evidence']);e['last_seen']=stamp
 e['lesson']=e['lesson'].replace(f'（n={n}）',f'（n={n+1}）').replace(f'{n}支持局',f'{n+1}支持局')
 if ident=='silent-bubble-bubble-condition':e['lesson']=e['lesson'].replace('（n=11，新增A10一局正分支）','（n=12，本轮新增A10一局正分支）')
 e['confidence']='high' if e['n_support']>=5 and e['n_contradict']<=e['n_support']/3 else 'med' if e['n_support']>=2 else 'low'
 if ident in newfacts:e['lesson']+=newfacts[ident]
E['silent-route-hp-observation']['lesson']=f'观察：战损/营火/事件/遗物回复/最大血分账，不定安全血线。66静默局1040房56实死；A8一局25房0死、A9三局48房2死、A10二十六局326房26死，各血档/节点见第54节。A10二幕25–40%走廊3房2局1死=33.33%，两活场净损−11/0、中位−5.5含回血；≥60%走廊41房17局0死、活损中位11。典型案例：BVF22RSFVBS9 F19地道虫59→21损38；飞靴改无精英四营火后F21/22事件均21血，F23三虫死、F24第一火未到。未走替路线，不推因果（n=66）。'
E['silent-rest-buffer-observation']['lesson']=f'观察：回复加血池，启动/输出/后战存活仍核。A8一局9火8回血7非回血、实回111（帐篷双动作），去重后战7/0死、活损中位10；A9三局21火16回血5非回血、实回341，后战15/1死、中位34。A10二十六局{rest["rests"]}火{rest["heal"]}回血{rest["smith"]}非回血、实回{sum(rest["gains"])}，后战{rest["nexts"]}/{rest["deaths"]}死={rest["deaths"]/rest["nexts"]:.2%}、活损中位{rest["median"]}。典型案例：BVF22RSFVBS9三回血各21合63，F16的42→63支撑七轮boss实损44后19血过关；二幕四未来火均未到，三虫21血四败。未选锻造/提前回复无实打对照（n=66）。'
olddeck=E['silent-deck-burst-observation']['lesson']
E['silent-deck-burst-observation']['lesson']='观察：持有、建立、触发与新战/阶段、存活分账，单组件胜因未控。机制：力逐击/敏逐挡牌；能力须实建并活到触发，新战重建。搭配：费用/过牌/存活同核，未建或计划未取得不计。决定胜负的战斗：61支持局，A8一/A9三/A10二十二局、低阶仅背景（n=61）。典型案例：L704TLETMZBM A10蟹九轮428胜，实验体仅183/636、未进第三段；BVF22RSFVBS9终24张四打击五防御、三升级牌，无步法/后空翻。仪式兽T1建毒雾、七轮扣262胜；三虫末T1七能建触媒，前三轮仅36/180，毒雾T5才建且无后续补毒。开局资源与前战过关不等于新群战已启动。'
for clause in re.split(r'[。；]',olddeck):
 if '药' in clause and clause not in E['silent-deck-burst-observation']['lesson']:E['silent-deck-burst-observation']['lesson']+=' '+clause+'。'
beetle=E['silent-slumbering-beetle-wake-growth']
beetle['lesson']='熟睡甲虫睡层消失后恢复攻击并连续成长，直接失血唤醒时的当轮眩晕不等于后续停攻。机制：已见睡层3随回合下降，A6/A7两局失血唤醒当轮眩晕、随后覆甲消失；滚动基础按进阶读{@7:DMG:SLUMBERING_BEETLE:ROLL_OUT_MOVE}/{@10:DMG:SLUMBERING_BEETLE:ROLL_OUT_MOVE}再加现场力/修正虚弱。A0–A7实见16，A9/A10实见18。搭配：实伤/毒改变醒来窗口，格挡、虚弱、临时减力分轮核，不规定击杀顺序。决定胜负的战斗：11局11房9活2死，机制与胜因分账（n=11）。典型案例：3KME36ADUE4U A7重打T1失血唤醒眩晕，T2攻击16、T5力6为22；BVF22RSFVBS9 A10末T4睡/覆甲消失仍16当前挡，回响只少7挡；醒后滚动18，T5力2弱后15杀4血0挡，第3次T6力4无弱22。新场4次0赢、先杀石虫均败，未实打先丝/先甲虫胜线；前3次判死未结算不认实死。'
beast=E['silent-ceremonial-beast-threshold-growth-sl']
beast['lesson']=beast['lesson'].replace('12局12房9活3死','13局13房10活3死')+' BVF22RSFVBS9 A10首试63→19七轮扣262胜，T4直10后176/24毒，实扣47到129跨160、4力与横冲清、31血零损；后段T6仍损12。首胜不增加4场20次1赢重打分母。'
stone=M['stone'];newid='silent-bowlbug-rock-full-block-stun'
lesson=f'盛碗虫（石）的失衡已见：自身攻击被完整格挡后下一轮眩晕，即使玩家还被另一敌人打掉血。机制：仅核有IMBALANCED_POWER1、实际结束且石虫存活的完整挡窗口；{stone["windows"]}窗口均见下轮STUNNED，不要求整轮零损，零攻击/毒杀/被动新增挡等其他条件未据此推断。搭配：现场格挡与虚弱/临时减力能改变该次攻击的覆盖，其他敌仍另计。决定胜负的战斗：{stone["n"]}支持局、0反例，局部机制非整场必胜（n={stone["n"]}）。典型案例：LRN0HPZ0FZS1 A0 F20 T1总挡13盖石虫11，卵虫仍打掉5、T2石虫眩晕；BVF22RSFVBS9 A10末F23 T1挡19盖12、T3挡10盖尖啸后的8，分别T2/T4眩晕，但T4甲虫/丝虫合23穿11挡损12，T5仍死。'
X['entries'].append(dict(id=newid,scope='hallway:BOWLBUG_ROCK',asc=[0,20],lesson=lesson,evidence=stone['supports'],n_support=stone['n'],n_contradict=0,confidence='high',last_seen=stamp,status='active'))
E[newid]=X['entries'][-1]
X['version']=stamp+'.29'
X['_about']=f'静默猎手独立经验库，仅本角色复盘/日志。截至{A["cutoff"]}共66完局，A0—A10各7/3/2/1/4/1/11/7/1/3/26局，1040战斗房56实死；旧65局七数组/血档/源节点/回血/SL逐行重算，新BVF22RSFVBS9，MCCK2602T1SR仅进数字。净损＝首COMBAT帧HP−同房最终末结算HP，回复分来源、负值保留、实死另计，Monster/Unknown分开，判死未派发不补损/死。新增石虫完整挡后眩晕，回查历史32局；毒组件实际启动、力敏与临时减力、SL血价、路线/营火/构筑分账；死亡战无玩家力敏，不补未取得步法，无新用药规则。'
def stats(x):
 es=[e for e in x['entries'] if e['status']=='active'];v=dict(active=len(es),chars=sum(len(e['lesson']) for e in es),confidence=dict(collections.Counter(e['confidence'] for e in es)))
 for a in [8,9,10]:
  rows=[e for e in es if e['asc'][0]<=a<=e['asc'][1]];v[f'A{a}']=dict(entries=len(rows),chars=sum(len(e['lesson']) for e in rows))
 return v
for c,ident in [('NOXIOUS_FUMES','silent-noxious-fumes-growth'),('ACCELERANT','silent-accelerant-triggers'),('BUBBLE_BUBBLE','silent-bubble-bubble-condition'),('DEADLY_POISON','silent-deadly-poison-application'),('POISONED_STAB','silent-poisoned-stab-components'),('PIERCING_WAIL','silent-piercing-wail-temporary-strength')]:
 assert set(E[ident]['evidence'])<=set(M['played'][c]),(c,set(E[ident]['evidence'])-set(M['played'][c]))
for old in B['entries']:
 e=E[old['id']]
 if old['scope'].startswith('potion:') or old['scope']=='general:potion':assert e==old
 for clause in re.split(r'[。；]',old['lesson']):
  if '药' in clause:assert clause in e['lesson'],(old['id'],clause)
for e in X['entries']:
 assert e['n_support']==len(set(e['evidence']))==len(e['evidence'])
 assert e['n_contradict']==len(e.get('contradicting',[]))
 assert all(len(r)==12 and R[r]['character'].lower()=='silent' for r in e['evidence']+e.get('contradicting',[]))
 assert e['scope'].split(':')[0] in ['boss','elite','hallway','act','general','card','relic','potion','event']
 assert not e['scope'].split(':')[0] in ['card','relic','potion','event'] or e.get('name')
assert (len(A['fights']),sum(f['death'] for f in A['fights']))==(1040,56)
assert stats(X)['chars']<=60000
changes=dict(version_before=B['version'],version_after=X['version'],added=[newid],updated=updated,retired=[],evidence_updated=len(updated),numbers_only=0,before=stats(B),after=stats(X),details=[dict(id=i,n_before=next(e['n_support'] for e in B['entries'] if e['id']==i),n_after=E[i]['n_support'],chars_before=len(next(e['lesson'] for e in B['entries'] if e['id']==i)),chars_after=len(E[i]['lesson'])) for i in updated])
M['entries']={i:dict(scope=E[i]['scope'],supports=E[i]['evidence'],contradicting=E[i].get('contradicting',[]),n=E[i]['n_support'],counter=E[i]['n_contradict'],asc=dict(collections.Counter(R[r]['ascension'] for r in E[i]['evidence']))) for i in updated+[newid]}
(O/'mechanisms.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2)+'\n')
P.write_text(json.dumps(X,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(changes,ensure_ascii=False))
