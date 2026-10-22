#!/usr/bin/env python3
"""Publish immutable launch code from live; main never supplies pinned game policy."""
import argparse
import fcntl
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile

from issue_session_support import atomic, safe_path

CRITICAL = ('ops/run.sh','ops/autoplay.sh','ops/paths.sh','ops/paths.py','ops/production-runtime.sh',
    'ops/instance_env.py','ops/instance_gate.py','ops/regent_lane_env.py','ops/brain_trial.py',
    'ops/brain_wait.py','ops/autoplay-console.sh','ops/launch_runtime.py')
MACHINE_LAUNCH = ('ops/board_heavy.py', 'ops/issue_session_support.py')
POLICY = ('ops/ablation.json','ops/regent-lane.json','ops/launch-settings.json')
PREFIXES = ('BRAIN_','V6_','SL_','REFLEX_','BOSS_','CONSTRUCTION_','KNOWLEDGE_',
    'SIM_','S_','DEEPSEEK_','CLAUDE_','JEV_','ENRICHER_')
EXACT = {'CHARACTER','TARGET_ASCENSION','MAX_MIN','ARM','ESCALATION_CHAIN',
    'ASC_AMOUNTS','CARD_CONDITIONS','GLOBAL_BUILD_EVAL','HUMAN_PACE_H2','GAME_DATA_DIR',
    'LOGDB_DIR','LOGDB_PYTHON','MECH_DEATH_MOVE','MECH_MOVE_RULES','MECH_RULES',
    'PASSIVE_PIECES','POTION_COST','ROLLOUT_FACTS','SANDPIT_START','RUN_START',
    'SHOP_DISCARD_POTIONS','ALLOW_FTUE_MODALS','STRICT_JEV','COMBAT_PLANNER',
    'FIGHT_PLAN','FIGHT_PLAN_LOG','RUN_PLAN','RUN_PLAN_LOG','RUN_PLAN_MERGE',
    'BUILD_DECIDER','BUILD_ONESHOT','COMBAT_DEEPSEEK','THIEF_FACTS','THIEF_COST',
    'DECISION_LOG','LOG_LEVEL','CONFIDENCE_ACT','CONFIDENCE_STRONG',
    'MAX_REQUESTS','MAX_TOKENS','RUN_CONFIG_LOG','MODE','TYPESAFE_BASE_URL'}
# These retain the existing provider/account and instance/host boundaries.
# They cannot be supplied by a launch-settings publication.
ACCOUNTS = {'BRAIN_CODEX_HOME','CODEX_HOME','CLAUDE_CONFIG_DIR','LEARNER_CODEX_HOME','JEV_SHARED_ENV_FILE'}
RUNTIME = {'HOME','PATH','LANG','LC_ALL','TMPDIR','SYSTEMROOT','WSL_INTEROP','WSL_DISTRO_NAME',
    'USER','LOGNAME','SHELL','LANGUAGE','TZ','TERM','HERDR_BIN',
    'XDG_CONFIG_HOME','XDG_DATA_HOME','XDG_CACHE_HOME','XDG_STATE_HOME','XDG_RUNTIME_DIR',
    'HTTP_PROXY','HTTPS_PROXY','NO_PROXY','ALL_PROXY','NODE_EXTRA_CA_CERTS','SSL_CERT_FILE','SSL_CERT_DIR',
    'NO_COLOR','FORCE_COLOR',
    'STS2_BASE_URL','STS2_PORT_SCAN','STS2_TIMEOUT_MS','STS2_EXPECTED_PROCESS_ID',
    'STS2_EXPECTED_NATIVE_PROFILE_ID','STS2_WORKSPACE','STS2_LIVE',
    'STS2_LAUNCH_ROOT','STS2_LAUNCH_LIVE','STS2_LAUNCH_BUNDLE','STS2_LAUNCH_SOURCE',
    'CODEX_OPS_MOD_URL','AUTOPLAY_READY','AUTOPLAY_RELEASE','AUTOPLAY_ACTIVE',
    'AUTOPLAY_RELOAD_PARENT','AUTOPLAY_RELOAD_OLD','AUTOPLAY_RELOAD_OLD_START','WAIT_PID'}
UNPUBLISHABLE = {'BRAIN_TRIAL_SCHEDULE','BRAIN_CODEX_PAID_CREDITS'}


def digest(value):return hashlib.sha256(value).hexdigest()


def git(live,*args):
    return subprocess.check_output(['git','-C',str(live),*args],stderr=subprocess.DEVNULL)


def manifest_path(root):return root/'ops/codex-ops/launch-runtime.json'


