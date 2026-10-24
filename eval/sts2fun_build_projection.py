"""Allowlisted SQLite JSON projection for #54; no player/seed/run identifiers."""
import collections as C
import hashlib
import json
from pathlib import Path
import re
import sqlite3

VERSIONS = tuple('v0.' + str(n) for n in range(107, 112))
FILTER = "r.character='SILENT' AND r.ascension=10 AND r.n_players=1 AND r.is_valid=1 AND r.was_abandoned=0 AND r.has_modifiers=0"
ID = re.compile(r'(?:CARD[.]|RELIC[.])?[A-Z][A-Z0-9_]*')


def canonical(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)+'\n').encode()


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def card_id(value):
    return value.removeprefix('CARD.').removeprefix('RELIC.') if isinstance(value,str) and ID.fullmatch(value) else None


def id_array(path):
    return "(SELECT json_group_array(CASE WHEN x.type='text' THEN x.value ELSE json_extract(x.value,'$.id') END) FROM json_each(p.value,'"+path+"') x)"


DECK = "(SELECT json_group_array(json_object('id',json_extract(x.value,'$.id'),'added',json_extract(x.value,'$.floor_added_to_deck'))) FROM json_each(r.raw_json,'$.players[0].deck') x)"
RELICS = DECK.replace('$.players[0].deck','$.players[0].relics')
POINTS = """(SELECT json_group_array(json_object(
 'act',CAST(a.key AS INTEGER)+1,'point',CAST(p.key AS INTEGER)+1,
 'stats_n',json_array_length(p.value,'$.player_stats'),
 'hp',json_extract(p.value,'$.player_stats[0].current_hp'),
 'max_hp',json_extract(p.value,'$.player_stats[0].max_hp'),
 'damage',json_extract(p.value,'$.player_stats[0].damage_taken'),
 'healed',json_extract(p.value,'$.player_stats[0].hp_healed'),
 'gold_spent',json_extract(p.value,'$.player_stats[0].gold_spent'),
 'rooms',json((SELECT json_group_array(json_object('kind',json_extract(x.value,'$.room_type'),
   'id',json_extract(x.value,'$.model_id'),'turns',json_extract(x.value,'$.turns_taken')))
   FROM json_each(p.value,'$.rooms') x)),
 'choices',json((SELECT json_group_array(json_object('id',json_extract(x.value,'$.card.id'),
   'picked',json_extract(x.value,'$.was_picked'))) FROM json_each(p.value,'$.player_stats[0].card_choices') x)),
 'gained',json(GAINED),'removed',json(REMOVED),'upgraded',json(UPGRADED),
 'transformed',json((SELECT json_group_array(json_object('old',json_extract(x.value,'$.original_card.id'),
   'new',json_extract(x.value,'$.final_card.id'))) FROM json_each(p.value,'$.player_stats[0].cards_transformed') x)),
 'relic_picks',json((SELECT json_group_array(json_extract(x.value,'$.choice')) FROM json_each(p.value,'$.player_stats[0].relic_choices') x
    WHERE json_extract(x.value,'$.was_picked')=1)),
 'bought_relics',json(BOUGHT_RELICS),'removed_relics',json(REMOVED_RELICS)))
 FROM json_each(r.raw_json,'$.map_point_history') a JOIN json_each(a.value) p)"""
for token,path in [('GAINED','cards_gained'),('REMOVED','cards_removed'),('UPGRADED','upgraded_cards'),
                   ('BOUGHT_RELICS','bought_relics'),('REMOVED_RELICS','relics_removed')]:
    POINTS = POINTS.replace('json('+token+')', 'json('+id_array('$.player_stats[0].'+path)+')')
SQL = 'SELECT r.patch_major,r.win,json_extract(r.raw_json,\'$.build_id\'),'+DECK+','+RELICS+','+POINTS+' FROM runs r WHERE '+FILTER+' AND r.patch_major IN ('+','.join('?' for _ in VERSIONS)+')'
COLUMNS = {'patch_major','win','raw_json','character','ascension','n_players','is_valid','was_abandoned','has_modifiers'}


def connect(path):
    con = sqlite3.connect(Path(path).resolve().as_uri()+'?mode=ro',uri=True)
    con.execute('PRAGMA query_only=ON'); con.execute('PRAGMA cache_size=-16384'); con.execute('PRAGMA mmap_size=0')
    con.execute("SELECT value FROM json_each('[]')").fetchall()
    def authorize(action,table,column,db,trigger):
        if action == sqlite3.SQLITE_READ:
            return sqlite3.SQLITE_OK if (table=='runs' and column in COLUMNS) or (table=='json_each' and column in ('key','value','type')) else sqlite3.SQLITE_DENY
        if action in (sqlite3.SQLITE_SELECT,sqlite3.SQLITE_FUNCTION): return sqlite3.SQLITE_OK
        return sqlite3.SQLITE_DENY
    con.set_authorizer(authorize)
    return con


def project(db):
    audit = C.Counter(); runs = []
    con = connect(db)
    try:
        for version,win,build,deck,relics,points in con.execute(SQL,VERSIONS):
            audit['selected'] += 1
            if win not in (0,1): audit['unknown_outcome_excluded'] += 1; continue
            cards = []
            for item in json.loads(deck):
                ident = card_id(item['id'])
                if ident: cards.append({'id':ident,'added':item['added'] if type(item['added']) is int else None})
                else: audit['invalid_final_card_ids'] += 1
            if not cards: audit['empty_final_deck_excluded'] += 1; continue
            final_relics=[]
            for item in json.loads(relics):
                ident=card_id(item['id'])
                if ident: final_relics.append({'id':ident,'added':item['added'] if type(item['added']) is int else None})
            timeline=[]
            for point in sorted(json.loads(points),key=lambda p:(p['act'],p['point'])):
                point['node']=len(timeline)+1
                if point.pop('stats_n') != 1:
                    audit['non_solo_node'] += 1
                    point.update(hp=None,max_hp=None,damage=None,healed=None,gold_spent=None,choices=[],gained=[],removed=[],upgraded=[],transformed=[],relic_picks=[],bought_relics=[],removed_relics=[])
                    point['partial']=True
                for key in ('gained','removed','upgraded','relic_picks','bought_relics','removed_relics'):
                    point[key]=[card_id(c) for c in point[key] if card_id(c)]
                point['choices']=[{'id':card_id(c['id']),'picked':c['picked']==1} for c in point['choices'] if card_id(c['id']) and c['picked'] in (0,1)]
                point['transformed']=[{'old':card_id(c['old']),'new':card_id(c['new'])} for c in point['transformed']]
                timeline.append(point)
            row={'version':version,'build':build,'win':int(win),'deck':sorted(cards,key=lambda c:(c['id'],c['added'] if c['added'] is not None else -1)),
                 'relics':sorted(final_relics,key=lambda c:(c['id'],c['added'] if c['added'] is not None else -1)),'nodes':timeline}
            row['content_sha256']=sha(canonical(row))
            runs.append(row)
    finally: con.close()
    runs.sort(key=lambda r:r['content_sha256'])
    audit['included']=len(runs)
    return runs,dict(audit)
