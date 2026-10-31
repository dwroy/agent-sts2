import collections
import hashlib
import json
import pathlib

P = pathlib.Path(__file__).parent.resolve()
W = P.parents[3]
PURCHASES = json.loads((P / 'purchase-evidence.json').read_text())
STATS = {r['relic_id']: r for r in json.loads((P / 'purchase-statistics.json').read_text())}
EXTERNAL = json.loads((P / 'external-relic-rows.json').read_text())


def write(name, data):
    raw = (json.dumps(data, ensure_ascii=False, indent=2) + '\n').encode()
    (P / name).write_bytes(raw)
    return hashlib.sha256(raw).hexdigest()


COMMON_LIMITS = [
    '自有Silent A10、游戏版本unknown；无重试证据不证明无SL，重试/预判必死不拆成独立局。',
    '购买是观察到的动作，不是最优、因果改善、胜率提升或固定购买顺序；现有样本稀疏且所选购买局全部终败。',
    '购买前最近状态是已记录决策点；原生ts与动作非原子，已核同层后继、金币和目标遗物变化；缺未执行反事实。',
    '开店货架/金币为代理，不代替后续购买前状态；未观察购买不解释为明确拒选，场景和分层可共享局。',
    '外部上传自选、玩家独立性/SL未知；节点末资源非购买前资源；拥有/取得不等于有选择，终局牌组/簇不作当前触发。',
    '没有历史机制改动对照，v0.107–v0.111逐版本/幕保留原分母，不补成机制未改，不跨版本合并。',
]

