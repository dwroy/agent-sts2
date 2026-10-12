import json,subprocess,sys
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load(open(O/'changes.json'))['entries'];M=json.load(open(O/'ledger-map.json'))
L=list(dict.fromkeys(l for ls in M.values() for l in ls))
def cli(script,args,value):
 stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
 p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner'/script),*args],input=json.dumps(value,ensure_ascii=False),text=True,capture_output=True)
 with (O/'ledger-cli.log').open('a') as f:f.write(stamp+'\n'+json.dumps(value,ensure_ascii=False)+'\n'+p.stdout+p.stderr+'\n')
 assert p.returncode==0,p.stderr
 return p.stdout.strip()
if sys.argv[1]=='prepare':
 F=json.load(open(O/'ledger-before.json'))
 for lid in L:
  changes=[c for c in C if lid in M[c['id']]]
  v=dict(id=lid,by='learner:experience-update',where=dict(experience=[c['id'] for c in changes]),note='第115批提案预关联；原claim/首证/prior/状态/版本及support/repeat历史保留。1247决策/1367帧及旧149局复算，提交后登记proposed；层轮明细见verified/audit/history。')
  if not any(e['run']=='P2M3DFJ4DEZ3' for e in F[lid]['evidence']):
   v['evidence']=[dict(run='P2M3DFJ4DEZ3',role='support',note='本角色实帧/复盘核验：'+','.join(c['id'] for c in changes)+'；F48/49力敏、毒与持牌伤、血药接续见verified，路线/休息见audit。机制支持不等单因转胜。')]
  cli('ledger.py',['update'],v)
 specs=[
 ('mechanisms',['combat'],['silent-strength-weak-observation','silent-frail-card-block','silent-footwork-block','silent-noxious-fumes-growth','silent-wither-end-turn-loss','silent-snakebite-retained-poison','silent-mad-science-custom-strangle'],'静默现场力敏、模板、毒与持牌伤分源并核升级蛇咬'),
 ('handoff',['structure','combat','potion','sl','terminal'],['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation','silent-act-transition-missing-hp-heal','silent-double-boss-resource-handoff'],'静默连王实际血药与开场回复接续，不拟无证药价/终局阈值'),
 ('sl',['combat','sl'],['silent-queen-poison-window-sl-observation','silent-aeonglass-artifact-growth-sl'],'静默SL真实换线血价、弃牌边界与资源恢复对照'),
 ('unmovable',['combat'],['silent-unmovable-first-card-block'],'静默同线新建普通坚定不移首卡翻倍及脆弱组合')]
 details={
 'mechanisms':['P2M3DFJ4DEZ3 A10 F49末T1华彩步法+建6敏，专长科学再令1力→3、6敏→8；防御13重放实26。MAD_SCIENCE四模板分子样本，专长只A7/A10两局。F48末T7四张9伤凋萎、26攻、28挡，53→19损34，内部全序未知。','F49末T3蛇咬+实毒2→12、132血不变；d302596原列升级蛇咬未建模。原纯bug0319首证VN7RQJMJEFMX A6 F17T3实加10，普通版S1.fix43已修不表示升级覆盖；先查原复盘提案与当前live去重，仅核升级10毒分支，未知交互保持，不把净清差都归漏毒。'],
 'handoff':['F42三骑士68→45喝攻击药，F43问号战45→24；F45华夫饼24/70→77/77且补两药，F47满血锻造群蛇。八火六回血各21共126，枕头后未再回血、不预支15；全局群蛇未实际施放/建能力，不给每牌6输出。','F48六试同77两药，末T10胜19空药；F49入房19，小血瓶补21，五次恢复首帧21仍空药。11局真实连王接续全后战败，不把首战胜作全局胜。p2796已保血留药面对第二boss，是0228 support而非忘第二战repeat。无留药/改线受控胜线，保留药水时点、必死/SL及终局权重，先核同样本端点和开场回复分账。'],
 'sl':['F48前五T11判死截断，第六T10胜。末T5较同底板旧T5多净清12、多损16，后续牌序亦变，不把胜全归这一次或作独立局。F49六试零赢，第5T7后聚合体退场仍T11判死，不能设固定目标顺序或归胜运气。','F49末T3 d302596预排生存者后中和，d302598弃掉中和，三击36对24挡、18→6损12，原报3多9恰对应未兑现弱。旧0268已记录，仅窄查普通单弃模型和执行器跨弃牌重算，不复报已修；未保中和整场胜果。不以饱和rollout24/24死代替即时血价或真正必死证据。'],
 'unmovable':['F48第二试T7 d302145打击→能力→防御原报14挡/39损，s309858→309861建1层、实28挡、63→38损25；27凋萎+26攻−28=25。原纯bug0320只定位同线新建未传首卡额度，已有状态重读能算对。F49末T1原26挡建立后仍26，T2首斗篷28；T5基础6+8敏、首卡倍挡、脆弱97实21，随后防御19→9，6血仍死于27攻。','普通1层、首张卡牌格挡和这些组合是唯一支持局；所有历史静默UNMOVABLE实际出牌仅本局，无叠层/其他角色/未观察进阶值。提案在已观察A10接同线建立首卡额度、每轮重置与消费，保留旧挡、不预支下轮21；组合验证⌊(6+8)×2×0.75⌋=21，不能先截10再倍20。先核live及原postmortem提案去重，未有替代整场胜线，不保证修后通关。']}
 ids=[]
 for name,domains,entries,summary in specs:
  ledgers=list(dict.fromkeys(l for e in entries for l in M[e]))
  if name=='mechanisms':ledgers+=['silent-0319']
  if name=='sl':ledgers+=['silent-0268']
  if name=='unmovable':ledgers+=['silent-0320']
  lines=['# '+summary,'','角色silent；来源experience-update，实现strategy-proposal；授权Roy-2026-10-07-learning。','账本：'+','.join(ledgers)+'；经验：'+','.join(entries),'','## 旧规则、新观察与证据']
  for ident in entries:
   c=next(c for c in C if c['id']==ident);e=c['after']
   lines+=['- '+ident+'；旧：'+(c['before']['lesson'] if c['before'] else '此前无本角色该机制条目')+'；新：'+e['lesson']+'；进阶'+str(e['asc'])+'；支持'+','.join(e['evidence'])+'；反例'+','.join(e.get('contradicting',[]))+'；账本'+','.join(M[ident])+'。']
  lines+=['','## 本角色局号、层、回合、拟实现旧/新行为',*details[name],'','## 拟合方法、时间切分、缺数据、验证与回退','旧149完局截至2026-10-08T16:31:21.905Z为历史兼容核验；新局截至17:42:10.878Z为发现样本，后续silent新完局才作独立留出。SL多试不当独立局；未拟合药价、血线、终局权重或SL次数。先核当前live与原提案，正确保持；已核确定机制窄修，不足则waiting写限制。','固定验证使用本scratch原始1367帧/1247决策/14SL、35关键核验、全部历史同角色原帧/复盘。核同线新建、首卡额度消费/重置、翻倍/脆弱取整、普通已修与升级10毒、单弃后合法后缀、资源恢复及小血瓶分账；其他角色与未观察机制保持等价。完整dirty源码、未选路线、提前喝药、持牌伤内部全序、替代整场胜线、silent时钟校准缺证，不补预训练玩法。','预期使已观察状态/机制与模型或题面一致，不保证转胜。回退独立源码commit至父版，保留本任务经验/账本、初稿与失败日志；按固定test-sandbox和60000预算验证。实际上线后先date双通知Roy旧/新、证据/账本/任务、预期影响与回退。','本任务只登记pending，不改打法源码，不称implemented/shipped；只有实际live祖先源码commit可标implemented。','']
  path=O/('proposal-'+name+'.md');path.write_text('\n'.join(lines))
  v=dict(character='silent',ledger=ledgers,runs=['P2M3DFJ4DEZ3'],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(path),experience=entries,rule_changes=True,authorization='Roy-2026-10-07-learning')
  (O/('proposal-'+name+'.json')).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
  ids.append(cli('code_proposals.py',['add','--character','silent'],v))
 (O/'proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(ids,ensure_ascii=False))
elif sys.argv[1]=='after':
 commit=(O/'source-commit.txt').read_text().strip();heading=(O/'changelog-heading.txt').read_text().strip()
 for lid in L:
  entries=[c['id'] for c in C if lid in M[c['id']]]
  cli('ledger.py',['update'],dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=entries,commits=[commit],changelog=[heading]),note='第115批经验源提交已自测，待运维据实际live完成事件登记shipped；纯bug原状态不改，不称提案源码实现。'))
 (O/'ledger-results.json').write_text(json.dumps(dict(added=[],proposed=L,retired=[]),ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(L,ensure_ascii=False))
