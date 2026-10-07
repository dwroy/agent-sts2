import bisect,collections,json
from pathlib import Path
O=Path(__file__).parent
rows=[]
for n in json.load(open(O/'runs.json')):
 ds=[d for line in (O/n/'decisions.jsonl').open() if (d:=json.loads(line)).get('chosen',{}).get('action')=='use_potion']
 if not ds:continue
 ss=[json.loads(line) for line in (O/n/'states.jsonl').open()];stamps=[s['ts'] for s in ss];sm={s['ts']:s['state'] for s in ss}
 for d in ds:
  b=sm[d['ts']];p=next((p for p in b['run'].get('potions',[]) if p['slot']==d['chosen']['potion_slot']),{})
  if p.get('potion_id')!='CUNNING_POTION':continue
  z=ss[min(bisect.bisect_right(stamps,d['ts']),len(ss)-1)]['state'];bh=b['combat']['hand'];zh=z['combat']['hand'];slot=d['chosen']['potion_slot']
  row=dict(run=n,asc=b['run']['ascension'],floor=d['floor'],turn=d['turn'],attempt=d.get('sl_attempt') or 1,ts=d['ts'],result=d.get('result'),before=len(bh),after=len(zh),added=len(zh)-len(bh),shivs_before=sum(c['card_id']=='SHIV' for c in bh),shivs_after=sum(c['card_id']=='SHIV' for c in zh),texts=[c.get('resolved_rules_text') for c in zh if c['card_id']=='SHIV'],upgrades=[c.get('is_upgraded',c.get('upgrade_level')) for c in zh if c['card_id']=='SHIV'],potions_after=z['run']['potions'],slot=slot,hp_before=b['run']['current_hp'],hp_after=z['run']['current_hp'],energy_before=b['combat']['player']['energy'],energy_after=z['combat']['player']['energy'],powers=b['combat']['player']['powers'])
  rows.append(row)
support=sorted({r['run'] for r in rows if r['added']==min(3,10-r['before']) and r['shivs_after']-r['shivs_before']==r['added']});bad=[r for r in rows if r['added']!=min(3,10-r['before']) or r['shivs_after']-r['shivs_before']!=r['added']]
(O/'cunning-history.json').write_text(json.dumps(dict(cases=rows,support=support,contradicting=sorted({r['run'] for r in bad}),unexplained=bad),ensure_ascii=False,indent=2)+'\n')
print('已饮用局/次数',len(support),len(rows),'未解释',len(bad),'进阶',dict(collections.Counter(r['asc'] for r in rows)))
