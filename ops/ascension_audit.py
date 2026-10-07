"""Persistent climb audit requests and isolated learner leases; no game-rule judgments."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import time


def observe(state, configs, character, character_of, level_of):
    rows = [r for r in configs if character_of(r) == character and r.get('target_ascension_mode') == 'climb'
            and type(level_of(r)) is int and level_of(r) >= 0]
    if not rows: return []
    seen = state.setdefault('climb_audit_seen', {}).get(character)
    requests = state.setdefault('ascension_audits', {})
    created = []
    # Install-time baseline audits the latest observed level, rather than launching a historical backlog.
    pending = rows if type(seen) is int else rows[-1:]
    if type(seen) is not int:
        level = level_of(rows[-1])
        earlier = [level_of(r) for r in rows[:-1] if level_of(r) < level]
        seen = max(earlier, default=0)
    for row in pending:
        level = level_of(row)
        if level <= seen: continue
        key = f'{character}:A{level}'
        if key not in requests:
            requests[key] = {'key':key,'character':character,'previous':seen,'level':level,
                             'anchor_run':row.get('run_id'),'requested_at':row.get('ts'),
                             'state':'queued','attempts':0}
            created.append(key)
        seen = level
    state['climb_audit_seen'][character] = max(seen, level_of(rows[-1]))
    return created


def lease_busy(state_dir, request):
    path = Path(state_dir,'learner',f"ascension-audit-{request['character']}-a{request['level']}.lock")
    path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('a') as lock:
        try: fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError: return True
    return False


def dispatch(state, root, scripts, character, finished, alive, stamp, start, available, persist=lambda s:None, notice=lambda text:None):
    requests = state.setdefault('ascension_audits', {})
    state_dir = os.environ.get('CODEX_OPS_DIR') or str(Path(root,'ops/codex-ops'))
    for batch in state['batches'].values():
        if batch.get('task') != 'ascension-audit' or batch.get('state') not in ('running','launching'): continue
        request = requests.get(batch.get('audit_key'))
        if alive(batch.get('pid')) or request and lease_busy(state_dir, request): return None
        batch.update(state='lost',retry_at=time.time()+3600)
        if request: request.update(state='queued',retry_at=batch['retry_at'],last_failure='learner process lost; old tree and logs preserved')
    for request in requests.values():
        if request['character'] != character or request['state'] not in ('queued','failed'): continue
        if request.get('retry_at',0) > time.time(): continue
        if request['attempts'] >= 3:
            request['state'] = 'exhausted'
            notice('升阶审计 '+request['key']+' 三次失败或丢失已耗尽；旧工作树/日志保留，需要运维续派。')
            continue
        if lease_busy(state_dir,request): continue
        runs = [r['run_id'] for r in finished if str(r.get('character','IRONCLAD')).lower() == character
                and r.get('ascension') == request['level'] and re.fullmatch('[A-Z0-9]{12}',str(r.get('run_id','')))]
        if not runs: continue  # Keep the request until this level has observed, completed evidence.
        attempt = request['attempts']+1
        tree = str(Path(root,'.worktrees',f"ascension-audit-{character}-a{request['level']}-{attempt}"))
        if any(b.get('worktree') == tree and b.get('state') in ('running','launching') for b in state['batches'].values()): continue
        if Path(tree).exists() and not available(tree): continue
        batch_id = stamp+'-ascension-audit'
        if batch_id in state['batches']: return None
        batch = {'task':'ascension-audit','learner_task':'ascension-audit','character':character,
                 'runs':runs[:10],'state':'launching','audit_key':request['key'],'worktree':tree,
                 'proposal_policy':'Roy-2026-10-07-learning','attempt':attempt,'started':time.time()}
        state['batches'][batch_id] = batch
        request.update(state='launching',attempts=attempt,batch=batch_id,worktree=tree)
        persist(state)  # A crash after launch cannot erase the lease or attempt.
        argv=['bash',str(Path(scripts,'codex-ops-learner.sh')),batch_id,','.join(batch['runs']),character,
              'ascension-audit',tree,'ascension-audit',str(request['level']),str(request['previous'])]
        try:
            pid,pane=start(argv,root,scripts,state_dir,'learner-'+batch_id)
            batch.update(pid=pid,state='running');request.update(state='running',pid=pid)
            if pane: batch['pane']=pane
        except (OSError,RuntimeError) as error:
            batch.update(state='failed',retry_at=time.time()+3600,error=str(error))
            request.update(state='failed',retry_at=batch['retry_at'],last_failure=str(error))
            persist(state);return None
        persist(state)
        return batch_id,pid
    return None


def read_report(path):
    try: text=Path(path).read_text()
    except OSError: return {}
    for block in reversed(re.findall(r'```json\s*([\s\S]*?)```',text)):
        try: report=json.loads(block)
        except ValueError: continue
        if isinstance(report,dict) and report.get('task') == 'ascension-audit': return report
    # The launcher may append its summary to a leading JSON report; never scan prose for braces.
    try: report,_=json.JSONDecoder().raw_decode(text.lstrip())
    except ValueError: return {}
    if isinstance(report,dict) and report.get('task') == 'ascension-audit': return report
    return {}


def finish(state, batch_id, rc, root, out_dir, enqueue, inbox, proposal_check=lambda report,batch:[]):
    batch=state['batches'][batch_id];request=state['ascension_audits'][batch['audit_key']]
    if batch.get('state') == 'done': return
    if request.get('batch') != batch_id:
        batch.update(state='late-finish',rc=rc,report=read_report(Path(out_dir,batch_id+'.out')))
        enqueue('ascension-audit-done','旧升阶审计 '+batch_id+' 迟到回报保留；不覆盖当前租约 '+str(request.get('batch'))+'。')
        return
    report=read_report(Path(out_dir,batch_id+'.out'));errors=[]
    if rc: errors.append('learner exit '+str(rc))
    if report.get('character') != batch['character'] or report.get('level') != request['level'] or report.get('complete') is not True:
        errors.append('missing matching completed audit report')
    path=Path(str(report.get('report',''))).resolve()
    allowed=Path(root,'learner/runs').resolve()
    if not path.is_relative_to(allowed) or path.suffix != '.md' or not path.is_file(): errors.append('missing preserved report inside learner/runs')
    runs = report.get('runs')
    if not isinstance(runs,list) or not runs or not all(isinstance(r,str) for r in runs) or not set(runs) <= set(batch['runs']):
        errors.append('missing dispatched evidence runs')
    if not isinstance(report.get('code_proposals'),list): errors.append('missing code proposal links')
    coverage = report.get('coverage')
    if not isinstance(coverage,list) or not all(isinstance(c,str) for c in coverage) or not {'floors','combat_counts','healing','campfires','rules','assumptions'} <= set(coverage):
        errors.append('incomplete observed structure coverage')
    errors.extend(proposal_check(report,batch))
    batch.update(rc=rc,state='failed' if errors else 'done',report=report,errors=errors)
    if errors:
        batch['retry_at']=time.time()+3600
        request.update(state='failed',retry_at=batch['retry_at'],last_failure='; '.join(errors))
        if request['attempts'] >= 3: request['state']='exhausted'
        inbox('升阶独立审计 '+batch['audit_key']+' 失败，保留报告/日志/工作树；'+request['last_failure']+('；三次耗尽，需运维续派。' if request['state']=='exhausted' else '；一小时后在新独立工作树重试。'))
    else:
        request.update(state='done',report=str(path),report_sha256=hashlib.sha256(path.read_bytes()).hexdigest(),code_proposals=report['code_proposals'])
    enqueue('ascension-audit-done','独立学习者升阶审计 '+batch['audit_key']+'：'+batch['state']+'；回报 '+str(Path(out_dir,batch_id+'.out'))+'；运维只核实登记，不添加游戏知识或阻塞对局。')
