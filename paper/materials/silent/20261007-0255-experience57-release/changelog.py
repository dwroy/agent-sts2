import collections,json,re,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=O.parents[2];A=json.load(open(O/'audit.json'));C=json.load(open(O/'changes.json'));S=json.load(open(O/'slice-summary.json'));E={e['id']:e for e in json.load(open(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'))['entries']};R={r['run_id']:r for r in json.load(open(O/'CRK2HNYKSCZC/completed-runs.json'))};RS=json.load(open(O/'rest-summary.json'));SL=json.load(open(O/'sl-summary.json'));B=json.load(open(O/'baseline-check.json'));L=json.load(open(O/'ledger-result.json'));commit=(O/'commit.txt').read_text().strip();title=f'2026-10-07 静默猎手 第五十七次增量：2 局 A10（version 2026-10-07.3，分支 exp-silent，{commit[:8]}）';(O/'changelog-title.txt').write_text(title+'\n')
text=(O/'test-source-final.log').read_text();files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',text)));cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',text)));assert files and cases and (O/'test-source-final.rc').read_text().strip()=='0'
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip();out=[]
def w(s=''):out.append(s)
def table(head,rows):
 w('| '+' | '.join(head)+' |');w('| '+' | '.join(['---']*len(head))+' |')
 for r in rows:w('| '+' | '.join(map(str,r))+' |')
 w()
