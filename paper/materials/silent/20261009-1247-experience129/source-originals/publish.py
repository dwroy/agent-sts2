import json,os,subprocess
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');LIVE=ROOT/'.worktrees/live'
M=json.load(open(O/'live-merge.json'));C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-results.json'));P=json.load(open(O/'code-proposals-results.json'))
assert M['merged'] and (M.get('tests_retry',M['tests'])==0)
def git(args):return subprocess.check_output(['git',*args],cwd=LIVE,text=True).strip()
assert git(['rev-parse','HEAD'])==M['merged'],'合后HEAD变化，停止避免混入他人发布'
assert not git(['diff','--cached','--name-only']),'live已有其他暂存项'
assert json.load(open(LIVE/'knowledge/characters/silent/experience.json'))['version']=='2026-10-09.18'
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip();(O/'publication-time.txt').write_text(stamp+'\n')
name='S1.exp129';v=LIVE/'eval/versions.json';old=v.read_text();parsed=json.loads(old)
assert name not in {x['name'] for x in parsed['versions']},'版本已登记，停止重复发布'
summary=f'静默经验2026-10-09.17→2026-10-09.18，JBX9JLH46KVN/A10；增0改17退0、196 active/51694字符，2087原件与1089参数/角色核验过。源{M["source"]}，合入{M["merged"]}，沙箱tsc/vitest源与合后均0。来源条目'+','.join(c['id'] for c in C)+'；账本'+','.join(L['proposed'])+'。三提案独立strategy-proposal待实现，未标代码implemented或数据shipped；实际登记由运维据完成事件核实。保留九份知识刷新、不停对局。'
entry={'name':name,'family':'Silent','commit':M['merged'],'source':'decision-log '+stamp+': '+summary}
i=old.rfind('\n  ]');assert i>=0
new=old[:i].rstrip()+',\n    '+json.dumps(entry,ensure_ascii=False)+old[i:];assert json.loads(new)['versions']==parsed['versions']+[entry]
v.write_text(new)
line='- '+stamp+' 学习者codex静默第129次经验上线：'+summary+'\n'
with (LIVE/'paper/materials/decision-log.md').open('a') as h:h.write(line)
notice=['','## '+stamp+' Roy：静默第129次经验前缀上线（'+name+'）','',summary,'','| 条目 | 旧文字/规则 | 新文字/规则 | 证据/账本 |','| --- | --- | --- | --- |']
mapids=json.load(open(O/'ledger-map.json'))
for c in C:
 e=c['after'];prior=c['before']['lesson'] if c['before'] else '无此条目'
 notice.append('| '+e['id']+' | '+prior+' | '+e['lesson']+' | JBX9JLH46KVN；'+','.join(mapids[e['id']])+' |')
notice += ['', '预期影响：让构筑/路线/休息的知识前缀采用已核连战资源链、技能加力、敏捷/毒/延后挡及满槽炼制观察，减少预支未执行资源；不承诺本局转胜。源码由独立任务处理，现有证据不足的喝药/SL/目标门槛保持。来源experience-update任务20261009-120922，提案'+','.join(P)+'。', '', '回退：在live从合前'+M['pre']+'恢复knowledge/characters/silent/experience.json，单独提交并登记回退版本，保留刷新数据。其他角色经验未改。', '']
body='\n'.join(notice).encode()
for p in [ROOT/'notes/for-dai.md',ROOT/'ops/inbox-dev.md']:
 fd=os.open(str(p),os.O_WRONLY|os.O_APPEND|os.O_CREAT,0o644)
 try:os.write(fd,body);os.fsync(fd)
 finally:os.close(fd)
subprocess.run(['git','add','eval/versions.json','paper/materials/decision-log.md'],cwd=LIVE,check=True)
patch=subprocess.check_output(['git','diff','--cached'],cwd=LIVE)
q=subprocess.run(['nice','-n','19','gitleaks','stdin','--redact','--no-banner'],input=patch,capture_output=True,cwd=LIVE);(O/'gitleaks-publication.log').write_bytes(q.stdout+q.stderr);assert q.returncode==0
subprocess.run(['git','commit','-m','Publish Silent experience 2026-10-09.18 as S1.exp129','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>'],cwd=LIVE,check=True)
M['publication']=git(['rev-parse','HEAD']);M['eval_version']=name;M['result']='实际合入、合后沙箱通过、唯一S1.exp129及Roy双通知已登记'
(O/'live-merge.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n');print(M['publication'],name)
