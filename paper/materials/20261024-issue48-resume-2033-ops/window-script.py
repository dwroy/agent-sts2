from pathlib import Path
import datetime as dt,json,re,hashlib,statistics,sys
R=Path.cwd();M=R/'paper/materials/20261024-issue48-resume-2033-ops';z=dt.timezone(dt.timedelta(hours=8));T=dt.datetime(2026,10,23,18,19,29,tzinfo=z);now=dt.datetime.now(z);p=R/'ops/codex-ops/learn.json';raw=p.read_bytes();state=json.loads(raw);rows=[]
bound=['proposal_ids','proposal_repair','research_request','implementation_request','external_source','backfill_source','learner_task']
for bid,b in state['batches'].items():
 m=re.match(r'^(\d{8})-(\d{6})(?:-|$)',bid)
 if not m:continue
 stamp=dt.datetime.strptime(''.join(m.groups()),'%Y%m%d%H%M%S').replace(tzinfo=z)
 if not T-dt.timedelta(days=1)<=stamp<T+dt.timedelta(days=1):continue
 task=b.get('task','postmortem');role='external' if b.get('external_source') else 'backfill' if b.get('backfill_source') else 'bound-specialist' if any(b.get(k) for k in bound if k not in ['external_source','backfill_source']) else 'ordinary'
 end=None
 if b.get('finished'):
  try:end=dt.datetime.fromisoformat(b['finished']).replace(tzinfo=z)
  except ValueError:pass
 rows.append({'batch':bid,'registered_id_time':stamp.isoformat(),'window':'before' if stamp<T else 'after','task':task,'role':role,'state_now':b.get('state'),'rc_now':b.get('rc'),'finished':b.get('finished'),'terminal_at_window_end':bool(end and end<(T if stamp<T else T+dt.timedelta(days=1))),'runs':b.get('runs',[]),'report_present_now':bool(b.get('report'))})
summary={}
for name,lo,hi in [('before',T-dt.timedelta(days=1),T),('after',T,T+dt.timedelta(days=1))]:
 subset=[r for r in rows if r['window']==name];groups={}
 for key in sorted({(r['role'],r['task']) for r in subset}):
  rs=sorted([r for r in subset if (r['role'],r['task'])==key],key=lambda r:r['registered_id_time']);times=[dt.datetime.fromisoformat(r['registered_id_time']) for r in rs];gaps=[(y-x).total_seconds()/60 for x,y in zip(times,times[1:])]
  groups['/'.join(key)]={'registered_batches':len(rs),'batch_ids':[r['batch'] for r in rs],'reports_present_now':sum(r['report_present_now'] for r in rs),'rc0_now':sum(r['rc_now']==0 for r in rs),'terminal_rc0_by_window_end':sum(r['rc_now']==0 and r['terminal_at_window_end'] for r in rs),'finished_time_missing':sum(not r['finished'] for r in rs),'within_window_registered_gap_minutes':gaps,'gap_median_minutes':statistics.median(gaps) if gaps else None,'gap_max_minutes':max(gaps) if gaps else None}
 summary[name]={'start':lo.isoformat(),'end':hi.isoformat(),'complete_time_window':now>=hi,'groups':groups}
sys.path.insert(0,str(R/'ops'));import strategy_backfill_jobs as backfill
queue=backfill.queue(R);valid=[]
for plan in queue['plans']:
 binding,_=backfill.source(R,plan);valid.append({'plan_id':plan['plan_id'],'ids':binding['entry_ids'],'input_manifest':binding['input_manifest'],'source_validation_passed':True})
backbatches=[{'batch':bid,'state':b.get('state'),'source':b['backfill_source']} for bid,b in state['batches'].items() if b.get('backfill_source')];q=R/'notes/strategy-backfill-silent.json';qsha=hashlib.sha256(q.read_bytes()).hexdigest();assert qsha=='400b46b230a2558c86e6ff797329f5cbc9d38dca5853d37e5423cf8282cb741b'
result={'at':now.isoformat(),'T':T.isoformat(),'source_learn_json':{'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()},'timestamp_basis':'batch ID registration proxy, not native acceptance or compute duration; completion only when explicit finished timestamp exists','windows':summary,'rows':rows,'backfill':{'queue_sha256':qsha,'enabled':queue['enabled'],'old_frozen_total':244,'bound_batches':backbatches,'native_cursor':state.get('strategy_backfill',{}).get('cursor',0),'processed_entries':len([v for v in state.get('strategy_backfill',{}).get('entries',{}).values() if v.get('status')=='processed']),'validated_plans':valid,'held_plans_untouched':queue['held_plans']},'new_ordinary_native_T':'2026-10-24T16:44:14.992+08:00','new_ordinary_full_24h_ends':'2026-10-25T16:44:14.992+08:00','new_ordinary_24h_complete':now>=dt.datetime(2026,10,25,16,44,14,992000,tzinfo=z),'causal_noninferiority':'not established; no dispatched backfill exposure, external-first policy/publication drains/manual stop and ordinary-template exposure changed','normal_pipeline_no_degradation_acceptance':'not passed from this observation','unobserved_native_duration_or_quality_not_zero':True,'new_dispatch_tick_or_model':0};(M/'window-24h.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({n:{k:v['registered_batches'] for k,v in summary[n]['groups'].items()} for n in summary},ensure_ascii=False));print(json.dumps({'backfill_bound_batches':len(backbatches),'queue_unchanged':True,'new_ordinary_24h_complete':result['new_ordinary_24h_complete']}))
