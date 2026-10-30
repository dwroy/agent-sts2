# #81 完整消费条目与ID导航后继

8000B预算下，已将默认注入改为“少数完整消费条目 + 其余ID/标题”，不再注入条件、分母或反例片段。133原题离线结果为：**75题2条完整、43题1条完整、15题0条完整；片段条目均0；最大7923B。** 所有929次匹配均有完整视图或ID导航，没有索引丢失。15题第一条原分母本身就超过预算，不能把本交付报告成“每题都有完整正文”。

主管需求见 [#81/6445099611](https://github.com/dwroy/agent-sts2/issues/81#issuecomment-6445099611)。至少匹配3条的107题，前三条连同余项ID导航需 **9239–34408B，p50=20961B**，全部超8000。本次没有调整预算或24000配置上限，交主管依据实测决定；没有压缩游戏结论、改分母或补写知识来凑3条。

## 固定基线与实现

基线为已实际发布的V6-R458 main `f11183c49b34595f220758ecad672d1f7514cacd`，LIVE登记 `903b508ca936f9fe475dc2f54f16aae1f77a856d`。原R2已采用，不重做其发布/开启或等待旧full；旧交付 `a6e6c205ac3d61a342c6b0bf802df0c1b7ff6ced` 保留在 `issue-81-observation-compat-r2`。本后继在同一原工作树、原开发分支制作，仅一个ROOT/LIVE运行叶：`agent/src/brain/decision-knowledge.ts`；另改两个相关测试、合同及本报告。运行/测试SHA及前像见 `source-inputs.json`，部署见 `deployment-map.json`。

- 沿已有通用排序取连续前缀，最多4条，由完整JSON信封的UTF-8预算决定实际N；不跳过过大的前项来提升后项，不按前缀、ID或日期改变排序。
- `entries` 为 `complete_decision_view`，逐字复制原summary、rule_candidate、conditions、denominators、counterexamples、limitations、conflicts_with，以及原triggers/status（存在时）。策略另保正式trigger、scope、原confidence/source；独立契约保原review_origin。完整条件和统计不做片段、不选统计行、不合并分母。原自然语言额外条件仍未求值，`formal_trigger_only/not_evaluated` 不变。
- 其余项为 `references:[{id,title,source}]`，不包含条件/统计碎片。标题取原name/summary/strategy第一句，最多120转义JSON字节，缩短有省略号，只作导航。按ID及source通过原 `kb_decision_context` 取回；完整条目也保留原件取回指针。
- “完整消费条目”指需求要求的全部消费字段，不等于整份原始JSON。原引用索引、归档和其他非消费字段留在K1原件；全文协议、24KB工具片段限制和原文SHA没有改变。其他知识工具原有投影不在本次范围。
- `complete_entries/returned` 仅数完整视图，`fragment_entries=0`，`reference_only_count` 单列导航数。`omitted` 指未展开正文数，包含导航项；`omitted_references` 指连ID也不能显示的数。顶层 `truncated` 只指索引确实省略，不能与旧“片段被截断”计数直接比较，也不能推断已有完整正文。极端大索引会先去标题、再从末尾省略并计数；133原题没有发生此退化。

触发、匹配、知识正文、置信度、排序代码和K072均未改。关闭/缺省、其他角色的请求仍保持原等价路径。开发树没有改生产on/8000配置、main/live、STOP/PAUSE、生产知识或账号，没有play、新对局、新模型、会话控制或发布号分配。

## 133原题与真实性边界

输入为开启注入后自然五局：ZUPWGKBLR7XT、THUD0XYLNPRS、QWM6TY3DRE67、9KE026PMB7K4、6UHW3C37JH1U。原ops报告见 [#81/6445032772](https://github.com/dwroy/agent-sts2/issues/81#issuecomment-6445032772)。使用原134行brain抽取，逐行按原offset/bytes/SHA另读原日志核同；仅accepted=true、按question_id去重得到14+34+46+6+33=133题。未接受尝试保留在原件，不计独立分母。

冻结输入 `.artifacts/ops-issue80-injected-five-20261027/brain.jsonl` 为17,322,064B，SHA `78fb41df02de3d86c6eb83e7ee8cbc135739bbda663255aeb3e46757a56d6005`。绑定固定 `K1-0725587f50e671013f48f93e6c3e6b7f27d3d05638c40f33b460c9aeda7c7c46`，strategy SHA `780224842c5325657ea95bd98062d1fded979b5b6c3378ea501cebecc7fba0f8`，reader为query-only。

“前”直接取实际日志中的decision_knowledge，不用旧算法重新生成。“后”用同一保存payload/候选和绑定K1反事实计算，原题其他内容不变；无原raw mod state，不冒新运行或完整历史状态重放。每题匹配总数与原题相同，新排序列表前缀逐ID核同原实际展示列表；底层排序/触发源文件没有修改。所有完整视图七类关键字段逐对象核同原件，共1351项比较；929次“题×匹配项”的原全文取回共1865片，拼接与原索引JSON逐字节相同。这些次数不是独立知识条目或科学样本。

| 项目 | 原实际注入 | 新离线注入 |
| --- | ---: | ---: |
| 独立题 | 133 | 133 |
| 完整消费条目次数 | 0 | 193 |
| 片段条目次数 | 382 | 0 |
| 仅ID导航次数 | 0 | 736 |
| 最大信封字节 | 7954 | 7923 |
| 完整条目不同ID | 0 | 16 |

新完整视图及导航合计覆盖30个不同ID；导航中的ID不能计为已读正文。展示正文的不同ID变少是这次“少量完整”的明确取舍，不能把27→30的可见ID变化当采用改善。每题完整数、片段数、ID导航、字节、全部ID、原位置SHA和前三条所需字节均在 [questions.json](results/questions.json)。

| 题型 | 题数 | 0条完整 | 1条完整 | 2条完整 | 最大字节 |
| --- | ---: | ---: | ---: | ---: | ---: |
| event/act-plan | 4 | 0 | 1 | 3 | 7923 |
| event/choose | 18 | 13 | 1 | 4 | 7923 |
| event/plan | 4 | 2 | 0 | 2 | 7441 |
| map/route-plan | 5 | 0 | 0 | 5 | 6684 |
| rest/plan | 26 | 0 | 17 | 9 | 7596 |
| reward/card | 63 | 0 | 20 | 43 | 7834 |
| selection/add | 2 | 0 | 2 | 0 | 4404 |
| shop/plan | 11 | 0 | 2 | 9 | 7792 |

## 三条为何放不下

这里计算的是“严格原排序前N条完整视图 + 余项ID/标题 + 同一全部信封元数据”的实际UTF-8字节，而非只算正文。少于N个匹配的题不计该N分布，未虚构三条匹配。

| 前N条 | 有至少N匹配的题 | min | p50 | p90 | max | 超8000题数 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 133 | 3990 | 4404 | 13379 | 13699 | 15 |
| 2 | 120 | 6684 | 7596 | 18568 | 19988 | 45 |
| 3 | 107 | 9239 | 20961 | 32988 | 34408 | 107 |
| 4 | 106 | 11488 | 35381 | 47125 | 48543 | 106 |

15个零完整题均是event/choose或event/plan，原排序第一条为 `issue80-relics-event-bridge`：其原denominators完整JSON单字段就9829B，超过整题8000B；没有通过删统计行或假装小分母将它变成完整。构筑条目的原必需字段也可超过13KB，但本次没有因为条目大而改其排序。预算调整属于主管指定的决策项，本次仅报实测，不扩大实现范围。

## 四道题前后原文

以下JSON保留字段原值；before直接取原日志，after是本实现实际输出。没有把说明性摘要代替原文。每对另有ref文件记录原qid/run/offset/bytes/SHA，足以从原日志核同。

| 原题 | 匹配数 | 前：片段数 | 后：完整 + ID导航 | 后字节 | 原文 |
| --- | ---: | ---: | --- | ---: | --- |
| QWM6 / mvqnwdmx-1197917-2 / reward/card | 6 | 3 | 2 + 4 | 6797 | [前](results/reward-card.before.json)、[后](results/reward-card.after.json)、[引用](results/reward-card.ref.json) |
| QWM6 / mvqnwdmx-1197917-3 / map/route-plan | 2 | 2 | 2 + 0 | 6684 | [前](results/map-route-plan.before.json)、[后](results/map-route-plan.after.json)、[引用](results/map-route-plan.ref.json) |
| QWM6 / mvqnwdmx-1197917-19 / event/act-plan | 16 | 3 | 2 + 14 | 7923 | [前](results/event-act-plan.before.json)、[后](results/event-act-plan.after.json)、[引用](results/event-act-plan.ref.json) |
| ZUPW / mvqkt22y-1011629-6 / event/choose | 6 | 4 | 0 + 6 | 1988 | [前](results/event-choose.before.json)、[后](results/event-choose.after.json)、[引用](results/event-choose.ref.json) |

最后一题特意保留无法放入第一条的反例，不能只展示成功的118题。

## 检查、复跑与交接

定向4文件67项及生产tsc通过；沙箱广域原exit1保留：650文件中649过/1个external-stock超时、6019项过/1败；全局15s时限下该文件耗时15.258s，其28个Python检查已OK。相同未改源码及15s时限单独复核，该文件1项和内部28项通过（Python12.435s），没有放宽超时或改测试；单独paths11项通过。实际组合full仍交原集成员，不冒本地广域全绿。日志SHA及源无漂移检查见 `verification.json`。固定数据测试覆盖完整字段逐值保留、预算减N、第一条过大不提升后项、四条上限、其余ID的原文取回、Unicode极大索引明确省略，以及旧触发/排序/关闭/角色等价。原issue29稀疏冷夹具在广域前从固定f11183原blob恢复211076B，不改内容、不将稀疏缺失冒代码失败。保持nice19、最多两个worker，不安装依赖。本地沙箱结果不代实际ROOT/LIVE组合full。

```bash
PATH="$HOME/.local/node/bin:$PATH" nice -n 19 node --import ./agent/node_modules/tsx/dist/loader.mjs \
  paper/materials/20261027-issue81-complete-injection/replay.mjs \
  --source-root /home/dw/Projects/agent-sts2 --output .artifacts/issue81-r3/reproduced
```

固定源码请求只准备，不提交生产队列或tick/install。原集成员沿单叶实际前像/组合检查接收，ops负责自然边界发布；生产已on/8000的事实保留，本开发不重复开关、新五局或旧发布事务。主管据前三条分布决定预算，本包没有提前放宽。#80后续自然正文送达、取回、采用和收益仍归原owner；离线0片段不等于自然模型已读懂或采用，不关闭科学父要求。回退本源叶即可恢复R458注入打包，原知识、K1、配置和历史均保留。
