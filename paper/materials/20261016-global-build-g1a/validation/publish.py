"""Publish only audited G1a knowledge, retaining live refreshes and all parallel work."""
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

OUT = Path(__file__).resolve().parent
WORK = OUT.parents[2]
ROOT = Path('/home/dw/Projects/agent-sts2')
LIVE = ROOT / '.worktrees/live'
PAPER = 'paper/materials/20261016-global-build-g1a'
SOURCE = sys.argv[1]
BASE = '50e2da099a5e1745878070ea960f3160324f2217'
ENV = {**os.environ, 'PATH':str(Path.home()/'.local/node/bin')+':'+os.environ['PATH'], 'TMPDIR':str(OUT)}
COAUTHOR = '\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>'
state = {'source':SOURCE, 'merged':None, 'publication':None, 'request_id':'roy-20261016-global-build-g1a', 'revision':1}


def run(args, cwd=LIVE, check=True, env=ENV):
    r = subprocess.run(args,cwd=cwd,env=env,capture_output=True,text=True)
    if check and r.returncode: raise RuntimeError(str(args[:3])+': '+r.stderr[-1200:])
    return r


def git(*args,cwd=LIVE,env=ENV):
    return run(['git','-c','core.hooksPath=/dev/null',*args],cwd=cwd,env=env).stdout.strip()


def save():
    (OUT/'publication.json').write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None


def commit(message,label,cwd=LIVE):
    scan=run(['nice','-n','19','gitleaks','git','--pre-commit','--staged','--redact','--no-banner'],cwd=cwd,check=False)
    (OUT/(label+'-gitleaks.log')).write_text(scan.stdout+scan.stderr)
    assert scan.returncode==0, 'gitleaks failed '+label
    git('commit','-m',message+COAUTHOR,cwd=cwd)
    return git('rev-parse','HEAD',cwd=cwd)


def tree(commit_id):
    return {line.split('\t')[1]:line.split('\t')[0] for line in git('ls-tree','-r',commit_id).splitlines()}


