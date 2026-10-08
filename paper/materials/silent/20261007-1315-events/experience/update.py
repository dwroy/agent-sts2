import collections,json,re
from pathlib import Path
O=Path(__file__).parent;P=Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json')
B=json.load(open(O/'experience-before.json'));E=json.loads(json.dumps(B));by={x['id']:x for x in E['entries']};R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};N='W7BHM8U02RKG';A=json.load(open(O/'audit.json'));rest=json.load(open(O/'rest-summary.json'))[-1]
assert B['version']=='2026-10-07.17' and len(R)==90
assert all(x['identical'] for x in json.load(open(O/'baseline-check.json')).values())
lessons={
'silent-strength-weak-observation':'力量逐击影响攻击，敏捷逐张影响卡牌挡，已施毒与被动挡分别核。机制：临时减力次轮撤回，独立吸取/成长继续；负力量不削技能施毒。搭配：段数、现场力敏、当前来袭与生存轮数一起算。决定胜负的战斗：{n}支持局，各子公式不共用独立实验分母（n={n}）。典型案例：W7BHM8U02RKG A10族母T7吸取令玩家力/敏各−2、敌力+2，后防御5→3、扫腿11→9、打击6→4；T9蛇咬仍加7毒，18攻对2血3挡差13。MCT1GPTL8D35沙虫T6减力3→−3且有弱，两击总18→8，次轮恢复3力、攻25。',
'silent-accelerant-triggers':'触媒增加毒结算次数，不倍增毒层；普通/升级建1/2，可叠，自身不施毒。机制：k层至多k+1次，每次减1、零停止；k=1且p≥2合2p−1，k=2且p≥3合3p−3，实伤受剩血/阶段限制。搭配：先核实际建立、毒层及生存窗口，未来毒不预支。决定胜负的战斗：{n}支持局，单能力整战胜因未控（n={n}）。典型案例：W7BHM8U02RKG A10族母首T4普通1层将13毒结算13+12=25，两切割合37；第三T4同7毒且有触媒扣13、全轮25，末次同盘撤触媒只扣7、全轮19，均损15；六次0赢。2Y27VAYZDA02 F21次轮5毒杀5血取消26攻击。',
'silent-piercing-wail-temporary-strength':'尖啸临时减力须核当前攻击，次轮恢复后重新算。机制：普通/升级减6/8，逐击计力量及虚弱；独立成长/吸取另核。搭配：段数放大当轮减伤，当前挡及后轮威胁分账。决定胜负的战斗：{n}支持局，当轮有效不保证整战胜（n={n}）。典型案例：W7BHM8U02RKG A10族母第三至末次T4敌力0→−6，21单击→15、实际损15；T5力恢复0，20双击不能沿用减力，T7又吸取加2力。MCT1GPTL8D35沙虫T6有弱时两击18→8省10，次轮恢复3力、25攻穿4挡损21。',
'silent-snakebite-retained-poison':'蛇咬保留并施毒，不即时扣本体血，施毒不吃负力量。机制：普通/升级实加7/10毒，已见普通基础2费；免费个例来源不外推。毒按现层结算后减1，触媒/剩血/敌限制另核。搭配：保留只允许到手后等待，能量与可活结算窗口共同验收。决定胜负的战斗：{n}支持局，单卡整战胜因未控（n={n}）。典型案例：W7BHM8U02RKG A10族母末T9玩家−2力仍花2能量使毒1→8，施放本身不扣179本体血，后触媒结算8+7=15；六次0赢，余6毒未再兑现。KAY522KT5NXR A0 F14牌面0费加7毒，25血施放不变、结束18余6，F15实花2费。',
'silent-bread-energy-timing':'面包首轮失去2能量、后轮增加1，额外开场来源须分算，后轮收益不预支。机制：基础max_energy=3，普通首轮实1、后轮实4；古茶具在休息后的下一战额外开场能量，实际时序分别核。搭配：当前可支能量决定能力建立窗口，首牌重放机会独立，不由后轮增能恢复。决定胜负的战斗：{n}支持局，无同条件无面包整战胜负对照（n={n}）。典型案例：W7BHM8U02RKG A10 F14/F15首轮各1；F16回血后族母持古茶具首轮实3、后轮4，六次败，不能把首轮3当面包恒定增能。6EV5V6PJJS9D A6 F39首轮1费毒刺+重放，余像未建，后轮各4仍T4死。',
'silent-deck-burst-observation':'观察：持有、计划与已建立能力分账，开场资源不等持续攻防。机制：能力须施放建立后才触发，生存窗口限制毒和格挡兑现；新战与阶段另核。搭配：当前剩血、来袭、到手/费用共同验收，未来回复不预支。决定胜负的战斗：{n}支持局，替构筑和单能力胜因未控（n={n}）。典型案例：W7BHM8U02RKG A10计划沉睡期建立能力，六次族母T1扫腿→中和、T2结束，触媒至T4或T8才建立；末九轮毒42+直接40=82/233，余151，末2血3挡对18差13。MCT1GPTL8D35沙虫胜试未建跟踪，史莱姆四试未建毒雾，持有不当持续收益。',
'silent-lagavulin-siphon-poison-sl':'族母吸取压缩直伤/牌挡，已建立毒依现场层数结算；同抽序不补血量和输出。机制：每次玩家力/敏各−2、敌力+2，负力不减技能施毒；尖啸减力次轮恢复，毒须实结算。搭配：实际建立能力、可活轮数与来袭共同核，沉睡计划不当已执行。决定胜负的战斗：{n}支持局；真正重打5场30次1赢，单组件胜因未控（n={n}）。典型案例：W7BHM8U02RKG A10六次24/70、前21项抽序/到手轮同；第三至末次T4首盘相同，撤触媒少6毒伤、实损15相同，末T9毒42+直接40仅扣82，敌余151、18攻对2血3挡差13；五次判死读档不当五次实死。NB8KCF6HRGVF A10负力下毒183+行动50=233首试胜。',
}
fights10=[x for x in A['fights'] if x['asc']==10]
bands=[x for x in A['bands'] if x['asc']==10 and x['act']==1 and x['type']=='Monster' and x['n']]
bandtext='；'.join(f'{x["band"]}{x["n"]}房/{x["runs"]}局、死{x["deaths"]}={x["deaths"]/x["n"]:.2%}、活损中位{x["median_win"]}' for x in bands)
lessons['silent-route-hp-observation']=f'观察：改线投影与实际血量分账，问号、商店和未来营火不保证下一战安全。截至90静默局，A10 50局{len(fights10)}战房{sum(x["death"] for x in fights10)}实死；一幕Monster按入血：{bandtext}。敌人/构筑混杂，不立血线或改线因果。典型案例：W7BHM8U02RKG A10 F11改商店线投影F16有23血、实1；boss投影44、实际进房22/开场24，面包/古茶具与遗物回复另算。未走原营火线F16投影44无实到对照（n=90）。'
lessons['silent-rest-buffer-observation']=f'观察：回血增加实有缓冲，不保证后战胜，未执行锻造不作因果对照。A8一局9火8回血回111、后战7/0死；A9三局21火16回血回341、后战15/1死；A10 50局{rest["rests"]}火{rest["heal"]}回血/{rest["smith"]}非回血动作、实回{sum(rest["gains"])}，去重后战{rest["nexts"]}/{rest["deaths"]}死={rest["deaths"]/rest["nexts"]:.2%}、活损中位{rest["median"]}。典型案例：W7BHM8U02RKG A10三火均回血共63，F16从1→22、开场小血瓶22→24后族母六试败；回复不是持续挡，未选锻造的整场结果未知（n=90）。'
changes=[]
for eid,lesson in lessons.items():
 e=by[eid];old=e['lesson'];drugs=[s for s in re.split(r'(?<=[。！？])',old) if '药' in s]
 e['lesson']=lesson.replace('{n}',str(e['n_support']+1))+''.join(drugs)
 assert N not in e['evidence'];e['evidence'].append(N);e['n_support']=len(e['evidence']);e['last_seen']='2026-10-07'
 e['confidence']='high' if e['n_support']>=5 and e['n_contradict']<=e['n_support']/3 else 'med' if e['n_support']>=2 else 'low'
 changes.append(dict(id=eid,runs=[N],n_before=e['n_support']-1,n_after=e['n_support'],chars_before=len(old),chars_after=len(e['lesson']),preserved_potion_sentences=drugs))
