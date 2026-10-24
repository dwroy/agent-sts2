"""Create the learner's bounded observational entries from verified frozen rows."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
FROZEN = Path('/home/dw/Projects/agent-sts2/.artifacts/ops-issue27-batch2-20261022/frozen')
ROWS = {r['id']: r for r in map(json.loads, (HERE / 'evidence-refs.jsonl').read_text().splitlines())}
PROV = json.loads((FROZEN / 'paper/materials/2026-10-21-sts2fun-stats/provenance.json').read_text())
LIBRARY = json.loads((FROZEN / 'knowledge/characters/silent/strategy-entries.json').read_text())
REF = 'paper/materials/20261022-issue27-brain-strategies/batch2/evidence-refs.jsonl#'


def evidence(key, statistic, denominator, unit, criteria, interval=None):
    r = ROWS[key]['row']
    ev = {'type': 'external_aggregate', 'source': 'external:sts2fun', 'url': PROV['url'],
          'version': 'v0.111.0', 'dataset_sha256': PROV['database_sha256'],
          'downloaded_at': PROV['downloaded_at'], 'license': PROV['license'],
          'filters': {'character': 'silent', 'ascension': 10,
                      'criteria': 'v0.111=only v0.111.0; single-player; valid; not abandoned; no modifiers; ' + criteria},
          'statistic': {'name': statistic, 'value': float(r[statistic]), 'unit': unit},
          'denominator': {'unit': denominator[0], 'n': int(r[denominator[1]])},
          'design': 'observational', 'limitations': [
              '自选上传、玩家/牌组选择混杂；无因果收益或本系统验证。',
              '普通/升级未分层；奖励/候选槽/战斗与独立局不可混算。' if key.startswith('skip') or key.startswith('card')
              else 'SL未知，仅上传尝试；死亡截断；总受伤非HP净损或安全血线。'],
          'ref': REF + key, 'role': 'support'}
    if interval:
        low, high = json.loads(r[interval])
        ev['interval'] = {'low': low, 'high': high,
                          'method': 'player-cluster bootstrap; 1000 draws; seed=240111'}
    return ev


def entry(key, trigger, strategy, evs, confidence):
    return {'id': 'silent-brain-' + key, 'version': '1.0.0', 'trigger': trigger,
            'strategy': strategy, 'evidence': evs, 'source': 'external:sts2fun',
            'confidence': confidence, 'design': 'observational',
            'limits': {'own_support_runs': 0, 'effect': None, 'scope': '仅Silent A10/v0.111.0定量参考；其他进阶/版本无验证。'}}


new = []
for act, key, n, skips, rate, ci in [(2, 'skip_rates:19', 7821, 2198, '28.10', '20.75–37.11'),
                                    (3, 'skip_rates:20', 4411, 1704, '38.63', '31.34–49.58')]:
    new.append(entry(f'act{act}-reward-skip-comparison', {'question_types': ['card_reward'], 'acts': [act]},
        f'仅A10/v0.111.0参考：第{act}幕卡奖把跳过与补牌逐项比较，先说明候选能补当前哪一缺口；未找到具体用途时保留跳过，不因奖励必须选一张。'
        f'外部{n}个奖励屏幕有{skips}次跳过（{rate}%，玩家簇区间{ci}%），说明该幕跳过是实际出现的选择。'
        '这是屏幕频率，不是局胜率、最优跳过配额或跳过收益；到达该幕的玩家/牌组已被筛选。当前确有可兑现补强时不能为凑比例拒拿。',
        [evidence(key, 'rate', ('rewards', 'screens'), 'fraction', f'act={act}; deduplicated combat card-reward screens, not candidate slots/runs', 'cluster_ci')], 0.4))

new.append(entry('act1-blade-dance-choice-context', {'question_types': ['card_reward'], 'acts': [1]},
    '仅A10/v0.111.0第一幕参考：奖励出现刀刃之舞BLADE_DANCE时，先按现场牌文、当前牌组和能量比较其可兑现用途与其他选项/跳过，不把外部拿牌后胜率较高当作必拿。'
    '1054个候选槽/83玩家的原始拿与不拿胜率差约+5.20个百分点；按玩家/幕匹配的983槽/49玩家，调整差约+0.27个百分点，区间−7.93至+5.86。'
    '两者口径不同，均非因果；重复奖励不增加独立局数，未分普通/升级，不据此判牌无用或给固定拿牌排名。候选没有此牌时本条不提出选牌建议。',
    [evidence('card_choices:2902', 'win_difference', ('offers', 'offered'), 'fraction_difference',
              'act=1; card=BLADE_DANCE; picked=411/not_picked=643; players=83; repeated candidate slots; no upgrade split', 'win_difference_cluster_ci'),
     evidence('card_choices:2902', 'player_act_adjusted_difference', ('offers', 'matched_offers'), 'fraction_difference',
              'act=1; card=BLADE_DANCE; within-player/act matched; players=49; strata=49; no upgrade split', 'adjusted_cluster_ci')], 0.38))

for boss, act, row, n, players, p90 in [('KNOWLEDGE_DEMON', 2, 'combat_distribution:45', 360, 68, 51),
                                       ('TEST_SUBJECT', 3, 'combat_distribution:66', 501, 70, 62)]:
    new.append(entry(boss.lower().replace('_', '-') + '-external-tail-budget',
        {'question_types': ['act_plan', 'event', 'rest', 'shop'], 'acts': [act], 'bosses': [boss + '_BOSS']},
        f'仅A10/v0.111.0参考：备战{boss}时，把当前HP、现有防护和补强可兑现的减损列入休息/升级/购物或事件取舍；别用一个平均代价承诺能安全入场。'
        f'外部匹配{n}场/{n}局/{players}玩家，总受伤gross_damage的90分位为{p90}。这是受伤尾部的量级提示，非净掉血、非置信区间，也不是{p90}血安全线或固定休息线。'
        '上传自选、SL未知、死亡截断和牌组差异保留；不由此指定杀序、必拿牌、必喝药或推断本系统模拟误差。'
        + ('本条只指当前已识别Boss，不能覆盖第三幕未知后场或将两Boss代价相加。' if act == 3 else ''),
        [evidence(row, 'gross_damage_p90', ('fights', 'gross_damage_n'), 'hp',
                  f'act={act}; kind=boss; encounter=ENCOUNTER.{boss}_BOSS; one matched encounter per selected run; players={players}; uploaded attempt; SL unknown')], 0.36))

LIBRARY['entries'].extend(new)
(ROOT / 'knowledge/characters/silent/strategy-entries.json').write_text(json.dumps(LIBRARY, ensure_ascii=False, indent=2) + '\n')
(HERE / 'proposed-entries.json').write_text(json.dumps(new, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'new': [(e['id'], len(e['strategy'].encode())) for e in new], 'retained': 3}, ensure_ascii=False))