SPECS = [
    ('skull-existing-poison', 'SNECKO_SKULL', '已有施毒牌时比较头骨的增量与生存预算', [1, 2, 3],
     '货架有异蛇头骨、当前已有能施毒的牌时，比较增强现有施毒与另买毒源/防御，并核剩余金币。自有A10版本unknown：10局10次购买均见头骨入栏、牌组张数不变，花95–197金；9局重试/判死、1局无重试证据，均终败。\n范围：按当时牌文和牌组判断；增毒数占位未知，本批未核战斗兑现或对照收益。C7LERZPCRFZ1购买时仅3HP，不能以有毒源证明启动安全或必买。',
     'Check current poison sources and survival budget before buying Snecko Skull',
     ['silent-snecko-skull-poison-application'],
     '既有条目是战斗施毒机制；本条是具名货架、当前施毒牌与金币的购买情境，不重写或重复计旧9局机制证据。'),
    ('fan-current-attack-supply', 'ORNAMENTAL_FAN', '已有刀源/低费攻击时比较折扇与直接防御', [1],
     '货架有精致折扇、当前有刀源或低费攻击时，比较同轮攻击换挡与直接补防；先核攻击能否同轮兑现。G3TD6JEN47KT F12已有刀刃之舞和两张切割，花208金买折扇，258→50；当时斗篷与匕首标价49。1局1次购买，牌组不变，终F24败。\n范围：Silent A10/版本unknown/无重试证据；原牌文次数和挡量占位未知，本批不重验旧机制，不保证触发、挡够或购买更优。',
     'Compare attack-dependent Fan defense with immediate defensive purchases',
     ['silent-ornamental-fan-attack-block'],
     '既有折扇条目描述已持有后的计数/格挡；新情境比较商店购买、当前刀源和直接防御备选。旧数值未重新验证。'),
    ('chemical-x-owned-target', 'CHEMICAL_X', '先区分已持X牌与未来才可能取得的X牌', [1, 2, 3],
     '货架有化学物X时，先区分当前已持X牌与未来才可能拿到的目标，再与当前防御/留金比较。自有A10版本unknown的5局5次购买花152–214金：4次已持萎靡或串刺；0PH64C4AWAX9 F5买时没有X牌，不能算当时已改善牌组。5局均含重试/判死且终败。\n范围：以当前costs_x/牌文核目标；加成数占位未知，未来拿牌不回填当前触发；这不证明无X牌永不该买，也不证明已有X牌必买。',
     'Separate owned X-card synergy from speculative future X-card acquisition',
     ['silent-chemical-x-observed-effects'],
     '旧条目验证战斗中已持X牌的兑现；本条购买时序含同一0PH局F5尚无X牌，二者适用时间不同，不把其F6之后事实回填F5。'),
    ('membership-reprice-current-cart', 'MEMBERSHIP_CARD', '购买会员卡后按实际新价重算本店清单', [1, 2, 3],
     '决定买会员卡时，把卡本身支出与本店实际购物需求一起算；买后读回新价再核清单，不把未来商店折扣当已兑现收益。A10版本unknown的4局4次购买花189–226金，均核同店标价下降；9TG1RP5LFAAK F3先付189，264→75，回响斩标价37→18。\n范围：4局均重试/判死、均终败；ZE2DNC29WWHB在3HP花194买卡，次层终败。未证明折扣回本或应先于保命采购。',
     'Reprice the actual cart after Membership Card and include its upfront cost',
     ['silent-shop-joint-budget'],
     '既有joint-budget仅记录共同预算；本条新增同店实际价格变化/会员卡前置成本。黄金印留金条目保持既有ID，不另造同义条目。'),
    ('potion-belt-current-supply', 'POTION_BELT', '已有供药条件时分开估容量与当前药水', [2],
     '货架有药水腰带且已持供药遗物时，把新增容量与实际药水内容分开比较，不因未满栏就忽略容量，也不把空格当药。VLZ6CCT8AQ0A F20持白兽雕像、AR523ATD2G4W F21持小邮箱；分别花185/180金，栏位均2→4，占用仍1/0，牌组不变。\n范围：Silent A10/版本unknown；2局2机会均无重试证据、均终败。只证实当步容量，未来补药及收益未知，仍比较当前药水/防御的机会成本。',
     'Compare extra potion capacity with current supply and actual contents',
     ['silent-brain-potion-full-shop-replacement'],
     '既有条目是满栏后弃换药；本条两局购买时均未满，研究供药条件与容量购买，不复制满栏换购经验。'),
    ('whetstone-eligible-attack-pool', 'WHETSTONE', '按随机升级的攻击牌池估磨刀石而非指定核心牌', [2],
     '货架有磨刀石时，先列当前未升级攻击牌池，按随机结果比较升级价值；产刀的技能/能力不能因产刀就算攻击升级目标。YXY2RL1E83HM F28有刀刃之舞/飞刀风暴，花188金，782→594；后继实际只见一张打击和一张切割变为升级，牌组张数不变。1局1次购买，终F48败。\n范围：Silent A10/版本unknown/无重试证据；这次两张升级不保证下次命中核心，也未证明比186金弹珠袋或202金忍术卷轴更优。',
     'Inspect the eligible attack upgrade pool instead of assuming a core upgrade',
     [],
     '未找到相同具名遗物购买情境；旧钓鱼竿随机升级机制不是磨刀石，不移植其样本或机制。'),
]

