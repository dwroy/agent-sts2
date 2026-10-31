import datetime
import hashlib
import json
import pathlib
import subprocess

P = pathlib.Path(__file__).parent.resolve()
OUT = P.parent
W = P.parents[3]
BASE = 'efc1a53795e5e13be1b89453659562b0d9cfcb20'
BATCH = '20261024-191311-strategy-proposal'
INPUT_SHA = '0f219b1d35390d0ba8076e591b71fbee12c8ec0ff438e79680b4357b42c1fb14'


def read(name):
    return json.loads((P / name).read_text())


def write(name, data):
    (P / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip() == BASE
assert not subprocess.check_output(['git', 'diff', '--binary'])
assert not subprocess.check_output(['git', 'diff', '--cached', '--binary'])
(P / 'tracked.diff').write_bytes(b'')
mapping = read('context-mapping.json')
knowledge = read('knowledge-candidates.json')['entries']
ledger = read('source-ledger.json')
ledger['entries'] = [{k: x[k] for k in ['id', 'source', 'game_version', 'input_manifest_sha256', 'own_frozen_scope_sha256', 'own_retrieved_at', 'evidence_path', 'evidence_sha256', 'own_support_runs', 'formal_publication', 'consumer_readback']} for x in knowledge]
ledger['deduplication'] = {'existing_strategy_entries_scanned': 61, 'existing_reflex_entries_scanned': 109, 'existing_experience_entries_scanned': 245,
                           'method': '全库程序关键词/ID检索；学习者通读头骨/折扇/化学物X及商店旧条目命中正文，按购买/战斗/换药的实际场景区分，不按同名遗物自动合并。',
                           'existing_mechanic_reference_only': ['silent-snecko-skull-poison-application', 'silent-ornamental-fan-attack-block', 'silent-chemical-x-observed-effects'],
                           'unchanged_same_context_reference': ['silent-brain-shop-golden-reserve', 'silent-rk-shop-golden-reserve'],
                           'same_id_updates': 0, 'bytewise_reuse_counted_as_new': 0}
write('source-ledger.json', ledger)

# Recheck the original allowed shards after all queries, without opening shared logdb.
scope = json.loads((W / 'paper/materials/20261024-issue51-own-fallback-ops/own-506-scope.json').read_text())
root = pathlib.Path('/home/dw/Projects/agent-sts2')
checks = []
for pin in scope['verified_read_only_shards']:
    path = root / pin['path']
    raw = path.read_bytes()
    assert len(raw) == pin['bytes'] and hashlib.sha256(raw).hexdigest() == pin['sha256']
    checks.append({'path': pin['path'], 'sha256': pin['sha256'], 'bytes': pin['bytes'], 'nlink': path.stat().st_nlink, 'verified_after_read': True})
write('closing-verification.json', {'at': datetime.datetime.now().astimezone().isoformat(), 'head': BASE, 'tracked_diff_bytes': 0, 'cached_diff_bytes': 0, 'own_shards': checks, 'formal_knowledge_changes': 0, 'commits': 0})

counts = {'new_contexts': 7, 'complete_text_rk_pairs': 6, 'partial_contexts_rk_waiting': 1,
          'knowledge_candidates': 7, 'strategy_candidates': 7, 'validated_rk_candidates': 6, 'rk_specs_waiting': 1,
          'same_id_updates': 0, 'bytewise_reuses': 0, 'aliases': 0,
          'external_aggregate_rows_retained': 119, 'external_rows_for_six_purchase_contexts': 106,
          'comparison_contexts_reaching_100_per_group': 0, 'formal_publications': 0,
          'production_consumer_readbacks': 0, 'natural_queries_observed': 0, 'natural_adoption': None, 'benefit': None,
          'consecutive_zero_new_batches': 0}
destinations = []
for x in mapping:
    destinations.extend([{'kind': 'knowledge', 'id': x['knowledge_id'], 'path': str(P / 'knowledge-candidates.json')},
                         {'kind': 'strategy', 'id': x['strategy_id'], 'path': str(P / 'strategy-candidates.json')}])
    if x['paired']:
        destinations.append({'kind': 'rk', 'id': x['rk_id'], 'path': str(P / 'rk-candidates.json')})
reason = '已落盘7个遗物决策情境：6个购买情境有文字策略/rk配对；1个真实交换情境有knowledge与文字，rk因冻结合同缺event题型waiting。100门槛比较0个；均为稀疏观察候选，未正式发布或读回。'
result = {'task': 'strategy-proposal', 'character': 'silent', 'code_proposals': [], 'implementation_domains': [], 'proposal_results': [],
          'batch': BATCH, 'base': BASE, 'runs': [], 'fixes': [], 'merged': None, 'tests': {'tsc': None, 'vitest': None, 'cases': None},
          'report': str(OUT / 'report.md'), 'external_source': 'issue51-decision-relic-001-20261024', 'input_sha256': INPUT_SHA,
          'external_results': [{'id': 'external-decision-relic-001', 'state': 'processed', 'destinations': destinations, 'reason': reason}],
          'own_support_runs': read('own-support-runs.json'), 'decision_output_counts': counts,
          'partial_waiting': [{'id': 'silent-rk-relic-exchange-current-sacrifice', 'state': 'waiting', 'destinations': [], 'path': str(P / 'rk-exchange-gap.json'),
                               'reason': '真实交换证据已落盘；冻结reflex-entry-v1.applies_to无event且predicate无event.options，不伪装shop、不扩schema。'}],
          'context_mapping': str(P / 'context-mapping.json'), 'coverage': str(P / 'coverage.json'), 'source_ledger': str(P / 'source-ledger.json'),
          'candidate_validation': str(P / 'candidate-validation.json')}
raw = (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode()
(OUT / 'result.json').write_bytes(raw)

text = f'''# 遗物决策独立单元：{BATCH}

{reason}

本单元完成目标5–10条中的6条完整文字/rk配对，另有1条交换文字/knowledge及明确rk缺口。7个情境不是20个独立发现：20为7 knowledge、7 strategy、6合法rk的数据表现形式。新建情境7、同ID更新0、逐字节复用0、别名0；统计行单列。外部身份runs=[]；自有支持另列23局，不混外部分母。

## 冻结身份与边界

- learn.json本批external_source、external_binding、worktree、key与宿主本次plan核同；HEAD={BASE}，开始及收尾均一致，无提交、无tracked/cached差异。
- input_manifest={INPUT_SHA}，14113字节；work_spec=d943bb127f9dcd43ffba2fbda33039de11caca5b8c1a4069f7a1caf8a4cdfc5d，4492字节。缺失历史输入通过原materialize逐精确路径恢复，返回HEAD和blob核同，不改注册/请求。
- #54原冻结清单实际为3 manifest+129数据叶=132项，另核11个只读自有分片；任务简称“132叶”没有另造3个数据文件。全部大小/SHA通过，分片读完后再核同；nlink变化不当坏字节。详见scratch/input-verification.json、closing-verification.json。
- 已核并读取#27/#28/#42/#55冻结合同；当前候选只用已支持shop/event题型和正文当前条件，不用终局聚类、archetype绑定或测试几何。HEAD保持dispatch_base；源码/正式知识/共享统计/main/live未改，无学习正式账本登记或上线通知。
- 原请求参数gpt-6.1-sol/high/fast来自tui.sh；未核原生turn_context/服务回执，实际模型/档位/用量/耗时未知。没有修改启动、账号/home/config、权限或在途线程，没有模型/MC/Jev/游戏/full/强制tick。

## 情境与逐项去向

每条均formal_publication=pending、consumer_readback=pending；rk严格对象的逐ID状态另存candidate-status.json。以下是本批完整方向、幅度、样本与范围，来源完整事实另附可核文件。
'''
for i, (entry, m) in enumerate(zip(knowledge, mapping), 1):
    text += f"\n### {i}. {entry['title']}\n\n{entry['direction_magnitude_sample_scope']}\n\n"
    text += f"disposition={m['disposition']}；knowledge={m['knowledge_id']}；strategy={m['strategy_id']}；rk={m['rk_id']}。\n\n"
    text += f"证据：{entry['evidence_path']}；SHA={entry['evidence_sha256']}。{m['reason']}\n"

text += '''
## 机会分母、分层与反向结果

自有506名单与原六流截止保持，排除Z2手动局、KF9缺末态、BP9及后续局。DuckDB仅:memory:、threads=2、显式11分片中的decisions/frames文件名单，先JOIN506名单并限制off+len≤原截止，再查询。所有原始seek均留offset/bytes/SHA/cutoff，未拷原始状态流或共享logdb，未init/sync。

1,329个每局每层首次开店机会中，274个初始货架含所查六遗物；逐遗物/进阶/重试分层保存于purchase-statistics.json。以下A10机会数是初始开店货架代理，购买列才是后续真实动作；没有购买记录不冒拒选意图，行与组可共享同一局，不累加为独立局：

| 遗物 | 无重试证据：购买/初始在售机会（局） | 重试/判死：购买/初始在售机会（局） | 真实购买局数 |
|---|---|---|---|
'''
for stat in read('purchase-statistics.json'):
    groups = {x['attempt_scope']: x for x in stat['offer_groups'] if x['ascension'] == 10}
    a, b = groups['no_retry_evidence'], groups['retry_or_predicted_death']
    text += f"| {stat['relic_id']} | {a['bought_same_run_floor']}/{a['opportunities']}（{a['independent_runs']}局） | {b['bought_same_run_floor']}/{b['opportunities']}（{b['independent_runs']}局） | {len(stat['a10_purchase_scenes'])} |\n"
text += '''
六类购买共23次、21个去重A10局；交换另抽核2局2次，总自有支持23局。全部所选购买/交换局终败；支持的只是当时构筑兼容、成本、实际动作和后继资源，不是收益。无X牌先买化学物X、3HP买会员卡/头骨、买磨刀石升级到普通攻击等限制保留。非A10购买另列原分层，不计A10支持。只检得A0的干瘪之手购买未新增；本批没有重开旧Boss/开局/休息任务。

1,046条chest/relic的抽取原理由全部为only one relic offered，没有把它们计为多选机会；未逐个seek宝箱状态，不冒全面原帧验收。自动获得/精英掉落与有货架购买严格分开。

外部source=external:sts2fun，公开URL=https://sts2.fun/static/sts2_public.db.zst；下载/采集2026-10-21，DB SHA=1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5，statistics.json SHA=4cf36c85eee760ed8e74495c1758e0228bbe1214789d3d0bd97052d5ca6a1f9d。筛选Silent/A10/单人/valid/非弃局/无modifiers；许可未找到明确再分发条款，只沿已冻结聚合署名，不读原库/玩家标识、不重新下载。

v0.107/v0.108/v0.109/v0.110/v0.111原上传分母分别2932/683/583/411/1739，精确8个build原分母在source-ledger.json。未取得机制改动对照，逐版本保留，不将unknown当未改，不因unknown停止可用组。外部只记录显式bought_relics，没有当前真实构筑、完整拒选货架或购买前金币，故该缺列子项用自有主证据，外部只作独立描述对照，未写mixed假一致。

外部保留119行（含未新增的干瘪之手对照），六购买情境引用106行，各版本/幕原分母与反向结局均在external-relic-rows.json。v0.111如下，单元格为购买上传局n/其中整局赢家数；同一上传可能跨幕，不求和，不把此比率称购买收益：

| 遗物 | 幕1 n/赢家 | 幕2 n/赢家 | 幕3 n/赢家 |
|---|---|---|---|
'''
external = read('external-relic-rows.json')
for rid in [s['relic_id'] for s in read('purchase-statistics.json')]:
    rows = {r['act']: r for r in external['rows'] if r['version'] == 'v0.111' and r['value'] == 'RELIC.' + rid}
    text += '| ' + rid + ' | ' + ' | '.join(f"{rows[a]['distinct_uploaded_runs']}/{rows[a]['whole_run_winning_uploads']}" for a in [1, 2, 3]) + ' |\n'
text += '''
这些具名比较均未达到每组100，达标比较数=0；本单元是遗物情境候选，不是单牌20–30卡比较批。不以重叠cell或终局库存凑100，也不否决已核的稀疏方向和资源事实；不交固定购买排序、因果改善或安全血线。外部v0.111第三幕折扇8/8等强观察也保留生存/自选/未选项缺失限制，不提升为必买。

## 覆盖、消费者与未完成项

程序核200次购买前后、1,329个初始开店状态、所选23次A10购买的原生/原计划事实与2次交换。模型实际通读所选23次购买的数值核对/具名备选，详细抽核13个购买前牌组资源窗口及2次交换原题/后继；未声称逐页通读1,329个开店状态。全部1,765次原始seek（含重复窗口）有凭证，去重窗口/字节另见coverage.json和各*-seeks.json。旧理由只作定位，模拟估计/赢家选择不作为实际收益或机制事实。

匿名代表只经manifest验SHA的有界reader，cluster1/6各offset0、limit1一对一页；模型通读4条完整节点投影（2胜2负，共143节点），页字节和SHA保留external-pages/。每簇另9对及其他簇未读，代表不是全字段快照；簇仅定位，不据此命名/触发玩法。c6胜/负都在精英节点获得磨刀石，不能当购买对照。自有完整局四section本批未通读（0局），不声称完整剧本。

六个rk为shop的描述tag，不含hp/win/contrast收益数或行动命令；谓词只检查当前具名在售遗物/金币/牌组存在，详细兼容条件需读文字，不能把tag当已满足兼容或已胜出。交换rk文件是non-executable spec，state=waiting；冻结applies_to无event、predicate无event.options，绝不伪装成shop，不自行扩schema。文字event策略可用正文条件表达，仍待正式消费者。

knowledge候选使用scratch专用容器，现无该自定义格式正式消费者；7文字策略、6合法rk均未发布，未在生产工具读回。交换rk合同/消费者缺口单列rk-exchange-gap.json。7个情境的生产查询、自然采用/收益、正式账本/发布锁和科学父全部pending/open；候选完成不关闭父。已有黄金印/joint-budget等原条目不复制上线，旧机制ID只关联不重计新成果。

固定检查：生产parseStrategyLibrary通过7条；validateReflexEntry通过6条，6个在售正例/售罄负例符合，非shop/event题型不命中。仅固定scratch格式与谓词检查，未做原生产题回放、模型调用或正式读回。无源码改动，tsc/vitest/cases按本无源码批保持null。首次内存VIEW预备参数失败已保留说明并修正查询写法，不冒代码失败。原分片收尾SHA同、HEAD同；gitleaks对scratch扫描无泄漏，最终report/result另核。

完整来源账本source-ledger.json；逐情境处置context-mapping.json；覆盖coverage.json；候选逐ID状态candidate-status.json；输入验核input-verification.json；格式凭证candidate-validation.json。冻结前序计数只保留input_manifest.predecessor原4新/1更，不把旧成果作本批新增。本批新增非0，不触发连续两批0新增停产规则，不自行开下一单元。

## 机器结果（下块与result.json及最终回复相同）

'''
(OUT / 'report.md').write_bytes(text.encode() + b'```json\n' + raw + b'```\n')
embedded = (OUT / 'report.md').read_bytes().rsplit(b'```json\n', 1)[1].split(b'```', 1)[0]
assert embedded == raw
assert json.loads(embedded) == json.loads((OUT / 'result.json').read_bytes())
write('result-integrity.json', {'same_raw_bytes': True, 'same_parsed_fields': True, 'result_sha256': hashlib.sha256(raw).hexdigest(), 'result_bytes': len(raw), 'report_sha256': hashlib.sha256((OUT / 'report.md').read_bytes()).hexdigest()})
print('finished', str(OUT / 'report.md'), 'destinations', len(destinations), 'result_bytes', len(raw))