w('## '+title);w();w('### 来源');w()
w(f'- 记录时间{stamp}。只读notes/lessons.md:5195/5201的DPYF2BAA3DKT、CRK2HNYKSCZC及两份run-1007局报；两局runs.character均SILENT、A10/F48及F11败，无跳过，last_seen为2026-10-07。来源不限这两局：历史静默复盘226段、70局原始日志片段重新计算，其他角色只读更新方法，不移植知识。')
w('- exp-silent开工干净，git merge --no-edit main从63e53c86快进7723affb，无冲突。已读README、最新STATE、decision-log末尾、学习协议、铁甲首次及末两次增量、静默第55/56节；独立执行、无下级agent，nice19单进程抽数，不跑boss模拟池。')
w(f'- 截止2026-10-06T17:23:40.238Z，共70静默完局；A0—A10各7/3/2/1/4/1/11/7/1/3/30局。旧1076房58实死＋新25房2实死＝1101房60实死，A10三十局387房30实死。MCCK2602T1SR仅进数字，不据其缺复盘补机制；后续/进行中/无character旧局不计。')
w('- 新局按12位run id rg分流decisions/brain/run-plans/sl-attempts，states/deepseek按时间二分seek后流式读；旧68局沿上批保留的原始日志只读符号链接，逐局重新分析、全部统计重新汇总，没有联网或修改日志。新DPY 964决策/47实际Codex调用/6计划/9 SL行/991状态，states字节7957426903—7992424579；CRK 148决策/10实际Codex调用/2计划/0 SL行/152状态，字节7992477300—7995991846。同窗DeepSeek均0，ds_*仅兼容字段。开局ad01f74a+dirty及884c9f33+dirty不冒称已复原dirty树。')
w('- 口径沿第56节：净损＝首COMBAT帧HP−同房最终尝试末结算HP，死亡单列、回复负值保留；Monster走廊/Unknown问号分开，分档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按源入血关联下一更高层第一战，Ancient排除、多源可指同战；回血后战按run/floor去重、TD1同房重启合一房。DPY知识恶魔净损27包含尾巴复活10→38，累计受伤/独立回复中间量未知；SL读档回血不算回复。')
w('- 旧基线先重算再加局，七数组逐行一致：'+','.join(f'{k}{v["before"]}→{v["after"]}' for k,v in B.items())+'；旧血档/源节点/回血/SL也一致。初稿泛用分析器遗漏TD1进程重启attempt=2标注，只有attempts不对；恢复上批逐局特例并重抽该局后全量对齐，原失败日志保留，统计口径未变。')
w(f'- 开工127 active/{C["chars_before"]}字>55000；28条单局low均独立scope，没有相同事项可并。先压萎靡/金刚杵/女王三条1233字至54921，原文与完整旧数在compression.json；女王句内旧n=9同步为实际10，不改变证据。本批增1改19（15补证/1只数字/3仅压缩）退0，active128/{C["chars"]}字，高61中39低28。60000预算未改。')
w('- potion:*及general:potion逐对象不变，其他旧含“药”分句逐字保留，新支持仅非药水事实；无任何新增或加强用药规则。机制[0,20]，统计/策略维持原进阶范围；未得步法不补步法证据，SL失败不当机制反例。')
w('- 原始抽取、脚本、全部数字、典型帧与240配对切片留learner/runs/20261007-021220-experience-update。');w();w('### 对照数据检查的主题');w()
topics=[
('角色/旧基线','70静默局；旧七数组/血档/节点/回血/SL一致，新25房2死','仅静默；房与尝试分账'),
('力量/虚弱','沙漏0/4/9力同EBB无弱26/30/35，弱时22/26；CRK九段1→0，早UAC八段1→0','力逐击、虚弱逐击取整，攻击者逐一合核'),
('预判/余像','DPY末T5临时2敏使防御5→7、余像4另算，合11对32损21；T6敏归零','卡牌挡/被动/临时部分分开'),
('毒触媒','DPY末触媒2＋1合3，12/21/23/29毒结算42/78/86/110合316','4p−6在正毒窗口兑现，剩血/未发生轮不预支'),
('头骨/冒泡','DPY末T7普通冒泡文本10、19→29毒，施放敌HP不变','头骨额外1施毒，非即时伤'),
('脆弱/多个攻击者','CRK防御5→3、扫腿11→8合11；追踪手九击归零，斧手13、仅2血','逐牌少5挡；尚余2损恰死，未找到可活目标替代'),
('滚石','CRK F11建5，轮初基础5/10、层数10/15；被敌挡后实扣7/14，死亡后15未兑现；F8九轮未建','实际启动/未来层数/实际伤害分开'),
('重放附魔','LRN0HPZ0FZS1 A0余像13→15、原始计数8→9；DPY A10防御0→24、计数4→5','实际再次打出与原始手动计数分账，仅两窗口'),
('凋萎','DPY末T7实际第30次串刺新增第二张9，26＋18−9=35，28血差7','持牌状态伤与攻击/挡一起核，不仅算新增1余像'),
('棱柱/护栏','DPY F25 T3同一未施放药瓶两题，题面省9血少9伤/余毒；实际旧3毒＋消亡9实扣12，八轮净损59胜','不双算护栏或把题面3当整轮实伤；原线未实打'),
('尖啸','DPY棱柱当轮敌−6力、三击合9，损9；CRK也实际施放','临时减力当轮有效不保证后轮全挡'),
('构筑/回复','DPY末毒316＋其余102=418仍缺117，余像/2临时敏实建、暗影未打，无步法；恶魔净损27含尾巴','取得/建立/足额输出不同，净损不替累计代价'),
('路线/营火','DPY九回血合283，末74血六败；CRK F7锻造39血、放弃未实打21回血，F11投影35/p75 27、实到11','B2优势不保证抵达下火，无回血替代线因果'),
('SL天然对照','新沙漏1场6试0赢；首末order34项ID相同，clean=9，之后有生成牌插入、回合/动作变化','只前9次未插入抽序可比，不能当单变量整场对照'),
('模拟/时钟','DPY族母B2估损70/T12对实际49/T10；恶魔触尾巴净27不比累计78；沙漏B2赢样本估93/T10.5，末死亡T7','B2赢样本/死亡截断/无silent时钟校准分列'),
('最优线/药水事实','DPY rollout原选146/160、沙漏56/66；CRK17/17；两局独立药水取得13/1、使用13/1','护栏/SL探索后完整执行率未知；仅药水事实，条目不补药水证据'),
('压缩/预算','三旧条先压1233，连同本批重复案例压短后总'+str(C['chars'])+'字','无合并/退役、不丢证据，完整旧文本归档')]
table(['主题','数据','结论'],topics)
w('死亡率分母为房，局数另列；活场净损中位排除实际死亡、允许回复负值。A0—A9各格与第56节完全一致，全部局号/损值在audit.json；A10所有非空格：');w()
table(['幕','房型','血档','房/局','死/率','活场净损中位'],[(b['act'],b['type'],b['band'],f'{b["n"]}/{b["runs"]}',f'{b["deaths"]}/{100*b["deaths"]/b["n"]:.2f}%',b['median_win']) for b in A['bands'] if b['asc']==10 and b['n']])
w('源REST/SHOP/EVENT按入血关联下一更高层第一战，多源可指同战，关联死亡率不是节点的因果效果；A10非空格：');w()
table(['幕','源界面','血档','节点/不同战','死/率','活场净损中位'],[(b['act'],b['screen'],b['band'],f'{b["n"]}/{b["unique_fights"]}',f'{b["deaths"]}/{100*b["deaths"]/b["n"]:.2f}%',b['median_win']) for b in A['transfers'] if b['asc']==10 and b['n']])
table(['进阶','局','房/死','火/回血/非回血动作','回血合计','回血后战/死/活损中位','真正重打场/试/赢'],[(f'A{r["asc"]}',r['runs'],f'{len([x for x in A["fights"] if x["asc"]==r["asc"]])}/{sum(x["death"] for x in A["fights"] if x["asc"]==r["asc"])}',f'{r["rests"]}/{r["heal"]}/{r["smith"]}',sum(r['gains']),f'{r["nexts"]}/{r["deaths"]}/{r["median"]}',f'{SL[r["asc"]]["fights"]}/{SL[r["asc"]]["attempts"]}/{SL[r["asc"]]["wins"]}') for r in RS])
w('- 历史真正重打64场291试19赢，A10 31场150试7赢；本批沙漏六试均败不添赢例，CRK无SL行不造尝试。旧赢例已在各boss条目，新增对照仅报告失败差异，不把提前触媒单独归因。低血不同节点旧案例重新核：MGA0CZDDKC0P A10 REST22→43后Monster损17活，4D4J8USKCPAV A10 REST1→22后损1活；D4LJ9QMGFB8Q EVENT13/BVF22RSFVBS9 EVENT21后走廊死；新增CRK取消精英仍走廊死。敌/构筑/回复均不同，均观察而非安全线/优节点因果。');w()
w('### 经验库自己带偏或写了没被执行的地方');w()
w('- 两局实际57次Codex请求，DeepSeek0；没有直接引经验id反向执行的原话，不倒算本版对已结束局生效。CRK F7原话“Extra Weak protects Boulder setup and gives 73% simulated boss wins. Two hallway fights before the next rest make smithing worthwhile.”（中文：额外虚弱保护滚石启动、模拟boss胜率73%，下火前两走廊值得锻造）。实际首场39→11、下场死，未抵达下火；升级额外虚弱真实但B2不是走廊存活保证，无回血线受控实打，不标策略repeat。')
w('- DPY F34原话“宝石面具免费启动余像；双商店三营火补强保命。”；末沙漏余像实建且逐牌收益真实，T7仍差7血。F43原话“Heal to 54 HP. Smithing risks dying before the final campfire; Royal Pillow’s recovery preserves resources for consecutive bosses.”（中文：回54、锻造可能撑不到末火、枕头保留连续boss资源）。实际回54、下一战损18、末火36→74均兑现，第一boss六败、第二未到；不把“保命”规划当已充分防御。')
w('- CRK F8 T3 Jev原滚石信心0.94，被护栏换成打击/防御/生存者；省13当轮血、伤0→6、放弃本场滚石成长，原线整战代价未记录。DPY棱柱同一回合两次覆盖同药瓶只算一次。两局新复盘既有观察补support，未确认同一可避策略失误repeat。');w()
w('### 机制推理');w()
mechanisms=[
('力/敏/逐击虚弱','力量逐段加，敏捷逐挡牌；弱逐击取整，临时/永久/被动分别核','silent-strength-weak-observation','DPYF2BAA3DKT A10 EBB力0/4/9无弱26/30/35；CRK2HNYKSCZC九击1弱为九击0'),
('脆弱逐牌','各牌先加敏再0.75取整；其他攻击者未被弱化仍须盖住','silent-frail-card-block','CRK2HNYKSCZC F11防御3＋扫腿8，对剩13少2血'),
('触媒毒次数','三额外触发使正毒p结算4p−6，增毒与存活窗口共同限制','silent-accelerant-triggers','DPYF2BAA3DKT末12/21/23/29毒→42/78/86/110合316，余117'),
('头骨施毒/冒泡条件','每次毒额外1，但冒泡需目标已毒且施放不即时扣HP','silent-snecko-skull-poison-application','DPYF2BAA3DKT末T7普通文本10、19→29，再触媒扣110'),
('余像实际触发','每次出牌1、重放再次触发，不能以多出牌推存活','silent-afterimage-per-card-block','DPYF2BAA3DKT末四被动＋防御7=11对32损21，T7四被动＋后空翻5=9仍死'),
('预判临时敏','建2/4不补旧挡，需随后挡牌、次轮撤回，余像另算','silent-anticipate-temporary-dexterity','DPYF2BAA3DKT末T5防御5→7只多2，T6临时敏消失'),
('尖啸临时减力','普通/升级减6/8逐击；污染/虚弱再核，不保证后轮挡','silent-piercing-wail-temporary-strength','DPYF2BAA3DKT棱柱T3−6力、三击合9，56→47；CRK实施后仍死'),
('棱柱技能污染','多一技能增加N污染/逐击血价，也可能多施毒，比较实际当轮与整轮范围','silent-infested-prism-tainted-skill-cost','DPYF2BAA3DKT T3同笔药瓶被删，省9血少9题面伤/余毒，原线未实打'),
('滚石启动/挡吸收','按当前层数轮初伤再加5；敌挡吸收和未发生轮不能算收益','silent-rolling-boulder-start-growth','CRK2HNYKSCZC F11基础5/10群伤实7/14，死后15不兑现'),
('凋萎与挡预算','文本状态伤加攻击减挡，新增牌可能同时加被动挡与状态伤','silent-wither-end-turn-loss','DPYF2BAA3DKT末26＋18−9=35，28血差7'),
('重放/原始计数观察','实际效果再次发生，但这两窗口原始手动计数仅+1；不能推广全部自动牌','silent-replay-effect-counter-observation','LRN0HPZ0FZS1余像13→15/计数8→9；DPYF2BAA3DKT防御0→24/计数4→5'),
('构筑兑现观察','能力须建立并存活到触发，取得或高毒总量不是足额防御/输出','silent-deck-burst-observation','DPYF2BAA3DKT毒316＋其余102仍缺117，暗影未施；CRK滚石已买未在F8启')]
rows=[]
for name,why,id,case in mechanisms:
 e=E[id];asc=collections.Counter(R[r]['ascension'] for r in e['evidence']);dist='、'.join(f'A{a}:{n}局' for a,n in sorted(asc.items()));rows.append((name,why,f'{e["n_support"]}/{e["n_contradict"]}；'+dist,case,id))
