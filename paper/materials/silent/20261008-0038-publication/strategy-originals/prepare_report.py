import hashlib
import json
from pathlib import Path

p = Path(__file__).resolve().parent
queue = json.loads((p / 'dispatched-proposals.json').read_text())
ledger = json.loads((p / 'dispatched-ledger.json').read_text())
reasons = {
    '52f1e1bd2e7db0ed': '当前进阶HP/基础攻击的首样本读取路径已存在。完整加压/覆甲模型仍缺覆甲减层触发的独立逐步证据；本局9/9/8/7/6不能区分不同攻击、破挡与回合边界条件。保留实盘事实及房间代价五样本门槛，待新局补全过程，不登记整个提案已实现。',
    'f6d98c52fdc345b0': '本局能确认−1敏时翻滚当前/下轮各5挡；现有柔嫩代码覆盖卡牌后减力敏。跨轮模型仍缺发放/属性恢复的独立边界样本，以及已有延迟挡重新规划、其他挡修正组合的证据；未执行另一顺序的完整结果不能支持改排序。本批不把仅有5/5观察推广成所有延迟挡公式。',
    '6dd8bbff876be528': '已核现有HIGH_VOLTAGE逐实体growth接线；fresh spawn仍从strength/growth=0初始化。原在线召唤模板及其高电压建立时点没有冻结，T3/T4同一23血实体的2→4和17→19不足以证明新召唤者首次进入时应赋哪项状态。待新局召唤前后连续帧及实际模板输入，不按名称补机制或规定杀序。',
    '578e415a259e6835': '同指纹T2证实SL多付12血只多7本轮伤，另有保血延至T11仍败的反例。缺相同抽序下原线/替线完整胜局与独立后置验证；候选到首次派发、生成/抽弃牌后重规划的完整机器关联也尚未记录。完整多路径审计和成长/路线权重未实现；不以已有数值日志认领整个提案。',
    'c0767768bf6a7ab1': 'F48同指纹实损0/9、扣45/38和24/24全败可作配对事实，但第三至第五次复用同存档，不是独立验证；第四次T5替换未完整执行是反例，F33成功SL也保留。缺完整原线胜局、未执行续步与最终动作的统一关联，不能拟血价系数或禁止探索。',
    'a46bdb7fe711d79a': '已核阶段重置、零毒触媒没有额外毒伤、后获得敏捷不倒补23挡；当前源码已有相应机制，不冒认分阶段事实展示已完成。缺已建/持有/未派发能力跨抽弃重规划的统一记录、未建却赢或已建仍败的独立后置验证，不规定能力先手或新终局价值权重。',
    '1044224808015e5c': '双蟹同指纹T3实损9/14、扣24/27，T1实损2/10、扣25/34且手里剑成长另计；六次仍是同一存档，均无完整胜线。缺独立后续双蟹局、同抽序原线与换线的胜负及永久成长兑现对照，B2零差不证明安全，不启用新保血探索规则。',
    '7cbc6005db712ba9': '已核末次T2已有14挡、镣铐−9后恢复，T4朝向57→38、虚弱38→28。现有现场值接线存在；船夹板的普通T2观测不足以扩展升级/额外触发条件，候选事实展示仍缺临时/持续能力与最终派发的完整关联。未记录另一目标/能力顺序完整胜负，不修改权重或冒认整个事实展示已完成。',
}
results = []
sections = []
saved = []
for ident, item in queue.items():
    original = Path(item['proposal'])
    raw = original.read_bytes()
    target = p / ('saved-' + ident + '.md')
    target.write_bytes(raw)
    saved.append({'id': ident, 'original': str(original), 'saved': str(target),
                  'saved_sha256': hashlib.sha256(raw).hexdigest(),
                  'registered_sha256': item.get('proposal_sha256')})
    suffix = ident.removeprefix('silent-proposal-')
    if suffix == '1c51f79f5b69bf37':
        result = {'id': ident, 'state': 'duplicate', 'commit': '20b04517393708c73912326bb35d8448d1b3f77e',
                  'reason': '实际live祖先源码20b04517已接HAZE普通4毒/1弱及升级6毒/2弱，固定测试验证群体、结算、后续轮和其他角色边界；本批不重复实现、合入或造行为版本。'}
    elif suffix == '5a40291d1a3e80ca':
        result = {'id': ident, 'state': 'waiting',
                  'reason': '已实现离线可见HP扣减、净活敌血差、新增/复活HP及缺帧分账；撤源码7错误、恢复15例通过。提交前沙箱及实际live合入尚待完成，本初稿不登记implemented。'}
    else:
        result = {'id': ident, 'state': 'waiting', 'reason': reasons[suffix]}
    results.append(result)
    evidence = []
    for entry in item['ledger']:
        for ev in ledger[entry]['evidence']:
            if ev['run'] in item['runs']:
                value = f"{ev['run']} / F{ev.get('floor', '未指定')} / T{ev.get('turn', '未指定')} / {entry}：{ev.get('note', '')}"
                if value not in evidence:
                    evidence.append(value)
    sections.append(f"## {ident}\n\n来源：{item['source_task']}；实现任务：strategy-proposal / 20261008-000408；保存目录时间戳000409。\n\n"
                    f"提案：{item['summary']}\n\n账本：{'、'.join(item['ledger'])}。证据：\n\n" +
                    '\n'.join('- ' + e for e in evidence) + '\n\n' +
                    f"处置：{result['state']}。{result['reason']}\n\n原稿及反例完整保存在 [{target.name}]({target})；不重写历史复盘。\n")
