"""Bounded deterministic successor inventory on the original learn.lock transaction."""
from collections import Counter, defaultdict
import json
import os
from pathlib import Path
import re
import time

import external_stock_source as data
from strategy_backfill_jobs import artifact
from strategy_research_jobs import atomic_json, digest

CONTROL = 'notes/strategy-external-stock-silent.json'
INDEX = 'external-stock/inventory.json'
ERRORS = (OSError, ValueError, KeyError, TypeError, IndexError, AttributeError, RecursionError)


def directory(root):
    return Path(os.environ.get('CODEX_OPS_DIR') or Path(root, 'ops/codex-ops'))


def control(root):
    value = json.loads(Path(root, CONTROL).read_bytes())
    if (value.get('schema') != data.SCHEMA or value.get('character') != 'silent'
            or type(value.get('enabled')) is not bool or type(value.get('hold')) is not bool
            or value.get('task_type') != data.TASK):
        raise ValueError('invalid stock control')
    for key, default, low, high in [('target_records', 40, 1, 40), ('ready_floor', 3, 3, 3),
            ('max_input_bytes', 256000, 1024, 512000), ('context_input_bytes', 128000, 1024, 256000),
            ('max_page_bytes', 24000, 1024, 64000)]:
        n = value.setdefault(key, default)
        if type(n) is not int or not low <= n <= high:
            raise ValueError('invalid stock bound: ' + key)
    return value


def durable_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = data.canonical(value)
    temporary = path.with_name(path.name + '.' + str(os.getpid()) + '.tmp')
    try:
        with temporary.open('wb') as stream:
            stream.write(raw); stream.flush(); os.fsync(stream.fileno())
        os.replace(temporary, path)
        fd = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)
    finally:
        temporary.unlink(missing_ok=True)


def legacy_plans(root):
    from strategy_external_jobs import QUEUE
    configured = json.loads(Path(root, QUEUE).read_bytes())
    # Lane A only; unrelated lane intake/retries do not invalidate this coverage boundary.
    return sorted([dict(plan_id=p['plan_id'], input_manifest=p['input_manifest'], work_spec=p['work_spec'])
        for p in configured['plans'] if p.get('lane') == 'A' or p.get('external_lane') == 'A'], key=lambda p: p['plan_id'])


def legacy_reservations(root, source, plans):
    """Conservatively reserve all declared old full windows, including unverified owners."""
    from strategy_external_jobs import safe_aggregate
    by_sha = {r['content_sha256']: r['key'] for r in source['records']}
    reserved = set(); inspected = []; seen = set()
    def walk(value, depth=0):
        if depth > 64:
            raise ValueError('legacy trajectory scope exceeds nesting bound')
        if isinstance(value, dict):
            identities = [value.get(k) for k in ('safe_projection_sha256', 'content_sha256')]
            for ident in identities:
                if ident in by_sha:
                    reserved.add(by_sha[ident])
            if isinstance(value.get('timeline', value.get('nodes')), list) and 'win' in value and 'version' in value and not any(identities):
                raise ValueError('legacy full window has no stable content identity; explicit scope required')
            for item in value.values():
                walk(item, depth + 1)
        elif isinstance(value, list):
            for item in value:
                walk(item, depth + 1)
    for plan in plans:
        manifest = json.loads(artifact(root, plan['input_manifest']))
        walk(manifest)
        refs = [r for c in manifest.get('cohorts', []) for r in c.get('aggregates', [])]
        if manifest.get('selected_whole_run_window'):
            refs.append(manifest['selected_whole_run_window'])
        for ref in refs:
            if ref['sha256'] in seen:
                continue
            if len(seen) >= 512 or Path(root, ref['path']).stat().st_size > data.MAX_SOURCE_BYTES:
                raise ValueError('legacy source scan exceeds bounded registration')
            value = json.loads(artifact(root, ref)); safe_aggregate(value); walk(value)
            seen.add(ref['sha256']); inspected.append(ref)
    return dict(schema='external-stock-legacy-scope-v1', plans=plans, inspected=inspected,
                reserved_keys=sorted(reserved), reading='unknown; reservation is not actual reading')


