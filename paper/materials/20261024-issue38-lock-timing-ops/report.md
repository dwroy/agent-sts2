# 2026-10-24T10:23:22+08:00 [ops] #38实际持锁计时补记

按主管收尾要求，已将现有生产回执的live-merge实际持锁时长补回#38。最近完整周期616ab747刷新414.431秒，12次发布写入合计持锁0.472598秒，最长history为0.404293秒、catalog为0.063521秒；等待与worker锁时长独立，不把整轮计算误计为发布锁。原计时行逐条冻结offset/bytes/SHA并核对应步骤，main/live发布器边界源码相同。现有固定临时锁测试1项通过，确认计算完成后才等发布锁，无生产刷新或源码/full/模型/游戏改动。原at只是解锁后记录时刻，无独立墙钟起止字段，不倒算伪造；实测秒数及口径明确保留。结果已POST/GET核同交主管关单；#18并入#45，不另起。原件：paper/materials/20261024-issue38-lock-timing-ops/verification.json、production-timing-originals.json、delivery-receipt.json。
