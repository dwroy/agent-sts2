"""Respect the existing rollout import boundary by moving the identical pure helper into its adapter."""
import hashlib
import json
from pathlib import Path

OUT=Path(__file__).resolve().parent
WORK=OUT.parents[2]

def sha(raw):return hashlib.sha256(raw).hexdigest()

def main():
    assert (OUT/'source-sandbox.exit').read_text().strip()=='1'
    assert json.loads((OUT/'test-history-restored.json').read_text())['restored']
    helper=WORK/'agent/src/reflex/silent-boss-weak.ts';live=WORK/'agent/src/reflex/rollout-live.ts';test=WORK/'agent/tests/silent-boss-weak.test.ts'
    source=helper.read_bytes();body=source.split(b'\n\n',1)[1]
    old=live.read_bytes();import_line=b'import { withObservedSilentBossWeak } from "./silent-boss-weak.js";\n'
    assert old.count(import_line)==1
    anchor=b'/** The observed living summon adds its first attack to next turn\'s threat, from the current ascension\'s DB. */'
    assert old.count(anchor)==1
    new=old.replace(import_line,b'').replace(anchor,body+b'\n'+anchor)
    assert new.replace(body+b'\n',b'')==old.replace(import_line,b'')
    live.write_bytes(new)
    archived=OUT/'prototype-silent-boss-weak.ts.txt';assert not archived.exists();helper.rename(archived)
    previous=test.read_bytes();updated=previous.replace(b'../src/reflex/silent-boss-weak.js',b'../src/reflex/rollout-live.js');assert previous!=updated;test.write_bytes(updated)
    proof={'reason':'Original rollout.test.ts architecture guard requires rollout references outside sim/ to enter only through rollout-live.ts. Its assertion is unchanged.','original_source_full_exit':1,'helper_declaration_and_body_sha256':sha(body),'old_adapter_sha256':sha(old),'new_adapter_sha256':sha(new),'pure_helper_text_identical':True,'outside_helper_only_change':'Removed the erased type-only-helper module import and inserted its exact declaration into the existing adapter. Call site, move data, arithmetic and RNG are unchanged.','new_test_change':'Import path only; all eight assertions and numeric cases unchanged.','old_helper_snapshot':str(archived),'old_helper_sha256':sha(source),'scope':'Fixed full-sample numerical equivalence; no H1 partial-budget timing or cache guarantee.'}
    (OUT/'source-boundary-v2-equivalence.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(proof))

if __name__=='__main__':main()
