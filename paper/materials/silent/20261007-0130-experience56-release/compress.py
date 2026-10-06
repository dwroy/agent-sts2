import json,re
from pathlib import Path
O=Path(__file__).parent;P=Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json');d=json.load(open(O/'experience-before.json'));E={e['id']:e for e in d['entries']}
texts={
'silent-bubble-bubble-condition':'咕嘟冒泡仅对已中毒目标补毒，普通/升级9/12，不即时伤。机制：无毒仍耗费但无效果；触媒次数/剩血/头骨另核。搭配：先有已生效毒才能兑现，保留手牌可对齐条件；毒雾、药瓶与致命毒药分核实际目标。决定胜负的战斗：12支持局、胜因未控（n=12）。典型案例：Y6GM2CHWJBEY A0六试T2空打；1HC609GTLGN3毒3→12；ZZMYZ5UBCG72 A2毒3→15扣54、21→33扣126；10GPK5XGHCK3 A3毒8→20敌73不变；1LMBFGSMCWKU A4毒8→20敌382不变，无触媒；2SU6XN2AEJRD A6爆发两次各12使5→29，敌442→432为其他增益，单次41→53、末72毒截扣21。VLV17NUSFS61 A7女王首/末T5聚合体无毒，耗1费且175血/无毒不变；另敌11毒不满足本目标，第2/4/5次对有毒女王+12、第3次未打、六败。六次均败，之后新增毒不追补先前条件收益，不写用药顺序或规则。9TG1RP5LFAAK A10头骨使普通9补10、8→18敌46不变，激怒15→18力、20挡对51损31。TD1HVGS7H6LB A10巨兽3→12扣23、8→17扣33，末28剩血截扣28、不抵自爆；TCFAHJ9K19VY A10刺击3毒后补9至12，触媒2扣33、信徒51→18；BVF22RSFVBS9 A10兽10→19后触媒1扣37。新局均正分支，空打事实不退役、单卡胜因未控。',
'silent-giant-explosion-window':'巨兽本体归零后仍须承受自爆。机制：蒸汽/击杀时点/现场自爆分核，不定成长公式；血{@2:HP:WATERFALL_GIANT}，壳999999999不计需伤。搭配：收本体后血挡仍须盖自爆，战中回复另算。决定胜负的战斗：16支持局；重打低阶首局两试1赢、A10另一场两试1赢，非单因（n=16）。典型案例：CSBR5CRDWQNB A2本体12由31毒截清，47血16挡对33余30；53FLQ68CETW0 A6清240，33对6挡损27、57→26含血瓶2。JLN5SK17W4FQ A10两次T9清，首22血对41判死，重打36血尖啸41→35、13挡余14。TD1HVGS7H6LB A10两试48/80，首回血45扣295/T15清，T16四血对44判死未结算且读档失败；后回血30扣280/T14清，42自爆杀5血，预计4挡仍差33。L9SGRBB5R698 A10六试37/61、初20序同0赢，首/末T13/12清，末回血9扣259、50弱至37对3血5挡差29；早清一轮非胜因。4ANT8D00TP72 A10 T8毒清250，T9自爆38弱28、零挡57→29、净损41。PU80F84P6HPN A10五试57/70一赢，初24记录/clean22，前四T16/15/17/17清后判死，末T14清/T15自爆56弱42、24血20挡余2；T2防御换打击23→29伤、5→12损，多6伤付7血，后段也变。前四回血45需295、末30需280。5X2GHKJ89PN1 A10首47/70、T11毒清250、T12自爆47弱35，21挡18→4，净损43；归零不免自爆。',
'silent-aeonglass-artifact-growth-sl':'观察：沙漏制品/成长/挡/凋萎须合核，满血非保证。机制：A0/A1及53FL A6见3制品、2SU A6见2，来源未知；耗完才施毒/减益。弱下力3/7/12同击18/21/25，临时减力不关成长。搭配：敏/毒/滚石/弃凋萎核已建。决定胜负的战斗：10局38试3赢，真正重打8场36次2赢；A7三场14次0赢（n=10）。典型案例：LRN0HPZ0FZS1 A0 T8余247/512死；K3676LU8B0UH A1首38血对22+24凋萎判死，重打34挡、行动125毒9余5胜，毒216+行动296=512。ZE8F192FKX24 A5滚石T3/首T6建，T12滚石50使69→19后毒胜余3；53FLQ68CETW0 A6六败扣324余188；2SU6XN2AEJRD A6十轮502+开场10、24血胜。SADL3CGYTGSR A7的26血对21+三张9凋萎−11挡需37、敌235；Z6CFLDR3N4SB A7护栏省9血少39伤/1力、两模拟线24/24死，原线未打；2PVLGRBGUX9S A7六败首428余84/末269余243，T12零攻击但三张12凋萎−9挡需27杀8血，共同前15/其他前38抽序同、后段未控。25226ZFLNR1J A10六试33/64初35序同，末T3建毒雾3/T4耗末制品，T5—8毒24、八轮扣115余420/535，力4/9双击32/42，敏5三牌35挡仍4血对42+18凋萎需25；首T7触媒2毒18、第2次T1早建仍T7判死。JMH5C51RLN4E A10后boss六試8/60、T1零能8挡，前五未结算，末26需损18实扣8、仅荆棘3敌532/535、无凋萎；前场敏6/毒雾6/势不可当8/触媒2重置。无受控替启动胜例。'
}
texts['silent-grand-finale-empty-draw']='华丽收场零费也须抽牌堆为空，过牌设想不算已兑现伤害。机制：空堆可打/非空不可，普通60、负4力56，实伤核剩血/减伤。搭配：后空翻/计算下注须实际形成窗口，8CFMW9SAGFWQ未打计算下注。决定胜负的战斗：3支持局，构筑/购买胜因未控（n=3）。典型案例：ZZMYZ5UBCG72 A2 F17 T11空堆56斩36血族母；8CFMW9SAGFWQ A6 F24 T4/7各2张、T8折叠13行展开16张，均不可打、0伤败。SADL3CGYTGSR A7白星双奖取两张，知识恶魔模拟1000样本校准36.23%→68.19%→87.40%、十二轮胜而收场0次0伤；沙漏六试持牌均不可打，末T1抽堆29/T5仍31、牌面60，后空翻/早有准备/计算下注/铁棒过牌已执行仍未空，不能加成120伤或以二幕模拟保证三幕。无不取/删牌实胜，不定普遍坏牌。'
changes=[]
for k,t in texts.items():
 old=E[k]['lesson'];assert len(t)<len(old),(k,len(t),len(old))
 for clause in re.split(r'(?<=[。；])',old):
  if '药' in clause:assert clause.strip() in t,(k,clause)
 changes.append(dict(id=k,before=old,after=t,saved=len(old)-len(t)));E[k]['lesson']=t
active=[e for e in d['entries'] if e['status']=='active'];size=sum(len(e['lesson']) for e in active)
assert size<=55000,size
(O/'compression.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2)+'\n');P.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');print('开工压缩',len(changes),'条；节省',sum(c['saved'] for c in changes),'字；当前',size)
