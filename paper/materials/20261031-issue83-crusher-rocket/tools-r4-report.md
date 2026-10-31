# CRUSHER+ROCKET 工具r4交付

本批只交工具：Silent A10双体Boss可用CRUSHER+ROCKET精确选择已有条目ID；通过当前真实实体识别完整双体或仅剩已知存活体，第二幕以外、重复/未知/缺存活属性/额外活体拒绝。不开功能、不发布知识、不改模型或准入。旧四Boss、全局off与Ironclad路径保留。来源范围见83/6542053381。

另修离线capture纯bug：生产Step.target类型是number|null，原捕获器拒绝合法无目标null步骤；现保持原Plan字节语义，null不伪造enemy0，非法target/index/cost仍拒绝。原型10个真实planner候选含12个null步骤已跑capture→replay；无Jev/动作执行。

## 检查与准确边界

固定自有HEAD模拟器（旧Aeonglass未提交研究暂存后原字节恢复，不混本批）检查：

- 生产tsc、v6工具tsc均退出0；最终null修复之后再分别确认0。
- 单worker开发沙箱652文件/6053项全过，1652.67秒；其后paths11项全过。此广域是在最终null capture修复之前，不能冒最终三叶完整组合；选择器及producer声明之后未变。
- 最终null修复之后，3个相关测试文件42项全过，9.88秒；真实planner/capture/replay原型成功。未因低影响CLI修复重开广域，实际新组合完整检查仍交原集成员唯一入口。
- 固定main caa8a54598d82d55f1593d6650c6987007b84223 +本批selection/声明，原consumer-8两Python模块54项全过（45.293秒）。13个producer方法全核，仅v6-history、silent-boss-calibration两项改变。registry仅更新这两闭包的selection SHA/opaque，不新增依赖边；capture CLI不在13个producer输入闭包中。
- nice19，计算最多两个单worker，无新依赖、无play、无生产控制。

本地日志.artifacts/issue83/crusher-rocket/{selector-sandbox.log,selector-final-targeted.log,selector-final-tsc-verified.log,selector-final-v6-tsc-verified.log,producer-check/consumer8.log}；tools-r4-checks.json固定SHA。生产源码清单/部署映射tools-r4-deployment-map.json，方法差异tools-r4-producer-review.json及两份manifest只是审阅材料。

## 集成和部署

ROOT三叶：agent/src/v6/combat-entry-selection.ts、agent/tools/v6/capture-combat-entry-replay.ts、ops/fixed-producer-dependencies.json。LIVE仅selection一叶；测试只ROOT检查。旧r3七源码已采用，不重复装。材料中的.mts/.py是离线研究入口，不部署到LIVE或注册生产方法。

沿原唯一队列/检查/发布事务，确认新main/LIVE前像、保并行知识与其他发布差量。声明前像SHA 5d1e4da3890a94e42586bc32d4e9bfd5be1981d7397c126da5b85bdc86d074ed；同文件未来漂移须按原规则重新核依赖，不覆盖。实际准入票据必须绑定本批新唯一完整组合终态、当前双根/LIVE前像和实际启用producer，不把开发preview冒可安装票据；开发不安装/CAS或submit/tick。

本批工程review不代科学通过；当前CR/KD模型红、原Plan缺口、真实配对未做、K1未发布，开关保持off。无需重批原开启授权，验证通过后由原ops接既定自然边界。原科学父和KNOWLEDGE_DEMON后续继续。
