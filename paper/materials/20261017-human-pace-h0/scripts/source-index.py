"""Hash raw turn endpoint sources for every target attempt; retain logs in place, no unbounded copy."""
import collections
import hashlib
import json
from pathlib import Path
import sys

sys.dont_write_bytecode=True
OUT=Path(__file__).resolve().parent
ROOT=Path('/home/dw/Projects/agent-sts2')
WORK=OUT.parents[2]
sys.path.insert(0,str(WORK/'agent/tools/logdb'))
import query
import sync

def main():
    fights=[json.loads(l) for l in (OUT/'attempts.jsonl').open()]
    runs=sorted({r['run'] for r in fights});cut=json.loads((OUT/'extraction-summary.json').read_text())['cuts']['logs/states.jsonl']
    with sync.read_lock(str(ROOT/'data/logdb'),shared=True):
        con=query.connect(str(ROOT/'data/logdb'),threads=1)
        rows=con.execute('SELECT off,len,run_id,floor,turn,ts,character FROM frames WHERE run_id IN (SELECT unnest(?::VARCHAR[])) AND off+len<=? ORDER BY off',[runs,cut]).fetchall();con.close()
    by_room=collections.defaultdict(list)
    for r in rows:by_room[(r[2],r[3])].append(r)
    stats=collections.Counter();bytes_read=0
    with (ROOT/'logs/states.jsonl').open('rb') as raw,(OUT/'all-target-frame-sources.jsonl').open('w') as result:
        for fight in fights:
            by_turn=collections.defaultdict(list)
            for row in by_room[(fight['run'],fight['floor'])]:
                if fight['first_off']<=row[0]<=fight['last_off'] and row[4]:by_turn[row[4]].append(row)
            for turn,frames in sorted(by_turn.items()):
                for label,r in [('start',frames[0]),('last',frames[-1])]:
                    assert r[6]=='SILENT'
                    raw.seek(r[0]);line=raw.read(r[1]);state=json.loads(line)['state'];assert state['run']['character_id']=='SILENT';assert state['run']['ascension']==fight['asc']
                    item={k:fight[k] for k in ['key','run','boss','asc','floor','attempt','outcome','split','run_code','run_ended']}
                    item.update({'turn':turn,'endpoint':label,'ts':str(r[5]),'path':str(ROOT/'logs/states.jsonl'),'offset':r[0],'len':r[1],'sha256':hashlib.sha256(line).hexdigest()})
                    result.write(json.dumps(item,ensure_ascii=False)+'\n');stats[fight['boss']]+=1;bytes_read+=len(line)
    receipt={'target_attempts':len(fights),'ended_silent_runs_with_targets':len(runs),'endpoint_refs':sum(stats.values()),'by_boss':dict(stats),'bytes_hashed':bytes_read,'raw_copy_policy':'Raw logs remain read-only in place; exact byte ranges and SHA retained. Selected diagnostic command/pre/next raw bytes separately frozen.','scope':'Includes actual-outcome and censored SL identities; no independent-run denominator expansion; no new simulation.'}
    (OUT/'all-target-source-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))

if __name__=='__main__':main()
