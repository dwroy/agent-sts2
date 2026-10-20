"""Freeze an explicitly selected V5 cohort from the existing read-only log index."""
import csv, gzip, hashlib, json, pathlib, sys

ROOT = pathlib.Path('/home/dw/Projects/agent-sts2')
OUT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'agent/tools/logdb'))
import query, extract

def save(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2, default=query.plain) + '\n')

cohort = [r for r in csv.DictReader(open(ROOT/'paper/data/runs.csv'))
          if r['character'].lower() == 'silent' and r['start_ts'] < '2026-10-19T05:58:35.715Z'][-40:]
ids = ','.join("'" + r['run_id'] + "'" for r in cohort)
c = query.connect(str(ROOT/'data/logdb'), threads=1)
def rows(sql):
    cur = c.execute(sql)
    names = [d[0] for d in cur.description]
    return [dict(zip(names, row)) for row in cur.fetchall()]

fights = rows(f"SELECT * FROM fights WHERE run_id IN ({ids}) AND room='elite' ORDER BY first_off")
frames = rows(f"SELECT run_id,fight_no,off,len,ts,screen,is_combat,turn,hp,player_hp,block,energy,cards_played,enemies,player_powers "
              f"FROM fight_frames WHERE (run_id,fight_no) IN (SELECT run_id,fight_no FROM fights WHERE run_id IN ({ids}) AND room='elite') ORDER BY off")
sl = rows(f"SELECT * FROM sl_attempts WHERE run_id IN ({ids}) AND fight_kind='elite' ORDER BY off")
actions = rows(f"SELECT * FROM fight_actions WHERE (run_id,fight_no) IN (SELECT run_id,fight_no FROM fights WHERE run_id IN ({ids}) AND room='elite') ORDER BY off")
configs = []
for raw in open(ROOT/'logs/run-config.jsonl','rb'):
    r=json.loads(raw)
    if r.get('run_id') in {r['run_id'] for r in cohort}:
        configs.append({'sha256':hashlib.sha256(raw).hexdigest(), 'record':r})
save('cohort.json',cohort)
save('configs.json',configs)
save('sl-attempts.json',sl)
save('actions.json',actions)
save('compact-frames.json',frames)
inputs=[]
with open(ROOT/'logs/states.jsonl','rb') as handle:
    for fight in fights:
        ff=[r for r in frames if r['run_id']==fight['run_id'] and r['fight_no']==fight['fight_no']]
        combat=[r for r in ff if r['is_combat']]
        resets=[r['off'] for a,r in zip(combat,combat[1:]) if r['turn'] is not None and a['turn'] is not None and r['turn']<a['turn']]
        # A retry must not overwrite the first attempt's outcome.
        boundary=resets[0] if resets else float('inf')
        first=[r for r in combat if r['off']<boundary]
        start=first[0]
        handle.seek(start['off']); raw=handle.readline()
        record=extract.parse_state_line(raw)
        relevant=[r for r in sl if r['run_id']==fight['run_id'] and r['floor']==fight['floor']]
        closes=[r for r in ff if not r['is_combat']]
        inputs.append({'id':f"{fight['run_id']}-f{fight['floor']}-fight{fight['fight_no']}",
                       'fight':fight,'turn_resets':resets,'sl':relevant,
                       'first_attempt_last':first[-1], 'close':closes[0] if closes else None,
                       'state_source':{'path':'logs/states.jsonl','offset':start['off'],'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()},
                       'state':record['state']})
with gzip.open(OUT/'inputs.json.gz','wt',encoding='utf8') as f:
    json.dump(inputs,f,ensure_ascii=False,default=query.plain)
save('extraction.json',{'cohort_runs':len(cohort),'fights':len(fights),'frames':len(frames),'sl_records':len(sl),
                       'reset_fights':[r['id'] for r in inputs if r['turn_resets']],
                       'missing_opening':[r['id'] for r in inputs if r['state'].get('combat',{}).get('turn') not in (1,None)]})
print(json.dumps({'runs':len(cohort),'fights':len(fights),'frames':len(frames),'resets':[r['id'] for r in inputs if r['turn_resets']]}))
