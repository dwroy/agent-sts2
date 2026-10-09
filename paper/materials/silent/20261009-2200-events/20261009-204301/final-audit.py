import json,pathlib,hashlib,subprocess
p=pathlib.Path('learner/runs/20261009-204303-postmortem');pre=json.load((p/'lessons-preappend.json').open());less=pathlib.Path('notes/lessons.md');payload=(p/'lessons-draft.md').read_bytes()
with less.open('rb') as f:
 prefix=f.read(pre['size']);f.seek(pre['size']);suffix=f.read(len(payload))
assert hashlib.sha256(prefix).hexdigest()==pre['sha256'];assert suffix==payload
assert sum(line.startswith('## 54G5683J0E5S') for line in less.open())==1
rows=json.load((p/'ledger-final.json').open());expected={'silent-0347','silent-0348','silent-0020','silent-0125','silent-0005','silent-0013','silent-0046','silent-0233','silent-0162','silent-0312','silent-0259'};assert expected<={row['id'] for row in rows}
for row in rows:
 if row['id'] in expected:assert '54G5683J0E5S' in row.get('where',{}).get('lessons',[])
for row in rows:
 if row['id'] in {'silent-0347','silent-0348'}:assert row['status']=='observed'
# Compare each copied source row to its original byte range, without loading the full logs.
count=0
for run in ['54G5683J0E5S','10GPK5XGHCK3']:
 for name in ['decisions','states','run-plans','sl-attempts']:
  extracted=p/f'{run}-{name}.jsonl'
  if not extracted.exists():continue
  with extracted.open() as src,(pathlib.Path('logs')/f'{name}.jsonl').open('rb') as raw:
   for line in src:
    row=json.loads(line);off=row.pop('_offset');row.pop('_line');raw.seek(off);original=json.loads(raw.readline());assert row==original;count+=1
r=subprocess.run(['python3','learner/ledger.py','check'],text=True,capture_output=True)
a={'旧前缀保持':True,'正式追加与草稿一致':True,'标题次数':1,'逐原始字节核验条目':count,'关键数字校验':len(json.load((p/'draft-checks.json').open())),'关键数字失败':0,'ledger_check':{'exit':r.returncode,'stdout':r.stdout,'stderr':r.stderr},'账本条目':sorted(expected),'提案':['silent-proposal-43156dee9f23ae43','silent-proposal-4215d1a68ed970e6']}
(p/'final-audit.json').write_text(json.dumps(a,ensure_ascii=False,indent=2)+'\n');print(json.dumps(a,ensure_ascii=False));assert r.returncode==0
(p/'offline-failures.md').write_text('抽取初稿analyze.py遇到KeyError: chosen，未修改原始日志或复盘；原脚本保留，analyze-v2.py使用可选字段继续成功。第一次源码搜索用了不存在的enemy-model.ts，rg返回缺文件提示；后续按实际rollout-live.ts定位成功。无游戏bug或代码测试失败由这两次工具错误产生。\n')
