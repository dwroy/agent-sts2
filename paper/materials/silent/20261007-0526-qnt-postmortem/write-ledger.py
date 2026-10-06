import json,subprocess,re
root='learner/runs/20261007-051302-postmortem/'
run='QNTW139MGECA'
def ev(f,t,n):
 return {'run':run,'floor':f,'turn':t,'note':n,'role':'support'}
updates={
 'silent-0167':[ev(28,3,'同虚弱三击下能力线无污染、预计/实损9；额外致命毒药候选预计损18/扣5但未选。'),ev(28,5,'两防御和后空翻各8挡也各加6污染；攻击15→33、24挡实损9。三挡线比两挡线预计省2血，不作禁技能规则或repeat。'),ev(28,9,'后空翻8挡加9污染，攻击15→24；后续攻击扣39及3毒后敌剩2，完整需损16超出余6血。')],
 'silent-0057':[ev(22,2,'群蛇形态实际在手，施放萎靡后能量不足；T7再到手仍未施放，全局0次。'),ev(28,5,'构筑已取群蛇和刀刃之舞，T5群蛇在手且3费可用，但选择两防御和后空翻；群蛇线损15/八样本全死、三挡线损9/五样本死，未执行整场能力线。此为持有与建立分账的support。')],
 'silent-0125':[ev(28,1,'唯一HP护栏把Jev0.59原选免费打击/爆发/萎靡（扣9损16）改突然一拳/打击/萎靡（扣17损13）；最廉价7损加8容许为15。实际171→154、60→47，预计省3血/多8伤并撤去重放机会；原线整场未实打，不认repeat。')],
 'silent-0168':[ev(28,3,'PROWESS与FOOTWORK建立1力3敏，不加污染；技能致命毒药候选会增加三连击来袭。'),ev(28,5,'火花6，三技能使污染0→6→12→18、攻击15→21→27→33，下一轮污染消失。'),ev(28,9,'火花9，后空翻污染0→9、攻击15→24；本局火花操作轮T1—4为3、T5—8为6、T9为9。')],
 'silent-0036':[ev(28,3,'普通非凡技艺实际给1力量/1敏捷，步法再给2敏至3；补同牌普通版数值，不改既有升级版2力2敏结论。'),ev(28,9,'1力量使四打击各10、回响11、投掷10，六攻击总61比基础总55多6；先扣敌22挡后实扣39血。')],
 'silent-0005':[ev(17,2,'先防御5，再步法2敏，后生存者10，合15恰盖15攻击；此前已出的防御不追补。'),ev(17,8,'两防御各7、合14，比基础合多4，覆盖14攻击、零损。'),ev(28,5,'已有3敏捷，两防御和后空翻各8、24比基础15多9；污染同时推高攻击至33，实损9。')],
 'silent-0046':[ev(28,4,'尖啸使敌力量−2→−8，与本轮两技能6污染并存，最后8攻击对8挡、零损；T5力量恢复−2且火花为6。')],
 'silent-0053':[ev(17,4,'普通萎靡X3把仪式兽4力减至1、攻击24→15并加3虚弱；零挡仍实损15。'),ev(28,1,'替代线萎靡X2建立敌−2力量和2虚弱，叠突然一拳共3虚弱；本局非零X实打，没有零X收益结论。')],
 'silent-0142':[ev(12,None,'22张牌，入火18→30回12，随后休息30→51另回21。'),ev(16,None,'23张牌，入火38→50回12，随后休息50→73另回23。'),ev(27,None,'29张牌，入火22→37回15，随后休息37→60另回23；本局三次羽毛合39，与四次休息合88分账。')]
}
new={'by':'learner:postmortem','character':'silent','kind':'mechanic','claim':'已观察地道虫TUNNELER的埋地BURROWED_POWER：攻击清空其格挡后，即使本体仍存活甚至没有掉血，埋地消失、当轮原攻击转为眩晕。F4Q T4敌46血17挡→44血0挡、26攻击取消；VPW T5敌34血8挡→34血0挡、15攻击取消；本局T6打穿20挡、敌28→24后23攻击取消。只认这三次现场，不外推固定攻击或选牌优先级。','first_run':'F4QKG4J1AJJZ','prior':'yes','prior_runs':['F4QKG4J1AJJZ','VPW8YH7A4QFM'],'prior_note':'登记本项机制之前，两个更早静默局已经实际用攻击清盾、令存活敌人的攻击取消；未清盾或已击杀的其余遭遇不构成同类触发，不能按错误或反例计。','status':'observed','where':{'lessons':[run]},'evidence':[{'run':'F4QKG4J1AJJZ','floor':19,'turn':4,'note':'精确切击后敌46血17挡→44血0挡，BURROWED消失、BELOW_MOVE的26攻击变STUNNED，玩家40血不变。','role':'support'},{'run':'VPW8YH7A4QFM','floor':19,'turn':5,'note':'突然一拳后敵34血8挡→34血0挡，BURROWED消失、15攻击变STUNNED，玩家56血不变。','role':'support'},ev(22,6,'猛扑后敌28血20挡→28血5挡；突然一拳后24血0挡、BURROWED消失、23攻击改眩晕，本轮29血不变。')]}
results={'added':[],'updated':[],'repeats':[],'operations':[]}
for op,payload in [('update',{'id':id,'by':'learner:postmortem','evidence':es,'where':{'lessons':[run]}})for id,es in updates.items()]+[('add',new)]:
 r=subprocess.run(['python3','learner/ledger.py',op],input=json.dumps(payload,ensure_ascii=False),text=True,capture_output=True)
 print(op,r.returncode,r.stdout.strip(),r.stderr.strip())
 if r.returncode:raise SystemExit(r.returncode)
 if op=='update':results['updated'].append(payload['id'])
 else:
  ids=re.findall(r'silent-\d{4}',r.stdout)
  assert len(ids)==1,r.stdout
  results['added'].append(ids[0])
 results['operations'].append({'op':op,'payload':payload,'reply':r.stdout})
 with open(root+'ledger-results.json','w')as f:json.dump(results,f,ensure_ascii=False,indent=2)
