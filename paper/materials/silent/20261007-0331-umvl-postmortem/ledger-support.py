import json,subprocess
from pathlib import Path
p=Path('learner/runs/20261007-031302-postmortem')
items=[
('silent-0005',48,11,'末次三步法实际建立3+2+2=7敏捷，防御+基础8变15；末轮施防御又得音叉7共22挡，仍不足8血抵40攻击加12凋萎。敏捷与当轮实际格挡分账。'),
('silent-0006',48,11,'末次沙漏最后力量15、4虚弱，EYE_LASERS_MOVE仍20×2=40。玩家的7敏捷及2力量没有关闭敌方成长；22挡与8血仍不足，未作去掉任一增益的受控整战比较。'),
('silent-0011',48,7,'首试T2毒雾3层、T3再普通毒雾2层，后续5层持续施毒已观察；末试T7存在含毒雾选项但SL重放撤掉，直到死亡全战没有NOXIOUS_FUMES_POWER。持有两牌不能预支未实际建立的轮初施毒。'),
('silent-0024',48,11,'末试T10末34挡对30攻击、持有12伤凋萎后实际损8；T11末22挡对40攻击及12凋萎，完整需损30、8血死亡是截断。T8出两牌新增9伤凋萎使结束题报38、实损38；初题29差9具体根因未核定，不另列纯bug。'),
('silent-0025',48,11,'沙漏进场3人工制品，末试后段已清；玩家燃烧实建2力量，末轮打击6→8、带毒刺击+8→10，后者敌挡33→23而实体血不变，施4毒使8→12再结算12。敌最后力量15且有4虚弱仍两击40，增益、敌挡与已结算毒分开记。'),
('silent-0046',27,3,'棱柱尖啸后力量-6、三击6，追加防御及致命毒药+令污染3→6→9、攻击6→12→18，最终5挡需损13并兑现；临时减力不能当作已取消后续新增污染伤害。'),
('silent-0072',48,11,'末次防御+牌面15，施放后实际格挡0→22，音叉补7与敏捷后牌面分账；额外7仍不足抵40攻击和12凋萎，未将题面初次-34至末次-22的12差额全归给音叉。'),
('silent-0167',27,3,'护栏带毒刺击/尖啸后污染3、三击6；重问又防御/毒药+，污染6→9、三击12→18，5挡损13、实扣17。新增两技能的逐击血价与施毒收益同时发生，只支持已学机制，不宣称另一整场线必胜。')
]
for id,f,t,note in items:
 obj={'id':id,'by':'learner:postmortem','evidence':[{'run':'UMVLWER4CD98','floor':f,'turn':t,'role':'support','note':note}],'where':{'lessons':['UMVLWER4CD98']}}
 (p/(id+'-support.json')).write_text(json.dumps(obj,ensure_ascii=False)+'\n')
 r=subprocess.run(['python3','learner/ledger.py','update'],input=json.dumps(obj,ensure_ascii=False),text=True,capture_output=True)
 print(r.stdout.strip(),r.stderr.strip(),'退出码',r.returncode)
 if r.returncode:raise SystemExit(r.returncode)
