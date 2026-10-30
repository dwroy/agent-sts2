"""Produce the #85 intermediate review inventory, never a runtime knowledge release."""
import collections
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
OUT = Path(__file__).resolve().parent
SHA = '780224842c5325657ea95bd98062d1fded979b5b6c3378ea501cebecc7fba0f8'
raw = (ROOT / 'paper/materials/20261030-issue81-injection-audit-ops/bound-strategy-document.json').read_bytes()
assert hashlib.sha256(raw).hexdigest() == SHA
entries = json.loads(raw)['entries']
mapping = json.loads((OUT / 'source-map.json').read_text())
hash_scopes = json.loads((OUT / 'hash-scope-verification.json').read_text())
assert hash_scopes['checks_passed']
supplemental = json.loads((OUT / 'supplemental-sources.json').read_text())
ordinary_raw = (ROOT / '.worktrees/live/knowledge/characters/silent/strategy-entries.json').read_bytes()
assert hashlib.sha256(ordinary_raw).hexdigest() == '7cadbbefbdebc6f619475513dc70cb84b38e5d9f4ca5a331df2dca0755ae9719'
ids116 = {e['id'] for e in json.loads(ordinary_raw)['entries']}
assert ids116 == {e['id'] for e in entries[:116]}


def load(path):
    raw = (ROOT / path).read_bytes()
    sources.append({'path': path, 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)})
    return json.loads(raw)


def cached_source(needle, suffix='context-statistics.json'):
    meta = next(s for s in supplemental if needle in s['path'] and s['path'].endswith(suffix))
    raw = Path(meta['local_cache']).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == meta['sha256']
    sources.append(meta)
    return json.loads(raw), meta['path']


sources = []
routes_path = '.worktrees/issue80-study-routes-20261026/review-output/tables.json'
routes = load(routes_path)
potion_stats, potion_path = cached_source('144312/learner/runs/')
rest_stats, rest_path = cached_source('154311/learner/runs/')
early_stats, early_path = cached_source('161310/learner/runs/')
shop_path = 'paper/materials/20261024-issue51-shop-paired-ops/original/scratch/shop-statistics.json'
shop_stats = load(shop_path)
removal_path = 'paper/materials/20261024-issue51-removal-detail-ops/original/221313/scratch/statistics.json'
removal_stats = load(removal_path)
timeline_path = 'knowledge/external/sts2fun/builds-v1/timeline.json'
timeline = load(timeline_path)
assert all(x['status'] == 'verified' for x in mapping['windows'])
# The route aggregate belongs to the retained prior revision, not the newly added
# two-upload anecdote. Bind it to the original candidate explicitly.
prior_route, prior_path = cached_source('154311/learner/runs/', 'route-candidate.json')
assert prior_route['entries'][0]['id'] == entries[34]['id']
assert any(prior_route['entries'][0]['strategy'] in old['strategy'] for old in entries[34]['prior_texts'])

# This is an explicit, fixed-document content audit. Indices are pinned by the full SHA;
# output identities are always original IDs. No ID-prefix or keyword-based runtime policy.
CATEGORIES = {
    '构筑组合': list(range(45, 53)) + [68, 93, 94, 95, 112, 113, 114, 115, 128, 129, 130, 131, 132, 136] + list(range(142, 146)),
    'Boss打法': [0, 1, 2, 43, 44, 53, 54] + list(range(96, 102)) + list(range(124, 128)) + list(range(146, 152)),
    '路线资源': list(range(26, 36)) + [40] + list(range(55, 61)) + [109, 110, 111, 134] + list(range(152, 158)) + list(range(168, 173)),
    '单牌选牌': list(range(3, 26)) + [37, 38, 39, 41, 42] + list(range(75, 93)) + list(range(102, 109)) + [135] + list(range(137, 142)),
    '其他决策': [36] + list(range(61, 68)) + list(range(69, 75)) + list(range(116, 124)) + [133] + list(range(158, 168)),
}
category = {i: k for k, indexes in CATEGORIES.items() for i in indexes}
assert len(category) == 173 and sum(map(len, CATEGORIES.values())) == 173

