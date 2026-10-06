import json,collections,re,pathlib
O=pathlib.Path(__file__).parent;P=pathlib.Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json')
B=json.load(open(O/'experience-before.json'));E=json.loads(json.dumps(B));old={e['id']:e for e in B['entries']};by={e['id']:e for e in E['entries']}
NEW=['87LCSDR5P3DL','TKXQ6L4N9A6U'];A=json.load(open(O/'audit.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
changed=[]
def update(eid,runs,lesson=None,extra=None):
 e=by[eid];n=e['n_support'];e['evidence']=list(dict.fromkeys(e['evidence']+runs));e['n_support']=len(e['evidence'])
 if lesson:e['lesson']=lesson.format(n=e['n_support'])
 else:
  e['lesson']=e['lesson'].replace(str(n)+'支持局',str(e['n_support'])+'支持局').replace('n='+str(n)+')','n='+str(e['n_support'])+')').replace('n='+str(n)+'）','n='+str(e['n_support'])+'）')
 if extra:e['lesson']+=' '+extra
 e['last_seen']='2026-10-07';changed.append(eid)
update('silent-footwork-block',NEW,'步法普通/升级建2/3敏捷，逐挡牌兑现，不追补已有挡。机制：基础挡加现场敏捷，再逐牌核脆弱；被动挡另算。搭配：多张挡牌重复获益，能力须先支付。决定胜负的战斗：{n}支持局，局部挡收益不等整战胜因（n={n}）。典型案例：87LCSDR5P3DL A10 F8脆弱下7挡实给5，36攻击损31；F9生存者8+2敏给10挡，18攻击仍差8。TKXQ6L4N9A6U A10 F22 T4斗篷先给6挡、后建3敏不追补；T5两防御各8合16盖虚弱后13攻零损，毒素已付费离手。')
update('silent-strength-weak-observation',NEW,extra='典型案例：87LCSDR5P3DL A10雕像T3力量10、25攻击经虚弱为18，2血10挡仍死；TKXQ6L4N9A6U A10异螨力量3→6、咬击18→21，我方无力量，打击9来自木偶，临时减力与成长另核。')
update('silent-noxious-fumes-growth',NEW,extra='典型案例：87LCSDR5P3DL A10雕像T3才建2层、死亡前无下一轮补毒；TKXQ6L4N9A6U A10异螨T1建3层，T2毒3/6、T3为5/8，已结算减1后再补3；末11/14毒因玩家先死未结算。')
update('silent-piercing-wail-temporary-strength',[NEW[1]],extra='典型案例：TKXQ6L4N9A6U A10异螨T2两敌力0/3→−6/−3，首只15攻→9，5挡后损4；另一只当轮塞状态。T3恢复0/3力、来袭6+18，10挡仍损14，减力只兑现当轮。')
update('silent-giant-explosion-window',[NEW[1]],'巨兽本体归零后仍须承受自爆，击杀时点与当轮血挡共同验收。机制：蒸汽/现场自爆分核，不定成长公式；血{@2:HP:WATERFALL_GIANT}，残壳999999999不计新需伤。搭配：本体毒伤、残壳攻击、实际挡和回复分账。决定胜负的战斗：{n}支持局，重打变化未隔离单因（n={n}）。典型案例：TKXQ6L4N9A6U A10 F17本体250、回血两次各15，实际伤280/净扣250；T10毒27按剩18截断杀本体，T11自爆44经中和变33，冲刺10挡后48→25、损23过关；整战79→25损54，击杀本体不等已经获胜。'.replace('{@2:HP:WATERFALL_GIANT}','{{@2:HP:WATERFALL_GIANT}}'))
update('silent-route-hp-observation',NEW,'观察：首COMBAT→同房末结算净损，回复/实死分账，问号不算Monster，不定安全线。80静默局1233房70死；A8一局25/0死、A9三局48/2死、A10四十局519房40死。A10一幕≥60%精英30房24局1死=3.33%、活损中位25；<25%仅1房1死。典型案例：87LCSDR5P3DL F7回21到44、下走廊损42，仅2血进雕像；TKXQ6L4N9A6U F20回25满81后问号地道虫损54，改线承诺F24营火未抵、F22问号27血死，不判未走线优劣因果（n={n}）。')
update('silent-rest-buffer-observation',NEW,'观察：实际回复增加血池，未来火与模拟优势不预支。A8一局9火8回血回111、后战7/0死；A9三局21火16回血回341、后战15/1死；A10四十局235火162回血/73非回血动作回3964，去重后战154/20死=12.99%、活损中位25.5。典型案例：87LCSDR5P3DL F7回21后下一战损42；TKXQ6L4N9A6U三火回血22/22/24合68、F11升级不回血，F20事件另回25、随后问号损54，二幕营火未达。无未选锻造或改线的受控整场结果（n={n}）。')
update('silent-deck-burst-observation',NEW,'观察：取得、支付、触发、穿挡、足额输出分别核，单轮优势不等整战胜因。机制：能力须实际建立，未建敏捷/触媒/滚石/群蛇不预支。搭配：费用、抽牌、建立轮与实际可活轮共同验收。决定胜负的战斗：{n}支持局，缺单组件整战对照（n={n}）。典型案例：87LCSDR5P3DL A10终20张、十基础牌两负担、无升级，毒雾雕像T3晚建没有下一轮补毒；TKXQ6L4N9A6U A10终28张四升级，群蛇取得后F19/F21/F22三战施放0，未来逐牌6伤贡献0。已建3敏T5双防御16挡零损，T6留毒素先死，不能由未建群蛇认定早建必胜。')
support=json.load(open(O/'mechanism-supports.json'))['TOXIC'];n=len(support)
e=dict(id='silent-toxic-paid-exhaust-end-turn-loss',scope='card:TOXIC',name='毒素',asc=[0,20],lesson=f'毒素可付1能量离手，留手末回合每张5伤；毒杀不免除已经发生的持牌伤。机制：已见消耗，持牌伤可用挡抵扣，两张0挡需10；玩家先死时后续敌毒不结算，不外推其他状态牌。搭配：实际剩能量、手牌、格挡与毒结算顺序分核，不设固定出牌优先级。决定胜负的战斗：17支持局，16局共51次付费分帧，末伤/先死顺序另由CSBR与TKX核，整战替线胜因未控（n={n}）。典型案例：T082DRCUHRRD A0 F25 T2能量5→4→3，两毒素离手；CSBR5CRDWQNB A2 F29 T2一张5伤被2挡扣成3、T3两张0挡损10后毒杀获胜；TKXQ6L4N9A6U A10 F22 T6两张留手、7血0挡先归零，敌6/1血与11/14毒原样未结算。',evidence=support,n_support=n,n_contradict=0,confidence='high',last_seen='2026-10-07',status='active')
assert e['id'] not in by;E['entries'].append(e)
E['version']='2026-10-07.10';E['_about']='静默经验只来自本角色复盘与日志。第64次增量截至TKXQ6L4N9A6U结束2026-10-06T22:36:13.588Z，80完局；旧78局七数组及血档/节点/回血/SL逐行复算一致。新16房2实死、总1233房70死。毒素付费离手/持牌伤先于毒、敏捷逐牌/脆弱、毒雾实际轮初、临时减力/敌成长、巨兽本体和自爆分核；未执行群蛇/路线不预支，无新用药规则。'
for e in E['entries']:
 assert e['n_support']==len(set(e['evidence']))
 assert all(len(r)==12 and r in R for r in e['evidence']+e.get('contradicting',[]))
 if e['id'] in changed or e['id']=='silent-toxic-paid-exhaust-end-turn-loss':
  assert e['n_contradict']==len(e.get('contradicting',[]))
  n=e['n_support'];c=e['n_contradict'];e['confidence']='high' if n>=5 and c<=n/3 or n>=4 and not c else 'med' if n>=2 else 'low'
for eid,e in old.items():
 if e['scope'].startswith('potion:') or e['scope']=='general:potion':assert e==by[eid]
 for part in re.findall(r'[^。！？]*[。！？]',e['lesson']):
  if '药' in part:assert part in by[eid]['lesson'],(eid,part)
active=[e for e in E['entries'] if e['status']=='active'];assert sum(len(e['lesson']) for e in active)<=60000
P.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
C=dict(added=['silent-toxic-paid-exhaust-end-turn-loss'],updated=changed,retired=[],active_before=135,active_after=len(active),chars_before=sum(len(e['lesson']) for e in B['entries'] if e['status']=='active'),chars_after=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),by_asc={str(a):dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in active),chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]},details=[dict(id=eid,n_before=old[eid]['n_support'],n_after=by[eid]['n_support'],chars_before=len(old[eid]['lesson']),chars_after=len(by[eid]['lesson'])) for eid in changed])
(O/'changes.json').write_text(json.dumps(C,ensure_ascii=False,indent=2)+'\n');print(json.dumps(C,ensure_ascii=False))
