"""Aggregate fight-level calibration; MC seeds are not independent historical fights."""
import collections,csv,gzip,json,pathlib,statistics
D=pathlib.Path(__file__).resolve().parent
inputs={r['id']:r for r in json.load(gzip.open(D/'prepared-inputs.json.gz','rt'))}
rows=[json.loads(p.read_text()) for p in sorted((D/'replay').glob('*-fight*.json'))]
def avg(x):return statistics.mean(x) if x else None
def metric(row,variant,key):
    return row[variant].get('metrics',{}).get('metrics',{}).get(key,{}).get('mean')
def summary(rr,variant):
    usable=[r for r in rr if r[variant]['status']=='computed' and not r['observed']['censored_first_attempt']]
    out={'fights':len(rr),'computed':sum(r[variant]['status']=='computed' for r in rr),'matched_uncensored':len(usable),
         'statuses':dict(collections.Counter(r[variant]['status'] for r in rr)),
         'observed_deaths':sum(r['observed']['outcome']=='died' for r in usable),
         'observed_death_rate':avg([r['observed']['outcome']=='died' for r in usable]),
         'simulated_death_rate':avg([metric(r,variant,'death_rate') for r in usable]),
         'observed_net_hp_loss':avg([r['observed']['net_hp_loss'] for r in usable]),
         'observed_sampled_gross_loss':avg([r['observed']['sampled_combat_hp_decreases'] for r in usable]),
         'simulated_hp_loss':avg([metric(r,variant,'hp_loss') for r in usable]),
         'observed_turns':avg([r['observed']['turns'] for r in usable]),
         'simulated_turns':avg([metric(r,variant,'turns') for r in usable]),
         'all_dead_fights':sum(metric(r,variant,'death_rate')==1 for r in usable),
         'all_dead_but_observed_won':[r['id'] for r in usable if metric(r,variant,'death_rate')==1 and r['observed']['outcome']=='won'],
         'capped_samples':sum(r[variant]['metrics']['capped'] for r in usable),
         'time_up_samples':sum(r[variant]['metrics']['time_up'] for r in usable),
         'samples':sum(len(r[variant]['samples']) for r in usable)}
    out['hp_bias_vs_net']=None if not usable else out['simulated_hp_loss']-out['observed_net_hp_loss']
    out['hp_bias_vs_sampled_gross']=None if not usable else out['simulated_hp_loss']-out['observed_sampled_gross_loss']
    out['turn_bias']=None if not usable else out['simulated_turns']-out['observed_turns']
    return out
output={'completed':len(rows),'planned':len(inputs),'overall':{},'by_act':{},'by_encounter':{},'matched_opening_comparison':{}}
for v in ['synthetic','actual-opening']:
    output['overall'][v]=summary(rows,v)
    output['by_act'][v]={str(a):summary([r for r in rows if r['fight']['act']==a],v) for a in [1,2,3]}
    output['by_encounter'][v]={e:summary([r for r in rows if r['fight']['encounter']==e],v) for e in sorted({r['fight']['encounter'] for r in rows})}
matched=[r for r in rows if all(r[v]['status']=='computed' for v in ['synthetic','actual-opening']) and not r['observed']['censored_first_attempt']]
output['matched_opening_comparison']={v:summary(matched,v) for v in ['synthetic','actual-opening']}
output['observed_potion_fights']=sum(bool(r['observed']['potions_used']) for r in rows)
output['held_potion_fights']=sum(bool(r['fight']['potions_in']) for r in rows)
output['censored']=[r['id'] for r in rows if r['observed']['censored_first_attempt']]
output['errors']=[{'id':r['id'],'variant':v,'error':r[v].get('error'),'unsupported':r[v].get('unsupported')} for r in rows for v in ['synthetic','actual-opening'] if r[v]['status']!='computed']
flat=[]
for r in rows:
    f=r['fight'];o=r['observed'];z={'id':r['id'],'run_id':f['run_id'],'floor':f['floor'],'act':f['act'],'encounter':f['encounter'],'entry_hp':f['entry_hp'],'deck_size':f['deck_size'],**o}
    z['potions_used']=';'.join(o['potions_used'])
    for v in ['synthetic','actual-opening']:
        z[v+'_status']=r[v]['status']
        for k in ['hp_loss','turns','death_rate','damage_per_turn']:z[v+'_'+k]=metric(r,v,k)
        opening=r[v].get('opening',{});solver=opening.get('solver',{})
        z[v+'_energy']=solver.get('player',{}).get('energy')
        z[v+'_opening_hp']=solver.get('player',{}).get('hp')
        z[v+'_initial_hand']=len([c for c in solver.get('hand',[]) if c['type']!='Potion'])
        z[v+'_draw_first']=opening.get('options',{}).get('drawFirst',0)
        z[v+'_enemy_hp']=sum(e['hp'] for e in solver.get('enemies',[]))
        z[v+'_initial_incoming']=sum(a['damage']*a['hits'] for e in solver.get('enemies',[]) for a in e.get('attacks',[]))
        z[v+'_random_potions']=len(opening.get('randomPotions',[]))
        z[v+'_drinks_per_sample']=avg([len(s.get('drunk',[])) for s in r[v].get('samples',[])])
        z[v+'_unmodelled_relics']=';'.join(l for l in r[v].get('labels',[]) if l.startswith('unmodelled_relic:'))
    flat.append(z)
with open(D/'per-fight.csv','w') as f:
    w=csv.DictWriter(f,fieldnames=list(flat[0]));w.writeheader();w.writerows(flat)
(D/'summary.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'completed':len(rows),'synthetic':output['overall']['synthetic'],'actual':output['overall']['actual-opening']},ensure_ascii=False,indent=2))
