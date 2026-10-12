"""Register this feature's statistical finding through the root's append-only ledger CLI."""
import argparse
import json
from pathlib import Path
import subprocess

ROOT = Path('/home/dw/Projects/agent-sts2')
WORK = ROOT / '.worktrees/silent-boss-calibration'
SCRATCH = ROOT / 'learner/runs/20261007-075131-silent-boss-calibration'


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--commit', required=True)
    args = p.parse_args()
    if (SCRATCH / 'ledger-id.txt').exists():
        raise RuntimeError('ledger already registered; inspect original add before appending anything')
    data = json.loads((WORK / 'knowledge/characters/silent/boss-trust.json').read_text())
    fights = [json.loads(line) for line in (SCRATCH / 'dataset/fights.jsonl').read_text().splitlines()]
    sources = [json.loads(line) for line in (SCRATCH / 'dataset/sources.jsonl').read_text().splitlines()]
    assert all(r['character'] == 'silent' for r in fights)
    first = min(fights, key=lambda r: r['first_ts'])
    evidence = [{'run': r['run_id'], 'floor': r['floor'], 'turn': 1, 'role': 'support',
                 'note': f"{r['encounter']} A{r['asc']} attempt={r['attempt']} T1–{r['turns']} {r['outcome']} code={r['code']}；{r['key']}"}
                for r in fights]
    for r in sources:
        if r['run_id'] == 'TD1HVGS7H6LB':
            evidence.append({'run': r['run_id'], 'floor': r['floor'], 'turn': 1, 'role': 'support',
                             'note': '重载失败，最后记录仍4HP；predicted_death仅截断，没有补造实际死亡，详细SL来源见来源清单。'})
    metrics = {start: {k: data['overall'][start][k] for k in ('tune_n', 'n', 'brier', 'mean_pred', 'actual_win', 'platt')} for start in ('t1', 'pre')}
    ranges = {start: [min(b[start]['n'] for b in data['bosses'].values()), max(b[start]['n'] for b in data['bosses'].values())]
              for start in ('t1', 'pre')}
    item = {'character': 'silent', 'kind': 'fight', 'first_run': first['run_id'], 'evidence': evidence,
            'prior': 'unknown', 'status': 'proposed',
            'by': 'learner:silent-boss-calibration',
            'claim': ('严格已结束SILENT A0–A10：84局378boss尝试，218次SL截断不当实际死亡；160实际结局119胜41败，'
                      f'候选46局107场调参、28局53场后期A10验证；成功拟合调参数{metrics["t1"]["tune_n"]}/{metrics["pre"]["tune_n"]}。各boss成功模拟验证场数范围{ranges}，均不足原≥10门槛，B2/B3可信名单为空；'
                      '不因数量接近而豁免Brier/胜率差/打穿比。F49仅3实际败局（调参2、验证1），用同一整体映射记录残差并保留范围低信度。'),
            'where': {'knowledge': ['knowledge/characters/silent/boss-trust.json'],
                      'proposal': ['paper/materials/silent/boss-sim-calibration.md', 'experiments/boss-sim/silent/' + data['refresh']['artifact']],
                      'commits': [args.commit]},
            'note': ('这是Roy明确授权的新功能，不是bug-infra。角色隔离/整体Platt/时间切分/原准入/升阶或20实结局定期刷新是Roy架构要求；'
                     '上面样本统计和下面拟合/残差只来自静默对局。铁甲校准/角色数据未进入拟合，boss侧沿已许可既有模型，不新增打法。'
                     '源/实际live合入/固定发布树与版本由完成事件交运维核实后登记shipped；学习者只proposed。'
                     + json.dumps(metrics, ensure_ascii=False))}
    (SCRATCH / 'ledger-item.json').write_text(json.dumps(item, ensure_ascii=False, indent=2) + '\n')
    result = subprocess.run(['python3', str(ROOT / 'learner/ledger.py'), 'add'], input=json.dumps(item, ensure_ascii=False) + '\n',
                            text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, cwd=ROOT)
    (SCRATCH / 'ledger-add.log').write_text(result.stdout)
    (SCRATCH / 'ledger-add.exit').write_text(str(result.returncode) + '\n')
    if result.returncode:
        raise RuntimeError('ledger CLI rejected the item; preserve rejection, do not fake an ID')
    item_id = result.stdout.strip()
    assert item_id.startswith('silent-') and item_id[7:].isdigit(), item_id
    (SCRATCH / 'ledger-id.txt').write_text(item_id + '\n')
    print(item_id)


if __name__ == '__main__':
    main()
