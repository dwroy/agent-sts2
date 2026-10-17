"""Package auditable phase evidence; never manufacture a validation or publication result."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

OUT=Path(__file__).resolve().parent
WORK=OUT.parents[2]
PAPER=WORK/'paper/materials/20261017-human-pace-h0'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load(n):return json.loads((OUT/n).read_text())
def save(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')

questions=[
 {'claim':'六目标旧校准高leak/失败项可定位为敌方某招伤害倍率错误。','finding':'该假设尚未普遍成立。24选定战203个严格命令窗口中179可回放、178净掉血相符；24 no solve未知。17窗口的旧last已在掉血之后，旧leak分母少计。净损仍混合持牌、回合末/回合初效果，不能替代纯敌伤结算。整战策略/抽牌轨迹尚未隔离。','evidence':['TXZ6RVMQA09D A10 F48 attempt3 T2: 56→50，旧last50而leak0','diagnosis.json','end-turn-windows.json','window-replay-merged.json','window-sources.json'],'recommendation':'保留原阈值和低可信；修后481验证及原leak口径分列，量测时点/纯敌伤assay另由原任务处理，不以换标签通过闸门。','existing_entry_ids':['silent-g1a-fixed-production-boundary','silent-g1a-aeonglass-calibration-boundary','silent-h0-end-turn-measurement-boundary']},
 {'claim':'旧经验silent-paper-krane-weak-multihit已被后续回合敌伤模型完整消费。','finding':'ZZMYZ5UBCG72 A2四招六上下文的9个意图端点显示不一致：已有虚弱后续模型仍乘0.75，实盘文本40%及意图支持这些上下文乘0.6。仍只有1独立局，不支持扩到A10、新施虚弱或任意力量/怪物。','evidence':['ZZMYZ5UBCG72 A2 F48 attempt1 T2–T7','repair-probe-v2-output.json','adapter-probe-v4-output.json','source-boundary-v2-equivalence.json'],'recommendation':'仅上线角色/进阶/有效遗物/原基数命中数及六上下文均匹配的窄修，保留旧经验n=1与低置信；未观察范围沿旧路。','existing_entry_ids':['silent-paper-krane-weak-multihit']},
 {'claim':'UJ0K3G10609Y残差足以证明双尾挡或silent-0332根因已解决。','finding':'唯一净损差为A10 F48第6试T2实损5、模拟11；6差兼容披风搭扣/奥利哈钢组合挡，但该窗口没有分离触发顺序、完整资源封套和其他条件，不能证明因果或声称0332修复。','evidence':['UJ0K3G10609Y A10 F48 attempt6 T2','diagnosis.json:first_same_window_net_divergence','windows/UJ0K3G10609Y-F48-a6-T2-pre.json','windows/UJ0K3G10609Y-F48-a6-T2-next.json'],'recommendation':'给原0332 owner精确源偏移，保持unknown与原失败历史；本H0不改turn-solver/SL/药水或通用连战接口。','existing_entry_ids':['silent-g1a-test-subject-calibration-boundary','silent-h0-end-turn-measurement-boundary']}
]
save(OUT/'questions.json',questions)
diag=load('diagnosis.json');cache=load('tuning-cache-v2.json');extract=load('extraction-summary.json')
assert diag['corrected_window_totals']=={'windows':203,'replayed':179,'net_hp_matches':178,'unavailable':24} or sum(b['end_turn_windows'] for b in diag['bosses'])==203
archive=Path(cache['archive']);fit=json.loads((archive/'tuning-fit.json').read_text())
files=['actual-runtime-readback.json','start-receipt.json','extraction-summary.json','all-target-source-receipt.json','all-target-frame-sources.jsonl','all-target-attempts-summary.jsonl','all-target-metadata-sources.json','raw-frame-manifest.json','window-sources.json','end-turn-windows.json','window-summary.json','window-replay-merged.json','table-audit-merged.json','turn-trajectories.json','diagnosis.json','frozen-tail-readback.json','frozen-model-input-manifest.json','derived-source-imports.json','new-object-plan.json','phase-execution.json','phase-execution-corrected.json','counts-correction.json','repair-source-manifest.json','repair-source-manifest-v2.json','source-boundary-v2-equivalence.json','repair-reuse-certificate.json','repair-affected-keys.json','repair-probe-output.json','repair-probe-v2-output.json','adapter-probe-v3-output.json','adapter-probe-v4-output.json','tuning-cache.json','tuning-cache-v2.json','process-completions.json','early-experience-overlap.json','early-source-overlap.json','tuning-no-solve-input-summary.json','compiled-v2-manifest.json','validation-resume-plan-v2.json','validation-keys.json','h1-shared-leaf-dependency.json','h1-shared-leaf-dependency-v2.json','candidate-experience-objects.json','check-experience.json','questions.json','ledger-items.jsonl','ledger-counts-correction.json','ledger-source-location-update.json','proposal-item-0.json','proposal-item-1.json','proposal-item-1-correction.json','proposal-paper-krane.md','proposal-calibration-boundaries.md','proposal-calibration-boundaries-correction.md','source-sandbox.log','source-sandbox.exit','source-sandbox-started.txt','source-sandbox-finished.txt','test-history-preserved.json','test-history-restored.json','import-preflight.json','source-scan-finding-analysis.json','source-precommit-rejected.json','source-gitleaks.log','source-gitleaks.exit','source-gitleaks-diagnosis.json','source-sandbox-v2.log','source-sandbox-v2.exit','source-sandbox-v2-started.txt','source-sandbox-v2-finished.txt','test-history-preserved-v2.json','test-history-restored-v2.json','repair-unit.log','repair-unit.exit','repair-negative.log','repair-negative.exit','candidate-v2-input.json','candidate-v2-output.json','candidate-v2-command.json','candidate-v2-observation-before.json','candidate-v2-observation-after.json','candidate-v2-read-guard.json','candidate-v2.log','candidate-v2-wrapper.log','candidate-consumer.log','candidate-consumer.exit','adapter-probe.log','adapter-probe-v2.log','compile-model.log','compile-model-v2.log']
scripts=['extract.py','windows.py','source-index.py','source-metadata.py','diagnosis.py','finish-tuning.py','refreeze-v2.py','repair-probe-v2.mjs','repair-probe-negative.mjs','adapter-probe-v4.mjs','table-audit.mts','window-replay.mts','run-source-sandbox.sh','run-source-sandbox-v2.sh','preserve-test-history.py','package-phase.py','move-helper-v2.py','complete-phase.py','publish.py']
for category,names in [('evidence',files),('scripts',scripts),('validation',['consumer.mts','consumer-v2.mts','input-read-guard.mjs','run-consumer.py'])]:
    folder=PAPER/category;folder.mkdir(parents=True,exist_ok=True)
    for name in names:
        source=OUT/name
        if not source.exists():continue
        shutil.copyfile(source,folder/name)
patch=subprocess.check_output(['git','diff','--binary','54e36d0830ab640130557b62a078b25954912ff4','--','agent/src/reflex/rollout.ts','agent/src/reflex/rollout-live.ts'],cwd=WORK)
(PAPER/'evidence/source.patch').write_bytes(patch)
text=f'''# H0/r1：机制与源码阶段，验证尚待接续

请求 roy-20261017-human-pace-h0/revision1；input SHA {diag['input_sha256']}，manifest SHA {diag['frozen_manifest_sha256']}。原 owner/thread 01a1415e-a511-7131-be7c-a2dc691c847f/batch050119；本批095852，原生gpt-6.1-sol/xhigh/default、240分钟，实际启动/实收原件见evidence/start-receipt.json及actual-runtime-readback.json。不是Roy ACK。

本阶段交付：六目标原始来源、逐回合诊断、一项有证据的A2窄修、原固定107调参缓存及9条限定经验；481验证未运行，不能签发新trust或关闭H0。计算计划与实际耗时见phase-execution-corrected.json。单批结束不关闭0332、human-pace宽父或G1a旧父；G1a完成历史不改。

## 输入与分母

只用cut以内已结束SILENT A0–A10：333局，六目标923尝试/178不同局，617仅预测死亡的截断试次，306真实结局。SL身份、局号/层/attempt/turn/进阶、实际遗物/状态、先行run-config源码与数据版本见all-target-attempts-summary.jsonl；923事件+188配置共1111原偏移无缺失。每Boss/局只一个真实结局，SL不增加独立分母。最后结束时间{extract['frozen_end_cut']}。states cut={extract['cuts']['logs/states.jsonl']}、decisions={extract['cuts']['logs/decisions.jsonl']}、runs={extract['cuts']['logs/runs.jsonl']}字节，其他cut见extraction-summary。原sl.jsonl缺失，已有更早冻结sl-attempts cut的来源与补索引明列，不热换本输入。

14,124端点原始path/offset/len/SHA在all-target-frame-sources.jsonl，哈希628,826,219字节，原日志仍只读；24诊断战原帧454份另在本任务scratch/raw、203命令窗口在scratch/windows（未复制整个仓库）。输入bounds为元数据/尾段SHA，不冒称全前缀SHA；个别dirty版本仅是观测，未伪造当时原子运行树。

## 旧固定校准、当前生产和新对象

R366旧对象7e1193/107调参/460验证/70生产输入差保留；本轮冻结校准21仍7e1193，107/481，artifact995fbdbd，model a16714b6349b4d4c79bbc91c3875c979607f80da1e619b59f5a0a82e45210a5a。新源基于冻结live99737be9fdb9c2ea92089d768947c49b49b62382，原210叶中live73、main103差异，另65个源码导入闭包；冻结各叶不是历史全树原子快照。未重复旧107/460或旧full；因真实源码/数据输入改变，先冻结new-object-plan后才算新107。

新修对象 model {cache['model_sha256']}，artifact {cache['artifact']}，base54e36上的两源码叶覆盖冻结live闭包；277旧原型输入移除纯helper模块后为276叶。V1原型缓存{cache['previous_preserved_artifact']}与首轮架构失败均原样留存；纯函数原文移入既有adapter，调用点/算术/RNG未变，9意图、8隔离组及B2/B3构造输出逐对象相等，复用214个已算调参行，未再跑107模拟。固定200次/seed1+原588全行序号*101，B2=T1、B3=pre，切点2026-10-06T02:46:11.648000、107keys/481keys不移动。验证标签未参与模型选择，未更改criteria或leak口径。

## 六目标旧四闸与缺口

阈值原样：min_fights10，Brier≤整体1.25倍，胜率差≤0.15，leak∈[0.7,1.3]。下表是旧固定校准21，不是新对象/当前线上可信表。六项数量均距10缺0；质量失败不能用承诺再加若干局代替，需多少额外独立结局未知。Queen、Knowledge各1来源no solve剔除而不补零。

|Boss|B2/B3有效n|Brier B2/B3|预测/实际 B2；B3|leak B2/B3|失败 B2；B3|新验证|
|---|---:|---|---|---|---|---|
'''
for boss in diag['bosses']:
    a=boss['frozen_old_gates']['t1']['original_metrics'];b=boss['frozen_old_gates']['pre']['original_metrics']
    text+=f"|{boss['boss']}|{a['n']}/{b['n']}|{a['brier']}/{b['brier']}|{a['mean_pred']}/{a['actual_win']}；{b['mean_pred']}/{b['actual_win']}|{a['leak_ratio']}/{b['leak_ratio']}|{','.join(a['failed'])}；{','.join(b['failed'])}|待481keys|\n"
text+='''
## 首次分歧与机制修正

24战203窗口中179可回放、178净HP相符、24 no solve未知。17旧last已在掉血后，旧leak可少计，不能将换标签当过闸。净HP还含持牌/回合初末效应，不是纯敌伤。首次净损差仅UJ0K3G10609Y A10 F48a6T2实际70→65、模拟11；组合挡顺序未隔离，不据此改0332/turn-solver。

|Boss|尝试/独立局|命令窗口/可回放/净损相符/缺失|首次机制结论或具体缺口|
|---|---|---|---|
'''
for b in diag['bosses']:
    ev=b['all_ended_silent_evidence'];text+=f"|{b['boss']}|{ev['attempts']}/{ev['independent_runs']}|{b['end_turn_windows']}/{b['replayed_windows']}/{b['net_hp_matches']}/{b['unavailable']}|{b['repair'] or '未隔离可修招式错误'}；{b['remaining_gap']}|\n"
text+='''
证据支持的唯一窄修：ZZMYZ5UBCG72 A2 F48首试T2–T7，纸鹤原文40%，聚合体四招六已见力量/易伤上下文的9意图端点。旧后续已生效Weak乘0.75；限定有效未熔纸鹤、SILENT/A2、相同基数/命中及六上下文改0.6。TACKLE2:18→10；BEAM(0力+易伤)7×3、(-3力+易伤)4×3；TACKLE3(1力+易伤)13、(4力+易伤)16；TACKLE4(2力+易伤)14。仍1独立局，非9局；A10、新施Weak、其他力量/怪物、遗物缺失/熔化和其他角色保持旧路。当前意图、未来命中次数/阶段、面对朝向、整战策略与抽牌没有因这个固定probe全部验证。静态per-hit审计为TEST_SUBJECT 0/82、AEONGLASS 0/50、QUEEN 9/61、KAISER_CRAB 99/116、KNOWLEDGE_DEMON 0/60、THE_INSATIABLE 0/46；该简化审计未输入Facing，帝王蟹首项实际敌ID为CRUSHER，不把99差异直接判敌招错或改其倍率。逐Boss招式ID与原帧见table-audit-merged.json，阶段/命中数/朝向及完整轨迹仍待隔离。

源码仅rollout.ts未来已有Weak选择与rollout-live.ts真实board适配；现有结构断言不改，新测试8例。原原型类型导入违反架构，首轮完整sandbox=1/4275通过，第二轮保留同入口与断言。失败编译/无手牌adapter/旧consumer Node Git EPERM原件保留。旧历史副本1076文件SHA复核、20他角色知识仅opaque inode/metadata原位rename；未读其内容，测试结束恢复原路径，未删历史。

## 调参残差、未完成校准与下一步

每端107keys候选/106成功；K3676LU8B0UH:48:2:6525158984两起点no solve原件保留。只修中的ZZMYZ5UBCG72调参key变化，验证key受此窄修直接影响0；但整个新生产对象相较7e1193已变，不能沿用旧验证预测。B2该key原始0.13→0.16、B3 0.23→0.28只是一个固定输入的条件模拟，不是自然胜率。

|起点|训练Platt a/b/c|训练A0–4 n/预测差/Brier/leak|训练A5–9|训练A10|
|---|---|---|---|---|
'''
for start,f in fit.items():
    parts=[]
    for group in ['A0–4','A5–9','A10']:
        r=f['tuning_residuals'][group];parts.append(f"{r['n']}/{r['gap']:+.3f}/{r['brier']}/{r['leak_ratio']}")
    text+=f"|{start}|{json.dumps(f['platt'],ensure_ascii=False)}|"+'|'.join(parts)+'|\n'
text+='''
完整分组机器表在tuning-fit.json，上表为训练内残差而非新验证认证。旧验证仅A10（479可用总体），A0–4/A5–9各0、距每组10各缺10；旧A10预测差B2约+0.037/B3+0.040。新481验证尚未启动，所有修后逐Boss Brier/gap/leak和A10验证残差unknown。旧F49验证31独立场，B2/B3 Brier 0.1821/0.1622、预测0.464/0.421对实际0.161、leak 2.704/2.814，距数量门槛缺0但质量不达。A10包含F49的单Boss/双Boss范围沿旧表分列；F49联合率仍unknown，不用均值HP替代。

下一步同owner/thread原H0/r1用repaired-v2-compiled冻结对象、validation-keys.json及原588行种子，至多4个nice19预编译Node进程只算481验证keys。tuning-fit与214结果已冻结，不重拟合验证、不再算旧107/旧full；保持原Platt选择、四闸、B2/B3起点。所得结果经原流程形成新的内容指纹目录与完整completed，再判断是否发布trust；没过继续low-trust。H1部分采样预算、实际上线组合的新刷新叶、自然效果另核，本full对象不能认证它们。

## 经验、提案、限制与责任

经验候选2026-10-17.h0-r1：9对象，6个Boss限制、纸鹤旧条目补窄修、固定生产边界、测量时点边界。每条canonical SHA见candidate-experience-objects.json；实际live/消费者结果必须以之后真实publication与consumer receipt为准，本阶段源报告不先冒称上线。账本silent-0500 mechanic、0501 fight，经CLI proposed；初稿手工误加193/162/161/31，已CLI追加203/179/178/24勘误，原add/提案/失败保留。未冒造bug-infra或shipped。

提案6ddd086196022f15为纸鹤窄修；a6cf9f726a971b59为保留的旧计数稿、7b0badc658e4fb1b为修正稿和剩余assay限制，未隔离机制不冒实现。implemented只在真实live源码祖先存在后CLI登记。Roy架构授权是原固定split/四闸/先证据再修改、自测自行live；40%窄修、时点疑点与未知从Silent实际日志学得，并非Roy提供事实。

questions.json原文列3项异议：高比值非招式因果证明、旧纸鹤经验/后续模型不一致、净损差不关闭0332。实际通知沿授权根双追加交ops→watcher→Roy，不代ACK；自然消费和收益待观察。通用连续Boss接口、H1预算/排序、0332及宽父保持原owner责任。
'''
(PAPER/'phase-report.md').write_text(text)
manifest={'request_id':diag['request_id'],'revision':1,'stage':'source-evidence-and-tuning','files':[{'path':str(p.relative_to(WORK)),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(PAPER.rglob('*')) if p.is_file() and p.name!='phase-manifest.json']}
save(PAPER/'phase-manifest.json',manifest)
print(json.dumps({'files':len(manifest['files']),'report':str(PAPER/'phase-report.md'),'model':cache['model_sha256']}))
