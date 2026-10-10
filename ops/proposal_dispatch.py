"""Mechanical proposal consumption, audit links, and no-change dispositions."""
import importlib.util
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time

# Match the completion source comparison, also protecting all character knowledge.
RESEARCH_SOURCE_PATHS = ['agent/src','agent/tools','agent/tests','agent/package*.json','agent/tsconfig*.json',
    'agent/vitest*','learner/*.ts','learner/*.py','learner/tasks','ops/*.sh','ops/*.py','ops/codex',
    'eval/*.py','eval/*.ts','eval/cost-config.json','knowledge/builders','knowledge','ops/tests','tools']


def library(scripts):
    path=Path(scripts).parent/'learner/code_proposals.py'
    spec=importlib.util.spec_from_file_location('learner_code_proposals',path)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module


def finished_count(root,character):
    path=Path(root,'logs/runs.jsonl');n=0
    if path.exists():
        with path.open() as handle:
            for line in handle:
                try: row=json.loads(line)
                except ValueError: continue
                if str(row.get('character','IRONCLAD')).lower()==character and row.get('run_id'): n+=1
    return n


def dispatch(state,root,scripts,character,alive,stamp,dispatch_write):
    """Fill two slots under the caller's learn.lock, retaining the first-result API."""
    first = dispatch_one(state,root,scripts,character,alive,stamp,dispatch_write)
    if first:
        dispatch_one(state,root,scripts,character,alive,stamp+"-s2",dispatch_write)
    return first


def dispatch_one(state,root,scripts,character,alive,stamp,dispatch_write):
    for ident, repair in state.get('proposal_repairs',{}).items():
        if repair.get('character')!=character or repair.get('state')!='pending' or not repair.get('runs'): continue
        prior=[b for b in state['batches'].values() if b.get('proposal_repair')==ident]
        if any(b.get('state')=='done' for b in prior):
            repair['state']='done';continue
        if any(b.get('state')=='running' and alive(b.get('pid')) for b in prior):
            continue
        key='proposal-link-repair:'+ident
        result=dispatch_write(state,root,scripts,'strategy-proposal',character,repair['runs'][:10],key,'proposal',alive,stamp)
        if result: state['batches'][result[0]]['proposal_repair']=ident
        return result
    try:
        lib=library(scripts);items=lib.fold(Path(root,lib.QUEUE))
    except (OSError,ValueError,ImportError): return None
    count=finished_count(root,character)
    claimed=set()
    for batch in state['batches'].values():
        if batch.get('state')!='running' or not batch.get('proposal_ids'): continue
        if alive(batch.get('pid')):
            claimed.update(batch['proposal_ids'])
        else:
            batch.update(state='lost',retry_at=time.time()+3600)
    ready=[p for p in items.values() if p.get('character')==character and p.get('target_task')=='strategy-proposal'
           and p['id'] not in claimed
           and (p.get('state')=='pending' or p.get('state')=='waiting' and count>p.get('seen_runs',count))]
    if not ready: return None
    ids=[p['id'] for p in ready[:10]]
    runs=list(dict.fromkeys(r for p in ready[:10] for r in p['runs']))[:10]
    key='code-proposals:'+','.join(ids)+':'+str(count)
    result=dispatch_write(state,root,scripts,'strategy-proposal',character,runs,key,'proposal',alive,stamp)
    if result: state['batches'][result[0]]['proposal_ids']=ids
    return result


def links(report,batch,root,scripts):
    if batch.get('proposal_policy')!='Roy-2026-10-07-learning': return []
    try:
        lib=library(scripts);items=lib.fold(Path(root,lib.QUEUE))
        return lib.report_links(report,items,batch['character'])
    except (OSError,ValueError,ImportError): return ['proposal registry could not be validated']


def experience_audit(report,batch,root,scripts):
    if batch.get('task') not in ('experience-update','experience-asc-audit') or batch.get('proposal_policy')!='Roy-2026-10-07-learning': return []
    commit=report.get('commit')
    if not isinstance(commit,str) or not re.fullmatch('[0-9a-f]{7,40}',commit): return ['missing source commit for proposal audit']
    path=f"knowledge/characters/{batch['character']}/experience.json"
    def read(ref,empty=False):
        p=subprocess.run(['git','-C',root,'show',ref+':'+path],capture_output=True,text=True)
        if p.returncode and empty: return {'entries':[]}
        if p.returncode: raise ValueError('source experience unavailable')
        return json.loads(p.stdout)
    try:
        lib=library(scripts)
        return lib.audit_experience(read(commit+'^',True),read(commit),lib.fold(Path(root,lib.QUEUE)),batch['character'])
    except (OSError,ValueError,ImportError): return ['experience proposal audit could not run']


