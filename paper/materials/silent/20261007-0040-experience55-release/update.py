import json,re,collections
from pathlib import Path
O=Path(__file__).parent;P=Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json');RUN='ZVYUL2YP3518'
old=json.load(open(O/'experience-before.json'));d=json.load(open(P));es={e['id']:e for e in d['entries']};A=json.load(open(O/'audit.json'));M=json.load(open(O/'mechanisms.json'));rests=json.load(open(O/'rest-summary.json'));R={r['run_id']:r for r in json.load(open(O/RUN/'completed-runs.json'))}
append={
'silent-footwork-block':'ZVYUL2YP3518 A10末T1石头1敏加步法3至4而旧17挡不补；T5偏折8/后空翻9/生存者12比零敏多12，T8两斗篷各10多8、钗7合27仍13血对55差15。',
'silent-strength-weak-observation':'ZVYUL2YP3518 A10无玩家正力；激怒3使末T5四技能敌力6→18、意图42→45，总36挡未盖45，实际19毒截清29血取消攻击；T7尖啸44→20、T8恢复55，敏捷牌挡和遗物被动另核。',
'silent-deadly-poison-application':'ZVYUL2YP3518 A10雕像T3毒药+与尖啸/毒雾替代线实际8伤/19损；实验体换阶段清旧毒，重新施毒与毒雾补量分列，不能预支首段毒。',
'silent-noxious-fumes-growth':'ZVYUL2YP3518 A10末T3建3、首段T5旧19毒随阶段清除，能力留；新段T6/7/8轮初3/4/5毒，触媒1分别扣5/7/9，补3与每次减1分账，末段仍缺124。',
'silent-accelerant-triggers':'ZVYUL2YP3518 A10末首段19毒理论37但仅扣余29，换阶段旧毒清而触媒1留；新3/4/5毒实5/7/9，三轮总伤23/23/42仍缺124/212，不能沿用首段37输出。',
'silent-sai-start-block':'ZVYUL2YP3518 A10末T1钗7加锚10起17，T2以后钗起7；T8两斗篷各10合27，13血对55差15，敏捷牌挡与钗/锚分来源。',
'silent-test-subject-phase-reset':'ZVYUL2YP3518 A10六试同50/83，五判死后恢复、末T8实死；clean40初序同、仅前7张到手轮同，生成/抽到/动作/后洗牌未控，无赢次。末T1步法/刀扇及T3毒雾/精准不加敌力，T4净化消耗贪婪仍技能令3→6；T5四技能6→18、36挡对45本不够，19毒截清29敌血取消攻击。新212段清19毒/18力/激怒，留4敏/1触媒/3毒雾/4精准/刀扇；T6—8扣23/23/42合88，第二段仍124、未进第三段。T7尖啸44→20挡22零损，T8恢复55挡27需损28、13血差15。',
'silent-piercing-wail-temporary-strength':'ZVYUL2YP3518 A10末T7敌0→−6力、11×4=44→5×4=20，挡22零损；遗忘之魂消耗另扣1，次轮力恢复、11×5=55穿27需损28而仅13血死。当轮24减伤非持续关攻。',
'silent-accuracy-shiv-scaling':'ZVYUL2YP3518 A10末T3建4、无正力，小刀4→8；T8三刀攻击24加遗忘之魂各1合27，多12攻击与3遗物伤分账，毒9另计，第二段仍缺124。',
'silent-forgotten-soul-exhaust-damage':'ZVYUL2YP3518 A10末T7尖啸消耗189→188；T8三刀文本8各实9合27=24攻击+3消耗伤，羽化消耗另1，毒9分列；仍仅单敌、不补群体分配。',
'silent-tuning-fork-skill-block':'ZVYUL2YP3518 A10末T7偏折牌面8、音叉9→10另7使挡7→22，15非全牌挡；T8未触发时钗7+两斗篷20=27，对55仍死，不跨轮预支音叉7。',
'silent-kin-poison-sl-observation':'ZVYUL2YP3518 A10本场首试70→16九轮扣324、先两信徒后神官；不是新增重打赢例，无另一顺序整战对照。',
'silent-queen-poison-main-target':'ZVYUL2YP3518 A10首试82→50十轮630，T9先聚合体/T10毒杀本体；战斗损33、芝士后回复1净32，50血直接进第二boss六败。无替顺序对照，不把前场满血当后场满血。',
'silent-eternal-feather-rest-arrival-heal':'ZVYUL2YP3518 A10八到火实回124，F47四十张42→66回24后另休息66→82回16；九火四回血共108、三锻造两添火。女王后50直接进第二boss，不预支下一个营火。',
'silent-fan-of-knives-capacity':'ZVYUL2YP3518 A10末T1建刀扇，T8生成小刀仍群伤牌文；实验体单敌三刀各8攻击+1消耗伤合27，其他伤分账，未新增多目标实伤证明。',
'silent-smooth-stone-opening-dexterity':'ZVYUL2YP3518 A10持有后的F43/44/48/49首帧均1敏；末实验体T1步法+加3至4旧挡不补，T8两斗篷各10，牌挡/遗物挡分核。',
'silent-pumpkin-candle-charge-energy':'ZVYUL2YP3518 A10实际F32添火0→5、F42正1→6，各+5而HP不变；九火其余三锻造四回血不续火，正充能仍可续加已验证，仅此数值与时点。末实验体3充能、T2能量4，六次0赢非遗物单因。',
'silent-anticipate-temporary-dexterity':'ZVYUL2YP3518 A10末T6常驻4，预判+另4到8、旧挡不补；后防御13与斗篷14及钗7合34盖33零损，T7回4。临时与永久敏捷分账，整场仍败。'
}
for ident,text in append.items():
 e=es[ident];n=e['n_support'];assert RUN not in e['evidence'];e['evidence'].append(RUN);e['n_support']=len(e['evidence']);e['confidence']='high' if e['n_support']>=5 and e['n_contradict']<=e['n_support']/3 else ('med' if e['n_support']>=2 else 'low');e['last_seen']='2026-10-06'
 e['lesson']=re.sub(r'\(n='+str(n)+r'\)',f'(n={e["n_support"]})',e['lesson'])
 for a,b in [(f'{n}支持局',f'{n+1}支持局'),(f'{n}局支持',f'{n+1}局支持'),('39局支持','40局支持'),('七支持局','8支持局'),('八局13次施放','9局实际施放')]:e['lesson']=e['lesson'].replace(a,b)
 e['lesson']+=' '+text