def source_files(live,source,paths,modes=None):
    present=set(git(live,'ls-tree','-r','--name-only',source,'--',*paths).decode().splitlines()) if paths else set()
    paths=[p for p in paths if p in present]
    if not paths:return {}
    result={}
    with tarfile.open(fileobj=io.BytesIO(git(live,'archive',source,'--',*paths))) as archive:
        for entry in archive:
            if entry.name in paths:
                if not entry.isfile():raise ValueError('launch source must be regular')
                result[entry.name]=archive.extractfile(entry).read()
                if modes is not None:modes[entry.name]=0o755 if entry.mode&0o111 else 0o644
    return result


def behavior_key(key):
    return (key.startswith(PREFIXES) or key in EXACT) and key not in RUNTIME and key not in ACCOUNTS


def credential_key(key):
    # Match credential fields, not policy such as FIRST_TOKEN_MS or MAX_TOKENS.
    return key in ACCOUNTS or key.endswith(('_API_KEY','_API_KEY_FILE','_TOKEN','_SECRET','_PASSWORD'))


def launch_settings(files):
    value=json.loads(files.get('ops/launch-settings.json',b'{}'))
    if (not isinstance(value,dict) or any(not isinstance(k,str) or not behavior_key(k) or credential_key(k)
            or k in UNPUBLISHABLE or not isinstance(v,str) or len(v)>4096 for k,v in value.items())):
        raise ValueError('launch settings must contain only nonsecret game policy')
    return value


def private_environment(live):
    path=Path(live)/'agent/.env'
    if path.is_symlink() or path.exists() and path.stat().st_nlink!=1:
        raise ValueError('live private environment must not share a mutable main file')


def validate(value,root,live=None):
    if (not isinstance(value,dict) or value.get('schema')!='launch-runtime-v1' or value.get('root')!=str(root)
            or not isinstance(value.get('live'),str) or live is not None and value['live']!=str(Path(live).resolve())
            or not isinstance(value.get('files'),dict) or not isinstance(value.get('modes'),dict)
            or set(value['files'])!=set(value['modes']) or not set(CRITICAL)<=set(value['files'])
            or not isinstance(value.get('critical'),dict) or set(value['critical']) not in (set((*CRITICAL,*POLICY)), set((*CRITICAL,*POLICY,*MACHINE_LAUNCH)))
            or not isinstance(value.get('history'),list)):
        raise ValueError('invalid or rebound launch publication')
    if any(value['critical'][p]!=value['files'].get(p) for p in value['critical']):
        raise ValueError('launch publication input mismatch')