knowledge = []
strategies = []
reflex = []
mapping = []
statuses = []
own_runs = set()
for slug, rid, title, acts, text, label, related, dedup in SPECS:
    xs = [x for x in PURCHASES if x['selected_relic']['relic_id'] == rid and x['stratum']['ascension'] == 10]
    own_runs.update(x['decision']['run_id'] for x in xs)
    kid = 'silent-relic-' + slug
    sid = 'silent-brain-relic-' + slug
    rk = 'silent-rk-relic-' + slug
    evname = slug + '-evidence.json'
    ext = [r for r in EXTERNAL['rows'] if r['value'] == 'RELIC.' + rid]
    evsha = write(evname, {'source': 'own', 'game_version': 'unknown', 'selection': 'frozen506 Silent A10; exact purchase before/after; no outcome-based screening',
                          'purchases': xs, 'statistics': STATS[rid], 'external_contrast': ext, 'external_contrast_status': 'unassessed', 'limitations': COMMON_LIMITS})
    observations = [{'run_id': x['decision']['run_id'], 'floor': x['decision']['floor']} for x in xs]
    evidence = [{'type': 'own', 'run': o['run_id'], 'floor': o['floor'], 'ref': str(P / evname)} for o in observations]
    entry = {'id': kid, 'version': 1, 'title': title, 'source': 'own', 'game_version': 'unknown', 'character': 'silent', 'ascensions': [10],
             'direction_magnitude_sample_scope': text, 'evidence_path': str(P / evname), 'evidence_sha256': evsha, 'own_support_runs': sorted(set(o['run_id'] for o in observations)),
             'observed_purchases': len(observations), 'purchase_strata': STATS[rid]['purchase_groups'], 'opportunity_strata': STATS[rid]['offer_groups'],
             'external_source': 'external:sts2fun', 'external_contrast_status': 'unassessed', 'external_rows_path': str(P / 'external-relic-rows.json'),
             'external_versions': ['v0.107', 'v0.108', 'v0.109', 'v0.110', 'v0.111'], 'mechanism_change_alignment': 'unknown; no cross-version pooling',
             'counterexamples': '所选A10购买局均终败；没有随机同起点反事实，不能把兼容性/购买本身称收益。', 'limitations': COMMON_LIMITS,
             'related_existing_ids': related, 'deduplication': dedup, 'formal_publication': 'pending', 'consumer_readback': 'pending'}
    knowledge.append(entry)
    strategies.append({'id': sid, 'version': '1.0.0', 'trigger': {'question_types': ['shop'], 'acts': acts}, 'strategy': text, 'evidence': evidence,
                       'source': 'own', 'confidence': .30 if rid not in ['MEMBERSHIP_CARD', 'POTION_BELT', 'WHETSTONE'] else .35,
                       'formal_publication': 'pending', 'consumer_readback': 'pending', 'knowledge_candidate_id': kid, 'rk_candidate_id': rk})
    predicate = {'op': 'and', 'args': [
        {'op': 'any', 'field': 'shop.stock', 'arg': {'op': 'and', 'args': [{'op': 'eq', 'field': 'shop_item.id', 'value': rid}, {'op': 'eq', 'field': 'shop_item.stocked', 'value': True}]}},
        {'op': 'exists', 'field': 'player.gold'}, {'op': 'exists', 'field': 'player.deck'}]}
    reflex.append({'schema': 'reflex-entry-v1', 'id': rk, 'version': 1, 'applies_to': 'shop', 'predicate': predicate,
                   'signal': {'kind': 'tag', 'value': 'silent-relic-observed-' + slug, 'unit': 'label'}, 'label_en': label,
                   'evidence': {'observations': observations, 'n_support': len(set(o['run_id'] for o in observations)), 'n_contradict': 0},
                   'confidence': .30, 'scope': {'character': 'silent', 'ascensions': [10]}, 'directions': [], 'cores': [], 'combos': [], 'source_experience': [kid],
                   'sources': [{'source': 'own', 'path': str((P / evname).relative_to(W)), 'sha256': evsha, 'game_version': 'unknown', 'retrieved_at': '2026-10-24',
                                'sample': {'runs': len(set(o['run_id'] for o in observations)), 'players': None, 'selection': '具名遗物购买前后；n_support只支持事实/兼容性提醒，不支持因果改善，A10重试分层及反例见来源账本。'}}]})
    mapping.append({'context': slug, 'disposition': 'new_candidate', 'knowledge_id': kid, 'strategy_id': sid, 'rk_id': rk, 'paired': True, 'evidence': str(P / evname), 'reason': dedup})
    for kind, target in [('knowledge', kid), ('strategy', sid), ('rk', rk)]:
        statuses.append({'kind': kind, 'id': target, 'formal_publication': 'pending', 'consumer_readback': 'pending', 'production_query': 'pending', 'natural_adoption': 'pending', 'benefit': 'unknown'})

# An observed exchange is retained without inventing an event enum in the rk contract.
ex = json.loads((P / 'exchange-evidence.json').read_text())
own_runs.update(x['decision']['run_id'] for x in ex)
kid = 'silent-relic-exchange-current-sacrifice'
sid = 'silent-brain-relic-exchange-current-sacrifice'
rk = 'silent-rk-relic-exchange-current-sacrifice'
text = '兰伟德实际给出药水、100金币、具名旧遗物三选时，比较付出物当前用途与随机奖励数，别把两件随机当两件已知强遗物。7X0W3U8TVA2A F29交打击木偶、Y5H4CFAQ2WTG F20交铲子，后继各少旧1件、多新2件，HP/金币不变。\n范围：Silent A10/版本unknown；2局2次机会、均无重试证据且终败。新遗物身份是事后结果，不能回填选项或声称此交换优于付药/金币；未知旧遗物未来兑现与随机分布。'
knowledge.append({'id': kid, 'version': 1, 'title': '遗物交换比较实际牺牲物与未知随机回报', 'source': 'own', 'game_version': 'unknown', 'character': 'silent', 'ascensions': [10],
                  'direction_magnitude_sample_scope': text, 'own_support_runs': [x['decision']['run_id'] for x in ex], 'observed_opportunities': 2,
                  'evidence_path': str(P / 'exchange-evidence.json'), 'limitations': COMMON_LIMITS + ['只抽核两次真实三选交换，不是该事件总体独立分母。'],
                  'formal_publication': 'pending', 'consumer_readback': 'pending', 'rk_disposition': 'waiting: event applies_to/predicate not in frozen contract'})
