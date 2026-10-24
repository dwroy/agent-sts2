import json,pathlib,collections
S=pathlib.Path(__file__).parent
x=json.load(open(S/'shop-enriched.json'));p=json.load(open(S/'shop-state-projections.json'))
def pre(a):return p[str(a['pre_off'])]
def ids(a):return [z['relic_id'] for z in pre(a)['run']['relics']]
for a in x:
 a['golden_seal']=any(z['name']=='黄金封印' or 'Golden' in z['name'] for z in pre(a)['run']['relics'])
 if '25226ZFLNR1J'==a['decision']['run_id'] and a['decision']['floor']==39:
  print('seal relics',[(z['relic_id'],z['name'],z['description']) for z in pre(a)['run']['relics']]);break
# Character text in raw snapshots establishes names; no cluster naming is used.
gold_id='SEAL_OF_GOLD'
for a in x:
 a['golden_seal']=gold_id in ids(a)
 a['mixed_strikes']=any(z['card_id']=='STRIKE_SILENT' and z['upgraded'] for z in pre(a)['run']['deck']) and any(z['card_id']=='STRIKE_SILENT' and not z['upgraded'] for z in pre(a)['run']['deck'])
 a['sale_affordable']=any(z.get('on_sale') and z['affordable_price_proxy'] for z in a['stock'])
 a['has_curse_other_than_bane']=any(z['card_type']=='Curse' and z['card_id']!='ASCENDERS_BANE' for z in pre(a)['run']['deck'])
filters={
 'joint_budget_purchase':lambda a:a['budget_conflict'] and a['purchase_verified'],
 'joint_budget_remove':lambda a:a.get('paid_removal_verified') and any(z['affordable_price_proxy'] and a['gold']-a['removal']['price']<z['price'] for z in a['stock']),
 'close_affordable_price_proxy':lambda a:a['decision']['action']=='close_shop_inventory' and (a['affordable_stock_n']>0 or a['removal_affordable']),
 'close_no_affordable_price_proxy':lambda a:a['decision']['action']=='close_shop_inventory' and a['affordable_stock_n']==0 and not a['removal_affordable'] and len(a['stock'])>0,
 'close_empty_stock_no_remove':lambda a:a['decision']['action']=='close_shop_inventory' and not a['stock'] and not a['removal_affordable'],
 'active_affordable_keep_rationale':lambda a:a['decision']['action']=='close_shop_inventory' and a['decision']['label']=='shop/plan' and (a['affordable_stock_n']>0 or a['removal_affordable']) and any(w in (a['decision']['rationale'] or '').lower() for w in ('save gold','preserve gold','保留','留金','存钱')),
 'golden_affordable_close':lambda a:a['decision']['action']=='close_shop_inventory' and a['golden_seal'] and a['affordable_stock_n']>0,
 'golden_affordable_purchase':lambda a:a['golden_seal'] and a['purchase_verified'],
 'paid_curse_removal':lambda a:a.get('paid_removal_verified') and a.get('removed_card_pre',{}).get('card_type')=='Curse',
 'curse_present_other_removal':lambda a:a.get('paid_removal_verified') and a['has_curse_other_than_bane'] and a.get('removed_card_pre',{}).get('card_type')!='Curse',
 'paid_nonbasic_removal':lambda a:a.get('paid_removal_verified') and a.get('removed_card_pre',{}).get('card_type')!='Curse' and a.get('removed_card_pre',{}).get('rarity')!='Basic',
 'paid_basic_removal':lambda a:a.get('paid_removal_verified') and a.get('removed_card_pre',{}).get('rarity')=='Basic',
 'mixed_strike_removal':lambda a:a.get('paid_removal_verified') and a['mixed_strikes'],
 'mixed_strike_plain_removed':lambda a:a.get('paid_removal_verified') and a['mixed_strikes'] and a['removed_cards']==['STRIKE_SILENT'],
 'sale_affordable_close':lambda a:a['decision']['action']=='close_shop_inventory' and a['sale_affordable'],
 'low_hp_empty_slot_potion_conflict':lambda a:a['decision']['action']=='buy_potion' and a['purchase_verified'] and a['budget_conflict'] and a['empty_potion_slots']>0 and pre(a)['run']['current_hp']/pre(a)['run']['max_hp']<=.5,
}
def summary(rr):
 ss=collections.defaultdict(list)
 for a in rr:ss[(a['run_stratum']['ascension'],a['run_stratum']['attempt_scope'])].append(a)
 return [{'ascension':asc,'attempt_scope':at,'game_version':'unknown','opportunities':len(v),'independent_runs':len(set(a['decision']['run_id'] for a in v)),'recorded_run_floor_locations':len(set((a['decision']['run_id'],a['decision']['floor']) for a in v)),'final_winning_runs':len(set(a['decision']['run_id'] for a in v if a['run_stratum']['victory'])),'decision_offsets':[a['decision']['off'] for a in v]} for (asc,at),v in sorted(ss.items())]
out={name:{'definition':name,'strata':summary([a for a in x if fn(a)])} for name,fn in filters.items()}
(S/'shop-statistics.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
(S/'shop-enriched.json').write_text(json.dumps(x,ensure_ascii=False)+'\n')
for name,fn in filters.items():
 rr=[a for a in x if fn(a) and a['run_stratum']['ascension']==10]
 print(name,len(rr),len(set(a['decision']['run_id'] for a in rr)),dict(collections.Counter(a['run_stratum']['attempt_scope'] for a in rr)))
