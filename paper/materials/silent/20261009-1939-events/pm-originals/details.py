exec(open('/home/dw/Projects/agent-sts2/learner/runs/20261009-191302-postmortem/summarize.py').read().split("print('sample keys'")[0])
B=[]
for d in D:
 if d['decider']=='codex':B.append({'line':d['_line'],'F':d['floor'],'label':d['label'],'rationale':d['rationale']})
emit('brain-compact.jsonl',B)
turns=[]
for c in R['combats']:
 frames=[x for x in S if c['entry']['line']<=x['_line']<=c['last']['line']]
 for t in dict.fromkeys(x['state']['turn'] for x in frames):
  fs=[x for x in frames if x['state']['turn']==t];a=fs[0];z=fs[-1]
  def board(x):
   st=x['state'];cb=st['combat'];return dict(line=x['_line'],hp=st['run']['current_hp'],block=cb['player']['block'],powers=[(v['power_id'],v.get('amount')) for v in cb['player']['powers']],enemies=[dict(id=e['enemy_id'],hp=e['current_hp'],block=e['block'],intent=e['intents'],powers=[(v['power_id'],v.get('amount')) for v in e['powers']]) for e in cb['enemies']],hand=[dict(id=v['card_id'],name=v['name'],text=v.get('resolved_rules_text')) for v in cb['hand']])
  ds=[d for d in D if d.get('turn')==t and a['ts']<=d['ts']<=z['ts']]
  nxt=next((x for x in S if x['_line']>z['_line']),None)
  turns.append(dict(seq=c['sequence'],F=c['floor'],T=t,first=board(a),last=board(z),next_hp=nxt['state']['run']['current_hp'] if nxt else None,actions=[dict(line=d['_line'],who=d['decider'],label=d['label'],action=d['chosen'],why=d['rationale']) for d in ds]))
emit('turns.jsonl',turns)
choices=[]
for d in D:
 if d['decider']!='jev' or not d.get('questions',{}).get('plan'):continue
 ans=d.get('answers',{}).get('plan',{});k=ans.get('choice');crit=d['questions']['plan'].get('criteria',{})
 try: opt=json.loads(crit[k])
 except (KeyError,TypeError,json.JSONDecodeError):opt={}
 choices.append(dict(line=d['_line'],F=d['floor'],T=d['turn'],sl=d.get('sl_attempt'),choice=k,best=opt.get('rollout_best',False),has_rollout='rollout' in opt,focus=opt.get('focus'),option=opt,why=d['rationale']))
emit('choices.jsonl',choices)
import datetime
print('confidence<.35',[(d['_line'],d['floor'],d['turn'],d.get('confidence')) for d in D if d['decider']=='jev' and d.get('confidence') is not None and d['confidence']<.35])
print('numeric choices',len(choices),'best',sum(x['best'] for x in choices),'focus',sum(x['focus'] is not None for x in choices))
print('deciders',collections.Counter(d['decider'] for d in D))
code=[d for d in D if d['decider']=='code' and d['label'].startswith('combat/') and not d['rationale'].startswith('continuing the Jev-chosen plan')]
ck={(d['floor'],d.get('sl_attempt'),d['turn']) for d in code};jk={(d['floor'],d.get('sl_attempt'),d['turn']) for d in D if d['decider']=='jev' and d['label'].startswith('combat/')}
print('code autonomous actions',len(code),'turns',len(ck),'code-only',len(ck-jk),'jev continues',sum(d['rationale'].startswith('continuing the Jev-chosen plan') for d in D))
print('latency',(datetime.datetime.fromisoformat(D[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(D[0]['ts'].replace('Z','+00:00'))).total_seconds())
print('usage by decider',{k:dict(collections.Counter({f:sum((d.get('usage') or {}).get(f,0) or 0 for d in D if d['decider']==k) for f in set().union(*[(d.get('usage') or {}).keys() for d in D if d['decider']==k])})) for k in ['jev','codex']})
print('guards',len([d for d in D if 'HP guard:' in d['rationale']]))
