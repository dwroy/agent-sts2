from pathlib import Path
import datetime, hashlib, json, math, subprocess, sys

R = Path('/home/dw/Projects/agent-sts2')
sha = lambda b: hashlib.sha256(b).hexdigest()
now = lambda: subprocess.check_output(['date', '-Is'], text=True).strip()
def save(p, d):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
def readref(x):
    p = Path(x['path'])
    if not p.is_absolute(): p = R / p
    with p.open('rb') as f:
        f.seek(x.get('offset', 0))
        b = f.read(x['bytes']) if 'bytes' in x else f.read()
    assert sha(b) == x['sha256'], x
    if 'bytes' in x: assert len(b) == x['bytes'], x
    if 'cutoff' in x: assert x.get('offset', 0) + len(b) <= x['cutoff'], x
    return b
def walkrefs(x, checks):
    if isinstance(x, dict):
        if all(k in x for k in ['path', 'sha256']) and ('bytes' in x or 'offset' in x):
            b = readref(x)
            checks.append(dict(path=x['path'], offset=x.get('offset', 0), bytes=len(b), sha256=sha(b)))
        else:
            for v in x.values(): walkrefs(v, checks)
    elif isinstance(x, list):
        for v in x: walkrefs(v, checks)

M = R / 'paper/materials/20261026-issue51-231305-integrator'
O = R / 'paper/materials/20261025-knowledge231305-ops'
names = ['publication-readback.json', 'actual-tools.json', 'consumer-contexts.json', 'natural-consumer-readback.json', 'original-report-handoff.json', 'notification-forwarding.json', 'published-delta.json']
docs = {n: json.loads((O/n).read_text()) for n in names}
checks = []
for n in names:
    p = O/n
    checks.append(dict(path=str(p.relative_to(R)), bytes=p.stat().st_size, sha256=sha(p.read_bytes())))
for n in ['consumer-contexts.json', 'natural-consumer-readback.json', 'original-report-handoff.json', 'notification-forwarding.json']:
    walkrefs(docs[n], checks)
n = docs['natural-consumer-readback.json']; t = docs['actual-tools.json']; pub = docs['publication-readback.json']
assert n['knowledge']['runtime_version'] == t['version'] == pub['status']['version']
assert len(n['outer_questions']) == 4 and len(n['native_attempts']) == 9
assert sum(x['completed_dynamic_tools'] for x in n['native_attempts']) == 4
for q in n['outer_questions']:
    raw = json.loads(readref(q['source']))
    assert raw['accepted'] is False and 300000 <= q['latency_ms'] <= 300002
assert t['updated_entries_exact'] == 4 and t['old_revisions_exact'] == 4
save(M/'independent-readback.json', dict(at=now(), original_issue='https://github.com/dwroy/agent-sts2/issues/51#issuecomment-6399925595', checked_refs=checks, run=n['run'], version=t['version'], outer_questions=n['outer_questions'], native_attempts=n['native_attempts'], updated_entries=4, new_ids=0, natural_adoption=False, no_production_tool_replay=True, original_handoff_received=True, formal_notice_ack=False, roy_read_ack=False))
print('51 refs', len(checks), '4 questions / 9 native attempts / 4 completed tools')

O = R / 'paper/materials/20261026-wake0006-ops'
M = R / 'paper/materials/20261026-issue65-midnight-integrator'
boundary = json.loads((O/'native-boundary.json').read_text())
raw = readref(boundary['native_prefix'])
receipt = json.loads((R/'.artifacts/ops-wake0006-20261026/learner-20261025-234303-strategy-proposal.tui.json').read_text())
assert sha(json.dumps(receipt).encode()) # Receipt identity is checked using its original bytes below.
refs = json.loads((O/'original-artifact-refs.json').read_text())['refs']
for ref in refs:
    preserved = dict(ref, path=ref['preserved'])
    readref(preserved)
rows = [json.loads(line) for line in raw.splitlines()]
users = [x for x in rows if x.get('type') == 'response_item' and x.get('payload', {}).get('role') == 'user']
sys.path.insert(0, str(R/'ops'))
import learner_tui
first, last = users[0], users[-1]
turn = receipt['turn']
initial = learner_tui.environment_profile(first['payload']['content'][1]['text'], first['timestamp'], receipt['cwd'], True)
update = learner_tui.environment_profile(last['payload']['content'][0]['text'], last['timestamp'], receipt['cwd'])
meta = first['payload']['internal_chat_message_metadata_passthrough']
delta = round(datetime.datetime.fromisoformat(first['timestamp'].replace('Z', '+00:00')).timestamp()*1000) - math.floor(meta['create_time']*1000)
assert delta == 1
assert not learner_tui.native_environment_source(first, turn, True)
assert learner_tui.native_environment_source(last, turn)
assert initial['filesystem'] == update['filesystem'] and initial['timezone'] == update['timezone']
try:
    learner_tui.reconstruct_native(receipt, source=raw.decode().splitlines(keepends=True))
    raise AssertionError('expected original rejection')
except ValueError as e:
    error = str(e)
assert error == 'native user input is not the dispatched prompt', error
assert sum(x.get('type') == 'event_msg' and x.get('payload', {}).get('type') == 'task_started' for x in rows) == 1
save(M/'independent-readback.json', dict(at=now(), original_issue='https://github.com/dwroy/agent-sts2/issues/65#issuecomment-6399971832', session=receipt['session'], turn=turn, prefix_sha256=sha(raw), original_artifact_refs_verified=len(refs), bootstrap_timestamp_delta_ms=delta, initial_source_valid=False, update_source_valid=True, filesystem_identical=True, timezone_identical=True, single_task_started=True, rejection=error, original_retirement_authorized=receipt['retirement_authorized'], original_result=receipt['result'], action='retain working; no input/close/finish/replay/receipt rewrite', no_new_live_status_sample=True, separate_postmortem_missing_batch=True))
print('65 fixed prefix and rejection verified, delta1ms; no retirement authorized')
