import fcntl
import hashlib
import json
import os
import subprocess
from pathlib import Path

out = Path(__file__).parent
root = Path('/home/dw/Projects/agent-sts2')
commit = (out / 'source-commit.txt').read_text().strip()
changes = json.loads((out / 'changes.json').read_text())
ledger = json.loads((out / 'ledger-result.json').read_text())
tests = json.loads((out / 'test-result.json').read_text())
merge = json.loads((out / 'live-merge.json').read_text())
names = {
    'silent-royal-poison-blood-vial-opening-net': '王室猛毒开场净血价',
    'silent-footwork-block': '灵动步法与敏捷牌挡',
    'silent-strength-weak-observation': '力量与敏捷分源',
    'silent-deck-burst-observation': '构筑兑现窗口观察',
    'silent-noxious-fumes-growth': '毒雾轮初补毒',
    'silent-accelerant-triggers': '触媒多次结算',
    'silent-afterimage-per-card-block': '余像逐牌格挡',
    'silent-sai-start-block': '钗轮初格挡',
    'silent-ripple-basin-no-attack-block': '波纹水盆末轮格挡',
    'silent-wither-end-turn-loss': '凋萎末回合失血',
    'silent-aeonglass-artifact-growth-sl': '沙漏制品与连战观察',
    'silent-insatiable-dual-clock': '沙虫双时钟与SL血价',
    'silent-well-laid-plans-retention': '计划妥当与保留手牌',
    'silent-infested-prism-tainted-skill-cost': '感染棱柱技能污染血价',
    'silent-piercing-wail-temporary-strength': '尖啸临时减力',
    'silent-haze-group-poison-weak': '迷雾群毒与虚弱',
    'silent-reptile-trinket-temporary-strength': '爬行动物饰品临时力观察',
    'silent-cunning-potion-shiv-capacity': '狡诈药水与手牌容量',
}
mechanisms = json.loads((out / 'mechanisms.json').read_text())
assert {m['id'] for m in mechanisms} == set(names)
assert merge['source'] == commit and merge['merged'] is None
assert tests == {'tsc': 0, 'vitest': 0, 'files': 240, 'cases': 2525}
completion = {
    'task': 'experience-update',
    'version': changes['after']['version'],
    'commit': commit,
    'merged': merge['merged'],
    'added': sum(c['before'] is None for c in changes['entries']),
    'updated': sum(c['before'] is not None for c in changes['entries']),
    'retired': 0,
    'active': changes['after']['active'],
    'mechanisms': [names[m['id']] for m in mechanisms],
    'tests': {key: tests[key] for key in ['tsc', 'vitest', 'cases']},
    'ledger': ledger,
    'code_proposals': json.loads((out / 'proposal-ids.json').read_text()),
    'implementation_domains': ['combat', 'potion', 'sl', 'terminal'],
    'report': str(out.resolve() / 'report.md'),
}
serialized = json.dumps(completion, ensure_ascii=False, indent=2) + '\n'
(out / 'report.json').write_text(serialized)
section = (out / 'changelog-section.md').read_bytes()
(out / 'report.md').write_bytes(section + b'\n```json\n' + serialized.encode() + b'```\n')
scan_files = [out / 'report.md', out / 'changelog-section.md', out / 'report.json']
scan_files.extend(sorted(out.glob('proposal-*.md')))
scan_files.extend(sorted(out.glob('proposal-*.json')))
scan = subprocess.run(
    ['gitleaks', 'stdin', '--no-banner', '--redact'],
    input=b'\n'.join(p.read_bytes() for p in scan_files),
    capture_output=True,
)
(out / 'gitleaks-final-records.log').write_bytes(scan.stdout + scan.stderr)
(out / 'gitleaks-final-records.rc').write_text(str(scan.returncode) + '\n')
assert scan.returncode == 0, '最终记录安全扫描未通过，尚未追加根变更记录'
title = (out / 'changelog-title.txt').read_text().strip().encode()
target = root / 'paper/materials/experience-changelog-silent.md'
with target.open('r+b') as handle:
    fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
    prefix = handle.read()
    assert title not in prefix, '本节已存在，拒绝重复追加'
    fd = os.open(target, os.O_WRONLY | os.O_APPEND)
    try:
        addition = b'\n' + section
        count = os.write(fd, addition)
        assert count == len(addition), '追加写入未完成，保留现场'
        os.fsync(fd)
    finally:
        os.close(fd)
    handle.seek(0)
    final = handle.read()
    assert final[:len(prefix)] == prefix
    assert final[len(prefix):] == addition
    assert final.count(title) == 1
    proof = {
        'path': str(target),
        'prefix_bytes': len(prefix),
        'prefix_sha256': hashlib.sha256(prefix).hexdigest(),
        'appended_bytes': len(addition),
        'prefix_unchanged': True,
        'section_occurrences': 1,
    }
    (out / 'changelog-append-proof.json').write_text(json.dumps(proof, indent=2) + '\n')
    fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
print(json.dumps({'report': completion['report'], 'appended_bytes': len(addition),
                  'prefix_unchanged': True, 'gitleaks': scan.returncode}, ensure_ascii=False))
