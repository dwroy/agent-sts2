# Silent V6 R3 知识增量发布复核

请求 `roy-20261019-v6`，批次 `v6-knowledge-publish-r3-20261020-033408`。本报告记录已验收草稿的迁移，不新增研究/拟合。main/live/消费者回执分别见 result.json；当前正式变更仅三个知识叶，experience.json 原字节保持。

## 冻结与采用范围

唯一采用草稿：`/home/dw/Projects/agent-sts2/.worktrees/v6-reflex-distill-r3-20261019/knowledge/characters/silent/pending/v6-reflex-distill-r3-v6-reflex-distill-r3-20261019-2347/draft.json`，SHA256 `a3d2b645fcb212946137171b5bc986440f0c39f20c83e50e449c6e9d77789b57`。原研究批次是 v6-reflex-distill-r3-20261019-2347，已结束；本批冻结授权仅允许增量发布85条已验收子集，非原研究complete=true。未选取其他最新草稿。

20份冻结文件及4份正式before副本共24项字节数/SHA逐一核同；详 input-verification.json（若计数以该文件实际数组为准）。冻结清单SHA `5356180ff13e8b8a677925b595cdf6b50b4e7512f21a04d24d905db588b0fe04`。原源码提交bd378f7d8647fe747c6b0e1a5cfee858404d57f6；实际发布前再次核main四文件。