# Every exclusion is attached to an actual claim or a retained contradiction. Pending
# status and absence of formal publication are intentionally absent from these rules.
minus = {}
for i in range(3, 26):
    minus[i] = ('direction_reversal', '原选牌前缀/状态或版本附件保留反向；不因总体达到50或现场有牌文就隐藏该对照主张。')
for i in [0, 1, 2, 40, 43, 53, 54]:
    minus[i] = ('retained_conflict_not_resolved', '原条目有自有contradict或conflict；对方通常是不同条件/持牌仍败的边界，未证明同窗口事实为假，但本轮不擅自清除广义策略的冲突状态。')
for i in [36, 37, 38, 69, 71, 72, 73, 116, 117, 118, 119, 120, 122, 123]:
    minus[i] = ('direction_reversal', '同条保留跨版本、跨幕或自有SL分层反向；即使部分资源/牌文事实可复核，也不把原复合条目整体升档。')
for i in [45, 49, 77, 80, 112, 114, 115, 129]:
    minus[i] = ('counterevidence_or_retained_conflict', '原组合/取得关联保留相反结果或明确contradict；没有删掉数值主张只保牌文来绕过B−。')
for i in [62, 63]:
    minus[i] = ('below_sample_and_mechanism_unverified', '分别只有1/5个自有局；核心加成/触发数占位未知，购买后入栏本身不能替代策略所需的战斗机制验证。')
minus[68] = ('below_descriptive_sample', '签名齐备后资源轨迹为自有2局及少量外部实例；只证选定案例，不是可复现确定性机制，也不能借终局簇总体补本签名分母。')
for i in [41, 42]:
    minus[i] = ('sample_unit_unresolved', '原CSV可核7821/4411个奖励屏幕，但未给该行对应的上传局数；不把屏幕数冒外部50上传门。此为已映射但分母单位待补，不是找不到来源。')
for i in [135, 136]:
    minus[i] = ('below_descriptive_sample', '外部选定总体分别20条上传，重复奖励4条上传/6节点和早晚取得10胜10负；无确定性机制主张，不达到50。')
for i in [138, 139, 141]:
    minus[i] = ('direction_reversal', '原#80候选明确记录其他历史状态翻向；原分母、负例和条件完整保留。')
minus[152] = ('direction_reversal', '外部v0.108第三幕同口径赢家精英均数较低；不忽略旧版本这一个反向单元来判A/B+。')
minus[153] = ('own_opposite_direction', '外部赢家HEAL较少，但自有retry_evidence三幕赢家HEAL较多；SMITH同向不能替复合结论清除相反自有层。')
minus[157] = ('direction_reversal', 'v0.111第一幕赢家商店支出157.815<输家158.392，而二三幕较高；原跨幕翻向保留。')
minus[171] = ('direction_reversal', '原条目明确以同药水不同幕关联方向可变为结论；提供、使用、终局持有仍分账，翻向条目本轮仅引用/查询。')

