import json, pathlib, subprocess, shutil

O = pathlib.Path(__file__).parent
ROOT = pathlib.Path('/home/dw/Projects/agent-sts2')
OLD = O.parent/'20261007-042707-experience-update'
RUN = '8R5CXD5C8PW8'
rows = [json.loads(s) for s in (ROOT/'logs/runs.jsonl').open()]
target = next(r for r in rows if r['run_id']==RUN)
assert target['character'].lower()=='silent'
runs = [r for r in rows if (r.get('character') or '').lower()=='silent' and r['ended']<=target['ended']]
assert [r['run_id'] for r in runs[:-1]]==json.load(open(OLD/'runs.json'))
(O/'runs.json').write_text(json.dumps([r['run_id'] for r in runs])+'\n')
(O/'run-metadata.json').write_text(json.dumps(runs,ensure_ascii=False,indent=2)+'\n')
shutil.copyfile(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json',O/'experience-before.json')
for r in runs:
    d=O/r['run_id'];d.mkdir(exist_ok=True)
    if r['run_id']!=RUN:
        for name in ['states.jsonl','decisions.jsonl','brain.jsonl','sl-attempts.jsonl','completed-runs.json']:
            (d/name).symlink_to(OLD/r['run_id']/name)
        shutil.copyfile(OLD/r['run_id']/'analyze.py',d/'analyze.py')
    else:
        for name in ['decisions','brain','sl-attempts','run-plans']:
            with (d/(name+'.jsonl')).open('w') as h:
                p=subprocess.run(['nice','-n','19','rg','--fixed-strings',RUN,str(ROOT/'logs'/(name+'.jsonl'))],stdout=h)
                assert p.returncode==0
        (d/'completed-runs.json').write_text(json.dumps(runs,ensure_ascii=False)+'\n')
        code=(OLD/'V0383V5S9BCQ/analyze.py').read_text().replace("RUN = 'V0383V5S9BCQ'", "RUN = '8R5CXD5C8PW8'")
        (d/'analyze.py').write_text(code)
        offsets=[]
        with (ROOT/'logs/states.jsonl').open('rb') as f,(d/'states.jsonl').open('wb') as h:
            f.seek(8100700000);f.readline()
            while True:
                off=f.tell();line=f.readline()
                if not line:break
                s=json.loads(line)
                if s['ts']>'2026-10-06T20:36:25.482Z':break
                state=s.get('state',{})
                if state.get('run_id')==RUN and state.get('run',{}).get('character_id','').lower()=='silent':
                    h.write(line);offsets.append(off)
        (O/'new-state-offsets.json').write_text(json.dumps(dict(first=offsets[0],last=offsets[-1],n=len(offsets)))+'\n')
        assert len(offsets)==671
for r in runs:
    d=O/r['run_id']
    with (d/'analysis.log').open('w') as h:
        subprocess.run(['nice','-n','19','python3',str(d/'analyze.py')],stdout=h,stderr=subprocess.STDOUT,check=True)
    print('复算',r['run_id'],flush=True)
for name in ['audit.py','summarize.py','slices.py']:
    code=(OLD/name).read_text()
    if name=='audit.py':code=code.replace('2026-10-06T20:01:20.463Z',target['ended'])
    if name=='summarize.py':
        code=code.replace('20261007-034303-experience-update','20261007-042707-experience-update').replace('V0383V5S9BCQ/completed-runs.json','8R5CXD5C8PW8/completed-runs.json')
    (O/name).write_text(code)
for name in ['audit.py','summarize.py']:
    with (O/(name+'.log')).open('w') as h:
        subprocess.run(['nice','-n','19','python3',str(O/name)],stdout=h,stderr=subprocess.STDOUT,check=True)
print('旧基线复算、新局汇总和切片状态抽样完成',flush=True)