def load_index(root):
    path = directory(root) / INDEX
    if not path.exists():
        return dict(schema=data.SCHEMA, plans=[], selections={}, cursor=0)
    result = json.loads(path.read_bytes())
    if (result.get('schema') != data.SCHEMA or not isinstance(result.get('plans'), list)
            or not isinstance(result.get('selections'), dict)):
        raise ValueError('invalid stock inventory; preserve it for recovery')
    plan_ids = {p['plan_id'] for p in result['plans']}
    keys = [r['key'] for refs in result['selections'].values() for r in refs]
    if (len(plan_ids) != len(result['plans']) or set(result['selections']) != plan_ids
            or len(set(keys)) != len(keys) or result.get('cursor') != len(keys)):
        raise ValueError('duplicate or incomplete stock reservations')
    return result


def overlay(root):
    """No mutation in ready/prepare/writer probes. Old plans retain their own contract."""
    try:
        cfg = control(root)
    except FileNotFoundError:
        return []
    if not cfg['enabled'] or cfg['hold'] or cfg.get('legacy_plans') != legacy_plans(root):
        return []
    catalog(root, cfg)
    index = load_index(root)
    blocked = {r['key'] for r in cfg.get('blocked_records', [])}
    return [p for p in index['plans'] if not blocked.intersection(r['key'] for r in index['selections'][p['plan_id']])]


def catalog(root, cfg):
    value = json.loads(artifact(root, cfg['catalog']))
    if (value.get('schema') != data.SCHEMA or value.get('source') != data.SOURCE
            or value.get('character') != 'silent' or value.get('ascension') != 10
            or value.get('task_type') != data.TASK or value.get('columns') != data.COLUMNS
            or not isinstance(value.get('records'), list) or len(value['records']) > 50000):
        raise ValueError('invalid stock catalog')
    keys = [r['key'] for r in value['records']]
    if len(set(keys)) != len(keys) or any(not re.fullmatch('[a-f0-9]{64}', str(k)) for k in keys):
        raise ValueError('duplicate/invalid stock trajectory')
    for ref in value['contracts']:
        artifact(root, ref)
    return value


def selected_records(root, stock):
    rows = []
    for ref in stock['records']:
        row = data.validate_record(json.loads(artifact(root, ref['artifact'])))
        if data.record_key(row) != ref['key']:
            raise ValueError('stock selection differs from complete window')
        rows.append(row)
    if len({data.record_key(r) for r in rows}) != len(rows) or not rows or len(rows) > 40:
        raise ValueError('invalid stock selection size')
    if len({(r['version'], r['build']) for r in rows}) != 1:
        raise ValueError('stock must not mix versions/builds')
    return rows


def validate_binding(root, plan, manifest):
    stock = manifest['stock']
    if (stock.get('schema') != data.SCHEMA or stock.get('task_type') != data.TASK
            or stock.get('parent') != 'github-issue-71' or stock.get('lane') != 'A'
            or plan.get('lane') != 'A' or stock.get('question') != 'whole-run-observation-v1'):
        raise ValueError('invalid whole-run inventory binding')
    rows = selected_records(root, stock)
    if manifest['cohorts'][0]['aggregates'] != [r['artifact'] for r in stock['records']]:
        raise ValueError('stock aggregates differ from selected windows')
    for ref, row in zip(stock['records'], rows):
        if any(ref.get(k) != v for k, v in dict(version=row['version'], build=row['build'], cluster=row['cluster'], win=row['win'],
                nodes=len(row['timeline']), last_act=row['timeline'][-1][1], content_sha256=row['content_sha256']).items()):
            raise ValueError('stock selection metadata differs')
    identity = data.fingerprint([data.TASK, stock['question'], [data.record_key(r) for r in rows]])
    if plan['plan_id'] != 'stock71-' + identity[:40] or manifest['unit_ids'] != ['whole-run-' + identity[:40]]:
        raise ValueError('stock plan fingerprint differs')
    if (manifest['cohorts'][0].get('game_build') != rows[0]['build']
            or len(data.canonical(rows)) > stock['input_budget_bytes'] or any(len(data.canonical(r)) > stock['max_page_bytes'] for r in rows)
            or manifest['cohorts'][0]['sample_count'] != len(rows) or len(manifest['cohorts']) != 1):
        raise ValueError('stock plan exceeds frozen budget/denominator')
    return stock


