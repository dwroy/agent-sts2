import collections,copy,hashlib,json,subprocess
from pathlib import Path
O=Path(__file__).parent;P=Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json');RUN='M0GY0A4M2F7H'
day=subprocess.check_output(['date','+%Y-%m-%d'],text=True).strip()
B=json.load(open(O/'experience-before.json'));E=copy.deepcopy(B);A=json.load(open(O/'audit.json'));R=json.load(open(O/'rest-summary.json'))[-1];C=[];M={}
def update(ident,ledger,case=None,lesson=None):
 e=next(e for e in E['entries'] if e['id']==ident);old=copy.deepcopy(e);assert RUN not in e['evidence'];e['evidence'].append(RUN);n=e['n_support']=len(e['evidence']);z=e['n_contradict'];e['confidence']='high' if n>=5 and z<=n/3 else 'med' if n>=2 else 'low';e['last_seen']='2026-10-08'
 e['lesson']=lesson or e['lesson'].replace(str(old['n_support'])+'支持',str(n)+'支持').replace('（n='+str(old['n_support'])+'）','（n='+str(n)+'）')
 if case:e['lesson']=e['lesson'].split('典型案例：')[0]+'典型案例：'+case
 C.append(dict(id=ident,kind='updated',before=old,after=e,new_runs=[RUN]));M[ident]=ledger
update('silent-footwork-block',['silent-0005'],case='R3AJCGQGGMR4 A10三敏脆弱两挡12；M0GY0A4M2F7H A10墨影末T7已建2敏，偏折4→6、两防御各5→7，三牌多6挡合20；32攻需损12、8血仍死，首试未建步法不当五次已建的同一线。')
update('silent-strength-weak-observation',['silent-0012'],case='LYBHQ1X230ZB四段1力多4伤；M0GY0A4M2F7H A10墨影准备后增2力，肢解30→32；已见虚弱将30降至22，但末T7无弱须按32核，2敏三挡20仍死；毒与滑溜限制另核。')
b=next(b for b in A['bands'] if (b['asc'],b['act'],b['type'],b['band'])==(10,1,'Monster','40–60%'));runs=len(A['runs']);a10=R['runs']
update('silent-route-hp-observation',['silent-0019'],lesson=f'观察：胜前战/避可选精英不保证后段血药，问号可战，未来营火不能预支。A10 {a10}局一幕Monster40–60%入血{b["n"]}房/{b["runs"]}局、{b["deaths"]}死（{b["deaths"]/b["n"]*100:.2f}%），活损中位{b["median_win"]}；分阶/幕/房型另列（n={runs}）。典型案例：M0GY0A4M2F7H F11改避精英、F12回到52，F13/14/15三胜净耗21/20/3合44，F16补至29进boss六败；F12条件boss64未兑现，未走精英线无整场对照，不立改线因果。')
update('silent-rest-buffer-observation',['silent-0020'],lesson=f'观察：即时回复增加血缓冲，不等后战保证，未来营火不预支。A10 {a10}局{R["rests"]}独立火/{R["heal"]}回血实回{sum(R["gains"])}，去重{R["nexts"]}后战{R["deaths"]}死（{R["deaths"]/R["nexts"]*100:.2f}%），活损中位{R["median"]}；各阶另列（n={runs}）。典型案例：M0GY0A4M2F7H F7/12/16各实回21合63，八胜战净耗83、事件另付7，最后29进boss；F12条件64与实际29分账，无改锻造/路线整场对照。')
update('silent-deck-burst-observation',['silent-0021'],case='WZL2AMEY85S7三毒雾建层仍余109死；M0GY0A4M2F7H A10墨影末试已建2敏、末T5直伤9加已结7毒净清16，T7三牌20挡仍死、5毒只使131→126；无色取到闪亮未打而T6弃掉，取得/施放/兑现分核，不预支药牌收益。')
update('silent-vantom-slippery-growth',['silent-0224','silent-0227'],lesson='墨影幻灵尚有滑溜时，已观察攻击与毒扣血受单次1血限制并消费滑溜层，施毒层数本身不等实伤。机制：按实际命中/结算逐次减层，独立准备后力量成长继续；毒结算还使毒减1；已见普通触媒2毒双结各扣1、滑溜7→5，更高叠层未验。搭配：多段命中与毒层/实扣分账，敏捷须打挡牌兑现，当前弱不关后轮成长。决定胜负的战斗：滑溜11支持局、毒限伤8局、准备成长11局，失败不当机制反例（n=11）。典型案例：ULP4TN1GNHMK A10末1滑溜将15毒限1伤；M0GY0A4M2F7H A10连续反弹四击183→179、滑溜9→5，首T2蛇咬7毒仅177→176、滑溜3→2；末T5无滑溜7毒全结，末T7仍126血而32攻致死。')
update('silent-vantom-sl-observation',['silent-0079'],lesson='观察：A10墨影同抽重打须分核局部进度与少挡血价，无赢次不定获胜打法。机制：换线改变当前伤挡与后续抽牌，饱和死亡模拟不等血价相同。搭配：当前血挡、实际需伤和可活轮分账。决定胜负的战斗：3局3场18次0赢，各前五判死读档、仅末次实死（n=3）。典型案例：ULP4TN1GNHMK首/末同T1少一防御多打击，净清3→4、损0→3；M0GY0A4M2F7H第2/3与第4试T9同19血/敌97，防御+换打击保突然一拳，净清19→25、损0→9，T10判死；两线24/24死仍0.7%→0%，后继亦变，无整线保血胜果，不立统一禁攻规则。')
update('silent-fishing-rod-random-upgrade',['silent-0170'],lesson='钓鱼竿每三场普通战后随机升级一张牌，不保证核心强化。机制：6局17次战后升级在获得后普通战序号3/6/9（长局另12），问号普通战同计，精英/boss与营火/事件升级分账。搭配：普通战升级机会与血价分别核，随机强化不当能力升级已兑现。决定胜负的战斗：A4一局/A10五局，6支持0反例，路线/随机牌胜因未隔离（n=6）。典型案例：1NZ8FE5F34R9 A4问号第12战升级防御；M0GY0A4M2F7H A10 F4第3普通战/F13第6战各升级防御，步法仍普通；三火回63、后段三胜耗44，29进boss六败。')
seq=int(B['version'].split('.')[-1])+1 if B['version'].startswith(day+'.') else 1
E['version']=day+'.'+str(seq);E['_about']='静默经验只来自本角色实盘与复盘。第111次增量合并M0GY0A4M2F7H A10；截至2026-10-08T14:33:59.374Z共146完局。旧145局七数组/血档/节点后战/休息/SL按原口径复算；滑溜攻击与毒限伤、敏捷牌挡、准备力量、钓鱼竿升级和真实胜战血药分账。六败换线局部进度不当整线胜果；同步独立strategy-proposal，不改打法源码或其他角色。'
P.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n');(O/'changes.json').write_text(json.dumps(dict(entries=C),ensure_ascii=False,indent=2)+'\n');(O/'ledger-map.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n')
active=[e for e in E['entries'] if e['status']=='active'];summary=dict(old_version=B['version'],version=E['version'],added=0,updated=len(C),retired=0,active_before=sum(e['status']=='active' for e in B['entries']),active=len(active),chars_before=sum(len(e['lesson']) for e in B['entries'] if e['status']=='active'),chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),asc={str(a):dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in active),chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})
assert summary['chars']<55000;(O/'update-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(json.dumps(summary,ensure_ascii=False))