# Individually reviewed facts: the mechanism exception is not a default for low n.
# Printed text is distinguished from an observed transition and never presented as a
# replay of an unexecuted branch or a newly validated general simulation mechanism.
FACTS = {
    33: '当前KINDLE题文加5充能；11个已执行后继净回血0，不推能量或通关收益。',
    46: '现场尖啸牌文1费/本回合所有敌人失6力量/消耗；未把持牌后的整战净损当该牌收益。',
    48: 'fan_setup原表4次单步：2费、实际添加4刀/建立1层群伤；仅原1局窗口。',
    50: 'cloak_defense原表分列当步格挡、生成刀与仍未覆盖的来袭；不把产刀算已经出刀。',
    51: 'afterimage_generation原表：已建余像时刀舞生成当步+1挡，后续真出刀再各+1；未建窗口为0。',
    52: 'no_draw原表同一窗口：NO_DRAW_POWER=1、后空翻手8→7/挡2→17；不推禁抽解除规则。',
    58: 'NORMALITY现场牌文每回合最多出3牌；两个付费移除前后核金币及目标，不推删除收益。',
    59: '付100移除具名非基础牌的已执行交易及原牌文费用；不把最终败当删除错误或最优目标。',
    64: '会员卡购买前后同店同商品报价37→18且先付189；只证报价更新，不推回本或保命价值。',
    65: '药水腰带两次购买前后栏位2→4、占用仍1/0；容量和实际药水分开。',
    66: '磨刀石一次交易后张数不变且两张原攻击牌升级；不声称随机命中核心或未观察的升级池。',
    67: '两次实际交旧遗物后各少旧1/多新2、HP/金币不变；随机新身份不回填题面。',
    70: '桥当前重掷题文与跨越删牌后继可定位；只核当前报价/本次资源，文本与净变化不一致仍明示。',
    74: '灯笼钥匙当前交还题文和原完成后金币记录可定位；文本100与部分后继125分开，不认定固定净增。',
    75: '现场尖啸1费/本回合全体失6力量；持续窗口与长期防护分开，旧两组整胜关联不作命令。',
    76: '现场早有准备0费抽1弃1、杂技1费抽3弃1、投掷匕首1费9伤抽1弃1；不把0费当净增牌。',
    78: '现场扫腿2费/2虚弱11挡，冲刺2费/10挡10伤；同费不等于同用途。',
    79: '现场蛇咬2费保留/7毒；保留和施毒不等于当前已有防护或已结算伤害。',
    81: '原备选题面分别写弃2添2刀、弃全手等量抽、弃全手每弃1添1刀、按本回合已弃牌增伤。',
    82: '原备选题面群伤击杀才重复、随机多次、固有消耗单体分别列明；没有固定杀序。',
    83: '侧步和猎杀者原牌文分别为下回合得能/下回合抽牌；延迟资源不提前入账。',
    84: '猛扑/子弹时间/战斗专注/头槌现场文本分别核减费、禁抽和堆顶，不补未实打机制。',
    85: '终结技、精确切击、飞镖原文本分别按本回合攻击数/手牌数/手中技能计，不用牌组数代替。',
    86: '得能、抽牌、赋予奇巧、升级手牌的原文分别保留；未核奇巧定义不补推。',
    87: '必备工具回合开始抽弃与独门技术打出时抽牌保留的现场文本，时间窗分列。',
    88: '切割与刺杀原文本虽都0费但伤害/易伤/固有/消耗不同；不由名字补额外机制。',
    89: '刀扇与袖里乾坤原文本产4刀/产3刀及附效不同；未验证的减费持续范围仍未知。',
    90: '群蛇形态每打牌触发和涂毒未格挡攻击触发的原文本不同，不把两个计数等同。',
    91: '翻越撑击、匕首雨、突然一拳的原文本保留单次/多次、全体/单体；奇巧未解释。',
    92: '狩猎原文本为斩杀才额外奖励且消耗；未核奖励兑现率，不将每次打出视作稳定加牌。',
    93: '该题蛇咬2费7毒/保留及后空翻1费5挡抽2的实际牌文；下一战败不作拿牌因果。',
    94: '回响斩击该题1费全体10伤且击杀才重复的牌文；不把下一战净回血当单牌收益。',
    95: '华丽收场当前牌文明示空抽牌堆才可打；0费60伤不作无条件本轮伤害。',
    96: '当前扑咬窗口的原手牌/来袭/格挡与已记实际线；只留来源已观察状态，不归因单牌免伤。',
    97: 'SALIVATE窗口狂乱逃离的已记沙坑2→3、能量3→2；不扩为沙坑全机制或固定逃离次数。',
    98: 'SLEEP窗口毒雾/步法原能力值与后续醒转记录；不承诺还能睡几回合或最优启动顺序。',
    99: '已记力量/敏捷状态下防御6挡、打击4伤及三防18挡的算账；不把睡前数值搬到当前。',
    100: 'PLOW窗口动作前后显示来袭/格挡的原记录；横冲直撞等并存，不把全部降幅归虚弱。',
    101: 'BEAST_CRY当前不显示攻击、下一轮已显示攻击的原记录；再生回血不归施毒或证明安全。',
    102: '精密瞄准原牌文3费15伤/每已打1技能减1费；牌组有技能不是已打技能。',
    103: '跟踪原文本需目标虚弱才增加攻击伤害50%；未核目标状态不预支加成。',
    104: '紧勒每已出牌和神气制胜每回合五牌的原条件不同，不将持牌数当已出牌数。',
    105: '预判、究极防御、耸肩无视、坚定不移的费用/挡/抽牌/延迟触发文本分别保留。',
    106: '夜魇3费消耗/下回合复制与暗影步弃全手/下回合倍伤的原文；潜在目标不当未来手牌。',
    107: '速行者回合进行中抽牌触发与腐蚀波仅本回合抽牌触发的原文；未发生抽牌不入账。',
    108: '谋杀累计已抽牌增伤与华丽收场空抽牌堆可打的原文；牌组大小不代牌堆状态。',
    113: '串刺原题文8伤X次与其他选项费用/附效明确；X支付规则未知，不将面板0当固定免费伤害。',
    121: 'TRIAL商人两个当前菜单的诅咒与奖励原文分列；不套贵族回血规则，随机遗物身份未知。',
    124: '异鱼BECKON/FADE窗口已记能力与中毒变化；不把未显示攻击当整回合无伤保证。',
    125: '异鱼DE_GAS窗口原手牌/敏捷/挡及后继HP；呼唤持牌失血只是现场牌文，不造保留分支反事实。',
    126: '异鱼SCREAM带无实体的原窗口两次攻击各扣1；严格限定本窗口，不宣称所有伤害恒1。',
    127: '两张呼唤各自现场失6血的牌文及实打后33血记录；没有未打分支，不把旧均值改成固定罚值。',
    128: '蛇咬普通/升级费用和毒量原文可复核；第三张的实际跳过只是例子，不发布副本上限。',
    130: '原事件实际得到无尽与后题该牌1费/回合开始添刀的可见牌文；未抽到能力不预支。',
    131: '腐化当前附魔选项写伤害+50%/出牌失2HP，后牌文10→15；不推击杀链追加扣血次数。',
    132: '寻龙尺当前任务牌文不可打/进入5个问号后变化，以及实得富足的牌文；不固定五问号路线。',
    133: '勒紧该题原文只让防御额外得4挡；5张防御不作本轮5次可用或所有挡牌受益。',
    134: '该次事件选项和后继记录失10血/夜魇费用3→2；不省略回复分支的加牌代价。',
    146: '严格可见签名中双体各自真实来袭、动作后继和资源；不同条件反例不算同签名否定。',
    147: '无攻击窗口各张牌实际费用/建立后的能量；未执行线和预判截止不当真实胜负。',
    148: '当前已显示来袭/挡及手牌费用逐项核算；不同状态的先攻案例不推出固定先防/先攻。',
    149: '当前神器/实挡/减攻动作的已核后继；只对原可见签名成立，不给泛化Boss杀序。',
    150: '同盘面两种能力启动后余能/挡原记录分别留存；建立能力不当已出刀或已得后继伤挡。',
    151: '先步法/先防御的原敏捷和即时挡后继；三局不同签名各列，不合成已验证必胜顺序。',
    164: '芝士当前完整菜单、牌池/血价和原完成后继可定位；未选支线收益未知。',
    165: '这个/那个当前菜单的诅咒、遗物及付血金币原条件可定位；不能由名字固定选择。',
    166: '桥每次当前选项、累计血价和最终移除目标保留；不把整段净变化当单步标价。',
    167: '药水信使原完整菜单、持药/容量和实际后继；不从终局胜率定义替代选择收益。',
    172: '原F48持药首帧usage=Automatic且can_use=false；非主动可用分母，后续自动触发/存活未知。',
}


