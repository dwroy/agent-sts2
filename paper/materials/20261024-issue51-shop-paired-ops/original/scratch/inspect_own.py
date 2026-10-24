import json,pathlib,duckdb
R=pathlib.Path('/home/dw/Projects/agent-sts2');W=pathlib.Path.cwd();S=pathlib.Path(__file__).parent
scope=json.load(open(W/'paper/materials/20261024-issue51-own-fallback-ops/own-506-scope.json'))
c=duckdb.connect(':memory:',config={'threads':2,'memory_limit':'768MB'})
c.execute('create table allowed(run_id varchar)');c.executemany('insert into allowed values (?)',[(r['run_id'],) for r in scope['runs']])
for table in sorted(set(x['table'] for x in scope['verified_read_only_shards'])):
 paths=[str(R/x['path']) for x in scope['verified_read_only_shards'] if x['table']==table]
 c.execute(f'create view {table} as select p.* from read_parquet(?,union_by_name=true) p join allowed using(run_id)',[paths]) if False else None
 q=','.join("'"+p.replace("'","''")+"'" for p in paths)
 c.execute(f'create view {table} as select p.* from read_parquet([{q}],union_by_name=true) p join allowed using(run_id)')
 print(table,c.execute('describe '+table).fetchall())
print('shop labels',c.execute("select label,action,count(*),count(distinct run_id) from decisions where label like '%shop%' group by all order by count(*) desc").fetchall())
cur=c.execute("select * from decisions where label like '%shop%' order by off limit 3"); cols=[x[0] for x in cur.description];print('examples',json.dumps([dict(zip(cols,row)) for row in cur.fetchall()],ensure_ascii=False,default=str))
