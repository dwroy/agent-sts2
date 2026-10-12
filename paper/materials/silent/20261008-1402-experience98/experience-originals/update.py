import collections,copy,json
from pathlib import Path

O=Path(__file__).parent;K=Path('knowledge/characters/silent/experience.json');N='G8NHLL09DLBX'
B=json.load(open(O/'experience-before.json'));E=copy.deepcopy(B);I={e['id']:e for e in E['entries']}
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};A=json.load(open(O/'audit.json'));changes=[]
def change(eid,text):
    e=I[eid];old=copy.deepcopy(e);assert N not in e['evidence']
    e['evidence'].append(N);e['n_support']=len(e['evidence']);e['last_seen']='2026-10-08'
    e['lesson']=text.replace('{n}',str(e['n_support']))
    n=e['n_support'];z=e['n_contradict'];e['confidence']='high' if n>=5 and z<=n/3 else 'med' if n>=2 else 'low'
    changes.append(dict(id=eid,before=old,after=copy.deepcopy(e),new_runs=[N]))

change('silent-strength-weak-observation','力量逐击影响攻击，敏捷逐张兑现牌挡，来源分账。机制：现场力/弱按段核，牌挡加敏后核脆弱，已有挡不倒补。搭配：多击/多挡牌重复受益，毒、覆甲与临时量另算。决定胜负的战斗：{n}支持/0反例，单项整战因果未控（n={n}）。典型案例：79UCJ0K6R9C1 A10本体5×4经弱为3×4；G8NHLL09DLBX A10巨兽末T15突然一拳使自爆56→42，34血加9挡实剩1；产卵虫末T3尖啸使23合攻→2，负力次轮撤回。')
change('silent-footwork-block','步法普通/升级建立2/3敏捷，后继挡牌逐张兑现。机制：基础挡加现场敏捷再核脆弱，已有挡不补、被动挡另算。搭配：多挡牌重复受益，无挡牌不预支。决定胜负的战斗：{n}支持/0反例，单项整战因果未控（n={n}）。典型案例：9R916WW0V65N女王6敏却无合法挡牌、0挡死；G8NHLL09DLBX A10产卵虫首T1建2敏，T2后空翻7加生存者10合17，较基础多4恰挡17。末试未建步法，仅生存者8损9；牌序/毒/后空翻也变，差9非全归敏捷。')
change('silent-bouncing-flask-poison','弹跳药瓶按实际次数、分配与毒结算兑现，多敌不保证指定目标收尾。机制：普通3毒×3次、升级3毒×4次；制品逐次阻减益，施毒不即时扣HP，最高血目标不代表最坏随机毒分配。搭配：触媒增加结算次数、毒雾补层，挡延长生存窗口；随机落点未发生前不预定。决定胜负的战斗：{n}支持/0反例，单牌整战胜因未控（n={n}）。典型案例：HSX4HYATB4E2沙漏三跳耗三制品无毒；G8NHLL09DLBX A10产卵虫末T5三跳各给幼虫3毒，母体29血20毒不变、结算余9而玩家死，不能把9毒全给母体当保证斩杀。')
change('silent-deadly-poison-application','致命毒药普通/升级施5/7毒，不即时扣血。机制：每次按现层结毒再减1，制品可阻施毒，头骨补量/触媒次数/无实体/限伤/剩血与阶段另核。搭配：毒雾维持毒源，生存窗口及技能副作用分账。决定胜负的战斗：{n}支持/0反例，败非公式反例（n={n}）。典型案例：D4LJ9QMGFB8Q外骨骼12毒受9限伤留2血；G8NHLL09DLBX A10产卵虫末T2普通加5、升级再7使母体8→20毒，117血当步不变；末T5升级给7血幼虫7毒，毒后它死而母体仍9，不等整场获胜。')
change('silent-poisoned-stab-components','带毒刺击直伤、施毒和本方失血分列，尚存毒不当已伤。机制：普通/升级基础攻击6/8、施毒3/4，力/弱/易伤改攻击，制品可阻毒；结算减1，触媒/无实体/剩血另核。搭配：生存轮数限制净输出，敌荆棘血价与后继挡牌分源。决定胜负的战斗：{n}支持/0反例，无单卡整战胜因（n={n}）。典型案例：KEN58SH9SLZ6异鱼直伤6加毒8合14；G8NHLL09DLBX A10棘刺蟾蜍T2刺击在5荆棘下52→47，随后速度/偏折得9挡仍受25攻击损16，全轮损21；药后挡不能回复此前5血。')
change('silent-piercing-wail-temporary-strength','尖啸临时降力按攻击段兑现，次轮恢复须重核。机制：普通/升级减6/8，各段核现场力/弱，攻击不降到负伤；成长与临时恢复分账。搭配：多敌/多击分别受益，仍须真实牌挡，不当常驻防御。决定胜负的战斗：{n}支持/0反例，单项整战因果未控（n={n}）。典型案例：NEWRFAYKTQHR A10蜂群尖啸+使多击归0，后轮成长仍致死；G8NHLL09DLBX A10产卵虫末T3三幼虫各5→0、母体8→2，合23→2少21，当轮零挡损2；T4负力撤回、易伤下三幼虫各7，9挡仍损10。')
change('silent-speed-potion-temporary-dexterity','速度药水当步加5临时敏捷，须在本轮后续格挡牌兑现。机制：逐饮核敏捷/速度项+5、次轮撤回，其他来源变化分账，旧挡不倒补。搭配：每张牌加现场敏捷后核脆弱，常驻敏与被动挡另计，不定留药/时点门槛。决定胜负的战斗：{n}支持/0反例，单药整战因果未控（n={n}）。典型案例：L2TSFU62Z57Z A10药后防御10覆盖9攻；G8NHLL09DLBX A10棘刺蟾蜍T2药后5敏/0挡，偏折4→9只兑现多5挡，次轮撤回；先前荆棘失5血不被补回，胜战52→22且两药用尽，后战22空药死。')
change('silent-giant-explosion-window','巨兽本体结束后仍须承受自爆，击杀时点与当轮血挡共同验收。机制：A10已见蒸汽T2=20后每轮+3，本体结束时固定下一轮自爆；血{@2:HP:WATERFALL_GIANT}，残壳999999999不计新需伤。搭配：本体毒、回复与残壳来袭分账，弱化/真实挡可降血价，打残壳不消除自爆。决定胜负的战斗：{n}支持/0反例，提前击杀整战胜因未隔离（n={n}）。典型案例：YQL8RZ8BWN1E六试0赢、提前三轮自爆少9仍死；G8NHLL09DLBX A10四试仅末赢，T14本体8毒结束，T15自爆56被一拳弱成42，34血/9挡损33剩1；SL换线、药时点及后续抽牌同变，不归单步或运气。')
change('silent-act-transition-missing-hp-heal','已见A9/A10跨幕按缺失HP的80%向下取整回复。机制：同上限按⌊(最大HP−当前HP)×0.8⌋，低阶/其他先古未核；连续boss不属跨幕。搭配：营火、开场遗物、事件回复与SL恢复分账。决定胜负的战斗：{n}支持/0反例，单项整战因果未控（n={n}）。典型案例：9R916WW0V65N首boss12血直接进女王无回血；G8NHLL09DLBX A10巨兽胜后1/76→二幕61，补⌊75×0.8⌋=60；四次SL恢复72/74/61/12合219是读档，不算回复或新药。')
rest=next(r for r in json.load(open(O/'rest-summary.json')) if r['asc']==10)
change('silent-rest-buffer-observation',f'观察：只计实完成回复，后战结果另核。A10 {rest["runs"]}局{rest["rests"]}火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{100*rest["deaths"]/rest["nexts"]:.2f}%），活损中位{rest["median"]}；各阶另列（n={{n}}）。典型案例：T0DGVABPV60U枕头火回42仍boss败；G8NHLL09DLBX F7回21、F13锻造毒无回复、F16枕头44→76实回32且封顶，巨兽胜剩1；二幕后段营火未到就死，无另一休息/锻造受控胜负。')
band=next(r for r in A['bands'] if (r['asc'],r['act'],r['type'],r['band'])==(10,2,'Monster','25–40%'))
change('silent-route-hp-observation',f'观察：赢战耗下一战缓冲，改线收益须实打核。A10 {rest["runs"]}局二幕Monster以25–40%入血{band["n"]}房/{band["runs"]}局，{band["deaths"]}死（{100*band["deaths"]/band["n"]:.2f}%），活损中位{band["median_win"]}；各阶/幕/房型/血档另列，非路线因果（n={{n}}）。典型案例：G8NHLL09DLBX F19胜61→54、F20胜54→52、F22商店无回血但补药，F23胜52→22耗两药，F24以22/76空药两试0赢，计划后置营火未到；未走替线未知，不定安全血线或留药必胜。')
change('silent-deck-burst-observation','观察：持牌、计划、短推演与实际启动输出分账。机制：按实施毒/能力/轮初效果核，费用和可活轮限制兑现，随机分配不等确定输出。搭配：生存与持续输出合核，有限样本不等必死，未实施能力不预支。决定胜负的战斗：{n}支持/0反例，单项整战因果未控（n={n}）。典型案例：T0DGVABPV60U八敏无挡牌死、滚石25未触发；G8NHLL09DLBX A10末试未建步法，产卵虫132血五轮实扣15/20/41/27/20合123、余9而死；T4才建必备工具、T5抽弃实际发生，不把未来过牌或随机9毒预支为收尾。')