# Update counts that apply to named support subsets rather than all character encounters.
e=es['silent-test-subject-phase-reset'];e['lesson']=e['lesson'].replace('9局34次4赢，真正重打8场33次3赢','10局40次4赢，真正重打9场39次3赢')
e=es['silent-sai-start-block'];e['lesson']=e['lesson'].replace('本局每回合','两支持局每回合').replace('只验证此数值与时点','只验证7挡与时点')
e=es['silent-smooth-stone-opening-dexterity'];e['lesson']=e['lesson'].replace('七支持局76个','8支持局80个').replace('A10一局','A10两局')
e=es['silent-eternal-feather-rest-arrival-heal'];e['lesson']=e['lesson'].replace('六局47次','7局55次').replace('(n=6)','(n=7)')
e=es['silent-pumpkin-candle-charge-energy'];e['lesson']=e['lesson'].replace('正充能再添火未验证','正1充能添火到6已验证').replace('2支持局0反例','3支持局0反例')
e=es['silent-fan-of-knives-capacity'];e['lesson']=e['lesson'].replace('八局13次施放','9局实际施放')
bands={ (x['act'],x['type'],x['band']):x for x in A['bands'] if x['asc']==10 }
low=bands[(2,'Monster','25–40%')];hi=bands[(2,'Monster','≥60%')];r=rests[-1]
texts={
'silent-route-hp-observation':f'观察：战损/回复/最大血分账，问号战与Monster走廊分开，不定安全线。67静默局1059房57实死；A8一局25房0死、A9三局48房2死、A10二十七局345房27死，完整血档/节点见第55节。A10二幕25–40%走廊{low["n"]}房{low["runs"]}局1死={100/low["n"]:.2f}%、活损中位{low["median_win"]}；≥60%走廊{hi["n"]}房{hi["runs"]}局0死、中位{hi["median_win"]}。典型案例：ZVYUL2YP3518二幕避精英仍F22问号战56→4、F24走廊29→21含精灵复活不算实死；三幕女王82→50后直进实验体六败，未走替路线不定因果（n=67）。',
'silent-rest-buffer-observation':f'观察：已回复加血池，未来营火/前场满血不预支后场。A8一局9火8回血7非回血（帐篷双动作）回111、去重后战7/0死、中位10；A9三局21火16回血5非回血回341、后战15/1死、中位34；A10二十七局166火105回血61非回血回2448、后战98/16死={1600/98:.2f}%、活损中位24。典型案例：ZVYUL2YP3518九火四回血29/27/36/16合108、三锻造两添火；到火羽毛124另计，F47先42→66再回血至82、女王后50血进实验体败，未选升级/提前回血无对照（n=67）。',
'silent-deck-burst-observation':'观察：持有/建立/触发/阶段与新战输出分账，单组件胜因未控。机制：力逐击、敏逐挡牌，能力须实建并活到触发；新战重建、敌换段旧毒清。搭配：费用/过牌/初毒/卡牌挡/被动分核。决定胜负的战斗：62支持局、A8一/A9三/A10二十三，低阶仅背景（n=62）。典型案例：BVF22RSFVBS9 A10三虫前三轮仅36/180、毒雾T5才建；ZVYUL2YP3518终40张四打击五防御/贪婪/进阶之灾、8升级无商店移除；双boss毒雾/触媒/4敏/4精准/刀扇均建，女王十轮630胜后50血，实验体首111清、新212段三轮88仍缺124、六败未进第三段。TD1HVGS7H6LB的23张全普通/毒药T10启、PU80F84P6HPN的F6无施毒触媒至F19毒药、NB8KCF6HRGVF的23张三打击五防御/计划步法触媒未得、TCFAHJ9K19VY的24张六打击六防御/计划毒雾步法尖啸余像精准未得，皆不能预支组件。'
}
for ident,text in texts.items():
 e=es[ident];e['lesson']=text;e['evidence'].append(RUN);e['n_support']=len(e['evidence']);e['last_seen']='2026-10-06'
