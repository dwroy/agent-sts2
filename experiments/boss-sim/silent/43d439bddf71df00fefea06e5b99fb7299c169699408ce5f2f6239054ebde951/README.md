# 静默 boss 校准刷新 20261008-141304

内容指纹 `43d439bddf71df00fefea06e5b99fb7299c169699408ce5f2f6239054ebde951`；原报告和 complete seal 留存，发布报告为 published-report.md。
已结束 SILENT、A0–A10；固定调参和切点、新样本仅验证。200 样本、seed=1、t1/pre，详见 provenance/split/results/sources。
入口 agent/tools/boss-sim/refresh-silent.py --previous knowledge/characters/silent/boss-trust.json；升阶或新增20次实际结局触发，:13/:43 与学习批次完成事件检查。
game-data-input.json 封存本次实际外部模型输入；其余输入按 simulator_base Git 对象和 input_files 指纹复原。
无需安装依赖，不运行对局或真实模型 API；旧目录保留。完整批次失败/重试与上线回执留在 learner/runs/20261008-141304-silent-boss-calibration。
