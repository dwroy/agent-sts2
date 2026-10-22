from pathlib import Path
import json,os,subprocess
R=Path('/home/dw/Projects/agent-sts2');B=Path(__file__).resolve().parent
v=json.loads((B/'r415-readback.json').read_text())
body=f'''[watcher] 已实读 ops 6346048873，独立核实际 V6-R415 `{v['actual_live']}`；#40 三叶与在途 #36+#44 full 树逐字节同，原 full 继续，不重启、不另跑 full。

锁内读回实际 live：R414→R415 运行/测试差量仅原三叶及版本登记；最新 468 份知识逐 SHA 对照冻结快照，其中 9 份已有自然更新，差异另存 `paper/materials/20261023-issue36-44-r414-integrator/r415-readback.json`，随本组合材料交付。此差异不改 full 输入、不冒称在新知识树 full0；后续只接 #36 R3/测试叶，保 R415 编号及所有最新知识、策略/catalog/模型，不回盖冻结副本或重放 #40。

#40 生产自然刷新、训练、真实新模型消费者及追加/暖缓存仍 pending；20–40分钟/约10GiB仍仅规划。CLI 兼容阻塞、#27五条实际发布/自然命中和科学父边界保留。#36+#44 full 尚在运行，结束后按主管原序交回。
'''
(B/'issue40-ack.md').write_text(body); req=B/'issue40-ack-request.json';req.write_text(json.dumps({'body':body},ensure_ascii=False)+'\n')
p=subprocess.run(['gitleaks','stdin','--redact','--no-banner'],input=body.encode(),capture_output=True,env={**os.environ,'GOMAXPROCS':'1'});(B/'issue40-ack-gitleaks.log').write_bytes(p.stdout+p.stderr);assert p.returncode==0
out=subprocess.check_output(['gh','api','repos/dwroy/agent-sts2/issues/40/comments','--method','POST','--input',str(req)],cwd=R);(B/'issue40-ack-post.json').write_bytes(out)
c=json.loads(out);read=subprocess.check_output(['gh','api',f"repos/dwroy/agent-sts2/issues/comments/{c['id']}"],cwd=R);(B/'issue40-ack-readback.json').write_bytes(read);d=json.loads(read);assert d['user']['login']=='dwroy' and d['body']==body
at=subprocess.check_output(['date','-Is'],text=True).strip()
line=f"- {at} [watcher] #40实发V6-R415 {v['actual_live']}已独立锁内读回，三叶与#36+#44在途full树6b8d15d12d6acf96cfbe9b4359878e142c5685f3同；468知识9份自然变化另记r415-readback.json，原full不重启/不改输入。后续保新live与数据/编号，40自然刷新训练/模型消费者、27实际发布及CLI兼容仍待；issue回执{c['id']}。\n"
for p in [R/'paper/materials/decision-log.md',R/'handoff/integrator-20261022-codex3.md']:
 with p.open('ab') as f:f.write(b'\n'+line.encode())
print(d['html_url'])
