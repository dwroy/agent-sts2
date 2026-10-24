from own_conn import *
import collections,bisect
x=json.load(open(S/'shop-enriched.json'))
fs=rows("select run_id,off,len,ts,act,floor,hp,max_hp,gold,deck,relics,potions from frames where screen='COMBAT' qualify row_number() over(partition by run_id,floor order by off)=1 order by off")
by=collections.defaultdict(list)
for f in fs:by[f['run_id']].append(f)
for a in x:
 later=[f for f in by[a['decision']['run_id']] if f['off']>a['pre_off']]
 a['next_recorded_fight_entry_proxy']=later[0] if later else None
(S/'shop-enriched.json').write_text(json.dumps(x,ensure_ascii=False,default=str)+'\n')
print('next_fight_entries',sum(a['next_recorded_fight_entry_proxy'] is not None for a in x),'of',len(x))
