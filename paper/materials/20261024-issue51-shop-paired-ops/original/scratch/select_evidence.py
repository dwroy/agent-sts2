import json,pathlib,hashlib,collections
S=pathlib.Path(__file__).parent;W=pathlib.Path.cwd();R=pathlib.Path('/home/dw/Projects/agent-sts2')
x=json.load(open(S/'shop-enriched.json'));p=json.load(open(S/'shop-state-projections.json'));scope=json.load(open(W/'paper/materials/20261024-issue51-own-fallback-ops/own-506-scope.json'))
rr=[a for a in x if a['run_stratum']['ascension']==10]
def pick(run,floor,action,target=None):
 return next(a for a in rr if a['decision']['run_id']==run and a['decision']['floor']==floor and a['decision']['action']==action and (not target or target in ((a['target'] or {}).get('card_id'),(a['target'] or {}).get('potion_id'))))
selected={
'joint-budget':[pick('MGA0CZDDKC0P',11,'buy_card','FLICK_FLACK'), next(a for a in rr if a.get('paid_removal_verified') and a['run_stratum']['attempt_scope']=='no_retry_evidence' and a['gold']<a['removal']['price']+max([z['price'] for z in a['stock'] if z['affordable_price_proxy']] or [0]))],
'affordable-stop':[pick('QNTW139MGECA',24,'close_shop_inventory'),pick('9663Y88TYK73',3,'close_shop_inventory')],
'golden-reserve':[pick('25226ZFLNR1J',39,'close_shop_inventory'),pick('25226ZFLNR1J',37,'buy_card','BLUR'),next(a for a in rr if a['golden_seal'] and a['decision']['action']=='close_shop_inventory' and a['affordable_stock_n'] and a['run_stratum']['attempt_scope']=='no_retry_evidence')],
'curse-removal':[pick('0QDRNCRMC8BU',24,'remove_card_at_shop'),pick('PZRSP3EL4K6B',21,'remove_card_at_shop'),pick('25226ZFLNR1J',31,'remove_card_at_shop')],
'nonbasic-removal':[pick('HSX4HYATB4E2',36,'remove_card_at_shop'),pick('FETDVL1P59B9',20,'remove_card_at_shop'),pick('VPW8YH7A4QFM',6,'remove_card_at_shop')],
'upgrade-aware-removal':[next(a for a in rr if a.get('paid_removal_verified') and a['mixed_strikes'] and a['removed_cards']==['STRIKE_SILENT'] and a['run_stratum']['attempt_scope']=='no_retry_evidence'),next(a for a in rr if a.get('paid_removal_verified') and a['mixed_strikes'] and a['removed_cards']!=['STRIKE_SILENT'])]
}
refs={}
def raw(stream,off,n):
 assert off+n<=scope['raw_stream_cutoffs'][stream]['max_bytes']
 path=scope['raw_stream_cutoffs'][stream]['path']
 with (R/path).open('rb') as f:f.seek(off);b=f.read(n)
 assert len(b)==n
 ref={'stream':stream,'path':path,'offset':off,'bytes':n,'sha256':hashlib.sha256(b).hexdigest(),'cutoff':scope['raw_stream_cutoffs'][stream]['max_bytes']};refs[(stream,off)]=ref
 return json.loads(b),ref
def state(off,n):
 d,ref=raw('states',off,n);s=d['state'];r=s['run']
 return {'ref':ref,'ts':d['ts'],'observed_ts':d.get('observed_ts'),'run_id':s.get('run_id'),'screen':s['screen'],'available_actions':s['available_actions'],'run':{k:r.get(k) for k in ('character_id','ascension','floor','act_id','boss_id','current_hp','max_hp','gold','deck','relics','potions')},'shop':s.get('shop'),'selection':s.get('selection')}
def option_facts(q):
 out={}
 for name,question in (q or {}).items():
  if not isinstance(question,dict):continue
  choices={}
  for k,v in question.get('criteria',{}).items():
   try:a=json.loads(v) if isinstance(v,str) else v
   except (ValueError,TypeError):a={'text':v}
   choices[k]={z:a[z] for z in ('buy','kind','price','text','cost','type','rarity','affordable_now','in_deck','remove','card','name') if z in a} if isinstance(a,dict) else a
  out[name]={'option_facts':choices}
 return out
for key,aa in selected.items():
 evidence=[]
 for a in aa:
  d=a['decision'];dr,dref=raw('decisions',d['off'],d['len'])
  pre=state(a['pre_off'],p[str(a['pre_off'])]['ref']['bytes'])
  if d['action']=='remove_card_at_shop':q=a['removal_return_shop']
  else:q=a['next']
  post=state(q['off'],q['len']);assert pre['run_id']==post['run_id']==d['run_id']
  row={'context':key,'decision_ref':dref,'decision_fields':{k:dr.get(k) for k in ('ts','observed_ts','label','action','chosen','result','rationale','sl_attempt','sl_reloads')},'question_option_facts_projection':option_facts(dr.get('questions')),'indexed_decision':d,'stratum':a['run_stratum'],'pre':pre,'post':post,'verification':{k:a.get(k) for k in ('purchase_verified','gold_delta','paid_removal_verified','removal_gold_delta','removed_cards','removal_added_cards','budget_conflict')},'next_recorded_fight_entry_proxy':a['next_recorded_fight_entry_proxy']}
  evidence.append(row)
 (S/(key+'-evidence.json')).write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
 print(key)
 for e in evidence:
  pre=e['pre'];post=e['post'];d=e['indexed_decision'];ac=next(a for a in aa if a['decision']['off']==d['off'])
  print(json.dumps({'run':pre['run_id'],'floor':d['floor'],'stratum':e['stratum'],'hp':[pre['run']['current_hp'],pre['run']['max_hp']],'gold':[pre['run']['gold'],post['run']['gold']],'action':d['action'],'removal':pre['shop']['card_removal'],'target':ac['target'],'removed':ac.get('removed_card_pre'),'post_screen':post['screen'],'post_removal':(post.get('shop') or {}).get('card_removal'),'stock_summary':[{k:z.get(k) for k in ('kind','card_id','relic_id','potion_id','price','on_sale','is_stocked','affordable_price_proxy')} for z in ac['stock']],'rationale':d['rationale'],'next_combat':{k:e['next_recorded_fight_entry_proxy'][k] for k in ('floor','hp','gold')},'upgraded_strikes':[z['resolved_rules_text'] for z in pre['run']['deck'] if z['card_id']=='STRIKE_SILENT' and z['upgraded']]},ensure_ascii=False))
(S/'selected-raw-refs.json').write_text(json.dumps(list(refs.values()),indent=2)+'\n')
(S/'selected-context-offsets.json').write_text(json.dumps({k:[a['decision']['off'] for a in aa] for k,aa in selected.items()},indent=2)+'\n')
