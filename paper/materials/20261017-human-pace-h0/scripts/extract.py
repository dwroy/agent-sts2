"""Read ended Silent attempts within frozen byte cuts; retain bounded diagnostic frames."""
import collections
import hashlib
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
OUT=Path(__file__).resolve().parent
WORK=OUT.parents[2]
ROOT=Path('/home/dw/Projects/agent-sts2')
FROZEN=WORK/'paper/materials/20261017-human-pace-h0/inputs-r1'
sys.path.insert(0,str(WORK/'agent/tools/boss-sim'))
import character_extract as ce
from trust import BOSS_KEYS
sys.path.insert(0,str(WORK/'agent/tools/logdb'))
import query
import sync
TARGETS=['TEST_SUBJECT','AEONGLASS','QUEEN','KAISER_CRAB','KNOWLEDGE_DEMON','THE_INSATIABLE']


def digest(raw):return hashlib.sha256(raw).hexdigest()
def save(name,data): (OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')


def main():
    bounds={r['path']:r for r in json.loads((FROZEN/'log-source-bounds.json').read_text())}
    sl_index=json.loads((ROOT/'paper/materials/20261017-human-pace-h0/existing-sl-source-index.json').read_text())
    cuts={p:r['size_cut'] for p,r in bounds.items() if 'size_cut' in r}
    cuts[sl_index['path']]=sl_index['size_cut']
    tails=[]
    for path,b in bounds.items():
        if 'tail_sha256' not in b:continue
        with (ROOT/path).open('rb') as h:h.seek(b['tail_offset']);raw=h.read(b['tail_bytes'])
        assert digest(raw)==b['tail_sha256'],path
        tails.append({'path':path,'offset':b['tail_offset'],'len':len(raw),'sha256':digest(raw),'claim':'frozen tail only'})
    save('frozen-tail-readback.json',tails)
    records={}; selected_lines=[]
    for name in ['logs/runs.jsonl','logs/sl-attempts.jsonl','logs/run-config.jsonl']:
        rows=[];off=0
        with (ROOT/name).open('rb') as h:
            while off<cuts[name]:
                raw=h.readline(cuts[name]-off)
                if not raw.endswith(b'\n'):break
                r=json.loads(raw);rows.append(r)
                if name=='logs/runs.jsonl' and r.get('character')=='SILENT' and r.get('ended'):
                    selected_lines.append({'path':str(ROOT/name),'offset':off,'len':len(raw),'sha256':digest(raw),'row':r})
                off+=len(raw)
        records[name]=rows
    runs=ce.finished_runs(records['logs/runs.jsonl'],'silent',range(11))
    attempts=[r for r in records['logs/sl-attempts.jsonl'] if r.get('run_id') in runs and r.get('fight_kind')=='boss']
    with sync.read_lock(str(ROOT/'data/logdb'),shared=True):
        con=query.connect(str(ROOT/'data/logdb'),threads=1)
        c=con.execute('SELECT off,len,ts,run_id,character,act,floor,turn,screen,in_combat,enemies,player_hp,hp,max_hp,observed,incoming FROM frames WHERE run_id IN (SELECT unnest(?::VARCHAR[])) AND off+len <= ? ORDER BY run_id,off',[list(runs),cuts['logs/states.jsonl']])
        names=[r[0] for r in c.description];frames=[dict(zip(names,r)) for r in c.fetchall()];con.close()
    groups=ce.attempt_frames(frames,attempts)
    trust=json.loads((FROZEN/'live-boss-trust.json').read_text()); tune=set(trust['split']['tune']);val=set(trust['split']['val'])
    configs={r.get('run_id'):r for r in records['logs/run-config.jsonl']}
    manifest=[];indexed={}
    for mine,event in groups:
        if not mine:continue
        first=mine[0];enc=ce.boss_encounter(first);boss=BOSS_KEYS.get(enc)
        if boss not in TARGETS:continue
        run=runs[first['run_id']];attempt=event.get('attempt') if event else None
        key=f"{first['run_id']}:{first['floor']}:{attempt}:{first['off']}"
        row={'key':key,'run':first['run_id'],'asc':run['ascension'],'act':first['act'],'floor':first['floor'],'boss':boss,'encounter':enc,'attempt':attempt,
             'outcome':event.get('result') if event else None,'sl':event,'run_ended':run['ended'],'run_code':run.get('code'),
             'first_off':first['off'],'last_off':mine[-1]['off'],'turns':max(f.get('turn') or 0 for f in mine),'frames':len(mine),'split':'tune' if key in tune else 'val' if key in val else 'new-unfitted',
             'character_mismatch':any(f['character']!='SILENT' for f in mine)}
        assert not row['character_mismatch']
        manifest.append(row);indexed[key]=mine
    (OUT/'attempts.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False,default=str)+'\n' for r in manifest))
    selected=[]
    for boss in TARGETS:
        mine=[r for r in manifest if r['boss']==boss and r['outcome'] in ['won','died']]
        picks=[];used=set()
        # Fixed chronological selections across old tuning and later code, outcomes kept separate.
        for pool in [[r for r in mine if r['split']=='tune'],[r for r in mine if r['asc']==10 and r['outcome']=='won'],[r for r in mine if r['split']=='val' and r['outcome']=='died'],list(reversed(mine))]:
            item=next((r for r in pool if r['run'] not in used),None)
            if item:picks.append(item);used.add(item['run'])
        selected.extend(picks)
    frame_refs=[];turns=[]
    (OUT/'raw').mkdir(exist_ok=True)
    with (ROOT/'logs/states.jsonl').open('rb') as h:
        for fight in selected:
            mine=indexed[fight['key']];by_turn=collections.defaultdict(list)
            for f in mine:
                if f.get('turn'):by_turn[f['turn']].append(f)
            kept={}
            for turn,fs in sorted(by_turn.items()):
                # First and last indexed snapshots preserve observed start/end; exact end-turn command joins follow.
                for label,frame in [('start',fs[0]),('last',fs[-1])]:
                    off=frame['off'];h.seek(off);raw=h.read(frame['len']);d=json.loads(raw);s=d['state'];r=s.get('run') or {}
                    assert r.get('character_id')=='SILENT' and r.get('ascension')==fight['asc'];assert off+len(raw)<=cuts['logs/states.jsonl']
                    path=OUT/'raw'/f"{fight['run']}-F{fight['floor']}-a{fight['attempt']}-T{turn}-{label}.json";path.write_bytes(raw)
                    ref={'fight_key':fight['key'],'run':fight['run'],'boss':fight['boss'],'asc':fight['asc'],'floor':fight['floor'],'attempt':fight['attempt'],'turn':turn,'label':label,'path':str(ROOT/'logs/states.jsonl'),'offset':off,'len':len(raw),'sha256':digest(raw),'frozen_path':str(path)}
                    frame_refs.append(ref);kept[(turn,label)]=ref
                    combat=s.get('combat') or {};p=combat.get('player') or {}
                    turns.append({**{k:ref[k] for k in ['fight_key','run','boss','asc','floor','attempt','turn','label','offset']},'ts':d.get('ts'),'in_combat':s.get('in_combat'),'hp':p.get('current_hp'),'block':p.get('block'),'energy':p.get('energy'),'player_powers':p.get('powers'),
                                  'enemies':[{k:e.get(k) for k in ['index','enemy_id','current_hp','max_hp','block','move_id','powers','intents']} for e in combat.get('enemies',[])]})
    save('selected-fights.json',selected);save('raw-frame-manifest.json',frame_refs);save('turn-trajectories.json',turns)
    wanted={r['run'] for r in selected};save('run-source-rows.json',[r for r in selected_lines if r['row']['run_id'] in wanted]);save('run-config-selected.json',{r:configs.get(r) for r in sorted(wanted)})
    summary={'ended_silent_runs':len(runs),'frozen_end_cut':max(r['ended'] for r in runs.values()),'target_attempts':len(manifest),'selected_diagnostic_fights':len(selected),'raw_frames':len(frame_refs),'raw_bytes':sum(r['len'] for r in frame_refs),
             'per_boss':{b:{'attempts':sum(r['boss']==b for r in manifest),'independent_runs':len({r['run'] for r in manifest if r['boss']==b}),'outcomes':dict(collections.Counter(r['outcome'] for r in manifest if r['boss']==b))} for b in TARGETS},
             'cuts':cuts,'sl_source_index':sl_index,'simulation_or_model_api_calls':0,'limits':'First/last indexed endpoints, not certified end-turn settlement; censored SL only mechanism evidence, never an actual-outcome label. Selection is diagnosis, not a redefined calibration split.'}
    save('extraction-summary.json',summary);print(json.dumps(summary,ensure_ascii=False))


if __name__=='__main__':main()
