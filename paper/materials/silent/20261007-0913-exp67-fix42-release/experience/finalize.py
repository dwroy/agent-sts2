import json,pathlib,re,subprocess
O=pathlib.Path(__file__).parent;ROOT=pathlib.Path('/home/dw/Projects/agent-sts2')
C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-result.json'));M=json.load(open(O/'live-merge.json'));S=json.load(open(O/'slice-summary.json'));commit=(O/'commit.txt').read_text().strip()
t=(O/'test-source.log').read_text();files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',t)));cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',t)));assert (O/'test-source.rc').read_text().strip()=='0'
mechanisms=['蛇咬保留施毒：普通/升级7/10毒，负力不减毒，免费个例分账；9支持0反例；KQQELQSZ382Z/KAY522KT5NXR','逐击力量/逐牌敏捷：族母负力负敏分别压直伤和挡；80综合支持0反例；KQQELQSZ382Z','尖啸临时减力：多段当轮减伤、次轮恢复；38支持0反例；KQQELQSZ382Z','族母吸取与毒窗口：毒独立、未结算毒不预支；11支持0反例；KQQELQSZ382Z/NB8KCF6HRGVF','能力组合兑现观察：未取得能力无已建立收益，单轮零损不等整战胜因；79支持0反例；KQQELQSZ382Z']
report=dict(task='experience-update',version='2026-10-07.13',commit=commit,merged=M['merged'],added=1,updated=6,retired=0,active=137,mechanisms=mechanisms,tests=dict(tsc=0,vitest=0,cases=cases),ledger=L)
(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
lines=['# 静默经验第67次增量交接', '',f'生成：{stamp}',f'- 源{commit}（exp-silent），经验2026-10-07.12→.13；增1改6退0，137 active/49709字。源首轮tsc/vitest0，{files}文件{cases}例，无重跑。',f'- 合入：{M["merged"]}；原因/状态：{M.get("reason","合后沙箱通过")}；刷新{M.get("refresh_commit")}、合前{M.get("base")}。','- 不同blob重叠路径：'+','.join(M.get('conflicting_overlap',[]))+'；由开工合main带入旧刷新祖先，源业务提交仅experience.json。请运维保留最新刷新数据后兜底，不覆盖旧新数据。',f'- 唯一eval版本：{M.get("eval_version","未登记；未合入时不登记")}；上线记录提交：{M.get("release_commit")}', '- 来源KQQELQSZ382Z静默A10及三勘误；旧83局七数组/每档/源节点/回血/SL复算一致。新84局1265房74实死，A10 44局551房44实死；MCCK仅进数字。','- 新蛇咬9局48次实用，普通8/升级2局有重叠。族母六次64/75同初24抽序0赢，末毒130+直接71=201、余32；临时减力与吸取/负攻防分账。不声明早施必胜或未取得能力已启动，无新用药规则。', '- 账本proposed '+','.join(L['proposed'])+f'，check{L["check"]}；旧first_run/prior/历史/版本保持，0220追加真实普通/升级机制，0216/0219纯bug仍独立；没有accepted/shipped。','- 请运维据experience-done确认实际合入：已合入则仅用learner/ledger.py登记本批shipped；未合入则按冲突记录兜底。无需新增审核，完整沙箱外检查由调度器补跑。','- 主目录experience-changelog-silent.md本节仅追加，账本仅CLI追加，本任务不在主目录提交；请调用方保留归档。原日志抽取、失败/更正、自测、切片、扫描均在本目录。','- 无手写知识/源码/生成器/其他角色改动；不重建、不停对局、不运行play、不推送。','']
(O/'handoff-ops.md').write_text('\n'.join(lines))
for name in ['report.json','handoff-ops.md','ledger-updates.jsonl']:
 with (O/('gitleaks-'+name+'.log')).open('w') as h:subprocess.run(['nice','-n','19','/home/dw/.local/bin/gitleaks','dir','--redact','--no-banner',str(O/name)],stdout=h,stderr=subprocess.STDOUT,check=True)
print(json.dumps(report,ensure_ascii=False))
