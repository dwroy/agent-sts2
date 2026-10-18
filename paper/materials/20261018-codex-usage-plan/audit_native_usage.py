"""Read only session metadata and numeric usage; never export conversation bodies."""
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
import csv, gzip, hashlib, json, re, subprocess

ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
STAMP=subprocess.check_output(['date','--iso-8601=seconds'],text=True).strip()
NOW=datetime.fromisoformat(STAMP).astimezone(timezone.utc)
WINDOWS={'aligned_hearthstone':(datetime(2026,10,17,9,tzinfo=timezone.utc),datetime(2026,10,18,5,20,tzinfo=timezone.utc)), 'last24h':(NOW-timedelta(hours=24),NOW), 'codex3_handoff':(datetime(2026,10,17,16,8,tzinfo=timezone.utc),NOW)}
UUID=re.compile(r'[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}')
KEYS=('input_tokens','cached_input_tokens','cache_write_input_tokens','output_tokens','reasoning_output_tokens')
def stamp(s):
 try:return datetime.fromisoformat(s.replace('Z','+00:00')).astimezone(timezone.utc)
 except (ValueError,AttributeError):return None
def dump(name,v):(OUT/name).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def write_csv(name,rows):
 if not rows:return
 with (OUT/name).open('w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
def within(cwd):return isinstance(cwd,str) and (cwd==str(ROOT) or cwd.startswith(str(ROOT)+'/'))

def delta_events(events):
 """Identical cumulative counters are rate-limit repeats, not new calls."""
 prior=None;seen=set();out=[];resets=duplicates=0
 for event in sorted(events,key=lambda v:(v['ts'],v['order'])):
  total=event['total'];sig=tuple(total.get(k,0) for k in KEYS);identity=(event['ts'],sig)
  if identity in seen:duplicates+=1;continue
  seen.add(identity)
  if prior is not None and sig==prior:duplicates+=1;continue
  reset=prior is not None and (sig[0]<prior[0] or sig[3]<prior[3])
  if reset:resets+=1
  before=(0,)*len(KEYS) if prior is None or reset else prior
  increments=tuple(max(0,a-b) for a,b in zip(sig,before));prior=sig
  if not any(increments):continue
  row={k:v for k,v in event.items() if k not in ['total','last','order']}
  row.update(dict(zip(KEYS,increments)));row['last_input_tokens']=event['last'].get('input_tokens',0);row['counter_reset']=reset
  row['last_input_matches_delta']=row['input_tokens']==row['last_input_tokens'];out.append(row)
 return out,resets,duplicates

# Fixed arithmetic checks include duplicate telemetry and a real counter reset.
def sample(ts,i,o):return dict(ts=ts,order=0,total={'input_tokens':i,'output_tokens':o},last={'input_tokens':i},model='fixed',effort='fixed')
a,resets,dupes=delta_events([sample('1',10,2),sample('2',10,2),sample('3',25,4),sample('4',7,1)])
assert sum(x['input_tokens'] for x in a)==32 and len(a)==3 and resets==1 and dupes==1

ops_ids={}
for f in [ROOT/'ops/codex-ops/session-id',*sorted((ROOT/'ops/codex-ops/llm-switches').glob('*/old-session/session-id'))]:
 if f.is_file():
  value=f.read_text().strip()
  if UUID.fullmatch(value):ops_ids[value]='ops'
thread_tasks={}; launch_files=0
for f in (ROOT/'learner/runs').glob('*.jsonl'):
 task=None
 with f.open('rb') as read:
  for _ in range(384):
   raw=read.readline()
   if not raw:break
   if b'"learner_launch"' in raw:
    try:v=json.loads(raw)
    except ValueError:continue
    task=v.get('task');task=task.get('name') if isinstance(task,dict) else task
   if b'"thread.started"' in raw:
    match=re.search(rb'"thread_id"\s*:\s*"([0-9a-f-]{36})"',raw)
    if match and isinstance(task,str):thread_tasks[match.group(1).decode()]=task;launch_files+=1
    break

# Project-owned traces bind temporary brain working directories to this project.
brain_threads=set();trace_rows=[];trace_file=ROOT/'logs/codex-calls.jsonl';trace_size=trace_file.stat().st_size
with trace_file.open('rb') as read:
 while read.tell()<trace_size:
  off=read.tell();raw=read.readline()
  if read.tell()>trace_size:break
  try:v=json.loads(raw)
  except ValueError:continue
  tid=v.get('thread_id')
  if isinstance(tid,str):brain_threads.add(tid)
  usage=v.get('usage')
  if isinstance(usage,dict):
   trace_rows.append(dict(ts=v.get('ts'),thread_id=tid,turn_id=v.get('turn_id'),question_id=v.get('question_id'),attempt=v.get('attempt'),outcome=v.get('outcome'),input_tokens=usage.get('input_tokens',0),cached_input_tokens=usage.get('cached_input_tokens',0),output_tokens=usage.get('output_tokens',0),reasoning_output_tokens=usage.get('reasoning_output_tokens',0),offset=off,bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest()))

def role(tid,cwd,source):
 if tid in brain_threads:return 'brain'
 if tid in ops_ids:return 'ops'
 if tid in thread_tasks:return 'learner:'+thread_tasks[tid]
 for needle,value in [('codex-strategy','learner:strategy-proposal'),('codex-fix','learner:fix-batch'),('exp-silent','learner:experience-update'),('/exp','learner:experience-update')]:
  if needle in cwd:return value
 if isinstance(source,dict):return 'auxiliary'
 if '/regent' in cwd:return 'regent-instance'
 return 'development-or-watcher-unresolved'

roots=[(n,Path.home()/n/'sessions') for n in ['.codex','.codex1','.codex3']]
account_root=ROOT/'ops/codex-ops/accounts'
for account in sorted(account_root.iterdir()):
 if account.is_dir():
  for home in sorted(account.iterdir()):
   sessions=home/'sessions'
   if home.is_dir() and sessions.is_dir():roots.append((account.name+'/'+home.name,sessions))
seen_files=set();physical=[];header_stats=Counter();sessions={};ordinal=0
for account,base in roots:
 if not base.is_dir():continue
 for f in base.rglob('*.jsonl'):
  if f.is_symlink():continue
  st=f.stat();inode=(st.st_dev,st.st_ino)
  if inode in seen_files:header_stats['physical_aliases_skipped']+=1;continue
  seen_files.add(inode)
  with f.open('rb') as read:first=read.readline(2*1024*1024)
  try:meta=json.loads(first)
  except ValueError:header_stats['invalid_or_oversized_header']+=1;continue
  h=meta.get('payload',{});tid=h.get('id');cwd=h.get('cwd','')
  header_stats['headers_examined']+=1
  if not isinstance(tid,str) or not UUID.fullmatch(tid):continue
  if not within(cwd) and tid not in brain_threads:header_stats['other_project_excluded']+=1;continue
  header_stats['project_files']+=1
  rec=sessions.setdefault(tid,dict(thread_id=tid,cwd=cwd,role=role(tid,cwd,h.get('source')),accounts=set(),files=[],events=[],contexts=Counter(),task_starts=0,compactions=0,malformed_metadata=0))
  rec['accounts'].add(account);rec['files'].append(dict(path=str(f),cutoff_bytes=st.st_size,mtime_ns=st.st_mtime_ns));physical.append(dict(path=str(f),thread_id=tid,cutoff_bytes=st.st_size))
  model='unknown';effort='unknown'
  with f.open('rb') as read:
   while read.tell()<st.st_size:
    raw=read.readline()
    if read.tell()>st.st_size:break
    if not any(k in raw for k in [b'"token_count"',b'"turn_context"',b'"task_started"',b'"context_compacted"']):continue
    try:v=json.loads(raw)
    except ValueError:rec['malformed_metadata']+=1;continue
    p=v.get('payload',{});kind=p.get('type')
    if v.get('type')=='turn_context':
     model=p.get('model','unknown');effort=p.get('effort',p.get('reasoning_effort','unknown'));rec['contexts'][(str(model),str(effort))]+=1
    if v.get('type')=='event_msg' and kind=='task_started':rec['task_starts']+=1
    if kind=='context_compacted':rec['compactions']+=1
    if v.get('type')!='event_msg' or kind!='token_count':continue
    info=p.get('info')
    if not isinstance(info,dict) or not isinstance(info.get('total_token_usage'),dict):continue
    total=info['total_token_usage'];last=info.get('last_token_usage') or {};ts=v.get('timestamp')
    if stamp(ts) is None:continue
    ordinal+=1;rec['events'].append(dict(ts=ts,total={k:int(total.get(k) or 0) for k in KEYS},last={k:int(last.get(k) or 0) for k in KEYS},model=str(model),effort=str(effort),order=ordinal))

def percentile(values,q):
 a=sorted(values);return a[min(len(a)-1,int((len(a)-1)*q))] if a else 0
def aggregate(events):
 values=[x['last_input_tokens'] for x in events];totals={k:sum(x[k] for x in events) for k in KEYS};calls=len(events)
 return dict(calls=calls,**totals,mean_input_tokens_per_usage_update=round(totals['input_tokens']/calls,1) if calls else 0,mean_last_input_tokens=round(sum(values)/calls,1) if calls else 0,context_p50=percentile(values,.5),context_p90=percentile(values,.9),context_max=max(values,default=0),cached_fraction=round(totals['cached_input_tokens']/totals['input_tokens'],6) if totals['input_tokens'] else 0,delta_last_mismatch=sum(not x['last_input_matches_delta'] for x in events))

session_rows=[];all_events=[];resets_total=duplicates_total=0
for tid,rec in sessions.items():
 events,resets,duplicates=delta_events(rec.pop('events'));resets_total+=resets;duplicates_total+=duplicates
 for event in events:event.update(thread_id=tid,role=rec['role'],accounts=';'.join(sorted(rec['accounts'])))
 all_events+=events;scopes={'lifetime':events}
 for name,(start,end) in WINDOWS.items():scopes[name]=[x for x in events if start<=stamp(x['ts'])<end]
 for scope,subset in scopes.items():
  row=dict(scope=scope,thread_id=tid,role=rec['role'],accounts=';'.join(sorted(rec['accounts'])),cwd=rec['cwd'],first_usage=events[0]['ts'] if events else '',last_usage=events[-1]['ts'] if events else '',counter_resets=resets,duplicate_telemetry_skipped=duplicates,**aggregate(subset));session_rows.append(row)
 rec['accounts']=sorted(rec['accounts']);rec['contexts']=[dict(model=k[0],effort=k[1],turn_context_records=v) for k,v in rec['contexts'].items()]
role_rows=[];scope_totals={}
for scope in ['lifetime',*WINDOWS]:
 selected=all_events if scope=='lifetime' else [e for e in all_events if WINDOWS[scope][0]<=stamp(e['ts'])<WINDOWS[scope][1]]
 scope_totals[scope]=aggregate(selected)
 for name in sorted({x['role'] for x in selected}):role_rows.append(dict(scope=scope,role=name,sessions=len({x['thread_id'] for x in selected if x['role']==name}),**aggregate([x for x in selected if x['role']==name])))
# Accepted project request summaries supplement missing/deleted native brain rollouts; never add overlapping threads.
trace_seen=set();trace_unique=[]
for row in trace_rows:
 key=(row['thread_id'],row['turn_id'],row['question_id'],row['attempt'],row['ts'])
 if key not in trace_seen:trace_seen.add(key);trace_unique.append(row)
trace_summaries={}
for scope,(start,end) in WINDOWS.items():
 rows=[x for x in trace_unique if stamp(x['ts']) and start<=stamp(x['ts'])<end];missing=[x for x in rows if x['thread_id'] not in sessions]
 trace_summaries[scope]=dict(observed_trace_calls=len(rows),native_missing_trace_calls=len(missing),trace_input_tokens=sum(x['input_tokens'] for x in rows),trace_cached_input_tokens=sum(x['cached_input_tokens'] for x in rows),missing_native_input_tokens=sum(x['input_tokens'] for x in missing),missing_native_cached_input_tokens=sum(x['cached_input_tokens'] for x in missing),missing_native_output_tokens=sum(x['output_tokens'] for x in missing),known_usage_only=True,not_added_to_native_totals=True)
write_csv('sessions.csv',session_rows);write_csv('roles.csv',role_rows)
with gzip.open(OUT/'numeric-usage-events.csv.gz','wt',newline='') as f:
 if all_events:
  w=csv.DictWriter(f,fieldnames=list(all_events[0]));w.writeheader();w.writerows(all_events)
dump('native-source-manifest.json',dict(at=STAMP,roots=[dict(label=n,path=str(p)) for n,p in roots],physical_cuts=physical,headers=dict(header_stats),project_thread_count=len(sessions),metadata_only=True,no_messages_tool_output_auth_env_or_config_exported=True))
dump('session-identities.json',list(sessions.values()))
dump('summary.json',dict(at=STAMP,windows={k:dict(start=a.isoformat(),end=b.isoformat()) for k,(a,b) in WINDOWS.items()},totals=scope_totals,role_rows=role_rows,duplicate_telemetry_skipped=duplicates_total,counter_resets=resets_total,project_native_sessions=len(sessions),task_launches_correlated=launch_files,ops_thread_ids=ops_ids,brain_trace_source=dict(path=str(trace_file.relative_to(ROOT)),cutoff_bytes=trace_size,windows=trace_summaries),method='Deduplicate physical aliases, then merge per-thread numeric usage and count positive cumulative counter increments. This counts observed usage updates, not a guaranteed exhaustive network request counter. Historical resets/missing/deleted native records remain coverage limits.',credentials_files_read=False,other_project_usage_excluded=True,quota_or_invoice_inference=False))
top=sorted([x for x in session_rows if x['scope']=='aligned_hearthstone'],key=lambda x:x['input_tokens'],reverse=True)[:12]
print(json.dumps(dict(totals=scope_totals,top_aligned=top,roles_aligned=[x for x in role_rows if x['scope']=='aligned_hearthstone'],coverage=trace_summaries,project_sessions=len(sessions),duplicates=duplicates_total,resets=resets_total),ensure_ascii=False),flush=True)
