# 普通吹哨策略实现回报

已实现并提交普通吹哨的狭窄击晕模型；live 合入因16个共享记录冲突中止。源码自测通过，尚未上线，不标 implemented/shipped，不造版本或合后测试成功。

## 派发与基线

本批20261014-174302-strategy-proposal，silent，reason=tick，工作树与派发相同，无 research_request、implementation_request、proposal_ids、proposal_repair。根旧牌数专题不匹配，不承接其他请求或整条队列。开工 git status 干净，HEAD 7455ee364aef126f4a2a2cc4ab80a56700846ebc；按普通任务 merge main 无冲突快进至 report.base 75fef29d32e4b33c635fbc1f33fa4df9b04d5ba8。没有派下级agent。

源码提交 cebeb2c6a45a09ef6752b713d6a3005df750117b；6个送测、暂存和提交叶字节已核一致。当前工作树干净，HEAD 为该源码提交；没有把它冒称无改动基线。提交英文及真实启动引擎/模型署名保留。

## 提案与证据

从 fix-queue-v4.md 的吹哨待定项选择，沿用原CLI提案 silent-proposal-1bea9962f17ba0ac，未新建重复id。原 proposal-whistle.md 的 SHA256 95b5a32c75c8a432e9cf31dc3df1e0a649e3525dee16b9bcd95ac513694b1a05 与逐步补充保持；本批重新经 code_proposals.py add 去重读回同id。本批具体提案为本目录 proposal.md。账本 silent-0471/0473 只经根 ledger.py 追加 proposed、路径、源码提交和阻塞说明；旧claim/prior/首证及历史保持，不标shipped。

十派发局经 runs.jsonl 核均为 SILENT A10。调度 key 的A11不是A11游戏证据。本批八流提取：runs10、states7847、decisions7418、SL68、config10、run-plans75、brain382、fight-plans0，共15810原行；共用提取入口记录各流source_size、行offset/bytes/SHA和计数，全部seek原源逐字节/正文读回零差异。各流历史invalid计数保持，不强行归于本批；0 fight-plans只说明截点未选到。不使用其他角色经验建立本结论。

支持局只有 Q10YYQ5DUPJA，一局重复SL不是独立样本：

- F49第六试T5：d388996，s401065—401068。普通WHISTLE2费33伤明确击晕及消耗；唯一实验体148/212血，6×6=36。原完整吹哨→防御+预计损23、末HP−18；实击晕后加13挡，5→5进入T6，下一轮攻击恢复36。33本体、遗忘之魂1附伤和回合末2毒分别计。
- F48第二试T2：d388793，s400851—400853。吹哨单步起点503血23挡，实目标492血、STUNNED，T3恢复12×2。原轮首33挡先由回响斩击减10，旧逐步勘误保留，不全归吹哨。

七帧逐SHA验证；四个完成动作与相邻状态fingerprint/observed_ts匹配。固定夹具是明确的字段投影，删除无关运行数据及deck，不冒完整历史执行输入。生产入口测试通过该投影调用真实planCombatTurn/solveTap。两种招式的当前A10公共观察伤害也冻入夹具，保SHA与样本计数，不读刷新的知识JSON；没有网络或LLM请求。

## 旧规则与新行为

旧模型仅计普通吹哨伤害，没有主动击晕，当轮攻击仍进入整线损血和所有线死入口。新模型仅接受已核 silent A10普通两费33伤模板/渲染/变量、原价支付，对当前唯一幸存已观察形态（TEST_SUBJECT 212血MULTI_CLAW_MOVE，AEONGLASS535血EYE_LASERS_MOVE，已见能力且无额外未知能力）取消本轮攻击。当前伤害及消耗后的死亡/阶段变化分开；升级、新文本、额外敌人、人工制品、无实体、未知形态/角色/等级/优惠费用没有证据资格。

即时outcome及给模型的参考事实携带本轮stun；已有rollout必须读取STUNNED的有数据后继，缺数据拒发未来安全数字。未来轮不沿用当前目标资格，不重复免费晕。生产规划器找到吹哨存活线，不进入combat/least-loss，也不生成其early-SL事实；实打后STUNNED帧的judgeEndTurn仍非必死。没有删合法选项、修改药水/SL阈值、重试次数、血价、房间门槛或角色统计；铁甲及未观察角色的同输入数值保持等价。

