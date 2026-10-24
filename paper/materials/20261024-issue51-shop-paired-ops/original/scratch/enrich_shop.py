from own_conn import *
import collections,bisect
x=json.load(open(S/'shop-contexts.json'));p=json.load(open(S/'shop-state-projections.json'))
fs=rows("select run_id,off,len,ts,floor,screen,gold,deck,relics,potions from frames where screen='SHOP' order by off")
by=collections.defaultdict(list)
for f in fs:by[f['run_id']].append(f)
def deck(r):return collections.Counter(a['card_id']+('+' if a.get('upgraded') else '') for a in r)
for a in x:
 pre=p[str(a['pre_off'])];n=a['next'];action=a['decision']['action'];t=a['target']
 old=deck(pre['run']['deck']);new=collections.Counter(n['deck'] or [])
 a['gold_delta']=a['gold']-n['gold'] if n['gold'] is not None else None
 a['observed_gain']=list((new-old).elements())
 a['purchase_verified']=False
 if t and a['gold_delta']==t['price']:
  if action=='buy_card':a['purchase_verified']=new[t['card_id']+('+' if t.get('upgraded') else '')]>old[t['card_id']+('+' if t.get('upgraded') else '')]
  if action=='buy_relic':a['purchase_verified']=collections.Counter(n['relics'] or [])[t['relic_id']]>collections.Counter(z['relic_id'] for z in pre['run']['relics'])[t['relic_id']]
  if action=='buy_potion':a['purchase_verified']=collections.Counter(n['potions'] or [])[t['potion_id']]>collections.Counter(z.get('potion_id') for z in pre['run']['potions'])[t['potion_id']]
 a['budget_conflict']=bool(t and a['removal_affordable'] and t['price']<=a['gold'] and a['gold']-t['price']<a['removal']['price'])
 a['empty_potion_slots']=sum(not z.get('occupied') for z in pre['run']['potions'])
 if action=='remove_card_at_shop':
  nshop=next((f for f in by[a['decision']['run_id']] if f['off']>a['pre_off'] and f['floor']==a['decision']['floor']),None)
  a['removal_return_shop']=nshop
  if nshop:
   nd=collections.Counter(nshop['deck'] or []);removed=list((old-nd).elements());added=list((nd-old).elements())
   a['removed_cards']=removed;a['removal_added_cards']=added
   a['removal_gold_delta']=a['gold']-nshop['gold']
   a['paid_removal_verified']=len(removed)==1 and not added and a['removal_gold_delta']==a['removal']['price']
   if len(removed)==1:a['removed_card_pre']=next(z for z in pre['run']['deck'] if z['card_id']+('+' if z.get('upgraded') else '')==removed[0])
(S/'shop-enriched.json').write_text(json.dumps(x,ensure_ascii=False,default=str)+'\n')
print('verified purchases',collections.Counter((a['decision']['action'],a['purchase_verified']) for a in x if a['target']))
print('removal',collections.Counter((a.get('paid_removal_verified'),a.get('removal_gold_delta')) for a in x if a['decision']['action']=='remove_card_at_shop'))
print('removed',collections.Counter(tuple(a.get('removed_cards',[])) for a in x if a['decision']['action']=='remove_card_at_shop'))
for a in x:
 if a['run_stratum']['ascension']==10 and a.get('paid_removal_verified') and a.get('removed_card_pre',{}).get('card_type')=='Curse': print('curse',a['decision']['run_id'],a['decision']['floor'],a['removed_cards'],a['gold'],a['removal_gold_delta'],a['decision']['rationale'])
print('conflicts',collections.Counter((a['decision']['action'],a['purchase_verified']) for a in x if a['budget_conflict']))
