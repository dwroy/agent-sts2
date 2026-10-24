"""Read frozen historical logs; never synchronize or mutate the running log database."""
import collections
import hashlib
import json
import math
import re
from pathlib import Path
import statistics

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
RAW = ROOT / ".artifacts/issue53-20261024/extracted"
RAW.mkdir(parents=True, exist_ok=True)
import duckdb
C = duckdb.connect(config={'threads': 2})
def save(name, value):
    ((RAW if name in ['brain-evidence.json', 'jev-evidence.json', 'frames-extract.json', 'decisions-extract.json', 'run-config-readback.json'] else OUT) / name).write_text(json.dumps(value, ensure_ascii=False, indent=2, default=str) + '\n')
def table(name, columns, ids):
    return C.execute(f"SELECT {columns} FROM read_parquet('{ROOT}/data/logdb/{name}/*.parquet',union_by_name=true) WHERE run_id IN ({','.join('?' for _ in ids)}) ORDER BY ts,off", ids).fetchall()
def raw(file, off, length):
    file.seek(off)
    data = file.read(length)
    return json.loads(data), hashlib.sha256(data).hexdigest()
diff = json.loads((OUT / 'experience-diff.json').read_text())
changed = {d['id']: d for d in diff}
cohorts = json.loads((OUT / 'cohorts.json').read_text())
post = [x['run_id'] for x in cohorts['post']]
pre = [x['run_id'] for x in cohorts['pre']]
issue14 = post[1:]
assert post[0] == 'W1MQ7FARJQAV' and len(issue14) == 14
save('cohort-definition.json', dict(publication='2026-10-23T14:09:54Z', cutoff='2026-10-23T21:17:26Z', issue14=issue14, actual_post15=post, actual_pre26=pre, caveat='Original issue assigns 27/14; actual publication timestamp and run-config put W1MQ7FARJQAV in post. Original cohorts.json is retained.'))
configs = []
for line in (ROOT/'logs/run-config.jsonl').open():
    x = json.loads(line)
    if x.get('run_id') in pre+post:
        configs.append(x)
save('run-config-readback.json', configs)

brain = []
with (ROOT/'logs/brain.jsonl').open('rb') as f:
    for off,length,rid,label,ts in table('llm_calls_raw', 'off,len,run_id,label,ts', pre+post):
        # llm_calls also contains other engines; offsets belong to this file only for brain.
        pass
    rows = C.execute(f"SELECT off,len,run_id,label,ts FROM read_parquet('{ROOT}/data/logdb/llm_calls_raw/*.parquet',union_by_name=true) WHERE src='brain' AND run_id IN ({','.join('?' for _ in pre+post)}) ORDER BY off", pre+post).fetchall()
    for off,length,rid,label,ts in rows:
        x,sha = raw(f,off,length)
        assert x['run_id'] == rid
        hits = set()
        calls = []
        for t in x.get('tool_calls',[]):
            if t.get('name') != 'kb_experience': continue
            value = t.get('output',{})
            try: value = json.loads(value) if isinstance(value,str) else value
            except (ValueError,TypeError): continue
            entries = value.get('entries',[]) if isinstance(value,dict) else []
            selected = [e['id'] for e in entries if isinstance(e,dict) and e.get('id') in changed]
            hits.update(selected)
            calls.append(dict(input=t.get('input'), changed_ids=selected, sources=value.get('sources',[])))
        answer = x.get('answer',{})
        answer_text = json.dumps(answer,ensure_ascii=False)
        payload = x.get('payload') or {}
        facts = payload.get('facts') or payload.get('run_brief') or {}
        brain.append(dict(run_id=rid,ts=x['ts'],off=off,length=length,sha256=sha,label=label,
            floor=facts.get('floor'),hp=facts.get('hp'),accepted=x.get('accepted'), question_id=x.get('question_id'),
            system_chars=x.get('system_chars'),system_sha=x.get('system_sha'),knowledge=x.get('knowledge'),
            returned_ids=sorted(hits),answer_exact_ids=[key for key in changed if key in answer_text],
            calls=calls, answer=answer, options=x.get('options'), problems=x.get('problems')))
save('brain-evidence.json',brain)