def make_plan(root, cfg, source, refs):
    from strategy_external_jobs import REQUEST, source as validate
    rows = [data.validate_record(json.loads(artifact(root, r['artifact']))) for r in refs]
    identity = data.fingerprint([data.TASK, 'whole-run-observation-v1', [data.record_key(r) for r in rows]])
    ident = 'stock71-' + identity[:40]
    relative = str((directory(root) / 'external-stock/objects' / ident).relative_to(Path(root)))
    stock = dict(schema=data.SCHEMA, parent='github-issue-71', task_type=data.TASK, lane='A',
        question='whole-run-observation-v1', records=refs, catalog=cfg['catalog'],
        input_budget_bytes=min(cfg['max_input_bytes'], cfg['context_input_bytes']), max_page_bytes=cfg['max_page_bytes'])
    namespaced = [data.record_key(row) for row in rows if any(data.namespaced_room(room[0], room[1])
                  for point in row['timeline'] for room in point[3])]
    namespace_note = ('房间ID含' + data.ROOM_NAMESPACE + '命名空间的完整窗口：' + json.dumps(namespaced) + '。'
        '这些原始ID按字节保留；无modifier筛选不能证明无mod内容。不得去掉命名空间、视同原版机制，'
        '或把这些窗口与其他窗口混作原版适用性证据；提炼时按命名空间及具体窗口分账并保留限制。\n') if namespaced else ''
    spec = ('# 持续整局学习单元\n本单元仅按下列冻结窗口学习，不自动重学、不扩样本、不改源码。\n'
        '目标40条完整匿名轨迹，字节或可用样本不足时拆小；这是工程初值，不是统计/可信度门槛。\n'
        '按实际观察顺序追踪构筑、阶段、资源消耗与胜败差异，簇/终止幕仅作事后描述，不作因果策略。\n'
        '使用项目根 ops/external_stock_cli.py read，参数为原root、state-dir、batch、plan和record key。'
        '原state-dir=' + str(directory(root)) + '，root=' + str(Path(root).resolve()) + '。'
        '每次返回一条完整记录；工具输出须容纳整页，截断仍属unread；不从终局倒填决策时状态。\n'
        '该reader输出的完整页面必须在原生工具回执中留存，报告external_reading逐key写'
        '{key,status:read或unread,reason}；仅打开文件/processed不能算实际读完。\n'
        '读完、待提炼、候选、runtime发布和消费者读回分账；允许保存真实反证/排除结果，零新知识不绕过科学门。\n'
        '遵循原external_results及冻结发布契约，纯知识使用已绑定K1 runtime；'
        '原报告JSON另含external_reading与external_coverage，必须与最终输出一致。'
        'external_coverage逐key写{key,state:pending或excluded或candidate,reason,destinations:[]}；'
        'unread只能pending，excluded写真实排除/反证理由；candidate逐项列与external_results完全相同的目标，'
        '目标文件的既有来源/限制字段必须引用该完整窗口key，不能把同批未引用窗口计成已入库证据。\n'
        + namespace_note + '本批完整窗口：\n' + json.dumps([dict(key=r['key'], version=r['version'], build=r['build'], cluster=r['cluster'],
            win=r['win'], nodes=r['nodes']) for r in refs], ensure_ascii=False) + '\n')
    spec_ref = data.immutable(root, relative + '/work.md', spec.encode())
    aggregates = [r['artifact'] for r in refs]
    version = rows[0]['version']
    counts = Counter((r['cluster'], r['last_act'], r['win']) for r in refs)
    strata = sorted({(r['cluster'], r['last_act']) for r in refs}, key=str)
    selection = dict(target_records=cfg['target_records'], actual_records=len(refs),
        shortfall=cfg['target_records'] - len(refs), win_records=sum(r['win'] for r in refs),
        loss_records=sum(1 - r['win'] for r in refs),
        split_reason='byte/context bound or remaining same-version stock; never pad across versions',
        comparable_scope='same version, retrospective cluster and final observed act only; no initial-state/causal equivalence',
        outcome_shortfalls=[dict(cluster=c, last_act=a, wins=counts[c, a, 1], losses=counts[c, a, 0])
                            for c, a in strata if not counts[c, a, 1] or not counts[c, a, 0]])
    manifest = dict(selection=selection, request_id=REQUEST, batch_plan_id=ident, source=data.SOURCE, character='silent',
        contains_player_identifiers=False, topic='knowledge', unit_ids=['whole-run-' + identity[:40]], work_spec=spec_ref,
        provenance=source['provenance'], contracts=source['contracts'], stock=stock,
        cohorts=[dict(version=version, game_build=rows[0]['build'], sample_count=len(rows),
            sample_denominator=source['cohorts'][version].get('builds', {}).get(str(rows[0]['build']),
                sum(r.get('build') == rows[0]['build'] and r['version'] == version for r in source['records'])),
            collected_at=source['provenance']['downloaded_at'], contains_player_identifiers=False, aggregates=aggregates)])
    manifest_ref = data.immutable(root, relative + '/manifest.json', data.canonical(manifest))
    plan = dict(plan_id=ident, retry_generation=0, lane='A', input_manifest=manifest_ref, work_spec=spec_ref)
    validate(root, plan)  # No unchecked plan enters the inventory.
    return plan


