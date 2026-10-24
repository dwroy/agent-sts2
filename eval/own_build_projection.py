"""Freeze allowlisted own-game data from existing immutable logdb shards (no sync)."""
import hashlib
import json
from pathlib import Path
import re

from sts2fun_build_projection import canonical, sha

SOURCES=('runs','states','decisions','run-config','run-plans','sl-attempts')
RUNS="""SELECT run_id,ascension,victory,floor,ended,code,death_fight FROM runs_raw
WHERE upper(character)='SILENT' AND run_id IS NOT NULL
QUALIFY row_number() OVER (PARTITION BY run_id ORDER BY off DESC)=1"""
QUERIES={
 'runs':RUNS,
 'snapshots':"""WITH s AS (SELECT run_id,off,len,ts,act,floor,screen,hp,max_hp,gold,boss_id,deck,relics,potions,go_victory,
   row_number() OVER w AS rn, row_number() OVER (PARTITION BY run_id,floor ORDER BY off DESC) AS last_floor,
   row_number() OVER (PARTITION BY run_id,floor ORDER BY off) AS first_floor,
   lag(list_sort(deck)) OVER w AS prev_deck, lag(list_sort(relics)) OVER w AS prev_relics
   FROM frames WHERE run_id IN (SELECT run_id FROM own_runs)
   WINDOW w AS (PARTITION BY run_id ORDER BY off))
 SELECT run_id,off,len,ts,act,floor,screen,hp,max_hp,gold,boss_id,deck,relics,potions,go_victory FROM s
 WHERE rn=1 OR first_floor=1 OR last_floor=1 OR list_sort(deck) IS DISTINCT FROM prev_deck OR list_sort(relics) IS DISTINCT FROM prev_relics
 ORDER BY run_id,off""",
 'fights':"""SELECT f.run_id,f.fight_no,f.act,f.floor,f.encounter,f.monsters,f.room,f.entry_hp,f.max_hp,f.last_hp,f.post_hp,
 f.turns,f.outcome,f.hp_loss,f.net_hp_loss,f.potions_in,f.potions_used,f.first_ts,f.last_ts,f.first_off,f.last_off,
 e.boss_id AS scheduled_boss_id,e.deck AS entry_deck,e.relics AS entry_relics,e.len AS entry_len
 FROM fights f LEFT JOIN frames e ON e.run_id=f.run_id AND e.off=f.first_off
 WHERE f.run_id IN (SELECT run_id FROM own_runs) ORDER BY f.run_id,f.first_off""",
 'questions':"""SELECT run_id,off,len,ts,floor,label,action,card_id,questions,options,chosen,choice,rationale,hp,max_hp,sl_attempt,sl_reloads
 FROM decisions WHERE run_id IN (SELECT run_id FROM own_runs) AND mode='play'
 AND label NOT LIKE 'combat/%' AND action NOT IN ('play_card','end_turn','use_potion') ORDER BY run_id,off""",
 'plans':"""SELECT run_id,off,len,ts,floor,trigger,archetype,summary,want,avoid FROM run_plans
 WHERE run_id IN (SELECT run_id FROM own_runs) ORDER BY run_id,off""",
 'sl':"""SELECT run_id,off,len,ts,act,floor,encounter,attempt,result,reload_ok,started_at,ended_at,end_hp
 FROM sl_attempts WHERE run_id IN (SELECT run_id FROM own_runs) ORDER BY run_id,off""",
 'configs':"""SELECT run_id,off,ts,code,brain_label,config_sha FROM run_config
 WHERE run_id IN (SELECT run_id FROM own_runs) ORDER BY run_id,off""",
}


def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return h.hexdigest()


def plain(value):
    if hasattr(value,'isoformat'):return value.isoformat()
    if isinstance(value,(list,tuple)):return [plain(x) for x in value]
    if isinstance(value,dict):return {k:plain(v) for k,v in value.items()}
    return value


def freeze(logdb,tools):
    """Read exact manifest-listed shards, pin SHA before/after, return safe selected rows."""
    import duckdb
    raw=(logdb/'manifest.json').read_bytes();manifest=json.loads(raw);pins=[];by_table={}
    for source in SOURCES:
        entry=manifest['sources'][source];table=entry['table'];paths=[]
        if not re.fullmatch(r'[a-z_]+',table):raise ValueError('invalid source table')
        for name in entry['shards'] or ['part-0-empty.parquet']:
            if Path(name).name!=name:raise ValueError('nonlocal shard path')
            path=logdb/table/name;stat=path.stat();checksum=digest(path)
            pins.append({'path':str(Path(table)/name),'bytes':stat.st_size,'mtime_ns':stat.st_mtime_ns,'sha256':checksum})
            paths.append(str(path.resolve()))
        by_table[table]=paths
    con=duckdb.connect(config={'threads':1,'memory_limit':'512MB'})
    try:
        for table,paths in by_table.items():
            quoted=','.join("'"+p.replace("'","''")+"'" for p in paths)
            con.execute('CREATE VIEW '+table+' AS SELECT * FROM read_parquet(['+quoted+'],union_by_name=true)')
        views=(tools/'views.sql').read_text()
        # Reuse the existing room/fight definitions, bound to frozen own shards.
        con.execute(views[views.index('CREATE OR REPLACE VIEW map_choices AS'):views.index('-- ---------------------------------------------------------------- turns')])
        con.execute('CREATE VIEW own_runs AS '+RUNS)
        data={}
        for name,sql in QUERIES.items():
            cursor=con.execute(sql);columns=[x[0] for x in cursor.description]
            data[name]=[dict(zip(columns,plain(row))) for row in cursor.fetchall()]
    finally:con.close()
    for pin in pins:
        path=logdb/pin['path'];stat=path.stat()
        if stat.st_size!=pin['bytes'] or stat.st_mtime_ns!=pin['mtime_ns'] or digest(path)!=pin['sha256']:
            raise ValueError('immutable source shard changed: '+pin['path'])
    receipt={'source':'self:agent-sts2','logdb_manifest_sha256':sha(raw),'sources':{s:manifest['sources'][s] for s in SOURCES},
             'shards':pins,'duckdb_version':duckdb.__version__,'views_sha256':sha((tools/'views.sql').read_bytes()),
             'query_sha256':sha(canonical(QUERIES)),'projection_code_sha256':sha(Path(__file__).read_bytes()),
             'schema_limits':['游戏build/version未在这些日志库列中记录，保持unknown。','战斗结果与资源沿原logdb视图定义，不等于逐次SL尝试；SL触及战斗另标。','状态只记录决策点；first combat frame不是动作执行前的原子入场快照。']}
    return data,receipt
