"""Restore the registered Regent lane in fresh Herdr shells, without copying credentials."""
import json
from pathlib import Path
import shlex
import sys


def lane_env(root, marker):
    root = Path(root).resolve()
    if (root.name != 'regent-climb' or root.parent.name != '.worktrees'
            or marker != {'request_id': 'roy-20261013-isolated-character-climb', 'character': 'REGENT'}):
        raise ValueError('not the registered Regent lane')
    shared = root.parent.parent
    accounts = shared / 'ops/codex-ops/accounts/codex1'
    return {'CHARACTER': 'REGENT', 'TARGET_ASCENSION': 'climb', 'SL_ENABLED': 'on',
            'CODEX_OPS_ROOT': str(root), 'CODEX_OPS_DIR': str(root / 'ops/codex-ops'),
            'STS2_WORKSPACE': str(root), 'STS2_LIVE': str(root), 'LEARNER_BASE_REF': 'regent-climb',
            'BRAIN_ENGINE': 'codex', 'ESCALATION_CHAIN': 'codex',
            'BRAIN_CODEX_HOME': str(accounts / 'brain'), 'LEARNER_CODEX_HOME': str(accounts / 'learner'),
            'CODEX_HOME': str(accounts / 'learner'), 'JEV_SHARED_ENV_FILE': str(shared / 'agent/.env'),
            'BRAIN_CODEX_MODEL': 'gpt-6.1-sol', 'BRAIN_CODEX_EFFORT': 'xhigh',
            'CODEX_OPS_MODE': 'herdr', 'CODEX_OPS_EXECUTION': 'sandbox', 'CODEX_OPS_HERDR_AGENT': 'regent-ops',
            'HERDR_HOST_WORKSPACE': 'sts2-climb-2', 'HERDR_HOST_CWD': str(root),
            'STS2_BASE_URL': 'http://127.0.0.1:1', 'CODEX_OPS_MOD_URL': 'http://127.0.0.1:1',
            'STS2_EXPECTED_PROCESS_ID': '0'}


if __name__ == '__main__':
    try:
        if len(sys.argv) != 2: raise ValueError('requires own lane marker')
        path = Path(sys.argv[1])
        for key, value in lane_env(path.parent.parent, json.loads(path.read_text())).items():
            print('export ' + key + '=' + shlex.quote(value))
    except (ValueError, OSError):
        print('invalid Regent lane; admission refused', file=sys.stderr)
        sys.exit(78)
