# #20 一分钟派单器独立子项集成核验

来源为 issue 评论6368947281，项目源码 da1e3bd51ce95f5ca343783afa51950ca70b879d，配套私有 kit 8940977373e028664dae5fbcf3fea870c8950500 / tree 77ee8bc2eb7ebfbd9356cafa4c56feae2a4e7fbf。公开项目11叶与开发源码逐blob同；当前 main 931e1525012be95e0745a714615da9171201cbef 隔离组合 tree e6136139bd04e14a738a5c6bfede9ffb5dd09d29，后续 main 若只变无关记录则在集成锁中逐叶再核。

## 验证与边界

- tsc0；精确kit七组123过；公共入口6过、生成器8过；Vitest3文件4过，包含上述6/8项包装及原ordinary-close定向回归（不重复累加）；bash语法0。固定夹具、nice19、Vitest单线程，没有full、模型或游戏调用。
- 首次Vitest命令误加当前版本不支持的minWorkers，CLI在加载测试前拒绝；失败原日志保留。改用仓库已有pool/单worker参数，重定向第一次路径写错也被shell拒绝；修正绝对路径后3文件4过。输入哈希在所有检查前后相同，见inputs和receipt。
- 新旧入口显式poll_source交接，原控制默认stall，配置声明不会自动激活；空闲2分钟、pane10分钟去重、2小时/3次接续保留。ETag/updated_at缓存、滚动千次额度及未完整快照不动作已核。
- /new默认shadow；真实一天观察、主管批准及SHA证明之前不能active。完整交接、原生turn/session、空输入、客观进程/heavy/发布与五分钟状态门优先；未知及不确定回执保留。测试中动作全为mock。
- ops角色区/原声明时间独立保留，生成与12KB降级不覆盖；生成器刷新不构成新确认。集成员自行更新其交接键为文档规定的完整三项格式，不代写ops头。

## 交原ops

按docs/agent-board-minute.md先在原宿主安装上述精确kit及公共11叶，保原registry/journal/uncertain/control、其他项目及学习tab发布。先只读演练，再明确唯一入口并切分钟cron；继续shadow，不开启真实/new。安装/启用不改变game live，不增加行为发布号。核一小时真实调用计费数、空闲与提示延迟；满一天交主管核误判/开头上下文/压缩统计，再决定是否active。生产安装、节拍、自然观察均未由集成员代做。

只核收此独立子项，#20父、#39/#43随父的最终组合与发布仍未完成。#42额外工具候选仍存，#35旧full已由ops核为lost-no-final-result，新R420组合必须另核；其余50→28→37→20父依赖保持。#27状态未变，不再写主管收件箱。
