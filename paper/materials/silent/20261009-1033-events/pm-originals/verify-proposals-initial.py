import json
from pathlib import Path
p=Path(__file__).parent;report=json.load((p/'report.json').open());want=set(report['code_proposals']);found={}
for line in Path('paper/materials/learning/code-proposals.jsonl').open():
 x=json.loads(line)
 if x.get('id') in want and x.get('op')=='add':found[x['id']]=x
assert set(found)==want
for id,x in found.items():
 assert x['status']=='pending'