def balanced(refs, target, budget, max_page, gaps, cluster_gaps=()):
    """Round-robin observed clusters/terminal stages, alternating comparable outcomes."""
    buckets = defaultdict(list)
    for ref in refs:
        if ref['artifact']['bytes'] <= max_page:
            buckets[(ref['cluster'], ref['last_act'], ref['win'])].append(ref)
    keys = sorted(buckets, key=lambda k: (k[0] not in cluster_gaps, k[1] not in gaps, str(k[0]), k[1], -k[2]))
    chosen = []
    used = 3  # JSON array/newline overhead.
    while len(chosen) < target:
        advanced = False
        for key in keys:
            if not buckets[key] or len(chosen) >= target:
                continue
            row = buckets[key].pop(0)
            size = row['artifact']['bytes'] + 1
            if used + size <= budget:
                chosen.append(row); used += size; advanced = True
        if not advanced:
            break
    return chosen


def maintain(state, root, alive, *, admission_reason=None):
    """Called only by original tick/finish while its learn.lock is held; at most 3 plans."""
    summary = dict(schema=data.SCHEMA, sampled_at=time.time(), cached_records=None, read_records=0, ready_plans=0,
                   workers=[], latest_output=None, stop_reason=None, created=0)
    try:
        cfg = control(root)
        from strategy_external_jobs import QUEUE
        from publication_gate import learners_held
        legacy_queue = json.loads(Path(root, QUEUE).read_bytes())
        admission_reason = admission_reason or ('publication_hold' if learners_held(root, directory(root)) else None)
        admission_reason = admission_reason or ('queue_disabled' if legacy_queue.get('enabled') is not True else None)
        summary['stop_reason'] = 'disabled' if not cfg['enabled'] else 'hold' if cfg['hold'] else admission_reason
        if summary['stop_reason']:
            reconcile(state, root, summary, alive)
            state['external_stock'] = summary
            return summary
        if cfg.get('legacy_plans') != legacy_plans(root):
            raise ValueError('legacy A scope changed; retain reservations pending explicit coverage seed')
        source = catalog(root, cfg)
        index = load_index(root)
        # Reservations are reconstructible from immutable selections even after a crash.
        reserved = {r['key'] for refs in index['selections'].values() for r in refs}
        reserved |= {r['key'] for r in source['records'] if r['legacy_reserved']}
        summary.update(cached_records=len(source['records']), legacy_reserved_records=sum(r['legacy_reserved'] for r in source['records']),
            explicit_reserved_records=len(cfg.get('blocked_records', [])))
        batches = state.get('batches', {})
        registered = {b['external_source']: b['external_binding']['stock'] for b in batches.values()
                      if b.get('external_binding', {}).get('stock')}
        if not set(registered) <= set(index['selections']):
            raise ValueError('original allocated stock inventory missing; restore its immutable journal')
        reserved |= {r['key'] for binding in registered.values() for r in binding['records']}
        blocked = {r['key'] for r in cfg.get('blocked_records', [])}
        ready = [p for p in index['plans'] if not any(b.get('external_source') == p['plan_id'] for b in batches.values())
                 and not blocked.intersection(r['key'] for r in index['selections'][p['plan_id']])]
        from strategy_external_jobs import source as checked_source
        validated = []; invalid = []
        for plan in ready:
            try:
                checked_source(root, plan); validated.append(plan)
            except ERRORS as error:
                invalid.append(dict(plan=plan['plan_id'], reason=str(error)))
        ready = validated
        summary['invalid_plans'] = invalid
        # Explicit holds never auto-clear. Invalid plans keep their original window reservations.
        reserved |= blocked
        available = [r for r in source['records'] if r['key'] not in reserved]
        summary['unallocated_records'] = len(available)
        # A supplied failure gap is an observed stage with a pinned self-evidence ref, not a game rule.
        gaps = set()
        cluster_gaps = set()
        if source.get('failure_gap'):
            own = json.loads(artifact(root, source['failure_gap']))
            cluster_gaps = {int(k) for k, n in own['observed_failures_by_cluster'].items() if n > 0}
            summary['failure_gap'] = own
        else:
            summary['failure_gap'] = 'no registered aligned self-evidence; no gap invented'
        for gap in cfg.get('failure_gaps', []):
            if gap.get('source') != 'self:agent-sts2' or type(gap.get('act')) is not int or gap['act'] not in (1, 2, 3, 4):
                raise ValueError('invalid observed failure gap')
            artifact(root, gap['evidence']); gaps.add(gap['act'])
        while len(ready) < cfg['ready_floor'] and summary['created'] < 3:
            if not available:
                break
            version, build = min({(r['version'], r['build']) for r in available},
                key=lambda v: (v[0] != 'v0.111', v[1] != 'v0.111.0', -int(v[0].split('.')[-1]), str(v[1])))
            current = [r for r in available if (r['version'], r['build']) == (version, build)]
            refs = balanced(current, cfg['target_records'], min(cfg['max_input_bytes'], cfg['context_input_bytes']), cfg['max_page_bytes'], gaps, cluster_gaps)
            if not refs:
                summary['stop_reason'] = 'input_budget'; break
            plan = make_plan(root, cfg, source, refs)
            if plan['plan_id'] in {p['plan_id'] for p in index['plans']}:
                raise ValueError('existing immutable plan lost its reservation')
            index['plans'].append(plan); index['selections'][plan['plan_id']] = refs
            index['cursor'] += len(refs)
            # Commit inventory before any wrapper can start. Crash/restart uses the same objects/IDs.
            path = directory(root) / INDEX; path.parent.mkdir(parents=True, exist_ok=True)
            durable_json(path, index)
            ready.append(plan); summary['created'] += 1
            taken = {r['key'] for r in refs}; available = [r for r in available if r['key'] not in taken]
        summary.update(ready_plans=len(ready), ready_records=sum(len(index['selections'][p['plan_id']]) for p in ready),
                       unallocated_records=len(available), cursor=index['cursor'])
        summary['stop_reason'] = summary['stop_reason'] or ('source_invalid' if invalid else 'data_exhausted' if len(ready) < 3 and not available else 'ready')
        reconcile(state, root, summary, alive)
        from external_learning_policy import snapshot, external_disk_allowed
        policy = snapshot(root, directory(root))
        summary['inventory_state'] = summary['stop_reason']
        if not policy['workers']:
            summary['stop_reason'] = 'quota:' + policy['reason']
        elif not external_disk_allowed(root):
            summary['stop_reason'] = 'disk_capacity'
        else:
            from strategy_external_jobs import occupied_lanes, queue, active_external
            if 'A' in occupied_lanes(state, queue(root), root, alive):
                summary['stop_reason'] = 'lane_owner'
            elif len(active_external(state, alive, directory(root))) >= policy['workers']:
                summary['stop_reason'] = 'worker_limit'
    except FileNotFoundError:
        if not Path(root, CONTROL).exists():
            return {**summary, 'stop_reason': 'not_configured'}  # Preserve the original unconfigured scheduler byte-for-byte.
        summary['stop_reason'] = 'source_missing'
    except ERRORS as error:
        summary.update(stop_reason='source_invalid', error=str(error))
    state['external_stock'] = summary
    if Path(root, CONTROL).exists():
        durable_json(directory(root) / 'external-stock/status.json', summary)
    return summary


