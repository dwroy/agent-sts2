# 候选提案：沿既有棱柱阶段/药水/删失提案，先核相同实际前缀的状态转移，权重和校准保持waiting。

适用角色仅 Silent、已观察 A10；实战为V5、多版本/脏数据现场，回放固定cf3372505b85e8df72e99cb9b5455c9f42b25e1a。不得外推铁甲、其他角色或未观察进阶。来源任务issue-4-elite-calibration，批次issue-4-elite-calibration-20261021-104312，父要求silent-elite-simulation-pessimism-20261021。本轮只草稿，ledger未新增、CLI未调用、无实现任务批次，不填写伪造登记ID。所有下一步由原ops单点安排；本轮预算新MC=0、真实模型=0、测试=null。

状态：waiting；local_key只是scratch目录索引，不是正式提案ID。

- 25MFNPAE37R2-f28-fight14（Silent A10/F28/T1可行动），logs/states.jsonl offset=13872752851 bytes=35206 SHA256=2b384a1972b88a20e5e11485250b3264f0907bfcfba657623c07d7dc3866af13
- 76VEDXJJ2PFL-f30-fight15（Silent A10/F30/T1可行动），logs/states.jsonl offset=14478276210 bytes=40823 SHA256=83cc8cc3e7dd509dd2fa63e373d3bde02fe11120ecfc673673c22e022b4f61c2
- ET1QAZCV8GUP-f31-fight11（Silent A10/F31/T1可行动），logs/states.jsonl offset=14296044731 bytes=40115 SHA256=385cfbe3b57c560e59604cf56839725c288fe49c4b85e2a0551eea1614416ca2
- 0NMF36KX3F7Y-f9-fight5（Silent A10/F9/T1可行动），logs/states.jsonl offset=14114959665 bytes=30299 SHA256=6b4e898c22862a17b71e43fad9bb43c2d99adf05967d21c55ddbdbeb60db6719
- 76VEDXJJ2PFL-f8-fight5（Silent A10/F8/T1可行动），logs/states.jsonl offset=14467283240 bytes=28062 SHA256=45675a04d54de92ca8264c8fef0118abfa65781dbddba4f3e4454ecaa49a459d
- 34XTHUP4433X-f24-fight13（Silent A10/F24/T1可行动），logs/states.jsonl offset=14562951292 bytes=40294 SHA256=187f515433d44b5abe0fee5d8102375f88a05e3dc602d91fc3be2828a3f1b5d9

复用原ID：棱柱阶段与完整候选用silent-proposal-e76e895381da5bfc（silent-0167/0168等），药水归属用c51468c5e8ba6668（silent-0019），一血SL删失用da9575b27ac37dbb（silent-0019/0125/0276）。本文件只给本窗口补固定索引，不造同题CLI id，也不把旧局证据算本窗口实战分母。

旧行为：1500节点、damageScale0.5的未来代码策略，从开场自行选线；冻结只有T1首用集合和逐轮汇总，无完整动作/抽序。拟新行为：在相同原开场强制已经实打的有限前缀，记录每步前后HP/敌HP、能力/意图、牌身份及药栏；只有此时的首分歧才可归机制。另将自由策略分支与该原前缀并列，区别策略偏好和执行错误。25MF原DEFLECT/FLICK_FLACK/MALAISE而32实际开场样本T1均额外FOOTWORK，已经证明T1选线集合不同；并未证明加步法导致后续死亡。棱柱T5能力由3到6的观察存在，但模拟没有对应逐步能力轨迹，阶段根因waiting。保持权重0.5/阈值/预算，不从死亡率推拟新系数。

固定回归与撤源负控：先修input-fidelity；选择上述三棱柱、0NMF、76VED F8、低残差BXU F15、9W38 F8及删失34X F24共8窗，各最多3个已执行动作、共24步。单动作若随机生成/抽牌无法按原件唯一映射，立刻unknown/停止，不预支未执行后继；撤掉原后帧或SHA失败必须无法给“匹配”。32样本全死与hpLoss满血同一定义，不能当两份独立回归。SOUL_NEXUS no-solve保留单独异常负控，不用重试补齐。

独立留出：本53场全部已阅、无盲留出；固定窗口只能开发/负控。后续首8个未阅Silent A10独立完局、每局首精英且含失败，作为时间后留出；未齐前waiting。最小实验预算：上述24个确定转移、1进程nice19/ionice3、≤15分钟、0MC/0模型/0full；ops若之后安排模拟，只冻结不超过8窗×2输入×4个固定旧seed=64样本、保持30回合/1500节点、一分量一比较、不增池，原单点另行记录许可与预算，本轮没有启动。独立留出至少8局只是数据收集下限，不是自动通过精度门槛，样本不足不宣称收益。

预计消费者：离线fightSample诊断、A模型可信度和既有阶段/药水候选审计；自然Jev/大脑采用与拿牌排名另验。与0332/CEN的成功死亡/资源接续纯bug、P4和拿牌预测器去重，它们子实现不关闭此父。回退：仅撤回新增诊断或限定机制修正的实际提交，保留已有资源接续/成功死亡bug修正；本轮没有源码可回退。误差：同种子仅降部分方差，不能消状态相关绝对偏差；任何全线因果/收益/最佳牌排序仍unknown。
