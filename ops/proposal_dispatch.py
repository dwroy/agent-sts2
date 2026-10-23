"""Mechanical proposal consumption, audit links, and no-change dispositions."""
import importlib.util
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time

# Match the completion source comparison, also protecting all character knowledge.
RESEARCH_SOURCE_PATHS = ['agent/src','agent/tools','agent/tests','agent/package*.json','agent/tsconfig*.json',
    'agent/vitest*','learner/*.ts','learner/*.py','learner/lib','learner/tasks','ops/*.sh','ops/*.py','ops/codex',
    'eval/*.py','eval/*.ts','eval/cost-config.json','knowledge/builders','knowledge','ops/tests','tools']

WAITING_RUNS = 10
WAITING_SECONDS = 6 * 3600
WAITING_SLOTS = 2


def waiting_round(state, character, count, stamp, now):
    """Batch repeat reviews before allocating trees; the caller holds learn.lock."""
    previous = state.get('proposal_rechecks', {}).get(character)
    if previous is None:
        return True
    if (not isinstance(previous, dict) or previous.get('schema') != 1
            or type(previous.get('finished_runs')) is not int
            or not isinstance(previous.get('at'), (int, float))
            or not isinstance(previous.get('round'), str)
            or not isinstance(previous.get('batches'), list)):
        raise ValueError('invalid proposal recheck watermark; preserve original state')
    # Counter or clock rollback must not reopen an already consumed round.
    if count < previous['finished_runs'] or now < previous['at']:
        return False
    if previous['round'] == stamp.removesuffix('-s2'):
        return len(previous['batches']) < WAITING_SLOTS
    return count >= previous['finished_runs'] + WAITING_RUNS or now >= previous['at'] + WAITING_SECONDS


def record_waiting_round(state, character, count, stamp, now, batch_id):
    rounds = state.setdefault('proposal_rechecks', {})
    identity = stamp.removesuffix('-s2')
    previous = rounds.get(character)
    if previous is None or previous['round'] != identity:
        rounds[character] = {'schema': 1, 'round': identity, 'at': now,
                             'finished_runs': count, 'batches': [batch_id]}
    else:
        previous['batches'].append(batch_id)


def waiting_age(proposal):
    """Oldest dispositions go first, so a stable queue prefix cannot starve others."""
    try:
        value = dt.datetime.fromisoformat(proposal.get('ts', ''))
        return value.timestamp() if value.tzinfo is not None else 0
    except (TypeError, ValueError, OverflowError):
        return 0


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
    candidates=[p for p in items.values() if p.get('character')==character
                and p.get('target_task')=='strategy-proposal' and p['id'] not in claimed]
    # New proposals and link repairs keep their existing prompt, priority and retry rules.
    # Never mix them with a repeat-review round or share a writer checkout.
    ready=[p for p in candidates if p.get('state')=='pending']
    repeat = not ready
    now = time.time()
    if repeat:
        ready=sorted((p for p in candidates if p.get('state')=='waiting' and count>p.get('seen_runs',count)),
                     key=lambda p: (waiting_age(p), p['id']))
        if ready and not waiting_round(state,character,count,stamp,now):
            return None
    if not ready: return None
    ids=[p['id'] for p in ready[:10]]
    runs=list(dict.fromkeys(r for p in ready[:10] for r in p['runs']))[:10]
    key='code-proposals:'+','.join(ids)+':'+str(count)
    result=dispatch_write(state,root,scripts,'strategy-proposal',character,runs,key,'proposal',alive,stamp)
    if result:
        state['batches'][result[0]]['proposal_ids']=ids
        if repeat:
            record_waiting_round(state,character,count,stamp,now,result[0])
            state['batches'][result[0]]['proposal_recheck_round']=stamp.removesuffix('-s2')
    return result


def links(report,batch,root,scripts):
    if batch.get('backfill_source'):
        try:
            from strategy_backfill_jobs import report_proof
            report_proof(report, batch, root)
        except (OSError, ValueError, KeyError, TypeError) as error:
            return [str(error)]
    if batch.get('implementation_request'):
        from strategy_implementation_jobs import report_errors
        errors = report_errors(report, batch, root)
        if errors: return errors
    if batch.get('proposal_policy')!='Roy-2026-10-07-learning': return []
    try:
        lib=library(scripts);items=lib.fold(Path(root,lib.QUEUE))
        return lib.report_links(report,items,batch['character'])
    except (OSError,ValueError,ImportError): return ['proposal registry could not be validated']