def page(root, batch_id, batch, key):
    stock = batch['external_binding']['stock']
    ref = next(r for r in stock['records'] if r['key'] == key)
    row = data.validate_record(json.loads(artifact(root, ref['artifact'])))
    if data.record_key(row) != key:
        raise ValueError('reader window differs')
    result = dict(schema='external-stock-page-v1', batch=batch_id, plan=batch['external_source'],
        input_sha256=batch['external_binding']['input_manifest']['sha256'], key=key, columns=data.COLUMNS, record=row)
    raw = data.canonical(result)
    # The header is bounded too. Never truncate a node or accept an oversized page.
    if len(raw) > stock['max_page_bytes'] + 2048:
        raise ValueError('complete stock page exceeds byte bound')
    return raw


def output_texts(value, depth=0):
    if depth > 5:
        return
    if isinstance(value, str):
        yield value
        try:
            parsed = json.loads(value)
        except ValueError:
            # Code-mode envelopes add timing/status text before a JSON tool result.
            # Decode only complete JSON lines; a marker or truncated record never suffices.
            for line in value.splitlines():
                if line.lstrip().startswith(('{', '[')):
                    try:
                        parsed = json.loads(line)
                    except ValueError:
                        continue
                    yield from output_texts(parsed, depth + 1)
            return
        if not isinstance(parsed, str):
            yield from output_texts(parsed, depth + 1)
    elif isinstance(value, list):
        for item in value:
            yield from output_texts(item, depth + 1)
    elif isinstance(value, dict):
        for key in ('output', 'text', 'content'):
            if key in value:
                yield from output_texts(value[key], depth + 1)