d['version']='2026-10-07.1';d['_about']='静默猎手独立经验库，仅本角色复盘/日志。截至2026-10-06T15:34:08.977Z共67完局，A0—A10各7/3/2/1/4/1/11/7/1/3/27局，1059战斗房57实死。旧66局七数组/全部血档/源节点/休息/SL逐行重算，新ZVYUL2YP3518及ID勘误；MCCK2602T1SR仅进数字。净损=首COMBAT帧HP−同房最终末结算HP，回复分来源/负值保留/实死另计；Monster/Unknown分开，五判死未派发不补毒/损/死。实验体技能激怒与能力、阶段清毒/能力保留、敏捷逐牌/临时敏捷、精准与消耗伤、遗物被动挡与营火回复分核；六试0赢、同抽时点仅部分可比，无单项整场因果。无新用药规则。'
es['silent-kin-poison-sl-observation']['lesson']=es['silent-kin-poison-sl-observation']['lesson'].replace('原三场18试0赢；加入S9UZAK0JP0C0后四场20试1赢','5场21试2赢，真正重打4场20试1赢')
es['silent-fan-of-knives-capacity']['lesson']=es['silent-fan-of-knives-capacity']['lesson'].replace('9局实际施放','9局20次施放')
es['silent-queen-poison-main-target']['lesson']=es['silent-queen-poison-main-target']['lesson'].replace('四首试赢','五首试赢')
def stats(f):
 act=[e for e in f['entries'] if e['status']=='active'];out=dict(active=len(act),chars=sum(len(e['lesson']) for e in act),confidence=dict(collections.Counter(e['confidence'] for e in act)))
 for asc in [8,9,10]:
  v=[e for e in act if e['asc'][0]<=asc<=e['asc'][1]];out[f'A{asc}']=dict(entries=len(v),chars=sum(len(e['lesson']) for e in v))
 return out
change=[dict(id=e['id'],before_n=o['n_support'],after_n=e['n_support'],before_chars=len(o['lesson']),after_chars=len(e['lesson']),support_added=RUN in e['evidence'] and RUN not in o['evidence']) for e,o in zip(d['entries'],old['entries']) if e!=o]
assert len(change)==21 and all(x['support_added'] for x in change)
for e,o in zip(d['entries'],old['entries']):
 assert e['evidence'][:len(o['evidence'])]==o['evidence'];assert e.get('contradicting',[])==o.get('contradicting',[]);assert e['asc']==o['asc']
 for clause in re.split(r'(?<=[。；])',o['lesson']):
  if any(w in clause for w in ['喝药','留药','药水']):assert clause in e['lesson'],(e['id'],clause)
 assert e['n_support']==len(set(e['evidence'])) and e['n_contradict']==len(e.get('contradicting',[]));assert all(R[x]['character'].lower()=='silent' for x in e['evidence']+e.get('contradicting',[]))
assert stats(d)['chars']<=60000
P.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
result=dict(added=[],updated=[x['id'] for x in change],retired=[],details=change,before=stats(old),after=stats(d));(O/'changes.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
mechanisms=[]
for ident in append:
 e=es[ident];mechanisms.append(dict(id=ident,scope=e['scope'],evidence=e['evidence'],contradicting=e.get('contradicting',[]),support=e['n_support'],counter=e['n_contradict'],asc=dict(collections.Counter(R[r]['ascension'] for r in e['evidence'])),case=append[ident]))
(O/'mechanism-entries.json').write_text(json.dumps(mechanisms,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='details'},ensure_ascii=False))
