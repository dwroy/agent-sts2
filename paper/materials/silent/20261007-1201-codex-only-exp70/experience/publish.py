import json,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');LIVE=ROOT/'.worktrees/live';M=json.load(open(O/'live-merge.json'));C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-result.json'))
assert M['merged'] and M['test_rc']==0 and L['check']==0
def git(*a):return subprocess.check_output(['git','-C',str(LIVE),*a],text=True).strip()
paths=['paper/materials/decision-log.md','eval/versions.json'];assert not git('diff','--cached','--name-only') and not git('diff','--name-only','--',*paths)
versions=json.load(open(LIVE/paths[1]));name='S1.exp70';assert not any(v['name']==name for v in versions['versions'])
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip()
message=f'Codex学习者经验自测后上线：静默经验{C["old_version"]}→{C["version"]}，源{M["source_commit"]}→实际live {M["merged"]}，eval {name}。来源notes/lessons.md:5371/5381的2Y27VAYZDA02与TDLBRNA0R05B SILENT A10及勘误、旧86静默局；条目'+','.join(C['updated'])+'；来源证据和反例12位局号见experience.json/historical-facts.json，账本'+','.join(L['proposed'])+'只CLI proposed/check0，交运维据experience-done核实际发布后登记shipped。新增0更新16（全补非药水证据、纯数字0）退役0、active139/49073字，高68中45低26；A8 132条45966字、A9 133条46265字。旧七数组/血档/源节点/回血/SL逐行一致，88局1324房78实死；激怒与萎靡加减力、敏捷/余像/覆甲、毒与呼唤先行损血、阶段/换战重建分核，女王同盤SL多15血价不定整局胜因。石头旧文76首帧按日志改80、新7合87；首COMBAT在小血瓶前使统计净损/操作战损差2，口径保持。源与合后固定沙箱tsc/vitest0，完整外部交调度器；无源码/生成器/手写知识/其他角色/新用药规则改动，主目录第70节/账本只追加由调用方提交，handoff-ops.md与完成JSON交调用器通知运维。' 
with (LIVE/paths[0]).open('a') as h:h.write('\n- '+stamp+' '+message+'\n')
versions['versions'].append(dict(name=name,family='Silent',commit=M['merged'],source=f'decision-log {stamp}（静默经验{C["version"]}，固定源{M["source_commit"]}；2Y27VAYZDA02/TDLBRNA0R05B A10及历史静默；新增0更新16退0，139 active/49073字；激怒萎靡/敏捷被动挡/毒与呼唤/SL血价/路线回血观察；源与合后沙箱tsc/vitest0，proposed交运维核实际登记shipped。）'))
(LIVE/paths[1]).write_text(json.dumps(versions,ensure_ascii=False,indent=2)+'\n');git('add',*paths);git('diff','--cached','--check');patch=O/'release.patch';patch.write_text(git('diff','--cached','--binary')+'\n')
with (O/'gitleaks-release.log').open('w') as h:subprocess.run(['nice','-n','19','/home/dw/.local/bin/gitleaks','dir','--redact','--no-banner',str(patch)],stdout=h,stderr=subprocess.STDOUT,check=True)
git('-c','user.name=dwroy','-c','user.email=roy.dongwei@gmail.com','commit','-m','Record Silent experience 2026-10-07.16 deployment','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
M.update(eval_version=name,release_commit=git('rev-parse','HEAD'),release_time=stamp);(O/'live-merge.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n');print('上线登记',M['release_commit'],name)