def reading_proof(root, batch_id, batch, report):
    """Full page bytes in the original turn's tool output, never a self-declared read flag."""
    from strategy_backfill_jobs import native_start
    proof = native_start(batch_id, batch, directory(root))
    stock = batch['external_binding']['stock']
    keys = [r['key'] for r in stock['records']]
    rows = report.get('external_reading')
    if (not isinstance(rows, list) or [r.get('key') for r in rows] != keys
            or any(r.get('status') not in ('read', 'unread') or not isinstance(r.get('reason'), str) or not r['reason'].strip() for r in rows)):
        raise ValueError('stock needs ordered per-window reading dispositions')
    wanted = {r['key']: page(root, batch_id, batch, r['key']).decode().strip() for r in rows if r['status'] == 'read'}
    found = {}; current = None; consumed = 0; calls = set()
    with Path(proof['rollout']).open('rb') as stream:
        for line in stream:
            consumed += len(line)
            if consumed > 64 * 1024 * 1024 or not line.endswith(b'\n'):
                raise ValueError('stock native evidence incomplete or over byte bound')
            event = json.loads(line); payload = event.get('payload', {})
            if event.get('type') == 'event_msg' and payload.get('type') == 'task_started':
                current = payload.get('turn_id')
            if current != proof['turn'] or event.get('type') != 'response_item':
                continue
            if payload.get('type') in ('function_call', 'custom_tool_call') and isinstance(payload.get('call_id'), str):
                calls.add(payload['call_id'])
            if payload.get('type') not in ('function_call_output', 'custom_tool_call_output') or payload.get('call_id') not in calls:
                continue
            for output in output_texts(payload.get('output')):
                for key, expected in wanted.items():
                    if expected in output:
                        found[key] = dict(rollout=proof['rollout'], line_sha256=digest(line), page_sha256=digest((expected + '\n').encode()), call_id=payload.get('call_id'))
    if set(found) != set(wanted):
        raise ValueError('claimed stock reading lacks complete native tool output')
    coverage = report.get('external_coverage')
    if not isinstance(coverage, list) or [r.get('key') for r in coverage] != keys:
        raise ValueError('stock needs ordered per-window distillation dispositions')
    targets = [t for result in report['external_results'] for t in result['destinations']]
    scratch = Path(report['report']).resolve().parent
    for row in coverage:
        if (row.get('state') not in ('pending', 'excluded', 'candidate') or not isinstance(row.get('reason'), str)
                or not row['reason'].strip() or not isinstance(row.get('destinations'), list)
                or bool(row['destinations']) != (row['state'] == 'candidate')
                or row['state'] != 'pending' and row['key'] not in found):
            raise ValueError('invalid per-window distillation disposition')
        for target in row['destinations']:
            path = Path(target['path']).resolve()
            if target not in targets or not path.is_relative_to(scratch) or path.stat().st_size > 32 * 1024 * 1024:
                raise ValueError('stock extraction is not a verified batch destination')
            if row['key'] not in path.read_text():
                raise ValueError('stock candidate lacks exact window provenance')
    return dict(coverage=coverage, read=sorted(found), unread=[r['key'] for r in rows if r['status'] == 'unread'], evidence=found,
                session=proof['session'], turn=proof['turn'], report_sha256=data.fingerprint(report))


