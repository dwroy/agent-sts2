import json,re,hashlib
from pathlib import Path
p=Path(__file__).parent;R=json.load((p/'0PH64C4AWAX9-resources.json').open());M=json.load((p/'metrics.json').open());draft=(p/'lesson-draft.md').read_text();S={r['_source_line']:r for r in map(json.loads,(p/'states.jsonl').open())};D={r['_source_line']:r for r in map(json.loads,(p/'decisions.jsonl').open())}
checks=[]
def check(name,actual,expected):
 assert actual==expected,(name,actual,expected)
 checks.append({'item':name,'actual':actual,'expected':expected})
check('已结束silent A10',[(r['character'].lower(),r['ascension'],r['floor'],r['victory'],r['code']) for r in map(json.loads,(p/'runs.jsonl').open())],[('silent',10,24,False,'a8bb1ebe5+dirty')])
check('入口HP',[c['entry']['hp'] for c in R['combats']],[56,56,51,51,47,62,57,59,49,28,7,9,9]);check('maxHP',[c['entry']['max_hp'] for c in R['combats']],[70]*13)
check('离场或末帧HP',[(c.get('exit') or c['last'])['hp'] for c in R['combats']],[56,51,51,47,49,6,59,49,28,7,8,8,0])
check('全部首帧T1',[c['entry_is_turn_one'] for c in R['combats']],[True]*13)
check('净HP变化',[None if not c['exit'] else c['exit']['hp']-c['entry']['hp'] for c in R['combats']],[0,-5,0,-4,2,-56,2,-10,-21,-21,None,None,-9])
# 将正文逐回合表与独立流式工具原结果比对。
rows=[line for line in draft.splitlines() if line.startswith('| F') and re.match(r'^\| F\d+／\d+ \|',line)]
check('伤害表场数',len(rows),13)
for c,line in zip(M['combats'],rows):
 parts=[t.strip() for t in line.split('|')[1:-1]]
 for index,key in [(1,'live_enemy_hp_start'),(2,'visible_enemy_hp_loss_lower_bound'),(3,'player_net_hp_change')]:
  check(f"序{c['sequence']}表列{key}",[int(x) for x in parts[index].split('／')],[t[key] for t in c['turns']])
check('Jev低信心',len(M['jev_low']),12);check('末战低信心',sum(x['floor']==24 for x in M['jev_low']),7);check('原选最优',M['plan_best'],32);check('plan分母',len(M['plan_choices']),42);check('护栏',M['guarded'],[])
check('8次主动饮药',len(M['potion_actions']),8);check('用时',M['seconds'],1101.456)
for n,hp in [(330600,9),(330603,8),(330623,8),(330638,14),(330643,2),(330648,0)]:check('s'+str(n)+'HP',S[n]['state']['run']['current_hp'],hp)
check('药瓶后段无毒',[(pw['power_id'],pw['amount']) for pw in S[330600]['state']['combat']['enemies'][2]['powers']],[('REATTACH_POWER',25)])
check('冒泡零效果',S[330600]['state']['combat']['enemies'],S[330601]['state']['combat']['enemies']);check('冒泡花1能量',S[330600]['state']['combat']['player']['energy']-S[330601]['state']['combat']['player']['energy'],1)
check('弃冲刺',D[321591]['chosen']['option_index'],3);check('弃串刺',D[321686]['chosen']['option_index'],1)
check('复活试2末挡',S[330621]['state']['combat']['player']['block'],0);check('复活试3末挡',S[330636]['state']['combat']['player']['block'],5)
check('同出口敌HP试2',[e['current_hp'] for e in S[330623]['state']['combat']['enemies']],[24,40,50]);check('同出口敌HP试3',[e['current_hp'] for e in S[330638]['state']['combat']['enemies']],[24,40,50])
check('死亡敌HP',[e['current_hp'] for e in S[330648]['state']['combat']['enemies']],[0,18,50])
# 关键帧的摘要保留；重新按原日志偏移读取核验。
for r in [S[n] for n in [330465,330475,330481,330488,330492,330496,330500,330533,330549,330569,330591,330597,330603,330623,330628,330638,330643,330647,330648]]:
 with Path('logs/states.jsonl').open('rb') as f:f.seek(r['_offset']);raw=f.readline();fresh=json.loads(raw)
 check('原帧s'+str(r['_source_line']),fresh,{k:v for k,v in r.items() if k not in ['_offset','_source_line']})
 if len(checks[-1]['actual'].__str__())>1000:checks[-1]['actual']=checks[-1]['expected']={'sha256':hashlib.sha256(raw).hexdigest()}
(p/'verified-numbers.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n');print('核验通过',len(checks),'项')
