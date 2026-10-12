import subprocess,json
from pathlib import Path
out=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-141302-postmortem')
for key in ['SLUMBERING','BOWLB','熟睡','灵动','FRAIL','BYGONE','毒药水','HP护栏','FOOTWORK','残片']:
    result=subprocess.run(['python3','learner/ledger.py','find','--character','silent','--text',key,'--json'],capture_output=True,text=True)
    (out/f'ledger-search-{key}.json').write_text(result.stdout)
    rows=json.loads(result.stdout)
    print(key,len(rows))
    for r in rows:
        print(r['id'],r['kind'],r['status'],r.get('version'),r['first_run'],r['claim'])
