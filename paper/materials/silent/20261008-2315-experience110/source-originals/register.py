import json,subprocess,sys
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');C=json.load(open(O/'changes.json'))['entries'];M=json.load(open(O/'ledger-map.json'));L=list(dict.fromkeys(l for v in M.values() for l in v));F=json.load(open(O/'ledger-fold-before.json'));F=F if isinstance(F,dict) else {e['id']:e for e in F};H={c['id']:c for c in C};ST={h['run']:h for h in json.load(open(O/'stock-history.json'))}
def cli(script,args,value):
 subprocess.run(['date'],stdout=subprocess.DEVNULL,check=True)
 p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner'/script),*args],input=json.dumps(value,ensure_ascii=False),text=True,capture_output=True)
 with (O/'ledger-cli.log').open('a') as f:f.write(json.dumps(value,ensure_ascii=False)+'\n'+p.stdout+p.stderr+'\n')
 assert p.returncode==0,p.stderr
 return p.stdout.strip()
if sys.argv[1]=='prepare':
 for lid in L:
  changes=[c for c in C if lid in M[c['id']]];known={e['run'] for e in F[lid]['evidence']};missing=list(dict.fromkeys(r for c in changes for r in c['after']['evidence'] if r not in known))
  item=dict(id=lid,by='learner:experience-update',where=dict(experience=[c['id'] for c in changes]),note='第110批提案预关联；原帧/层/回合见本批numbers-checked、stock-history、audit，首证/prior/claim/support/repeat/旧状态及版本保持；源提交后登记proposed。')
  if missing:
   ev=[]
   for r in missing:
    if lid=='silent-0312':
     h=ST[r];ev.append(dict(run=r,floor=h['floor'],role='support',note='完整三台实见上限'+str(h['stages'])+'，库存2→1→无仍须处理末台；历史跨轮毒回补不反推内部清毒帧，分布/固定倍率未知。'))
    else:
     floor=33 if lid in ['silent-0018','silent-0117'] else 17 if lid=='silent-0009' else 2 if lid=='silent-0158' else 44 if lid=='silent-0142' else 34 if lid=='silent-0243' else 43 if lid=='silent-0019' else 45
     ev.append(dict(run=r,floor=floor,role='support',note='本角色原日志核实'+','.join(c['id'] for c in changes)+'；'+changes[0]['after']['lesson'].split('典型案例：')[-1]))
   item['evidence']=ev
  cli('ledger.py',['update'],item)
 resources=['silent-route-hp-observation','silent-rest-buffer-observation','silent-eternal-feather-rest-arrival-heal','silent-act-transition-missing-hp-heal'];replay=['silent-insatiable-dual-clock'];stock=['silent-axebot-stock-phase-budget']
 specs=[('mechanisms',['combat','potion'],[c['id'] for c in C if c['id'] not in resources+replay+stock],'静默实建毒、力敏与临时减力：跨阶段当前资源与真实生存验收'),('resources',['structure','potion'],resources,'静默路线真实胜战血药链、到火回复与未来条件血量验收'),('replay',['combat','sl'],replay,'静默沙坑计划逃离弃牌上下文与SL同盘取舍审计'),('stock',['combat'],stock,'静默巨斧库存三阶段不同HP上限、阶段清毒与剩余需求覆盖')]
 ids=[]
 for name,domains,entries,summary in specs:
  ledgers=list(dict.fromkeys(l for e in entries for l in M[e]));runs=list(dict.fromkeys(r for e in entries for r in H[e]['new_runs']));path=O/('proposal-'+name+'.md')
  lines=['# '+summary,'','角色：silent；新发现/验证A10；库存支持A0/A2/A3/A6/A7/A10，逐条支持阶见historical-mechanism-summary和stock-history。其他机制范围按已有支持，策略不向未观察阶外推。','来源任务：experience-update；实现任务：strategy-proposal；授权：Roy-2026-10-07-learning。','账本：'+','.join(ledgers)+'；经验：'+','.join(entries),'','## 旧规则与核实的新证据']
  for e in entries:
   c=H[e];lines+=['- '+e+'：旧：'+(c['before']['lesson'] if c['before'] else '无本角色库存经验；既有复盘代码提案另存。')+' 新：'+c['after']['lesson']+'；证据：'+','.join(c['new_runs'])+'；账本：'+','.join(M[e])+'。']
  lines+=['','## 已核局、层、回合与边界','R3AJCGQGGMR4 A10 F45T2原s306415→416清首台后90/90、库存2→1；T6 s306438→439清第二台后99/99、旧27毒消失。T7步法1→3敏、脆弱下两防御各6合12；26−12=14完整需损，9血截断至0，至少差6血存活；新5毒三结12、敌87/99。未打余像不计逐牌挡；T1行动30、后净9，其中3与毒一致，另6分源未记录（按来源勘误），不归三刃回旋镖。','F33首试T5 d298726计划投掷匕首→匕首雨→逃离，d298727弃唯一逃离（Jev0.21），T6尚未结算的35毒不能预支。T6敌94，15血0挡及潜在奥利哈钢6挡不足24攻，读档不当实际死亡。第二试T3完整同盘SL去掉投掷匕首，原直伤42→32、同损25，后续药水T6→T4、牌序及防御/弱化/逃离同变；T7打击12后69血/36毒、普通触媒额外1及逃离1→2，毒收尾3血胜；不能称仅保逃离可赢。','三幕F37/39/43均赢却净耗20/24/45；F39两瓶实饮不等保血。七到火羽毛123，五HEAL104，两锻造不回血；F40下一火前投影35/p75 23，实6；F44羽毛6→30再HEAL到52，巨斧52进场。F48/F49双boss模拟条件输入75不是已到，未到后资源未知。','历史13库存房/13局，原最高HP逐台皆增长；A0首证LRN0HPZ0FZS1 F38三台77→88→98且T7胜，prior yes保持。不同序列不拟固定增长倍率；恢复第一可见帧带毒可能已跨轮补毒，缺中间帧不反推内部时点。','支持局和反例沿experience语义；历史每条支持分阶/实动作索引见historical-mechanism-summary；胜败不自动当公式反例。stock-history全角色该遭遇集合已逐帧检索，其他主题保留旧支持不把持有/动作出现全当整条新支持。','完整dirty运行源码未知；参考11d759cf+dirty，复盘只读参考9949a5de模型不代表完整运行树；未记录恢复分布、部分独立归零/毛伤、未派发SL退出结算、同帧内部时点、单保逃离/单改药时点/替路线或构筑的整场结局。','','## 独立实现建议']
  if name=='mechanisms':
   lines+=['旧：当前代码可能已计入敏捷、脆弱、临时力量、涂毒和触媒，不能由败局推所有模型有bug。','新：先查当前live模型与既有提案去重，以固定帧核真实增益、当前毒、可兑现结算次数、当前力量/牌挡及完整需损；恢复清旧毒后只用新毒；未打余像不预支。药水只验实际触发，SL恢复不计新获；爬行动物临时3力与永久力/毒分账。没有留药/单时点受控胜负，不改喝留阈值或持有价值，模型正确保持等价。']
  elif name=='resources':
   lines+=['旧：题面下一营火/boss条件HP可能被理解成已到，未来血池不能替代已发生胜战血药。','新：结构输出区分实际18胜346净耗、羽毛/休息/跨幕/SL恢复来源及当前药槽，与未走路线/未来回复的条件输入。F43新增机器人净HP和退场预算另计，不把活体HP增加当无输出或将全部261当独立必需清血。F48/F49未到，不据本局改终局模型参数；需先证明当前题面遗漏实际资源才改显示，没有替路线或回血/锻造整场对照不调策略。']
  elif name=='replay':
   lines+=['旧：弃牌题可能没有续计划逃离需求，原逃离在抽弃题被弃导致后续计划重算；SL全败并列探索可减少当前输出。','新：与原postmortem escape-context提案去重，已选可支付续步在强制弃牌题中显示牌/沙坑/费用/弃后仍可支付逃离是否存在，同时验HP与截止；不永久禁止弃逃离、不预支未知抽牌。SL保留完整同盘抽牌和原/新即时血价/伤害，以及后续改变，原线与胜线不归一动作；没有受控整线比较不调探索准入阈值，证据不足写waiting。']
  else:
   lines+=['旧：复盘参考rollout.ts:1690恢复用旧maxHp，:3196按库存×旧maxHp计余需，本局231对实际266少35；这是既有silent-0311纯bug提案，不由经验重复造bug。','新：与postmortem proposal-stock去重，先检当前live实际实现。传播已见恢复后HP上限及现体剩血，未见新上限/分布保留覆盖不确定性；不以本局77→90→99拟固定倍率，不以首台归零/当前攻击取消当整场赢；复现毒清除、第三台仍在场与剩87。若未来恢复分布样本不足，报告覆盖限制/等待新数据，不能包装确定胜率。']
  lines+=['','## 拟合、切分、验证、影响与回退','旧144局截至2026-10-08T13:16:41.806Z作兼容历史核验，本局为较晚发现/验证帧，后续新silent局才是独立时间留出；按局切分，SL同房不作独立样本。未拟合安全HP线、药水持有权重、增长倍率或胜率，不借其他角色数据/预训练/二进制。','固定s306415/416、438/439/440/444及F33 d298726/727、SL T3完整手牌和T7结算、F40/44题面/真实到火链复现；沿当前正确机制保持等价，未观察阶/角色不改。实现自测原test-sandbox入口，并核准真实live祖先才能记implemented_commit；本任务pending，不标implemented/shipped。','预期提高阶段账目、计划上下文和事实展示可追溯性，不承诺整场转胜。回退独立实现commit到父版行为，保留经验/账本/证据/失败日志。实际上线按原流程date、双通知Roy。经验数据上线不代表这些源码提案已实现。','']
  path.write_text('\n'.join(lines));item=dict(character='silent',ledger=ledgers,runs=runs,source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(path),experience=entries,rule_changes=True,authorization='Roy-2026-10-07-learning');(O/('proposal-'+name+'.json')).write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n');ids.append(cli('code_proposals.py',['add','--character','silent'],item))
 (O/'proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n');print('提案',','.join(ids))
elif sys.argv[1]=='after':
 commit=(O/'source-commit.txt').read_text().strip();heading='2026-10-08 静默猎手 第一百一十次增量：1 局 A10（version 2026-10-08.27，分支 exp-silent，'+commit[:8]+'）'
 for lid in L:cli('ledger.py',['update'],dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=[e for e in M if lid in M[e]],commits=[commit],changelog=[heading]),note='第110批经验源已提交；实际数据shipped交运维据live完成事件核实，四独立提案尚未实现，不覆盖旧claim/首证/prior/原support/repeat/旧版本。'))
 (O/'ledger-results.json').write_text(json.dumps(dict(added=[],proposed=L,retired=[]),ensure_ascii=False,indent=2)+'\n');(O/'changelog-heading.txt').write_text(heading+'\n');print('proposed',len(L))
