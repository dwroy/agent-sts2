"""Render the report from retained numeric artifacts, without new model calls."""
import study as s


def num(x):
    return '未知' if x is None else f'{x:.3f}'


def table(headers, rows):
    return '\n'.join(['| '+' | '.join(headers)+' |','| '+' | '.join(['---']*len(headers))+' |']+
                     ['| '+' | '.join(map(str,row))+' |' for row in rows])


def main():
    a=s.read(s.HERE/'summary.json')
    cs=s.read(s.HERE/'candidate-results.json.gz')
    qs=s.read(s.HERE/'question-results.json.gz')
    c,q=a['candidate_counts'],a['questions']
    st=c['stable95']; stable=st.get('positive',0)+st.get('negative',0)
    lines=[f'''# 拿牌 v2：单牌增量可辨识性研究（issue #12）

本研究仅回答冻结掉血预测器在训练局重抽样下是否稳定，不给卡牌增加游戏知识、不改变拿牌规则。20 次按局重抽样后，438 个候选中的 **{stable} 个（{stable/438:.1%}）**达到预先规定的 95% 区间同号标准：正向 {st.get('positive',0)}、负向 {st.get('negative',0)}。146 道题中，{q['any_stable_candidate']} 题至少有一个稳定候选，**{q['robust_winners']} 题（{q['robust_winners']/146:.1%}）**原模型唯一首选在重抽样中仍对所有其他选项稳定领先。其余题保留并列或不确定。

这些比例是本预测器、本样本与本路线权重下的模型稳定性，不能称为真实拿牌收益的可辨识比例。10 局观察数据没有同现场取牌与跳过的反事实；后续结果不能据此证明某牌更优。本结果供 #1 已分出的 #15 补充事实与 #16 混合门设计引用；符号稳定与唯一首选稳定应使用不同标记，不能把任意一个稳定候选直接当成整题可委派。是否通过质量门仍需各自验收，本研究不执行策略或决策者切换。

## 数据与方法

- 基于 main `646d5ced1`；只读源码 `3ef4f16ac` 与材料 `11a80b1e2`。来源为相邻 `v6-card-value-v2-20261021` 工作树中已冻结文件，逐文件 SHA256 在 `provenance.json`。
- 角色仅 silent；训练场数按进阶为 {a['training_ascensions']}，研究题数按进阶为 {a['evaluation_ascensions']}。原训练集 3,535 场／260 局，固定 758 个特征。按局有放回抽 260 次，保留被抽中局的所有训练首试战斗，重复局带相应重数。20 个种子为 120001–120020；词表、150 棵树、深度 3、最小叶 20、学习率 .08、每棵树行抽样 .7 与内部种子 7 不变。只训练参与 saved_HP 的 hp_loss 子模型，不重估路线、敌人频率、剩余战斗数，也不训练 win/turns 子模型。
- 146 题来自训练截止之后的 10 局，均不进入这 260 个训练局。每题三张候选牌和跳过；438 个拿牌增量，跳过恒为 0。每个重抽样模型对同一题先预测不加牌，再预测按原动作引用实际加牌数量后的预测掉血；沿原目标逐项应用 HP 截断与 `weight × count`，两者相减后求和。正值表示模型预测省血。实际加牌数量沿用源码，不假定每次都只加一张；本样本加牌份数分布为 {dict(__import__('collections').Counter(x['copies'] for x in cs))}。
- 先封存 `method.md`。同号标准：至少 19/20 次同号，且线性插值的 2.5%–97.5% 分位区间严格排除 0（数值零容差 1e-8）。另给 5%–95% 区间及 20/20 同号敏感性结果。20 次样本只形成粗略经验区间，没有覆盖率保证、多重比较校正或因果含义。
- 对候选相对跳过的稳定性和候选之间的差分分别计算。唯一稳定首选必须原点估计唯一最优，且对三个对手的配对增量差都达到同一标准；单张牌稳定优于跳过并不自动成为首选。并列按集合统计，不利用原代码的跳过优先打破并列。
- 原 438 个候选与保存的 TypeScript 结果逐个重放，误差均小于 1e-7；按原顺序与原训练集重新拟合的模型与原 HP 模型完整结构相等。因此差异来自抽样，而非另写了训练器。

## 稳定性结果

原模型点估计正向 {c['original_positive']}、负向 {c['original_negative']}、零 {c['original_zero']}。原模型把跳过列入最优集合 {q['original_skip_best_including_ties']}/146 题，其中唯一跳过最优 {q['original_unique_skip_best']} 题、四选项全并列 {q['all_four_tied']} 题。这些点估计没有被当成稳定性证据。
''']
    lines.append(table(['口径','正向候选','负向候选','未分辨'],[
        [key,c[key].get('positive',0),c[key].get('negative',0),c[key].get('unresolved',0)] for key in ['stable95','stable90','unanimous']]))
    lines.append(f"\n至少一张稳定优于跳过 {q['any_stable_positive']}/146 题；三张牌全稳定劣于跳过 {q['all_stable_negative']}/146 题。唯一稳定首选为牌 {q['robust_card_best']} 题、为跳过 {q['robust_skip_best']} 题。大脑落在原点估计最优集合 {q['brain_in_original_best']}/146；在有唯一稳定首选的题中，与其相同 {q['brain_is_robust_best']}/{q['robust_winners']}。大脑选择是历史记录，不是标准答案。\n")
    lines.append('\n以下列全体四个稳定正向现场；这只是候选相对跳过的模型稳定性。唯一稳定首选另列配对区间，避免把二者混为一谈。\n')
    lines.append(table(['局／幕／层／选项','候选','95%区间','大脑'],[
        [f"{e['run']}/A{e['act']}/F{e['floor']}/{e['id']}",e['card'],
         str([round(e['stability']['quantiles_025_05_50_95_975'][i],3) for i in [0,4]]),e['brain']]
        for e in cs if e['stability']['stable95']=='positive']))
    for r in qs:
        if not r['robust_winners']:
            continue
        winner=r['robust_winners'][0]
        lines.append(f"\n唯一稳定排序现场：`{r['question_id']}`，首选 `{winner}`，大脑选 `{r['brain']}`；观察下一战净掉血 {num(r['next_loss'])}、本幕剩余净掉血 {num(r['remaining_loss'])}、过 Boss {r['boss_passed']}。这是 1 题／1 局，无法比较另一个选择。\n")
        lines.append(table(['首选 − 对手','正／负／零次数','配对95%区间'],[
            [winner+' − '+op,f"{d['positive']}/{d['negative']}/{d['zero']}",
             str([round(d['quantiles_025_05_50_95_975'][i],3) for i in [0,4]])]
            for op,d in r['pairwise'][winner].items()]))
    for field,title in [('by_act','按幕'),('by_floor_band','按全局楼层十层段'),('by_card_type','按候选牌型'),('by_deck_band','按原牌组张数')]:
        lines.append(f'### {title}\n')
        lines.append(table(['组','候选','题／局','稳定正','稳定负','未分辨'],[
            [k,v['candidates'],f"{v['questions']}／{v['runs']}",v['stable95'].get('positive',0),v['stable95'].get('negative',0),v['stable95'].get('unresolved',0)] for k,v in a[field].items()]))
    lines.append('''
候选牌型分组的题数可以重叠；同题的三张牌、同局的多题也不能相加当独立样本。分组只是本窗口描述，不形成牌型优劣或跨进阶结论。逐题、逐候选完整分位数和符号次数见 `candidate-results.json.gz`；所有候选差分、并列集合和各模型首选频率见 `question-results.json.gz`。

## 跳过偏好从何而来

为解释冻结原模型，将“加牌引起的特征变化”分为张数 `deck:count`、其他总量 `deck:*`、均值 `per_card:*`、牌 ID 计数 `card:*` 四组，枚举 16 种混合特征输入，做精确四组 Shapley 分解。分解包括模型非线性与截断，各组之和逐候选等于原增量。混合向量可能不对应合法牌组，因此这是模型解释，不是游戏机制或因果消融。
''')
    lines.append(table(['点估计候选集合','候选数','合计增量','张数贡献','总量贡献','均值贡献','ID贡献'],[
        [k,v['candidates'],num(v['sum_delta'])]+[num(v['sum_contribution'][g]) for g in ['size','totals','means','identity']] for k,v in a['shapley'].items()]))
    idn=a['identity']
    lines.append(f'''
这些 HP 数是候选层面的诊断加总，同一题被重复计入，不能解释为这些局实际累计省血。均值类特征是负增量的重要来源；把跳过偏好全归为“张数惩罚”不符合该分解。新增一张牌会同时改变全部均值，而直方图树只有跨过切分阈值才响应；因此小增量可能为零，或由少数均值切分主导。

原模型已经有 **{idn['identity_features']} 个牌 ID（含升级变体）计数特征**，HP 树用了 {idn['identity_splits']} 次 ID 切分。按候选出现次数计，438 个候选中 {idn['candidate_in_vocabulary']} 次对应的 ID 在词表内、{idn['candidate_identity_used']} 次对应的 ID 曾用于原 HP 树切分；这两个数不代表不同 ID 数。候选 ID 的训练支持独立局数五数概括为 {idn['train_runs_support_quantiles']}。所以“加牌 ID”不是缺失功能的直接修复；要改善的是稀疏支持、计数范围、交互与训练目标。分解只解释原模型，未声称 bootstrap 的每次切分都相同。

按组的跳过现象如下；“跳过最优”包含并列。牌型的跳过次数指含该牌型的题，不能跨牌型相加。
''')
    for field,title in [('act','幕'),('floor_band','层段'),('card_type','候选牌型')]:
        lines.append(table([title,'候选／题','原跳过最优','大脑跳过','该型候选被选','候选均值增量'],[
            [k,f"{v['candidates']}／{v['questions']}",v['skip_in_original_best'],v['brain_skip'],v['chosen_candidates'],num(v['mean_original_delta'])] for k,v in a['selection_mixing'][field].items()]))
    lines.append('''
训练数据本身也是先前拿牌、升级、删牌、路线、生存和出牌策略选择后的牌组观察：同一局的牌组随时间变化，深层只包含活到那里的状态。反事实加牌还保持 HP、遗物、药水和未来路线固定，不能覆盖随后改变资源与打法的总收益。重抽样局能反映现有训练集的变化，不能消除这种选择混杂。训练支持的幕×牌组规模明细见 `summary.json/training_observational_support`，包含场数、独立局数、平均层数、开场 HP 与掉血，不据其均值推导牌组大小效应。

## 与大脑和后续实际结果的关系
''')
    cov=a['outcome_coverage']
    lines.append(f'''后续结果只用冻结的 {cov['source_fights']} 场／{cov['source_runs']} 局首试开场记录，并用冻结状态帧检查是否漏过中间战斗。下一战按奖励后的首场首试连接，允许跨幕；若状态帧显示更早战斗而开场记录缺失，则不跳过去找后一场。严格可连接下一战 {cov['question_next_fight']}/146 题，但只有 **{cov['unique_next_fights']} 场不同的下一战**；全部题只覆盖 **{cov['unique_run_acts']} 个局×幕**。本幕终点且未见缺战的剩余掉血可用 {cov['remaining_complete_questions']} 题；截尾或缺战保留未知，不按 0 填。

“剩余掉血”是奖励后至本幕终点已提取首试战斗的 opening-to-final 净 HP 损失之和，含回血时不等于总受伤量；不是把每题当成独立整幕。同一局×幕不同奖励题的剩余区间互相嵌套。是否过 Boss 要求观测到进入下一幕或终局胜利；本幕先死亡为失败，终点未见则未知。奖励前已观测到本幕 Boss 战胜利的题保守排除，避免把先前已发生的结果误作后续收益。没有重放另一个选择。
''')
    lines.append(table(['大脑所选的稳定性','题／局','唯一下一战','局×幕','下一战掉血均值','剩余掉血均值','过Boss比例'],[
        [k,f"{v['questions']}／{v['runs']}",v['unique_next_fights'],v['unique_run_acts'],num(v['next_loss_mean'])+f" (n={v['next_loss_n']})",num(v['remaining_loss_mean'])+f" (n={v['remaining_loss_n']})",num(v['boss_passed_mean'])+f" (n={v['boss_passed_n']})"] for k,v in a['outcomes_by_chosen_stability'].items()]))
    lines.append('\n再按排序与大脑是否一致分组。stable_question 表示至少一张候选相对跳过稳定；该组内 point_best 仍只是原点排序。robust_best 才是原唯一首选对所有对手稳定。组间观测结果不构成同题替代选择的效果比较。\n')
    lines.append(table(['排序组','题／局','唯一下一战','局×幕','下一战均值(n)','剩余均值(n)','过Boss比例(n)'],[
        [k,f"{v['questions']}／{v['runs']}",v['unique_next_fights'],v['unique_run_acts']]+
        [num(v[y]['mean'])+f" (n={v[y]['n']})" for y in ['next_loss','remaining_loss','boss_passed']]
        for k,v in a['rank_agreement_outcomes'].items()]))
    lines.append('\n下表将大脑所选增量的 bootstrap 中位数与观察结果比较。相关按题加权，仅为描述；以局为簇重抽样 2,000 次，区间重新计算同一批相关题，不把题数当独立分母。另列每局均值的 Pearson，揭示对题数权重的敏感性。独立局少于 3 时不出簇区间。零增量的跳过包含在 all 组；chosen_stable_non_skip 组排除它。\n')
    lines.append(table(['子集／结果','题／局','Pearson','Spearman','每局均值Pearson','簇95%区间'],[
        [label+'/'+y,f"{v['questions']}／{v['runs']}",num(v['pearson_question_weighted']),num(v['spearman_question_weighted']),num(v['pearson_run_means']),str([round(x,3) for x in v['cluster_bootstrap_95']]) if v['cluster_bootstrap_95'] else '未知']
        for label,data in a['associations'].items() for y,v in data.items()]))
    lines.append('\n原点估计排序差距（最大增量 − 大脑所选增量）与后续结果的描述相关如下；该差距是模型量，不是真实后悔值。全部子集的 Pearson、Spearman、每局均值和簇区间均保存在 `summary.json/rank_regret_associations`。\n')
    lines.append(table(['子集／结果','题／局','Pearson','簇95%区间'],[
        [label+'/'+y,f"{v['questions']}／{v['runs']}",num(v['pearson_question_weighted']),str([round(x,3) for x in v['cluster_bootstrap_95']]) if v['cluster_bootstrap_95'] else '未知']
        for label,data in a['rank_regret_associations'].items() if label in ['any_stable','robust_winner'] for y,v in data.items()]))
    lines.append('''
这些关系同时混入难度、初始血量、层数、路线、后续多次拿牌与打法；即便相关方向符合预期，也不能说增量识别出了拿牌收益。所有 10 局是一个很小且已被旧研究反复查看的观察窗口，既不是新独立验证集，也不是 146 个独立实验。稳定题子集由模型筛选，不能拿其后验相关作为额外认证。尤其 chosen_stable_non_skip 的下一战只有 4 题／4 局；其很强的负相关及簇区间来自极小样本，方差为零的重抽样会被排除（有效次数见 JSON），不构成收益验证。

## 具体反例与边界现场

以下按固定规则挑选：原正向但未分辨中绝对点估计最大、原负向但未分辨中绝对点估计最大、稳定正／负中绝对点估计最大；重复候选去重。现场不是卡牌泛化结论。
''')
    examples=[]
    for pred in [lambda c:c['original_delta']>s.EPS and c['stability']['stable95']=='unresolved',
                 lambda c:c['original_delta']<-s.EPS and c['stability']['stable95']=='unresolved',
                 lambda c:c['stability']['stable95']=='positive',lambda c:c['stability']['stable95']=='negative']:
        eligible=[c for c in cs if pred(c)]
        if eligible:
            e=max(eligible,key=lambda c:abs(c['original_delta']))
            if e not in examples:
                examples.append(e)
    lines.append(table(['局／层／选项','候选','原增量','正／负／零次数','95%区间','结论','大脑'],[
        [f"{e['run']}/F{e['floor']}/{e['id']}",e['card'],num(e['original_delta']),f"{e['stability']['positive']}/{e['stability']['negative']}/{e['stability']['zero']}",str([round(e['stability']['quantiles_025_05_50_95_975'][i],3) for i in [0,4]]),e['stability']['stable95'],e['brain']] for e in examples]))
    lines.append('''
跨种子同号也可能只是相同均值特征代理的偏差；20 个模型共享原训练局和算法，不是 20 份新的游戏实验证据。原先“2×整场 RMSE”不适合当增量区间；此研究的配对分位数刻画另一种不确定性，也不能用来声称已经校准了真实增量误差。

## 后续可行改法（仅建议，未实现）

1. 先改善局内配对证据：记录奖励前的候选、合法动作与实际加牌数量、选择后的牌组变化、下一战完整开场和结果，以及层数、HP、遗物、药水、路线和策略版本。按局做训练/验证拆分与配对差分基线；若做受控比较须另立授权实验。自然局内前后差仍有敌人、HP 与路线混杂。
2. 保留已有 ID 计数，审计每个 ID 的独立局支持、有效计数范围、升级变体、跨牌交互与分裂使用；对少支持和未见组合保持不确定。若增加正则、共享表示或差分训练目标，应在独立局和后续窗口检验增量稳定性及真实配对误差，不能只看整场 MAE。
3. 单调约束只能约束有对局证据支持且含义明确的变量。不能默认“所有拿牌都更好”或“牌越多越差”；对有先验的净 HP/资源轴也要检查条件与反例。约束可能压制真实交互，需独立比较，不能把约束后的同号当证据。
4. 可增加 bootstrap 次数、跨时间验证、按版本分账，并检查留一局敏感性和多个比较的筛选偏差；扩大重抽样次数只减小数值抽样波动，不增加独立对局和反事实支持。路线/剩余战斗数、未来资源、SL 与生存选择的不确定性需要分开估计。

## 复现与交付检查

计算依赖为 Python 标准库及只读的原 builder，来源核验和扫描另需 git、gitleaks；未安装依赖、未发 Nova、未运行 play、未修改 live/STOP、知识与生产源码。所有计算 nice 19，最多两个计算进程；不运行完整 tsc/vitest，遵守 issue 边界。

在本工作树、保留同名只读源工作树时运行（训练拒绝覆盖已有 replicate；重新训练须使用新结果目录）：

```bash
nice -n 19 python3 -B paper/materials/2026-10-21-v6-card-increment-identifiability/study.py --start 1 --end 20
nice -n 19 python3 -B paper/materials/2026-10-21-v6-card-increment-identifiability/analyze.py structure
nice -n 19 python3 -B paper/materials/2026-10-21-v6-card-increment-identifiability/validate.py baseline
nice -n 19 python3 -B paper/materials/2026-10-21-v6-card-increment-identifiability/analyze.py summarize
nice -n 19 python3 -B paper/materials/2026-10-21-v6-card-increment-identifiability/validate.py final
nice -n 19 python3 -B paper/materials/2026-10-21-v6-card-increment-identifiability/render_report.py
nice -n 19 python3 -B paper/materials/2026-10-21-v6-card-increment-identifiability/audit.py
```

- `bootstrap/replicate-*.json.gz`：20 个导出 HP 模型、逐局抽样列表、重数、样本量、逐候选增量、特征摘要与耗时；非生产模型。
- `structure.json.gz`：原模型四组分解、牌 ID 支持和切分统计。
- `candidate-results.json.gz` / `question-results.json.gz` / `summary.json`：完整候选、配对排序、后续结果连接、分组与相关统计；仅保留本题必要字段，不复制原 prompt/个人信息。
- 汇总首次因分解结果字段名不一致中止，原日志留在 `checks/summary.log`；修正后重跑通过，见 `checks/summary-rerun-1.log`，未改动 20 次训练产物。
- `checks/baseline-training.json`、`checks/original-replay.json`、`checks/targeted-validation.json`：定向验证回执。另检查来源字节未改，扫描明文及解压产物，保留 gitleaks 与源完整性回执。

解压产物的默认扫描初次将冻结题号误报为 generic-api-key（7,076 条）；只对 146 个精确题号保留锚定白名单后为 0 条，默认规则继续启用。用未使用过的随机测试串验证检测仍有效；原始误报、过滤后结果和负对照回执均保留。

本交付供 #12 / #1 审阅，不合入 main/live、不新增发布编号、不替代学习者的 live 经验入库。
''')
    (s.HERE/'report.md').write_text('\n\n'.join(lines).rstrip()+'\n')
    print('report rendered',flush=True)


if __name__=='__main__':
    main()
