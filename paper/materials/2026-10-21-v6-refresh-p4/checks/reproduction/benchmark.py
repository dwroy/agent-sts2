import gzip, hashlib, importlib.util, json, os, resource, shutil, sqlite3, subprocess, sys, time
from pathlib import Path

WT=Path(__file__).resolve().parents[1]
ROOT=Path('/home/dw/Projects/agent-sts2')
B=WT/'knowledge/builders'
WORK=WT/'.artifacts/benchmark'
OUT=WT/'paper/materials/2026-10-21-v6-refresh-p4/checks/benchmark'
IDS=['Y427BMQH8AU6','5ZEPCTQKKXE4','YSRVLSKVU8DL','T0TP8S9MMU9Q','RBMEQGXPE9Z2','T15WXHPTM0ET','CSBNU2H9LXKD','1ZZHM2MV19YB']
def sha(b): return hashlib.sha256(b).hexdigest()
def load(path):
    spec=importlib.util.spec_from_file_location(path.stem.replace('-','_'),path)
    mod=importlib.util.module_from_spec(spec);sys.modules[spec.name]=mod;spec.loader.exec_module(mod)
    return mod
if len(sys.argv)>1:
    name,version,enabled=sys.argv[1:]
    code=WORK/version/'knowledge/builders'
    sys.path.insert(0,str(code))
    os.environ['STS2_REFRESH_CACHE_DIR']=str(WORK/('cache-'+version)) if enabled=='on' else ''
    logs=WORK/'logs'; rows=[]
    for step in ['monster','fight-rows']:
        before=time.monotonic();cpu=time.process_time()
        if step=='monster':
            mod=load(code/'build-monster-db.py')
            result=mod.build(str(logs/'states.jsonl'),str(logs/'runs.jsonl'),str(WORK/'game.json'),str(logs/'decisions.jsonl'))
            data=json.dumps(result,ensure_ascii=False,separators=(',',':')).encode()
        else:
            mod=load(code/'build-fight-value.py');target=WORK/'rows.jsonl'
            builder=mod.extract(str(logs/'states.jsonl'),str(logs/'runs.jsonl'),str(WORK/'game.json'),str(target),'silent')
            data=target.read_bytes()
        rows.append(dict(step=step,seconds=time.monotonic()-before,cpu_seconds=time.process_time()-cpu,
                         output_bytes=len(data),sha256=sha(data)))
    import legacy_incremental
    cache=legacy_incremental.context(logs/'states.jsonl')
    result=dict(name=name,version=version,enabled=enabled,steps=rows,nice=os.getpriority(os.PRIO_PROCESS,0),
                rss_kib=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
                stats=cache.index.stats if cache else None,phases=cache.timings if cache else None)
    (OUT/(name+'.json')).write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(dict(name=name,steps=rows)))
    sys.exit(0)

WORK.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
for version in ['before','after']:
    target=WORK/version/'knowledge/builders';target.mkdir(parents=True,exist_ok=True)
    for p in B.glob('*.py'): shutil.copyfile(p,target/p.name)
    (WORK/version/'learner').symlink_to(WT/'learner',target_is_directory=True)
    if version=='before':
        old=subprocess.check_output(['git','show','68c03b61a:knowledge/builders/legacy_incremental.py'],cwd=WT)
        (target/'legacy_incremental.py').write_bytes(old)
        old=subprocess.check_output(['git','show','68c03b61a:knowledge/builders/build-fight-value.py'],cwd=WT)
        (target/'build-fight-value.py').write_bytes(old)
shutil.copyfile(ROOT/'data/game-data.json',WORK/'game.json')
con=sqlite3.connect('file:'+str(ROOT/'ops/codex-ops/v6-refresh/silent/cache/rows.sqlite')+'?mode=ro',uri=True)
con.execute('BEGIN')
raw={};refs={}
for stream in ['states','decisions','runs']:
    entries=list(con.execute('SELECT offset,bytes,sha,rid FROM rows WHERE stream=? AND rid IN ('+','.join('?' for _ in IDS)+') ORDER BY offset',[stream,*IDS]))
    refs[stream]=[dict(offset=o,bytes=n,sha256=s,run_id=r) for o,n,s,r in entries]
    parts=[]
    with (ROOT/'logs'/(stream+'.jsonl')).open('rb') as source:
        for o,n,s,r in entries:
            source.seek(o);b=source.read(n)
            if sha(b)!=s: raise ValueError('original evidence SHA changed')
            parts.append(b)
    raw[stream]=parts
con.close()
cut=[i for i,r in enumerate(refs['states']) if r['run_id']==IDS[-1]]
boundary=cut[len(cut)//2];ts=json.loads(raw['states'][boundary])['ts']
def install(full):
    logs=WORK/'logs';logs.mkdir(exist_ok=True)
    for stream in raw:
        values=[]
        for i,b in enumerate(raw[stream]):
            if not full:
                if stream=='states' and i>=boundary: continue
                if stream=='runs' and refs[stream][i]['run_id']==IDS[-1]: continue
                if stream=='decisions' and json.loads(b).get('ts','')>=ts: continue
            values.append(b)
        (logs/(stream+'.jsonl')).write_bytes(b''.join(values))
    (OUT/('full-input.json' if full else 'initial-input.json')).write_text(json.dumps({
        p.name:dict(bytes=p.stat().st_size,sha256=sha(p.read_bytes())) for p in logs.iterdir()},indent=2)+'\n')
(OUT/'source-refs.json.gz').write_bytes(gzip.compress(json.dumps(refs).encode(),mtime=0))
(OUT/'identity.json').write_text(json.dumps(dict(runs=IDS,game_sha256=sha((WORK/'game.json').read_bytes()),
                                              partial_last_run_cut_ts=ts,source='Original indexed raw lines, verified individually; isolated output only'),indent=2)+'\n')
install(False)
for name,version,enabled in [('initial-original','before','off'),('initial-before-cold','before','on'),
    ('initial-before-warm','before','on'),('initial-after-cold','after','on'),('initial-after-warm','after','on')]:
    subprocess.run([sys.executable,__file__,name,version,enabled],check=True)
install(True)
for name,version,enabled in [('full-original','before','off'),('append-before','before','on'),
    ('append-after','after','on'),('full-after-warm','after','on')]:
    subprocess.run([sys.executable,__file__,name,version,enabled],check=True)
results=[json.loads(p.read_text()) for p in OUT.glob('*.json') if p.name not in ['identity.json','initial-input.json','full-input.json']]
for prefix,names in [('initial',['initial-original','initial-before-cold','initial-before-warm','initial-after-cold','initial-after-warm']),
                     ('full',['full-original','append-before','append-after','full-after-warm'])]:
    group=[r for r in results if r['name'] in names]
    for i in range(2):
        if len({r['steps'][i]['sha256'] for r in group})!=1: raise ValueError('output parity failed: '+prefix+str(i))
(OUT/'parity.json').write_text(json.dumps(dict(equal=True,initial=5,full=4,outputs=['monster result and records','serialized fight training rows']),indent=2)+'\n')
