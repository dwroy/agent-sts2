from pathlib import Path
import struct,hashlib,json,subprocess,sys
A=Path(__file__).resolve().parent;R=A.parent.parent;M=R/'paper/materials/20261024-issue56-r2-integrator';mode=sys.argv[1]
sha=lambda b:hashlib.sha256(b).hexdigest()
def parse(b):
 magic,version,count=struct.unpack_from('!4sII',b);assert magic==b'DIRC' and version in (2,3)
 off=12;entries={}
 for _ in range(count):
  start=off;stat=struct.unpack_from('!10I',b,off);oid=b[off+40:off+60].hex();flags=struct.unpack_from('!H',b,off+60)[0];off+=62;extended=0
  if flags&0x4000:extended=struct.unpack_from('!H',b,off)[0];off+=2
  end=b.index(b'\0',off);name=b[off:end].decode();off=start+((end-start+1+7)//8)*8;entries[name]=dict(stat=stat,oid=oid,flags=flags,extended=extended)
 extensions=[]
 while off<len(b)-20:
  tag=b[off:off+4].decode('ascii');length=struct.unpack_from('!I',b,off+4)[0];payload=b[off+8:off+8+length];extensions.append(dict(tag=tag,length=length,sha256=sha(payload)));off+=8+length
 assert off==len(b)-20
 return dict(version=version,count=count,entries=entries,extensions=extensions)
before=(A/(mode+'-index-before.bin')).read_bytes();after=(A/(mode+'-index-after.bin')).read_bytes();a=parse(before);b=parse(after)
names=set(a['entries'])|set(b['entries']);changed=[n for n in sorted(names) if a['entries'].get(n)!=b['entries'].get(n)];semantic=[];stats=[]
for n in changed:
 x=a['entries'].get(n);y=b['entries'].get(n)
 if x is None or y is None or any(x[k]!=y[k] for k in ('oid','flags','extended')) or x['stat'][6]!=y['stat'][6]:semantic.append(n)
 else:stats.append(n)
r=dict(at=subprocess.check_output(['date','-Iseconds'],text=True).strip(),mode=mode,before_sha256=sha(before),after_sha256=sha(after),raw_bytes_equal=before==after,before_version=a['version'],after_version=b['version'],before_entries=a['count'],after_entries=b['count'],changed_entry_count=len(changed),semantic_or_flags_changed=semantic,stat_cache_only_changed_count=len(stats),stat_cache_sample=stats[:10],before_extensions=a['extensions'],after_extensions=b['extensions'],writer_unknown=True,not_a_root_cause_claim=True)
(M/(mode+'-index-forensics.json')).write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
