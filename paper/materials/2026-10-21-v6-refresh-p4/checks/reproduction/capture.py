import datetime, gzip, hashlib, json, subprocess
from pathlib import Path

ROOT = Path('/home/dw/Projects/agent-sts2')
WT = Path(__file__).resolve().parents[1]
OUT = WT / 'paper/materials/2026-10-21-v6-refresh-p4/checks/capture-v2'
OUT.mkdir(parents=True, exist_ok=True)
refs = []
def sha(b): return hashlib.sha256(b).hexdigest()
def write(name, value):
    (OUT/name).write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n')
def capture(p, name):
    b = p.read_bytes()
    (OUT/(name+'.gz')).write_bytes(gzip.compress(b, mtime=0))
    refs.append(dict(path=str(p), bytes=len(b), sha256=sha(b), copy=name+'.gz'))
    return b
def rows(b): return [json.loads(l) for l in b.splitlines() if l]
def git(tree): return subprocess.check_output(['git','-C',str(tree),'rev-parse','HEAD'],text=True).strip()
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
write('identities.json', dict(captured_at=now, main=git(ROOT), live=git(ROOT/'.worktrees/live'), task=git(WT),
    native_session='01a15382-761a-76a2-922d-271169b2463c', account='codex1',
    authorization='Claude 2026-10-21 02:5x P4; logs read only; isolated fixed input work only'))
runs=rows(capture(ROOT/'logs/runs.jsonl','runs.jsonl'))
configs=rows(capture(ROOT/'logs/run-config.jsonl','run-config.jsonl'))
snaps=rows(capture(ROOT/'logs/v6-history-snapshots.jsonl','snapshots.jsonl'))
capture(ROOT/'ops/refresh.log','refresh.log')
timing=rows(capture(ROOT/'ops/refresh-timing.jsonl','timing.jsonl'))
selected={r['run_id'] for r in runs if r.get('ended','')>='2026-10-20T13:29:38'}
selected.update(s['run_id'] for s in snaps if s.get('loaded_at','')>='2026-10-20T13:29:38')
selected.update(c['run_id'] for c in configs if c.get('ts','')>='2026-10-20T13:29:38')
write('runs.json',[r for r in runs if r.get('run_id') in selected])
write('configs.json',[r for r in configs if r.get('run_id') in selected])
write('snapshots.json',[r for r in snaps if r.get('run_id') in selected])
write('timing.json',[r for r in timing if r.get('started_at','')>='2026-10-20T13:00'])
receipts=[]
for p in sorted((ROOT/'ops/codex-ops/v6-refresh/silent').glob('*/receipt.json')):
    r=json.loads(capture(p,p.parent.name+'-receipt.json'))
    steps=[]
    for s in r.get('steps',[]):
        steps.append({k:v for k,v in s.items() if k!='argv'})
        for stream in ('stdout','stderr'):
            f=p.parent/(s['name']+'.'+stream)
            if f.exists(): capture(f,p.parent.name+'-'+s['name']+'.'+stream)
    member={}
    packp=p.parent/'v6-history.json'
    if packp.exists() and r.get('status')=='published':
        b=packp.read_bytes(); pack=json.loads(b)
        member=dict(file_sha256=sha(b),content_sha256=pack['content_sha256'],cutoff=pack['data']['cutoff'],
          generated_at=pack['generated_at'],
          combo_membership={rid:[c['id'] for c in pack['data']['combo_metrics']
            if any(rid in s['run_ids'] for m in c['metrics'] for s in m['sources'])] for rid in selected},
          ended_membership=sorted(set(r.get('ended_runs',[]))&selected))
    receipts.append(dict(name=p.parent.name,started_at=r.get('started_at'),ended_at=r.get('ended_at'),
      status=r.get('status'),exit_code=r.get('exit_code'),error=r.get('error'),steps=steps,
      run_count=len(r.get('ended_runs',[])),incremental=r.get('incremental'),freeze_seconds=r.get('freeze_seconds'),
      index_seconds=r.get('index_seconds'),verify_prefix_seconds=r.get('verify_prefix_seconds'),pack=member))
write('receipts.json',sorted(receipts,key=lambda r:r.get('started_at') or ''))
write('raw-inputs.json',refs)
print(json.dumps(dict(output=str(OUT),captured_at=now,selected=sorted(selected),receipts=len(receipts),raw_files=len(refs))))
