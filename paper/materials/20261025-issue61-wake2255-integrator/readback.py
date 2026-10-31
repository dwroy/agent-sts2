from pathlib import Path
import collections
import hashlib
import json
import re
import subprocess

root = Path('/home/dw/Projects/agent-sts2')
out = Path(__file__).resolve().parent
sha = lambda data: hashlib.sha256(data).hexdigest()
checked = {}

def check(ref):
    data = (root / ref['path']).read_bytes()
    assert sha(data) == ref['sha256'], ref['path']
    if 'bytes' in ref:
        assert len(data) == ref['bytes'], ref['path']
    checked[ref['path']] = {'bytes': len(data), 'sha256': sha(data)}
    return data

def load(path):
    data = (root / path).read_bytes()
    checked[path] = {'bytes': len(data), 'sha256': sha(data)}
    return json.loads(data)

new = load('paper/materials/20261025-wake2255-ops/notices-readback.json')
old = load('paper/materials/20261025-wake1343-ops/notices-readback.json')
inventory = load('paper/materials/20261025-wake2255-ops/event-inventory.json')
events = check(inventory).decode()
blocks = re.findall(r'(?ms)^\d+\. \[([^\]]+)\] (.*?)(?=^\d+\. \[|\Z)', events)
counts = collections.Counter()
for kind, body in blocks:
    if kind != 'learning-attention':
        continue
    ids = re.findall(r'learning-notices/([0-9a-f]{24})\.json', body)
    assert len(ids) == 1
    counts[ids[0]] += 1
assert len(blocks) == 198
assert sum(counts.values()) == new['repeated_events'] == 144
assert len(counts) == new['unique_notices'] == 16
assert set(counts) == {row['id'] for row in new['notices']}
inboxes = {name: (root / name).read_text() for name in ['notes/for-roy.md', 'ops/inbox-dev.md']}
previous = {row['id']: row for row in old['notices']}
rows = []
for current in new['notices']:
    nid = current['id']
    row = previous[nid]
    path = row['original_notice']['path']
    raw = (root / path).read_bytes()
    notice = json.loads(raw)
    assert notice['id'] == nid
    assert notice['message'] == row['message']
    assert sha(notice['message'].encode()) == current['message_sha256'] == row['message_sha256']
    assert notice['ops_forwarded']['sha256'] == row['ops_forwarded_receipt']['sha256']
    assert Path(notice['ops_forwarded']['path']) == root / row['ops_forwarded_receipt']['path']
    assert notice['watcher_received'] is False and notice['roy_notified'] is False
    forwarded = json.loads(check(row['ops_forwarded_receipt']))
    evidence = json.loads(check(row['ops_forwarded_evidence']))
    assert forwarded['notice_id'] == evidence['notice_id'] == nid
    assert forwarded['actor'] == 'ops' and forwarded['stage'] == 'ops_forwarded'
    assert forwarded['status'] == 'delivered'
    assert forwarded['evidence']['sha256'] == row['ops_forwarded_evidence']['sha256']
    for target in evidence['destinations']:
        assert evidence['text'] in inboxes[target]
    for original in row['actual_original_watcher_receipts']:
        receipt = json.loads(check(original['receipt']))
        check(original['evidence'])
        assert receipt['notice_id'] == nid and receipt['actor'] == 'watcher'
        assert receipt['stage'] == original['stage'] and receipt['status'] == 'delivered'
        assert receipt['evidence']['sha256'] == original['evidence']['sha256']
    for ref in current['current_source_refs_verified']:
        check(ref)
    rows.append({'id': nid, 'events': counts[nid], 'current_notice_sha256': sha(raw),
                 'equals_ops_snapshot_sha': sha(raw) == current['current_notice_sha256'],
                 'message_unchanged': True, 'actual_forwarded_and_two_inboxes': True,
                 'actual_original_role_receipts': 2, 'formal_watcher_received': False,
                 'formal_roy_notified': False})
wrapper = load('paper/materials/20261025-wake1343-ops/missing-wrapper-readback.json')
missing = [{'path': ref['path'], 'exists': (root / ref['path']).exists()}
           for ref in wrapper['original_bound_paths']]
assert all(not ref['exists'] for ref in missing)
result = {'at': subprocess.check_output(['date', '-Is'], text=True).strip(),
          'events': len(blocks), 'learning_attention_events': sum(counts.values()),
          'unique_original_notices': len(counts), 'notices': rows,
          'checked_immutable_files_and_source_manifests': checked,
          'formal_watcher_received': 0, 'formal_roy_notified': 0,
          'production_ACK_commands': 0, 'notification_or_learning_state_writes': 0,
          'current_queue_metadata_mutable': True,
          'prior_whole_notice_sha_historical_only': True,
          'original_15_rc2_not_replayed': True,
          'missing_wrapper_paths': missing,
          'required_wrapper_sha256': wrapper['required_original_sha256'],
          'compatibility_wait': 'Original CLI owner assignment and five source-owner approvals, fixed delivery/checks/deployment; then watcher registers original receipts and independently reads back each stage.',
          'wrapper_wait': 'Original archive owner; outside 15 historical-source compatibility cases.',
          'current_ledger_check_rerun': False,
          'probe_history': 'Initial read-only probe incorrectly expected ops_forwarded bool True; actual field is the original receipt reference object. Corrected probe validates its exact path/SHA. Source notice bytes unchanged.',
          'priority_preserved': '#70 P0 before nonblocking #68; no full/publication replay.'}
(out / 'independent-readback.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({key: result[key] for key in ['at', 'events', 'learning_attention_events', 'unique_original_notices', 'formal_watcher_received', 'formal_roy_notified', 'production_ACK_commands']}))
print('immutable_files_and_manifests', len(checked), 'all_current_notice_SHA_match', all(row['equals_ops_snapshot_sha'] for row in rows))
