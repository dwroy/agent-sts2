# #36 首次P0完整检查失败原件

旧组合为实际 V6-R417 f3fb25b73be7 + 0933ea0ef + #20学习tab子类c17842f8/fc37ac1f + 四个已批准main运行依赖，tree e9e3009f92814e317f0a0c89e8ce8de517208008。只实际启动一次full，11:20–11:46；tsc0，653文件/6326通过/2跳过/2失败，2548输入前后SHA同，469知识。两次此前准入未启动tsc/full；main兼容树仅组装，未开始检查或合入。

brain-view的旧断言protected board role不兼容#20新running-panes保护的running learner pane retained；实际保护动作保留，但夹具红。ordinary-close-isolation的spawnSync15秒超时再次出现（15034ms/status null）；先前定向首败一起保留，不据重跑称稳定。详细断言与时长见failure-analysis.json，原始JSON/日志压缩无损保存，provenance记录解压后的SHA。

主管6356904617裁决：实际live最小#36不带#20；先同基线单跑超时项，基线同败才另开issue且豁免该项，组合独败退回#36；新组合唯一完整检查一次。旧树及本原件冻结，不自动重跑、不开关、不发布，不造自然完成或改旧75。#20夹具留原开发范围。
