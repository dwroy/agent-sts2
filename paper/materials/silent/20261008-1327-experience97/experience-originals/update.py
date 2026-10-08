import collections,copy,json,re
from pathlib import Path

O=Path(__file__).parent;K=Path('knowledge/characters/silent/experience.json');N='T0DGVABPV60U'
B=json.load(open(O/'experience-before.json'));E=copy.deepcopy(B);I={e['id']:e for e in E['entries']}
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};A=json.load(open(O/'audit.json'));changes=[]
def change(eid,text):
    e=I[eid];old=copy.deepcopy(e);assert N not in e['evidence'];e['evidence'].append(N)
    e['n_support']=len(e['evidence']);e['last_seen']='2026-10-08'
    text=text.replace('{n}',str(e['n_support']))
    e['lesson']=text;e['confidence']='high' if (e['n_support']>=5 and e['n_contradict']<=e['n_support']/3) or (e['n_support']>=4 and e['n_contradict']==0 and eid=='silent-speedster-draw-damage') else 'med' if e['n_support']>=2 else 'low'
    changes.append(dict(id=eid,before=old,after=copy.deepcopy(e),new_runs=[N]))

change('silent-strength-weak-observation','力量逐击影响攻击，敏捷逐张兑现牌挡，来源分账。机制：现场力/弱按段核，牌挡加敏后核脆弱，已有挡不倒补。搭配：多击/多挡牌重复受益，毒、覆甲与临时活力另算。决定胜负的战斗：{n}支持/0反例，单项整战因果未控（n={n}）。典型案例：79UCJ0K6R9C1 A10本体5×4经弱为3×4，2敏双防御合14；T0DGVABPV60U实验体末T1赤牛8活力令打击+12→20、随后活力消失，非永久力量。末T5步法/螺线共8敏却无挡牌、0挡，16血对完整需损40死。')
change('silent-footwork-block','步法普通/升级建立2/3敏捷，后继挡牌逐张兑现。机制：基础挡加现场敏捷再核脆弱，已有挡不补、被动挡另算。搭配：多挡牌重复受益，无挡牌不预支。决定胜负的战斗：{n}支持/0反例，单项整战因果未控（n={n}）。典型案例：9R916WW0V65N女王6敏却无合法挡牌，0挡死；T0DGVABPV60U A10实验体末T3步法+建3，T4小刀临时加1使偏折8、防御+12；末T5步法再建2、三刀再加3到8敏，仍无挡牌而死。')
change('silent-helical-dart-shiv-dexterity','螺线飞镖每张小刀给本回合1敏捷，须由后继挡牌兑现。机制：2局101次实打小刀后敏捷和HELICAL_DART_POWER各+1，次轮撤临时部分，已有挡不补；弃牌不触发，重放/自动出牌未核。搭配：刀刃之舞/隐秘匕首的小刀与后继牌挡配合，永久步法另算。决定胜负的战斗：2支持/0反例，两场重打均0赢，未证调序可转胜（n=2）。典型案例：75X1BARMNZ03 A6草蜢先生存者8挡、后两刀2敏不倒补；T0DGVABPV60U A10实验体末T4小刀3→4后偏折8、防御+12，遗物只贡献各1共2挡，原15→实20另含换升级+3。末T5八敏仍0挡死。')
change('silent-rolling-boulder-start-growth','滚石收益按实建立后的轮初次数兑现，早启动优势仍是观察。机制：普通/升级建5/10，后轮先按当前层群伤再加5；k次理论(5或10)k＋5k(k−1)/2，敌挡/余血/无实体限制实扣，力量加成未核。搭配：格挡维持成长窗口，未活到不预支。决定胜负的战斗：{n}支持/0反例，单因未控（n={n}）。典型案例：ZE8F192FKX24 A5滚石实扣50后毒胜；T0DGVABPV60U A10实验体末T1建5，后续实触发5/10/15/20，15在二阶段入口212→197；死前显示25未触发，不作已打伤害。')
change('silent-speedster-draw-damage','速行者令回合中抽牌兼有逐次伤害，按实际触发分源。机制：实建2层，每抽一牌对所有敌人造成2伤；只独立验证单目标，无实体每次仅1，多目标总收益未核。搭配：抽牌附魔/铁棒/抽牌技能与攻击本体、毒分列，不重复加总。决定胜负的战斗：{n}支持/0反例，整战单卡胜因未控（n={n}）。典型案例：KAY522KT5NXR A0实验体胜试后空翻抽两牌对无实体只扣2、实得8挡；T0DGVABPV60U A10末试T3步法+附魔实添2牌、敌13→9扣4，T4偏折触发铁棒抽1使184→182扣2，都非牌面攻击；仍二阶段败。')
change('silent-iron-club-four-card-draw','铁棒每累计出4张牌抽1张，计数跨回合。机制：已见第4/8/24张各多抽1，普通牌自身抽弃与该额外抽分开，重放/自动出牌计数未核。搭配：速行者可由这1抽额外伤2；沙漏新增手牌须重核持牌伤，不能预定抽入牌或保证华丽收场空堆。决定胜负的战斗：{n}支持/0反例，无遗物或换序整战胜因对照（n={n}）。典型案例：SADL3CGYTGSR A7沙漏T7斗篷第24张抽堆18→17，同窗两凋萎来源未隔离、新增18持牌伤；T0DGVABPV60U A10实验体末T4偏折后额外抽1，速行者使184→182，非偏折牌面伤。')
change('silent-gorget-plating','护喉甲开场覆甲不等整场固定格挡。机制：已见开场4，按当前剩层给挡；完整减层条件未隔离。搭配：覆甲、敏捷牌挡与轮初环挡分源。决定胜负的战斗：{n}支持/0反例，单项整战因果未控（n={n}）。典型案例：79UCJ0K6R9C1 A10寄生虫T1—4覆甲4/3/2/1、T5归零，T6无覆甲实损32；T0DGVABPV60U实验体末T2当前3覆甲加钨棍仍损12，T5覆甲已0、八敏不能替无挡牌兑现。')
change('silent-tungsten-rod-hp-loss-observation','观察：钨合金棍与每次穿挡HP损失减1一致，不能总攻击只减1。机制：逐击先扣剩挡，正HP损失各少1、零损不回血，事件扣血另核，其他交互未隔离。搭配：牌挡/覆甲按段消耗，完整需损与死亡实扣剩血分开。决定胜负的战斗：{n}支持/0反例，无移除遗物整战对照（n={n}）。典型案例：K2JAGKVJAWZJ A10三骑士T9完整需损14、13血死，严格差2；T0DGVABPV60U实验体末T5零挡/覆甲0对11×4，逐击减1后完整需40，实扣仅剩16；存活至少差25血，死亡帧不能称完整攻击只16。')
supported=set(I['silent-test-subject-phase-reset']['evidence'])|{N}
ff={(f['run'],f['floor']) for f in A['fights'] if 'TEST_SUBJECT' in f['enemies'] and f['run'] in supported}
at=[a for a in A['attempts'] if (a['run'],a['floor']) in ff];groups=collections.defaultdict(list)
for a in at:groups[a['run'],a['floor']].append(a)
multi=[g for g in groups.values() if max(a['attempt'] for a in g)>1]
change('silent-test-subject-phase-reset',f'实验体换阶段重核敌状态与输出，SL换线血价须实打核。机制：首阶段每技能加现场激怒层数力量，能力不加；换阶段清敌力/激怒/毒，保留玩家能力。搭配：技能/减力/毒与可活轮合核，全败探索不当安全证明。决定胜负的战斗：{{n}}支持局{len(at)}试{sum(a["result"]=="won" for a in at)}赢，真正重打{len(multi)}场{sum(len(g) for g in multi)}试{sum(a["result"]=="won" for g in multi for a in g)}赢（n={{n}}）。典型案例：9R916WW0V65N A10第三试15轮25→12胜；T0DGVABPV60U六试0赢，末T3四技能敌力0→3→6→9→12、步法不加，T4清旧11毒/力。首/末T2同38血/敌86，扫腿首试零损、末SL换速行者损12；狡诈时点/后续抽弃亦变，无原线整战胜利，不归单因。')
P=json.load(open(O/'historical-potions.json'))
def pc(p):
    rr=[r for r in P if r['potion']==p];return len({r['run'] for r in rr}),len(rr)