def notification():
    at=run(['date','+%Y-%m-%d %H:%M:%S %Z']).stdout.strip()
    text=f'\n- {at} G1a知识阶段：request=roy-20261016-global-build-g1a revision=1，原050119/thread01a1415e-a511-7131-be7c-a2dc691c847f。旧：R366固定表及4局double-boss曲线已有，但活跃经验未逐Boss列质量缺口。新：经验2026-10-16.g1a-r1新增4条边界、限定原resource-handoff；沙漏34/女王29/实验体27独立验证局仍失败质量闸，数量各缺0、质量需多少未知；原生产70输入差与本轮冻结71差分列。六局原字节端点/实际敌人/开场资源变化已交机器契约，平均HP和旧0/4、8192模拟不当联合胜率，7S8后场SL胜反例保留。证据/账本silent-0494、原silent-0491/0228；源码{SOURCE}、实际合入{state["merged"]}、发布{state["publication"]}/tree{state["fixed_release_tree"]}、{state["version"]}（正式号交ops核）。固定实际消费者5条及角色/进阶隔离通过；无自然采用/收益声明。原模型/切分/阈值、其他角色和并行刷新保持；预期仅使知识消费者看见可信边界/unknown，回退只撤本轮4新经验与旧handoff追加限定并保并行条目。questions见{PAPER}/questions.json，请ops沿原链转watcher→Roy；未代ACK，不关闭校准/0332/global-build父或原策略提案；通用接口由watcher实现。\n'
    payload=text.encode(); records=[]
    for path in [ROOT/'notes/for-roy.md',ROOT/'ops/inbox-dev.md']:
        with path.open('a+b') as h:
            fcntl.flock(h,fcntl.LOCK_EX); off=h.seek(0,os.SEEK_END); h.write(payload);h.flush();os.fsync(h.fileno());h.seek(off);assert h.read(len(payload))==payload
        records.append({'path':str(path),'offset':off,'bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest()})
    (OUT/'notification.json').write_text(json.dumps({'at':at,'evidence':records,'scope':'Actual append/readback only; no watcher/Roy ACK.'},ensure_ascii=False,indent=2)+'\n')


assert json.loads((OUT/'validation.json').read_text())['raw_state_sha']==30
assert json.loads((OUT/'candidate-consumer-output.json').read_text())['experience_version']=='2026-10-16.g1a-r1'
assert json.loads((OUT/'check-experience.json').read_text())['missing']==[]
paths=git('diff','--name-only',BASE,SOURCE,cwd=WORK).splitlines()
assert paths and all(p=='knowledge/characters/silent/experience.json' or p.startswith(PAPER+'/') for p in paths)
assert git('status','--porcelain',cwd=WORK)==''
lock=(ROOT/'ops/live-merge.lock').open('a')
try:
    fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
except BlockingIOError:
    state['blocked']='Existing live merge/check lock busy; live untouched.';save();raise SystemExit(3)
state['initial_live']=git('rev-parse','HEAD')
assert run(['git','rev-parse','--verify','MERGE_HEAD'],check=False).returncode!=0
assert run(['git','diff','--cached','--quiet'],check=False).returncode==0
state['host_pid_scope']='Learner namespace cannot verify host process exit; use final builder output and stable knowledge as in original publication.'
while True:
    if run(['pgrep','-f','knowledge/builders/buil[d]-'],check=False).returncode==0:
        print('Waiting for visible knowledge refresh.',flush=True);time.sleep(15);continue
    signatures=lambda:{str(p.relative_to(LIVE)):(p.stat().st_size,p.stat().st_mtime_ns) for p in (LIVE/'knowledge').rglob('*') if p.is_file()}
    before=signatures()
    ended=[json.loads(s) for s in (ROOT/'logs/runs.jsonl').open()]
    last=max(dt.datetime.fromisoformat(r['ended'].replace('Z','+00:00')).timestamp() for r in ended if str(r.get('character','')).lower()=='silent' and r.get('ended'))
    note=LIVE/'notes/fight-value-backtest-silent.md'
    if note.stat().st_mtime<last or time.time()-note.stat().st_mtime<60:
        print('Waiting for final builder output.',flush=True);time.sleep(15);continue
    print('Checking stable live knowledge for 30 seconds.',flush=True);time.sleep(30)
    if before==signatures():
        state['refresh_check']={'latest_end_epoch':last,'final_note_mtime':note.stat().st_mtime,'stable_seconds':30,'host_exit_verified':False};break
status=run(['git','status','--porcelain','--untracked-files=all']).stdout.rstrip('\n')
(OUT/'live-status-before.txt').write_text(status+'\n')
dirty=[s[3:] for s in status.splitlines()]
assert not any('.env' in Path(p).name for p in dirty), 'protected pending path'
refresh=[p for p in dirty if p.startswith('knowledge/') or p in ['notes/fight-value-backtest-silent.md','notes/monster-db-check.md']]
other=[p for p in dirty if p not in refresh]
state['refresh_sha256']={p:sha(LIVE/p) for p in refresh}
state['unrelated_dirty_sha256']={p:sha(LIVE/p) for p in other}
state['overlap']=sorted(set(paths)&set(dirty))
assert not state['overlap'], 'concurrent knowledge overlap'
assert (LIVE/'knowledge/characters/silent/experience.json').read_bytes()==(OUT/'before.json').read_bytes(), 'parallel experience changed'
if refresh:
    git('add','--sparse','--',*refresh);state['refresh_commit']=commit('Save live generated knowledge before G1a experience delivery','refresh')
before_code=state['before_code']=git('rev-parse','HEAD')
old=tree(before_code)
for p in paths:
    if p.startswith(PAPER+'/'): assert p not in old, 'concurrent G1a material exists'
index_env={**ENV,'GIT_INDEX_FILE':str(OUT/'preflight.index')}
git('read-tree',before_code,env=index_env)
for p in paths:
    mode,_,blob=git('ls-tree',SOURCE,'--',p).split('\t')[0].split()
    git('update-index','--add','--cacheinfo',mode,blob,p,env=index_env)
state['preflight_tree']=git('write-tree',env=index_env)
save()
try:
    git('merge','--no-ff','--no-commit','-s','ours',SOURCE)
    git('restore','--source',SOURCE,'--staged','--worktree','--ignore-skip-worktree-bits','--',*paths)
    assert git('write-tree')==state['preflight_tree']
    command=['nice','-n','19','node','--import',str(LIVE/'agent/node_modules/tsx/dist/loader.mjs'),str(OUT/'consumer.mts'),str(LIVE),str(OUT/'consumer-input.json'),str(OUT/'live-consumer-output.json')]
    result=run(command,check=False)
    (OUT/'live-consumer.log').write_text(result.stdout+result.stderr)
    (OUT/'live-consumer-command.json').write_text(json.dumps({'argv':command,'cwd':str(LIVE),'exit':result.returncode},indent=2)+'\n')
    assert result.returncode==0,'actual live consumer failed'
    state['merged']=commit('Publish Silent G1a calibration boundary experience','merge')
    state['tested_tree']=git('rev-parse','HEAD^{tree}')
    assert state['tested_tree']==state['preflight_tree']
    now=tree('HEAD'); assert {p:v for p,v in old.items() if p not in paths}=={p:v for p,v in now.items() if p not in paths}
    assert all(sha(LIVE/p)==s for p,s in state['refresh_sha256'].items())
    assert all(sha(LIVE/p)==s for p,s in state['unrelated_dirty_sha256'].items())
    state['other_blobs_preserved']=True
    live_exp=json.loads((LIVE/'knowledge/characters/silent/experience.json').read_text())
    ids=json.loads((WORK/PAPER/'experience-links.json').read_text())['entries']
    refs=[{'id':e['id'],'sha256':hashlib.sha256(json.dumps(e,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()} for e in live_exp['entries'] if e['id'] in ids]
    validation=WORK/PAPER/'validation'
    for name in ['live-consumer-output.json','live-consumer.log','live-consumer-command.json']:
        shutil.copyfile(OUT/name,validation/name)
    evidence=[{'path':str(validation/name),'sha256':sha(validation/name)} for name in ['consumer-input.json','consumer.mts','live-consumer-output.json','live-consumer.log','live-consumer-command.json']]
    receipt={'request_id':state['request_id'],'revision':1,'character':'silent','experience_version':live_exp['version'],'kind':'fixed-consumer','status':'passed','live_commit':state['merged'],'tested_tree':state['tested_tree'],'evidence':evidence,'entries':refs,'scope':'Actual production loader/render/query readback; no natural use, joint interface or outcome effect claim.'}
    (validation/'consumer-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
    docs=[PAPER+'/validation/'+name for name in ['live-consumer-output.json','live-consumer.log','live-consumer-command.json','consumer-receipt.json']]
    git('add','--sparse','--force','--',*docs,cwd=WORK)
    state['receipt_source']=commit('Record actual G1a live experience consumer receipt','receipt',cwd=WORK)
    git('merge','--no-ff','--no-commit','-s','ours',state['receipt_source'])
    git('restore','--source',state['receipt_source'],'--staged','--worktree','--ignore-skip-worktree-bits','--',*docs)
    at=run(['date','+%Y-%m-%d %H:%M:%S %Z']).stdout.strip()
    versions_path=LIVE/'eval/versions.json'; versions=json.loads(versions_path.read_text()); items=versions if isinstance(versions,list) else versions['versions']
    state['version']='V5.silent-g1a-knowledge1'
    assert not any(v['name']==state['version'] for v in items)
    items.append({'name':state['version'],'family':'V5','character':'SILENT','commit':state['merged'],'source':at+'; G1a r1 Silent experience2026-10-16.g1a-r1, ledger silent-0494; source '+SOURCE+'; 4 new calibration boundary entries and 1 bounded resource handoff; fixed consumers5/role/asc passed; data only, no new simulation or thresholds; R366 fixed107/460 and old70/current71 input differences retained. Official release id by ops; no natural use/effect or parent completion claim.'})
    versions_path.write_text(json.dumps(versions,ensure_ascii=False,indent=2)+'\n')
    with (LIVE/'paper/materials/decision-log.md').open('a') as h:
        h.write(f'\n- {at} 学习者G1a r1实际入库：source{SOURCE}→live{state["merged"]}，经验2026-10-16.g1a-r1/{state["version"]}，silent-0494；三幕34/29/27例质量仍失败、固定/生产70/71输入差分列，六局既有资源端点和联合率unknown；真实固定消费者5条及角色/进阶隔离通过，30原帧/70结局身份原行SHA、24四闸行核。仅数据，复用原检查，不重跑模型/全套，非自然采用/胜率提升；保刷新与其他源码/知识/脏记录；通用连战接口/自然消费归watcher，校准/0332/global-build父不关闭。\n')
    git('add','--sparse','--','eval/versions.json','paper/materials/decision-log.md')
    state['publication']=commit('Record G1a knowledge version and actual consumer readback','publication')
    state['fixed_release_tree']=git('rev-parse','HEAD^{tree}')
    state['experience_refs']=refs
    state['consumer_receipt']={'path':str(validation/'consumer-receipt.json'),'sha256':sha(validation/'consumer-receipt.json')}
    state['release_id']=None
    state['release_id_status']='Ops allocates after checking actual publication; version recorded, no approval requested.'
    assert run(['git','merge-base','--is-ancestor',SOURCE,'HEAD']).returncode==0
    assert run(['git','merge-base','--is-ancestor',state['receipt_source'],'HEAD']).returncode==0
    assert all(sha(LIVE/p)==sha(WORK/p) for p in paths+docs)
    save();notification();print(json.dumps(state,ensure_ascii=False),flush=True)
except BaseException as error:
    (OUT/'failed-live-diff.patch').write_text(run(['git','diff','HEAD'],check=False).stdout)
    if run(['git','rev-parse','--verify','MERGE_HEAD'],check=False).returncode==0: git('merge','--abort')
    if state['merged'] and not state['publication']:
        state['rolled_back_commit']=state['merged']
        git('reset','--mixed',before_code)
        affected=paths+[PAPER+'/validation/'+n for n in ['live-consumer-output.json','live-consumer.log','live-consumer-command.json','consumer-receipt.json']]+['eval/versions.json','paper/materials/decision-log.md']
        existing=[p for p in affected if p in old]
        git('restore','--source',before_code,'--staged','--worktree','--',*existing)
        for p in set(affected)-set(existing): (LIVE/p).unlink(missing_ok=True)
        state['merged']=None
    state['error']=str(error);save();raise
