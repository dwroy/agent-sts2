import json,sys
want={295790,296018,296133,296295,296352,296417,296419,296455,296496,296545,296585,296629,296633,296642,296660,296669,296670};found=[]
for text in sys.stdin:
 n,line=text.split(':',1);n=int(n)
 if n not in want:continue
 row=json.loads(line);s=row['state'];c=s.get('combat') or {};pl=c.get('player') or {};v={'line':n,'ts':row['ts'],'floor':s['run']['floor'],'turn':s.get('turn'),'hp':s['run']['current_hp'],'max_hp':s['run']['max_hp'],'block':pl.get('block'),'enemies':[(e['enemy_id'],e['current_hp'],e['max_hp']) for e in c.get('enemies',[])]};found.append(v);print(json.dumps(v,ensure_ascii=False))
assert {v['line'] for v in found}==want
