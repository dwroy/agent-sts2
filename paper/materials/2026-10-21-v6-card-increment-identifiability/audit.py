"""Verify read-only inputs and scan plaintext plus decompressed research artifacts."""
import gzip
import hashlib
import json
from pathlib import Path
import re
import secrets
import shutil
import string
import subprocess
import study as s


def main():
    provenance=s.read(s.HERE/'provenance.json')
    mismatches=[]
    for rel,expected in provenance['source_files'].items():
        b=(s.SOURCE/rel).read_bytes()
        actual={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
        if actual!=expected:
            mismatches.append(rel)
    code=[]
    for rel in ['knowledge/builders/opening_value.py','knowledge/builders/build-fight-value.py',
                'knowledge/characters/silent/opening-value.json',
                'agent/src/v6/card-value.ts','agent/src/memory/run-constraints.ts',
                'agent/src/hand/screens/silent-reward-addition.ts']:
        blob=subprocess.check_output(['git','-C',str(s.SOURCE),'show',provenance['source_code_commit']+':'+rel])
        assert blob==(s.SOURCE/rel).read_bytes(), rel
        code.append(rel)
    s.write(s.HERE/'checks/source-integrity.json',{'status':'passed' if not mismatches else 'failed',
        'files':len(provenance['source_files']),'mismatches':mismatches,'code_matches_pinned_commit':code})
    assert not mismatches
    # Keep scan workspace in this repository and never overwrite an earlier audit.
    work=s.HERE.parents[2]/'.issue12-scan'
    if work.exists():
        raise ValueError('Use a new audit directory rather than overwrite previous results')
    expanded=work/'expanded';expanded.mkdir(parents=True)
    for p in s.HERE.rglob('*'):
        if not p.is_file() or p.name.startswith('gitleaks'):
            continue
        rel=p.relative_to(s.HERE)
        dest=expanded/rel
        dest.parent.mkdir(parents=True,exist_ok=True)
        if p.suffix=='.gz':
            dest=dest.with_suffix('')
            # Pretty JSON makes each finding's location reviewable.
            dest.write_text(json.dumps(json.loads(gzip.decompress(p.read_bytes())),ensure_ascii=False,indent=2)+'\n')
        else:
            shutil.copyfile(p,dest)
    ids=sorted({q['key'] for folder in ['frozen','frozen-extra'] for q in s.read(s.MATERIALS/folder/'questions.json.gz')})
    config=s.HERE/'checks/gitleaks-case-ids.toml'
    config.write_text('[extend]\nuseDefault = true\n\n[[allowlists]]\ndescription = "Exact frozen run-floor identifiers, never credential values"\nregexes = [\n'+
        ''.join("  '''^"+re.escape(k)+"$''',\n" for k in ids)+']\n')
    statuses=[]
    def scan(label,source,allow=False):
        report=s.HERE/f'checks/gitleaks-{label}.json'
        cmd=['gitleaks','detect','--no-git','--source',str(source),'--redact','--no-banner',
             '--report-format','json','--report-path',str(report)]
        if allow:
            cmd+=['--config',str(config)]
        run=subprocess.run(cmd,capture_output=True,text=True)
        (s.HERE/f'checks/gitleaks-{label}.log').write_text(run.stdout+run.stderr)
        findings=s.read(report) if report.exists() else []
        statuses.append({'label':label,'exit_code':run.returncode,'findings':len(findings),
                         'rules':sorted({f['RuleID'] for f in findings})})
        return run.returncode,findings
    initial,_=scan('expanded-initial',expanded)
    assert initial in [0,1]
    final,findings=scan('expanded-final',expanded,True)
    assert final==0 and not findings, statuses
    # A never-used random test string must still be detected with this exact allowlist.
    control=work/'control';control.mkdir()
    (control/'control.txt').write_text('api_key = "'+''.join(secrets.choice(string.ascii_letters+string.digits) for _ in range(48))+'"\n')
    control_code,control_findings=scan('negative-control',control,True)
    assert control_code==1 and any(f['RuleID']=='generic-api-key' for f in control_findings)
    s.write(s.HERE/'checks/gitleaks-status.json',{'status':'passed','scans':statuses,
        'allowlist':'only 146 exact frozen question identifiers; default rules retained',
        'coverage':'all material plaintext and all decompressed JSON gzip artifacts',
        'control':'never-used random non-credential detected; raw control not retained'})
    shutil.rmtree(work)
    print(json.dumps({'source_integrity':'passed','gitleaks':statuses}),flush=True)


if __name__=='__main__':
    main()
