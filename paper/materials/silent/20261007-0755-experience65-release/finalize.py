import json,subprocess,re,hashlib
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');M=json.load(open(O/'live-merge.json'));C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-result.json'));S=json.load(open(O/'slice-summary.json'))
assert M['merged'] and M['test_rc']==0 and M.get('release_commit')
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip();src=M['source_commit'];merged=M['merged'];release=M['release_commit'];name=M['eval_version'];st=M['source_tests'];lt=M['live_tests']
check=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'check'],text=True,capture_output=True);(O/'ledger-check-final.log').write_text(check.stdout+check.stderr);assert check.returncode==0
message=(f'本节收尾（{stamp}）：源{src}（exp-silent），实际live合入{merged}，上线登记{release}/eval {name}；刷新{M.get("refresh_commit")}、合前{M["base"]}、知识重叠{len(M["overlap"])}/不同blob冲突0、其他知识blob保持。源tsc0/vitest0/{st["files"]}文件{st["cases"]}用例；合后tsc0/vitest0/{lt["files"]}文件{lt["cases"]}用例，'+('合后首轮失败重跑通过，原日志保留。' if M.get('test_first_rc') else '源与合后均首轮通过，无超时重跑。')
 +'仅账本CLI将'+','.join(L['proposed'])+'改proposed，覆盖7个经验条目、check0；新增/退役账本无。旧first_run/prior/claim/支持/repeat/版本历史保持，0216中毒模型折扣纯bug仍独立observed/首证K367 A1，不由经验更新冒记代码已修。不写accepted/shipped，未纳入条目不动。无源码/生成器/手写知识/其他角色/新药水规则改动，不重建；主目录本节/账本仅追加、不提交，由调用方归档。完整数据/脚本/初稿失败及更正/切片/测试/扫描在learner/runs/20261007-073027-experience-update；handoff-ops.md与完成JSON交调用器experience-done通知运维核实际发布后CLI登记8项shipped，完整沙箱外检查交调度器；不停对局、不运行play、不推送。')
f=ROOT/'paper/materials/experience-changelog-silent.md'
assert hashlib.sha256(f.read_bytes().split(b'\n'+(O/'changelog-title.txt').read_text().strip().encode())[0]).hexdigest()==(O/'changelog-before.sha256').read_text().strip()
with f.open('a') as h:h.write('\n'+message+'\n')
mechanisms=['力量/虚弱 — 逐段增伤与取整，成长继续 — 78支持/0反例 — 02HB4L0C3C67、T3FW7R2R2306','毒雾 — 已建能力只计已结算毒，不预支未来收益 — 40支持/0反例 — T3FW7R2R2306','骇鳗 — 跨阈值停当前攻击，易伤后的击杀仍须完成 — 6支持/0反例 — 02HB4L0C3C67','异鸟 — 力量逐段放大，防御轮未停止增长 — 8支持/0反例 — T3FW7R2R2306','能力建立/护栏观察 — 局部保血非整场胜因 — 77支持/0反例 — 02HB4L0C3C67、T3FW7R2R2306']
report=dict(task='experience-update',version='2026-10-07.11',commit=src,merged=merged,added=0,updated=7,retired=0,active=136,mechanisms=mechanisms,tests=dict(tsc=0,vitest=0,cases=st['cases']),ledger=L)
(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
handoff=f'''# 运维交接：静默经验第65次增量

时间：{stamp}。源 `{src}`（exp-silent），实际 live 合入 `{merged}`，上线登记 `{release}`，eval `{name}`，经验 2026-10-07.10→.11。

来源：02HB4L0C3C67 / T3FW7R2R2306，均 SILENT A10；复盘紧后勘误已用。新增0、更新7全加证据、退役0，active136→136、49920→49822字，高66中41低29；A8 129条46715字、A9 130条47014字。240配对切片增量中位−10字、最大5293→5294字。旧80局七数组/血档/源节点/回血/SL逐行复算一致；82局1244房72死，A10 42局530房42死；无新SL，历史74场322试26赢不变。

骇鳗阈值取消当轮攻后易伤仍致死；异鸟力量逐段放大，毒雾20实毒加57攻击仍缺13；营火前52血价、两火42回复与事件10支出分别核，未来营火/商店与未选跳线不预支。护栏省当轮8血少6伤，没有原线整场对照。机制支持数为各综合主题独立局数，子公式/整战因果分账；无新药水规则。

源沙箱 tsc0/vitest0/{st['files']}文件{st['cases']}例；合后 tsc0/vitest0/{lt['files']}文件{lt['cases']}例。刷新 `{M.get('refresh_commit')}`、合前 `{M['base']}`；知识冲突0、其他知识blob保持。未改生成器，不重建。固定全套沙箱外检查由调度器补跑。

账本只经 CLI 将 {','.join(L['proposed'])} 改 proposed、check0。请据 experience-done 核实际发布后，经 learner/ledger.py 将这8项登记 shipped/{name}，不另设审核；first_run/prior/claim/支持/repeat/旧版本历史保持。silent-0216中毒已建模仍未知折扣纯bug仍observed，首证按勘误 K3676LU8B0UH/A1，不混入经验、不冒记代码修复；本任务未改源码/队列。

主目录变更记录仅追加第65节及本节收尾；账本仅CLI追加8行，未在主目录提交，由调用方归档。原始证据、全历史复算、机制分帧、manifest/逐片原文、测试及扫描均留本目录。facts初稿无chosen行KeyError与更正保留，非生产故障/自测失败。不停对局、不运行play、不推送。
'''
(O/'handoff-ops.md').write_text(handoff);print(json.dumps(report,ensure_ascii=False))
