import json,pathlib,hashlib,subprocess,collections,datetime
root=pathlib.Path('/home/dw/Projects/agent-sts2');p=root/'learner/runs/20261009-031301-postmortem'
s=json.loads((p/'states.json').read_text());d=json.loads((p/'decisions.json').read_text());resources=json.loads((p/'FU8ZUQHBHNV9-resources.json').read_text());turns=json.loads((p/'turns.json').read_text());brain=json.loads((p/'brain.json').read_text())
S={x['_line']:x['state'] for x in s};D={x['_line']:x for x in d};checks=[]
def check(name, value):
 assert value,name
 checks.append(name)
before=json.loads((p/'append-before.json').read_text())
with (root/'notes/lessons.md').open('rb') as f:
 check('旧复盘前缀字节未变',hashlib.sha256(f.read(before['size'])).hexdigest()==before['sha256']);tail=f.read().decode()
(p/'appended-section.md').write_text(tail)
check('本任务仅一个局标题',tail.count('## FU8ZUQHBHNV9（')==1)
check('三条经验',sum(line.startswith('- [') and not line.startswith('- [记录]') for line in tail.splitlines())==3)
check('局与角色',len(d)==153 and len(s)==159 and all(x.get('run_id')=='FU8ZUQHBHNV9' for x in d) and all(x['state']['run']['character_id']=='SILENT' for x in s))
check('五战入离场资源',[(c['floor'],c['entry']['hp'],c['exit']['hp'],c['entry']['max_hp'],c['exit']['max_hp']) for c in resources['combats']]==[(2,56,52,70,70),(3,52,51,70,70),(5,57,49,76,76),(6,49,48,76,76),(8,70,0,76,76)])
check('首帧退出均存在',all(c['entry_is_turn_one'] and c['exit'] for c in resources['combats']))
expected={2:([57,45,36,30,22,1],[12,9,6,8,21,1],[4,0,0,0,0,0]),3:([47,41,26,15,3],[6,15,11,12,3],[0,1,0,0,0]),5:([47,44,26,5],[3,18,21,5],[0,8,0,0]),6:([82,62,49,38,31],[20,13,11,7,31],[0,0,1,0,0]),8:([150,141,125,104,86,69,49,49,41],[9,16,21,18,17,20,0,8,23],[3,1,24,0,0,0,22,0,20])}
for fl,(need,progress,loss) in expected.items():
 a=[x for x in turns if x['floor']==fl]
 check('F'+str(fl)+'逐轮需伤/进度/净损',([x['need'] for x in a],[x['net_progress'] for x in a],[x['hp_loss'] for x in a])==(need,progress,loss))