## 验证

最终9项固定验证通过，覆盖两目标、23→0损血、分源伤害、未来攻击恢复、缺后继拒收、直接击杀/阶段与未知交互、其他角色等级及生产规划器/SL入口。撤掉四生产源码：6失败/3通过、exit1；按原字节恢复：9通过、exit0。原始及最终红绿日志全部保留。

初轮2失败为夹具错误：Step没有exhausts属性，应核卡牌模型；未来攻击夹具没有保留原力量/虚弱而重复缩放，改为冻结当前A10公共伤害和原状态后通过。一次补丁路径匹配失败及沙箱构建时rg纯ENOENT机械失败在原运行日志中保留，重试完成；它们不是生产回归。没有以材料检查代替源码测试。

提交前 bash agent/tools/test-sandbox.sh，SANDBOX_WORKERS=1、nice、固定排除名单：tsc0；主395文件3840项通过，paths1文件11项通过，总396文件3851项，脚本exit0。源码套件实际1024.93秒，不是超时；没有重跑或降低强度。gitleaks staged六叶约108725字节，exit0；git diff --check通过。完整宿主套件尚未执行。

## live合入阻塞与运维交接

在 ops/live-merge.lock 锁中执行原构建器等待、刷新暂存检查；没有需提交的新knowledge数据，刷新前/合前均为 d9bfb65a4ec28cdda8706a150fc4341d28db1227，刷新与本分支重叠为空。live的两处原Dai署名注释不属于本补丁，未覆盖。

实际 git merge --no-edit cebeb2c6a45a09ef6752b713d6a3005df750117b 退出1，16个冲突全部为共享记录/论文数据，源码没有冲突。按任务边界停止，保存 live-git-merge.log、live-conflicts.json、live-merge-receipt.json，merge --abort退出0；复核live HEAD恢复、无MERGE_HEAD、两份原脏笔记逐SHA保持、自身工作树干净，源码不是live祖先。没有合后沙箱、版本、实际上线的decision-log或双通知，均不冒成功。

冲突文件：

- notes/fix-queue-v4.md
- notes/lessons.md
- ops/inbox-dev.md
- paper/data/README.md
- paper/data/commits.csv
- paper/data/cost-curve-silent.csv
- paper/data/cost-silent.csv
- paper/data/cost-sources.json
- paper/data/cost-unattributed.csv
- paper/data/decisions_by_label.csv
- paper/data/learning-curve-silent.csv
- paper/data/runs.csv
- paper/data/summary.json
- paper/data/verification.json
- paper/materials/decision-log.md
- paper/materials/learning/ledger.jsonl

请ops沿原合入受阻兜底流程核源码提交和六叶、自测及本批证据，保留并行记录/知识；不应把此项重新作为机制缺证研究或另造提案id。只有实际上线及合后检查后才登记原提案implemented、账本shipped、正式release_id和双通知。双通知草稿保存在deployment-notice-draft.md，原父要求/自然采用未关闭。

## 限制与回退

Q10最终仍T6阵亡，修T5不证明整战可赢。遗忘之魂额外1伤旧模型仍缺：本补丁33本体+2毒=35，预测敌113对实际112保留1差；F48单步493对实492同样分列，不冒完整HP回放通过。没有修改该附伤机制或拟新血价。历史dirty完整执行树未冻结，当前源码不能冒称原树。未来重复施放、升级、免晕、新角色/等级缺证；真实Jev回答/自然对局采用、完整战斗预测与胜率收益另待新局。

回退只逆向上述源码提交，不覆盖刷新知识或原证据/账本；本次未上线，无需生产回退。若后续部署后回退，ops按实际live祖先和原锁登记新的发布号。

原生线程01a139cb-913d-79e0-9577-92dba53ad69a的实际turn_context逐offset/bytes/SHA核为gpt-6.1-sol/xhigh/workspace-write/never；启动命令服务档default。实际xhigh与任务文本high不同，模型内未改启动器、开启新会话或声称已切为high。核验见native-model-receipt.json，不把默认配置当实际会话验收。未输出凭据，未运行play、推送、改prompt或删除工作树。

最终JSON见final-result.json；无源码之外的经验库入库或消费者自然采用成功声明。
