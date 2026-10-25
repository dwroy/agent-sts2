"""Exec a tiny Node parent/child to audit real inherited kernel flock descriptors."""
import fcntl
import json
import os
from pathlib import Path
import sys
import tempfile

root = Path(__file__).resolve().parents[3]
directory = Path(tempfile.mkdtemp(prefix='queue-lease-probe-', dir=root / '.cache'))
handles = []
fds = []
for number in range(4):
    stream = (directory / ('lease-' + str(number))).open('a')
    handles.append(stream)
    fcntl.flock(stream, fcntl.LOCK_EX)
    descriptor = fcntl.fcntl(stream.fileno(), fcntl.F_DUPFD, 100)
    os.set_inheritable(descriptor, True)
    fds.append(descriptor)
context = directory / 'context.json'
context.write_text(json.dumps(dict(full_lock_fd=fds[3],job_path=str(directory / 'job.json'),job=dict(candidate='0'*40),worker=dict(boot_id=Path('/proc/sys/kernel/random/boot_id').read_text().strip()))))
child = directory / 'child.mjs'
child.write_text('''import fs from 'node:fs';
const fds = process.env.MAS_QUEUE_LEASE_FDS.split(',').map(Number);
const c = JSON.parse(fs.readFileSync(process.env.STS2_BOARD_CHECK_CONTEXT));
fs.writeFileSync(new URL('./child.json',import.meta.url), JSON.stringify({pid:process.pid,ppid:process.ppid,
 start:fs.readFileSync('/proc/self/stat','utf8').split(')')[1].trim().split(/\\s+/)[19],
 fds:[...fds,c.full_lock_fd].map(fd=>({fd,inode:fs.fstatSync(fd).ino,lock:fs.readFileSync(`/proc/self/fdinfo/${fd}`,'utf8').includes('FLOCK')}))}));
''')
parent = directory / 'parent.mjs'
parent.write_text('''import fs from 'node:fs';
import {fork} from 'node:child_process';
import {once} from 'node:events';
const child=fork(new URL('./child.mjs',import.meta.url),[],{stdio:['ignore','ignore','ignore','ipc']});
const [code]=await once(child,'exit');if(code!==0)process.exit(code||1);
const c=JSON.parse(fs.readFileSync(new URL('./child.json',import.meta.url)));
if(c.ppid!==process.pid||c.fds.length!==4||c.fds.some(x=>!x.lock))throw Error('lease inheritance not proven');
console.log(JSON.stringify({parent:process.pid,child:c,evidence:new URL('.',import.meta.url).pathname}));
''')
os.environ['MAS_QUEUE_LEASE_FDS'] = ','.join(map(str, fds[:3]))
os.environ['STS2_BOARD_CHECK_CONTEXT'] = str(context)
os.execvp('node', ['node', '--import', str(root / 'ops/board_queue_leases.mjs'), str(parent)])
