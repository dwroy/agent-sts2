import fcntl,hashlib,json,subprocess
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');source=(O/'source-commit.txt').read_text().strip();M=json.load(open(O/'live-merge.json'));U=json.load(open(O/'update-summary.json'));T=json.load(open(O/'test-summary.json'));C=json.load(open(O/'changes.json'))['entries']
p=subprocess.run(['nice','-n','19','python3',str(O/'make-changelog.py'),source],text=True,capture_output=True);(O/'make-changelog-final.log').write_text(p.stdout+p.stderr);p.check_returncode()
section=(O/'changelog-section.md').read_bytes();title=(O/'changelog-title.txt').read_text().strip();path=ROOT/'paper/materials/experience-changelog-silent.md'
with path.open('a+b') as f:
 fcntl.flock(f,fcntl.LOCK_EX);f.seek(0);h=hashlib.sha256();before_bytes=0
 for chunk in iter(lambda:f.read(65536),b''):h.update(chunk);before_bytes+=len(chunk)
 before_hash=h.hexdigest();f.seek(0)
 if any(line.decode().strip()==title for line in f):raise RuntimeError('同源标题已存在，避免重复追加')
 f.seek(0,2);addition=b'\n'+section;f.write(addition);f.flush();f.seek(0);h=hashlib.sha256();remaining=before_bytes
 while remaining:
  chunk=f.read(min(65536,remaining));assert chunk;h.update(chunk);remaining-=len(chunk)
 assert h.hexdigest()==before_hash
 f.seek(before_bytes);assert f.read()==addition;f.seek(0);h=hashlib.sha256()
 for chunk in iter(lambda:f.read(65536),b''):h.update(chunk)
proof=dict(file=str(path),old_bytes=before_bytes,old_sha256=before_hash,addition_bytes=len(addition),addition_sha256=hashlib.sha256(addition).hexdigest(),new_sha256=h.hexdigest(),old_prefix_unchanged=True)
(O/'changelog-append-proof.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n')
p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'check'],text=True,capture_output=True);(O/'ledger-check-delivery.log').write_text(p.stdout+p.stderr);p.check_returncode()
added=json.load(open(O/'ledger-added.json'));lids=json.load(open(O/'ledger-ids.json'));proposed=[i for i in lids if i not in added];pids=json.load(open(O/'proposal-ids.json'))
mechanisms=['力量/敏捷','脆弱','尖啸暂减力','铁心覆甲','刀扇容量/力量','铜钹弃牌附伤','能力/护栏血价']
result=dict(task='experience-update',version=U['version'],commit=source,merged=M.get('merged'),added=1,updated=9,retired=0,active=169,mechanisms=mechanisms,tests=dict(tsc=0,vitest=0,cases=T['cases']),ledger=dict(added=added,proposed=proposed,retired=[],check=0),code_proposals=pids,implementation_domains=['combat','potion','sl','terminal'],report=str(O/'report.md'))
(O/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
names={'silent-strength-weak-observation':'力量/敏捷','silent-frail-card-block':'脆弱','silent-piercing-wail-temporary-strength':'尖啸','silent-heart-of-iron-plating':'铁心','silent-fan-of-knives-capacity':'刀扇','silent-rest-buffer-observation':'休息','silent-route-hp-observation':'路线','silent-deck-burst-observation':'构筑','silent-kin-poison-sl-observation':'同族'}
compressed=[names[c['id']] for c in C if c['before'] and len(c['after']['lesson'])<len(c['before']['lesson'])]
merge_text=M.get('merged') or '未合入（锁内预检冲突，待运维续办）'
lines=['## 经验库更新回报','',f'- 版本：2026-10-08.9 → 2026-10-08.10；提交：{source}（分支 exp-silent）；合入：{merge_text}',
'- 条数：新增1、更新9（加证据9、只改数字0）、退役0；active 168 → 169；正文51016字符；A8 158条/47012字，A9 159条/47296字。压缩：'+('、'.join(compressed) or '无')+'；合并无。',
'- 机制推理：',
'  - 力量/敏捷 — 逐击伤、逐牌挡分源 — 119支持/0反例 — ZTRGYYMLR8SC',
'  - 脆弱 — 两防御各3挡，完整净损7杀4血 — 22/0 — ZTRGYYMLR8SC',
'  - 尖啸 — 当轮33攻降11，次轮恢复 — 55/0 — ZTRGYYMLR8SC',
'  - 铁心 — 建7覆甲，末试T9耗尽 — 17/0 — ZTRGYYMLR8SC',
'  - 刀扇 — 8手实际添3刀，2力逐刀加伤 — 10/0 — ZTRGYYMLR8SC',
'  - 铜钹 — 弃牌附伤分账，滑溜同现1伤保留限制 — 7/0 — ZTRGYYMLR8SC',
'  - 能力/护栏 — 未建不预支，候选省血不当整场胜因 — 118/0 — ZTRGYYMLR8SC',
'- 改了的手写知识：无。',
f'- 测试：tsc 0；vitest {T["files"]}文件/{T["cases"]}用例/0，无失败重跑；最终经验定向1文件/10例/0。',
'- 切片大小：中位下降65.5字，配对增量中位−2字；最大5290字，单片最多增加358字。',
'- 学习账本：新增 '+','.join(added)+'；改成 proposed '+','.join(proposed)+'；退役无；ledger.py check 0。',
'- 需要 Roy 定的事：无。'+('live有'+str(len(M.get('precheck_conflicts',[])))+'处并行记录冲突，未覆盖，待运维续办。' if not M.get('merged') else ''),
'',chr(96)*3+'json',json.dumps(result,ensure_ascii=False,indent=2),chr(96)*3,'']
(O/'report.md').write_text('\n'.join(lines));print('只追加一节；旧前缀不变；账本check0；报告已保存')
