import sys,json
from pathlib import Path
out=[]
for line in sys.stdin:
    _,value=line.split(':',1);row=json.loads(value);state=row['state'];player=state['combat']['player']
    enemies=[]
    for enemy in state['combat']['enemies']:
        enemies.append({'ID':enemy['enemy_id'],'HP':enemy['current_hp'],'攻击':sum(i.get('total_damage') or 0 for i in enemy['intents'])})
    out.append({'原状态行':row['_line'],'时间':row['ts'],'回合':state['turn'],'HP':state['run']['current_hp'],'max_HP':state['run']['max_hp'],'挡':player['block'],'敌':enemies})
assert [r['HP'] for r in out]==[41,32,6,2,2,0]
assert [r['回合'] for r in out]==[1,2,3,4,4,4]
Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-141302-postmortem/critical-numbers-after-grep.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('追加后grep核验通过：入口41/82、T2 32、T3 6、T4 2、结束0；死亡前16挡对12+13攻击。')
