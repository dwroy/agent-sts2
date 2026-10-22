#!/usr/bin/env python3
"""Inventory source-level launch consumers; never inspect the caller's environment."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

import launch_runtime as launch

LAUNCHERS = ('run.sh','autoplay.sh','production-runtime.sh','paths.sh','paths.py',
    'brain_trial.py','brain_wait.py','instance_env.py','instance_gate.py','regent_lane_env.py',
    'autoplay-console.sh','autoplay-pane.sh','autoplay-reload.py','launch_runtime.py',
    'codex-ops-actions.sh','report.py')
DERIVED = {'ROOT','OPS','LIVE','LOGS','DATA','NOTES','CONSOLE','RUNS','BASH_REMATCH','BASH_SOURCE',
    'CACHE_AGENT_TREE','CACHE_RUNNER','CACHE_RUNNER_SHA','CACHE_WORKTREE','DIR','MOD','STEAM_URI','TASK','WIN'}
# Dynamic readers are reviewed separately from literal key readers. New sites must be audited.
DYNAMIC_INDEX = {
    'agent/src/v6/config.ts': {'env[name]': 2},
    'agent/src/core/config.ts': {'env[key]': 1},
    'agent/src/brain/engines/process.ts': {'env[key]': 1},
    'agent/src/brain/engines/dsh.ts': {'process.env[key]': 2, 'env[key]': 1},
}
QUOTED = r'''["']([A-Z][A-Z0-9_]*)["']'''
PATTERNS = (
    r'(?:process\.env|\benv)\[\s*'+QUOTED+r'\s*\]',
    r'(?:process\.env|\benv)\.([A-Z][A-Z0-9_]*)\b',
    r'readEnv\(\s*env\s*,\s*'+QUOTED,
    r'pick\(overrides,\s*env,\s*["\'][^"\']+["\'],\s*'+QUOTED,
    r'(?:usageInt|agentInt)\(\s*'+QUOTED,
    r'os\.(?:getenv|environ\.get)\(\s*'+QUOTED,
    r'os\.environ\[\s*'+QUOTED+r'\s*\]',
)


def consumers(root):
    root = Path(root)
    paths = sorted((root/'agent/src').rglob('*.ts')) + [root/'ops'/p for p in LAUNCHERS]
    found, sources = {}, {}
    for path in paths:
        raw = path.read_bytes(); text = raw.decode(); name = path.relative_to(root).as_posix()
        sources[name] = hashlib.sha256(raw).hexdigest()
        patterns = (*PATTERNS, r'\$\{?([A-Z][A-Z0-9_]*)\b') if path.suffix == '.sh' else PATTERNS
        for pattern in patterns:
            for match in re.finditer(pattern, text):
                found.setdefault(match[1], set()).add(f'{name}:{text.count(chr(10), 0, match.start())+1}')
        if path.suffix == '.ts' and ('process.env' in text or 'NodeJS.ProcessEnv' in text):
            dynamic = Counter(m[0] for m in re.finditer(r'(?:process\.env|\benv)\[([^\]]+)\]', text)
                if not re.fullmatch(r'''\s*["'][^"']*["']\s*''', m[1]))
            if dict(dynamic) != DYNAMIC_INDEX.get(name, {}):
                raise ValueError(f'unreviewed dynamic environment reader: {name}')
        if name == 'agent/src/v6/config.ts':
            for match in re.finditer(r'(?:choice|numeric)\(\s*'+QUOTED, text):
                found.setdefault(match[1], set()).add(name+':v6-parser-helper')
            for kind in ('CARD','POTION','SHOP','REST'):
                found.setdefault(f'V6_{kind}_DECIDER', set()).add(name+':dynamic-room-template')
        if name == 'agent/src/brain/engines/process.ts':
            inherited = re.search(r'const INHERITED = new Set\(\[(.*?)\]\)', text, re.S)
            if not inherited:raise ValueError('unreviewed agent host forwarding')
            for key in re.findall(QUOTED, inherited[1]):
                found.setdefault(key, set()).add(name+':host-forwarding')
        if name == 'agent/src/brain/engines/dsh.ts':
            forwarded = re.search(r'for \(const key of \[(.*?)\]\)', text)
            if not forwarded:raise ValueError('unreviewed dsh host forwarding')
            for key in re.findall(QUOTED, forwarded[1]):
                found.setdefault(key, set()).add(name+':host-forwarding')
        # Enumerate the engine-key templates and per-question maps used by readBrainConfig.
        for template in re.findall(r'readEnv\(env,\s*`([^`]+)`', text):
            if not template.startswith('BRAIN_${upper}_'):
                raise ValueError(f'unclassified dynamic environment reader: {name}')
            for engine in ('CLAUDE','CODEX','DEEPSEEK','DSH'):
                key = template.replace('${upper}', engine)
                found.setdefault(key, set()).add(name+':dynamic-engine-template')
    return {k: sorted(v) for k, v in sorted(found.items())}, sources


def category(key, refs):
    if key in launch.RUNTIME or key.startswith(('CODEX_OPS_', 'AUTOPLAY_')):
        return 'runtime-binding-or-host'
    if launch.credential_key(key):
        return 'credential-or-account-reference'
    if key in launch.UNPUBLISHABLE:
        return 'generated-or-separately-authorized'
    if launch.behavior_key(key):
        return 'published-policy'
    if key in DERIVED and all(ref.startswith('ops/') for ref in refs):
        return 'script-derived-path'
    return 'UNCLASSIFIED'


def inventory(root):
    found, sources = consumers(root)
    rows = {k: dict(category=category(k, refs), readers=refs) for k, refs in found.items()}
    return dict(schema='launch-environment-consumers-v1', sources=sources, variables=rows,
        dynamic_families=['BRAIN_ENGINE_*','BRAIN_{CLAUDE,CODEX,DEEPSEEK,DSH}_MODEL_*',
            'BRAIN_{CLAUDE,CODEX,DSH}_MAX_CALLS','V6_{CARD,POTION,SHOP,REST}_DECIDER',
            'host forwarding: LC_* and lowercase proxy aliases'],
        external_boundary='Provider/account files stay external; names and source only, no environment or credential contents read.',
        unclassified=[k for k, row in rows.items() if row['category']=='UNCLASSIFIED'])


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--root',required=True)
    result=inventory(parser.parse_args().root)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(bool(result['unclassified']))
