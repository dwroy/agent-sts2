import json,subprocess
from pathlib import Path
O=Path(__file__).parent; S=json.load(open(O/'speed-history.json'));first=S['support'][0]
row=dict(character='silent',by='learner:experience-update',kind='potion',claim='速度药水实饮当步加5临时敏捷，须在本轮卡牌格挡兑现；32局38次加层一致，下一轮速度层均消失。35次敏捷净撤5，另3次有独立敏捷来源变化；不制定喝药或留药门槛。',first_run=first,prior='yes',prior_runs=[first],prior_note='该机制学习登记前，静默首局C48 F12 T2已经按Jev方案先速度药再防御，药后防御7→12并实际施放，下一轮敏捷7→2；仅证明基本使用已做对，脆弱组合的首学/unknown仍留0091。',status='proposed',evidence=[dict(run=n,floor=(c:=next(c for c in S['cases'] if c['run']==n))['floor'],turn=c['turn'],role='support',note='实饮敏捷和速度层各+5、次轮速度层消失；独立敏捷来源及逐帧数据见本批speed-history.json。') for n in S['support']],where=dict(experience=['silent-speed-potion-temporary-dexterity']))
(O/'ledger-new-input.json').write_text(json.dumps(row,ensure_ascii=False,indent=2)+'\n')
r=subprocess.run(['python3','/home/dw/Projects/agent-sts2/learner/ledger.py','add'],input=json.dumps(row,ensure_ascii=False),text=True,capture_output=True)
(O/'ledger-new-cli.log').write_text(r.stdout+r.stderr);print(r.stdout+r.stderr);r.check_returncode()
