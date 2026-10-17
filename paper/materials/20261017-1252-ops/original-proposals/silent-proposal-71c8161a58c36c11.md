# H0：纸鹤下已生效虚弱的后续敌伤模型窄修

来源 roy-20261017-human-pace-h0 revision1；原050119/thread01a1415e-a511-7131-be7c-a2dc691c847f，当前batch20261017-095852-strategy-proposal。实现任务仍本授权H0；source_task=experience-update标记本任务的经验更新环节，最终task保持strategy-proposal。

账本 silent-0500，复用silent-0070的旧观察、经验silent-paper-krane-weak-multihit；不改0469/0489的历史分类或完成状态。

SILENT A2，ZZMYZ5UBCG72 F48 attempt1 T2–T7，仍只有1个独立局。raw-frame-manifest.json、end-turn-windows.json和repair-probe-output.json保存原path/offset/len/SHA及实际原帧。纸鹤本局渲染文本为虚弱减伤40%而非25%；九个端点覆盖TACKLE_2_MOVE(str0,无易伤)10×1、BEAM_MOVE(str0,易伤)7×3、BEAM_MOVE(str−3,易伤)4×3、TACKLE_3_MOVE(str1/4,易伤)13/16×1及TACKLE_4_MOVE(str2,易伤)14×1。旧后续模型算13、9×3、5×3、16/20、18，固定输入不符。

旧规则：后续敌招的已有虚弱统一乘0.75。新行为：board adapter只有实际角色SILENT/A2/未熔化PAPER_KRANE/TORCH_HEAD_AMALGAM、基数与命中数吻合原观测时，附六个已见上下文；仅已有虚弱、无缩水或额外Vigor时采用0.6。它是本局机制文本及意图支持的减伤量，不是拟合的校准系数。当前回合新施虚弱、其他力量/怪物/进阶、无药水/SL新阈值均沿原路径；不能据此声称A10伤害已修或女王达标。

固定探针调用实际simulateFight两轮，九个实际意图修前全不符、修后全相符；八组隔离包括合成其他角色、A10、无/熔化/未读状态纸鹤与未见力量值，完整输出相等。Vitest同场景数值回归及角色/进阶/基数隔离；沙箱完整tsc+vitest在提交前执行并保所有原rc。固定探针不是自然采用或胜率收益。

切分保持107调参/481验证和原cutoff/tuning keys；修复依据在调参内，仅影响ZZMYZ5UBCG72:48:1:6575079429这个调参key。已完成的其他新对象模拟复用，只重算该key的B2/T1和B3/pre，验证不用来拟合。四闸不变，其他目标缺证保持low/unknown。

预期影响：只缩小这些A2后续回合意图的已核偏差，不承诺整战概率改善。回退只撤本函数和board adapter调用、EnemyMove元数据及对应moveAttack分支，保留并行H1预算、知识刷新、原校准和失败证据。H1共享rollout-live.ts需锁内逐hunk合并；不覆盖其工作树或0332资源逻辑。来源/代码合入后经原CLI链接实际源码commit；shipped交ops核。