nd,ad=pc('DEXTERITY_POTION');nr,ar=pc('REGEN_POTION')
change('silent-dexterity-potion-card-block',f'敏捷药水实饮建2敏捷，已有挡不倒补。机制：{nd}局{ad}饮均+2，之后每挡牌加敏再核脆弱，换战撤回。搭配：多挡牌重复收益、临时螺线另计，不定喝留时点。决定胜负的战斗：{{n}}支持/0反例，单项整战因果未控（n={{n}}）。典型案例：9R916WW0V65N实验体三试建2、女王入口撤；T0DGVABPV60U A10 F14T2实饮建2，后场不能沿用；F48的敏捷另来自步法/螺线，无留药胜利对照。')
change('silent-regen-potion-decay-heal',f'再生逐轮回复并受上限截断，不当即时15血。机制：{nr}局{ar}饮建立5层，完整层序5/4/3/2/1共15；短战/封顶按实回，先回后敌伤已核。搭配：牌挡抵敌伤、再生另记回复，净损不当敌总伤，不定留药门槛。决定胜负的战斗：{{n}}支持/0反例，单项整战因果未控（n={{n}}）。典型案例：9R916WW0V65N实验体末回复15、失血28净损13；T0DGVABPV60U A10猫头鹰七轮胜63→51，再生五轮实回15、实失血27净损12；下一精英又损38，不证留药可救boss。')
change('silent-act-transition-missing-hp-heal','已见A9/A10跨幕按缺失HP的80%向下取整回复。机制：同上限按⌊(最大HP−当前HP)×0.8⌋，低阶/其他先古未核；连续boss不属跨幕。搭配：营火、开场遗物、事件回复与SL恢复分账。决定胜负的战斗：{n}支持/0反例，单项整战因果未控（n={n}）。典型案例：9R916WW0V65N首boss12血直接进女王、无回血；T0DGVABPV60U A10族母后46/70→65补19、沙虫后13/70→58补45，分别⌊24×0.8⌋/⌊57×0.8⌋；五次SL恢复55不计回复，未实到F49。')
rest=next(r for r in json.load(open(O/'rest-summary.json')) if r['asc']==10)
change('silent-rest-buffer-observation',f'观察：只计实完成回复，后战结果另核。A10 {rest["runs"]}局{rest["rests"]}火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{100*rest["deaths"]/rest["nexts"]:.2f}%），活损中位{rest["median"]}；各阶另列（n={{n}}）。典型案例：T0DGVABPV60U九回血/一锻造，千足虫胜剩1后F29回22；F46精英51→13，F47皇家枕头使13/90回55、实补42=27+15；六试boss仍败，无另一休息/锻造受控胜负。SL恢复不算回血。')
band=next(r for r in A['bands'] if (r['asc'],r['act'],r['type'],r['band'])==(10,3,'Monster','25–40%'))
change('silent-route-hp-observation',f'观察：赢战耗下一战缓冲，改线收益须实打核。A10 {rest["runs"]}局三幕Monster以25–40%入血{band["n"]}房/{band["runs"]}局，{band["deaths"]}死（{100*band["deaths"]/band["n"]:.2f}%），活损中位{band["median_win"]}；各阶/幕/房型/血档另列，非路线因果（n={{n}}）。典型案例：T0DGVABPV60U F5走廊胜49→14、三火回满；F28精英胜39→1迫接火，F45猫头鹰63→51后F46精英又损38；F47回55仍首boss死。未走替线未知，不把有火/低模拟胜率当安全或必死。')
change('silent-deck-burst-observation','观察：持牌、计划、短推演与实际启动输出分账。机制：按实施毒/能力/轮初效果核，费用和可活轮限制兑现。搭配：生存与持续输出合核，有限0赢样本不等必死，补药须实际施放。决定胜负的战斗：{n}支持/0反例，单项整战因果未控（n={n}）。典型案例：9R916WW0V65N首boss胜后12血空药、第二boss未重建能力而败；T0DGVABPV60U A10四十牌/三步法只是持有，末战T3/T5才建步法、磨蚀未建，滚石25层死前未触发。F47联合模拟360配对0胜，实末试五轮死于第二阶段，第三阶段及F49未到，不以题面636称本局实打总需伤。')