E['version']='2026-10-07.18';E['_about']='静默经验只来自本角色复盘与日志。第72次增量截至W7BHM8U02RKG结束2026-10-07T03:43:58.061Z，90完局；旧89局七数组/血档/源节点/回血/SL逐行复算一致。补普通触媒多次毒结算、尖啸临时减力、蛇咬负力量施毒、族母吸取与同盘SL、面包/古茶具时序及路线/休息/构筑观察。局部机制与整战因果分账，未建立能力/未来回复不预支；无新用药规则。'
for e in E['entries']:
 assert e['n_support']==len(set(e['evidence'])) and e['n_contradict']==len(set(e.get('contradicting',[])))
 assert all(len(r)==12 and R[r]['character'].lower()=='silent' for r in e['evidence']+e.get('contradicting',[]))
 old=next(x for x in B['entries'] if x['id']==e['id'])
 if e['scope'].startswith('potion:') or e['scope']=='general:potion':assert e==old
 assert all(s in e['lesson'] for s in re.split(r'(?<=[。！？])',old['lesson']) if '药' in s)
active=[e for e in E['entries'] if e['status']=='active'];chars=sum(len(e['lesson']) for e in active);assert chars<=60000
P.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
C=dict(old_version=B['version'],version=E['version'],added=[],updated=list(lessons),retired=[],old_active=139,active=len(active),old_chars=sum(len(e['lesson']) for e in B['entries'] if e['status']=='active'),chars=chars,confidence=dict(collections.Counter(e['confidence'] for e in active)),applicable={str(a):dict(entries=len([e for e in active if e['asc'][0]<=a<=e['asc'][1]]),chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]},diff=changes)
(O/'changes.json').write_text(json.dumps(C,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in C.items() if k!='diff'},ensure_ascii=False))
