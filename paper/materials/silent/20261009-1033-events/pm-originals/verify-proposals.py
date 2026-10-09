import json,hashlib
from pathlib import Path
p=Path(__file__).parent;report=json.load((p/'report.json').open());want=set(report['code_proposals']);found={}
for line in Path('paper/materials/learning/code-proposals.jsonl').open():
 x=json.loads(line)
 if x.get('id') in want and x.get('op')=='add':found[x['id']]=x
assert set(found)==want
for id,x in found.items():
 assert x['character']=='silent' and x['source_task']=='postmortem' and x['target_task']=='strategy-proposal' and x['state']=='pending'
 assert hashlib.sha256(Path(x['proposal']).read_bytes()).hexdigest()==x['proposal_sha256']
 print(id,x['state'],x['domains'],x['ledger'],'文件指纹一致')
print('报告、提案注册和文件指纹均通过；保留初次字段误读失败记录。')
