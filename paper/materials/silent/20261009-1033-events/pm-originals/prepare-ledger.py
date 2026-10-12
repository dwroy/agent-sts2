import json
from pathlib import Path
p=Path(__file__).parent; run='E6DYYXRX7GVE';items=[]
def upd(id,floor,turn,note,extra=None):
 item={'id':id,'by':'learner:postmortem','evidence':[{'run':run,'floor':floor,'turn':turn,'note':note,'role':'support'}],'where':{'lessons':[run]},'note':'20261009-101302-postmortem：仅追加本局支持证据，保留旧claim、首证、prior、状态、版本及历史；未证实可避错误重犯。'}
 if extra:item['evidence']+=extra
 items.append(item)
upd('silent-0020',43,None,'F42胜战50→18、带骨肉回12至30；F43羽毛回21至51、休息实回17至68；F45满68进仍T6死。各来源分账，无锻造/留药整场对照。')
upd('silent-0125',33,2,'第2次Jev原线损13/伤20，8血护栏换为损3/伤12；实际70→67、379→367，方案省10血少8伤并取消两刀生成；原線未执行，不归因T14局胜。')
upd('silent-0278',45,6,'毒药水当步22→28毒、敌HP68不变；结束实扣28剩40，3血0挡仍面对尖啸后17攻。原题不模拟毒瓶；只提接入已观察药效，不立早喝/留药阈值。',[{'run':run,'floor':33,'turn':11,'note':'首试T11毒28→34、敌HP135不变；8血0挡对15攻判死读档，34毒未结算；次试恢复同瓶，不算新获药。','role':'support'}])
upd('silent-0005',45,2,'步法+建3敏、普通步法叠至5；冲刺13挡、防御10挡、扫腿+19挡、生存者13挡，后者对20攻仍损7。敏捷后续逐牌兑现，末轮无挡牌不兑现。')
upd('silent-0011',45,4,'双升级毒雾建立3→6层，T2—T6轮初毒3/5/12/17/22；T3致命毒药5→10，已结束毒3/10/12/17/28合70，末轮28含药加6。')
upd('silent-0046',45,6,'萎靡已令敌力−2；尖啸当轮再−6至−8，攻击21→17，省4但3血0挡仍死亡。末战未观测恢复帧，不外推固定减伤倍数；F35T1临时负力下一轮消失另已实见。')
upd('silent-0057',45,1,'F33取群蛇形态、F40升级；F45T1在手但整场六轮未施放，不能把逐牌6伤预支为实盘输出。本局全决策未有群蛇施放，无必须优先建立的胜率对照。')
upd('silent-0142',43,None,'F16二十六牌羽毛回15；F25/F27/F29分别回18，F32三十三牌仅回10封顶；F40三十六牌及F43三十七牌各回21，F43休息另回17，不把羽毛计为休息动作。')
upd('silent-0259',12,1,'再生药T1实建5层，四轮回血5/4/3/2共14；实际HP9→13→17→7→9，T1攻击损1、T3损13，净损0不等于未承伤。')
(p/'ledger-updates.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in items));print('准备9项支持更新')
