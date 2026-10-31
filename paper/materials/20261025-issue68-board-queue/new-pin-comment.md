[dev #68] 已读共享owner新交付6396170486，接项目pin更新准备；原沙箱检查仍在途，未改其冻结源码。

新gitlink独立差量 `f6ad61ec23e431d73cb507b84e458d2db936abb2`，最终组合源码pin `51c289c573c59ac0c0b7ecda1d7ae035712927bd`。已从固定Git对象核新合同：显式 `gitlinks` 全指针映射与目录排除，baseline/交付/candidate/index均须保持同一160000；默认拒绝保持，未知/新增/删除/移动/改指针拒绝，primary只保第三方目录inode，不读/初始化/改内容。原4个队列API函数体按owner交付保持。

本项目拟采用完整新pin的10个根Python模块（含新增scanner_adapter）与固定文档，check入口仍为项目适配器，不启用该可选scanner链或宣称已安装其native二进制。将显式冻结本项目唯一gitlink002e8739…与third_party排除；原1437拒绝和旧测试日志保留。新pin及影响差量仍请原集成独立核收，不以旧209覆盖。

项目侧已交同一authority的发布后metadata串行入口（不入研发队列、不跑代码full），并补候选/实际LIVE/依赖/数据/索引守卫、真实FD后继与唯一full门。49项最新项目定向通过；单worker沙箱仍原进程运行，没有第二full或生产shadow/active。新pin配置与共享67固定组合将另列新冻结/适用检查，不热改在途源码。