(p / 'saved-proposal-manifest.json').write_text(json.dumps(saved, ensure_ascii=False, indent=2) + '\n')
(p / 'proposal-results-draft.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
intro = '''# 静默猎手A10策略提案逐项核验

本次只消费调度batch 20261008-000408-strategy-proposal的10个ID，无proposal_repair。任务指定scratch为20261008-000409。开工树干净，git merge --no-edit main成功，完整base=d4ec5b6d867bbc11e38cc336e54081569e20f223。7个来源局均由runs.jsonl核对为SILENT、A10；只读取本角色复盘、账本及专用提案，不学习其他角色知识。

## 本批选定实现：召唤/复活与可见扣血分账

来源postmortem / 20261007-181302，目标strategy-proposal / 20261008-000408，派发ID silent-proposal-5a40291d1a3e80ca，账本silent-0039。范围只为silent离线resource_chain；不改变在线候选、排序、出牌、药水、SL、终局价值或铁甲输出。Roy-2026-10-07-learning是授权，不是机制证据。

证据XP2SL33HT0D9 A10 F31 T1—8，43帧已逐一与只读logs/states.jsonl:277971—278013核对，原始核验见raw-log-verification.json。T1主怪129→104实扣25，新增21血幻象，净活敌血差4；T4幻象21→0再21，主怪76→55，实见扣血42、净差21。T3/T5复活中间帧缺失，只记可见扣血下限28/27、观测HP增量18/17，完整伤害未知。T8主怪剩1血后直接退场，没有1→0死亡帧，保守记录可见下限34、净差35及缺帧标记，不补该1伤。玩家48→25净损23、空药栏及初始敌人列表保持。

旧行为：资源窗口只有开场敌人类型及玩家HP/药槽；临时复盘曾误用净活敌血差作伤害，原稿/更正保留。新行为：新增敌人逐帧观察和每轮分账，保存全部敌人的类型、索引、HP、存活标记、证据行；唯一类型跨索引变化对齐，同类型多实体保留完整数组并标身份不明。新增体、可见复活、没有中间死亡帧的HP增加、直接移除、缺HP及缺敌人帧分别标记。所有damage_total留null；可见HP下降只为下限，不伪装完整伤害或来源归因。

反例：T3/T5不可用模型补毒致死/复活帧；T8退场不等于观察到最后1血扣减；重复enemy_id不可用字典覆盖。该局胜利不证明任何目标顺序最优，也没有另一杀序整战反事实。

拟合与切分：本次不拟合任何权重、阈值或胜率。1个独立局是发现/固定回归集，43帧和8回合不是43/8个独立样本；以后新静默局按结束时间后移验证。未观察的召唤、额外复活、HP修改原因保持未知。

固定验证：43帧冻结成learner/tests/silent-summon-hp-evidence.json。新增8例覆盖T1/T4分账、T3/T5/T8缺帧、索引重排、同ID多实体、未知HP/帧/最大血变化、SL与跨层边界及非silent原输出；原7例HP/药水/退出/SL测试保持。初次误写观察数40导致一断言失败，原日志保留；按实际退出帧278009更正为39，未放宽伤害与资源断言。撤全部生产增量时8例中7错误、1通过；恢复后8例及原7例通过，详见accounting-withdrawn.log、accounting-restored.log、resources-restored.log。提交前/合后原沙箱入口结果在最终报告补齐。

预期影响：使后续复盘可用同一工具区分净血变化与实际可见HP扣减，降低召唤/复活导致的错误归因。不宣称提高胜率。回退只撤本批learner/resource_chain.py新增审计接线及固定夹具；保留历史日志、原资源字段、原稿和缺帧事实。纯离线工具不生成eval行为版本，不登记shipped；实际live祖先源码证据交运维后登记。

## 派发项逐项处置

'''
(p / 'proposal.md').write_text(intro + '\n'.join(sections))
print('10项提案和原稿已保存；本文件是合入前初稿，最终处置另存report.md。')
