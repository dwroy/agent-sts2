import hashlib
import json
from pathlib import Path
import subprocess

SCRATCH = Path(__file__).resolve().parent
RUN = SCRATCH.parent
WORK = Path.cwd()

def load(p):
    return json.loads(Path(p).read_bytes())

mapping = load(SCRATCH/'experience-strategy-rk-map.json')
counts = load(SCRATCH/'decision-output-counts.json')
coverage = load(SCRATCH/'coverage.json')
ledger = load(SCRATCH/'source-ledger.json')
knowledge = load(SCRATCH/'knowledge-candidates.json')['entries']
destinations = []
for m in mapping:
    destinations.extend([
        {'kind':'knowledge','id':m['knowledge_id'],'path':m['knowledge_path']},
        {'kind':'strategy','id':m['strategy_id'],'path':m['strategy_path']},
        {'kind':'rk','id':m['rk_id'],'path':m['rk_path']},
    ])
result = {
    'task':'strategy-proposal','character':'silent',
    'reason':'已完成6个特殊事件情境的scratch提炼：6条文字策略、6份知识候选；6份对应rk说明因合同缺event题型及身份字段保持waiting，可执行rk为0。未正式发布或读回。',
    'code_proposals':[],'implementation_domains':[],'proposal_results':[],
    'batch':'20261024-204311-strategy-proposal','base':'7c11e4c072f2fac0aa88b98efb7ed960e6fecf72',
    'runs':[],'own_support_runs':ledger['own_support_runs'],'fixes':[],'merged':None,
    'tests':{'tsc':None,'vitest':None,'cases':None},
    'report':str((RUN/'report.md').resolve()),
    'external_source':'issue51-decision-event-001-20261024',
    'input_sha256':'1d2d96a88fbc1544014215800da56bd392476559e1826de03e42708243e95c1c',
    'decision_output_counts':counts,
    'mapping':str((SCRATCH/'experience-strategy-rk-map.json').resolve()),
    'coverage':str((SCRATCH/'coverage.json').resolve()),
    'source_ledger':str((SCRATCH/'source-ledger.json').resolve()),
    'external_results':[{
        'id':'external-decision-event-001','state':'processed','destinations':destinations,
        'reason':'六种真实事件各形成一条有资源幅度、样本及适用范围的文字策略和知识候选；rk去向为真实待证说明，六项均waiting合同，未冒充reflex-entry-v1。自有340局627次选择与外部270统计cell分版本分账，旧成果复用0，正式发布及消费均0。',
    }],
}
for d in destinations:
    assert Path(d['path']).is_file()
raw = (json.dumps(result, ensure_ascii=False, indent=2)+'\n').encode()
(RUN/'result.json').write_bytes(raw)

rows=[]
for k,m in zip(knowledge,mapping):
    rows.append('| '+m['event_id']+' | '+k['direction']+' '+k['magnitude_and_sample']+' | '+k['applicability']+' |')

