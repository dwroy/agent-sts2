"""Add first actionable openings and retain first-attempt observed outcomes."""
import gzip, hashlib, json, pathlib, sys
ROOT=pathlib.Path('/home/dw/Projects/agent-sts2')
OUT=pathlib.Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'agent/tools/logdb'))
import extract
rows=json.load(gzip.open(OUT/'inputs.json.gz','rt'))
frames=json.load(open(OUT/'compact-frames.json'))
with open(ROOT/'logs/states.jsonl','rb') as handle:
    for row in rows:
        fight=row['fight']
        boundary=row['turn_resets'][0] if row['turn_resets'] else float('inf')
        ff=[r for r in frames if r['run_id']==fight['run_id'] and r['fight_no']==fight['fight_no'] and r['is_combat'] and r['off']<boundary]
        ready=next((r for r in ff if r['turn']==1 and r['energy'] and r['cards_played']==0),None)
        if ready:
            handle.seek(ready['off']); raw=handle.readline()
            row['ready_state']=extract.parse_state_line(raw)['state']
            row['ready_source']={'path':'logs/states.jsonl','offset':ready['off'],'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
        hp=[r['player_hp'] for r in ff if r['player_hp'] is not None]
        decreases=sum(max(0,a-b) for a,b in zip(hp,hp[1:]))
        heals=sum(max(0,b-a) for a,b in zip(hp,hp[1:]))
        censored=bool(row['turn_resets'])
        died=fight['outcome']=='died' and not censored
        # Last combat frames may precede lethal damage. The terminal death supplies zero HP.
        if died and hp[-1]>0: decreases+=hp[-1]
        row['observed']={'censored_first_attempt':censored,'outcome':'predicted_death_reload' if censored else fight['outcome'],
            'entry_hp':fight['entry_hp'],'turns':max(r['turn'] or 0 for r in ff),
            'net_hp_loss':None if censored else fight['hp_loss'],
            'sampled_combat_hp_decreases':decreases,'sampled_healing':heals,
            'potions_used':fight['potions_used'],'first_attempt_end_hp':hp[-1]}
with gzip.open(OUT/'prepared-inputs.json.gz','wt') as f: json.dump(rows,f,ensure_ascii=False)
data=(ROOT/'.worktrees/live/data/game-data.json').read_bytes()
with gzip.open(OUT/'game-data.json.gz','wb') as f:f.write(data)
(OUT/'game-data-source.json').write_text(json.dumps({'path':'.worktrees/live/data/game-data.json','sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)},indent=2)+'\n')
print(json.dumps({'fights':len(rows),'ready':sum('ready_state' in r for r in rows),'censored':sum(r['observed']['censored_first_attempt'] for r in rows)}))