def pin(root,live,source):
    root,live=Path(root).resolve(),Path(live).resolve()
    safe_path(root,live)
    if not re.fullmatch('[0-9a-f]{40}',source):raise ValueError('exact publication commit required')
    common=Path(git(root,'rev-parse','--path-format=absolute','--git-common-dir').decode().strip())
    if root!=common.parent or git(root,'rev-parse','--path-format=absolute','--git-common-dir')!=git(live,'rev-parse','--path-format=absolute','--git-common-dir'):
        raise ValueError('foreign launch worktree')
    directory=root/'ops/codex-ops';directory.mkdir(parents=True,exist_ok=True)
    with (root/'ops/live-merge.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        if git(live,'rev-parse','HEAD').decode().strip()!=source:raise ValueError('publication moved')
        previous=json.loads(manifest_path(root).read_text()) if manifest_path(root).exists() else None
        if previous:validate(previous,root,live)
        names=git(live,'ls-tree','-r','--name-only',source,'--','ops').decode().splitlines()
        paths=[p for p in names if p.endswith(('.py','.sh')) or p in POLICY]
        if any('..' in Path(p).parts or not re.fullmatch(r'ops/[\w./-]+',p) for p in paths):raise ValueError('unsafe launch path')
        modes={};files=source_files(live,source,paths,modes)
        if not all(p in files for p in (*CRITICAL,*MACHINE_LAUNCH)):raise ValueError('live lacks published launch protocol')
        subprocess.run(['git','-C',str(live),'diff','--quiet','HEAD','--',*paths],check=True)
        launch_settings(files)
        private_environment(live)
        target=directory/'launch'/source;target.parent.mkdir(parents=True,exist_ok=True)
        hashes={p:digest(b) for p,b in files.items()}
        if not target.exists():
            temporary=Path(tempfile.mkdtemp(prefix='.prepare-',dir=target.parent))
            try:
                for p,b in files.items():
                    out=temporary/p;out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(b);out.chmod(modes[p])
                # Only operational state is shared. Code and behavior policy are immutable copies.
                for name in ('STOP','autoplay.log','restarts.log','codex-ops','ablation-current.json','ablation-progress.json'):
                    (temporary/'ops'/name).symlink_to(root/'ops'/name)
                for name in ('agent','knowledge','learner','eval','tools'):
                    (temporary/name).symlink_to(live/name)
                temporary.rename(target)
            finally:
                if temporary.exists():shutil.rmtree(temporary)
        if any(safe_path(root,target/p).read_bytes()!=b or safe_path(root,target/p).stat().st_mode&0o777!=modes[p]
               for p,b in files.items()):raise ValueError('launch bundle changed')
        policy=json.loads(files.get('ops/ablation.json',b'{}'));policy_id=digest(json.dumps({k:v for k,v in policy.items() if k!='i'},sort_keys=True).encode())
        progress=root/'ops/ablation-progress.json'
        old_progress=json.loads(progress.read_text()) if progress.exists() else {}
        if old_progress.get('schedule_sha')!=policy_id:
            atomic(progress,dict(schedule_sha=policy_id,i=policy.get('i',0)))
        history=(previous.get('history',[])+[{k:previous[k] for k in ('source','bundle','files')}]) if previous and previous['source']!=source else previous.get('history',[]) if previous else []
        value=dict(schema='launch-runtime-v1',root=str(root),live=str(live),source=source,bundle=str(target),
            files=hashes,modes=modes,critical={p:hashes.get(p) for p in (*CRITICAL,*POLICY,*MACHINE_LAUNCH)},history=history)
        atomic(manifest_path(root),value)
        return value


def published(root,live=None):
    root=Path(root).resolve();path=manifest_path(root)
    if not path.exists():return None
    value=json.loads(path.read_text())
    validate(value,root,live)
    private_environment(value['live'])
    target=safe_path(root,value['bundle'])
    if (not isinstance(value.get('source'),str) or not re.fullmatch('[0-9a-f]{40}',value['source'])
            or target!=root/'ops/codex-ops/launch'/value['source']):raise ValueError('invalid launch bundle')
    for p,sha in value['files'].items():
        if '..' in Path(p).parts or not p.startswith('ops/') or not (p.endswith(('.py','.sh')) or p in POLICY):raise ValueError('unsafe published launch path')
        file=safe_path(root,target/p)
        if digest(file.read_bytes())!=sha or file.stat().st_mode&0o777!=value['modes'][p]:raise ValueError('launch bundle changed')
    current=source_files(Path(value['live']),'HEAD',list(value['critical']))
    if any((digest(current[p]) if p in current else None)!=sha for p,sha in value['critical'].items()):
        raise ValueError('live launch changed; ops must publish the matching launch version')
    return value


def known_scripts(root,value):
    root=Path(root).resolve();result={root/'ops/autoplay.sh'}
    if value:
        for row in [*value.get('history',[]),value]:
            target=safe_path(root,row['bundle'])
            if target!=root/'ops/codex-ops/launch'/row['source']:raise ValueError('invalid previous launch source')
            script=safe_path(root,target/'ops/autoplay.sh')
            if digest(script.read_bytes())!=row['files']['ops/autoplay.sh']:raise ValueError('previous launch changed')
            result.add(script)
    return result


def selection(root,live=None,kind='autoplay'):
    root=Path(root).resolve();value=published(root,live)
    if not value:return root/f'ops/{kind}.sh',dict(os.environ),None
    files={p:safe_path(root,Path(value['bundle'])/p).read_bytes() for p in value['files']}
    env={k:v for k,v in os.environ.items() if not behavior_key(k) or credential_key(k)}
    env.update(launch_settings(files))
    env.update(STS2_LAUNCH_ROOT=str(root),STS2_LAUNCH_LIVE=value['live'],STS2_LAUNCH_BUNDLE=value['bundle'],
        STS2_LAUNCH_SOURCE=value['source'],STS2_LIVE=value['live'],STS2_WORKSPACE=str(root))
    return Path(value['bundle'])/f'ops/{kind}.sh',env,value


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('action',choices=['pin','exec','show'])
    parser.add_argument('--root',required=True);parser.add_argument('--live');parser.add_argument('--source')
    parser.add_argument('--kind',choices=['run','autoplay'],default='autoplay')
    raw=sys.argv[1:];split=raw.index('--') if '--' in raw else len(raw);extra=raw[split+1:]
    args=parser.parse_args(raw[:split])
    try:
        if args.action=='pin':
            value=pin(args.root,args.live,args.source);print(json.dumps({k:value[k] for k in ('source','bundle')}));return 0
        script,env,value=selection(args.root,args.live,args.kind)
        if args.action=='show':print(json.dumps(dict(active=bool(value),script=str(script),source=value['source'] if value else None)));return 0
        if value and extra and not (args.kind=='autoplay' and extra==['--tail-console']):
            raise ValueError('behavior arguments must be part of the published launch version')
        os.execvpe('bash',['bash',str(script),*extra],env)
    except (OSError,ValueError,KeyError,TypeError,subprocess.SubprocessError):
        print('launch publication unavailable; saved game retained, no play started',file=sys.stderr);return 78


if __name__=='__main__':sys.exit(main())
