"""Package the actual source, complete fixed results and bounded learning for review."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
OUT = HERE.parent
WORK = OUT.parents[2]
PHASE = OUT / 'validation-phase-2'
PAPER = WORK / 'paper/materials/20261017-human-pace-h0/test-subject-phase-repair'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    complete = json.loads((HERE / 'calibration-completed.json').read_text())
    archive = Path(complete['archive']); metrics = json.loads((archive / 'boss-trust-candidate.json').read_text())
    comp = json.loads((archive / 'before-after.json').read_text())
    baseline = json.loads((PHASE / 'validation-completed.json').read_text())
    ledgers = json.loads((HERE / 'delivery-ledger.json').read_text())
    change = json.loads((HERE / 'experience-changes.json').read_text())
    qualification = json.loads((HERE / 'source-qualification.json').read_text())
    assert qualification['status'] == 'passed' and qualification['exit_code'] == 0
    assert sha(Path(qualification['log']['path'])) == qualification['log']['sha256']
    assert json.loads((HERE / 'check-experience.json').read_text())['missing'] == []
    PAPER.mkdir(exist_ok=False)
    for folder in ['evidence', 'scripts', 'validation', 'baseline-validation']:
        (PAPER / folder).mkdir()
    for path in HERE.iterdir():
        if path.is_file() and path.suffix in ['.json', '.jsonl', '.log', '.exit', '.patch', '.md', '.txt']:
            shutil.copyfile(path, PAPER / 'evidence' / path.name)
        elif path.is_file() and path.suffix in ['.py', '.mjs']:
            shutil.copyfile(path, PAPER / 'scripts' / path.name)
    for name in ['consumer-v2.mts', 'input-read-guard.mjs', 'run-consumer.py']:
        shutil.copyfile(HERE / name, PAPER / 'validation' / name)
    for name in ['preflight.json', 'start-receipt.json', 'actual-runtime-readback.json', 'native-turn-context.jsonl',
                 'original-handoff-integrity.json', 'current-production-observation-start.json', 'validation-completed.json',
                 'observed-sequence-summary.json', 'observed-sequences.json', 'mechanism-boundaries.json', 'progress.jsonl',
                 'test-subject-phase-power-plan.json', 'finish-validation.py']:
        shutil.copyfile(PHASE / name, PAPER / 'baseline-validation' / name)
    for shard in range(4):
        for name in [f'command-{shard}.json', f'start-{shard}.json', f'exit-{shard}.json', f'worker-{shard}.log']:
            shutil.copyfile(PHASE / name, PAPER / 'baseline-validation' / name)
        shutil.copyfile(OUT / f'validation-read-guard-{shard}.json', PAPER / 'baseline-validation' / f'validation-read-guard-{shard}.json')
    shutil.copytree(HERE / 'raw-f49', PAPER / 'evidence/raw-f49')
    shutil.copytree(HERE / 'calibration-import-support', PAPER / 'scripts/calibration-import-support')
    patch = subprocess.check_output(['git', 'diff', '--binary', '8544db04cfd497fecfa9427c7c1c0c7362077cc3', '--', 'agent/src/reflex/rollout.ts', 'agent/src/reflex/rollout-live.ts'], cwd=WORK)
    (PAPER / 'evidence/source.patch').write_bytes(patch)
    test = WORK / 'agent/tests/silent-test-subject-phase.test.ts'
    shutil.copyfile(test, PAPER / 'evidence/silent-test-subject-phase.test.ts.txt')
    lines = ['# H0/r1：实验体阶段状态修正、原固定切分增量校准与经验', '',
             '请求 `roy-20261017-human-pace-h0` / revision1；原owner/thread `01a1415e-a511-7131-be7c-a2dc691c847f`、batch050119接续，旧G1a/R366及原源/失败/收件历史保留。输入SHA `982c4264158fe5426423cf02477f22822d1a2b5e8bff058c7575a52bd6f7da54`，冻结manifest SHA `7bdcf916f6ff77e5ff1d88a58662a51a9b97aac4db380552470d2e66105cdb84`。原生本次turn_context实核gpt-6.1-sol/xhigh、workspace-write/禁网/never；没有改账号、home、模型、配置或权限。', '',
             '## 输入与对象边界', '',
             '只用原R1 cut内已结束SILENT：最后结束2026-10-17T01:47:33.841Z，states13795215424、decisions2151985895、runs355475、run-config1928062字节。原bounds为元数据/尾SHA，不冒全前缀SHA。六目标923尝试/178不同局，617预测死亡截断、306真实结局；SL/层/attempt/turn/源码与数据版本以及14,124原帧offset/len/SHA/1111公共事件配置来源，复用原H0 phase-report与evidence目录，不重扫全源。', '',
             'R366旧7e1193的107调参/460验证/70生产差，与校准21旧7e1193的107/481（artifact995fbdbd、modela16714b6）、本轮冻结live99737的原210叶73差/另65源码依赖分列；冻结叶不是原子运行树。', '',
             f"按上一阶段计划完整算了不可变model86f9bd67的481验证keys×T1/pre共962行，保存新基线artifact `{baseline['artifact']}`；原调参214行/Platt不动。新发现有原帧与源码支持的实验体阶段字段缺口后，另建模型 `{complete['receipt']['model_sha256']}` / 完成artifact `{complete['artifact']}`。同276输入叶/241编译模块，只有两源码叶新增窄修；输入/编译清单、固定命令、原始rc和读入guard均保存。", '',
             '研究对象以逐叶SHA和最小编译闭包定义，不能拿patch提交冒充整个旧运行树。实际当前生产含H1有限前缀/预算、螺线等源码与刷新数据差，发布前后另保存逐SHA边界；这个固定200样本full对象不能认证这些后继模式。未读其他角色私有知识，既有common boss模型只按原授权复用。', '',
             '## 机制证据与源码修正', '',
             '首轮源码full原件rc1：2项失败（check-imports扫描到两份不完整的源码证据副本；原Queen/Amalgam用例在3个MC并行时超过原20秒上限）。校准已全部完成后，规范源码仍在不可变experiment，scratch副本按原字节转为明确.ts.txt证据数据，未改生产导入或断言。之后无MC、官方worker=2重新运行原完整sandbox，合格结果/源码SHA/原失败分开保存；锁内新组合也用worker=2，所有时限/排除表不变。', '',
             '拟合首次启动因冻结目录缺少纯角色路径辅助characters.py而在import阶段退出1，没有生成拟合；原fit.log/fit-first-exit与成功fit-v2原件分存。辅助模块按Git blob和SHA另冻结，四个原数值校准模块与上一阶段调参用源码逐字节相同，MC的276叶/241模块及所有游戏数据未替换。新拟合/最终汇总用同一被冻结driver SHA，验证阶段fit函数明确禁止。', '',
             '既有silent-test-subject-phase-reset事实是正确的；缺口在消费：enemyDown换相只重置HP/Strength/Weak/poison/revives，base.enrage/woundsPerHit仍继承，laterTurnSim会带到后继solver。JMH5C51RLN4E A10 F48第5试T4→T5/T7→T8（原调参key）有完整两次能力更换；UJ0K3G10609Y、YZWV37N2MU6N另核第一换相，后者还核第三相。', '',
             '从原已哈希索引内定点读取F49 TEST_SUBJECT真实结局端点：14场/14独立局、128帧，5局有111/ENRAGE3→212/PAINFUL1且ENRAGE消失；LKC9YXKZWTKR另有313/NEMESIS且PAINFUL消失。原字节逐SHA核并保raw-f49；没有延伸cut、加入新校准key或把SL/窗口当独立局。F48+F49能力证据8独立局，第三相有3局；不据此证明F49概率质量或联合率。', '',
             '受影响固定keys共31：2个F48调参、29个验证（F48 16、F49 13），均按原整体集合/行序列保留；额外定点核到的第14个F49真实结局没有加入原固定校准。原帧用于字段核查，SL/窗口/固定probe不增独立局。', '',
             '新源码仅实际Silent/A10、单实验体、已见111/Enrage3/无Painful或212/Painful1/无Enrage的adapter签名置标志；whole-fight内再核111→212或212→313及对应静态字段，清enrage、设woundsPerHit为1/0并同步这两个power元数据。其他角色/阶/未见HP能力/额外敌人/短rollout沿旧路。既有Nemesis、HP、毒、Strength流程与全部权重/费用/药水/保血/目标/SL阈值不改；没有新增完整Wound入牌堆规则。', '',
             '实际编译旧/新两轮受控probe隔离能力状态与下一Skill：强制毒击杀/高效用Block是测试控制，不是原整战回放或游戏事实；旧后继Skill虚构+3 Strength，新为0，第二相Painful出现、第三相消失，原Nemesis保留。未激活/A9/其他敌人/未见Enrage/短rollout数值等价；真实T1 board及原B3/pre redeal保留标志，合成其他角色标签不启用且不读其知识。实际负向rc/正向输出/隔离与3单测、源sandbox原件保留，不将固定probe当自然收益。', '',
             '新增实际原帧换相probe另保存：只选原调参JMH的T4/T7两个endturn窗口，保原手牌/资源、同一实际不出牌动作，比较旧/新阶段能力字段和HP上限。其他结算/后继策略/胜率不据此认证；实际输出与退出码另附。', '',
             '原24诊断战203窗口/179可回放/178净损相符/24 no solve原样保留。262个有后继敌帧招式转移在原后继表，帝王蟹2处缺后继不算转移反例。每轮从真实帧重建会重新读取正确阶段能力，单轮净血相符仍可漏掉跨相静态字段残留，故不能推定整场状态等价。其余目标未隔离可修A10招式因果；女王纸鹤修复仍只A2一局。', '',
             '17旧末帧时点问题（沙漏8、女王6、知识恶魔3）未修标签；如TXZ6RVMQA09D F48a3T2实56→50、旧last50/leak0。唯一同窗口净损差UJ0K3G10609Y F48a6T2实5/模拟11，组合尾挡未隔离，不宣称0332根修复。净损含持牌/轮初末/回复/复活，不替代纯敌伤。', '',
             '## 固定切分、Platt与计算复用', '',
             f"原cutoff `{metrics['split']['cutoff_ts']}`，107调参/481验证keys整局不跨边；每起点200样本，seed=1+原588全行序号×101，B2=T1、B3=pre。新对象只重新计算2调参keys的4行，再按同一select_model在原107集合上拟合并冻结训练Platt，之后只算29验证keys的58行。557个谓词外keys/1114行来自完成的v2基线，实际编译隔离和源码零分支变化证明后复用。没有重跑旧107/旧7e1193全量，没有新模型API/对局/监听。", '',
             '|起点|冻结新训练Platt|调参成功/107|验证成功/481|', '|---|---|---:|---:|']
    for start in ['t1', 'pre']:
        r = metrics['overall'][start]; lines.append(f"|{start}|{json.dumps(r['platt'])}|{r['tune_n']}|{r['n']}|")
    lines += ['', '模型拟合/进阶项选择只用训练。验证汇总禁止fit调用；旧与新缺失、raw预测/真实结局标签、原leak、所有分组和准入门槛保持。新raw结局不被模拟标签替代，capped/无解按原方法保留。', '',
              '## 逐Boss四闸与数量/质量缺口', '',
              '门槛原样：有效独立验证≥10；Brier≤整体1.25倍；|预测−实际|≤0.15；leak∈[0.7,1.3]，缺leak/整体校准也不能准入。以下修前是同冻结v2新源对象，旧7e1193另列而不混同生产。共同成功key的Brier/胜率/leak也在before-after.json中；缺失集合变化不冒修复收益。数量距10缺0不等于质量通过，质量需多少额外局未知。', '',
              '|Boss|起点|独立有效/源/缺失|距10还差|旧7e Brier|v2→新Brier|预测差v2→新；新预测/实际|v2→新leak|失败|', '|---|---|---:|---:|---:|---|---|---|---|']
    for boss, starts in comp.items():
        for start, c in starts.items():
            m = c['after_phase_repair']; b = c['before_v2']; old = c['historical_7e1193']; gap = m['mean_pred'] - m['actual_win']
            lines.append(f"|{boss}|{start}|{c['independent_runs']}/{c['candidate_runs']}/{c['candidate_runs']-m['n']}|{m['missing']}|{old['brier']}|{b['brier']}→{m['brier']}|{b['mean_pred']-b['actual_win']:+.3f}→{gap:+.3f}；{m['mean_pred']}/{m['actual_win']}|{b['leak_ratio']}→{m['leak_ratio']}|{','.join(m['failed']) or '通过'}|")
    lines += ['', '实验体预测差同样按修前/后报告：Brier和穿透比改善不能代替胜率差闸门；其余Boss的raw预测沿旧对象复用，Brier变化来自同一整体训练Platt的变化，不声明其机制已修。']
    lines += ['', f"本固定对象B2通过 `{','.join(metrics['trusted_b2']) or '无'}`；B3通过 `{','.join(metrics['trusted_b3']) or '无'}`。只在该指纹候选名单中按原闸自动列入；当前生产输入和H1部分采样不同，不替换生产boss-trust、不宣布当前线上新增可信项。原trust/其他角色/刷新保留。", '',
              '## 进阶残差与F49', '', '|起点|集合|组|n|预测差|Brier|leak|', '|---|---|---|---:|---|---|---|']
    for start, sides in metrics['residuals'].items():
        for side, groups in sides.items():
            for group, r in groups.items():
                lines.append(f"|{start}|{side}|{group}|{r['n']}|{r['gap']}|{r.get('brier')}|{r.get('leak_ratio')}|")
    lines += ['', '验证全为A10；A0–4/A5–9各0，组内样本外残差无法估计，训练残差不充样本外认证；原准入仍按逐boss总体四闸，未另设进阶闸。A10/F49低信度及逐Boss质量失败按原表保留，不跨阶/跨角色借信度。', '',
              '|起点|F49集合|n|Brier|预测/实际|leak|限制|', '|---|---|---:|---|---|---|---|']
    for start, value in metrics['stage_metrics'].items():
        use = 'b2' if start == 't1' else 'b3'
        for side, r in value['F49'].items():
            if r: lines.append(f"|{start}|{side}|{r['n']}|{r['brier']}|{r['mean_pred']}/{r['actual_win']}|{r['leak']['enemy_ratio']}|{metrics['stage_low'][use].get('49', '原单战四闸通过，联合率仍unknown')}|")
    lines += ['', 'F49只用真实入口资源下的单战胜败，F48胜不算整局通关；未建联合率、不拿平均HP补未知，也不关闭通用连战/0332或H1自然验收。F49能力字段有证据，不等于全资源和概率误差均可信。', '',
              '## 经验、账本、实际交付', '',
              f"经验候选2026-10-17.h0-r1-phase2更新9条，实际消费者目标10条（含未改纸鹤对象）；canonical SHA见candidate-experience-objects.json。原阶段事实支持{change['old_phase_fact_support']}→{change['new_phase_fact_support']}只按新增唯一真实源局去重，原六Boss数量未因计算或SL增加。新账本 `{ledgers['ids']}` 只CLI proposed；旧0500/0501 shipped状态不降级。新提案2d57d88e790a9bf3/原结构提案7b0badc658e4fb1b关联，assay/完整资源与未隔离目标仍waiting，implemented只在实际live源码祖先后登记。", '',
              '源固定回归/tsc+sandbox通过的原件保留；实际新组合sandbox、live祖先、固定发布树、eval版本和10对象生产load/render/query输入/输出/command/guard/receipt必须由随后真实publication/completion记录提供。本报告是计算后、发布前源码材料，不预称上线、宿主full或自然效果。', '',
              'Roy要求的是先证据修模、角色隔离、固定切分/整体Platt/四闸与自行自测live；数值、状态、支持/反证/未知均从Silent真实日志和固定计算得到。原三异议原文不改，新第四项指出旧阶段事实尚未被full模型消费；沿实际ops→watcher→Roy收件链转交，不代ACK或关闭宽父。', '']
    text = '\n'.join(lines)
    assert not (HERE / 'report.md').exists()
    (HERE / 'report.md').write_text(text); (PAPER / 'report.md').write_text(text)
    at = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip()
    with (WORK / 'paper/materials/decision-log.md').open('a') as handle:
        handle.write(f'\n- {at} H0/r1实验体阶段状态源码/固定校准交付材料：原86f9bd67的481验证962行完成，新单Silent A10实验体已见HP/能力签名whole-fight状态窄修；原107/481/Platt方法/200样本/全行seed/四闸不变，仅2调参/29验证62行新算、1114行按编译/谓词等价复用，完成artifact{complete["artifact"]}。逐Boss/A10/F49与缺失质量表保存、10对象经验候选及CLI账本{ledgers["ids"]} proposed，旧失败/R381历史保留，源sandbox0；实际live合入/组合测试/消费者另记，不改生产trust或宣称联合/自然/0332/宽父已验收。\n')
    manifest = {'files': [{'path': str(f.relative_to(WORK)), 'sha256': sha(f), 'bytes': f.stat().st_size} for f in PAPER.rglob('*') if f.is_file()]}
    (PAPER / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'report': str(HERE / 'report.md'), 'paper': str(PAPER), 'artifact': complete['artifact'], 'files': len(manifest['files'])}, ensure_ascii=False))


if __name__ == '__main__':
    main()
