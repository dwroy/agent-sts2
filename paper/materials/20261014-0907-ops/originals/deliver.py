import hashlib
import json
import subprocess
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2')
dispatch = json.loads((OUT / 'dispatch.json').read_text())
assigned = json.loads((OUT / 'assigned-proposals.json').read_text())
reasons = [
    '未取得原在线A10移动表完整调用输入和火花增长/污染清除/施毒/虚弱/格挡联合生产回放；少技能替线无完整后继，不能据单轮9损改规则。',
    '只核失落退场返力端点；遗忘死亡返敏、抢夺与其他属性来源隔离及返还后同轮续牌链未取得，缺目标顺序完整对照。',
    '当前进阶首样本数据库读取已有；原在线移动表及加压/虚弱/覆甲/荆棘联合生产回放未完成，覆甲减层条件未隔离，不能关闭整项。',
    '已核17→19成长，但原日志只有类型和临时index；缺同类旧实体退出/新实体进入的连续身份与冻结召唤输入，不能认证新实体不继承旧成长。',
    '已读回沙虫同盘损3/15、扣10/17；缺跨重规划完整候选归属、逐来源累计能力兑现与SL恢复/回血/喝药联合分账，局部审计不关闭综合要求。',
    'YF同盘净损0/9、扣45/38可核，但T1完整开场认证未知；缺跨重规划整候选归属和同起点/抽序/资源预算独立完整尝试，不能拟探索惩罚。',
    '阶段4HP/4毒→212/清旧毒、零毒触媒及敏捷5→6不倒补23挡已有；缺逐来源累计毒/挡兑现、阶段后继和跨重规划完整候选归属。',
    'XP T3损9/14、扣24/27已核；缺整线执行归属、永久成长净贡献和独立时间后置A10双蟹完整同预算对照，不能确定血价权重。',
    '朝向57→38→28、临时减力恢复和轮初14挡局部模型已有；额外挡来源隔离及混合意图/未知条件联合候选消费者验收未完成。',
    '缺全部组件联合消费者验收、跨续问完整候选归属、逐来源累计收益及SL恢复资源分账；现有预测/端点/整轮子项不能标整条duplicate。',
]
assert len(reasons) == len(dispatch['proposal_ids']) == 10
results = [{'id': key, 'state': 'waiting', 'reason': reason} for key, reason in zip(dispatch['proposal_ids'], reasons)]
base = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
assert base == 'f99d9d0ea2cff14c827c3ac7f689d8048675d8e1'
result = {'task': 'strategy-proposal', 'character': 'silent', 'batch': '20261014-084222-s2-strategy-proposal',
          'base': base, 'runs': dispatch['runs'], 'fixes': [], 'skipped': [], 'merged': None,
          'tests': {'tsc': None, 'vitest': None, 'cases': None}, 'code_proposals': dispatch['proposal_ids'],
          'implementation_domains': [], 'proposal_results': results, 'report': str(OUT / 'report.md')}
(OUT / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
linked = {}
for proposal, disposition in zip(assigned, results):
    for ledger in proposal['add']['ledger']:
        linked.setdefault(ledger, []).append(disposition['id'])
updates = [{'id': ledger, 'by': 'learner:strategy-proposal',
            'where': {'proposal': [str(OUT / 'proposal.md'), str(OUT / 'report.md')]},
            'note': '20261014-084222-s2-strategy-proposal独立核本角色六局；关联原ID：' + ','.join(ids)
                    + '。逐项waiting及具体再派输入见本批proposal.md/report.md/result.json；仅追加追溯，不改旧claim/status/version/evidence，不记implemented或shipped。'}
           for ledger, ids in sorted(linked.items())]
(OUT / 'ledger-updates.jsonl').write_text(''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in updates))


def protected():
    result = {}
    for raw in (ROOT / 'paper/materials/learning/ledger.jsonl').open():
        row = json.loads(raw)
        if row.get('id') not in linked:
            continue
        entry = result.setdefault(row['id'], {})
        for key in ['character', 'claim', 'status', 'version', 'first_run', 'asc']:
            if key in row:
                entry[key] = row[key]
    return result


before = protected()
(OUT / 'ledger-protected-before.json').write_text(json.dumps(before, ensure_ascii=False, indent=2) + '\n')
assert len(before) == len(updates) == 30
with (OUT / 'ledger-updates.jsonl').open() as source, (OUT / 'ledger-cli.stdout.txt').open('w') as stdout, (OUT / 'ledger-cli.stderr.txt').open('w') as stderr:
    rc = subprocess.run(['python3', str(ROOT / 'learner/ledger.py'), 'update'], stdin=source, stdout=stdout, stderr=stderr).returncode
assert rc == 0, (rc, (OUT / 'ledger-cli.stderr.txt').read_text())
after = protected()
assert before == after, '账本受保护字段发生变化；保留现场待核并行更新'
payload = set()
readback = []
for raw in (ROOT / 'paper/materials/learning/ledger.jsonl').open('rb'):
    row = json.loads(raw)
    if row.get('id') in linked and row.get('note', '').startswith('20261014-084222-s2-strategy-proposal独立核本角色六局；'):
        assert row.get('by') == 'learner:strategy-proposal'
        assert str(OUT / 'proposal.md') in row.get('where', {}).get('proposal', [])
        payload.add(row['id'])
        readback.append({'id': row['id'], 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw), 'row': row})
assert payload == set(linked) and len(readback) == 30
(OUT / 'ledger-cli-readback.json').write_text(json.dumps({'rc': rc, 'rows': readback,
    'protected_fields_unchanged': True, 'new_ids': [], 'status_changes': []}, ensure_ascii=False, indent=2) + '\n')
print('三十条原账本CLI追溯追加并读回，原claim/status/version保持；十项waiting。')