table(['机制','推理','证据（支持/反例局数、进阶）','典型案例','进了哪个条目'],rows)
w('- 完整12位支持/反例名单见experience.json与本批mechanism-facts.json；旧六牌所有支持局均有实际施放核验。综合n不表示每个子公式都由每局独立验证，败局而公式成立不算公式反例；不能隔离单项整战胜因的一律写观察。药水只事实、无喝药规则。');w()
w('### 新增');w();w('- silent-replay-effect-counter-observation：general:plan/[0,20]/med，LRN0HPZ0FZS1 A0及DPYF2BAA3DKT A10两支持/零反例；实际重放效果与原始计数两个窗口观察。并入既有复盘账本silent-0200，首证LRN/A0/prior=unknown保持，不重复add；代码缺口silent-0199不入DS。');w()
w('### 更新');w()
rows=[]
for id in C['updated']:
 e=E[id];prior=next(x for x in json.load(open(O/'experience-before.json'))['entries'] if x['id']==id);rows.append((id,f'{prior["n_support"]}→{e["n_support"]}',f'{len(prior["lesson"])}→{len(e["lesson"])}','非药水补证/案例压短' if id in C['changes'] else ('只改旧句内n' if id=='silent-footwork-block' else '仅压缩旧例/句内n一致性')))
