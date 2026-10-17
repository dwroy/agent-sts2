"""Append source ancestry only after the new source and consumer were really published."""
import hashlib
import json
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2')
LIVE = ROOT / '.worktrees/live'


def save(path, value):
    assert not path.exists(), path
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def cli(argv, stdin, label):
    result = subprocess.run(argv, input=stdin.read_bytes(), capture_output=True)
    (HERE / (label + '.log')).write_bytes(result.stdout + result.stderr)
    save(HERE / (label + '-command.json'), {'argv': argv, 'stdin': str(stdin),
         'stdin_sha256': hashlib.sha256(stdin.read_bytes()).hexdigest(), 'exit': result.returncode})
    assert result.returncode == 0, (label, result.stderr.decode(errors='replace'))
    return result.stdout.decode().strip()


pub = json.loads((HERE / 'publication.json').read_text())
assert pub['publication'] and pub['live_sandbox_exit'] == 0 and not pub.get('error')
for commit in [pub['source'], pub['merged'], pub['receipt_source'], pub['publication']]:
    subprocess.run(['git', '-C', str(LIVE), 'merge-base', '--is-ancestor', commit, 'HEAD'], check=True)
item = json.loads((HERE / 'proposal-input.json').read_text())
item['implemented_commit'] = pub['source']
save(HERE / 'proposal-implemented-input.json', item)
new_id = cli(['python3', str(ROOT / 'learner/code_proposals.py'), 'add', '--character', 'silent'],
             HERE / 'proposal-implemented-input.json', 'proposal-implemented')
ledgers = json.loads((HERE / 'delivery-ledger.json').read_text())['ids']
rows = [{'id': ident, 'by': 'learner:strategy-proposal',
         'where': {'commits': [pub['source'], pub['merged'], pub['publication']]},
         'note': f"H0/r1同原owner/thread：实际源码{pub['source']}→live合入{pub['merged']}→发布{pub['publication']}/tree{pub['fixed_release_tree']}；经验{pub['experience_version']}/{pub['version']}，源及实际新组合sandbox0，10经验对象真实fixed-consumer读回。新CLI implemented内容身份{new_id}；原2d57提案及稿件不改。固定原107/481完整校准完成，只新增2调参/29验证62行，其余1114行有谓词/源码/编译隔离证明后复用。生产H1有限前缀/刷新输入不同，生产trust未替换；完整Wound资源/F49联合/自然效果/0332/宽父未知。receipt{pub['consumer_receipt']['path']} SHA{pub['consumer_receipt']['sha256']}。仅追加来源，不写shipped或借旧发布号/外部绿；正式release_id及shipped交ops。"}
        for ident in ledgers]
path = HERE / 'ledger-live-source-input.jsonl'
assert not path.exists()
path.write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in rows))
cli(['python3', str(ROOT / 'learner/ledger.py'), 'update', '--character', 'silent'], path, 'ledger-live-source')
for ident in ledgers:
    argv = ['python3', str(ROOT / 'learner/ledger.py'), 'show', ident, '--character', 'silent', '--json']
    result = subprocess.run(argv, capture_output=True)
    assert result.returncode == 0, result.stderr
    (HERE / (ident + '-actual-ledger.json')).write_bytes(result.stdout)
    entry = json.loads(result.stdout)
    assert pub['source'] in entry['where']['commits']
    assert entry['status'] in ['proposed', 'shipped']
print(json.dumps({'implemented_cli_id': new_id, 'source': pub['source'], 'ledgers': ledgers,
                  'learner_wrote_status': False}, ensure_ascii=False))
