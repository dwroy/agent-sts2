# #81 对局脑 fast 配置入口

本后继只在 `agent/src/core/config.ts` 增加 `BRAIN_CODEX_SERVICE_TIER` 的白名单解析：允许 `default / fast / priority`，未设置仍显式发送 `default`，非法值抛配置错误。匹配的producer工程声明一并同步，原因见下文。模型、effort、战斗、其他引擎和共用普通档常量不改。依据主管 [81/6520220863](https://github.com/dwroy/agent-sts2/issues/81#issuecomment-6520220863) 及Roy经主管授权 [81/6519860262](https://github.com/dwroy/agent-sts2/issues/81#issuecomment-6519860262)。源码支持和下一自然局实际启用分账。

当前交付已规范化到实际R462 main `bc06e8f975b2db4f79fcf5cd4e8c9093e277dca7`，在原工作树、原分支制作。原R461/9711组件在 `a75fe8e9ffad28791a8295e7b3016627959ae70c` / `issue-81-brain-fast-9711-checkpoint` 保留，其整轮证据独立保存在first-combo，不倒填为R462组合full。原完整注入交付 `c4a9396c99f1b771f3768c050b88947fc9592b3b` 另保留在 `issue-81-complete-injection-r3`，不把旧注入差量混入本批。LIVE仅部署config.ts；ROOT另带匹配的 `ops/fixed-producer-dependencies.json` 工程声明，两ROOT/一LIVE叶；五个测试文件及合同随交付保留，精确前后SHA见 `source-inputs.json`，叶映射见 `deployment-map.json`。

## 传参与隔离

现有消费者已支持服务档：exec配置输出 `service_tier="fast"`，app-server启动、`thread/start` 和每轮 `turn/start` 传 `serviceTier:"fast"`；priority按原值传递。未设置或显式default时，所有上述入口继续显式default，清掉旧线程继承的priority，而非靠省略参数回到普通档。无需改引擎实现或重建参数协议。

run-config现有 `brain.codex.service_tier` 直接读取所选配置，已用测试确认fast与default各自写入且配置SHA不同；没有新增重复日志字段。该记录表示本控制器选定并发送的档位，不代服务端实际采用。只有实际使用Codex时才写Codex段。

共用 `CODEX_SERVICE_TIER="default"` 保持不动。固定测试在brain变量为fast/priority时，学习者 `codexLearnerConfig()` 仍default；ops/learner原shell policy在同变量存在、输入旧priority时仍向假的原生程序发送default。Jev与其他brain引擎设置逐对象等价。Ironclad/Silent在未设或default时都保持普通档；对任一角色显式设置新brain档位属于本次工程选项，生产仍仅由ops在原主Silent条件分支设置，不改铁甲游戏规则。本补丁不改学习/ops/wrapper、账号home、模型或effort，也不修改生产环境变量或共享配置。

## 原生参数依据与实测边界

读取本机 `codex-cli 0.164.0` 的 `generate-json-schema` 产物：ThreadStartParams/TurnStartParams均存在 `serviceTier:string|null`，TurnStart说明该参数影响当前及后续turn。schema片段与文件SHA在 `native-contract.json`。官方[Fast模式说明](https://developers.openai.com/api/docs/guides/fast-mode)列明fast与priority的请求语义；本项目仅开放本需求批准的三种字面值，不开放auto/flex/ultrafast。

只读features探针接受default/fast/priority，也接受任意字符串，所以**不将该探针作为服务可用或fast已生效的证据**；非法值由本项目白名单拒绝。首个探针把不支持的全局 `--ignore-user-config` 用在features命令，原exit2保留；纠正命令后另存原件，没有覆盖失败。本轮没有真实模型调用，CLI/RPC参数证据来自固定假原生程序，下一自然局仍需ops核原生及真实请求。

## 固定producer的必要声明同步

首轮广域发现旧codex-fast角色测试仍要求显式priority被忽略；改为仅对未设置/default断言普通档，新白名单及跨启动器测试已覆盖显式fast/priority。另有真实拒绝：校准固定producer检查到config.ts字节变更，而工程声明仍钉旧SHA。现仅同步v6-history及silent-boss-calibration两个节点的SHA与TS整文件opaque_sites，原依赖边、producer合同和算法参数不动；没有放宽校验或自动刷新未知依赖。

这会改变两个producer的方法身份，不能称为“未变方法”或手改生产control补绿。原ops必须依据最终实际ROOT/LIVE组合及唯一终态材料，在同一工程发布事务完成已启用producer的方法准入/CAS与回执，未启用者不自启；先核#83实际采用后的新前像、保留其全部声明差量。本开发不生成生产准入或写control.methods。

## 检查

9711组件生产tsc通过，修正后8文件118项定向、沙箱653文件6043项及paths11项全部通过；首轮5文件108项定向原件也保留。覆盖：缺省/显式default、fast、priority、非法值、CLI参数、thread/start与两次turn/start、run-config值及SHA、学习及ops原policy保持普通档，以及Jev/其他引擎隔离。规范化后生产tsc、8文件118项定向及paths11项再次通过；六个TS源/测试文件与已全绿组件逐字节相同，声明在实际R462前像上仅改两个config节点SHA/opaque_sites，保留#83全部新增差量。日志SHA与前后对比见 `verification.json`。653文件整轮明确仅属9711组件，不代规范化后实际联合批次的唯一full。

运行/测试源在定向通过后未再编辑。首个记录脚本因agent cwd下误用根相对路径而失败，随后的广域已启动；清单随即纠正并核源SHA。该次在错误路径生成的211076B原Git冷夹具，核字节及本轮创建时间后移除，正确根路径从基线原blob恢复；没有改夹具内容或其他会话文件。此记录错误与原生探针首败均保留，本轮不倒填为初次成功。

## 交付与ops接续

固定请求仅准备，开发不submit/tick、冻结发布事务、取生产K锁或部署。#83已实际采用R462，本包已按其真实前像重放，不能整文件覆盖旧9711声明。若时间与#77主管裁决收尾批次相合，原集成可按主管授权同批组合；#83 r3已经在途，按原ops选择待其实际采用后再写fast配置，不取消/重冻或复用旧K放行。实际组合仍核本单一源叶及#77自己的ROOT差量，不带原账号作用域P1批。

采用后原ops通过原对局脑配置入口在下一自然启动点设 `BRAIN_CODEX_SERVICE_TIER=fast`，保持Sol/xhigh，不热切当前局；分配实际发布号并核run-config、原生turn_context和真实请求档位。随后沿已授权5个自然完成局比较题级median/p90、overloaded、脑分钟及codex1额度趋势，不额外开局或新增观察器。真实fast能力、额度消耗和时延收益在本开发交付中均未宣称完成。回退在自然边界unset或设default；不改其他启动器或账户配置。

发布门接续另账：ops [81/6521348652](https://github.com/dwroy/agent-sts2/issues/81#issuecomment-6521348652)明确原83票据已绑定其声明整文件SHA，既有事务start拒绝换ticket、installed-only不允许新部署，而原owner释放仍要求fast实际安装。此边界交主管/原ops协调分段合同，本开发未换旧票据、套resume重部署、提前release或换owner。新source与方法声明可供实际联合检查，门边界和真实自然启用均不在本报告中冒完成。
