from pathlib import Path
import json,subprocess
root=Path('/home/dw/Projects/agent-sts2');out=root/'learner/runs/20261009-094302-postmortem';rid='NTMAU4XZ2NN2'
items=[
 ('silent-0019',13,7,'F12休息45→66后，F13双小啃兽胜战仍损23至43；F14实到43，而F11改线投影63、p75 58。含前面全部胜战资源链，无旧线受控实打，不认定重复可避失误。'),
 ('silent-0125',14,2,'Jev原选防御→刀刃之舞预计损12、生成3小刀；8血护栏改冲刺→防御预计且实际损2、扣10。方案省10血但取消生成；原线未整轮实打，0伤是生成节点截断，不当纯bug或重复失误。'),
 ('silent-0286',14,10,'T9弃一感染后两感染6伤加敌9攻减8挡实损7；T10三感染9伤、5挡，1毒结束原18血虫后仍有11攻，完整需损15、8血阵亡。least-loss预计余HP-7语义一致，终局敌仍22/4血。'),
 ('silent-0016',14,4,'护喉甲开场覆甲4，T1—T4为4/3/2/1、T5消失；T2卡挡15+覆甲3对20攻实损2，T4卡挡8+覆甲1对虚弱12攻实损3，没有把开场4当持续值。'),
 ('silent-0289',11,4,'附魔坚韧之环实加7挡、建立TORIC_TOUGHNESS_POWER2，T5/T6轮初各7；T5配冲刺再加10成为17挡，对9攻零损。F14虽抽到环未施放，不预支未执行延迟挡。'),
 ('silent-0012',14,10,'仅补本局扭动虫自身力量与同NASTY_BITE_MOVE关系：0/2/4力时7/9/11攻击，原19血虫T8为2力9攻、T10为4力11攻。支持已有力量逐段预算，保持同族原claim不改，不沿用其攻击值或跨角色推断。')
]
receipts=[]
for ident,floor,turn,note in items:
    item={'id':ident,'by':'learner:postmortem','evidence':[{'run':rid,'floor':floor,'turn':turn,'note':note,'role':'support'}],'where':{'lessons':[rid]}}
    text=json.dumps(item,ensure_ascii=False,indent=2)+'\n';(out/f'ledger-update-{ident}.json').write_text(text)
    subprocess.run(['date'],check=True)
    r=subprocess.run(['nice','-n','19','python3','-B',str(root/'learner/ledger.py'),'update'],input=text,text=True,capture_output=True)
    (out/f'ledger-update-{ident}.stdout').write_text(r.stdout);(out/f'ledger-update-{ident}.stderr').write_text(r.stderr)
    print(ident,r.returncode,r.stdout.strip(),r.stderr.strip())
    if r.returncode:raise SystemExit(r.returncode)
    receipts.append({'id':ident,'returncode':r.returncode})
(out/'ledger-receipts.json').write_text(json.dumps(receipts,ensure_ascii=False,indent=2)+'\n')
