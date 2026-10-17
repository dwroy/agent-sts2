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
ROOTOUT=OUT.parent
WORK=ROOTOUT.parents[2]
ROOT=Path('/home/dw/Projects/agent-sts2')
LIVE=ROOT/'.worktrees/live'
BASE='8544db04cfd497fecfa9427c7c1c0c7362077cc3'
SOURCE=sys.argv[1]
assert re.fullmatch('[0-9a-f]{40}',SOURCE)
ATTEMPT=OUT/('live-publish-'+dt.datetime.now().strftime('%Y%m%d-%H%M%S'))
ATTEMPT.mkdir()
PAPER='paper/materials/20261017-human-pace-h0/test-subject-phase-repair'
ENV={**os.environ,'PATH':str(Path.home()/'.local/node/bin')+':'+os.environ['PATH'],'TMPDIR':str(OUT),'SANDBOX_WORKERS':'2'}
ENV.pop('GIT_INDEX_FILE',None)
COAUTHOR='\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>'
state={'request_id':'roy-20261017-human-pace-h0','revision':1,'source':SOURCE,'attempt':str(ATTEMPT),'merged':None,'publication':None,'release_id':None,'scope':'H0 observed Test Subject phase-state repair and completed original fixed-split delta calibration; current H1/full production equivalence, joint/natural effects remain separate.'}

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
    ledger=json.loads((OUT/'delivery-ledger.json').read_text())
    questions=json.loads((OUT/'questions.json').read_text())
    text=(f'\n- {at} H0/r1同原050119/thread01a1415e-a511-7131-be7c-a2dc691c847f实际发布：source{SOURCE}→代码合入{state["merged"]}→publication{state["publication"]}/tree{state["fixed_release_tree"]}，{state["version"]}/{state["experience_version"]}；账本{ledger["ids"]}仍proposed，正式release_id/唯一精确新组合外部检查/shipped交ops。旧：实验体换相继承第一相enrage/旧woundsPerHit，后续Skill可虚构加力；新：仅实际Silent A10、单实验体及已见111/Enrage3→212/Painful1→313签名，whole-fight更新这两个字段及powers，其他角色/阶/未知签名/短rollout原路，所有权重/费用/药水/保血/SL阈值不改。源原帧F48三局、F49五局第一换相/一局第三相补核，不把SL或probe增局；旧phase-reset事实保留。原不可变86f9bd67的481验证962行完成；新源只重算2调参/29验证共62行，其余1114行有谓词/编译隔离证明后复用，原107/481/Platt方法/200样本/588原行seed/四闸不动。逐Boss修前/后、A10/F49、缺失与数量/质量缺口见{PAPER}/report.md及{state["model_sha256"]}对应完整artifact。当前H1有限前缀/刷新叶输入不同，候选full准入不冒当前生产认证，生产boss-trust未由本轮替换；F49联合、完整Wound资源、自然效果、0332及宽父保持unknown/原owner。源与实际组合sandbox通过、10经验对象真实生产消费者读取通过；预期只修正已见能力状态，不声明胜率收益。回退仅逆向本次TS flag/阶段字段及9条经验，保纸鹤R381/H1/其他源码与刷新，实际行为回退另记新版本。原三项异议原文保持，第四项指出phase-reset事实尚未被full模型消费；以下原文沿ops→watcher→Roy，不代ACK：\n'+json.dumps(questions,ensure_ascii=False,indent=2)+'\n')
    payload=text.encode();records=[]
    for path in [ROOT/'notes/for-roy.md',ROOT/'ops/inbox-dev.md']:
        with path.open('a+b') as handle:
            fcntl.flock(handle,fcntl.LOCK_EX);off=handle.seek(0,os.SEEK_END);handle.write(payload);handle.flush();os.fsync(handle.fileno());handle.seek(off);assert handle.read(len(payload))==payload
        records.append({'path':str(path),'offset':off,'bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest()})
        (OUT/'notification.json').write_text(json.dumps({'at':at,'actor':'learner','status':'appended-and-read-back' if len(records)==2 else 'partial','evidence':records,'scope':'Actual authorized learner dual append; no recipient ACK.'},ensure_ascii=False,indent=2)+'\n')

qualification=json.loads((OUT/'source-qualification.json').read_text())
assert qualification['status']=='passed' and qualification['exit_code']==0 and qualification['sources_unchanged']
assert sha(Path(qualification['log']['path']))==qualification['log']['sha256']
assert sha(Path(qualification['history_restore']['path']))==qualification['history_restore']['sha256']
state['source_qualification']={'path':str(OUT/'source-qualification.json'),'sha256':sha(OUT/'source-qualification.json')}
assert json.loads((ROOTOUT/'test-history-restored-h0-ts-phase.json').read_text())['restored'] is True
assert json.loads((OUT/'check-experience.json').read_text())['missing']==[]
assert (OUT/'questions.json').is_file()
for name in ['consumer-v2.mts','input-read-guard.mjs','run-consumer.py']:
    assert (WORK/PAPER/'validation'/name).is_file()
cache=json.loads((OUT/'publish-model.json').read_text());state['model_sha256']=cache['model_sha256']
paths=git('diff','--name-only',BASE,SOURCE,cwd=WORK).splitlines()
allowed=lambda p:p in ['agent/src/reflex/rollout.ts','agent/src/reflex/rollout-live.ts','agent/tests/silent-test-subject-phase.test.ts','knowledge/characters/silent/experience.json','paper/materials/decision-log.md'] or p.startswith(PAPER+'/') or any(p.startswith('experiments/boss-sim/silent/'+a+'/') for a in [cache['artifact'],cache['previous_preserved_artifact']])
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
    started=run(['date','+%Y-%m-%d %H:%M:%S %Z']).stdout.decode().strip();state['live_test_started']=started;state['sandbox_workers']=2
    with (ATTEMPT/'live-sandbox.log').open('wb') as log:checked=subprocess.run(['nice','-n','19','bash','tools/test-sandbox.sh'],cwd=LIVE/'agent',env=ENV,stdout=log,stderr=subprocess.STDOUT)
    (ATTEMPT/'live-sandbox.exit').write_text(str(checked.returncode)+'\n');state['live_sandbox_exit']=checked.returncode;save()
    assert checked.returncode==0,'actual live combination sandbox failed; original log retained'
    observe_model_boundary('model-boundary-after-test')
    label='live-consumer-'+state['merged'][:12]
    expected=json.loads((OUT/'candidate-experience-objects.json').read_text())
    actual_data=json.loads((LIVE/'knowledge/characters/silent/experience.json').read_text())
    actual_entries={e['id']:e for e in actual_data['entries']}
    for row in expected['entries']:
        ident=row['entry']['id']
        if ident in state['experience_owned_ids']:assert actual_entries[ident]==row['entry'],'owned source entry changed before consumer'
        row['entry']=actual_entries[ident]
        row['sha256']=hashlib.sha256(json.dumps(row['entry'],ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    expected['experience_version']=actual_data['version']
    expected_path=OUT/(label+'-expected.json');expected_path.write_text(json.dumps(expected,ensure_ascii=False,indent=2)+'\n')
    probe=run(['nice','-n','19','python3',str(OUT/'run-consumer.py'),'--root',str(LIVE),'--label',label,'--expected-head',state['merged'],'--expected',str(expected_path)],check=False)
    (ATTEMPT/'consumer-wrapper.log').write_bytes(probe.stdout+probe.stderr)
    assert probe.returncode==0,'actual live experience consumer failed'
    output=json.loads((OUT/(label+'-output.json')).read_text())
    validation=WORK/PAPER/'validation';validation.mkdir(parents=True,exist_ok=True)
    names=[label+suffix for suffix in ['-expected.json','-input.json','-output.json','-command.json','-observation-before.json','-observation-after.json','-read-guard.json','.log']]
    for name in names:shutil.copyfile(OUT/name,validation/name)
    for label in ['model-boundary-at-merge','model-boundary-after-test']:
        name=label+'.json';shutil.copyfile(ATTEMPT/name,validation/name);names.append(name)
    evidence=[{'path':str(validation/name),'sha256':sha(validation/name)} for name in names]
    evidence.extend({'path':str(WORK/PAPER/'validation'/name),'sha256':sha(WORK/PAPER/'validation'/name)} for name in ['consumer-v2.mts','input-read-guard.mjs','run-consumer.py'])
    refs=[{'id':e['id'],'sha256':e['sha256']} for e in output['checks']]
    receipt={'request_id':state['request_id'],'revision':1,'character':'silent','experience_version':output['experience_version'],'kind':'fixed-consumer','status':'passed','live_commit':state['merged'],'tested_tree':state['preflight_tree'],'evidence':evidence,'entries':refs,'scope':'Actual ten-object production loader/render/query readback; fixed readability only, not natural use, current H1 calibration, joint probability or parent completion.'}
    (validation/'consumer-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
    docs=[PAPER+'/validation/'+name for name in names+['consumer-receipt.json']]
    git('add','--sparse','--force','--',*docs,cwd=WORK)
    state['receipt_source']=commit('Record actual Silent H0 live experience consumer receipt','receipt-source',cwd=WORK)
    git('merge','--no-ff','--no-commit','-s','ours',state['receipt_source'])
    git('restore','--source',state['receipt_source'],'--staged','--worktree','--ignore-skip-worktree-bits','--',*docs)
    at=run(['date','+%Y-%m-%d %H:%M:%S %Z']).stdout.decode().strip()
    version_file=LIVE/'eval/versions.json';versions=json.loads(version_file.read_text());items=versions['versions'] if isinstance(versions,dict) else versions
    state['version']='S1.silent-h0-test-subject-phase1';assert not any(v['name']==state['version'] for v in items)
    items.append({'name':state['version'],'family':items[-1].get('family','V5'),'character':'SILENT','commit':state['merged'],'release_status':'pending-primary-ops','source':at+'; H0/r1 original owner/thread, source '+SOURCE+'; observed single Silent A10 Test Subject111/Enrage3->212/Painful1->313 whole-fight phase state; source/combined sandbox passed and actual consumer10 passed. New model '+state['model_sha256']+' original107/481 fixed split, only2 tuning and29 validation keys recomputed,1114 rows reused under source/predicate/numeric isolation proof, original Platt/gates/200 samples/full-row seeds unchanged. Current H1 finite prefixes/refreshed inputs/natural effect/F49 joint/complete Wound resources/0332 and wider parents not certified; production boss-trust not replaced. Other roles/ascensions/unknown signatures/short rollout and strategy thresholds unchanged. Official release id and new-ledger shipped by ops.'})
    version_file.write_text(json.dumps(versions,ensure_ascii=False,indent=2)+'\n')
    with (LIVE/'paper/materials/decision-log.md').open('a') as handle:handle.write(f'\n- {at} H0/r1实验体阶段状态及固定校准上线：source{SOURCE}→live{state["merged"]}，{state["experience_version"]}/{state["version"]}；Silent A10单目标已见HP/能力签名的whole-fight清激怒/更新痛苦刺击，源与实际新组合sandbox0、10对象实际消费者通过。冻结原107/481，新源只2调参/29验证增量62行，其他1114行按编译/谓词隔离复用；逐Boss原四闸与A10/F49表保存，生产trust不替换，H1部分预算/自然/联合/Wound完整资源/0332及宽父另核，原失败与R381历史保留。正式release_id/精确组合外部检查/新账本shipped交ops。\n')
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
