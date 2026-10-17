"""Integrate only H0's owned changes under the existing live lock, retaining refreshes and parallel code."""
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time

OUT=Path(__file__).resolve().parent
WORK=OUT.parents[2]
ROOT=Path('/home/dw/Projects/agent-sts2')
LIVE=ROOT/'.worktrees/live'
BASE='54e36d0830ab640130557b62a078b25954912ff4'
SOURCE=sys.argv[1]
assert re.fullmatch('[0-9a-f]{40}',SOURCE)
ATTEMPT=OUT/('live-publish-'+dt.datetime.now().strftime('%Y%m%d-%H%M%S'))
ATTEMPT.mkdir()
PAPER='paper/materials/20261017-human-pace-h0'
ENV={**os.environ,'PATH':str(Path.home()/'.local/node/bin')+':'+os.environ['PATH'],'TMPDIR':str(OUT),'SANDBOX_WORKERS':'1'}
ENV.pop('GIT_INDEX_FILE',None)
COAUTHOR='\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>'
state={'request_id':'roy-20261017-human-pace-h0','revision':1,'source':SOURCE,'attempt':str(ATTEMPT),'merged':None,'publication':None,'release_id':None,'scope':'H0 source/experience phase only; fixed tuning cache complete, 481 validation keys pending.'}

def run(args,cwd=LIVE,env=ENV,check=True,data=None):
    result=subprocess.run(args,cwd=cwd,env=env,input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if check and result.returncode:raise RuntimeError(str(args[:4])+': '+result.stderr.decode(errors='replace')[-2000:])
    return result

def git(*args,cwd=LIVE,env=ENV):return run(['git','-c','core.hooksPath=/dev/null',*args],cwd=cwd,env=env).stdout.decode().strip()
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def save(): (OUT/'publication.json').write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n');(ATTEMPT/'publication.json').write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n')
def blob(ref,path,cwd=LIVE):
    result=run(['git','show',ref+':'+path],cwd=cwd,check=False)
    return result.stdout if result.returncode==0 else None

def commit(message,label,cwd=LIVE):
    scan=run(['nice','-n','19','gitleaks','git','--pre-commit','--staged','--redact','--no-banner'],cwd=cwd,check=False)
    (ATTEMPT/(label+'-gitleaks.log')).write_bytes(scan.stdout+scan.stderr)
    assert scan.returncode==0,'gitleaks '+label
    git('commit','-m',message+COAUTHOR,cwd=cwd)
    return git('rev-parse','HEAD',cwd=cwd)

def merge_experience(base,ours,current):
    b=json.loads(base);o=json.loads(ours);c=json.loads(current)
    bm={e['id']:e for e in b['entries']};om={e['id']:e for e in o['entries']};cm={e['id']:e for e in c['entries']}
    changed=[ident for ident,e in om.items() if bm.get(ident)!=e]
    assert len(changed)==9
    for ident in changed:assert cm.get(ident) in [bm.get(ident),om[ident]],'parallel experience overlap '+ident
    c['entries']=[om[e['id']] if e['id'] in changed else e for e in c['entries']]
    c['entries'].extend(om[ident] for ident in changed if ident not in cm)
    c['version']=o['version'];assert len({e['id'] for e in c['entries']})==len(c['entries'])
    state['experience_owned_ids']=changed;state['experience_version']=c['version']
    return (json.dumps(c,ensure_ascii=False,indent=2)+'\n').encode()

def merged_content(path,current,base,ours):
    if current==base or current==ours:return ours
    if path=='knowledge/characters/silent/experience.json':return merge_experience(base,ours,current)
    if path=='paper/materials/decision-log.md':
        assert ours.startswith(base),'source decision-log is not append-only'
        return current+ours[len(base):]
    if base is None:raise RuntimeError('new owned path already has different content: '+path)
    folder=ATTEMPT/'three-way'/path;folder.parent.mkdir(parents=True,exist_ok=True)
    for name,data in [('current',current),('base',base),('source',ours)]:folder.with_name(folder.name+'.'+name).write_bytes(data)
    result=run(['git','merge-file','-p','--diff3',str(folder.with_name(folder.name+'.current')),str(folder.with_name(folder.name+'.base')),str(folder.with_name(folder.name+'.source'))],check=False)
    folder.with_name(folder.name+'.merged').write_bytes(result.stdout)
    if result.returncode:raise RuntimeError('owned source overlap needs exact three-way resolution: '+path)
    return result.stdout