def results(report,batch):
    ids=batch.get('proposal_ids',[])
    if not ids: return []
    rows=report.get('proposal_results')
    if not isinstance(rows,list) or len(rows)!=len(ids) or not all(isinstance(r,dict) and isinstance(r.get('id'),str) for r in rows) or {r['id'] for r in rows}!=set(ids):
        raise ValueError('every dispatched proposal needs a disposition')
    for row in rows:
        if row.get('state') not in ('implemented','duplicate','waiting') or not isinstance(row.get('reason'),str) or not row['reason'].strip():
            raise ValueError('invalid proposal disposition')
    return rows


def research_proof(report,batch,root):
    """Bind an ops-only research report to its authorized, frozen request."""
    if batch.get('reason')!='ops' or 'proposal_ids' in batch or 'proposal_repair' in batch:
        return None
    character=batch.get('character')
    if not isinstance(character,str) or not re.fullmatch('[a-z][a-z0-9_-]*',character): return None
    raw_tree=batch.get('worktree')
    if not isinstance(raw_tree,str) or not raw_tree or not Path(raw_tree).is_absolute(): return None
    project=Path(root).resolve()
    tree=Path(raw_tree).resolve()
    match=re.fullmatch('codex-strategy-'+re.escape(character)+r'-([0-9]{8}-[0-9]{6})',tree.name)
    if not match or tree.parent!=(project/'.worktrees').resolve(): return None
    # Manual write dispatches uniquely name their worktree with the batch stamp.
    batch_id=match[1]+'-strategy-proposal'
    request_path=project/'notes'/('strategy-research-'+character+'.json')
    if not request_path.resolve().is_relative_to(project): return None
    request_raw=request_path.read_bytes()
    request=json.loads(request_raw)
    if not isinstance(request,dict) or any(request.get(key)!=value for key,value in {
        'authorized_by':'Roy','state':'running','task':'strategy-proposal',
        'character':character,'batch':batch_id}.items()): return None
    ident=request.get('request_id')
    if not isinstance(ident,str) or not ident.strip(): return None
    if any(report.get(key)!=value for key,value in {
        'task':'strategy-proposal','character':character,'batch':batch_id,'request_id':ident}.items()): return None
    if report.get('research_complete') is not True: return None
    dispatch_base=request.get('dispatch_base')
    if not isinstance(dispatch_base,str) or not re.fullmatch('[0-9a-f]{40}',dispatch_base): return None

    def frozen(field,suffix):
        raw_path=request.get(field);expected=request.get(field+'_sha256')
        if not isinstance(raw_path,str) or not isinstance(expected,str) or not re.fullmatch('[0-9a-f]{64}',expected):
            raise ValueError('missing frozen research artifact')
        path=(project/raw_path).resolve()
        if not path.is_relative_to(project) or path.suffix!=suffix or not path.is_file():
            raise ValueError('research artifact outside the project')
        raw=path.read_bytes()
        if hashlib.sha256(raw).hexdigest()!=expected: raise ValueError('research artifact SHA mismatch')
        return raw,expected

    _,spec_sha=frozen('work_spec','.md')
    manifest_raw,input_sha=frozen('input_manifest','.json')
    if report.get('input_sha256')!=input_sha: return None
    manifest=json.loads(manifest_raw)
    if not isinstance(manifest,dict) or manifest.get('request_id')!=ident or manifest.get('character')!=character: return None
    inventory=manifest.get('runs')
    if not isinstance(inventory,list) or not inventory or any(not isinstance(row,dict) or
        row.get('character',character)!=character for row in inventory): return None

    def runset(value,allow_empty=False):
        if not isinstance(value,list) or (not value and not allow_empty) or any(not isinstance(run,str) or
            not re.fullmatch('[A-Z0-9]{12}',run) for run in value) or len(set(value))!=len(value):
            raise ValueError('invalid research run set')
        return set(value)

    frozen_runs=runset([row.get('run_id') for row in inventory])
    dispatched=runset(batch.get('runs'))
    if runset(request.get('dispatch_runs'))!=dispatched or runset(report.get('runs'))!=dispatched or not dispatched<=frozen_runs:
        return None
    evidence=runset(report.get('evidence_runs'),allow_empty=True)
    covered=runset(report.get('covered_runs'),allow_empty=True)
    exclusions=report.get('exclusions')
    if not isinstance(exclusions,list) or any(not isinstance(row,dict) or
        not isinstance(row.get('reason'),str) or not row['reason'].strip() for row in exclusions): return None
    excluded=runset([row.get('run_id') for row in exclusions]) if exclusions else set()
    if covered & excluded or covered | excluded != frozen_runs or not evidence<=covered: return None
    sections=request.get('required_sections')
    if not isinstance(sections,list) or not sections or any(not isinstance(key,str) or
        not re.fullmatch('[a-z][a-z0-9_]*',key) for key in sections) or len(set(sections))!=len(sections): return None
    coverage=report.get('coverage')
    if not isinstance(coverage,dict) or any(coverage.get(key) is not True for key in sections): return None
    conclusion=report.get('objective_conclusions');limitations=report.get('limitations')
    if not isinstance(conclusion,str) or not conclusion.strip() or not isinstance(limitations,list) or not limitations or any(
        not isinstance(item,str) or not item.strip() for item in limitations): return None
    if report.get('tests')!={'tsc':None,'vitest':None,'cases':None}: return None
    return {'request_id':ident,'batch':batch_id,'dispatch_base':dispatch_base,'request':str(request_path),
            'request_sha256':hashlib.sha256(request_raw).hexdigest(),'input_sha256':input_sha,
            'work_spec_sha256':spec_sha,'required_sections':sections,'evidence_runs':sorted(evidence),
            'covered_runs':sorted(covered),'exclusions':exclusions}