|采用材料|SHA256|
|---|---|
|`/home/dw/Projects/agent-sts2/.artifacts/v6-knowledge-publish-r3-20261020/authorization-original.md`|`953df80f45db3364e359656dc9d65470928d4492d56e41c8e866c15be9024a05`|
|`/home/dw/Projects/agent-sts2/.artifacts/v6-reflex-r3-watcher-audit-20261020/prepared-ops-handoff.json`|`4d169566c8e3fdd02ac83a8b14f3e8991757056ccc10725f9b344b6e47ac4616`|
|`/home/dw/Projects/agent-sts2/learner/tasks/v6-knowledge-publish.md`|`f7d40172f64a5fadb0b1c3f2deb6a2833065f75e15655b3222d7615ac19e99fc`|
|`/home/dw/Projects/agent-sts2/.worktrees/v6-reflex-distill-r3-20261019/knowledge/characters/silent/pending/v6-reflex-distill-r3-v6-reflex-distill-r3-20261019-2347/draft.json`|`a3d2b645fcb212946137171b5bc986440f0c39f20c83e50e449c6e9d77789b57`|
|`/home/dw/Projects/agent-sts2/learner/runs/20261019-234904-8c1323e0-429f-47a5-8d90-e301282d7c86-v6-reflex-distill-r3/result.json`|`d691db9855d95daa4216fa24aaab2f81f9086b1454e7fb132846fb9e8679bebe`|
|`/home/dw/Projects/agent-sts2/.artifacts/v6-reflex-r3-watcher-audit-20261020/readback.json`|`77a4d66c350805505bc3e27d23714d78396d40e8ca8520572733bf633a731145`|
|`/home/dw/Projects/agent-sts2/.artifacts/v6-reflex-r3-watcher-audit-20261020/validation.json`|`c4db2363b496e0a123341539a8b5b8edd348c8d1d19fd6eb4eb3e5e4ca6a864e`|
|`/home/dw/Projects/agent-sts2/learner/runs/20261019-234904-8c1323e0-429f-47a5-8d90-e301282d7c86-v6-reflex-distill-r3/disagreements.json`|`a2b513d49efbd415558eeeb6068e1ee50afbdebe389c3fc58ad46565893f79a8`|
|`/home/dw/Projects/agent-sts2/learner/runs/20261019-234904-8c1323e0-429f-47a5-8d90-e301282d7c86-v6-reflex-distill-r3/learning-notice-proposal.json`|`4c7923d60c254336cea1590d2c3ecd6398bc69e8478ae3d061e25289955b848d`|
|`/home/dw/Projects/agent-sts2/learner/runs/20261019-234904-8c1323e0-429f-47a5-8d90-e301282d7c86-v6-reflex-distill-r3/report.md`|`298dfd8f8a8cf6f928521c3d45ef92ac56bb3dc8294c1650bfc849063bbaef53`|
|`/home/dw/Projects/agent-sts2/learner/runs/20261019-234904-8c1323e0-429f-47a5-8d90-e301282d7c86-v6-reflex-distill-r3/validation-context.json`|`35719c520364a9756fa0081c1b7f52d0e7166dceb359ceba0d7d4f47a09b9b9a`|
|`/home/dw/Projects/agent-sts2/learner/runs/20261019-234904-8c1323e0-429f-47a5-8d90-e301282d7c86-v6-reflex-distill-r3/artifact-manifest.json`|`4000a6a77349b2daac05c6b5a7dd3c6ec68aaf2b02395981fa805862f2d367c3`|
|`/home/dw/Projects/agent-sts2/learner/runs/20261019-234904-8c1323e0-429f-47a5-8d90-e301282d7c86-v6-reflex-distill-r3/audit-index.json`|`0d34e36b84cbac6105c978985ca01b187e3be4e9ca00545415095f4c22b2a1de`|
|`/home/dw/Projects/agent-sts2/learner/runs/20261019-234904-8c1323e0-429f-47a5-8d90-e301282d7c86-v6-reflex-distill-r3/statistics.json`|`4e7dcb72df4beb359c0eaa0110f059d64abe5f4603b4cd12510b46afb1c60256`|
|`/home/dw/Projects/agent-sts2/learner/runs/20261019-234904-8c1323e0-429f-47a5-8d90-e301282d7c86-v6-reflex-distill-r3/signal-audit.json`|`128b38e96a572056985bb8d4340e81dd3bcc3ead5986a614e4ca8e271900b04b`|
|`/home/dw/Projects/agent-sts2/learner/runs/20261019-234904-8c1323e0-429f-47a5-8d90-e301282d7c86-v6-reflex-distill-r3/source-provenance.json`|`e829381963c9c541163f54e2a92b34ce1f6c2ad245d6a88f07bd93fe06ceb865`|
|`/home/dw/Projects/agent-sts2/learner/runs/20261019-234904-8c1323e0-429f-47a5-8d90-e301282d7c86-v6-reflex-distill-r3/ranking.json`|`306fcd46b7365f4af762373d93e305e4d6ca2908300bf840ed67716ce06c727e`|
|`/home/dw/Projects/agent-sts2/learner/runs/20261019-234904-8c1323e0-429f-47a5-8d90-e301282d7c86-v6-reflex-distill-r3/core-combo-associations.json`|`aba86472183740dc55cdedfbb584eb7e6957cf5854cdd6a0017fe86ee552c676`|
|`/home/dw/Projects/agent-sts2/learner/runs/20261019-234904-8c1323e0-429f-47a5-8d90-e301282d7c86-v6-reflex-distill-r3/per-signal-raw-checks.jsonl.gz`|`7a04c9dfcd5bfe95968b04db9f0b16087b6cd52a9a32118f720356e12259775c`|
|`/home/dw/Projects/agent-sts2/.artifacts/v6-reflex-r3-watcher-audit-20261020/native-new-disagreement-notification.json`|`4a1b72639d954c0227ca3ec90e4a5f9e07410fa5c8cee98eacbb07372e313d59`|
|`/home/dw/Projects/agent-sts2/.artifacts/v6-knowledge-publish-r3-20261020/formal-before/build-cores.json`|`377920574ce7859f5e39dd01aad495947140226777e742251ac850004ae0cbe6`|
|`/home/dw/Projects/agent-sts2/.artifacts/v6-knowledge-publish-r3-20261020/formal-before/reflex.json`|`aab34d6e5fb0a2375cf95a44aed94a77907e175de3f817686389ef687b5aaee9`|
|`/home/dw/Projects/agent-sts2/.artifacts/v6-knowledge-publish-r3-20261020/formal-before/reflex-vocab.json`|`a4e2d063a2896ea4d1ac7168f031072b6f5ae0e7f7218e54feeb5c9fbf626a2c`|
|`/home/dw/Projects/agent-sts2/.artifacts/v6-knowledge-publish-r3-20261020/formal-before/experience.json`|`f3479ea243643adcc71bfce934dccd555c34d9309fb4b1424da98a1f30db329d`|