def experience_audit(report,batch,root,scripts):
    if batch.get('task') not in ('experience-update','experience-asc-audit') or batch.get('proposal_policy')!='Roy-2026-10-07-learning': return []
    # A blocked, explicitly empty attempt remains failed/retryable in the caller.
    # There is no source lesson to repair; any claimed output still takes the full audit below.
    if (batch.get('task') == report.get('task') == 'experience-update'
            and report.get('status') == 'blocked'
            and all(key in report and report[key] is None for key in ('commit', 'merged'))
            and all(type(report.get(key)) is int and report[key] == 0 for key in ('added', 'updated', 'retired'))
            and all(report.get(key) == [] for key in ('code_proposals', 'implementation_domains', 'mechanisms'))
            and isinstance(report.get('ledger'), dict)
            and all(report['ledger'].get(key) == [] for key in ('added', 'proposed', 'retired'))):
        return []
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
    rows=report.get('proposal_results')
    if not ids:
        if not rows: return []
        if batch.get('task')!='strategy-proposal' or report.get('task')!='strategy-proposal':
            raise ValueError('unassigned dispositions require a strategy report')
        links=report.get('code_proposals')
        if (not isinstance(rows,list) or not all(isinstance(r,dict) and isinstance(r.get('id'),str) for r in rows)
                or not isinstance(links,list) or not all(isinstance(i,str) for i in links)
                or any(r['id'] not in links for r in rows)):
            raise ValueError('unassigned disposition lacks its reported proposal link')
        ids=[r['id'] for r in rows]
    if not isinstance(rows,list) or len(rows)!=len(ids) or not all(isinstance(r,dict) and isinstance(r.get('id'),str) for r in rows) or {r['id'] for r in rows}!=set(ids):
        raise ValueError('every dispatched proposal needs a disposition')
    if len(set(ids))!=len(ids): raise ValueError('duplicate proposal dispositions')
    for row in rows:
        if row.get('state') not in ('implemented','duplicate','waiting') or not isinstance(row.get('reason'),str) or not row['reason'].strip():
            raise ValueError('invalid proposal disposition')
    return rows


def unassigned_publication(report, batch, root, live):
    """Reuse the exact narrow-publication guard and its completed host recheck."""
    from learner_checks import descriptive_publication
    for key in ('source_commit', 'merged'):
        if not isinstance(report.get(key), str) or not re.fullmatch('[0-9a-f]{40}', report[key]):
            raise ValueError('narrow proposal resolution needs full source/publication identities')
    proof = descriptive_publication(report, batch, root, live)
    if proof is None:
        raise ValueError('descriptive proposal resolution requires an exact narrow publication')
    tree = subprocess.check_output(['git', '-C', str(live), 'rev-parse', 'HEAD^{tree}'], text=True).strip()
    for check in batch.get('fallback_checks', []):
        if (type(check.get('rc')) is not int or check['rc'] != 0 or check.get('tree') != tree
                or proof not in check.get('source_publications', [])
                or report['merged'] not in check.get('commits', [])):
            continue
        log = Path(check.get('log', '')).resolve()
        if not log.is_relative_to(Path(root).resolve()) or not log.is_file():
            continue
        return {'publication': proof, 'host_tree': tree, 'host_log': str(log),
                'host_log_sha256': hashlib.sha256(log.read_bytes()).hexdigest()}
    raise ValueError('narrow proposal resolution lacks a matching successful host recheck')


