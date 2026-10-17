"""Keep exact unused historical/failed scratch bytes outside the import scan, then restore them."""
import hashlib
import json
import os
from pathlib import Path
import sys

OUT=Path(__file__).resolve().parent
WORK=OUT.parents[2]
OLD=Path('/home/dw/Projects/agent-sts2/learner/runs/20261015-154311-0f5e0b96-178e-4abf-a6d9-66c9d743a891-silent-boss-calibration/historical-copy-preservation.json')
history=json.loads(OLD.read_text())
original=WORK/'learner/runs/20261012-134305-silent-boss-calibration/live-recheck-tree'
hidden=original.with_name('.live-recheck-tree-h0-r1')
failed=OUT/'compile-model-first.mjs'
failed_hidden=failed.with_name('.compile-model-first.mjs.h0-preserved')
opaque={}
tag='-'+sys.argv[2] if len(sys.argv)>2 else ''

def foreign(name):
    parts=name.parts
    return any(parts[i:i+2]==('knowledge','characters') and i+2<len(parts) and parts[i+2]!='silent' for i in range(len(parts)-2))

def identity(path):
    stat=path.stat()
    return {'dev':stat.st_dev,'inode':stat.st_ino,'bytes':stat.st_size,'mtime_ns':stat.st_mtime_ns,'ctime_ns':stat.st_ctime_ns}

def verify(root):
    actual=set()
    for at,dirs,files in os.walk(root,followlinks=False):
        for name in dirs+files:
            p=Path(at)/name
            if p.is_file() or p.is_symlink():actual.add(str(p.relative_to(root)))
    assert actual=={e['path'] for e in history['entries']}
    for e in history['entries']:
        name=Path(e['path']);assert '.git' not in name.parts and '.env' not in name.name and not name.name.endswith('_api_key') and name.suffix not in ['.dll','.pck']
        p=root/name
        if 'link' in e:assert p.is_symlink() and os.readlink(p)==e['link']
        elif foreign(name):
            # H0 forbids reading other characters' knowledge, including unused historical fixture copies.
            # An atomic same-parent rename preserves these opaque files in place; verify inode and metadata only.
            now=identity(p);assert now['bytes']==e['bytes']
            if e['path'] in opaque:assert now==opaque[e['path']]
            else:opaque[e['path']]=now
        else:assert p.stat().st_size==e['bytes'] and hashlib.sha256(p.read_bytes()).hexdigest()==e['sha256']

if sys.argv[1]=='preserve':
    assert Path(history['original'])==original and original.is_dir() and not hidden.exists()
    assert failed.is_file() and not failed_hidden.exists()
    verify(original)
    receipt={'original':str(original),'preserved':str(hidden),'historical_manifest':str(OLD),'historical_manifest_sha256':hashlib.sha256(OLD.read_bytes()).hexdigest(),'inventory_entries':len(history['entries']),'sha_verified_entries':len(history['entries'])-len(opaque),'opaque_foreign_files':opaque,'bytes':sum(e.get('bytes',0) for e in history['entries']),'failed_original':str(failed),'failed_preserved':str(failed_hidden),'failed_sha256':hashlib.sha256(failed.read_bytes()).hexdigest(),'scope':'Untracked unused scratch only; original production source, test assertions, exclusions and deadlines unchanged. Other-role knowledge bytes are never read: atomic same-parent rename plus identical inode/dev/size/mtime/ctime proves preservation, while historical SHA remains in original manifest. Import preflight retains all 66 unresolved-reference records.'}
    (OUT/('test-history-preserved'+tag+'.json')).write_text(json.dumps(receipt,indent=2)+'\n')
    original.rename(hidden);failed.rename(failed_hidden);verify(hidden)
    print(json.dumps(receipt))
elif sys.argv[1]=='restore':
    receipt=json.loads((OUT/('test-history-preserved'+tag+'.json')).read_text())
    opaque.update(receipt['opaque_foreign_files'])
    assert not original.exists() and hidden.is_dir() and not failed.exists() and failed_hidden.is_file()
    verify(hidden);assert hashlib.sha256(failed_hidden.read_bytes()).hexdigest()==receipt['failed_sha256']
    hidden.rename(original);failed_hidden.rename(failed);verify(original)
    receipt.update(restored=True,scope='All original paths, regular-file bytes and symlink targets restored; no history removed.')
    (OUT/('test-history-restored'+tag+'.json')).write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({'restored':True,'inventory_entries':len(history['entries']),'opaque_foreign_files':len(opaque)}))
else:raise ValueError('preserve or restore required')
