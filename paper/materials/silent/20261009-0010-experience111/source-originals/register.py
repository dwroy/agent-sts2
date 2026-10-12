import json,subprocess,sys
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');C=json.load(open(O/'changes.json'))['entries'];M=json.load(open(O/'ledger-map.json'));L=list(dict.fromkeys(l for v in M.values() for l in v));H={c['id']:c for c in C}
def cli(script,args,value):
 subprocess.run(['date'],stdout=subprocess.DEVNULL,check=True)
 p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner'/script),*args],input=json.dumps(value,ensure_ascii=False),text=True,capture_output=True)
 with (O/'ledger-cli.log').open('a') as f:f.write(json.dumps(value,ensure_ascii=False)+'\n'+p.stdout+p.stderr+'\n')
 assert p.returncode==0,p.stderr
 return p.stdout.strip()
if sys.argv[1]=='prepare':
 p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'fold'],capture_output=True,text=True,check=True);(O/'ledger-fold-before.json').write_text(p.stdout);F=json.loads(p.stdout);F=F if isinstance(F,dict) else {e['id']:e for e in F}
 for lid in L:
  changes=[c for c in C if lid in M[c['id']]];known={e['run'] for e in F[lid]['evidence']};missing=list(dict.fromkeys(r for c in changes for r in c['after']['evidence'] if r not in known))
  item=dict(id=lid,by='learner:experience-update',where=dict(experience=[c['id'] for c in changes]),note='第111批独立提案预关联；原帧/层/回合见本批核验，旧claim/首证/prior/原support/repeat/状态/版本保持，源提交后登记proposed。')
  if missing:item['evidence']=[dict(run=r,floor=13 if lid=='silent-0170' else 6 if lid=='silent-0012' else 17,role='support',note='本角色日志核实'+','.join(c['id'] for c in changes)+'；'+changes[0]['after']['lesson'].split('典型案例：')[-1]) for r in missing]
  cli('ledger.py',['update'],item)
 specs=[('mechanisms',['combat','potion'],['silent-footwork-block','silent-strength-weak-observation','silent-deck-burst-observation','silent-vantom-slippery-growth','silent-fishing-rod-random-upgrade'],'静默墨影滑溜、实建敏捷与力量：限伤和资源兑现验收'),('resources',['structure','potion'],['silent-route-hp-observation','silent-rest-buffer-observation'],'静默胜战血药链与路线条件HP的结构验收'),('replay',['combat','sl'],['silent-vantom-sl-observation'],'静默墨影全败重打同盘血价与未试路线审计')]
 ids=[]
 for name,domains,entries,summary in specs:
  ledgers=list(dict.fromkeys(l for e in entries for l in M[e]));path=O/('proposal-'+name+'.md')
  lines=['# '+summary,'','角色silent；本批已观察A10；机制既有支持分阶见historical-mechanism-summary.json，策略范围不向未观察阶外推。','来源任务experience-update；实现任务strategy-proposal；授权Roy-2026-10-07-learning。','账本：'+','.join(ledgers)+'；经验：'+','.join(entries),'','## 旧记录与新证据']
  for e in entries:
   c=H[e];lines+=['- '+e+'：旧：'+c['before']['lesson']+' 新：'+c['after']['lesson']+'；新证据M0GY0A4M2F7H A10，账本'+','.join(M[e])+'。']
  lines+=['','## 证据、反例和限制','M0GY0A4M2F7H A10 F17六次29/70入场，前五判死而未执行退出结算，只有末试T7实死；末T7已建2敏，偏折6+两防御各7=20挡，对32需损12，8血归零，至少差5血存活；5毒使131→126不是只差5伤斩杀。首试没有打步法，后五试T1已建。','第2—6试T1四段连续反弹183→179、滑溜9→5；首试T2只有蛇咬建7毒、无攻击，177→176且滑溜3→2、毒7→6；末试T5无滑溜直伤9+已结7毒=16。准备后敌2力，肢解30→32，虚弱曾30→22但末T7没有，不能沿用22。','第2/3及第4试T9同19血/敌97/手牌与能量底板，防御+改打击保突然一拳，全轮净清19→25、损0→9，第4试T10判死；两五轮线均24/24死亡，整场估0.7%→0%。末试T3另换线估2.2%→0.7%，实际多损5、多净清1且药序等亦变。无受控整场保血线胜例，不定统一禁攻。','F2/3/4/6/11/13/14/15八胜净耗5/4/8/3/19/21/20/3合83；F7/12/16各实回21合63，F9另耗7。F12实回至52后三胜耗44，最后补至29；F12条件boss64不等实到，差35不据单次结果判全部为模型误差。无未走精英线/锻造线因果对照。','独立得4瓶、实际9饮含SL重饮5；F6能量/力量已饮，boss同瓶无色六次恢复再饮均取闪亮，末次取得但未打、T6被弃。不据一局设喝留阈值或不买药优先。F4/F13钓鱼竿各升防御，核心步法仍普通，不由单局定选遗物因果。','支持/反例沿经验语义，每项历史全角色日志及静默复盘核验；失败不作机制公式反例。完整dirty源码未知、部分独立死亡/过量伤、未派发退出结算、药池分布、单改药时点/SL原线/改路线整场结果未记录。既有0224攻击、0227毒规则与0226已修bug分账，本局不重报漏毒bug。','','## 独立实现建议']
  if name=='mechanisms':lines+=['旧规则：当前模型可能已经正确计算敏捷、虚弱、滑溜攻击和毒限制，知识文字变动不表示源码有错。','新行为：先查当前live和既有postmortem提案去重；固定上述帧验攻击逐击/毒结算分别减滑溜，建立毒不即时扣HP，牌挡加敏、旧挡不补，准备力量与当前弱覆盖分核，取得药牌不能当打出。正确模型保持等价；发现当前可复现偏差才改，不设喝留阈值，数据不足登记waiting。']
  elif name=='resources':lines+=['旧规则：未来路线条件boss HP可能被当成已兑现资源。','新行为：先验证当前题面是否已经展示沿路真实胜战血药及条件模拟输入；若确有遗漏，将实际83净耗/63回复/7事件自损、当前药槽与条件64/实际29分开展示。未观察等级和其他角色等价；无路线受控整战比较，不调路线/营火选择权重。']
  else:lines+=['旧规则：SL因原线失败而尝试另一线，五轮死亡模拟饱和时仍可付较高即时血价；本局属于探索代价，不是接口bug。','新行为：固定同盘原/新即时HP/挡/进度、五轮死亡率及整场估值、后继抽牌/药时点一起保存并验收，原答案与实际换线分核。先核现行准入及原postmortem提案；没有整场胜线不直接拟禁攻/阈值。独立任务可据现有已核多局证据决定窄规则，证据不足保留原行为并等待后续本角色数据。']
  lines+=['','## 拟合、切分、验证、影响和回退','旧145静默局截至2026-10-08T14:04:10.328Z为历史兼容核验，本局是较晚发现帧；按局切分，SL同房不作独立样本，后续完局才是独立时间留出。没有拟合安全血线、药价或探索参数，不借其他角色、预训练或游戏二进制补事实。','固定日志s306724—306986及d299345/299393/299418/299456、F12/F16题面复现；测试沿原test-sandbox入口。预期提高资源和执行记录可追溯性，不承诺转胜。回退独立实现commit到父版源码；保留原经验/账本/失败日志。实际live祖先源码commit才能登记implemented；本任务仅pending，不标implemented/shipped。实际上线先date并双通知Roy。','']
  path.write_text('\n'.join(lines));item=dict(character='silent',ledger=ledgers,runs=['M0GY0A4M2F7H'],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(path),experience=entries,rule_changes=True,authorization='Roy-2026-10-07-learning');(O/('proposal-'+name+'.json')).write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n');ids.append(cli('code_proposals.py',['add','--character','silent'],item))
 (O/'proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n');print('代码提案',ids)
elif sys.argv[1]=='after':
 commit=(O/'source-commit.txt').read_text().strip();v=json.load(open(O/'update-summary.json'))['version'];day=subprocess.check_output(['date','+%Y-%m-%d'],text=True).strip();heading=day+' 静默猎手 第一百一十一次增量：1 局 A10（version '+v+'，分支 exp-silent，'+commit[:8]+'）'
 for lid in L:cli('ledger.py',['update'],dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=[e for e in M if lid in M[e]],commits=[commit],changelog=[heading]),note='第111批经验源已提交；实际数据shipped交运维据live完成事件核实，三独立提案未实现，首证/prior/claim/旧证据状态版本历史保持。'))
 (O/'ledger-results.json').write_text(json.dumps(dict(added=[],proposed=L,retired=[]),ensure_ascii=False,indent=2)+'\n');(O/'changelog-heading.txt').write_text(heading+'\n');print('proposed',len(L))