text = '''# 特殊事件独立单元报告

本批产生6个新情境、6条合法大脑文字策略、6份知识候选和6份对应rk待证说明。文字策略已通过现有解析器与离线检索；rk可执行条目为0，六项均因现合同无法表达事件身份/选项而waiting。全部仅在本批scratch，formal_publication=pending、consumer_readback=pending。无源码变更、提交、main/live合并、正式库/共享统计写入或发布编号；科学父保持开放。

## 身份及输入核验

- 真实批次：20261024-204311-strategy-proposal；unit_ids仅external-decision-event-001；plan为issue51-decision-event-001-20261024，来源external:sts2fun。
- HEAD与dispatch_base均为7c11e4c072f2fac0aa88b98efb7ed960e6fecf72。learn.json本批external_source、external_binding、unit_ids、manifest及work_spec字节/SHA均一致。核验文件为scratch/binding-verification.json。
- 输入manifest 14117 bytes，SHA256 1d2d96a88fbc1544014215800da56bd392476559e1826de03e42708243e95c1c；work_spec 4465 bytes，SHA256 d5115b3c43eced3812935e8f743d8a6e3ef7d883e50563c07f46701474c65f48。
- #54冻结清单实际列3份manifest及129个产物，共132项SHA检查，全过；不把它误写成另外132个产物。11个own_contrast_scope只读parquet读取前、后完整大小/SHA均通过；未因nlink=1拒绝相同字节。核验见scratch/input-verification.json及own-shard-verification.json。
- 缺失历史材料先核git ls-tree并经worktree_storage.py materialize恢复，返回同一HEAD及原blob；仅恢复契约、scope及输入清单，未归档/复制整仓。基线git diff --binary为空，保存在scratch/baseline.diff。
- 已读README、最新STATE-2026-10-19、decision-log尾、学习协议第9节，以及冻结#27/#42大脑策略、#55检索和#28 rk合同。STATE的旧停机记录不冒当前身份；仅按本批冻结work_spec研究特殊事件。
- JSON保留的paired_outputs_required=false与附加正文同产要求并存，未改输入；按本批明确正文同时交文字与rk待证说明，不据旧布尔字段省略rk，也不冒称合同已支持event。

## 六条情境及处置

新建情境6，同ID更新0，逐字节复用0，别名0；270个外部统计cell及85个对照行都不另算情境。每个事件的重复观察合并成一条，六条达到本单元5～10条目标。冻结predecessor已记新建4/更新1，本批新建6，已知连续零新增为0；不启动下一单元。

| 真实事件 | 一句方向、幅度与样本 | 适用范围 |
| --- | --- | --- |
'''+ '\n'.join(rows)+'''

逐项ID、new/waiting处置、JSON pointer与真实候选路径在scratch/experience-strategy-rk-map.json。每个事件另有*-evidence.json，保留版本、采集日、原输入SHA、逐层分母、原始定位、反例与未知。知识候选按一句方向、幅度/样本、单行适用范围编写；策略为真正brain-strategies-v1条目，不使用临时封套替代。

## 证据范围、分母及代理

自有来源只读冻结506名单及11片，以DuckDB :memory:/threads=2、显式parquet路径先semi join白名单，再按原六流截止过滤off+len。未init/sync共享logdb。Z2/KF9/BP9及后续局未纳入。只按引用seek读取1927条原始行；每行保存offset/bytes/SHA、cutoff及本批archive_offset，逐条重核。没有复制17GB状态流。

六事件共506个run/floor/event遭遇、627次实际选择、340个不同自有局；“506个事件遭遇”与“允许的506局”是两个不同分母。A10为570次选择、311局；其他进阶57次选择、29局独立分账，不借来扩大A10验证。整局retry_or_predicted_death与no_retry_evidence逐幕/选项分开，未知游戏版本单列。整局重试标签不证明某次事件重试；无重试证据也不保证无重试。木桥一局多次重掷不增加局数，多个cell的局数不能相加。

自有原题before-frame与627个decision fingerprint的run/event/HP/gold逐项相符，所选option_index映射真实text_key，动作result均保留；同时保存下一观察帧和事件完成帧。状态后继是观察，不是原子执行快照；木桥完成帧包含后续重掷，不能归给前一次动作。is_locked/will_kill_player只作可选性代理，展示备选不证明可支付。CA5KE8GFJ9X2 F12为3HP、潜水标will_kill_player=true，不能当有能力潜水却拒绝的对照。

外部只读脱敏聚合与manifest核SHA的有界代表页，不读原库、玩家字段或重新下载。来源URL https://sts2.fun/static/sts2_public.db.zst ，采集2026-10-21，原DB SHA256 1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5；统计输入SHA256 4cf36c85eee760ed8e74495c1758e0228bbe1214789d3d0bd97052d5ca6a1f9d。无明确再分发许可，署名外部来源，仅保留汇总及已授权匿名派生页。

v0.111.0优先；v0.107.0/.1、v0.108.0、v0.109.0/.1、v0.110.0/.1、v0.111.0各自保留。外部事件选择提供title定位键，但缺variables、完整未选项与即时费用；前节点末HP和节点末减前节点末差显式称“代理”，不冒真实入场/原子费用。没有版本机制等价证明，不将未知补成未改；从v0.111合格组及自有可计算资源事实继续提炼，不整批waiting。原统计没有某事件/选项的cell时，不补零样本。

外部distinct_uploaded_runs为原聚合去重上传记录数，玩家独立性未知；未读取玩家标识，不能宣称独立玩家验证。每个cell保留item_occurrences、distinct_uploaded_runs、whole_run_winning_uploads和原统计率。对照另算赢家上传/去重上传，仅描述关联，不做因果推断、显著性筛选或固定选项排序。木桥多选项明显共享局；钥匙KEEP与FIGHT标题同30局，不合计60。外部各版本/幕/选项与自有311局从不混分母。

v0.111主比较只有脑蛭幕1两个组均≥100（137与140）；六情境中达到此条件为1。全部版本/幕85个对照中2行两组均≥100，另一行为v0.107.1幕1雕像119与132。其余组保留真实稀疏分母，不补样本、不将事件批伪装成20～30张单牌批，也不由此丢弃可直接观察的费用/后继事实。

## 反向结果与限制

- 芝士：v0.111幕1大快朵颐整局关联较高，但幕2为31/81对13/28，反向；v0.107.0幕1亦反向。没有芝士后续回本证据。
- 木桥：A10 104次重掷来自63局，实际累计净失368HP；6次文本价与后继净减不一致，保留二者且原因未知。不能将外部整段净减5～7当单次重掷价，也不推断随机重掷分布。
- 脑蛭：本系统付血分支实际选择0次；v0.111幕1分享关联+4.26点，幕2及v0.108幕1反向，不推出无色或普通奖励固定优劣。
- 雕像：本系统金币报价及实增101～121，并非固定115；可支付资源不同影响自选。v0.108关联方向反于v0.111，不核石剑未来收益。
- 这个还是那个：89个A10 ORNATE都增加CLUMSY和一件遗物，但6次HP、2次金币另有净增；不定义为永远零资源变化。外部二三幕反向，PLAIN小组仅11/12局。
- 钥匙：本系统留钥匙分支实选0；43个交还中3次文本100但实增125，同持BOWLER_HAT只记共现，不补机制。外部留钥匙赢家关联更高不等于免费战斗或固定应该留。

每条均把当前真实event ID、已展示选项与资源放在正文条件；没有archetype触发、终局牌组或未来随机所得触发。牌组/路线/持有物、上传、生存选择与SL均可能混杂；不报因果收益、安全HP线、胜率保证或固定拿牌命令。source=mixed、evidence_status=unassessed、confidence=0.35用于低可信事实比较提醒，跨来源机制等价和效果仍未知。

## 程序覆盖与模型阅读

程序核3个manifest/129产物、11只读片及627个选项窗口，原始行1927条。全量统计/映射见scratch/source-ledger.json、own-stratified-statistics.json与external-descriptive-comparisons.json。

外部代表通过eval/sts2fun_build_view.py逐对limit=1取两页，完整保存且实际通读：c0/p0的projection-fbf4ba3c208a6374赢家49节点、projection-5ed8689256202508失败49节点；c1/p0的projection-40ed0656498ebe5e赢家49节点、projection-a7d1a45b65eee902失败15节点，共4条/162完整节点。簇号只作页定位；没有从簇号命名玩法或当当前决策条件。赢家取芝士免费选牌/脑蛭后续赢，与失败取芝士后续输只作轨迹反例，不把结局回填当时触发。

模型另抽核七个初始事件原文（其中SYMBIOTE仅字段探索，未形成候选、不计新增），六情境的全部汇总及scratch/model-review-witnesses.json的16个具体窗口（11个不同局）逐条阅读。没有声称模型通读1927条原始行、全部506局或其四section；未读其余代表页、自有整局四section。交付的是六个有边界事件段落，不声称完整流派剧本，故不冒“完整剧本”验收。

## 去重、rk与消费者

按冻结#27/#28/#42合同核现有正式experience、68条strategy、115条reflex的ID及六事件原ID/中文名。未命中同场景；通用silent-route-hp-observation及另一事件silent-brain-relic-exchange-current-sacrifice保持原ID与原证据，不复用计新。核验SHA、扫描条数见scratch/dedup-audit.json。

六条文字仅用现有event/acts trigger，真实事件身份在正文作为必要条件；没有event_id新schema字段或#55测试几何部署。现消费者不会自动按event ID精准路由，默认页可能包含其他事件段落，应由原发布/读回owner核关键词/ID查询及当前条件。runtime格式与离线检索通过不等于kb_strategies生产工具已读回。

六份rk文件均明确candidate_kind=descriptive_rk_note_not_reflex_entry_v1、disposition=waiting、executable_entry/predicate/signal=null。现applies_to仅combat_line/card_pick/potion/rest/shop，predicate亦无event.id、event.options或事件报价字段；不能合法把事件选择冒充shop或card_pick。因此同产的是对应的真实研究候选说明，0条合法可执行rk，未扩schema。每项保留独立情境、证据、反向结果、缺列和原owner下一步。

正式knowledge消费者、六项rk消费者/原capture/回放、Jev两臂与结果矩阵均缺；六条正式策略发布与生产工具读回也pending。#28开关、两臂、A/B、模型/MC/Jev/游戏/full/tick均未启动。实际正式学习账本登记、锁内发布及读回交原通道，本批source-ledger只是scratch来源账，不冒正式ledger。自然查询/采用/收益均0，未关闭科学父。

## 验证与交接

6条策略通过parseStrategyLibrary和现有event/幕匹配、shop不匹配的离线核验；正文484～511 UTF-8 bytes。证据一致性核40次芝士成本/遗物、74次跨越移除、50次潜水报价及全部1927行摘要/截止均通过。无源码改动，tsc/vitest/cases保留null；不跑full、不安装依赖。gitleaks 8.30.1对本批产物扫描无泄漏，回执见scratch/gitleaks-validation.json。

启动脚本只证明请求gpt-6.1-sol/high/fast；额度未知、原生turn_context/服务档回执未核，所以不报实际档位已生效，不报未经原记录核实的使用量/耗时。没有修改启动、账号/home/config/权限或在途会话。

整批已在两小时停点前完成，交付原发布owner处理六条文字及knowledge的正式学习账本/发布；六项rk等待事件题型/事实合同及原冻结回放输入。无新建代码提案，code_proposals/implementation_domains/proposal_results/fixes均为空。下一单元由原宿主排队，本模型不自行派单。本unit标processed只表示真实候选存在且有去向；rk局部waiting、正式发布/读回及科学父继续pending。

以下JSON为result.json原字节，最终回复使用同一对象和相同序列化：

'''
(RUN/'report.md').write_bytes(text.encode()+b'```json\n'+raw+b'```\n')
extracted=(RUN/'report.md').read_bytes().rsplit(b'```json\n',1)[1].split(b'```',1)[0]
assert extracted==raw and json.loads(extracted)==result
print(json.dumps({'report':str(RUN/'report.md'),'result_bytes':len(raw),'same_json':True,'support_runs':len(result['own_support_runs'])},ensure_ascii=False))