## 转换、冲突与排除

正式包装复用草稿内已严格校验的reflex-file-v1与reflex-vocab-v1；未把draft外壳写入正式文件。保持ID、证据、原置信度或草稿已降低值、未知和关联。旧19条中17条显式升级到同ID版本3的HP观察、2条只升级版本保留tag；66条追加。旧版本全文保存在publication-items.json和before/reflex.json及原Git提交。既有词表7枚举原对象不变，追加14个已有证据枚举。

build-cores-v1原4方向17组合及全部统计、first/including_sl、A10两种折算、未知原因、来源计数、收缩前后值逐结构核同；只按R3草稿cores关系追加93个linked_reflex反向引用。本批没有新核心草稿，validate-v6-build-cores.ts草稿入口记不适用；实际正式validateBuildCoreFile由loadV6Knowledge验证，不构造缺失草稿。

experience.json原244条顺序、ID、正文、状态、证据、置信度和全部字段字节不变；草稿关联均已存在，不重复追加。check-experience退出0。244条覆盖完整：80 partial、163 text_only、1 disputed；表见experience-coverage.json，未缩小validation-context分母。

|ID|处置|严格signal|变更字段|
|---|---|---|
|silent-r2-card-shockwave|numeric_upgrade|`{"kind": "hp", "value": 4.666666666666667, "unit": "hp", "se": 6.222222222222221}`|evidence,label_en,scope,signal,version|
|silent-r2-card-well-laid-plans|numeric_upgrade|`{"kind": "hp", "value": 4.333333333333333, "unit": "hp", "se": 2.333333333333334}`|evidence,label_en,scope,signal,version|
|silent-r2-card-piercing-wail|numeric_upgrade|`{"kind": "hp", "value": 3.301255230125523, "unit": "hp", "se": 0.29983321128838264}`|confidence,evidence,label_en,scope,signal,version|
|silent-r2-card-malaise|numeric_upgrade|`{"kind": "hp", "value": 3.7027027027027026, "unit": "hp", "se": 0.7090747106692935}`|confidence,evidence,label_en,scope,signal,version|
|silent-r2-card-shadowmeld|numeric_upgrade|`{"kind": "hp", "value": 0.5882352941176471, "unit": "hp", "se": 0.4577349679536665}`|confidence,evidence,label_en,scope,signal,version|
|silent-r2-card-rolling-boulder|numeric_upgrade|`{"kind": "hp", "value": 8.6, "unit": "hp", "se": 2.1162797546638297}`|confidence,evidence,label_en,scope,signal,version|
|silent-r2-card-flechettes|numeric_upgrade|`{"kind": "hp", "value": 6.75, "unit": "hp", "se": 3.375}`|evidence,label_en,scope,signal,version|
|silent-r2-card-precise-cut|numeric_upgrade|`{"kind": "hp", "value": 4.138728323699422, "unit": "hp", "se": 0.4595856381139538}`|confidence,evidence,label_en,scope,signal,version|
|silent-r2-card-metamorphosis|numeric_upgrade|`{"kind": "hp", "value": 0.0, "unit": "hp"}`|evidence,label_en,scope,signal,version|
|silent-r2-card-caltrops|version_only_tag_retained|`{"kind": "tag", "value": "silent-r2-delayed-setup", "unit": "label"}`|version|
|silent-r2-card-haze|numeric_upgrade|`{"kind": "hp", "value": 4.43448275862069, "unit": "hp", "se": 0.5255296941688595}`|confidence,evidence,label_en,scope,signal,version|
|silent-r2-card-dark-shackles|numeric_upgrade|`{"kind": "hp", "value": 1.2, "unit": "hp", "se": 0.42142615011410955}`|confidence,evidence,label_en,scope,signal,version|
|silent-r2-card-bullet-time|numeric_upgrade|`{"kind": "hp", "value": 2.75, "unit": "hp", "se": 1.5026019100214134}`|confidence,evidence,label_en,signal,version|
|silent-r2-card-toric-toughness|numeric_upgrade|`{"kind": "hp", "value": 2.0, "unit": "hp", "se": 2.0}`|confidence,evidence,label_en,scope,signal,version|
|silent-r2-card-fight-me|version_only_tag_retained|`{"kind": "tag", "value": "silent-r2-debuff-window", "unit": "label"}`|version|
|silent-r2-card-panache|numeric_upgrade|`{"kind": "hp", "value": 11.0, "unit": "hp"}`|confidence,evidence,label_en,scope,signal,version|
|silent-r2-card-blur|numeric_upgrade|`{"kind": "hp", "value": 3.111111111111111, "unit": "hp", "se": 0.8444239883932463}`|evidence,label_en,scope,signal,version|
|silent-r2-card-eternal-armor|numeric_upgrade|`{"kind": "hp", "value": 4.0, "unit": "hp"}`|confidence,evidence,label_en,signal,version|
|silent-r2-card-stone-armor|numeric_upgrade|`{"kind": "hp", "value": 3.3333333333333335, "unit": "hp"}`|evidence,label_en,signal,version|
|silent-reflex-v6-multihit|append|`{"kind": "hp", "value": 4.466827503015682, "unit": "hp", "se": 0.1938716210750712}`||
|silent-reflex-v6-strength|append|`{"kind": "hp", "value": 4.511684125705076, "unit": "hp", "se": 0.16499747300696085}`||
|silent-reflex-v6-artifact|append|`{"kind": "hp", "value": 4.388059701492537, "unit": "hp", "se": 0.8604035282076307}`||
|silent-reflex-v6-sandpit|append|`{"kind": "hp", "value": 5.785714285714286, "unit": "hp", "se": 0.7493358762142691}`||
|silent-reflex-v6-poison-pending|append|`{"kind": "hp", "value": 4.014836795252226, "unit": "hp", "se": 0.1696245385295691}`||
|silent-reflex-v6-dexterity-established|append|`{"kind": "hp", "value": 3.9292576419213976, "unit": "hp", "se": 0.1727535455060024}`||
|silent-reflex-v6-frail|append|`{"kind": "hp", "value": 4.631756756756757, "unit": "hp", "se": 0.35698963192687166}`||
|silent-reflex-v6-draw-lock|append|`{"kind": "hp", "value": 24.0, "unit": "hp"}`||
|silent-reflex-v6-block-lock|append|`{"kind": "hp", "value": 10.0, "unit": "hp"}`||
|silent-reflex-v6-card-quota|append|`{"kind": "hp", "value": 5.575, "unit": "hp", "se": 0.723828075811745}`||
|silent-reflex-v6-one-card-window|append|`{"kind": "hp", "value": 8.666666666666666, "unit": "hp", "se": 1.7998842555379313}`||
|silent-reflex-v6-smoggy-legality|append|`{"kind": "hp", "value": 1.6122448979591837, "unit": "hp", "se": 0.2841570540347637}`||
|silent-r2-card-knife-trap|append|`{"kind": "hp", "value": 20.0, "unit": "hp"}`||
|silent-r2-card-footwork|append|`{"kind": "hp", "value": 3.548936170212766, "unit": "hp", "se": 0.38827357903976534}`||
|silent-r2-card-bouncing-flask|append|`{"kind": "hp", "value": 3.8633093525179856, "unit": "hp", "se": 0.5505279373940728}`||
|silent-r2-card-finisher|append|`{"kind": "hp", "value": 0.0, "unit": "hp"}`||
|silent-r2-card-deadly-poison|append|`{"kind": "hp", "value": 3.514018691588785, "unit": "hp", "se": 0.3216725615106564}`||
|silent-r2-card-noxious-fumes|append|`{"kind": "hp", "value": 3.5502958579881656, "unit": "hp", "se": 0.4228209824894387}`||
|silent-r2-card-bubble-bubble|append|`{"kind": "hp", "value": 4.122222222222222, "unit": "hp", "se": 0.7365883518225389}`||
|silent-r2-card-accelerant|append|`{"kind": "hp", "value": 4.116564417177914, "unit": "hp", "se": 0.5394003401476298}`||
|silent-r2-card-outbreak|append|`{"kind": "hp", "value": 8.307692307692308, "unit": "hp", "se": 2.6567981444548696}`||
|silent-r2-card-poisoned-stab|append|`{"kind": "hp", "value": 3.756043956043956, "unit": "hp", "se": 0.2647697037595591}`||
|silent-r2-card-afterimage|append|`{"kind": "hp", "value": 4.285714285714286, "unit": "hp", "se": 0.9777215706250002}`||
|silent-r2-card-regret|append|`{"kind": "hp", "value": 1.0, "unit": "hp"}`||
|silent-r2-card-shadow-step|append|`{"kind": "hp", "value": 2.5, "unit": "hp"}`||
|silent-r2-card-prowess|append|`{"kind": "hp", "value": 7.0, "unit": "hp"}`||
|silent-r2-card-abrasive|append|`{"kind": "hp", "value": 11.666666666666666, "unit": "hp", "se": 6.119186583561939}`||
|silent-r2-card-speedster|append|`{"kind": "hp", "value": 1.7142857142857142, "unit": "hp", "se": 2.147678411691198}`||
|silent-r2-card-accuracy|append|`{"kind": "hp", "value": 2.3333333333333335, "unit": "hp", "se": 1.5555555555555554}`||
|silent-r2-card-maul|append|`{"kind": "hp", "value": 5.4375, "unit": "hp", "se": 2.7421875}`||
|silent-r2-card-wither|append|`{"kind": "hp", "value": 6.03125, "unit": "hp", "se": 2.026767703264991}`||
|silent-r2-card-expose|append|`{"kind": "hp", "value": 5.0, "unit": "hp", "se": 0.7595932731523524}`||
|silent-r2-card-corrosive-wave|append|`{"kind": "tag", "value": "silent-r2-poison-application", "unit": "label"}`||
|silent-r2-card-anticipate|append|`{"kind": "hp", "value": 5.215686274509804, "unit": "hp", "se": 0.9668450805608287}`||
|silent-r2-card-envenom|append|`{"kind": "hp", "value": 2.4285714285714284, "unit": "hp", "se": 1.6904317052962303}`||
|silent-r2-card-mirage|append|`{"kind": "hp", "value": 1.8333333333333333, "unit": "hp", "se": 1.1866764757932373}`||
|silent-r2-card-phantom-blades|append|`{"kind": "hp", "value": 7.0, "unit": "hp", "se": 2.8103307961294286}`||
|silent-r2-card-doubt|append|`{"kind": "hp", "value": 0.0, "unit": "hp", "se": 0.0}`||
|silent-r2-card-mad-science|append|`{"kind": "hp", "value": 9.0, "unit": "hp"}`||
|silent-r2-card-grand-finale|append|`{"kind": "hp", "value": 12.0, "unit": "hp"}`||
|silent-r2-card-burst|append|`{"kind": "hp", "value": 6.3, "unit": "hp", "se": 1.7613205273316948}`||
|silent-r2-card-serpent-form|append|`{"kind": "hp", "value": 5.0, "unit": "hp", "se": 3.39934634239519}`||
|silent-r2-card-fasten|append|`{"kind": "hp", "value": 4.5, "unit": "hp", "se": 1.948557158514987}`||
|silent-r2-card-fan-of-knives|append|`{"kind": "tag", "value": "silent-r2-observed-continuation", "unit": "label"}`||
|silent-r2-card-hidden-daggers|append|`{"kind": "hp", "value": 3.9285714285714284, "unit": "hp", "se": 1.4249423822918115}`||
|silent-r2-card-memento-mori|append|`{"kind": "hp", "value": 3.0, "unit": "hp", "se": 0.6099248516512592}`||
|silent-r2-card-juggernaut|append|`{"kind": "hp", "value": 0.0, "unit": "hp"}`||
|silent-r2-card-beckon|append|`{"kind": "hp", "value": 5.774193548387097, "unit": "hp", "se": 0.9677042452793563}`||
|silent-r2-card-apparition|append|`{"kind": "hp", "value": 0.0, "unit": "hp"}`||
|silent-r2-card-panic-button|append|`{"kind": "hp", "value": 6.0, "unit": "hp"}`||
|silent-r2-card-toxic|append|`{"kind": "hp", "value": 5.5, "unit": "hp", "se": 1.1998357590506952}`||
|silent-r2-card-snakebite|append|`{"kind": "hp", "value": 4.198300283286119, "unit": "hp", "se": 0.30849248245293}`||
|silent-r2-card-apotheosis|append|`{"kind": "hp", "value": 10.0, "unit": "hp"}`||
|silent-r2-card-strangle|append|`{"kind": "hp", "value": 7.75, "unit": "hp", "se": 2.480523088315581}`||
|silent-r2-card-hand-trick|append|`{"kind": "hp", "value": 3.263157894736842, "unit": "hp", "se": 1.389102081108102}`||
|silent-r2-card-infection|append|`{"kind": "hp", "value": 5.413043478260869, "unit": "hp", "se": 1.0009804335370103}`||
|silent-r2-card-battle-trance|append|`{"kind": "tag", "value": "silent-r2-draw-lock", "unit": "label"}`||
|silent-r2-card-alchemize|append|`{"kind": "hp", "value": 0.0, "unit": "hp", "se": 0.0}`||
|silent-r2-card-offering|append|`{"kind": "tag", "value": "silent-r2-explicit-legality", "unit": "label"}`||
|silent-r2-card-calculated-gamble|append|`{"kind": "hp", "value": 8.0, "unit": "hp"}`||
|silent-r2-card-unmovable|append|`{"kind": "tag", "value": "silent-r2-delayed-setup", "unit": "label"}`||
|silent-r2-card-dodge-and-roll|append|`{"kind": "hp", "value": 3.6363636363636362, "unit": "hp", "se": 1.1230867259085886}`||
|silent-r2-card-infinite-blades|append|`{"kind": "hp", "value": 3.6315789473684212, "unit": "hp", "se": 1.9798780200407624}`||
|silent-r2-card-leg-sweep|append|`{"kind": "hp", "value": 1.4170616113744077, "unit": "hp", "se": 0.2343921559831271}`||
|silent-r2-card-ricochet|append|`{"kind": "hp", "value": 3.769230769230769, "unit": "hp", "se": 1.363502990253206}`||
|silent-r2-card-volley|append|`{"kind": "hp", "value": 2.5, "unit": "hp"}`||

