"""Run the original sandbox stages without the extra npm/temp-wrapper processes."""
import hashlib,json,os,re,sys
from pathlib import Path
root=Path(__file__).resolve().parents[3]
node=Path.home()/'.local/node/bin/node'
script=(root/'agent/tools/test-sandbox.sh').read_bytes()
stage=sys.argv[1]
os.environ['PATH']=str(node.parent)+':'+os.environ.get('PATH','')
os.environ['npm_config_offline']='true'
os.environ.pop('CHARACTER',None)
if stage=='tsc':
 argv=[str(node), 'node_modules/typescript/bin/tsc','-p','tsconfig.json','--noEmit']
elif stage=='paths':
 argv=[str(node),'node_modules/vitest/vitest.mjs','run','tests/paths.test.ts','--pool=forks','--maxWorkers=1']
elif stage=='threads':
 excludes=re.findall(r'--exclude ([^\s\\]+)',script.decode())
 argv=[str(node),'node_modules/vitest/vitest.mjs','run','--pool=threads','--maxWorkers=1']
 for name in excludes: argv += ['--exclude',name]
else: raise SystemExit('unknown stage')
(Path(__file__).parent/(stage+'-command.json')).write_text(json.dumps({'sandbox_script_sha256':hashlib.sha256(script).hexdigest(),'stage':stage,'argv':argv,'cwd':str(root/'agent'),'workers':1},indent=2)+'\n')
os.chdir(root/'agent')
os.execv(str(node),argv)
