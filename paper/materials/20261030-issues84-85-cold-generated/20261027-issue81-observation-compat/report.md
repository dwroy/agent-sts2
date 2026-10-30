# #81 已发布观察格式兼容、路线与通用排序后继

兼容后继已完成：原141题在默认8000字节预算下140题收到观察摘要、1题为范围外的 `bundle/choose`，没有 missing/unavailable；27个不同条目实际进入摘要。36条均能在各自正式触发场景按绑定K1无损取回。这里证明离线消费者能送达，不声称36条已自然出现或被采用。

授权为 [#81/6433218107](https://github.com/dwroy/agent-sts2/issues/81#issuecomment-6433218107)。原R1 `27036eae53343aad9eed977549b901d00e7736c7` 已随R457采用，保留在 `issue-81-original-delivery-r1`；本后继在原工作树、原分支基于实际组合 `858425f165e273c8db18c23964780936c3c8928b` 制作，保留 #78/#72/#71 与 schema4，不重放原R1或旧13叶部署。固定交付HEAD由提交及issue回执给出，输入SHA见 `source-inputs.json`。

## 实现与边界

- 注入器除独立 `decision-context-v1` 外，读取同一绑定K1中实际已发布的 `strategy-entries.json` 观察格式。发布证明须有批准者、授权和SHA、observation-only及保留原候选标记；普通待办、pending、独立review-only候选不自动注入。保留角色、精确进阶集合、幕、楼层、Boss、牌组及几何门，兼容原中文角色名；战斗selection不注入构筑观察。
- 有界投影逐项保留原 `review_observation.conditions/denominators/counterexamples/limitations`，或明确标识其片段/省略。摘要写 `applicability=formal_trigger_only`、`condition_evaluation=not_evaluated`：原自然语言额外条件没有求值，观察提示没有升级为机器规则。原文保持不动，全文通过 `source=strategy_observation` 的同K1分片工具精确取回。
- `map/route`、`map/route-plan`、`map/route-review` 接为 `map_route`。历史发布格式只有原结构化triggers明确含“路线”才增加该兼容题型；不据topic、正文、ID猜路线，不把普通幕计划、营火或草稿扩大成路线经验。`selection/add` 接回选牌类型。
- 通用排序先分已批准观察、普通知识、显式pending；观察之间按当前计划主场景、题型范围窄度、当前牌组与原结构化core_card_ids交集，再沿原特异性、confidence、ID。没有issue前缀、日期或固定ID置顶，没有新增成型阈值、卡牌价值或confidence。动态筛选、分页及24KB工具上限保持。
- 默认注入仍关闭；关闭/缺省及Ironclad请求有等价负例。获准的策略题型/排序独立生效，关闭注入不代表所有策略查询与旧R457字节相同。本树没有改生产知识、开关、main/live、STOP/PAUSE、账号、共用配置或运维prompt，没有启动play、模型或新对局，也没有关闭其他会话。

ROOT/LIVE仅四个运行源叶：`decision-knowledge.ts`、`knowledge-projection.ts`、`query-guidance.ts`、`strategy-entries.ts`，精确路径见 `deployment-map.json`；另有一个合成测试文件、合同及本报告。实际前像、共享差量、唯一完整组合检查和部署归原集成员/ops。

## 原题与K1分账

使用原observer文件20,447,989字节，SHA `3497c7b3f30136322f4fdc5223f0f9531b5c70412af99631f95b6d380960b8ab`。只取四个原新K局 BQ04NAFKYD78/3YTH58GLDE56/9KTVCXYVVTNE/PMNMK7U2H1JF，按question_id末行去重，分母为48+29+32+32=141。保留原offset/bytes/SHA。三个原topic调用窗口另按原brain偏移及SHA独立读回。

原问题实际绑定旧K7bb；新K复核是对相同保存payload的反事实读回。原raw mod state不在这些窗口内，不能冒历史R455字节重放。绑定reader为query-only，重放不调用生产writer或发布。

| 绑定版本 / 预算 | 收到摘要 | 不同ID | 返回条目次数 | 最大JSON字节 |
| --- | ---: | ---: | ---: | ---: |
| 旧K7bb / 8000 | 140/141 | 27 | 400 | 7945 |
| 新K072 / 8000 | 140/141 | 27 | 400 | 7945 |
| 新K072 / 2048 | 140/141 | 9 | 140 | 1719 |
| 新K072 / 24000（诊断，未改默认） | 140/141 | 30 | 942 | 23649 |

上述各组missing/unavailable均0；140题均带裁剪标记，不能把摘要当完整原件。默认8000下：选牌66+selection/add 3、商店13、路线4、营火28、幕计划5、事件21，全部收到摘要。唯一范围外题为BQ04的 `mvpusasq-3531344-2` / `bundle/choose`。

默认未送达的9条完整列于summary：6条Boss打法在原题中没有fight-plan机会；另3条 `issue80-builds-c7`、`issue80-relics-ancient-toasty_mittens`、`issue80-relics-potion-offer-stage` 在默认排序/预算后省略，24000诊断可见。没有为凑36条扩大触发、加脑调用或加对局。36条按各自声明的正式trigger构造合成场景，全文工具共60片，拼接JSON与原索引条目逐字节相同；这36/36是接口合同检查，不是36条在自然141题全部匹配。

## topic联合核验

#80已经发布并核收新分类，而非等待重学或转成第二份知识文档：

- 旧：`K1-7bb1e922947acc2c67f738ec36aa49d9c8c445ef871581b49f9057e048a60e9d`。
- 新：`K1-0725587f50e671013f48f93e6c3e6b7f27d3d05638c40f33b460c9aeda7c7c46`。
- 两版strategy SHA同为 `780224842c5325657ea95bd98062d1fded979b5b6c3378ea501cebecc7fba0f8`。分类发布及独立核收见 [ops回执](https://github.com/dwroy/agent-sts2/issues/81#issuecomment-6433367385)、[集成员回执](https://github.com/dwroy/agent-sts2/issues/80#issuecomment-6433391076)；本开发未改元数据。

原三个 `kb_strategies(topic=climb_route,limit=3)` 查询：旧K新ID仍为0/0/0，正确保留unknown；新K前三中分别有1/3/3个新ID。BQ04营火题新camp观察第一；BQ04幕三复核为camp/elite-branch/paired-boss-resource；3YTH幕二复核为nutritious_soup/paels_eye/paels_flesh（这些有知识维护方显式climb_route分类，不因名字推断为错误）。最后一例验证幕复核优先于一般事件观察。完整ID、匹配数、分页、字节和原窗口SHA在各组summary中，最大18,454字节。

## 验证与接续

生产tsc通过；最终10文件129项定向通过，覆盖格式、角色/幕/精确进阶负例、三种路线label、旧幕计划/营火/草稿排除、主场景与用途通用排序、unknown/topic、分页、预算与Unicode、旧绑定及36条全文协议。最终广域650文件6017项、单独paths文件11项均通过，原件与终态记录见 `verification.json`；本地沙箱固定排除检查不冒实际部署组合full。

保留首轮2048空投影失败、缺issue29冷夹具导入失败及修复后读回：只从固定858425原blob恢复211076字节冷材料，未改夹具内容。发现幕复核主场景排序问题后，核唯一自有PID/argv/cwd，SIGINT中止第一次自有广域（exit130，原件保留），修正并冻结五个源/测试输入后重跑最终检查。其他会话与对局未受控制。日志SHA、最终源无漂移及检查终态见验证清单，不覆盖首败。

复跑（已有Node依赖，不安装包）：

```bash
PATH="$HOME/.local/node/bin:$PATH" nice -n 19 node --import ./agent/node_modules/tsx/dist/loader.mjs \
  paper/materials/20261027-issue81-observation-compat/replay.mjs \
  --source-root /home/dw/Projects/agent-sts2 \
  --version K1-0725587f50e671013f48f93e6c3e6b7f27d3d05638c40f33b460c9aeda7c7c46 \
  --budget 8000 --output .artifacts/issue81-r2/reproduced
```

固定源码请求只准备，不提交生产队列/tick/install。原集成员核四叶实际组合并集成后，ops按已有Roy授权在自然启动点直接开启；新topic K已核收，无须再问是否开启。随后原ops收开启后的自然5局，沿 #80/6432996038、6432996592 同两份报告口径核真实run-config、K1/SHA、请求摘要、裁剪、采用与限制。没有fight-plan的自然窗不能记Boss打法送达，离线140/141不代自然采用或效果，#80长期父要求保留。回退由ops自然边界关闭开关，原K1、证据与失败历史均保留。