def reconcile(state, root, summary=None, alive=lambda pid: False):
    summary = summary if summary is not None else state.setdefault('external_stock', {})
    coverage = {}; latest = None; workers = []; published_bids = set()
    for bid, batch in state.get('batches', {}).items():
        stock = batch.get('external_binding', {}).get('stock')
        if not stock:
            continue
        retired = False
        if batch.get('state') in ('done', 'failed') and not alive(batch.get('pid')):
            from strategy_backfill_jobs import retired as verified_retired
            try:
                verified_retired(bid, batch, directory(root)); retired = True
            except (*ERRORS, RuntimeError):
                pass
        if not retired:
            workers.append(dict(batch=bid, state=batch.get('state'), pid=batch.get('pid'),
                                alive=bool(alive(batch.get('pid'))), retirement='unverified'))
        reads = batch.get('external_stock_reading')
        report = batch.get('report', {})
        if reads and reads.get('report_sha256') != data.fingerprint(report):
            reads = None
        if not reads and report.get('external_reading'):
            try:
                reads = reading_proof(root, bid, batch, report)
                batch['external_stock_reading'] = reads
            except ERRORS:
                pass  # Preserve an allocated/unknown read; never infer coverage from a completed wrapper.
        if batch.get('knowledge_publication') and re.fullmatch(r'K1-[a-f0-9]{64}', str(batch['knowledge_publication'].get('version'))):
            published_bids.add(bid)
        published_content = ''
        publication = batch.get('knowledge_publication')
        if publication and report.get('knowledge_candidate'):
            try:
                path = Path(report['knowledge_candidate']).resolve()
                scratch = (Path(batch['worktree']) / 'learner/runs').resolve()
                if path.is_relative_to(scratch) and path.stat().st_size <= 32 * 1024 * 1024:
                    raw = path.read_bytes()
                    body = json.loads(raw)
                    if digest(raw) == publication.get('candidate_sha256') and body.get('id') == bid:
                        published_content = '\n'.join(body['files'].values())
            except ERRORS:
                pass  # A batch receipt alone never proves each input reached a published knowledge member.
        for ref in stock['records']:
            key = ref['key']
            row = coverage.setdefault(key, dict(allocation='allocated', reading='unverified', distillation='pending',
                publication='unpublished', consumption='unknown', batches=[]))
            row['batches'].append(bid)
            if reads and key in reads['read']:
                row['reading'] = 'read'
            if reads:
                disposition = next(r for r in reads['coverage'] if r['key'] == key)
                row['distillation'] = disposition['state']
            if batch.get('state') == 'done' and batch.get('external_result'):
                latest = dict(batch=bid, report=report.get('report'), publication=batch.get('knowledge_publication'))
            publication = batch.get('knowledge_publication')
            if publication and re.fullmatch(r'K1-[a-f0-9]{64}', str(publication.get('version'))):
                row['batch_output_version'] = publication['version']
                if row['distillation'] == 'candidate' and key in published_content:
                    row.update(publication=publication['version'], consumption='pending')
    summary.update(coverage=coverage, read_records=sum(r['reading'] == 'read' for r in coverage.values()),
        allocated_records=len(coverage), workers=workers, latest_output=latest,
        published_evidence_records=sum(r['publication'].startswith('K1-') for r in coverage.values()),
        published_batches=len(published_bids))
    if Path(root, CONTROL).exists():
        path = directory(root) / 'external-stock/status.json'; path.parent.mkdir(parents=True, exist_ok=True)
        atomic_json(path, summary)
    return summary