def pairs(rows, fields, metric):
    groups = collections.defaultdict(dict)
    for row in rows:
        groups[tuple((k, row[k]) for k in fields)][row['win']] = row
    return [{'scope': dict(scope), 'winner_n': v[1]['units'], 'loser_n': v[0]['units'],
             'winner_mean': v[1][metric]['mean'], 'loser_mean': v[0][metric]['mean'],
             'difference': v[1][metric]['mean'] - v[0][metric]['mean']}
            for scope, v in groups.items() if 0 in v and 1 in v and v[0][metric]['mean'] is not None and v[1][metric]['mean'] is not None]


external_routes = [x for x in routes['external_act_distributions'] if x['landmark'] == 'first_boss_reached_prefix']
own_routes = [x for x in routes['own_act_distributions'] if x['subset'] == 'quality_subset' and x['landmark'] == 'first_boss_reached_prefix']
route_checks = {
    'external_elites': pairs(external_routes, ['version', 'act'], 'elites'),
    'external_heal': pairs(external_routes, ['version', 'act'], 'heal'),
    'own_heal': pairs(own_routes, ['subset', 'sl_stratum', 'act'], 'heal'),
    'external_shop': pairs(external_routes, ['version', 'act'], 'shop_gold_spent'),
}
assert any(x['difference'] < 0 for x in route_checks['external_elites'])
assert any(x['difference'] > 0 for x in route_checks['own_heal'])
assert any(x['difference'] < 0 for x in route_checks['external_shop']) and any(x['difference'] > 0 for x in route_checks['external_shop'])


