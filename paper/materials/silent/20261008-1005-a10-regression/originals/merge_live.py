import datetime as dt
import fcntl
import json
import os
from pathlib import Path
import subprocess
import sys
import time

P = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2')
LIVE = ROOT/'.worktrees/live'
SOURCE = '693318efb3a72061c53ccdc06802c380ed3ff54a'
BASE = '2e2b48aa6e954daf02aa7cfc6a82eddc58bcc5cf'
record = {'state': 'pending', 'base': BASE, 'source_commit': SOURCE,
          'source_tree': '69b04b7a2f52743bb64585447529d32c1c72c1ca',
          'source_tests': {'entry': 'bash tools/test-sandbox.sh', 'exit': 0, 'tsc': 0,
              'vitest_files': 248, 'vitest_tests': 2608, 'workers': 4,
              'log': str(P/'source-sandbox-2.log')}, 'merged': None}
resume = '--resume' in sys.argv
if resume:
    record = json.loads((P/'publication.json').read_text())
    (P/'publication-first-merge.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
def save(): (P/'publication.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
def git(*args, check=True):
    result = subprocess.run(['git',*args],cwd=LIVE,text=True,capture_output=True)
    with (P/'live-merge.log').open('a') as handle:
        handle.write('git '+' '.join(args)+'\n'+result.stdout+result.stderr)
    if check and result.returncode: raise RuntimeError('git '+args[0]+' failed: '+str(result.returncode))
    return result
def sha(): return git('rev-parse','HEAD').stdout.strip()
def changed(): return [s for s in git('status','--porcelain=v1','-z','--untracked-files=all').stdout.split('\0') if s]
def preserve_refresh(label):
    rows = changed()
    if any(not (row[3:].startswith('knowledge/') or row[3:].startswith('notes/fight-value-backtest')) for row in rows):
        raise RuntimeError('live has non-refresh dirty paths; preserved without overwrite')
    paths = sorted({row[3:] for row in rows})
    if paths:
        git('add','--',*paths)
        with (P/(label+'-gitleaks.log')).open('w') as out:
            scan = subprocess.run(['nice','-n','19','gitleaks','protect','--staged','--source','.','--redact','--no-banner'],cwd=LIVE,stdout=out,stderr=subprocess.STDOUT)
        if scan.returncode: raise RuntimeError('refresh gitleaks failed')
        git('commit','-m','Refresh knowledge data','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
    record[label] = {'paths': paths, 'commit': sha()}
    save()

save()
try:
    with (ROOT/'ops/live-merge.lock').open('a') as lock:
        started = time.monotonic()
        while True:
            try:
                fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB); break
            except BlockingIOError:
                if time.monotonic()-started>600: raise RuntimeError('live lock unavailable for 600 seconds')
                time.sleep(5)
        record['lock_acquired_at'] = dt.datetime.now().astimezone().isoformat()
        if not resume:
            record['live_before_refresh'] = sha()
            record['dirty_before_refresh'] = changed()
        save()
        while subprocess.run(['pgrep','-f','knowledge/builders/buil[d]-'],stdout=subprocess.DEVNULL).returncode==0:
            time.sleep(10)
        source_paths = git('diff','--name-only',BASE,SOURCE).stdout.splitlines()
        expected = ['agent/src/reflex/jev-experience.ts','agent/tests/silent-potion-provenance-evidence.json','agent/tests/silent-potion-provenance.test.ts']
        if sorted(source_paths)!=expected: raise RuntimeError('source diff exceeds three approved paths')
        dirty_paths = [x[3:] for x in changed()]
        overlap = sorted(set(source_paths)&set(dirty_paths))
        record['overlap'] = overlap
        if overlap: raise RuntimeError('refresh overlaps source')
        if resume:
            preserve_refresh('recovery_refresh')
            inherited = ['docs/codex-ops.md','learner/tasks/silent-a10-regression.md',
                         'notes/silent-a10-regression-dispatch.json','ops/codex-ops-learner.sh',
                         'ops/learner_jobs.py','ops/tests/test_silent_calibration_dispatch.py']
            before = git('diff','--name-only',record['pre_merge'],'HEAD').stdout.splitlines()
            if sorted(set(before)-set(expected))!=inherited:
                raise RuntimeError('recovery paths changed; preserving current live for operations handoff')
            # Undo only the inherited changes introduced by this merge; keep the three source paths.
            git('restore','--source='+record['pre_merge'],'--staged','--worktree','--',*inherited)
            with (P/'gitleaks-integration-correction.log').open('w') as out:
                scan = subprocess.run(['nice','-n','19','gitleaks','protect','--staged','--source','.','--redact','--no-banner'],cwd=LIVE,stdout=out,stderr=subprocess.STDOUT)
            if scan.returncode: raise RuntimeError('integration correction gitleaks failed')
            git('commit','-m','fix: remove inherited dispatch changes from provenance integration',
                '-m','Restore the six inherited paths to the pre-merge live tree while preserving the Silent provenance fix and all latest knowledge.',
                '-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
            record['integration_correction_commit'] = sha()
            record['inherited_paths_restored'] = inherited
            record.pop('error',None)
        else:
            preserve_refresh('refresh')
            record['pre_merge'] = sha()
            preflight = git('merge-tree','--write-tree',record['pre_merge'],SOURCE,check=False)
            record['preflight_exit'] = preflight.returncode
            record['preflight_tree'] = preflight.stdout.splitlines()[0] if preflight.stdout else None
            save()
            if preflight.returncode: raise RuntimeError('three-way preflight conflict; no live source merge performed')
            predicted_paths = git('diff','--name-only',record['pre_merge'],record['preflight_tree']).stdout.splitlines()
            if sorted(predicted_paths)!=expected: raise RuntimeError('preflight includes inherited changes; no merge performed')
            git('merge','--no-edit',SOURCE)
            record['merge_commit'] = sha()
        record['merged'] = sha()
        record['merge_tree'] = git('rev-parse','HEAD^{tree}').stdout.strip()
        if git('merge-base','--is-ancestor',SOURCE,'HEAD',check=False).returncode:
            raise RuntimeError('source is not a live ancestor')
        record['merged_paths'] = git('diff','--name-only',record['pre_merge'],'HEAD').stdout.splitlines()
        if sorted(record['merged_paths'])!=expected: raise RuntimeError('actual merge changed unexpected paths')
        record['state'] = 'merged_checking'
        save()
        test_env = dict(os.environ,PATH=str(Path.home()/'.local/node/bin')+':'+os.environ['PATH'],
                        TMPDIR=str(P/'scratch'),SANDBOX_WORKERS='4')
        with (P/'live-sandbox.log').open('w') as out:
            result = subprocess.run(['nice','-n','19','bash','tools/test-sandbox.sh'],cwd=LIVE/'agent',env=test_env,stdout=out,stderr=subprocess.STDOUT)
        record['live_tests'] = {'entry': 'bash tools/test-sandbox.sh','exit': result.returncode,'workers':4,'log':str(P/'live-sandbox.log')}
        save()
        if result.returncode:
            preserve_refresh('after_failed_check_refresh')
            # Revert only this merge while keeping the latest knowledge refresh.
            git('restore','--source='+record['pre_merge'],'--staged','--worktree','--',*expected)
            git('commit','-m','Revert failed Silent provenance integration','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
            record['rollback_commit'] = sha()
            record['merged'] = None
            record['state'] = 'rolled_back_failed_check'
            save()
            raise RuntimeError('live sandbox failed; only this merge reverted')
        versions_path = LIVE/'eval/versions.json'
        versions = json.loads(versions_path.read_text())
        version = 'S1.a10-regression1'
        if any(v['name']==version for v in versions['versions']): raise RuntimeError('release name already exists')
        dated = subprocess.check_output(['date'],text=True).strip()
        now = dt.datetime.now().astimezone().strftime('%Y-%m-%d %H:%M')
        record['date_before_release'] = dated
        record['version'] = version
        explanation = ('静默独立A10回退排查；693318ef来源隔离，silent-0285/C48LLXBGKXQ9 A0 F2T1及MGA0CZDDKC0P A10 F2T1；'
                       '仅Silent非boss药水上下文移除铁甲硬编码统计，原经验/候选/评分/血价/SL及铁甲等价。'
                       '冻结83局中77Codex，F48 10/50→6/27，原38/45为早8小时完局切点；不声称胜率提升。'
                       '源原沙箱248文件2608例tsc/vitest0，合后原入口通过，保存全部刷新/并行代码；完整外部检查待调度器。')
        new_version = {'name':version,'family':'Silent','commit':record['merged'],'source':'decision-log '+now+'：'+explanation}
        versions['versions'].append(new_version)
        original_text = versions_path.read_text()
        closing = original_text.rfind('\n  ]')
        if closing<0: raise RuntimeError('unexpected versions formatting; preserve file')
        appended = original_text[:closing].rstrip()+',\n    '+json.dumps(new_version,ensure_ascii=False)+original_text[closing:]
        if json.loads(appended)!=versions: raise RuntimeError('version append did not preserve existing records')
        versions_path.write_text(appended)
        line = f'\n- {now}：{version} 上线live {record["merged"]}（源{SOURCE}）；{explanation} 回退仅逆向本批角色门控，保留刷新。\n'
        with (LIVE/'paper/materials/decision-log.md').open('a') as handle: handle.write(line)
        git('add','eval/versions.json','paper/materials/decision-log.md')
        with (P/'gitleaks-release.log').open('w') as out:
            scan = subprocess.run(['nice','-n','19','gitleaks','protect','--staged','--source','.','--redact','--no-banner'],cwd=LIVE,stdout=out,stderr=subprocess.STDOUT)
        if scan.returncode: raise RuntimeError('release metadata gitleaks failed')
        git('commit','-m','docs: register Silent A10 investigation provenance correction','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
        record['release_commit'] = sha()
        record['state'] = 'released'
        save()
        print(json.dumps(record,ensure_ascii=False))
except Exception as error:
    record['error'] = str(error)
    save()
    raise
