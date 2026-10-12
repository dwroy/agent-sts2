import json,collections,datetime
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-141302-postmortem');run='H1T1F8ML9FUE'
def rows(name):return [json.loads(x) for x in (p/f'{run}-{name}.jsonl').open()]
d=rows('decisions');s=rows('states');b=rows('brain');j=rows('jev-prompts');resources=json.load((p/f'{run}-resources.json').open())
with (p/'decisions-compact.txt').open('w') as o:
    for r in d:
        if r['floor']<33 and r['decider']!='codex' and not any(k in r['label'] for k in ['potion','sl_','guard']):continue
        ans=r.get('answers',r.get('answer'))
        o.write(f"d{r['_line']} F{r['floor']} T{r['turn']} a{r.get('sl_attempt')} {r['label']} {r['decider']} {r.get('chosen')} conf={r.get('confidence')} ans={ans} {r.get('rationale')} extra="+json.dumps({k:v for k,v in r.items() if any(t in k for t in ['rollout','guard','explore','rank'])},ensure_ascii=False)+'\n')
with (p/'states-compact.txt').open('w') as o:
    for r in s:
        v=r['state'];c=v.get('combat') or {};pl=c.get('player') or {};rr=v['run']
        if v.get('turn') is None and not v.get('in_combat'):continue
        o.write(f"s{r['_line']} {r['ts']} F{rr['floor']} T{v.get('turn')} {v['screen']} hp={rr['current_hp']}/{rr['max_hp']} B={pl.get('block')} E={pl.get('energy')} powers="+str([(x['power_id'],x['amount']) for x in pl.get('powers',[])])+ ' enemies='+str([(x['enemy_id'],x['current_hp'],x.get('block'),x.get('intent'),[(z['power_id'],z['amount']) for z in x.get('powers',[])],[(z.get('damage'),z.get('hits')) for z in x.get('intents',[])]) for x in c.get('enemies',[])])+' hand='+str([(x['index'],x['card_id']+('+' if x['upgraded'] else ''),x.get('energy_cost'),x['playable'],x.get('resolved_rules_text')) for x in c.get('hand',[])])+'\n')
with (p/'brain-compact.txt').open('w') as o:
    for r in b:
        o.write(f"brain{r['_line']} {r['label']} {r['engine']} {r['ts']} accepted={r.get('accepted')} usage={r['usage']} answer={r['answer']}\n")
with (p/'resources-compact.txt').open('w') as o:
    for c in resources['combats']:
        e=c['entry'];x=c['exit'];l=c['last'];o.write(f"#{c['sequence']} F{c['floor']} {c['enemies']} {e['hp']}/{e['max_hp']}->{x['hp'] if x else None}/{x['max_hp'] if x else None} last{l['hp']} T{l['turn']} {e['potions']}->{(x or l)['potions']} s{e['line']}->{x['line'] if x else l['line']} {e['ts']}->{(x or l)['ts']} {c['end']}\n")
    o.write('CHANGES\n')
    for c in resources['resource_changes']:
        a,z=c['from'],c['to'];o.write(f"s{a['line']}->{z['line']} {z['ts']} F{z['floor']}T{z['turn']} {z['screen']} hp {a['hp']}/{a['max_hp']}->{z['hp']}/{z['max_hp']} pot {a['potions']}->{z['potions']} fight={c['combat_sequence']} restart={c['restart_boundary']}\n")
jev=[r for r in d if r['decider']=='jev'];plans=[r for r in jev if r['label'].startswith('combat/plan-choice')]
print('jev',len(jev),'low',[(r['_line'],r['floor'],r['turn'],r.get('confidence')) for r in jev if isinstance(r.get('confidence'),(float,int)) and r['confidence']<.35]);print('jev plan schema',plans[-1].keys());print('last answer',plans[-1].get('answers',plans[-1].get('answer')));print('last extra', {k:v for k,v in plans[-1].items() if k not in ['fingerprint','questions','rationale','journal','expect','chosen']})
print('usage brain',dict(collections.Counter({k:sum(r.get('usage',{}).get(k,0) or 0 for r in b) for k in b[0]['usage']})));print('usage decision',sum(r.get('usage',{}).get('input_tokens',0) for r in d),sum(r.get('usage',{}).get('output_tokens',0) for r in d));print('elapsed', (datetime.datetime.fromisoformat(d[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(d[0]['ts'].replace('Z','+00:00'))).total_seconds())
print('sl details')
for r in rows('sl-attempts'):print(r['_line'],r['floor'],r['attempt'],r['result'],str(r.get('death',r.get('judge')))[:1000],r.keys())