七条不能绑定HP的项保留tag，逐条原理由见publication-items.json.exclusions及signal-audit；不把迁移、格式通过或授权当实战证据。旧夜魇/翻越撑击拒选项和全部旧失败/反例保持原路径；不在本批重新提选。

## 科学复核与限制

原冻结372个已结束Silent局；R3全37902回合/first26526回合原分母、340统计/排序行保留。逐条78个numeric审计与metrics的值、n、SE相同，复核1085处原日志byte start/end/SHA，含每条高低值反例与原抽核样本，未重拟合全历史。原样本字节检查见scratch/raw-checks.json；完整原statistics SHA在audit-index.json。

design=observational；HP正值为计划原帧至下一轮ready帧实际净损失，负值为净回血，包含实测自损/回复。仅完整实际剩余计划序列匹配的窗口，不是某张牌或方案相对另一线的收益。未控制选择、后续共同动作/药水、版本和删失混杂。主统计合并版本，first与including_sl分列；76 numeric采用first，2采用including_sl。19单局无SE，不补0；全部340 priority=null，7tag没有完整计划HP数值。不能由数量推断因果或收益。

## 验证与真实消费者边界

原reflex CLI使用完整冻结context，draft/context SHA和完整stdout、exit0见validation-commands.json。实际正式loadV6Knowledge、predicate、combatEntryAudit和directionTask通过固定离线调用。78条用原日志状态与预存计划读回实际signal/label/confidence/来源；7tag另用明确标识的合成固定题验证词表及条件真/假传递，不计实盘证据。不成立/字段缺失不误挂；四个其他角色不读Silent私库；缺文件不回退，缺vocab拒绝含tag文件。