strategies.append({'id': sid, 'version': '1.0.0', 'trigger': {'question_types': ['event'], 'acts': [2]}, 'strategy': text,
                   'evidence': [{'type': 'own', 'run': x['decision']['run_id'], 'floor': x['decision']['floor'], 'ref': str(P / 'exchange-evidence.json')} for x in ex],
                   'source': 'own', 'confidence': .30, 'formal_publication': 'pending', 'consumer_readback': 'pending', 'knowledge_candidate_id': kid, 'rk_candidate_id': rk})
write('rk-exchange-gap.json', {'id': rk, 'character': 'silent', 'state': 'waiting', 'candidate_type': 'non-executable-rk-spec', 'paired_strategy': sid,
                              'text': text, 'evidence_path': str(P / 'exchange-evidence.json'), 'reason': '冻结reflex-entry-v1.applies_to不含event、predicate白名单无event.options；不冒shop或combat_line，不扩schema。',
                              'next_step': '原消费者owner提供已授权事件题型与事实合同后再投影，不需重跑本单元或读未来事实。', 'formal_publication': 'pending', 'consumer_readback': 'pending'})
mapping.append({'context': 'exchange-current-sacrifice', 'disposition': 'new_candidate_partial_rk_waiting', 'knowledge_id': kid, 'strategy_id': sid, 'rk_id': rk, 'paired': False,
                'evidence': str(P / 'exchange-evidence.json'), 'reason': '两次原生三选/后继已核，文字与knowledge已落盘；事件rk不在冻结合同，缺口单独保留。'})
for kind, target in [('knowledge', kid), ('strategy', sid), ('rk', rk)]:
    statuses.append({'kind': kind, 'id': target, 'formal_publication': 'pending', 'consumer_readback': 'pending', 'production_query': 'pending', 'natural_adoption': 'pending', 'benefit': 'unknown'})

for entry in knowledge:
    entry['input_manifest_sha256'] = '0f219b1d35390d0ba8076e591b71fbee12c8ec0ff438e79680b4357b42c1fb14'
    entry['own_frozen_scope_sha256'] = 'da915311f233ba0c350f5278a630a61fee1ab9540c520d407f6227e9c87e3478'
    entry['own_retrieved_at'] = '2026-10-24'
    entry['evidence_sha256'] = hashlib.sha256(pathlib.Path(entry['evidence_path']).read_bytes()).hexdigest()
    entry['external_collected_at'] = '2026-10-21'
    entry['external_aggregate_sha256'] = '4cf36c85eee760ed8e74495c1758e0228bbe1214789d3d0bd97052d5ca6a1f9d'
    entry['external_support_for_current_decision_ranking'] = False
write('knowledge-candidates.json', {'schema': 'scratch-relic-decision-candidates-v1', 'character': 'silent', 'entries': knowledge})
write('strategy-candidates.json', {'schema': 'brain-strategies-v1', 'character': 'silent', 'entries': strategies})
write('rk-candidates.json', {'schema': 'reflex-file-v1', 'character': 'silent', 'entries': reflex})
write('context-mapping.json', mapping)
write('candidate-status.json', statuses)
write('own-support-runs.json', sorted(own_runs))
print('knowledge', len(knowledge), 'strategy', len(strategies), 'valid rk candidates', len(reflex), 'rk gap', 1, 'own support runs', len(own_runs))
print('strategy bytes', [(s['id'], len(s['strategy'].encode())) for s in strategies])