def observe_model_boundary(label):
    provenance=json.loads((Path(cache['archive'])/'model-provenance.json').read_text())
    entries=[]
    for path,expected in provenance['input_files'].items():
        assert not path.startswith('knowledge/characters/') or path.startswith('knowledge/characters/silent/')
        target=LIVE/path
        actual=sha(target) if target.is_file() else None
        entries.append({'path':path,'frozen_model_sha256':expected,'actual_worktree_sha256':actual,'different':actual!=expected})
    result={'at':dt.datetime.now(dt.timezone.utc).isoformat(),'live_head':git('rev-parse','HEAD'),'live_tree':git('rev-parse','HEAD^{tree}'),'frozen_model_sha256':cache['model_sha256'],'frozen_leaf_count':len(entries),'different':sum(e['different'] for e in entries),'entries':entries,'scope':'Per-leaf current observations against the frozen 276-input research object. This is not the entire new production import closure, an atomic runtime capture, a new calibration or validation of H1 partial budgets. Fresh data/H1/helical changes and old 7e1193/R366 differences remain separate.'}
    path=ATTEMPT/(label+'.json');path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    state[label]={'path':str(path),'sha256':sha(path),'different':result['different']}
    return path

def notify():
    at=run(['date','+%Y-%m-%d %H:%M:%S %Z']).stdout.decode().strip()
    questions=json.loads((OUT/'questions.json').read_text())
    text=f'\n- {at} H0/r1学习者实际磁盘发布（未重启或热改当前已加载局）：原050119/thread01a1415e-a511-7131-be7c-a2dc691c847f；source {SOURCE}，代码合入 {state["merged"]}，发布 {state["publication"]}/tree {state["fixed_release_tree"]}，{state["version"]}（正式release_id交ops核，未冒用H1/G4号）。旧：后续已生效虚弱统一0.75，纸鹤A2旧经验未被该模型消费；新：仅SILENT A2、有效纸鹤聚合体四招六上下文采用日志40%减伤，9意图端点相符/1独立局，其他角色/A10/未见上下文保持原路；不改费用、药水、保血、SL或排序阈值。账本silent-0500/0501仍proposed，提案6ddd086196022f15；原计数误加已经CLI追加勘误，原稿/旧记录不改。证据ZZMYZ5UBCG72 F48T2–T7及203结束回合窗口；179可回放178净损相符，24 no solve保未知，17旧末帧时点差不等于已隔离敌招因果。源/实际新组合sandbox通过及9条实际消费者读回见{ATTEMPT}与{PAPER}/validation。新模型{state["model_sha256"]}的107调参缓存完成（每端106成功），481验证未运行；不发布新boss-trust、不关闭H0/0332/human-pace，F49联合率/H1部分预算/自然收益仍未知。预期仅缩小已观察A2后续意图偏差及明确知识限制；回退仅逆向撤H0两个源码叶的改动及九条H0经验变更，保并行知识/刷新/H1，实际行为回退另记新版本。请ops核实际源码/发布树、正式号、外部新组合检查及shipped；以下异议原文按ops→watcher→Roy原链转交，不代ACK：\n'+json.dumps(questions,ensure_ascii=False,indent=2)+'\n'
    payload=text.encode();records=[]
    for path in [ROOT/'notes/for-roy.md',ROOT/'ops/inbox-dev.md']:
        with path.open('a+b') as h:
            fcntl.flock(h,fcntl.LOCK_EX);off=h.seek(0,os.SEEK_END);h.write(payload);h.flush();os.fsync(h.fileno());h.seek(off);assert h.read(len(payload))==payload
        records.append({'path':str(path),'offset':off,'bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest()})
        (OUT/'notification.json').write_text(json.dumps({'at':at,'actor':'learner','status':'partial' if len(records)<2 else 'appended-and-read-back','evidence':records,'scope':'Authorized final dual notification append only; not ops/watcher/Roy ACK.'},ensure_ascii=False,indent=2)+'\n')
    (OUT/'notification.json').write_text(json.dumps({'at':at,'actor':'learner','status':'appended-and-read-back','evidence':records,'scope':'Actual authorized dual notification append only; not ops/watcher/Roy ACK.'},ensure_ascii=False,indent=2)+'\n')

assert (OUT/'source-sandbox-v2.exit').read_text().strip()=='0'
assert json.loads((OUT/'test-history-restored-v2.json').read_text())['restored'] is True
assert json.loads((OUT/'check-experience.json').read_text())['missing']==[]
assert (OUT/'questions.json').is_file()
for name in ['consumer-v2.mts','input-read-guard.mjs','run-consumer.py']:
    assert (WORK/PAPER/'validation'/name).is_file()
cache=json.loads((OUT/'tuning-cache-v2.json').read_text());state['model_sha256']=cache['model_sha256']
paths=git('diff','--name-only',BASE,SOURCE,cwd=WORK).splitlines()
allowed=lambda p:p in ['agent/src/reflex/rollout.ts','agent/src/reflex/rollout-live.ts','agent/tests/silent-boss-weak.test.ts','knowledge/characters/silent/experience.json','paper/materials/decision-log.md'] or p.startswith(PAPER+'/') or any(p.startswith('experiments/boss-sim/silent/'+a+'/') for a in [cache['artifact'],cache['previous_preserved_artifact']])
assert paths and all(allowed(p) for p in paths),paths
assert git('status','--porcelain',cwd=WORK)==''
state['owned_paths']=paths
lock=(ROOT/'ops/live-merge.lock').open('a')
try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
except BlockingIOError:state['error']='live-merge.lock busy; live untouched';save();raise SystemExit(3)
before_code=None
try:
    state['initial_live']=git('rev-parse','HEAD')
    assert run(['git','rev-parse','--verify','MERGE_HEAD'],check=False).returncode!=0
    assert run(['git','diff','--cached','--quiet'],check=False).returncode==0
    state['refresh_process_scope']='Host PIDs invisible in learner namespace; use final Silent builder note and a stable knowledge window, not an invented host-exit claim.'
    def signatures():
        try:return {str(p.relative_to(LIVE)):(p.stat().st_size,p.stat().st_mtime_ns) for p in (LIVE/'knowledge').rglob('*') if p.is_file()}
        except FileNotFoundError:return None
    while True:
        before=signatures()
        if before is None:time.sleep(5);continue
        ended=[json.loads(line) for line in (ROOT/'logs/runs.jsonl').open()]
        last=max(dt.datetime.fromisoformat(r['ended'].replace('Z','+00:00')).timestamp() for r in ended if r.get('character')=='SILENT' and r.get('ended'))
        final=LIVE/'notes/fight-value-backtest-silent.md'
        if not final.exists() or final.stat().st_mtime<last or time.time()-final.stat().st_mtime<60:
            print('Waiting for final Silent builder output.',flush=True);time.sleep(15);continue
        print('Checking stable live knowledge for 30 seconds.',flush=True);time.sleep(30)
        if before==signatures():state['refresh_check']={'latest_end_epoch':last,'final_note_mtime':final.stat().st_mtime,'stable_seconds':30,'host_exit_verified':False};break
    status=run(['git','status','--porcelain','--untracked-files=all']).stdout.decode().rstrip('\n')
    (ATTEMPT/'live-status-before.txt').write_text(status+'\n')
    dirty=[line[3:] for line in status.splitlines()]
    assert not any(p.startswith(('agent/','learner/','eval/','ops/')) and p.endswith(('.ts','.js','.py','.mjs')) for p in dirty),'uncommitted parallel executable source in live'
    refresh=[p for p in dirty if p.startswith('knowledge/common/') and p.endswith('.json') or p.startswith('knowledge/characters/silent/') and p.endswith('.json') or p in ['notes/fight-value-backtest-silent.md','notes/monster-db-check.md']]
    for p in refresh:
        assert p not in paths or p=='knowledge/characters/silent/experience.json','pending refresh overlaps unexpected owned path '+p
        if p.endswith('.json'):json.loads((LIVE/p).read_text())
    state['refresh_files']=refresh;state['refresh_sha256']={p:sha(LIVE/p) for p in refresh}
    if refresh:
        git('add','--sparse','--',*refresh)
        state['refresh_commit']=commit('Preserve live knowledge refresh before H0 model integration','refresh')
    before_code=git('rev-parse','HEAD');state['before_code']=before_code
    index_env={**ENV,'GIT_INDEX_FILE':str(ATTEMPT/'preflight.index')}
    git('read-tree','HEAD',env=index_env)
    comparisons=[]
    for path in paths:
        b=blob(BASE,path,cwd=WORK);o=blob(SOURCE,path,cwd=WORK);c=blob(before_code,path)
        assert o is not None
        if c is None:assert b is None;merged=o
        elif path=='knowledge/characters/silent/experience.json':merged=merge_experience(b,o,c)
        else:merged=merged_content(path,c,b,o)
        stored=run(['git','hash-object','-w','--stdin'],data=merged).stdout.decode().strip()
        mode=git('ls-tree',SOURCE,'--',path,cwd=WORK).split()[0]
        git('update-index','--add','--cacheinfo',mode+','+stored+','+path,env=index_env)
        comparisons.append({'path':path,'source_blob':git('rev-parse',SOURCE+':'+path,cwd=WORK),'published_blob':stored,'combined_with_parallel':merged!=o})
    state['path_blobs']=comparisons;state['preflight_tree']=git('write-tree',env=index_env)
    save()
    git('merge','--no-ff','--no-commit','-s','ours',SOURCE)
    git('read-tree',state['preflight_tree'])
    git('restore','--source',state['preflight_tree'],'--worktree','--ignore-skip-worktree-bits','--',*paths)
    state['merged']=commit('Publish evidence-bounded Silent H0 boss damage model and experience','code-merge')
    assert git('rev-parse','HEAD^{tree}')==state['preflight_tree']
    observe_model_boundary('model-boundary-at-merge')
    save()
    started=run(['date','+%Y-%m-%d %H:%M:%S %Z']).stdout.decode().strip();state['live_test_started']=started
    with (ATTEMPT/'live-sandbox.log').open('wb') as log:checked=subprocess.run(['nice','-n','19','bash','tools/test-sandbox.sh'],cwd=LIVE/'agent',env=ENV,stdout=log,stderr=subprocess.STDOUT)
    (ATTEMPT/'live-sandbox.exit').write_text(str(checked.returncode)+'\n');state['live_sandbox_exit']=checked.returncode;save()
    assert checked.returncode==0,'actual live combination sandbox failed; original log retained'
    observe_model_boundary('model-boundary-after-test')
    label='live-consumer-'+state['merged'][:12]
    probe=run(['nice','-n','19','python3',str(OUT/'run-consumer.py'),'--root',str(LIVE),'--label',label,'--expected-head',state['merged']],check=False)
    (ATTEMPT/'consumer-wrapper.log').write_bytes(probe.stdout+probe.stderr)
    assert probe.returncode==0,'actual live experience consumer failed'
    output=json.loads((OUT/(label+'-output.json')).read_text())
    validation=WORK/PAPER/'validation';validation.mkdir(parents=True,exist_ok=True)
    names=[label+suffix for suffix in ['-input.json','-output.json','-command.json','-observation-before.json','-observation-after.json','-read-guard.json','.log']]
    for name in names:shutil.copyfile(OUT/name,validation/name)
    for label in ['model-boundary-at-merge','model-boundary-after-test']:
        name=label+'.json';shutil.copyfile(ATTEMPT/name,validation/name);names.append(name)
    evidence=[{'path':str(validation/name),'sha256':sha(validation/name)} for name in names]
    evidence.extend({'path':str(WORK/PAPER/'validation'/name),'sha256':sha(WORK/PAPER/'validation'/name)} for name in ['consumer-v2.mts','input-read-guard.mjs','run-consumer.py'])
    refs=[{'id':e['id'],'sha256':e['sha256']} for e in output['checks']]
    receipt={'request_id':state['request_id'],'revision':1,'character':'silent','experience_version':output['experience_version'],'kind':'fixed-consumer','status':'passed','live_commit':state['merged'],'tested_tree':state['preflight_tree'],'evidence':evidence,'entries':refs,'scope':'Actual nine-object production loader/render/query readback; source/experience phase only, no 481-key validation, natural effect or parent completion.'}
    (validation/'consumer-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
    docs=[PAPER+'/validation/'+name for name in names+['consumer-receipt.json']]
    git('add','--sparse','--force','--',*docs,cwd=WORK)
    state['receipt_source']=commit('Record actual Silent H0 live experience consumer receipt','receipt-source',cwd=WORK)
    git('merge','--no-ff','--no-commit','-s','ours',state['receipt_source'])
    git('restore','--source',state['receipt_source'],'--staged','--worktree','--ignore-skip-worktree-bits','--',*docs)
    at=run(['date','+%Y-%m-%d %H:%M:%S %Z']).stdout.decode().strip()
    version_file=LIVE/'eval/versions.json';versions=json.loads(version_file.read_text());items=versions['versions'] if isinstance(versions,dict) else versions
    state['version']='S1.silent-h0-boss-model1';assert not any(v['name']==state['version'] for v in items)
    items.append({'name':state['version'],'family':items[-1].get('family','V5'),'character':'SILENT','commit':state['merged'],'release_status':'pending-primary-ops','source':at+'; H0/r1 source '+SOURCE+'; Silent A2 Paper Krane Amalgam already-active Weak only, 9 observed intents/1 independent run and 8 fixed unit cases; nine bounded experience objects '+state['experience_version']+'. Ledger0500/0501 proposed; original counts correction retained. Source and actual live-combination sandbox passed, actual fixed consumer9 passed. Frozen repaired model '+state['model_sha256']+' tuning107 keys complete (106 successful per start), validation481 pending: no new boss-trust or natural/H1 partial-budget/F49 joint reliability claim. Preserve all other roles, unobserved contexts, thresholds, H1,0332 and parent ownership; official release id and exact external combination check by ops.'})
    version_file.write_text(json.dumps(versions,ensure_ascii=False,indent=2)+'\n')
    with (LIVE/'paper/materials/decision-log.md').open('a') as handle:handle.write(f'\n- {at} H0/r1实际代码/知识阶段上线：source{SOURCE}→live{state["merged"]}，经验{state["experience_version"]}/{state["version"]}，silent-0500/0501 proposed；SILENT A2纸鹤聚合体后续已有虚弱六上下文窄修，九个原意图端点相符，source及新组合sandbox0、实际消费者9条通过。107调参缓存完成、481验证待原thread接续，旧四闸/低可信及失败原件保留，不发布空trust、不关闭H0/0332/human-pace，其他角色/A10/H1预算/策略阈值保持原范围；正式release_id/唯一精确组合外部检查与shipped交ops。\n')
    git('add','--sparse','--','eval/versions.json','paper/materials/decision-log.md')
    state['publication']=commit('Record H0 source phase version and actual consumer receipt','publication')
    state['fixed_release_tree']=git('rev-parse','HEAD^{tree}');state['consumer_receipt']={'path':str(validation/'consumer-receipt.json'),'sha256':sha(validation/'consumer-receipt.json')};state['experience_refs']=refs
    assert run(['git','merge-base','--is-ancestor',SOURCE,'HEAD']).returncode==0
    assert run(['git','merge-base','--is-ancestor',state['receipt_source'],'HEAD']).returncode==0
    assert run(['git','diff','--quiet',state['merged'],'HEAD','--','agent/src','agent/tests','knowledge']).returncode==0
    state['release_id_status']='Ops allocates after actual publication; no borrowed release number or shipped claim.'
    save();notify();print(json.dumps(state,ensure_ascii=False),flush=True)
except BaseException as error:
    (ATTEMPT/'failed-live-diff.patch').write_bytes(run(['git','diff','HEAD'],check=False).stdout)
    if run(['git','rev-parse','--verify','MERGE_HEAD'],check=False).returncode==0:git('merge','--abort')
    if state['merged'] and not state['publication']:
        # Reset only this unpushed merge, then restore owned leaves; unrelated fresh builder output stays in place.
        if git('rev-parse','HEAD')!=state['merged']:
            state['rollback_blocked']='Live HEAD advanced while lock was held; retain unowned history and give ops the exact inverse/source.'
        else:
            exp='knowledge/characters/silent/experience.json'
            current=json.loads((LIVE/exp).read_text());merged=json.loads(blob(state['merged'],exp));previous=json.loads(blob(before_code,exp))
            mm={e['id']:e for e in merged['entries']};pm={e['id']:e for e in previous['entries']};owned=set(state.get('experience_owned_ids',[]))
            kept=[];overlaps=[]
            for entry in current['entries']:
                ident=entry['id']
                if ident not in owned:kept.append(entry)
                elif entry==mm.get(ident):
                    if ident in pm:kept.append(pm[ident])
                else:kept.append(entry);overlaps.append(ident)
            current['entries']=kept
            if current.get('version')==merged.get('version'):current['version']=previous.get('version')
            state['rollback_experience_parallel_overlaps']=overlaps
            (ATTEMPT/'experience-before-rollback.json').write_bytes((LIVE/exp).read_bytes())
            state['rolled_back_commit']=state['merged'];git('update-ref','refs/learner-preserved/h0-failed-'+ATTEMPT.name,state['merged'])
            git('reset','--mixed',before_code)
            existing=[p for p in paths if p!=exp and blob(before_code,p) is not None]
            if existing:git('restore','--source',before_code,'--staged','--worktree','--ignore-skip-worktree-bits','--',*existing)
            for p in set(paths)-set(existing)-{exp}:(LIVE/p).unlink(missing_ok=True)
            (LIVE/exp).write_text(json.dumps(current,ensure_ascii=False,indent=2)+'\n')
            state['merged']=None
    state['error']=str(error);save();raise
