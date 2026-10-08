import json,subprocess
from pathlib import Path
p=Path(__file__).parent.resolve();specs=[('sl-guard',['silent-0079','silent-0125','silent-0019'],['combat','sl'],'核验同盘SL省2血少9伤与护栏预测/实打差，补最终执行和资源对照，证据不足不改攻防阈值'),('cap-potion',['silent-0274','silent-0154','silent-0247','silent-0278'],['combat','potion'],'懒惰末额度区分生成牌本轮可打数与限额后仍可喝毒药的兑现窗口，不加未打小刀伤或新饮药阈值'),('candle-reference',['silent-0328','silent-0185','silent-0186'],['structure'],'仅补silent A10已观察的蜡烛正1充能添火1→6营火条件参考，其他正量/上限继续未知')]
ids=[]
for name,ledger,domains,summary in specs:
 item={'character':'silent','ledger':ledger,'runs':['J8PHG72DGD90'],'source_task':'postmortem','target_task':'strategy-proposal','domains':domains,'summary':summary,'proposal':str(p/('proposal-'+name+'.md')),'rule_changes':False,'authorization':'Roy-2026-10-07-learning'}
 (p/('proposal-'+name+'.json')).write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
 subprocess.run(['date','+%Y-%m-%d %H:%M:%S %Z'],check=True)
 r=subprocess.run(['python3','/home/dw/Projects/agent-sts2/learner/code_proposals.py','add','--character','silent'],input=json.dumps(item,ensure_ascii=False),text=True,capture_output=True)
 (p/('proposal-'+name+'.out')).write_text(r.stdout);(p/('proposal-'+name+'.err')).write_text(r.stderr)
 print(name,r.returncode,r.stdout.strip(),flush=True)
 if r.returncode:raise SystemExit(r.returncode)
 ids.append(r.stdout.strip())
(p/'code-proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n')
