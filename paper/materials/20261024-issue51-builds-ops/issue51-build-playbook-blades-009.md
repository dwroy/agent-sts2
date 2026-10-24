# #51／#54 新输入流派单元：blades
授权：Roy经主管的6377608072学习过程与本轮#54交付/原ops接续指令；统计主交付e4c1ccee1fd10f3a420468f6ec7a082bc5ff81a3，full=0。只处理此一个流派，不复跑090927/085327或旧Boss单元；原未提交/failed/rc0与科学父保留。任务模板已进入#54交付后的新阶段。

先用eval/sts2fun_build_view.py --root knowledge/external/sts2fun/builds-v1 --kind archetypes --version v0.111 --cluster N --limit 1，N为实际数据中的0..7。全部8簇的核心原ID/权重/出现率核完后，由你依据证据选择最符合本目标（blades）的簇并解释命名；不能照ops示例号或预训练游戏知识假定流派。无对应簇时只跳无法支持的语义子项，仍报告可支持的方向，不虚构。

对选中簇按representative-timelines逐页limit=1读取10对（20局，胜负各半；实际不足时如实缩减，至少10局才称该轨迹样本层完成）。每页包含两局全部18列节点，阅读整局不截尾；优先v0.111，若配对在别版本，按实际版本分开读。固定manifest SHA ac5f0d359e445d4bf605681d67f403155e84f292bb19872903fa13b7bc3ea852；不读13GB源库/安全缓存/玩家标识。示例id为脱敏内容摘要，不是本系统局号。

补读同簇combinations/timeline/matchups/boss-semantics的有界页，保留筛选/分母/版本和页SHA/完整阅读清单。29518组合BH q<=0.05通过0，不可称已确认因果组合；组合差仅探索关联。6291终局有效ID还原一致，不证明中间节点准确。Boss通过、前节点末HP均代理，真实入场/场间/药水快照、验证楼层、历史机制及独立玩家不可用。记录序号不是floor；上传行不等于独立玩家；未校正关联不写收益保证。

产出一个流派剧本，覆盖：核心搭配的有证据理由、拿牌顺序/何时转向、各幕目标与补救、Boss及连Boss准备、失败点和Jev可用HP预算。缺列先用明确标代理的可计算统计继续（前节点结束HP/记录拿牌顺序等），无代理才跳该子项，不整批waiting；没有足够证据的安全阈值保持unknown。关键观察逐个绑定代表轨迹页/节点、胜负例和反例，给统计方向/幅度/分母。终局聚类/未来胜负不能作决策时触发条件，schema不表达的条件写正文限制，不能扩schema或改源码。自有同流派本批未授权新原日志输入，own_support_runs=[]，不得纳Roy手动窗口或交接Z2KBGZQMSRV5；外部来源与本系统证据分账。

只在scratch保存strategy/knowledge候选，formal_publication及consumer_readback=pending，原正式库仅作去重（同ID要保留旧证据）。报告来源账本、逐页完整覆盖与缺证表、候选/复用/跳过/新增/正式/自然采用分列；流派批新增计数与旧单牌scratch复用的0计数分开。绝不更改queue、游标、运行源码、权限/账号、STOP或live。使用原模型gpt-6.1-sol/high/沙箱，fast请求不等于原生已采用档位。

所有unit_ids写真实external_results；report.md末尾json代码块、result.json与最终回复必须同一对象，包含code_proposals、implementation_domains、proposal_results三个数组；本无源码/无派来代码提案任务实际为空。tests为null，不运行full/模型/游戏、不冒代码合入或版本；HEAD=dispatch_base。