def population(e, i):
    """Return a claim-specific denominator, never the generic source-cohort coverage."""
    if 26 <= i <= 30:
        keys = ['buff/used', 'block/uncovered_used', 'energy/zero_energy_used', 'full_shop/all', 'boss_bridge/all']
        key = keys[i - 26]
        row = potion_stats
        for k in key.split('/'):
            row = row[k]
        assert len(set(row['run_ids'])) == row['independent_runs']
        return {'source': 'own', 'n': row['independent_runs'], 'unit': 'independent_runs', 'path': potion_path, 'pointer': '/' + key}
    if i == 39:
        group = early_stats['complete_three_rewards_any_skip'][0]
        assert group['group'] == 'any_skip'
        ix, row = next((ix, row) for ix, row in enumerate(group['strata']) if row['ascension'] == 10 and row['attempt_scope'] == 'no_retry_evidence')
        n = row['final']['independent_runs']
        assert n == len(set(row['final']['run_ids'])) == 15
        return {'source': 'own', 'n': n, 'unit': 'independent_runs', 'path': early_path,
                'pointer': '/complete_three_rewards_any_skip/0/strata/' + str(ix) + '/final',
                'scope_notice': 'A10无重试层有跳过15局的描述组，不累加119/337个完整三题机会或其他进阶。'}
    if i in [55, 56, 109, 110, 111]:
        key = {55: 'fit', 56: 'stop_eligible', 109: 'used', 110: 'short', 111: 'later_quote'}[i]
        ix, row = next((ix, row) for ix, row in enumerate(removal_stats['contexts'][key]) if row['ascension'] == 10 and row['attempt_scope'] == 'no_retry_evidence')
        return {'source': 'own', 'n': row['independent_runs'], 'unit': 'independent_runs', 'path': removal_path,
                'pointer': '/contexts/' + key + '/' + str(ix), 'scope_notice': '只描述相应合法性/价格机会总体，不估购买、删牌或留金收益；重试层不累加。'}
    if i in [57, 58, 60]:
        key = {57: 'golden_affordable_close', 58: 'paid_curse_removal', 60: 'mixed_strike_removal'}[i]
        ix, row = next((ix, row) for ix, row in enumerate(shop_stats[key]['strata']) if row['ascension'] == 10 and row['attempt_scope'] == 'retry_or_predicted_death')
        return {'source': 'own', 'n': row['independent_runs'], 'unit': 'independent_runs', 'path': shop_path,
                'pointer': '/' + key + '/strata/' + str(ix), 'scope_notice': '只描述原A10重试/判死层的实际动作；不将持有或最终结局当策略效果，其他SL层不累加。'}
    if i in [31, 32, 34, 35]:
        key = {31: 'act1/all', 32: 'heal_clipping/all', 34: 'rest_elite_branch/all', 35: 'two_rest_actions/all'}[i]
        row = rest_stats
        for k in key.split('/'):
            row = row[k]
        assert len(set(row['runs'])) == row['independent_runs']
        return {'source': 'own', 'n': row['independent_runs'], 'unit': 'independent_runs', 'path': rest_path, 'pointer': '/' + key,
                'scope_notice': '描述相应机会总体，不估选择效果；34来自保留prior_texts对应原候选/全量表，不借新2条轨迹扩样。'}
    if i in [137, 140]:
        d = e['review_observation']['denominators']
        return {'source': 'external:sts2fun', 'n': d['picked']['uploads'] + d['declined']['uploads'], 'unit': 'first_offer_uploads',
                'scope_notice': '同上传×幕×牌首次提供，两个互斥选择臂合为此描述总体；不用于A两臂门，不外推玩家。',
                'choice_arms': [d['picked']['uploads'], d['declined']['uploads']]}
    if 142 <= i <= 145:
        d = e['review_observation']['denominators']['external_primary']
        return {'source': 'external:sts2fun', 'n': d['upload_rows'], 'unit': 'terminal_cluster_uploads',
                'scope_notice': '只描述该终局簇及其中已还原共现；赢家子样本原分母另留，不声称随机对照/组合收益/路由门已验证。',
                'complete_original_denominators': e['review_observation']['denominators']}
    if i == 156:
        return {'source': 'own', 'n': 53, 'unit': 'independent_runs', 'scope_notice': 'F49原质量入口53局；不累加其中两个F48重试分层，也不把场间HP差当单战毛伤。'}
    if 158 <= i <= 163:
        d = e['review_observation']['denominators']
        return {'source': 'own', 'n': d['own_independent_run_ids'], 'unit': 'independent_runs',
                'external_offer_arms': [d['external_selected']['uploads'], d['external_not_selected']['uploads']],
                'scope_notice': '当前选项提供总体及选择频率，不是选后整局胜率效应。'}
    if 168 <= i <= 170:
        d = e['review_observation']['denominators']
        return {'source': 'own', 'n': d['independent_run_ids'], 'unit': 'independent_runs',
                'scope_notice': '本楼首记录尝试的持药/用药分母；不把held子组、重试或预判删失合成留药效果。'}
    if i == 44:
        return {'source': 'external:sts2fun', 'n': 501, 'unit': 'independent_uploaded_runs', 'scope_notice': '原CSV实核501场/501局/70玩家，只描述整战gross_damage尾部分位。'}
    if i == 47:
        ev = next(x for x in e['evidence'] if x.get('type') == 'external_aggregate' and x['denominator']['n'] == 101)
        ix, row = next((ix, row) for ix, row in enumerate(timeline['rows']) if row['version'] == 'v0.111' and row['cluster'] == 6)
        assert row['formation'][0]['terminal_consistent_winners'] == 101 and row['formation'][0]['formed'] == 25
        return {'source': 'external:sts2fun', 'n': 101, 'unit': 'terminal_consistent_winning_uploads',
                'statistic': ev['statistic'], 'path': timeline_path, 'pointer': '/rows/' + str(ix) + '/formation/0',
                'scope_notice': '原冻结模型簇6齐三牌25/101的赢家描述总体；新stock模型/轨迹不与旧簇合并，不推出必需清单或顺序。'}
    if i == 61:
        return {'source': 'own', 'n': 10, 'unit': 'independent_runs', 'scope_notice': '原10个购买局的交易结果；无战斗兑现或购买收益结论。'}
    return None


