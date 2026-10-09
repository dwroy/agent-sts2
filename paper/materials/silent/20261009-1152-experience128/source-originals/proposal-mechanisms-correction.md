# 力量范围更正与逐帧验收补充

来源experience-update，目标strategy-proposal，角色silent、直接证据A10 XZUJR08FW801。更正原提案silent-proposal-cea59b906fb4dbd7中力量案例的范围；原提案和SHA保留，不覆盖。

原行“XZUJR08FW801无玩家力敏”过宽：F23 T2原日志出现1点STRENGTH_POWER；只有F25/F27/F29末段没有玩家力量/敏捷。新行为：核各战当前层数，不把其他战1力继承到末段；毒雾、镣铐、暗影、覆甲、石虫眩晕与当前敌成长的其他数据和原提案方案保持。修正不引入新机制公式、喝药或SL阈值，不把1点力量单独归到胜因。

账本silent-0012；支持/反例与完整机制evidence、参数分阶见changes.json/mechanism-evidence.json。典型XZUJR08FW801 F23 T2力量1；F25 T5甲虫2→−7临时减力、弱后15→8，次轮恢复增长到4；F29末10挡+3覆甲对20仍死。旧164局时间前缀验证，新局逐帧核，其他角色与未观察范围保持。

原提案同组条目仍逐项验当前live，已等价且live祖先源码可核则duplicate；缺完整dirty源码、逐源结算或受控整战则waiting，不造已实现。验证用固定数据、原沙箱入口，不运行play/模拟池；预期使已观察层数和候选预算一致，回退实际源码提交或范围开关。Roy-2026-10-07-learning是授权，不是事实。
