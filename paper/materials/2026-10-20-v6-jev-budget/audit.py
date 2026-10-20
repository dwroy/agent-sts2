"""Read-only audit. Uninstrumented historical stages stay null; stages overlap, never summed blindly."""
import json, statistics, collections, pathlib, hashlib
P=pathlib.Path(__file__).resolve().parent
RUN='MWMR855QHTWR'; START='2026-10-20T00:11:00'; END='2026-10-20T00:45:00'
def rows(name):
 for line in (P/(name+'.jsonl')).open(): yield json.loads(line)
def quant(xs):
 xs=sorted(x for x in xs if isinstance(x,(float,int)))
 return {'n':len(xs),'min':min(xs),'median':statistics.median(xs),'p90':xs[min(len(xs)-1,int(.9*len(xs)))],'max':max(xs)} if xs else {'n':0}
ds=list(rows('decisions')); ps=list(rows('jev-prompts')); vs=list(rows('v6-build'))
def live(r): return r.get('run_id')==RUN and START<=r.get('ts','')<END
prompts=collections.defaultdict(list)
for p in ps: prompts[p.get('decision_id')].append(p)
turns=collections.defaultdict(list)
for d in ds:
 if live(d): turns[(d.get('time_budget') or {}).get('key')].append(d)
fallbacks=[]
for d in ds:
 if not live(d) or d.get('decider')!='code-fallback':continue
 b=d.get('time_budget',{}); timings=d.get('timing',{});t=turns[b['key']]
 fallbacks.append({'ts':d['ts'],'decision_id':d['decision_id'],'label':d['label'],'floor':d['floor'],'turn':d['turn'],'sl_attempt':d.get('sl_attempt'),'budget':b,'entry_latency':d['latency_ms'],'planner_breakdown':timings,'turn_entries':[{'ts':x['ts'],'label':x['label'],'decider':x['decider'],'latency':x['latency_ms'],'timing':x.get('timing'),'budget':x.get('time_budget')} for x in t], 'actual_requests':[{'ts':p['ts'],'latency_ms':p['latency_ms'],'input_tokens':p.get('input_tokens'),'error':p.get('error'),'wire_bytes':len(json.dumps(p['request'],ensure_ascii=False,separators=(',',':')).encode())}for p in prompts[d['decision_id']]],'unmeasured_ms':dict.fromkeys(['reflex_load','predicate','prompt_log','sdk_encoding','gateway_encoding','network'])})
fallback_keys={x["budget"]["key"] for x in fallbacks}
summaries={}
for run in [RUN,'76VEDXJJ2PFL','MEQ6ETDCEEE9']:
 for window in (['all','live-window'] if run==RUN else ['all']):
  dr=[d for d in ds if d.get('run_id')==run and(window=='all'or live(d))];pr=[p for p in ps if p.get('run_id')==run and(window=='all'or live(p)) and p.get('label','').startswith('combat/')]
  summaries[run+'/'+window]={'deciders':dict(collections.Counter(d['decider']for d in dr)),'combat_prompt_tokens':quant(p.get('input_tokens')for p in pr),'combat_request_ms':quant(p.get('latency_ms')for p in pr),'token_buckets':{f'{a}-{b}':{'tokens':quant(p.get('input_tokens')for p in pr if a<=(p.get('input_tokens')or -1)<b),'latency_ms':quant(p['latency_ms']for p in pr if a<=(p.get('input_tokens')or -1)<b)}for a,b in [(0,5000),(5000,10000),(10000,20000),(20000,999999)]},'normal_turn_controls':[{'ts':d['ts'],'floor':d.get('floor'),'turn':d.get('turn'),'latency':d['latency_ms'],'timing':d.get('timing'),'budget':d.get('time_budget'),'requests':[{'tokens':p.get('input_tokens'),'ms':p['latency_ms']}for p in prompts[d.get('decision_id')]]}for d in dr if d['decider']=='jev' and d.get('time_budget') and d.get('timing') and (d.get('time_budget') or {}).get('key') not in fallback_keys][:8]}
out={'source':{n:{'path':str(P/(n+'.jsonl')),'sha256':hashlib.sha256((P/(n+'.jsonl')).read_bytes()).hexdigest()}for n in ['decisions','jev-prompts','v6-build','runs']},'window_utc':[START,END],'summaries':summaries,'fallbacks':fallbacks,'v6_build_live_window':[{'ts':r['ts'],'kind':r.get('kind'),'stage':r.get('stage'),'elapsed_ms':r.get('elapsed_ms')} for r in vs if live(r)],'limitations':['Historical missing timers are null, never estimated as measured values.','SDK latency includes encoding, Nova roundtrip, and decoding; historical logs cannot separate these.','Time windows matter: MWMR has older V5-era decisions before this resumed V6 session.','Token bucket comparisons are observational and not randomized.']}
(P/'audit.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:{a:b for a,b in v.items()if a!='normal_turn_controls'}for k,v in summaries.items()},ensure_ascii=False,indent=2))