E['version']='2026-10-08.15'
E['_about']='静默经验只来自本角色实盘与复盘。第98次增量合并G8NHLL09DLBX A10，截至2026-10-08T04:56:54.518Z共129完局；旧128局七数组、血档/节点后战、回血及SL逐行复算。按13条SL探索勘误分开10重放/2换线/1未替换；实际毒分配、临时力敏、荆棘血价及自爆/资源链补证，不冒称整战反事实胜因。经验/账本/代码提案关联独立strategy-proposal，不改打法源码。'
def stats(x):
    aa=[e for e in x['entries'] if e['status']=='active']
    return dict(active=len(aa),chars=sum(len(e['lesson']) for e in aa),confidence=dict(collections.Counter(e['confidence'] for e in aa)),asc={a:dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in aa),chars=sum(len(e['lesson']) for e in aa if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})
summary=dict(old_version=B['version'],version=E['version'],added=0,updated=len(changes),retired=0,before=stats(B),after=stats(E),evidence=[dict(id=c['id'],evidence=c['after']['evidence'],contradicting=c['after'].get('contradicting',[]),by_asc=dict(collections.Counter(R[r]['ascension'] for r in c['after']['evidence']))) for c in changes])
assert summary['before']['chars']<55000 and summary['after']['chars']<55000
K.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(dict(entries=changes),ensure_ascii=False,indent=2)+'\n')
(O/'update-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k!='evidence'},ensure_ascii=False))