def no_change(report,batch,root):
    if batch.get('task')!='strategy-proposal' or report.get('fixes')!=[] or report.get('merged') is not None:
        return None
    try:
        research=None
        if not (batch.get('proposal_ids') or batch.get('proposal_repair')):
            research=research_proof(report,batch,root)
            if not research: return None
        rows=results(report,batch)
        if batch.get('proposal_repair') and not report.get('code_proposals'): return None
        if any(r['state']=='implemented' for r in rows): return None
        tree=batch['worktree'];base=report['base']
        raw_path=report.get('report')
        if not all(isinstance(value,str) and Path(value).is_absolute() for value in (tree,raw_path)): return None
        resolved_tree=Path(tree).resolve()
        worktrees=Path(root,'.worktrees').resolve()
        if resolved_tree==worktrees or not resolved_tree.is_relative_to(worktrees): return None
        if not isinstance(base,str) or not re.fullmatch('[0-9a-f]{40}',base): return None
        head=subprocess.check_output(['git','-C',tree,'rev-parse','HEAD'],text=True).strip()
        status=subprocess.check_output(['git','-C',tree,'status','--porcelain'],text=True).strip()
        if head!=base or status: return None
        if research and (subprocess.run(['git','-C',tree,'merge-base','--is-ancestor',research['dispatch_base'],head],
            stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode or subprocess.run(
            ['git','-C',tree,'diff','--quiet',research['dispatch_base'],head,'--',*RESEARCH_SOURCE_PATHS],
            stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode): return None
        allowed=(resolved_tree/'learner/runs').resolve()
        path=Path(raw_path).resolve()
        if not allowed.is_relative_to(resolved_tree) or not path.is_relative_to(allowed) or path.suffix!='.md' or not path.is_file(): return None
        proof={'base':base,'report':str(path),'dispositions':rows}
        if research:
            proof['research']={**research,'report_sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
        return proof
    except (OSError,ValueError,KeyError,RuntimeError,subprocess.SubprocessError): return None


def resolve(report,batch,root,scripts):
    rows=results(report,batch)
    if not rows: return
    lib=library(scripts);count=finished_count(root,batch['character'])
    for row in rows:
        if row['state'] in ('implemented','duplicate'):
            commit=row.get('commit','')
            if not isinstance(commit,str) or not re.fullmatch('[0-9a-f]{7,40}',commit) or subprocess.run(['git','-C',str(Path(root,'.worktrees/live')),'merge-base','--is-ancestor',commit,'HEAD'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode:
                raise ValueError('implemented/duplicate proposal lacks an actual live source commit')
    # All proofs pass before appending any resolution; no partial successful batch is fabricated.
    for row in rows:
        lib.append(Path(root,lib.QUEUE),{'op':'update','id':row['id'],'ts':lib.now(),'state':row['state'],
            'reason':row['reason'],'commit':row.get('commit'),'seen_runs':count,'batch':batch.get('key')})
