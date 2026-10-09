import json,subprocess
from pathlib import Path
p=Path(__file__).parent.resolve();results=[]
configs=[('random-poison',['silent-0295','silent-0010'],['combat'],'多敌随机药瓶后的目标启毒条件必须重读，避免以单一分配虚构冒泡后缀'),('discard-boundary',['silent-0205'],['combat'],'弃牌题展示承诺后继的实际预算，分列丢冲刺的血价和丢腐化串刺的自损收益'),('revive-resource',['silent-0350','silent-0019'],['combat','potion','sl'],'固定核验多段攻击精灵出口8/14和SL两药恢复，证据不足保留当前规则')]
for name,ledger,domains,summary in configs:
 item={'character':'silent','ledger':ledger,'runs':['0PH64C4AWAX9'],'source_task':'postmortem','target_task':'strategy-proposal','domains':domains,'summary':summary,'proposal':str(p/f'proposal-{name}.md'),'rule_changes':False,'authorization':'Roy-2026-10-07-learning'}
 (p/f'proposal-{name}.json').write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
 print(subprocess.run(['date','-Is'],capture_output=True,text=True,check=True).stdout.strip())
 r=subprocess.run(['python3','/home/dw/Projects/agent-sts2/learner/code_proposals.py','add','--character','silent'],input=json.dumps(item,ensure_ascii=False),text=True,capture_output=True)
 (p/f'proposal-{name}-cli.txt').write_text(r.stdout+r.stderr)
 results.append({'name':name,'id':r.stdout.strip(),'returncode':r.returncode,'stderr':r.stderr,'domains':domains,'ledger':ledger})
 (p/'proposal-registration-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
 print(name,'exit',r.returncode,r.stdout.strip(),r.stderr.strip())
 if r.returncode:raise SystemExit(r.returncode)