n/design/method/G/窗口/删失经正式文件SHA+reflex_id关联metrics.json和signal-audit.json；消费者不读取该完整sidecar，不能冒n_support是n或独立局G，不能称已送达Jev。

拿牌固定题读到17组合；商店实际题面1组合、休息2组合，其余因现有体积上限裁剪，逐项omitted_combo_ids保存；没有借此修改消费者。全部17组合可由方向摘要加载，加载不等于全部上屏。投影保持unknown，未模拟、未请求在线模型、未执行游戏动作。

原沙箱入口已跑：tsc通过，第一次Vitest配置缓存写只读共享node_modules报EROFS退出1，保留原日志；加现有--configLoader runner --no-cache参数补跑，最终结果见test-sandbox-runner.json。不改脚本/排除名单/阈值；宿主完整tsc+vitest待ops按原流程补核，沙箱异常不冒代码失败或通过。

## 账本、提案与交付

canonical原CLI登记silent-0532，status=proposed；正文/规则未变，仅候选记忆数据发布及检索反向关联。提案保存在proposal.md，真实source_task=v6-knowledge-publish登记失败exit2 invalid task link，registered code_proposals=[]。不伪装允许的任务名、不手写队列、不改校验器，原owner保留登记缺口。

三项新异议沿原R3原文保留；冻结native-new-disagreement-notification证明原watcher已读并用户可见告Roy，本任务不代ACK、不重复转述三继承旧异议、不派续批。实际main合入后从main路径再次固定读回；live仅原ops在原锁同步与读回、分配发布号，本任务不触碰live/STOP/故障/存档/Regent。无自然采用或收益声明，父要求不能因报告/排队关闭。

