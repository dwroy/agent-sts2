# #37 R425 后候选重组（完整检查待窗口）

2026-10-24T07:01:02+08:00。隔离候选 `657293922065fec95e0faf0f96fbfa1fb132b0c2`，树 `d8bb7c1f31d028aa8fcb58ab49b2b3db86406833`，基于 main `b2c685719c983cc23678f6dc5c903bed963ef326`，来源 `9e8f900dde2df7829d73482bc8ac632af7128c65`。实际 live `8f20ce51d262d5501c45c1d3fdd3726f3ace3f6e / V6-R425`；25份发布原件引用 SHA 独立核同。主线随后5cc7c5b仅记录漂移，本单未合产品 main/live。

两处 Jev 运行文件与 #25 前09b7aa19b5字节完全相同；大脑与知识源码不改，R425十二叶保持。共享 card-option 冲突保 main 全字节，完整时钟、solver/sampling 两种预算耗尽对照与 afterEach 均保留；账本保 main 全部记录并原样追加来源三项。最终13路径，source 的旧单时钟测试补丁由当前完整回归覆盖，未覆盖主线修复。

当前组合 production tsc0，6文件98项定向通过；2656实体源码/固定输入和512个依赖运行文件前后SHA无变化。本轮98不同于旧96，不能代完整检查。稀疏冷夹具 issue29-brain-speed/results.jsonl 从候选 Git 对象实体化，SHA 8d83deb7c85a8b7ceb92da9ffb195f13edf4fa2876f9be5692ec8d2ded1c23ef。首次错误cwd准备及不兼容 minWorkers CLI 在测试启动前退出，原件保留，修正后通过；既有来源失败亦原样保留。

469知识文件全部盘点，候选=main，实际 live 有222叶差异，逐叶SHA见knowledge.json；本轮没有复制、改写或发布知识。下一完整检查必须先接 #51实际释放，按届时main/live重新核漂移并冻结最新知识，保发布绑定及全部消费者；本轮定向使用固定夹具，不宣称已检查最新live知识净组合。

07:01读回 #51原状态仍 unique-full-running（449851/birth21955302），宿主部署 waiting-original-candidate-check-worker（452030/birth21964974，deployed=false）。本单full=0，不登记第二个等待worker、不提前发布。待原检查及实际宿主部署明确释放后协调本单唯一full，之后原ops发布/首自然局 Jev无open_book与无调用错误、大脑工具实际读回，再20父含39/43。#28科学两臂/开关/A-B、#27正式ACK/Roy回执、#20原缺样及一天窗、#53待决分别保持。
