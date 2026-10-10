import json,os,subprocess
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');LIVE=ROOT/'.worktrees/live'
M=json.load(open(O/'live-merge.json'));C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-results.json'));P=json.load(open(O/'code-proposals-results.json'))
assert M['merged'] and M.get('tests_retry',M['tests'])==0
def git(args):return subprocess.check_output(['git',*args],cwd=LIVE,text=True).strip()
assert git(['rev-parse','HEAD'])==M['merged']
assert not git(['diff','--cached','--name-only'])
assert json.load(open(LIVE/'knowledge/characters/silent/experience.json'))['version']=='2026-10-09.25'
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip();(O/'publication-time.txt').write_text(stamp+'\n')
v=LIVE/'eval/versions.json';old=v.read_text();parsed=json.loads(old);name='S1.exp'+str(max(int(x['name'].split('exp')[1]) for x in parsed['versions'] if x['name'].startswith('S1.exp') and x['name'].split('exp')[1].isdigit())+1)
summary=f'静默经验2026-10-09.24→2026-10-09.25，R6WDLYS19ZTY/A10；增1改17退0，198 active/50292字符。源{M["source"]}、实际合入{M["merged"]}，源及合后沙箱tsc/vitest0。来源条目'+','.join(c['id'] for c in C)+'；账本'+','.join(L['proposed'])+'；提案'+','.join(P)+'。提案独立strategy-proposal pending，运维据完成事件登记数据shipped；保留刷新，不停对局。'
entry=dict(name=name,family='Silent',commit=M['merged'],source='decision-log '+stamp+': '+summary);i=old.rfind('\n  ]');assert i>=0
new=old[:i].rstrip()+',\n    '+json.dumps(entry,ensure_ascii=False)+old[i:];assert json.loads(new)['versions']==parsed['versions']+[entry];v.write_text(new)
with (LIVE/'paper/materials/decision-log.md').open('a') as h:h.write('- '+stamp+' 学习者codex静默第136次经验上线：'+summary+'\n')
mapping=json.load(open(O/'ledger-map.json'));lines=['','## '+stamp+' Roy：静默第136次经验前缀上线（'+name+'）','',summary,'','| 条目 | 旧规则/文字 | 新规则/文字 | 证据/账本 |','| --- | --- | --- | --- |']
for c in C:lines.append('| '+c['id']+' | '+(c['before']['lesson'] if c['before'] else '此前无此条目')+' | '+c['after']['lesson']+' | R6WDLYS19ZTY；'+','.join(mapping[c['id']])+' |')
lines+=['','预期影响：构筑、路线、休息使用核实的神气群伤、力敏/毒、现场牌版本与真实血药出口，减少预支未执行资源；不保证本局翻胜。缺整战证据的药价/SL/HP参数保留。来源任务experience-update/20261009-184303；独立实现任务strategy-proposal。','', '回退：将live经验恢复为合前'+M['pre']+'中的knowledge/characters/silent/experience.json，单独提交并登记回退版本；并行刷新与历史留存。','']
body='\n'.join(lines).encode()
for p in [ROOT/'notes/for-roy.md',ROOT/'ops/inbox-dev.md']:
    fd=os.open(p,os.O_WRONLY|os.O_APPEND|os.O_CREAT,0o644)
    try:os.write(fd,body);os.fsync(fd)
    finally:os.close(fd)
subprocess.run(['git','add','eval/versions.json','paper/materials/decision-log.md'],cwd=LIVE,check=True);patch=subprocess.check_output(['git','diff','--cached'],cwd=LIVE)
q=subprocess.run(['nice','-n','19','gitleaks','stdin','--redact','--no-banner'],input=patch,capture_output=True,cwd=LIVE);(O/'gitleaks-publication.log').write_bytes(q.stdout+q.stderr);assert q.returncode==0
subprocess.run(['git','commit','-m','Publish Silent experience 2026-10-09.25 as '+name,'-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>'],cwd=LIVE,check=True)
M['publication']=git(['rev-parse','HEAD']);M['eval_version']=name;M['result']='实际合入及合后沙箱通过，唯一版本和Roy双通知完成';(O/'live-merge.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n')
print(M['publication'],name)
