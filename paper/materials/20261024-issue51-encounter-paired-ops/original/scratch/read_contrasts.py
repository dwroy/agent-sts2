import sys,pathlib,json,hashlib
sys.path.insert(0,str(pathlib.Path.cwd()/'eval'))
from build_stats_view import page
ROOT=pathlib.Path('/home/dw/Projects/agent-sts2/knowledge/characters/silent/build-statistics-v1');OUT=pathlib.Path(__file__).resolve().parent;D=OUT/'own-fight-pages';D.mkdir(exist_ok=True)
CASES=[('bygone','0CLP16ZR4ZZC',8,'support'),('bygone','2Q6ZYZ6JHM0M',8,'limitation'),('vantom','0CLP16ZR4ZZC',17,'support'),('vantom','1303HVDLVMGR',17,'limitation'),('kin','KUHYZBFFLALU',17,'support'),('kin','ZTRGYYMLR8SC',17,'limitation'),('demon','KUHYZBFFLALU',33,'support'),('demon','MEQ6ETDCEEE9',33,'limitation'),('millipede','FZT053H9PSC5',31,'support'),('millipede','1913SE84AXQF',31,'limitation'),('crab','LKC9YXKZWTKR',33,'support'),('crab','F6XY4QJMS5RC',33,'limitation')]
index=[]
for name,run,floor,role in CASES:
 j=json.loads((ROOT/f'games/{run}.json').read_text());fs=sorted([x for row in j['rows'] for x in row['fights']]+j['unplaced']['fights'],key=lambda x:x['first_off']);i=next(i for i,x in enumerate(fs) if x['floor']==floor);raw=page(ROOT,'game',run_id=run,section='fights',offset=i,limit=1);dest=D/f'{name}-{role}.json';dest.write_bytes(raw);f=json.loads(raw)['rows'][0]
 index.append(dict(context=name,role=role,run=run,ascension=j['ascension'],attempt_scope=j['attempt_scope'],game_version=j['game_version'],path=str(dest),sha256=hashlib.sha256(raw).hexdigest(),floor=floor,outcome=f['outcome'],net_hp_loss=f['net_hp_loss'],entry_hp=f['entry_hp'],post_hp=f['post_hp'],sl_touched=f['sl_touched'],first_attempt_end=j['first_attempt_end'],terminal_state_confirmed=j['terminal_state_confirmed']))
(OUT/'own-fight-contrasts.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n')
for x in index:print(json.dumps(x,ensure_ascii=False))
