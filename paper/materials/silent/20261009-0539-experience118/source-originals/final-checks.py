import collections, hashlib, json, re
from pathlib import Path
O=Path(__file__).parent.resolve();W=O.parents[2]
B=json.load(open(O/'experience-before.json'));E=json.load(open(W/'knowledge/characters/silent/experience.json'))
C=json.load(open(O/'changes.json'))['entries'];R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
old={e['id']:e for e in B['entries']};new={e['id']:e for e in E['entries']}
ids={c['id'] for c in C};checks=[]
def check(n,v):
    assert v,n
    checks.append(n)
check('版本下一序号',B['version']=='2026-10-09.6' and E['version']=='2026-10-09.7')
check('15更新无新增退役',len(C)==15 and set(old)==set(new) and all(c['before'] and c['after']['status']==c['before']['status']=='active' for c in C))
check('其余条目逐项等价',all(old[i]==new[i] for i in old if i not in ids))
check('更改记录与实际数据一致',all(old[c['id']]==c['before'] and new[c['id']]==c['after'] for c in C))
check('只添加本局支持/保留反例和适用范围',all(c['after']['evidence']==c['before']['evidence']+['J8PHG72DGD90'] and c['after'].get('contradicting',[])==c['before'].get('contradicting',[]) and c['after']['asc']==c['before']['asc'] for c in C))
for e in new.values():
    check('12位角色证据计数 '+e['id'],e['n_support']==len(set(e['evidence'])) and e['n_contradict']==len(set(e.get('contradicting',[]))) and all(re.fullmatch('[A-Z0-9]{12}',r) and r in R and R[r]['character'].lower()=='silent' for r in e['evidence']+e.get('contradicting',[])))
active=[e for e in E['entries'] if e['status']=='active']
check('active191/字数51116/预算60000',len(active)==191 and sum(len(e['lesson']) for e in active)==51116 and sum(len(e['lesson'].encode('utf-16-le'))//2 for e in active)<=60000)
check('旧153七数组复算',all(x['identical'] for x in json.load(open(O/'baseline-check.json')).values()))
check('16关键帧',json.load(open(O/'verified.json'))['passed']==16)
for phase,source in [('before',O/'experience-before.json'),('after',W/'knowledge/characters/silent/experience.json')]:
    check('冻结切片经验原字节 '+phase,(O/('slice-knowledge-'+phase)/'characters/silent/experience.json').read_bytes()==source.read_bytes())
for f in json.load(open(O/'other-knowledge.json')):
    check('其余知识保持 '+f['file'],hashlib.sha256((W/f['file']).read_bytes()).hexdigest()==f['sha256'])
if (O/'role-audit.json').exists():check('全103441状态角色隔离',json.load(open(O/'role-audit.json'))['foreign']==0)
(O/'final-verification.json').write_text(json.dumps(dict(passed=len(checks),checks=checks),ensure_ascii=False,indent=2)+'\n')
print('最终核验通过',len(checks))