## 四文件清单

|文件|before SHA256|after SHA256|
|---|---|---|
|knowledge/characters/silent/build-cores.json|`377920574ce7859f5e39dd01aad495947140226777e742251ac850004ae0cbe6`|`51c757a11ded9db2619466104f284a7d8a2490e10a621e0b367640e82a81df36`|
|knowledge/characters/silent/reflex.json|`aab34d6e5fb0a2375cf95a44aed94a77907e175de3f817686389ef687b5aaee9`|`d489acc71907783ef889a60e6a5672135052ecf6489db3b41ea87ecc4901c776`|
|knowledge/characters/silent/reflex-vocab.json|`a4e2d063a2896ea4d1ac7168f031072b6f5ae0e7f7218e54feeb5c9fbf626a2c`|`561d34d506aa4b8768531f51811aa80a3642bac0838dd32bea802167bf9891db`|
|knowledge/characters/silent/experience.json|`f3479ea243643adcc71bfce934dccd555c34d9309fb4b1424da98a1f30db329d`|`f3479ea243643adcc71bfce934dccd555c34d9309fb4b1424da98a1f30db329d`|

## 本批终局检查与合入边界

沙箱补跑 exit1：539文件中530通过/9失败，4845例中4816通过/29失败，17个未处理异常。原日志保留完整EPERM/EROFS及超时；独立冻结reflex CLI和正式消费者探针通过，不把定向结果冒充全测0。脚本因set -eu在该轮退出，末尾paths.test.ts未运行；固定排除文件和宿主全套待原ops补跑。gitleaks精确拟提交文件扫描0。代码/校验器/测试阈值未改。

因此本轮只保留分支源码提交与完整交付，未快进main、未同步live，main/live新发布提交均为null，父要求继续开放。原ops须对本批精确提交补跑完整检查，核前后四文件及同期知识，再按原流程FF main；从实际main执行scratch/probe.mts后才登记main消费者读回，随后原锁内live同步与再次读回。不得把当前工作树通过冒main/live读回，不触碰STOP/保存局/故障/Regent，不开启游戏或在线请求。

补充：原入口末尾的paths.test.ts已按相同固定入口单独补跑，11项全部通过（paths.json/stdout）；原大轮exit1不改。93个反向链接中silent-r2-card-corrosive-wave到P/D两项仅为检索关系，原tag scope=[3,7]与核心卡运行scope=[10]不交，不提升为A10验证；实际combat过滤保持原scope，不会在A10误挂。逐条范围审计见scope-link-audit.json。
