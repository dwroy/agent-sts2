import json,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');LIVE=ROOT/'.worktrees/live';M=json.load(open(O/'live-merge.json'));C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-result.json'))
assert M['merged'] and M['test_rc']==0 and L['check']==0
def git(*a):return subprocess.check_output(['git','-C',str(LIVE),*a],text=True).strip()
paths=['paper/materials/decision-log.md','eval/versions.json'];assert not git('diff','--cached','--name-only') and not git('diff','--name-only','--',*paths)
versions=json.load(open(LIVE/paths[1]));name='S1.exp69';assert not any(v['name']==name for v in versions['versions'])
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip()
message=f'Codex学习者经验自测后上线：静默经验{C["old_version"]}→{C["version"]}，源{M["source_commit"]}→实际live {M["merged"]}，eval {name}。来源notes/lessons.md:5360的7ZUC4VPMDS41 SILENT A10及09:28勘误、旧85静默局；条目'+','.join(C['added']+C['updated'])+'；昏眩首证LRN0HPZ0FZS1/A0与本局/A10，其他证据见experience.json；账本'+','.join(L['proposed'])+'只CLI proposed/check0，交运维据experience-done核实际合入后登记shipped。新增1更新6（全补证、纯数字0）退役0、active139/49583字，高68中45低26；A8 132条46476字、A9 133条46775字。旧七数组/血档/源节点/回血/SL全部复算一致，86局1292房76实死；1层昏眩阻后续牌、阶段阈值/后段再加力、逐击力量/虚弱与毒实结算分账；T4 SL删防御同伤多损5、未控整战胜因。源及合后固定沙箱tsc/vitest0，完整外部交调度器；无源码、手写知识、生成器、其他角色或新用药规则改动。主目录第69节/账本只追加由调用方提交；handoff-ops.md与完成JSON交调用器通知运维。'
with (LIVE/paths[0]).open('a') as h:h.write('\n- '+stamp+' '+message+'\n')
versions['versions'].append(dict(name=name,family='Silent',commit=M['merged'],source=f'decision-log {stamp}（静默经验{C["version"]}，固定源{M["source_commit"]}；7ZUC4VPMDS41 A10、LRN0HPZ0FZS1 A0与历史静默；新增1更新6退0、139 active/49583字，昏眩/阶段再成长/逐击力量/毒与SL血价、路线回血观察；源与合后沙箱tsc/vitest0，九项proposed交运维核实登记shipped。）'))
(LIVE/paths[1]).write_text(json.dumps(versions,ensure_ascii=False,indent=2)+'\n');git('add',*paths);git('diff','--cached','--check');patch=O/'release.patch';patch.write_text(git('diff','--cached','--binary')+'\n')
with (O/'gitleaks-release.log').open('w') as h:subprocess.run(['nice','-n','19','/home/dw/.local/bin/gitleaks','dir','--redact','--no-banner',str(patch)],stdout=h,stderr=subprocess.STDOUT,check=True)
git('-c','user.name=dwroy','-c','user.email=roy.dongwei@gmail.com','commit','-m','Record Silent experience 2026-10-07.15 deployment','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
M.update(eval_version=name,release_commit=git('rev-parse','HEAD'),release_time=stamp);(O/'live-merge.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n');print('上线登记',M['release_commit'],name)