rows = []
for i, e in enumerate(entries):
    original = mapping['entries'][i]
    assert original['id'] == e['id'] and any(x['status'].startswith('mapped') for x in original['evidence'])
    p = population(e, i)
    kind = '单臂统计' if p else '机制事实'
    grade, reason, rationale = 'B+', 'reproducible_record_fact', '现场牌文/费用/动作后继可从原件复核；只发布该限定事实与未知，不升级为固定选择、整战收益或普遍机制。'
    if p:
        threshold = 10 if p['source'] == 'own' else 50
        assert p['n'] >= threshold
        reason, rationale = 'audited_descriptive_population', '所描述总体有来源、独立单位和足够分母；没有支持固定选择的因果解释，子样本/SL/版本及原限制保留。'
        if i in [137, 140] or 142 <= i <= 145:
            kind = '赢家做法'
    elif i not in minus and i not in [154, 155]:
        assert i in FACTS, ('unreviewed mechanism exception', i, e['id'])
    if i in minus:
        grade, (reason, rationale) = 'B−', minus[i]
        kind = '原观察/策略（仅引用）'
    if i in [154, 155]:
        grade, kind, reason = 'A', '同向对照关联', 'sample_and_consistency_passed'
        rationale = 'v0.111每臂≥200；四个旧版本同端点同向；自有同端点SL层不反向，仍不作安全线/因果收益。'
        d = e['review_observation']['denominators']
        keys = ['external_v111_act2_ge70_proxy', 'external_v111_act2_lt70_proxy'] if i == 154 else ['external_v111_act3_first_ge90_proxy', 'external_v111_act3_first_lt90_proxy']
        n = min(d[k]['n'] for k in keys)
        score = round(.49 * n / (n + 200), 6)
        p = {'source': 'external:sts2fun', 'n': n, 'unit': 'minimum_comparison_arm_uploads', 'arms': [d[k] for k in keys]}
    elif grade == 'B+':
        n = p['n'] if p else len({x['run'] for x in e['evidence'] if x.get('type') != 'external_aggregate'})
        assert n > 0
        score = round(.35 * n / (n + 50), 6)
    else:
        n, score = None, 0
    raw_entry = json.dumps(e, ensure_ascii=False, separators=(',', ':')).encode()
    rows.append({'id': e['id'], 'original_index': i, 'version': e['version'], 'original_entry_audit_sha256': hashlib.sha256(raw_entry).hexdigest(),
                 'scope_group': 'observation36' if i >= 137 else 'original116' if e['id'] in ids116 else 'additional21',
                 'category': category[i], 'grade': grade, 'evidence_type': kind, 'reason': reason, 'rationale': rationale,
                 'limited_fact_if_eligible': FACTS.get(i) if grade == 'B+' and p is None else None,
                 'original_evidence_status': e.get('evidence_status'), 'original_formal_publication': e.get('formal_publication'),
                 'claim_population': p, 'confidence': score, 'confidence_n': n,
                 'confidence_notice': '证据支持分，不是胜率/因果概率；B+ cap=.35、门槛50、已核限定记录无反向C=1；B−保守0，不表示负效果。机制例外的n只数本条自有来源局，不把动作条数当独立局。',
                 'proposed_summary_prefix': kind + '，非对照：' if grade == 'B+' else None,
                 'source_map_entry': i, 'exact_mapped_evidence_count': sum(x['status'].startswith('mapped') for x in original['evidence']),
                 'auxiliary_reference_gaps': [x['original_ref'] for x in original['evidence'] if not x['status'].startswith('mapped') and 'original_ref' in x],
                 'counterevidence_preserved': True, 'published': False})

