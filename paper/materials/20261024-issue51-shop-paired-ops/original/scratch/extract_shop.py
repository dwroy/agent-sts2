from own_conn import *
import hashlib,collections,bisect
runmap={r['run_id']:r for r in scope['runs']}
ds=rows("select run_id,off,len,ts,observed_ts,floor,label,action,option_index,card_index,chosen,options,rationale,result,sl_attempt,sl_reloads from decisions where mode='play' and label in ('shop/plan','shop/buy') order by off")
# Compute successor within the allowed runs before selecting SHOP rows.
fs=rows('''select * from (select run_id,off,len,ts,observed_ts,screen,floor,act,hp,max_hp,gold,deck,relics,potions,
lead(off) over w next_off,lead(len) over w next_len,lead(ts) over w next_ts,lead(screen) over w next_screen,
lead(gold) over w next_gold,lead(deck) over w next_deck,lead(relics) over w next_relics,lead(potions) over w next_potions
from frames window w as (partition by run_id order by off)) where screen='SHOP' order by off''')
by=collections.defaultdict(list)
for f in fs:by[f['run_id']].append(f)
refs={};projs={}
def seek_state(off,n):
 assert off+n<=scope['raw_stream_cutoffs']['states']['max_bytes']
 if off in projs:return projs[off]
 with (R/'logs/states.jsonl').open('rb') as f:f.seek(off);b=f.read(n)
 assert len(b)==n
 refs[off]={'stream':'states','path':'logs/states.jsonl','offset':off,'bytes':n,'sha256':hashlib.sha256(b).hexdigest()}
 a=json.loads(b);s=a['state'];r=s['run']
 p={'ref':refs[off],'screen':s['screen'],'run_id':s.get('run_id'),'available_actions':s['available_actions'],'run':{k:r.get(k) for k in ('character_id','ascension','floor','act_id','boss_id','current_hp','max_hp','gold','deck','relics','potions')},'shop':s.get('shop'),'selection':s.get('selection')}
 projs[off]=p;return p
contexts=[];missing=[]
for d in ds:
 fsr=by[d['run_id']];ts=d['observed_ts'] or d['ts']
 opts=[f for f in fsr if f['observed_ts']==ts]
 method='exact_observed_ts'
 if not opts:
  opts=[f for f in fsr if f['ts']<=ts and f['floor']==d['floor']];method='latest_ts_proxy'
 if not opts:missing.append(d);continue
 f=opts[-1]
 # Require same floor and inventory; preserve unavailable cases separately.
 pre=seek_state(f['off'],f['len']);shop=pre.get('shop') or {}
 if not shop.get('is_open'):missing.append(d);continue
 gold=pre['run']['gold'];stock=[]
 for kind in ('cards','relics','potions'):
  for x in shop.get(kind,[]):
   if x.get('is_stocked') is True:
    stock.append({'kind':kind,**x,'affordable_price_proxy':isinstance(x.get('price'),(int,float)) and x['price']<=gold})
 rem=shop.get('card_removal') or {}
 affordable=[x for x in stock if x['affordable_price_proxy']]
 target=None
 if d['action'] in ('buy_card','buy_relic','buy_potion'):
  kind={'buy_card':'cards','buy_relic':'relics','buy_potion':'potions'}[d['action']]
  target=next((x for x in stock if x['kind']==kind and x['index']==d['option_index']),None)
 nxt={k:f.get('next_'+k) for k in ('off','len','ts','screen','gold','deck','relics','potions')}
 ctx={'decision':d,'run_stratum':{k:runmap[d['run_id']][k] for k in ('ascension','attempt_scope','victory')},'state_join':method,'pre_off':f['off'],'gold':gold,'stock':stock,'affordable_stock_n':len(affordable),'removal':rem,'removal_affordable':rem.get('available') is True and rem.get('used') is False and isinstance(rem.get('price'),(int,float)) and gold>=rem['price'],'target':target,'next':nxt}
 contexts.append(ctx)
(S/'shop-contexts.json').write_text(json.dumps(contexts,ensure_ascii=False,default=str)+'\n')
(S/'shop-state-projections.json').write_text(json.dumps(projs,ensure_ascii=False,default=str)+'\n')
(S/'raw-state-refs.json').write_text(json.dumps(list(refs.values()),indent=2)+'\n')
(S/'shop-missing.json').write_text(json.dumps(missing,ensure_ascii=False,default=str)+'\n')
print(json.dumps({'decision_rows':len(ds),'contexts':len(contexts),'raw_state_rows':len(refs),'missing':len(missing),'join':dict(collections.Counter(x['state_join'] for x in contexts))}))
