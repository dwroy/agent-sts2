"""Compare immutable preserved SQLite backups; never open a production writer."""
import argparse
import hashlib
import json
import sqlite3
from pathlib import Path


def sha(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for part in iter(lambda: stream.read(1 << 20), b''):
            h.update(part)
    return h.hexdigest()


def connect(path):
    db = sqlite3.connect(path.resolve().as_uri() + '?mode=ro&immutable=1', uri=True)
    db.execute('PRAGMA query_only=ON')
    db.execute('PRAGMA temp_store=MEMORY')
    return db


def quoted(name):
    return '"' + name.replace('"', '""') + '"'


def rows(db, table):
    columns = db.execute('PRAGMA table_info(' + quoted(table) + ')').fetchall()
    order = ','.join(quoted(c[1]) for c in columns)
    return db.execute('SELECT * FROM ' + quoted(table) + ' ORDER BY ' + order)


def table_hash(db, name):
    digest, count = hashlib.sha256(), 0
    for row in rows(db, name):
        line = json.dumps(list(row), ensure_ascii=False, separators=(',', ':'),
                          default=lambda b: {'blob_hex': b.hex()}).encode()
        digest.update(str(len(line)).encode() + b':' + line)
        count += 1
    return {'rows': count, 'sha256': digest.hexdigest()}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('before', type=Path)
    parser.add_argument('after', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    before_hash, after_hash = sha(args.before), sha(args.after)
    before, after = connect(args.before), connect(args.after)
    try:
        names = lambda db: [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")]
        assert names(before) == names(after), 'table membership changed'
        tables = {name: {'before': table_hash(before, name), 'after': table_hash(after, name)} for name in names(before)}
        changed = [name for name, v in tables.items() if v['before'] != v['after']]
        bindings = lambda db: {row[0]: list(row) for row in rows(db, 'run_bindings')}
        old, new = bindings(before), bindings(after)
        removed = [k for k in old if k not in new]
        rewritten = [k for k in old if k in new and old[k] != new[k]]
        added = [new[k] for k in new if k not in old]
        columns = lambda db: [list(r) for r in db.execute('PRAGMA table_info(strategy_details)')]
        metadata = lambda db: dict(db.execute('SELECT key,value FROM metadata'))
        schema = lambda db: {(r[0], r[1]): list(r) for r in db.execute('SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name')}
        old_schema, new_schema = schema(before), schema(after)
        schema_changes = [{'identity': list(k), 'before': old_schema.get(k), 'after': new_schema.get(k)}
                          for k in sorted(old_schema.keys() | new_schema.keys()) if old_schema.get(k) != new_schema.get(k)]
        assert [r['identity'] for r in schema_changes] == [['table', 'strategy_details']]
        assert changed == ['metadata', 'run_bindings'], changed
        assert not removed and not rewritten and len(added) == 6
        assert metadata(before)['schema'] == '4' and metadata(after)['schema'] == '5'
        assert metadata(before)['current'] == metadata(after)['current']
        assert before.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        assert after.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        result = {'schema': 'issue85-preserved-schema-reconciliation-v1',
                  'inputs': {'before': {'path': str(args.before), 'bytes': args.before.stat().st_size, 'sha256': before_hash},
                             'after': {'path': str(args.after), 'bytes': args.after.stat().st_size, 'sha256': after_hash}},
                  'read_only': True, 'tables': tables, 'logical_tables_changed': changed,
                  'schema_objects_changed': schema_changes,
                  'metadata': {'before': metadata(before), 'after': metadata(after)},
                  'strategy_details_columns': {'before': columns(before), 'after': columns(after)},
                  'bindings': {'before': len(old), 'after': len(new), 'removed': removed, 'rewritten': rewritten,
                               'columns': ['run_id', 'version', 'code', 'created'], 'added': added},
                  'null_confidence_rows': {'before': before.execute('SELECT count(*) FROM strategy_details WHERE confidence IS NULL').fetchone()[0],
                                           'after': after.execute('SELECT count(*) FROM strategy_details WHERE confidence IS NULL').fetchone()[0]},
                  'integrity': {'before': 'ok', 'after': 'ok'}, 'no_restore': True}
        assert sha(args.before) == before_hash and sha(args.after) == after_hash
        result['input_bytes_unchanged'] = True
        with args.output.open('x') as stream:
            stream.write(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
        print(json.dumps({'tables': len(tables), 'changed': changed, 'added_bindings': len(added), 'unchanged_inputs': True}))
    finally:
        before.close()
        after.close()


if __name__ == '__main__':
    main()
