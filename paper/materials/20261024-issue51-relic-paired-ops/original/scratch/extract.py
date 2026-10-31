import collections
import datetime
import hashlib
import json
import pathlib

import duckdb

W = pathlib.Path(__file__).resolve().parents[4]
ROOT = pathlib.Path('/home/dw/Projects/agent-sts2')
OUT = pathlib.Path(__file__).parent
SCOPE = json.loads((W / 'paper/materials/20261024-issue51-own-fallback-ops/own-506-scope.json').read_text())
RUNS = {r['run_id']: r for r in SCOPE['runs']}


def dump(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2, default=str) + '\n')


def connect():
    c = duckdb.connect(':memory:', config={'threads': 2, 'memory_limit': '512MB'})
    c.execute('CREATE TEMP TABLE eligible(run_id VARCHAR)')
    c.executemany('INSERT INTO eligible VALUES (?)', [(r,) for r in RUNS])
    for table in ['decisions', 'frames']:
        pins = [p for p in SCOPE['verified_read_only_shards'] if p['table'] == table]
        paths = ','.join("'" + str(ROOT / p['path']).replace("'", "''") + "'" for p in pins)
        limit = pins[0]['raw_offset_limit']
        c.execute(f'CREATE TEMP VIEW {table}_eligible AS SELECT p.* FROM read_parquet([{paths}],union_by_name=true) p JOIN eligible e USING(run_id) WHERE off+len<={limit}')
    return c


def rows(c, sql):
    result = c.execute(sql)
    return [dict(zip([x[0] for x in result.description], r)) for r in result.fetchall()]


SEEKS = []


def seek(stream, row):
    pin = SCOPE['raw_stream_cutoffs'][stream]
    assert row['off'] >= 0 and row['off'] + row['len'] <= pin['max_bytes']
    with (ROOT / pin['path']).open('rb') as f:
        f.seek(row['off'])
        raw = f.read(row['len'])
    assert len(raw) == row['len']
    SEEKS.append({'stream': stream, 'path': pin['path'], 'offset': row['off'], 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(), 'cutoff': pin['max_bytes']})
    return json.loads(raw)


def projected_state(row):
    raw = seek('states', row)
    st = raw['state']
    r = st.get('run') or {}
    return {'ref': SEEKS[-1], 'ts': raw['ts'], 'screen': st['screen'], 'run_id': r.get('run_id', st.get('run_id')), 'floor': r.get('floor'), 'act_id': r.get('act_id'),
            'hp': r.get('current_hp', r.get('hp')), 'max_hp': r.get('max_hp'), 'gold': r.get('gold'),
            'deck': r.get('deck'), 'relics': r.get('relics'), 'potions': r.get('potions'),
            'shop': st.get('shop'), 'chest': st.get('chest'), 'event': st.get('event'), 'selection': st.get('selection'), 'rest': st.get('rest')}


if __name__ == '__main__':
    c = connect()
    ds = rows(c, "SELECT run_id,off,len,ts,floor,label,action,chosen,choice,options,questions,rationale,hp,max_hp,gold,decider,result FROM decisions_eligible WHERE mode='play' AND (action='buy_relic' OR label='chest/relic' OR (action='choose_event_option' AND (list_aggr(options,'string_agg') ILIKE '%relic%' OR list_aggr(options,'string_agg') LIKE '%遗物%'))) ORDER BY off")
    dump('decision-index.json', ds)
    print('decision counts', collections.Counter(d['action'] for d in ds))
    for d in ds:
        if d['action'] != 'buy_relic':
            continue
        print(d['run_id'], d['floor'], d['off'], d['choice'], d['chosen'], str(d['rationale'])[:200], str(d['options'])[:450])
    dump('query-receipt.json', {'threads': 2, 'database': ':memory:', 'filter_first': len(RUNS), 'cutoffs': SCOPE['raw_stream_cutoffs'], 'version': 'unknown', 'selection': 'buy_relic/chest-relic/explicit relic event option, frozen506 only'})
    c.close()