check('骇鳗死亡底板',S[311519]['run']['current_hp']==20 and S[311519]['combat']['player']['block']==0 and S[311519]['combat']['enemies'][0]['intents'][0]['total_damage']==27 and S[311520]['combat']['enemies'][0]['current_hp']==18)
check('最少损血预算',20-27==-7 and '-7' in D[303697]['rationale'] and 27+1-20==8)
card=next(c for c in S[311492]['combat']['hand'] if c['card_id']=='BLADE_DANCE')
check('药水取牌可免费出',card['energy_cost']==0 and card['playable'] is True and S[311492]['combat']['player']['energy']==0 and D[303673]['chosen']['action']=='end_turn')
check('生成三小刀',sum(c['card_id']=='SHIV' for c in S[311496]['combat']['hand'])==3 and all(c['energy_cost']==0 for c in S[311496]['combat']['hand'] if c['card_id']=='SHIV') and S[311496]['combat']['enemies'][0]['current_hp']-S[311499]['combat']['enemies'][0]['current_hp']==12)
check('跨回合恢复费用',next(c for c in S[311493]['combat']['hand'] if c['card_id']=='BLADE_DANCE')['energy_cost']==1)
check('事件加6与休息22',S[311424]['run']['current_hp']-S[311423]['run']['current_hp']==6 and S[311424]['run']['max_hp']-S[311423]['run']['max_hp']==6 and S[311475]['run']['current_hp']-S[311474]['run']['current_hp']==22 and S[311475]['run']['max_hp']==76)
check('三瓶获得/饮用而未弃',sum(x['chosen']['action']=='use_potion' for x in d)==3 and not any(x['chosen']['action']=='discard_potion' for x in d) and [D[n]['expect']['potion']['id'] for n in [303590,303632,303671]]==['SHIP_IN_A_BOTTLE','SHIP_IN_A_BOTTLE','SKILL_POTION'])
check('无SL恢复',not resources['sl_events'] and all(x.get('sl_attempt') is None and x.get('sl_reloads')==0 for x in d))
check('低信心两次',[(x['_line'],x['confidence']) for x in d if x['decider']=='jev' and x['confidence']<.35]==[(303593,.18),(303672,.18)])
a=[x for x in d if x['decider']=='jev' and isinstance(x.get('rollout_best_chosen'),bool)]
check('选推演最优22/24与rank1 12/24',len(a)==24 and sum(x['rollout_best_chosen'] for x in a)==22 and sum('code rank 1' in x['rationale'] for x in a)==12 and sum('rollout\'s best line, added' in x['rationale'] for x in a)==4)
check('护栏零替换',not any('HP guard' in x['rationale'] for x in d))
check('代码自主规划34条26回合',len([x for x in d if x['label'] in ['combat/plan','combat/lethal','combat/least-loss']])==34 and len(set((x['floor'],x.get('turn')) for x in d if x['label'] in ['combat/plan','combat/lethal','combat/least-loss']))==26)
check('脑引擎均Codex',len(brain)==9 and all(x['engine']=='codex' for x in brain))
check('token合计',sum(x['usage']['input_tokens']+x['usage']['output_tokens'] for x in d)==1304097 and sum(x['usage']['input_tokens']+x['usage']['output_tokens'] for x in d if x['decider']=='jev')==110595)
check('缓存与用时',sum(x['usage'].get('cache_hit_tokens',0) for x in d)==491520 and (datetime.datetime.fromisoformat(d[-1]['ts'])-datetime.datetime.fromisoformat(d[0]['ts'])).total_seconds()==403.828)
check('勘误帧确认',S[311364]['available_actions']==['save_and_quit','confirm_bundle'] and [x['card_id'] for x in S[311365]['run']['deck']][-3:]==['PIERCING_WAIL','RICOCHET','EXPERTISE'] and any('s311364' in part for part in tail.split('### 勘误')[1:]))
check('经验上线分类已勘误', '之前学过：silent-0019，S1.exp114' in tail.split('### 勘误')[-1])
# Re-grep the original large file after append, retaining only the decisive evidence frames.
proc=subprocess.Popen(['rg','-n','-F','FU8ZUQHBHNV9',str(root/'logs/states.jsonl')],stdout=subprocess.PIPE,text=True)
fresh=[]
for raw in proc.stdout:
 n,v=raw.split(':',1)
 if int(n) in [311367,311397,311426,311446,311477,311488,311493,311508,311512,311516,311519,311520]:
  st=json.loads(v)['state'];c=st.get('combat') or {};pl=c.get('player') or {};fresh.append({'line':int(n),'floor':st['run']['floor'],'turn':st.get('turn'),'hp':st['run']['current_hp'],'max_hp':st['run']['max_hp'],'block':pl.get('block'),'enemies':[(e['enemy_id'],e['current_hp'],[i.get('total_damage') for i in e.get('intents',[])]) for e in c.get('enemies',[])]})
check('追加后原始日志重检',proc.wait()==0 and len(fresh)==12)
(p/'verification.json').write_text(json.dumps({'checks':checks,'count':len(checks),'original_log_regrep':fresh,'errata':['选包成功证据帧号已按追加勘误更正','0019刷新状态与对局前S1.exp114已按历史登记勘误']},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'通过项数':len(checks),'原始日志重检':fresh,'勘误':'选包证据帧号已追加更正'},ensure_ascii=False))
