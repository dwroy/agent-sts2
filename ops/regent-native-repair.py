"""Repair only the owned, API-less, never-played Regent startup window."""
import base64
from datetime import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from urllib.request import urlopen

spec=importlib.util.spec_from_file_location('regent_probe',Path(__file__).with_name('regent-launch-inspect.py'))
probe=importlib.util.module_from_spec(spec);spec.loader.exec_module(probe)
SAVE=Path('/mnt/c/Users/XD/AppData/Roaming/SlayTheSpire2/default/2026101302')
EXE=r'C:\Users\XD\AppData\Local\Temp\agent-sts2-regent-20261013\SlayTheSpire2.exe'


def repaired_settings(settings):
    if not isinstance(settings,dict) or settings.get('schema_version')!=8 or settings.get('vsync')!='adaptive':
        raise ValueError('settings are not the actual native-generated schema')
    return {**settings,'mod_settings':{'mods_enabled':True,'mod_list':[{'id':'STS2AIAgent','is_enabled':True,'source':'mods_directory'}]},
            'seen_ea_disclaimer':True,'skip_intro_logo':True,'fullscreen':False,'fps_limit':30,
            'window_size':{'X':1280,'Y':720},'volume_master':0.0}


def guard_receipt(receipt):
    if (receipt.get('request_id')!='roy-20261013-isolated-character-climb' or receipt.get('status')!='started'
            or type(receipt.get('pid')) is not int or receipt['pid']==34676 or receipt.get('pid',0)<=1
            or receipt.get('desktop_session')!=1 or receipt.get('game_executable')!=EXE
            or receipt.get('client_id')!='2026101302'):
        raise ValueError('not the owned startup process')
    datetime.fromisoformat(receipt['creation_time'].replace('Z','+00:00'))
    return receipt['pid']


def main():
    if len(sys.argv)!=1:raise ValueError('repair accepts no arguments')
    root=Path(__file__).resolve().parent.parent;probe.lane_guard(root,os.environ)
    own=root/'ops/codex-ops/regent-native';target=own/'native-settings-repair.json'
    if target.exists():
        print(target.read_text());return
    receipt=json.loads((own/'native-launch.json').read_text(encoding='utf-8-sig'));pid=guard_receipt(receipt)
    log=(own/'game.log').read_text(errors='replace')
    if 'VSyncType' not in log or 'user has not yet seen the mods warning' not in log:
        raise ValueError('the frozen startup fault is absent')
    if any(p.is_file() for p in SAVE.rglob('*run*')):raise ValueError('an existing run must not be stopped or replaced')
    try:
        with urlopen('http://127.0.0.1:18181/health',timeout=2):
            raise ValueError('the API is already available; inspect instead of closing')
    except OSError:pass
    archive=root/'paper/materials/regent/native-settings-repair-20261013';archive.mkdir(exist_ok=True)
    for name in ['native-launch.json','task-submitted.json','game.log','manifest.json']:
        source=own/name
        if source.exists():shutil.copyfile(source,archive/name)
    settings=SAVE/'settings.save';before=settings.read_bytes();(archive/'native-generated-settings.before.json').write_bytes(before)
    payload=repaired_settings(json.loads(before))
    # Only numeric PID and fixed paths enter PowerShell. Creation time is separately parsed above.
    creation=receipt['creation_time']
    command=r'''
$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue'
$p=Get-CimInstance Win32_Process -Filter 'ProcessId=PID_VALUE'
if (-not $p -or $p.Name -ne 'SlayTheSpire2.exe' -or $p.ExecutablePath -ne 'C:\Users\XD\AppData\Local\Temp\agent-sts2-regent-20261013\SlayTheSpire2.exe' -or $p.SessionId -ne 1) { throw 'Not the owned window.' }
$expected=[DateTime]::Parse('CREATION_VALUE').ToUniversalTime()
if ([Math]::Abs(($p.CreationDate.ToUniversalTime()-$expected).TotalMilliseconds) -gt 1) { throw 'Reused PID.' }
if ($p.CommandLine -notmatch '--clientId\s+2026101302(?:\s|$)') { throw 'Wrong account.' }
$old=Invoke-RestMethod 'http://127.0.0.1:8080/health' -TimeoutSec 5
if (-not $old.ok -or $old.data.process_id -ne 34676) { throw 'Original identity differs.' }
if (@(Get-ChildItem -LiteralPath 'C:\Users\XD\AppData\Roaming\SlayTheSpire2\default\2026101302' -Recurse -File -Filter '*run*').Count -gt 0) { throw 'Existing run.' }
Stop-Process -Id PID_VALUE -Force
for ($i=0;$i -lt 20;$i++) { if (-not (Get-Process -Id PID_VALUE -ErrorAction SilentlyContinue)) { exit 0 };Start-Sleep -Milliseconds 100 }
throw 'Owned process did not stop.'
'''.replace('PID_VALUE',str(pid)).replace('CREATION_VALUE',creation)
    encoded=base64.b64encode(command.encode('utf-16-le')).decode()
    child=subprocess.run([probe.POWERSHELL,'-NoProfile','-NonInteractive','-EncodedCommand',encoded],capture_output=True,timeout=15)
    if child.returncode:raise ValueError('owned window identity/stop was refused')
    # Preserve current native preferences; never clone the primary account or overwrite gameplay data.
    settings.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
    sha=hashlib.sha256(settings.read_bytes()).hexdigest()
    result={'status':'patched_owned_startup','request_id':receipt['request_id'],'old_pid':pid,'old_creation_time':creation,
            'at':datetime.now().astimezone().isoformat(),'prepared_settings_sha256':sha,'existing_run_files':False,
            'original_pid':34676,'original_not_stopped':True,'evidence_directory':str(archive.relative_to(root))}
    target.write_text(json.dumps(result,indent=2)+'\n')
    manifest=json.loads((own/'manifest.json').read_text());manifest.update({'prepared_settings_sha256':sha,'repaired_native_settings':True})
    (own/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    # Clear current pointers only after a verified own stop and durable repair receipt. All bytes remain archived.
    for name in ['native-launch.json','task-submitted.json']:(own/name).unlink(missing_ok=True)
    print(json.dumps(result))


if __name__=='__main__':
    try:main()
    except (ValueError,OSError,subprocess.SubprocessError):
        print('Regent startup repair refused; keep the actual process and failure evidence.',file=sys.stderr);sys.exit(78)
