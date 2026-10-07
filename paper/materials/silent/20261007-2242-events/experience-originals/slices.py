import json
import os
import re
import statistics
import subprocess
import sys
from pathlib import Path

OUT = Path(__file__).parent
AGENT = Path('/home/dw/Projects/agent-sts2/.worktrees/exp/agent')
phase = sys.argv[1]
root=OUT / ('slice-knowledge-'+phase)
(root/'characters/silent').mkdir(parents=True,exist_ok=True)
source=AGENT.parent/'knowledge' if phase=='before' else OUT/'slice-knowledge-before'
import shutil
shutil.copytree(source/'common',root/'common',dirs_exist_ok=True)
shutil.copytree(source/'characters/silent',root/'characters/silent',dirs_exist_ok=True)
if phase=='before': shutil.copyfile(OUT/'experience-before.json',root/'characters/silent/experience.json')
else: shutil.copyfile(AGENT.parent/'knowledge/characters/silent/experience.json',root/'characters/silent/experience.json')
env = dict(os.environ, CHARACTER='silent', KNOWLEDGE_ROOT=str(root), TMPDIR=str(OUT), NODE_COMPILE_CACHE=str(OUT / 'node-compile-cache'), PATH=str(Path.home() / '.local/node/bin') + ':' + os.environ['PATH'])
wrapper=OUT / ('slice-'+phase+'.mts')
wrapper.write_text('import { readFileSync } from "node:fs";\nimport { setExperienceForTests } from '+repr(str(AGENT/'src/knowledge/experience.ts'))+';\nsetExperienceForTests(JSON.parse(readFileSync('+repr(str(root/'characters/silent/experience.json'))+', "utf8")).entries, JSON.parse(readFileSync('+repr(str(root/'characters/silent/outcome-stats.json'))+', "utf8")));\nawait import('+repr(str(AGENT/'tools/knowledge-slice.ts'))+');\n')
rows = []
for sample in sorted(OUT.glob('sample-*.jsonl')):
    result = subprocess.run(['nice', '-n', '19', 'node', '--import', 'tsx', str(wrapper), str(sample)], cwd=AGENT, env=env, text=True, capture_output=True)
    (OUT / f'slice-{phase}-{sample.stem}.txt').write_text(result.stdout + result.stderr)
    if result.returncode:
        raise RuntimeError(result.stderr)
    sizes = [int(x) for x in re.findall(r'=== .*: \d+ lessons, \d+ stats rows, (\d+) chars', result.stdout)]
    assert len(sizes) == 20
    rows.append({'sample': sample.stem, 'n': len(sizes), 'median': statistics.median(sizes), 'max': max(sizes), 'sizes': sizes})
(OUT / f'slice-{phase}.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
print(json.dumps([{k:v for k,v in r.items() if k != 'sizes'} for r in rows], ensure_ascii=False))
