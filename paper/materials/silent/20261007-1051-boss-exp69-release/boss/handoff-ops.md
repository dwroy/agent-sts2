# 运维交接：Roy 已授权新功能 静默 boss 模拟校准

源 cdf75af64fb5b118a5a808ecb3b05e2a05991c36；实际代码合入 75ba3f6ec0ef27cdd73f10d1e9e91200437722b4；固定发布 e0895f65d4307885b35f4ff3f5d9074efc844629；树 70e034677363c6700ab167e7300e7f9dd3063e8f；唯一版本 S1.boss-calibration1。合前 a0e4b5e2ed881ead45d0ed8dadb2c1520e2be727，刷新保存提交 None，改动重叠 []。全部提交、实际校验及原失败日志见 completion.json / publication.json。

学习账本 silent-0223 只以 fight/proposed 写入，含160场实际结局来源与SL失败房间说明、来源提交。请据实际发布CLI追加shipped并机械同步main，使周期调度代码生效；完整外部检查走既有learner-checks。学习者没有直接写根目录notes/ops或冒标shipped。

源码 tsc0，Vitest 218文件/2306例；合后 tsc0，Vitest 223文件/2338例；Python12/调度8；撤映射和范围红测试3失败2通过，恢复功能的7项TS夹具纳入套件并通过。原夹具、编译、扫描失败日志均保留；gitleaks初报的是corrected-keys.json校验和，已改为明确file/sha256清单，默认规则最终扫描0，无豁免。未超时重跑，完整沙箱外套件未宣称通过。

严格已结束SILENT84局/378尝试；160实际结局119胜41败，218截断不标死亡。原160×2起点，仅A1 K3676LU8B0UH F48 attempt2的两条no solve排除：拟合106/候选107，验证53。46局调参/28局验证，没有同局或SL跨切分；验证全A10，前两段独立验证n0。12个boss场数2–9且完整四指标判断，全低可信；总数量缺口67（仍须过其余指标）。A10两消费者预测74.9%/实际69.8%残差+5.1pp；F49实际3败、调参2/验证1，还差9，预测36.6%/33.8%对0%、打穿3.70/3.528，低信度。A10血量输入93/93有A10记录，49攻击定义中Queen Execution/TestSubject Big Pounce两项由A9估。

报告：paper/materials/silent/boss-sim-calibration.md；全部来源/固定开场/回合/切分/模型和旧报告：experiments/boss-sim/silent/590b644745e0d8b341bae1b21e866a0e808a45e6999c4ab0be1fe6e3b23a84d2。模型固定ff571cf0加本批角色隔离/开场输入适配，实际文件指纹ed59a56ba276882dc276311b65b7887af9ce5e61bfadf1b62de4fd43396a2474；发布保留后来别批代码/知识，表格不冒称最新模型独立验证。

周期入口 refresh-silent.py --previous <live静默boss-trust>，调度:13/:43和学习完成事件检查，升阶或20新实结局触发；初始发布后激活，固定切点/旧样本，模型变化重新固定来源和全量预测，旧目录留存，新达标按原四指标自动入名单，仍走锁内自测发布。重复真实输入已跳过拟合。其他角色的37个知识Git blob原样保留；未改策略阈值、未修其他队列、未运行play/LLM/联网/推送/停局。原live脏notes保留，工作树源码提交后干净。
