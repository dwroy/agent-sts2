import json,subprocess
from pathlib import Path
p=Path(__file__).parent;run='J8PHG72DGD90'
notes={
 'silent-0019':(30,3,'四火零精英路线的实际动作是锻造／回血／添火／回血。F28胜后50，F30胧光怪／寄生惧魔胜后13、净损37；F31重打胜后5、净损8，F32只补22到27进boss。赢战完整资源链支持不能把无精英或未来回血当安全保证；没有换线胜负对照。'),
 'silent-0079':(33,12,'第5/6试同3HP、敌207、24毒、力量3、16攻击；原打击/防御/后空翻得14挡损2、直伤9与毒24；代码SL删打击后Jev补偏折，20挡零损、仅毒24。下一轮HP1/3、敌204/213，省2血少9伤；分别判死/实死，是反向取舍印证，不把失败推演同值当等效，也不登记少挡多损的同操作重犯。'),
 'silent-0274':(33,13,'末试防御/蛇咬/隐秘匕首用满SLOTH3，生成两小刀均blocked_by_hook、没有实际出牌伤害；饮毒药仍合法、毒30→36。扩展既有奇巧兑现窗口到生成牌，只作support，未重复原手上技法选爆发动作，不称原0245重放计数bug复发。'),
 'silent-0125':(9,3,'d304443 HP guard唯一替换：原生存者/中和+/隐秘匕首/两小刀预测损10伤18，替生存者/双防御/中和+损0伤9。替线实际18挡、5直伤加4毒、HP67不变；原线未实打，省10血仅预测差、少9伤亦无原线整战对照。此精英后续实耗27，不能据终局失败否定护栏或拟阈值。'),
 'silent-0005':(33,12,'末试步法建立2敏捷，普通防御与后空翻各7、偏折6，两7加6合20，比基础5+5+4多6；T12挡住16零损，T13单防御7对24、3HP仍死。首次能力同时取得遗物7挡另归0173，不倒补既有挡。'),
 'silent-0053':(33,4,'普通萎靡在后空翻后以X3实使敌力量0→-3、虚弱3，意图13→7，7挡零损；PONDER后敌力回0、T9为3、T13为6，后续敌方新增力并未停止。'),
 'silent-0046':(33,11,'末试尖啸使敌力3→-3，12×3=36变6×3=18，双7挡共14、实损4；T12敌力复为3，不当永久减力。'),
 'silent-0102':(33,12,'末试T4/8/12思考后敌本体净回升21/7/6，轮末毒9/23/24各减1，按单次毒结算反推各回30；第5试T12另见s313079→313080的174→204回血30中间帧。末试累计回血条件核算90、预算489、已扣312、敌残177。末试三次缺独立回血中间帧，净进度与机制反推毛伤分列。'),
 'silent-0173':(33,2,'末试首次能力步法s313094→095令敏捷0→2，同时格挡0→7；持永冻冰晶，后继能力幻影之刃不重复给这7挡。基础步法敏捷与首次能力遗物挡分账，T2中和后13攻仍损6。'),
 'silent-0247':(33,13,'本局无重放，原始cards_played_this_turn=3/SLOTH3时生成的两零费小刀被锁；饮药后计数仍3。支持已观察牌数限额窗口，未扩展其他自动或重放机制。'),
 'silent-0278':(33,13,'末试d305157饮毒药s313157→158：敌HP213不变，毒30→36；结束s313159敌177、毒35。新获8瓶、实际饮14次、其中同一槽0毒经6次SL恢复共饮7次，恢复不计新获；没有更早饮用的胜负对照。'),
 'silent-0185':(29,None,'本局南瓜蜡烛取得5，F19/21/23/28胜后4/3/2/1；F29实际添火1→6、HP50不变，F30/F31胜后5/4、F33六试首帧均4。正量续火新边界独立记0328，先验与旧零量观察不改。'),
 'silent-0186':(29,None,'F29题面current_charges1、KINDLE参考null，实际d304744/s312605→606为1→6。新增mechanic0328为只补该已见输入1的事实参考提供证据，其他正量/上限继续未知；boss_sim明确不模拟添火收益，0.0566基线不作添火方案胜率。'),
 'silent-0154':(33,13,'末试隐秘匕首零费、自动处理仅余两张原牌后生成两小刀；s313156→157能量0不变，cards_played2→3，双刀被SLOTH锁住。只支持普通版弃牌/生成机制与兑现边界，不认成抽2或实际26伤。')}
items=[]
for ident,(floor,turn,note) in notes.items():
 ev={'run':run,'floor':floor,'role':'support','note':note}
 if turn is not None:ev['turn']=turn
 item={'id':ident,'by':'learner:postmortem','evidence':[ev],'where':{'lessons':[run]}}
 path=p/(ident+'-update.json');path.write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n');items.append(item)
 subprocess.run(['date','+%Y-%m-%d %H:%M:%S %Z'],check=True)
 r=subprocess.run(['python3','/home/dw/Projects/agent-sts2/learner/ledger.py','update'],input=json.dumps(item,ensure_ascii=False),text=True,capture_output=True)
 (p/(ident+'-update.out')).write_text(r.stdout);(p/(ident+'-update.err')).write_text(r.stderr)
 print(ident,r.returncode,r.stdout.strip(),flush=True)
 if r.returncode:raise SystemExit(r.returncode)
(p/'ledger-updated.json').write_text(json.dumps(list(notes),ensure_ascii=False,indent=2)+'\n')
