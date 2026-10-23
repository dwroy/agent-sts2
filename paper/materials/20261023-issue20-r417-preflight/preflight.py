from pathlib import Path
import base64
import json
import subprocess

R = Path('/home/dw/Projects/agent-sts2')
B = Path(__file__).resolve().parent
M = R / 'paper/materials/20261023-issue20-r417-preflight'
M.mkdir(exist_ok=True)

def git(*args):
    return subprocess.check_output(['git', *args], cwd=R).decode().strip()

old = json.loads((R / 'paper/materials/20261023-issue20-r416-preflight/preflight.json').read_text())
main, live = git('rev-parse', 'main'), git('rev-parse', 'live')
source = json.loads((B / 'public-ref.json').read_text())['object']['sha']
kit = json.loads((B / 'kit-ref.json').read_text())['object']['sha']
assert source == old['source'] and kit == old['kit']
preview = subprocess.run(['git', 'merge-tree', '--write-tree', main, source], cwd=R, capture_output=True, text=True)
assert preview.returncode in (0, 1)
(M / 'merge-tree.log').write_text(preview.stdout + preview.stderr)
tree = preview.stdout.splitlines()[0]

def blob(ref, path):
    row = git('ls-tree', ref, '--', path)
    return row.split()[2] if row else None

leaves = []
for row in old['critical_leaves']:
    path = row['path']
    current = blob(main, path)
    leaves.append(dict(path=path, previous_main_blob=row['current_main_blob'], current_main_blob=current,
                       unchanged_since_last_review=current == row['current_main_blob'], preview_blob=blob(tree, path)))
assert all(row['unchanged_since_last_review'] for row in leaves)
shared = next(row for row in leaves if row['path'].endswith('v6-card-option-loop.test.ts'))
assert shared['current_main_blob'] == shared['preview_blob']

def ancestor(ref):
    result = subprocess.run(['git', 'merge-base', '--is-ancestor', ref, main], cwd=R)
    assert result.returncode in (0, 1)
    return result.returncode == 0

readme = base64.b64decode((B / 'kit-readme.json').read_text()).decode()
followup = [dict(line=i, text=line) for i, line in enumerate(readme.splitlines(), 1)
            if 'deduplicated inbox reason' in line or '## Tick outcomes' in line]
assert len(followup) == 2
data = dict(at=subprocess.check_output(['date', '-Iseconds'], text=True).strip(), main=main, live=live,
            actual_release='V6-R417', behavior_commit='c60de438383f8973ae34159f8be2bec0087d55f5',
            source=source, kit=kit, remote_refs_verified=True,
            latest_issue20_comment=6352062299, latest_developer_comment=6347441779,
            queue_authority=dict(issue46=6353937742, issue26=6354550608),
            pending_order='36 supplement -> 46 -> 26 hint -> 42 tools -> 35 -> 28 -> 37; 37 -> 20',
            source_in_main=ancestor(source), issue37_in_main=ancestor('9e8f900dde2df7829d73482bc8ac632af7128c65'),
            merge_tree_exit=preview.returncode, critical_leaves=leaves,
            conflicts=[line for line in preview.stdout.splitlines() if line.startswith('CONFLICT')],
            readme_followup=followup, full_started=False, tests_repeated=False,
            candidate_assembled=False, source_merged=False, production_changed=False,
            existing_review='8243ecec7a4f07858519f09374e13b803bfad030')
assert not data['source_in_main'] and not data['issue37_in_main']
(M / 'preflight.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(data, ensure_ascii=False))
