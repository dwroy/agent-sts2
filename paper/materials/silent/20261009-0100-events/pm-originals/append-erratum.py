import json,hashlib,subprocess,fcntl
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-001302-postmortem')
f=Path('/home/dw/Projects/agent-sts2/notes/lessons.md')
stamp=subprocess.run(['date','+%Y-%m-%d %H:%M:%S %z'],text=True,capture_output=True,check=True).stdout.strip()
body='\n### 勘误（'+stamp+'，learner）\n- 第一条经验中的“Jev因此选择推演最优的直接结束回合”更正为“未知HP血价在题面呈现loot cost 0；同题Jev选择推演最优的直接结束回合”。decisions:300426只记plan3、置信0.89及推演最优，没有记录Jev对此选择的原因文本，不能认定零成本呈现导致了该选择。估值、预测12伤、全部8/8预计逃脱与实际敌带30血逃脱的数字不变。\n'
(p/'erratum.md').write_text(body)
with f.open('rb') as h:
 fcntl.flock(h,fcntl.LOCK_EX)
 offset=h.seek(0,2)
 r=subprocess.run(['bash','-c',"cat >> /home/dw/Projects/agent-sts2/notes/lessons.md <<'EOF'\n"+body+'EOF\n'],text=True,capture_output=True)
 (p/'erratum-append.stdout').write_text(r.stdout);(p/'erratum-append.stderr').write_text(r.stderr)
 if r.returncode:raise SystemExit(r.returncode)
(p/'erratum-receipt.json').write_text(json.dumps({'append_offset':offset,'appended_bytes':len(body.encode()),'append_sha256':hashlib.sha256(body.encode()).hexdigest()},ensure_ascii=False,indent=2)+'\n')
print('已追加因果措辞勘误；数值无需更正。')
