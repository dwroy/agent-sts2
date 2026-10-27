"""Export small fixed-Git examples; no production queue, knowledge or full run."""
import json
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))
from ops.tests.test_board_queue_checks import CandidateChecks
import board_queue_checks as checks

output = Path(__file__).resolve().parent / 'fixed-git-proof'
output.mkdir(exist_ok=False)
results = []
for scenario in ('disjoint', 'target', 'source', 'fixture', 'unknown'):
    case = CandidateChecks()
    case.setUp()
    try:
        name = 'knowledge/characters/silent/fixture.json'
        if scenario != 'unknown':
            case.refresh_contract(name)
        if scenario == 'target':
            case.candidate_fixture(name, '{"fixed":"candidate"}\n')
            case.options['root_only_prefixes'].append('knowledge/')
        if scenario == 'fixture':
            name = 'knowledge/common/fixture.json'
            case.live_fixture(name)
            case.options['live_fixtures'] = [name]
            case.refresh_contract(name)
        context = dict(job=case.job, assembly=case.assemble(), checks={'full': 'passed'}, full_runs=1)
        if scenario == 'source':
            (case.live / 'agent/package.json').write_text('{"source":"changed"}\n')
        else:
            case.refreshed(name)
        error = None
        try:
            checks.verify_after(context)
        except ValueError as failure:
            error = str(failure)
        assert (error is None) == (scenario == 'disjoint'), (scenario, error)
        destination = output / scenario
        destination.mkdir()
        for index, original in enumerate(context['refresh_revalidations']):
            source = Path(original).parent
            for path in source.iterdir():
                if path.is_file():
                    shutil.copyfile(path, destination / (str(index) + '-' + path.name))
        if scenario == 'disjoint':
            accepted = context['refresh_accepted']
            shutil.copyfile(Path(accepted['view']) / name, destination / 'new-data.json')
            shutil.copyfile(Path(context['assembly']['runtime']) / name, destination / 'old-data.json')
            checks.verify_after(context)
            last = Path(context['refresh_revalidations'][-1])
            shutil.copyfile(last, destination / 'reuse-evidence.json')
            assert json.loads(last.read_text())['state'] == 'reused'
        assert context['checks'] == {'full': 'passed'} and context['full_runs'] == 1
        results.append(dict(scenario=scenario, accepted=error is None, reason=error,
                            original_full_unchanged=True, actual_full_started=False))
    finally:
        case.doCleanups()
(output / 'readback.json').write_text(json.dumps(dict(
    scope='fixed Git/consumer examples; not actual project full/shadow/publication',
    actual_full_started=False, production_operations=0, cases=results), indent=2) + '\n')
print(json.dumps(results))
