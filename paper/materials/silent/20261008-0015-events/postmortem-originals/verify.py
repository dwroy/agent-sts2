import json,re,datetime,subprocess
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2');p=root/'learner/runs/20261007-234302-postmortem';run='NHA2KW0RB7VP'
s=[json.loads(x) for x in (p/'states.jsonl').open()];d=[json.loads(x) for x in (p/'decisions.jsonl').open()];source_check={}
for name,rows in [('states',s),('decisions',d)]:
 with (root/'logs'/f'{name}.jsonl').open('rb') as f:
  for x in rows:
   f.seek(x['_offset']);orig=json.loads(f.readline());assert orig=={k:v for k,v in x.items() if k not in ['_line','_offset']},(name,x['_line'])
 source_check[name]=len(rows)
ss={x['_line']:x for x in s};dd={x['_line']:x for x in d}
end=ss[283526]['state'];before=ss[283525]['state'];assert end['run']['current_hp']==0 and end['turn']==4
assert before['run']['current_hp']==16 and before['combat']['player']['block']==6
assert [(x['enemy_id'],x['current_hp']) for x in end['combat']['enemies']]==[('CRUSHER',170),('ROCKET',147)]
assert sum(z.get('total_damage') or 0 for x in before['combat']['enemies'] for z in x['intents'])==38
assert ss[283390]['state']['run']['current_hp']==28 and ss[283391]['state']['run']['current_hp']==30
assert ss[283399]['state']['combat']['enemies'][0]['intents'][0]['damage']==2
assert ss[283398]['state']['combat']['enemies'][0]['intents'][0]['damage']==1
assert ss[283400]['state']['run']['current_hp']==22
assert len(s)==602 and len(d)==584
jev=[x for x in d if x['decider']=='jev'];pick=[x for x in jev if x['label'].startswith('combat/plan-choice')]
assert len(jev)==123 and len(pick)==105 and sum(x['rollout_best_chosen'] for x in pick)==92
assert sum(x['confidence']<.35 for x in jev)==6
ov=[x for x in d if 'SL explore' in x['rationale']];assert len(ov)==7
own=[x for x in d if x['decider']=='code' and x['label'].startswith('combat/') and x['label']!='combat/plan-continue' and x['chosen']['action']!='end_turn']
key=lambda x:(x['floor'],x.get('sl_attempt'),x['turn'])
a={key(x) for x in own};b={key(x) for x in ov};assert len(a)==29 and len(b)==5 and not (a&b) and len(a|b)==34
assert sum((x.get('usage') or {}).get('input_tokens',0) for x in jev)==725533
assert sum((x.get('usage') or {}).get('output_tokens',0) for x in jev)==6777
assert sum((x.get('usage') or {}).get('cache_hit_tokens',0) for x in d if x['decider']=='codex')==2427136
start=datetime.datetime.fromisoformat(d[0]['ts'].replace('Z','+00:00'));stop=datetime.datetime.fromisoformat(d[-1]['ts'].replace('Z','+00:00'));assert (stop-start).total_seconds()==2353.992
with (p/'verified-critical-frames.jsonl').open('w') as w:
 for n in [283390,283391,283398,283399,283400,283422,283525,283526]:
  x=ss[n];st=x['state'];co=st.get('combat') or {};w.write(json.dumps({'source_line':n,'ts':x['ts'],'floor':st['run']['floor'],'turn':st['turn'],'current_hp':st['run']['current_hp'],'max_hp':st['run']['max_hp'],'block':co.get('player',{}).get('block'),'enemies':[{'id':e['enemy_id'],'hp':e['current_hp'],'total_damage':sum(v.get('total_damage') or 0 for v in e['intents'])} for e in co.get('enemies',[])]},ensure_ascii=False)+'\n')
with (root/'notes/lessons.md').open() as f:
 lines=list(f)
heads=[z for z in lines if z.startswith('## '+run)];assert len(heads)==1
begin=next(i for i,z in enumerate(lines) if z.startswith('## '+run));endidx=next((i for i in range(begin+1,len(lines)) if lines[i].startswith('## ')),len(lines));sec=''.join(lines[begin:endidx])
assert sec.count('- [记录]')==1 and len([z for z in sec.splitlines() if z.startswith('- [') and not z.startswith('- [记录]')])==3
r={'source_rechecked':source_check,'critical_checks':'通过','jev_best':{'true':92,'total':105},'code_rounds_non_end':29,'sl_override_rounds':5,'total_code_rounds_non_end':34,'errata_needed':['标题末尾两敌血量对应须明确命名','代码非结束自主回合补含SL覆盖的总口径'],'section_line':begin+1}
(p/'verification.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps(r,ensure_ascii=False))
