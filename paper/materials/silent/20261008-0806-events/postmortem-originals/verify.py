import ast,json,re
from pathlib import Path
p=Path(__file__).parent
text=Path('notes/lessons.md').read_text();section=text.split('## L2TSFU62Z57Z',1)[1].split('\n## ',1)[0]
triples=re.findall(r'需\[([^\]]+)\]、净扣\[([^\]]+)\]、(?:玩家)?损\[([^\]]+)\]',section)
expected=[]
for l in (p/'audit.txt').open():
 m=re.match(r'\d+ \d+ (\[.*\])$',l.rstrip())
 if m:
  rows=ast.literal_eval(m[1]);expected.append(tuple(','.join(str(r[k]) for r in rows) for k in ['需','净扣','损']))
checks={'逐轮数组数量':len(triples),'逐轮数组预期':len(expected),'逐轮数组全匹配':triples==expected}
assert len(triples)==11 and triples==expected
states={}
for l in (p/'states.lines').open():
 n,s=l.split(':',1);states[int(n)]=json.loads(s)
checks['五胜入出HP']=[(states[a]['state']['run']['current_hp'],states[z]['state']['run']['current_hp']) for a,z in [(291351,291374),(291384,291400),(291411,291425),(291437,291453),(291474,291494)]]
assert checks['五胜入出HP']==[(56,56),(56,51),(51,51),(45,23),(44,24)]
assert all(states[n]['state']['run']['current_hp']==65 for n in [291507,291546,291595,291648,291701,291754])
checks['末轮']={}
for n in [291790,291791,291792]:
 s=states[n]['state'];co=s['combat'];checks['末轮'][n]={'hp':s['run']['current_hp'],'turn':s['turn'],'block':co['player']['block'],'enemy':co['enemies'][0]['current_hp'],'incoming':co['enemies'][0]['intents'][0]['total_damage']}
assert checks['末轮'][291790]=={'hp':17,'turn':8,'block':0,'enemy':129,'incoming':17}
assert checks['末轮'][291791]=={'hp':17,'turn':8,'block':0,'enemy':113,'incoming':17}
assert checks['末轮'][291792]=={'hp':0,'turn':8,'block':0,'enemy':113,'incoming':17}
checks['需勘误敌名']={'SHRINKER_BEETLE':states[291351]['state']['combat']['enemies'][0]['name'],'FUZZY_WURM_CRAWLER':states[291384]['state']['combat']['enemies'][0]['name']}
checks['数字不一致']=[]
(p/'numbers-audit.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(checks,ensure_ascii=False))