table(['条目','支持局数','字符改前→后','变化'],rows)
w('- 开工三条压1233字；萎靡/金刚杵/女王证据、范围、日期不变，女王原句n=9修为实际10。新例替换旧重复细节、完整原文和数字保留；没有同scope低置信重复可并，没有退役腾位。头骨4局无反例规则、滚石5局按门槛转high，新增重放2局med。');w()
w('- 另只改数字silent-footwork-block：既有支持40局、旧例句n=39同步为40；两新局未得步法，不加证据、不改范围/日期。_about同步70局截止点和统计口径。');w()
w('### 退役');w();w('- 无。没有反例超过支持，既有真实机制与代码缺口分开，不因某公式有模型实现就删除游戏事实。');w()
w('### 和手写知识及代码冲突');w();w('- 静默其他六份boss-damage/monster-records/room-costs/outcome-stats/fight-value/fight-value-gates均生成数据，无手写攻略需改/删，不新建。逐文件hash/字段在other-knowledge.json；room-costs按MAP→下一MAP不同于本节首COMBAT→末结算，生成截止点不同不当反例。fight-value/gates仍旧2局样本、门控只作题面事实，不据两新局删旧校准；outcome-stats注明观察。铁甲知识/行为保持。')
w('- common沙漏535血、现场26/12×2与成长后意图由原帧重算；未用其他角色结论。只读源码原始cards_played_this_turn跨轮求和遗漏重放额外打出，和新机制/凋萎预算相冲突：本任务只留实际数据，不改手写代码或强化模型。');w()
w('### 代码问题（不给 DS）');w();w('- silent-0199：DPY沙漏重放防御的跨轮实际计数漏1，末串刺多出9凋萎，串刺前预测损26/余2、重读后35/余−7；对应复盘首次明确误判证据本局/prior=unknown保持，不改源码/队列、不把它并进经验或更新账本状态，等待独立修复任务。')
w('- 沙漏T1题27伤实33、末T7题127实132差5，以及CRK F8 T4首题13损实15后题重读已修，原因未核定不添确定bug。CRK末least-loss余0与死亡一致，不标扫腿目标明显漏选。')
w('- 临时抽数初稿角色null未容错、TD1重启标注缺失、计数误取combat而应combat.player、SL draws字典误当列表/初稿31项后改为前9次clean、update脚本第二次执行重复新entry导致StopIteration均留原日志，已修正/断言通过，非生产代码失败。源初轮自测期间修SL口径，中间轮期间补步法句内n及_about；原日志和重建初稿保留，前三轮不作定稿凭据。冻结最终experience blob后第四轮完整自测通过，提交前核hash保持。')
w('- 未记录：替构筑/路线/休息/护栏原线的受控整场代价、知识恶魔独立复活量/累计血价、第二boss实到、逐轮时钟需/估/可活轮和实打比值、重抽后完整原线执行率、Jev缓存命中；不补造。');w()
w('### 测试');w();w(f'- 源定稿bash agent/tools/test-sandbox.sh：tsc0，vitest{files}文件/{cases}用例/退出0；初轮期间修SL口径、中间轮期间同步步法n及_about，冻结最终blob后第四轮完整重跑，原日志保留、前三轮不作提交凭据。固定数据/nice19/固定排除名单保持；合后测试见本节收尾、完整外部交调度器。')
w(f'- JSON合法、12位局号/角色/n/预算/旧基线/逐帧机制/旧药分句断言及git diff --check/gitleaks0；源{commit}仅静默experience.json，英文提交写版本/增1改19退0，带Co-Authored-By。')
w('- 仅learner/ledger.py/by=learner:experience-update将'+','.join(L['proposed'])+'改proposed，覆盖20经验条目；账本新增/退役无、check0。首证/prior/claim/旧version/repeat保持，0200独立机制与0199代码缺口不混；不写accepted/shipped，交运维核实际合入后登记。主目录本节/账本只追加不提交。');w()
w('### 切片大小');w();w('- 种子20260929，最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP共240配对，state.run.character_id=SILENT过滤；官方knowledge-slice.ts/CHARACTER=silent/setExperienceForTests，只变experience，其他知识/结果表固定。样本来自按时间seek抽取的日志片段，sample-manifest和全部原输出保存；不冒充V4完整前缀大小。');w()
table(['进阶/界面','改前中位/最大（字）','改后中位/最大（字）','配对增量中位'],[(r['sample'].removeprefix('sample-'),f'{r["before_median"]}/{r["before_max"]}',f'{r["after_median"]}/{r["after_max"]}',r['delta']) for r in S['rows']])
w(f'- 240配对增量中位{S["median_delta"]}、单片最大增量{S["max_delta"]}；总体中位{S["before_median"]}→{S["after_median"]}，最大{S["before_max"]}→{S["after_max"]}字。active127→128、56154→{C["chars"]}字，高61中39低28；A8 {C["applicable"]["8"]["entries"]}条{C["applicable"]["8"]["chars"]}字，A9 {C["applicable"]["9"]["entries"]}条{C["applicable"]["9"]["chars"]}字，A10 {C["applicable"]["10"]["entries"]}条{C["applicable"]["10"]["chars"]}字。需要Dai定：无。')
(O/'changelog-section.md').write_text('\n'.join(out)+'\n');dest=ROOT/'paper/materials/experience-changelog-silent.md';prior=dest.read_bytes();(O/'changelog-before-hash.txt').write_text(__import__('hashlib').sha256(prior).hexdigest()+'\n')
with dest.open('a') as f:f.write('\n'+(O/'changelog-section.md').read_text())
assert dest.read_bytes().startswith(prior)
print(title,'只追加一节',len(out),'行')