def unassigned_proof(report,batch,root,items,rows,lib):
    """Bind an ordinary strategy completion to original registrations and source commits."""
    character=batch.get('character')
    fixes = report.get('fixes')
    descriptive = isinstance(fixes, list) and bool(fixes) and all(isinstance(f, str) and f.strip() for f in fixes)
    if (report.get('character')!=character
            or ('runs' in report or not descriptive) and report.get('runs')!=batch.get('runs')):
        raise ValueError('unassigned report differs from its batch character or runs')
    project=Path(root).resolve()
    raw_tree=batch.get('worktree');raw_report=report.get('report')
    if not all(isinstance(p,str) and Path(p).is_absolute() for p in (raw_tree,raw_report)):
        raise ValueError('unassigned report needs absolute batch paths')
    tree=Path(raw_tree).resolve();path=Path(raw_report).resolve();allowed=(tree/'learner/runs').resolve()
    if (tree.parent!=project/'.worktrees' or tree.name=='live' or not allowed.is_relative_to(tree)
            or not path.is_relative_to(allowed) or path.suffix!='.md'):
        raise ValueError('unassigned report is outside its batch worktree')
    raw=path.read_bytes();saved={}
    for block in reversed(re.findall(r'```json\s*([\s\S]*?)```',raw.decode())):
        try: candidate=json.loads(block)
        except ValueError: continue
        if isinstance(candidate,dict) and candidate.get('task')=='strategy-proposal':
            saved=candidate;break
    # The final output may rephrase prose, but must retain the preserved source identities.
    keys=('task','character','base','runs','fixes','source_commit','merged','code_proposals')
    if any(saved.get(k)!=report.get(k) for k in keys) or not saved:
        raise ValueError('unassigned source identities differ from the preserved report')
    saved_rows=saved.get('proposal_results')
    if (not isinstance(saved_rows,list) or not all(isinstance(r,dict) for r in saved_rows)
            or [(r.get('id'),r.get('state'),r.get('commit')) for r in saved_rows]
            !=[(r.get('id'),r.get('state'),r.get('commit')) for r in rows]):
        raise ValueError('unassigned dispositions differ from the preserved report')
    fixes=report.get('fixes')
    runs=batch.get('runs')
    if (not isinstance(fixes,list) or not descriptive and not all(isinstance(f,dict) for f in fixes)
            or not isinstance(runs,list) or not runs or not all(isinstance(r,str) for r in runs)):
        raise ValueError('unassigned report lacks source fixes or evidence runs')
    def ancestor(source,target,cwd):
        return (isinstance(source,str) and re.fullmatch('[0-9a-f]{7,40}',source)
                and subprocess.run(['git','-C',str(cwd),'merge-base','--is-ancestor',source,target],
                    stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0)
    # Link repairs may preserve waiting dispositions without publishing any source.
    # Keep the same registration/report proofs and independently verify the clean base.
    waiting_repair = (bool(batch.get('proposal_repair')) and all(row['state']=='waiting' for row in rows)
                      and fixes==[] and report.get('merged') is None
                      and all(report.get(key) is None for key in ('commit','source_commit','published_commit')))
    unchanged = no_change(report,batch,root) if waiting_repair else None
    if waiting_repair and not unchanged:
        raise ValueError('waiting link repair lacks a verified unchanged source base')
    merged=report.get('merged')
    live = Path(os.environ.get('STS2_LIVE', str(project/'.worktrees/live')))
    if not waiting_repair and not ancestor(merged,'HEAD',live):
        raise ValueError('unassigned report lacks an actual live merge')
    publication = {}
    if descriptive:
        # A prose list cannot assign distinct sources to multiple proposals.
        if len(rows) != 1 or report.get('code_proposals') != [rows[0]['id']]:
            raise ValueError('descriptive proposal resolution must identify one original proposal')
        publication = unassigned_publication(report, batch, root, live)
    for row in rows:
        item=items.get(row['id'])
        if (not item or item.get('character')!=character or item.get('target_task')!='strategy-proposal'
                or item.get('source_task') not in lib.TASKS or not item.get('ledger')
                or not isinstance(item.get('runs'),list) or not set(item['runs']) & set(runs)):
            raise ValueError('unassigned disposition lacks its original character/source registration')
        original=Path(item.get('proposal','')).resolve()
        if not original.is_relative_to(project) or original.suffix!='.md':
            raise ValueError('unassigned proposal source is outside the project')
        if hashlib.sha256(original.read_bytes()).hexdigest()!=item.get('proposal_sha256'):
            raise ValueError('unassigned proposal source fingerprint changed')
        commit=row.get('commit')
        if waiting_repair:
            if commit is not None:
                raise ValueError('waiting link repair cannot claim a source commit')
            continue
        if row['state'] not in ('implemented','duplicate'):
            raise ValueError('unassigned resolution requires a published source disposition')
        if descriptive:
            bound = commit == merged
        else:
            bound = (any(f.get('proposal_id')==row['id'] and f.get('commit')==commit for f in fixes)
                     and ancestor(commit,'HEAD',tree))
        if not bound or not ancestor(commit,merged,live):
            raise ValueError('unassigned disposition is not bound to its reported live source fix')
        if item.get('state') in ('implemented','duplicate') and item.get('commit',item.get('implemented_commit'))!=commit:
            raise ValueError('unassigned disposition conflicts with an existing resolution')
    return {'resolution_report':str(path),'resolution_report_sha256':hashlib.sha256(raw).hexdigest(),
            'resolution_batch':batch.get('key'),
            **({'resolution_no_change_base': unchanged['base']} if unchanged else {}),
            **({'resolution_publication': publication} if publication else {})}


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
    registered_ident=batch.get('research_request')
    registry_spec=importlib.util.spec_from_file_location('proposal_research_registry',
        Path(__file__).with_name('strategy_research_jobs.py'))
    registry=importlib.util.module_from_spec(registry_spec);registry_spec.loader.exec_module(registry)
    REQUEST_PATHS=registry.REQUEST_PATHS;registered_path=registry.request_path
    if registered_ident is not None:
        if registered_ident not in REQUEST_PATHS: return None
        request_path=registered_path(project,registered_ident)
    else:
        request_path=project/'notes'/('strategy-research-'+character+'.json')
    if not request_path.resolve().is_relative_to(project): return None
    request_raw=request_path.read_bytes()
    request=json.loads(request_raw)
    if not isinstance(request,dict) or any(request.get(key)!=value for key,value in {
        'authorized_by':'Roy','state':'running','task':'strategy-proposal',
        'character':character,'batch':batch_id}.items()): return None
    ident=request.get('request_id')
    if not isinstance(ident,str) or not ident.strip(): return None
    if registered_ident is not None and ident!=registered_ident: return None
    if any(report.get(key)!=value for key,value in {
        'task':'strategy-proposal','character':character,'batch':batch_id,'request_id':ident}.items()): return None
    if report.get('research_complete') is not True: return None
    dispatch_base=request.get('dispatch_base')
    if not isinstance(dispatch_base,str) or not re.fullmatch('[0-9a-f]{40}',dispatch_base): return None
    # The dedicated study must match its independently saved dispatch identity;
    # editing a root request later cannot replace the actual baseline or inputs.
    if ident in REQUEST_PATHS and any(batch.get(key)!=value for key,value in {
        'research_request':ident,'research_dispatch_base':dispatch_base,
        'research_input_sha256':request.get('input_manifest_sha256')}.items()): return None

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


def cadence_proof(report, batch, root):
    """A registered cadence review may finish without acquiring or resolving a proposal."""
    if (batch.get('reason') != 'tick' or batch.get('proposal_ids') or batch.get('proposal_repair')
            or any(batch.get(key) for key in ('research_request', 'implementation_request', 'feature_request',
                                             'learning_request', 'boss_sim', 'continuation_parent_batch'))
            or any(report.get(key) for key in ('commit', 'source_commit', 'published_commit', 'needs_decision',
                                              'questions', 'disagreements', 'blocked', 'bugs'))
            or report.get('proposal_results') != []
            or report.get('tests') != {'tsc': None, 'vitest': None, 'cases': None}):
        return None
    character = batch.get('character')
    progress = batch.get('strategy_progress', {})
    if (not isinstance(character, str) or not re.fullmatch('[a-z][a-z0-9_]*', character)
            or not isinstance(progress, dict)
            or any(type(progress.get(key)) is not int for key in ('ascension', 'runs'))
            or progress['ascension'] < 0 or progress['runs'] <= 0
            or batch.get('key') != f"{character}:A{progress['ascension']}:{progress['runs']}"):
        return None
    runs = batch.get('runs')
    if (not isinstance(runs, list) or not 1 <= len(runs) <= 10
            or any(not isinstance(run, str) or not re.fullmatch('[A-Z0-9]{12}', run) for run in runs)
            or len(set(runs)) != len(runs) or progress['runs'] < len(runs)
            or report.get('runs') != runs or report.get('character') != character):
        return None
    project = Path(root).resolve()
    tree = Path(batch['worktree']).resolve()
    match = re.fullmatch('codex-strategy-' + re.escape(character) + r'-([0-9]{8}-[0-9]{6})', tree.name)
    if (not match or tree.parent != project / '.worktrees' or not (tree / '.git').is_file()
            or (tree / '.git').is_symlink() or report.get('batch') != match[1] + '-strategy-proposal'):
        return None
    if Path(subprocess.check_output(['git', '-C', str(tree), 'rev-parse', '--show-toplevel'], text=True).strip()) != tree:
        return None
    original = batch.get('ordinary_baseline')
    baseline = original.get('head') if isinstance(original, dict) else None
    base = report.get('base')
    if (not isinstance(baseline, str) or not re.fullmatch('[0-9a-f]{40}', baseline)
            or not isinstance(base, str) or not re.fullmatch('[0-9a-f]{40}', base)):
        return None
    if (subprocess.run(['git', '-C', str(tree), 'merge-base', '--is-ancestor', baseline, base],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode
            or subprocess.run(['git', '-C', str(tree), 'diff', '--quiet', baseline, base, '--', *RESEARCH_SOURCE_PATHS],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode):
        return None
    path = Path(report['report']).resolve()
    allowed = tree / 'learner/runs'
    if not path.is_relative_to(allowed) or path.suffix != '.md':
        return None
    raw = path.read_bytes()
    saved = None
    for block in reversed(re.findall(r'```json\s*([\s\S]*?)```', raw.decode())):
        try:
            value = json.loads(block)
        except ValueError:
            continue
        if isinstance(value, dict) and value.get('task') == 'strategy-proposal':
            saved = value
            break
    keys = ('task', 'character', 'batch', 'base', 'runs', 'fixes', 'merged', 'tests', 'proposal_results',
            'code_proposals', 'implementation_domains')
    if not saved or any(saved.get(key) != report.get(key) for key in keys):
        return None
    return {'batch': report['batch'], 'dispatch_base': baseline, 'progress': dict(progress),
            'report_sha256': hashlib.sha256(raw).hexdigest(), 'no_proposal_resolution': True}



def no_change(report,batch,root):
    if batch.get('task')!='strategy-proposal' or report.get('fixes')!=[] or report.get('merged') is not None:
        return None
    try:
        research=None
        cadence=None
        backfill=None
        if not (batch.get('proposal_ids') or batch.get('proposal_repair')):
            if batch.get('backfill_source'):
                from strategy_backfill_jobs import report_proof
                backfill=report_proof(report,batch,root)
            elif batch.get('reason') == 'tick':
                cadence=cadence_proof(report,batch,root)
                if not cadence: return None
            else:
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
        if backfill:
            proof["backfill"]=backfill
        if cadence:
            proof['cadence']=cadence
        if research:
            proof['research']={**research,'report_sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
        return proof
    except (OSError,ValueError,KeyError,RuntimeError,subprocess.SubprocessError): return None


def resolve(report,batch,root,scripts):
    rows=results(report,batch)
    if not rows: return
    lib=library(scripts);count=finished_count(root,batch['character'])
    items=lib.fold(Path(root,lib.QUEUE))
    unassigned=not batch.get('proposal_ids')
    proof=unassigned_proof(report,batch,root,items,rows,lib) if unassigned else {}
    for row in rows:
        if row['state'] in ('implemented','duplicate'):
            commit=row.get('commit','')
            if not isinstance(commit,str) or not re.fullmatch('[0-9a-f]{7,40}',commit) or subprocess.run(['git','-C',os.environ.get('STS2_LIVE',str(Path(root,'.worktrees/live'))),'merge-base','--is-ancestor',commit,'HEAD'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode:
                raise ValueError('implemented/duplicate proposal lacks an actual live source commit')
    # All proofs pass before appending any resolution; no partial successful batch is fabricated.
    for row in rows:
        prior=items.get(row['id'],{})
        # A still-running assigned batch cannot reopen a source already published by another batch.
        if prior.get('state') in ('implemented','duplicate') and (unassigned or row['state']=='waiting'):
            continue
        update={'op':'update','id':row['id'],'ts':lib.now(),'state':row['state'],
                'reason':row['reason'],'commit':row.get('commit'),**proof}
        # Ordinary batches did not acquire the proposal's dispatch lease or waiting watermark.
        if not unassigned: update.update(seen_runs=count,batch=batch.get('key'))
        lib.append(Path(root,lib.QUEUE),update)