summary = {'total': len(rows), 'grades': dict(collections.Counter(r['grade'] for r in rows)),
           'by_scope': {s: dict(collections.Counter(r['grade'] for r in rows if r['scope_group'] == s)) for s in ['original116', 'additional21', 'observation36']},
           'by_category': {c: dict(collections.Counter(r['grade'] for r in rows if r['category'] == c)) for c in CATEGORIES},
           'by_reason': dict(collections.Counter(r['reason'] for r in rows)),
           'mapped_entries': len(rows),
           'raw_windows_verified': len(mapping['windows']) + len(hash_scopes['additional_unique_verified_ranges']),
           'source_map_ranges': len(mapping['windows']),
           'additional_hash_scope_ranges': len(hash_scopes['additional_unique_verified_ranges']),
           'unresolved_primary_entries': [],
           'auxiliary_gaps_notice': '逐条主证据已定位；非机器旧引用的辅助定位缺口逐条保留，不冒所有历史附件都已解析。',
           'stage': 'intermediate-checkpoint-awaiting-supervisor; no runtime or publication implementation'}
(OUT / 'assessments.json').write_text(json.dumps({'schema': 'issue85-three-tier-checkpoint-v1', 'source_document_sha256': SHA,
                                                'authority': 'https://github.com/dwroy/agent-sts2/issues/85#issuecomment-6512421088',
                                                'entries': rows, 'summary': summary}, ensure_ascii=False, indent=2) + '\n')
(OUT / 'grading-sources.json').write_text(json.dumps({'sources': sources, 'route_consistency_checks': route_checks}, ensure_ascii=False, indent=2) + '\n')
(OUT / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(summary, ensure_ascii=False, indent=2))
