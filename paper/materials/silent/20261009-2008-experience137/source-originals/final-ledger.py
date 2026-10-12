import json
import subprocess
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = Path('/home/dw/Projects/agent-sts2')
source = (O / 'source-commit.txt').read_text().strip()
title = '## 2026-10-09 静默猎手 第一百三十七次增量：1 局 A10（version 2026-10-09.26，分支 exp-silent，' + source[:8] + '）'
M = json.load(open(O / 'ledger-map.json'))
calls, proposed = [], []
for ident in dict.fromkeys(i for ids in M.values() for i in ids):
    subprocess.run(['date'], stdout=subprocess.DEVNULL, check=True)
    es = [e for e, ids in M.items() if ident in ids]
    data = dict(id=ident, by='learner:experience-update', status='proposed', where=dict(experience=es, commits=[source], changelog=[title]), note='第137次经验更新源提交；HNX4A2WBC34W证据、账本与三份独立strategy-proposal已互联。最后原帧核首/末毒瓶+6、第二次耗制品无毒，步法净敏变化须分离减益；不改旧claim/首证/prior/历史。实际合入及shipped由运维按完成事件核实。')
    p = subprocess.run(['nice', '-n', '19', 'python3', str(ROOT / 'learner/ledger.py'), 'update'], input=json.dumps(data, ensure_ascii=False), text=True, capture_output=True)
    calls.append(dict(data=data, stdout=p.stdout, stderr=p.stderr, exit=p.returncode))
    (O / 'final-ledger-cli.json').write_text(json.dumps(calls, ensure_ascii=False, indent=2) + '\n')
    assert p.returncode == 0, p.stderr
    proposed.append(ident)
p = subprocess.run(['nice', '-n', '19', 'python3', str(ROOT / 'learner/ledger.py'), 'check'], text=True, capture_output=True)
(O / 'ledger-check-final.log').write_text(p.stdout + p.stderr)
(O / 'ledger-results.json').write_text(json.dumps(dict(added=[], proposed=proposed, retired=[], check=p.returncode), ensure_ascii=False, indent=2) + '\n')
assert p.returncode == 0, p.stderr
print('proposed', len(proposed), '条；ledger.py check 0')