al=json.load(open(O/'historical-alchemize.json'));ev=list(dict.fromkeys(r['run'] for r in al))
assert len(al)==27 and len(ev)==5
assert all(len([p for p in r['after'] if p.get('potion_id')])==len([p for p in r['before'] if p.get('potion_id')])+1 and r['hp_before']==r['hp_after'] for r in al)
e=dict(id='silent-alchemize-potion-resource-observation',scope='card:ALCHEMIZE',name='炼制药水',asc=[0,20],lesson='炼制实打补药，未打/持有产物不等本轮生存收益。机制：5局27次执行在有空槽时净添一瓶、动作前后HP不变，产物不预定；药水实饮/牌挡分核。搭配：先按实空槽和产物效果核，护栏保血可能删补药窗口；取舍对照仅1局，不拟持有价。决定胜负的战斗：5支持/0反例，补药单因胜负未控（n=5）。典型案例：ZE8F192FKX24 A5实验体T3补迅捷；T0DGVABPV60U A10 F48第3/5试T4同38血/敌197/同手，前试挡线损5未补药，后试SL恢复炼制、补血清后损15，T5携药判死；后继抽弃同变，10血差非单牌价格，血清不直接回血/挡，缺另一整战胜线。',evidence=ev,n_support=len(ev),n_contradict=0,confidence='high',last_seen='2026-10-08',status='active')
E['entries'].append(e);changes.append(dict(id=e['id'],before=None,after=copy.deepcopy(e),new_runs=ev))
E['version']='2026-10-08.14';E['_about']='静默经验只来自本角色实盘与复盘。第97次增量合并T0DGVABPV60U A10，截至2026-10-08T04:17:36.086Z共128完局；旧127局七数组、血档/节点后战、回血及SL逐行复算一致。螺线临时敏捷、抽牌触发、阶段重置/逐击血价及炼制补药分源；同盘SL/护栏差额不冒称整战反事实胜因。经验/账本/代码提案关联独立strategy-proposal，不改打法源码。'
def stats(x):
    aa=[e for e in x['entries'] if e['status']=='active'];return dict(active=len(aa),chars=sum(len(e['lesson']) for e in aa),confidence=dict(collections.Counter(e['confidence'] for e in aa)),asc={a:dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in aa),chars=sum(len(e['lesson']) for e in aa if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})
summary=dict(old_version=B['version'],version=E['version'],added=1,updated=len(changes)-1,retired=0,before=stats(B),after=stats(E),evidence=[dict(id=c['id'],evidence=c['after']['evidence'],contradicting=c['after'].get('contradicting',[]),by_asc=dict(collections.Counter(R[r]['ascension'] for r in c['after']['evidence']))) for c in changes])
assert summary['after']['chars']<55000
K.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(dict(entries=changes),ensure_ascii=False,indent=2)+'\n')
(O/'update-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k!='evidence'},ensure_ascii=False))
