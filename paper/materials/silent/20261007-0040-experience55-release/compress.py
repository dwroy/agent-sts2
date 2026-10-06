import json
from pathlib import Path
O=Path(__file__).parent
P=Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json')
d=json.load(open(O/'experience-before.json')); entries={e['id']:e for e in d['entries']}
texts={
'silent-kin-poison-sl-observation':'观察：同族毒/能力须实建结算，候选focus非击杀，目标顺序胜因未控。机制：临时减力只降当轮多击，后轮成长另核。搭配：施毒、牌挡与血池。决定胜负的战斗：原三场18试0赢；加入S9UZAK0JP0C0后四场20试1赢，A0仅背景、策略仅A10（n=4）。典型案例：Y6GM2CHWJBEY A0初23同序，毒雾T8/T3建各扣6/60仍败；4D4J8USKCPAV A10六试35/70，末T8死均无减员；第2次T2触媒扣8损7、未走刺击题面同损多9伤，T6施5毒扣9；末T1步法双挡0损0伤、T3尖啸15→0、T7的23穿14损9、T8的3血7挡对26死，仅119/324、神官余110。TCFAHJ9K19VY A10六试65/70、初24序/到手轮同0赢，首/第2次T1扣45/18损14/4、T2损5/9合19/13；第3次T5同29血插攻击多11伤多5损；末T5毒杀首信徒、T7的12血13挡对29死余35+108=143。S9UZAK0JP0C0 A10两试65血、初22同序但到手轮变；赢次T1三牌15挡0损、次轮65对输次56、T4清信徒、T10神官4血18毒后胜余29；输次T11为2血敌63。后洗牌/生成/目标/抽牌/防御同变，无单项或运气胜因。',
'silent-deadly-poison-application':'毒药普通/升级施5/7毒，不即时扣血。机制：触发按现层伤后减1，制品耗1可阻施毒；头骨补量、触媒次数、无实体/剩血/阶段另核。搭配：施毒与技能副作用分账。决定胜负的战斗：26支持局，败非公式反例（n=26）。典型案例：LRN0HPZ0FZS1 A0 F37制品1→0无毒；9TG1RP5LFAAK A10升级7加头骨补8、敌46不变；JQPT83P8KDSZ A10 T3毒3→8敌142不变、末多5毒而污染同9挡损9→18；4D4J8USKCPAV A10第2/5次T6施5扣5+4=9余3，T7判死未结算；JMH5C51RLN4E A10末32毒三触发截扣87、无实体三次3；TD1HVGS7H6LB A10巨兽两次T10施5不即时伤、触媒1扣9余3，T3启毒原答被换未执行；L9SGRBB5R698 A10巨兽19毒截扣7无触媒；D4LJ9QMGFB8Q A10外骨骼T4毒5→12敌11不变、单触发受9上限留2；NB8KCF6HRGVF A10族母T2补7毒12→19敌233不变，T7负2力仍33→40敌85不变、末扣40至41；TCFAHJ9K19VY A10同族T1施7神官199不变、触媒2扣18余4；BVF22RSFVBS9 A10兽T4毒雾补2至19再毒药5至24、末47扣176→129跨160，分来源。',
'silent-queen-poison-main-target':'观察：女王先杀本体/聚合体均有赢例，无固定击杀序因果。机制：进阶本体血{@2:HP:QUEEN}/{@4:HP:QUEEN}/{@8:HP:QUEEN}，本体死可终战；99弱/脆/易伤改变攻防，爪牙死不关成长。搭配：按已建能力/实际毒窗口核。决定胜负的战斗：9支持局、四首试赢；真正重打5场26试1赢（n=9）。典型案例：ZZMYZ5UBCG72 A2行动36+毒364=400杀本体、爪牙余87；1LMBFGSMCWKU A4 T2杀爪牙、T11铜钹3令35→32后毒杀、未建毒雾/触媒；9YBKCNBFP0X5 A4/VLV17NUSFS61 A7的99减益，后者六败余169/365；4Y94N8RDPGPM A7 T11杀爪牙后女王2力、T12/13挡36/26盖35/25、T15在五击50前毒杀损67余9；LLYSRQQ35AVW A8 T6爆发杀爪牙且本体201→102→12，T7五击25前毒杀、损10余60。G403VCZ3BH1B A9两试90/90、419+211，输次T6杀爪牙、T10女王27血7毒、32血12挡对45差1判死；赢次T5末毒/次轮滚石清爪牙，T10萎靡X4的60→20损19，T11尖啸20→13挡10损3，18血T12滚石胜净损72；初36同序但生成/弃牌/目标/护栏同变。9TG1RP5LFAAK A10后场六试17/84需630、末T3扣35缺595两敌193/402、3血0挡对弱27死，初18同序末T2转本体不补挡多损8。5X2GHKJ89PN1 A10六试49/70、T6止0赢，炮开场各10后需610，末行动26+毒66=92余355/10=365；T3的99减益/魂缚3，T4后空翻后速行者/防御不可打、扫腿/萎靡可，3能非任意挡可用。后段未控。',
'silent-accuracy-shiv-scaling':'精准收益按实打小刀数兑现。机制：普通/升级建4/6，基础4加精准及力后再核减伤/剩血，其他触发分账。搭配：刀刃之舞三/四刀使4/6精准多12/24，费用/抽到/存活另核。决定胜负的战斗：5支持局，单卡胜因未控（n=5）。典型案例：KAY522KT5NXR A0实验体两试1赢、T8为4精准+8力各16、235→219；XYYQYBRM2A01 A1沙虫六败末T1三刀各8合24非12、末缺63。8CFMW9SAGFWQ A6 F24 T1四刀4合16，T3精准+6、T4各10合40多24、幻象10/主怪30，T9败、群蛇未建两轮零伤。2L1BNN9ZJEFU A6末T3精准4不加敌激怒力，1我方力令T4两刀各9、实9+余4清阶段、过量5不计，能力留二阶段仍败。9YT51CK8RC39 A7仪式兽T1建4无正力、T3三刀8合24多12，后续0刀末余90，非每轮固定24。',
'silent-tuning-fork-skill-block':'音叉技能计数与牌面挡分账。机制：已见9→10补7挡、4→5无7，现场计数非攻击段数；未补全触发条件。搭配：脆弱逐牌折挡、被动挡另核。决定胜负的战斗：5支持局，遗物非整战胜因（n=5）。典型案例：T082DRCUHRRD A0 F12 T7防御5+音叉7=12、挡4→16，实验体败；ZZMYZ5UBCG72 A2女王T6药瓶+计数9→10挡0→7、末斗篷扣2、对12损3后胜。6EV5V6PJJS9D A6 F39 T3生存者+脆弱下8、弃牌完计数9→10补7、防御3合18对32损14，T4未触发、16血10挡对44死。LLYSRQQ35AVW A8 F48 T2萎靡+计数9→10补7、攻击13→10使69→66；T3牌挡折减另核。9TG1RP5LFAAK A10首T3暗影后敏2偏折12、防御14、后步音叉基础7翻14使12→40；40非全牌挡，后轮未触发不预支。'
}
changes=[]
for ident,text in texts.items():
 e=entries[ident]; changes.append(dict(id=ident,before=e['lesson'],after=text,saved=len(e['lesson'])-len(text)));e['lesson']=text
(O/'compression.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2)+'\n')
P.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print('压缩',len(changes),'条；节省',sum(x['saved'] for x in changes),'字；现',sum(len(e['lesson']) for e in d['entries'] if e['status']=='active'))