# Raw Jev prompts have no parquet index. Seek by timestamp, back off a whole MiB,
# then scan only the frozen interval, recording byte references and line hashes.
start = '2026-10-23T14:09:54'
end = '2026-10-23T21:17:26'
jev = []
with (ROOT/'logs/jev-prompts.jsonl').open('rb') as f:
    size = f.seek(0,2); low=0;high=size
    while high-low > 1048576:
        mid=(low+high)//2;f.seek(mid);f.readline();pos=f.tell();line=f.readline()
        if not line: high=mid;continue
        stamp=json.loads(line).get('ts','')
        if stamp < start: low=pos
        else: high=mid
    seek=max(0,low-1048576);f.seek(seek)
    if seek: f.readline()
    scan_start=f.tell(); previous=None;order_errors=0;first=None;last=None
    while True:
        off=f.tell();line=f.readline()
        if not line: break
        x=json.loads(line);stamp=x.get('ts','');first=first or stamp;last=stamp
        if previous and stamp < previous: order_errors+=1
        previous=stamp
        if stamp > end: break
        if x.get('run_id') not in post: continue
        request=json.dumps(x.get('request'),ensure_ascii=False)
        hits=[]
        for key,d in changed.items():
            lesson=d['new']['lesson']
            # Lesson lines carry scope, not ID. Changed text is matched in the
            # actual request, never the offline projection/evidence metadata.
            pattern = '.{1,100}?'.join(re.escape(part) for part in re.split(r'\{@[^}]+\}', lesson))
            if re.search(pattern, request, re.S): hits.append(key)
        jev.append(dict(run_id=x['run_id'],ts=stamp,off=off,length=len(line),sha256=hashlib.sha256(line).hexdigest(),
            floor=x.get('floor'),turn=x.get('turn'),fingerprint=x.get('fingerprint'),label=x.get('label'),
            decision_id=x.get('decision_id'),request_id=x.get('request_id'),returned_ids=hits,
            answers=x.get('answers'),decision_projection=x.get('decision_projection'),
            decision_evidence=x.get('decision_evidence')))
    scan_end=f.tell()
    save('jev-scan-receipt.json', dict(size_at_open=size,start_offset=scan_start,end_offset=scan_end,first_ts=first,last_ts=last,order_errors=order_errors,records=len(jev),method='binary timestamp seek, 1 MiB backward guard, bounded forward scan'))
save('jev-evidence.json',jev)

cols='off,len,ts,run_id,screen,floor,turn,label,decider,action,option_index,card_id,potion_id,chosen,options,choice,confidence,fallback,hp,max_hp,jev_hints,route_review,rationale,result,sl_attempt,sl_reloads'
names=cols.split(',')
decisions=[dict(zip(names,row)) for row in table('decisions',cols,pre+post)]
save('decisions-extract.json', decisions)
cols='off,len,ts,run_id,screen,in_combat,turn,act,floor,hp,max_hp,boss_id,deck_size,potions,player_hp,block,energy,enemies,incoming,map_node,go_floor,go_victory'
names=cols.split(',')
frames=[dict(zip(names,row)) for row in table('frames',cols,pre+post)]
save('frames-extract.json',frames)

counts={}
for key in changed:
    b=[x for x in brain if x['run_id'] in issue14 and key in x['returned_ids']]
    j=[x for x in jev if x['run_id'] in issue14 and key in x['returned_ids']]
    a=[x for x in brain if x['run_id'] in issue14 and key in x['answer_exact_ids']]
    counts[key]=dict(brain_returns=len(b),brain_runs=len({x['run_id'] for x in b}),brain_answer_exact=len(a),
        jev_requests=len(j),jev_runs=len({x['run_id'] for x in j}),
        brain_refs=[{k:x[k] for k in ['run_id','floor','ts','off']} for x in b],
        jev_refs=[{k:x[k] for k in ['run_id','floor','turn','ts','off']} for x in j])
save('per-experience-usage.json', counts)
print(json.dumps(dict(brain=len(brain),jev=len(jev),frames=len(frames),decisions=len(decisions),counts={k:{p:v for p,v in x.items() if not p.endswith('refs')} for k,x in counts.items()}),ensure_ascii=False,indent=2))
