import json,pathlib,subprocess,re
O=pathlib.Path(__file__).parent;ROOT=pathlib.Path('/home/dw/Projects/agent-sts2');M=json.load(open(O/'live-merge.json'));C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-result.json'));S=json.load(open(O/'slice-summary.json'))
assert M['merged'] and M['test_rc']==0 and M.get('release_commit')
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip();src=M['source_commit'];merged=M['merged'];release=M['release_commit'];name=M['eval_version'];st=M['source_tests'];lt=M['live_tests']
message=(f'本节收尾（{stamp}）：源{src}，实际live合入{merged}，上线登记{release}/eval {name}；刷新{M.get("refresh_commit")}、合前{M["base"]}、知识重叠{len(M["overlap"])}/不同blob冲突0、其他知识blob保持。源tsc0/vitest0/{st["files"]}文件{st["cases"]}用例；合后tsc0/vitest0/{lt["files"]}文件{lt["cases"]}用例，'+('合后首轮失败重跑通过，原记录保留。' if M.get('test_first_rc') else '源与合后均首轮通过，无测试失败或超时重跑。')
 +'仅账本CLI将'+','.join(L['proposed'])+'改proposed，新增/退役账本无，覆盖全部9个经验条目、check0；0214首证C48/A0/prior=yes，T082实际付费及CSBR持牌伤/毒杀对子支持保持，其他首证/先验/claim/旧版本/repeat与0213独立状态保持。不写accepted/shipped，未纳入经验不动。无源码/生成器/手写知识/其他角色/新用药规则改动，不重建；主目录本节/账本只追加不提交，由调用方提交。交接learner/runs/20261007-070019-experience-update/handoff-ops.md与完成JSON交调用器experience-done通知运维核实际发布后CLI登记11项shipped，完整沙箱外套件交调度器；不停对局、不运行play、不推送。')
with (ROOT/'paper/materials/experience-changelog-silent.md').open('a') as h:h.write('\n'+message+'\n')
handoff=f'''# 运维交接：静默经验第64次增量

时间：{stamp}。源 `{src}`（exp-silent），实际 live 合入 `{merged}`，上线登记 `{release}`，eval `{name}`，经验版本 2026-10-07.10。

两局：87LCSDR5P3DL/TKXQ6L4N9A6U，均 SILENT A10。新增1、更新8（全补证）、退役0，active136/49920字；A8 129条46813字、A9 130条47112字。切片配对增量中位0、最大5302→5293字；旧78局七数组及全部血档/节点/回血/SL逐行一致。新80局1233房70实死，A10四十局519房40死，无真正重打增量。毒素17支持局/16局51次付费与末伤先于敌毒子证据分别核；未建立群蛇与未到路线不预支，无新用药规则。

源固定沙箱 tsc0/vitest0/{st['files']}文件{st['cases']}例；合后 tsc0/vitest0/{lt['files']}文件{lt['cases']}例。刷新 `{M.get('refresh_commit')}`、合前 `{M['base']}`，知识不同blob冲突0，其他知识blob保持。未改生成器，不重建。

账本只通过 CLI 将 {','.join(L['proposed'])} 改为 proposed，check0；请据 experience-done 核实际合入后，经 learner/ledger.py 登记 shipped/{name}，不另设审核。旧 first_run/prior/claim/证据/repeat/版本历史保持，0214最早 C48/A0/prior=yes；0213纯bug及其他并行条目保持独立状态，本任务未改源码或修复队列。

主目录 experience-changelog-silent.md 仅追加第64节及本节收尾；ledger.jsonl 仅CLI追加11行，未提交主目录，交调用方归档。完整沙箱外检查交调度器。所有原始证据/抽取脚本/基线/切片/测试/秘密扫描结果在本目录。离线初稿null角色及started字段失败日志与更正保持，非生产故障或自测失败。不停对局、不运行play、不推送。
'''
(O/'handoff-ops.md').write_text(handoff)
mechanisms=['敏捷与脆弱 — 逐挡牌增益且不追补旧挡 — 48支持/0反例 — 87LCSDR5P3DL、TKXQ6L4N9A6U','力量与虚弱 — 逐段增伤/取整，遗物增伤分账 — 76支持/0反例 — 87LCSDR5P3DL','临时减力 — 只兑现当轮，次轮恢复并继续成长 — 37支持/0反例 — TKXQ6L4N9A6U','毒雾轮初 — 实际活到轮初才补毒，未结算层不计伤 — 39支持/0反例 — 87LCSDR5P3DL、TKXQ6L4N9A6U','毒素付费与末伤 — 1费离手、每张5伤，玩家先死则敌毒未结算 — 17支持/0反例 — T082DRCUHRRD、TKXQ6L4N9A6U','巨兽自爆 — 本体清零后仍核残壳攻击与挡 — 18支持/0反例 — TKXQ6L4N9A6U','未建能力观察 — 群蛇0施放不预支逐牌6伤 — 75支持/0反例 — TKXQ6L4N9A6U']
report=dict(task='experience-update',version='2026-10-07.10',commit=src,merged=merged,added=1,updated=8,retired=0,active=136,mechanisms=mechanisms,tests=dict(tsc=0,vitest=0,cases=st['cases']),ledger=L)
(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
