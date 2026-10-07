import json,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');LIVE=ROOT/'.worktrees/live';M=json.load(open(O/'live-merge.json'));C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-result.json'))
assert M['merged'] and M['test_rc']==0 and L['check']==0
def git(*a):return subprocess.check_output(['git','-C',str(LIVE),*a],text=True).strip()
paths=['paper/materials/decision-log.md','eval/versions.json'];assert not git('diff','--cached','--name-only') and not git('diff','--name-only','--',*paths)
versions=json.load(open(LIVE/paths[1]));name='S1.exp71';assert not any(v['name']==name for v in versions['versions'])
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip()
message=f'Codex学习者经验自测后上线：静默经验{C["old_version"]}→{C["version"]}，源{M["source_commit"]}→实际live {M["merged"]}，eval {name}。来源notes/lessons.md:5392的MCT1GPTL8D35 SILENT A10及寄生惧魔ID勘误、旧88静默局；条目'+','.join(C['updated'])+'；支持/反例局号和进阶见经验及historical-facts.json，账本'+','.join(L['proposed'])+f'仅CLI proposed/check0，交运维据experience-done核实际登记shipped。新增0更新10全补非药水证据、纯数字0退役0、active139/{C["chars"]}字；A8 {C["applicable"]["8"]}、A9 {C["applicable"]["9"]}。旧七数组/血档/源节点/回血/SL全部一致，新89局1341房79实死。尖啸临时减力/余像逐牌挡/毒兑现及能力实建分账；史莱姆同盘換谋划专家多8血、同伤52，四试0赢不定替线整战胜因。源与合后沙箱tsc/vitest0；无源码/生成器/手写知识/其他角色/新用药规则改动，刷新blob保持。主目录第71节及账本只追加交调用方提交；learner/runs/20261007-121302-experience-update/handoff-ops.md与完成JSON交调用器通知运维，完整外部检查交调度器。不停对局、不运行play、不推送。'
with (LIVE/paths[0]).open('a') as h:h.write('\n- '+stamp+' '+message+'\n')
versions['versions'].append(dict(name=name,family='Silent',commit=M['merged'],source=f'decision-log {stamp}（静默经验{C["version"]}；MCT1GPTL8D35 A10及本角色历史；增0改10退0，139条{C["chars"]}字，尖啸/余像/毒与SL局部血价、路线回血及能力兑现；源与合后沙箱tsc/vitest0。）'))
(LIVE/paths[1]).write_text(json.dumps(versions,ensure_ascii=False,indent=2)+'\n');git('add',*paths);git('diff','--cached','--check');p=O/'release.patch';p.write_text(git('diff','--cached','--binary')+'\n')
with (O/'gitleaks-release.log').open('w') as h:subprocess.run(['nice','-n','19','/home/dw/.local/bin/gitleaks','dir','--redact','--no-banner',str(p)],stdout=h,stderr=subprocess.STDOUT,check=True)
git('-c','user.name=dwroy','-c','user.email=roy.dongwei@gmail.com','commit','-m','Record Silent experience 2026-10-07.17 deployment','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
M.update(eval_version=name,release_commit=git('rev-parse','HEAD'),release_time=stamp);(O/'live-merge.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n');print('上线登记',M['release_commit'],name)
