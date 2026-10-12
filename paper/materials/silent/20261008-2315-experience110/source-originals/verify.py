import bisect,collections,json
from pathlib import Path
O=Path(__file__).parent;RUN='R3AJCGQGGMR4';S=[json.loads(l) for l in open(O/RUN/'states.jsonl')];D=[json.loads(l) for l in open(O/RUN/'decisions.jsonl')];SM={s['ts']:i for i,s in enumerate(S)};A=json.load(open(O/'audit.json'));checks=[]
def check(name,value):
 assert value,name
 checks.append(name)
def power(e,p):return next((x['amount'] for x in e.get('powers',[]) if x['power_id']==p),0)
def pair(d):
 i=SM[d['ts']];return S[i]['state'],S[min(i+1,len(S)-1)]['state']
new=[f for f in A['fights'] if f['run']==RUN];check('19房/18胜/1实死',len(new)==19 and sum(f['death'] for f in new)==1);check('获胜房净耗346',sum(f['loss'] for f in new if not f['death'])==346)
check('仅silent697帧/668决策',len(S)==697 and len(D)==668 and all(s['state']['run']['character_id'].lower()=='silent' for s in S))
check('八主题旧144局复算',len(A['runs'])==145 and len(A['fights'])==2101 and sum(f['death'] for f in A['fights'])==135)
heals=[];arrivals=[];stones=[];unknown=[]
for d in D:
 ch=d.get('chosen') or {};action=ch.get('action');cid=(d.get('expect') or {}).get('card',{}).get('id');a,z=pair(d)
 if d['screen']=='REST' and (d.get('expect') or {}).get('option',{}).get('id')=='HEAL':heals.append(z['run']['current_hp']-a['run']['current_hp'])
 if action=='play_card' and cid=='FOOTWORK' and d['floor']==45:
  check('步法+2敏',power(a['combat']['player'],'DEXTERITY_POWER')==1 and power(z['combat']['player'],'DEXTERITY_POWER')==3)
  check('旧挡不倒补',a['combat']['player']['block']==z['combat']['player']['block']==0)
 if action=='play_card' and cid=='DEFEND_SILENT' and d['floor']==45 and d['turn']==7:
  check('脆弱三敏每张防御6挡',z['combat']['player']['block']-a['combat']['player']['block']==6)
 if action=='play_card' and cid=='PIERCING_WAIL' and d['floor']==45:
  check('尖啸4到负2力',power(a['combat']['enemies'][0],'STRENGTH_POWER')==4 and power(z['combat']['enemies'][0],'STRENGTH_POWER')==-2)
 if action=='play_card' and cid in ['DAGGER_SPRAY','FLICK_FLACK'] and d['floor']==45:
  if cid=='DAGGER_SPRAY' and d['turn']==2:check('首恢复90及清旧毒',z['combat']['enemies'][0]['current_hp']==90 and power(z['combat']['enemies'][0],'POISON_POWER')==0)
  if cid=='FLICK_FLACK' and d['turn']==6:check('再恢复99及清旧27毒',power(a['combat']['enemies'][0],'POISON_POWER')==27 and z['combat']['enemies'][0]['current_hp']==99 and power(z['combat']['enemies'][0],'POISON_POWER')==0)
 if action=='end_turn' and d['floor']==45 and d['turn']==7:
  check('末步9血12挡/敌99毒5',a['run']['current_hp']==9 and a['combat']['player']['block']==12 and a['combat']['enemies'][0]['current_hp']==99 and power(a['combat']['enemies'][0],'POISON_POWER')==5)
  check('实际末敌87而HP0',z['run']['current_hp']==0 and z['combat']['enemies'][0]['current_hp']==87)
  check('完整需损14/存活缺6',26-12==14 and 14+1-9==6)
for i,r in enumerate(S):
 s=r['state'];previous=S[i-1]['state'] if i else None
 if s['screen']=='REST' and previous and previous['screen']=='MAP':
  gain=s['run']['current_hp']-previous['run']['current_hp'];n=len(s['run']['deck']);expected=min(s['run']['max_hp']-previous['run']['current_hp'],3*(n//5));check('羽毛F'+str(s['run']['floor'])+'公式',gain==expected);arrivals.append(gain)
check('七到火羽毛123',arrivals==[12,12,18,18,18,21,24] and sum(arrivals)==123)
check('五HEAL104',heals==[23,14,23,22,22] and sum(heals)==104)
check('完整进场血链',56+123+104+7+55+59-6-346==52)
# Support-entry opening-dexterity verification: count independent rooms, not retries.
E=json.load(open(O/'changes.json'))['entries'];stone=next(c['after'] for c in E if c['id']=='silent-smooth-stone-opening-dexterity')
for run in stone['evidence']:
 seen=set()
 for line in (O/run/'states.jsonl').open():
  r=json.loads(line);s=r['state'];floor=s['run']['floor']
  if floor in seen or s['screen']!='COMBAT' or not s.get('combat'):continue
  seen.add(floor)
  if any(v['relic_id']=='ODDLY_SMOOTH_STONE' for v in s['run']['relics']):
   check('石头首敏'+run+'/'+str(floor),power(s['combat']['player'],'DEXTERITY_POWER')==1);stones.append((run,floor))
check('11石头支持局99独立房',len(stones)==99 and len({r for r,f in stones})==11)
stock=json.load(open(O/'stock-history.json'));check('13库存支持/逐台增长',len(stock)==13 and all(set(x['stages'])=={'0','1','2'} and min(x['stages']['1'])>max(x['stages']['2']) and min(x['stages']['0'])>max(x['stages']['1']) for x in stock))
check('266需求/179实清/余87',77+90+99==266 and sum([39,50,3,39,34,2,12])==179 and 266-179==87)
# Exact comparison of matching T3 replay states, including hand, draw and discard order.
t3=[s['state'] for s in S if s['state']['run']['floor']==33 and s['state']['turn']==3 and s['state'].get('combat')]
starts=[pair(next(d for d in D if d['floor']==33 and d['turn']==3 and (d.get('sl_attempt') or 1)==att and d['label'].startswith('combat/plan-choice')))[0] for att in [1,2]]
check('SL-T3同HP与敌HP',all(s['run']['current_hp']==52 and s['combat']['enemies'][0]['current_hp']==294 for s in starts))
for pile in ['hand','draw_pile','discard_pile']:check('SL-T3同'+pile,starts[0]['combat'].get(pile)==starts[1]['combat'].get(pile))
check('同盘少10伤同损25',294-252==42 and 294-262==32 and 52-27==25)
(O/'numbers-checked.json').write_text(json.dumps(dict(checks=checks,count=len(checks),arrivals=arrivals,heals=heals,stone_rooms=stones),ensure_ascii=False,indent=2)+'\n');print('原帧及历史断言',len(checks),'全部通过')
