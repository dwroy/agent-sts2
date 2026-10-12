import json,collections,re,datetime,bisect
from pathlib import Path
P=Path(__file__).parent;D=json.loads((P/'decisions.json').read_text());S=json.loads((P/'states.json').read_text());C=json.loads((P/'2H311EAD34GD-resources.json').read_text());TS=[r['ts'] for r in S]
def criteria(r,name='plan'):
 return {k:json.loads(v) for k,v in ((r.get('questions') or {}).get(name) or {}).get('criteria',{}).items()}
def before(r):return S[max(0,bisect.bisect_right(TS,r['ts'])-1)]
def selected(r):
 m=re.search(r'chose plan (\d+)/(\d+)',r.get('rationale',''));return ('plan'+m[1]) if m else None
G=[]
for r in D:
 if 'HP guard' not in r.get('rationale',''):continue
 cc=criteria(r);sel=selected(r);m=re.search(r'playing plan (\d+)',r['rationale']);target='plan'+m[1];out={'d':r['_line'],'a':r['sl_attempt'],'t':r['turn'],'before':before(r)['_line'],'chosen':r['chosen'],'expect':r.get('expect'),'original':{'key':sel,**{k:cc[sel].get(k) for k in ['plays','hp_lost','damage_dealt','rollout','boss_sim']}},'guard':{'key':target,**{k:cc[target].get(k) for k in ['plays','hp_lost','damage_dealt','rollout','boss_sim']}},'explored':'SL explore' in r['rationale']};G.append(out);print('护栏',json.dumps(out,ensure_ascii=False))
(P/'guard-audit.json').write_text(json.dumps(G,ensure_ascii=False,indent=2)+'\n')
print('药水与选择')
for r in D:
 if r['chosen'].get('action') in ['use_potion','discard_potion']:
  st=before(r);idx=r['chosen'].get('option_index');pots=st['state']['run']['potions'];v=next((v for v in pots if v['index']==idx),{})
  print(r['_line'],r['floor'],r['turn'],r['sl_attempt'],v.get('name'),v.get('potion_id'),r['chosen'],'s',st['_line'],'下一s',S[min(len(S)-1,bisect.bisect_right(TS,r['ts']))]['_line'])
print('时钟/投影')
for r in D:
 if r['label']=='rest/plan':
  cc=criteria(r,'pick');v=cc['o0'];print('休息',r['_line'],r['floor'],r.get('route_review'),v['boss_sim_hp_reference'],v['boss_sim']);print('字段',r.get('deepseek'))
print('路线',json.dumps(next(r for r in D if r['label']=='map/route-plan').get('expect'),ensure_ascii=False))
print('boss_sim字段',next(r for r in D if r['label']=='rest/plan').get('boss_sim'))
print('Jev focus')
for r in D:
 if 'focus' in (r.get('questions') or {}): print(r['_line'],r['floor'],r['turn'],r['questions']['focus'],r.get('rationale'))
root=[r for r in D if r['decider']=='code' and r['label'] in ['combat/plan','combat/lethal','combat/least-loss','combat/end_turn']];ct={(r['floor'],r['sl_attempt'] or 0,r['turn']) for r in root};jt={(r['floor'],r['sl_attempt'] or 0,r['turn']) for r in D if r['decider']=='jev'}
print('代码主动作',len(root),'涉及轮',len(ct),'独立轮',len(ct-jt),'混合',len(ct&jt),'Jev轮',len(jt));print('纯代码轮',sorted(ct-jt))
usage=collections.defaultdict(collections.Counter)
for r in D:
 if r.get('usage'): usage[r['decider']].update({k:v for k,v in r['usage'].items() if isinstance(v,(int,float))})
print('usage',dict(usage));print('首observed',D[0]['observed_ts'])
print('最终牌组',collections.Counter((x['card_id'],x['name'],x['upgraded']) for x in before(D[-1])['state']['run']['deck']))
