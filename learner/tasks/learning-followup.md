---
title: 原学习要求接续至经验入库
tools: Read, Grep, Glob, Bash, Edit, Write
timeout_min: 240
effort.codex: xhigh
---
# 原任务接续：学习、验证、经验入库和交付

这是同一学习者线程的后续输入。以下新授权和补充优先于旧轮的“只交报告”范围；旧报告、输入、失败、对局和台账历史均保留。
自己完成，不另派子agent。先读项目当前 AGENTS.md、docs/learning-protocol.md、docs/learning-code-proposals.md、docs/learning-requests.md。
游戏知识只能从本角色对局学，Roy要求的是认真检验问题，不是要求证明假设正确。若证据反驳原建议或与旧知识冲突，必须写出质疑、证据、旧知识ID、替代结论及建议，交ops→watcher→Roy；不静默忽略，也不将未经验证的观点硬写成事实。

## 原要求与逐项验收

LEARNING_REQUEST_JSON

## 已冻结的补充输入

LEARNING_INPUT_TEXT

## 上一阶段进度

LEARNING_CHECKPOINT

## 执行与交付

1. 核实原工作树、原报告及当前live差异；只在本工作树中开发，保留历史。需要时安全合入当前main，不能覆盖知识刷新。每项要求给出证据、方法、结果、限制；复用已验材料，不重跑全量历史或已通过测试。
2. 按原要求做实际计算、对照及证据核查。没有证据的判断保留未知；认真查完仍缺证时说明具体缺什么及下一步，用questioned/blocked回报，不能用“报告已交”关闭。
3. 学到的支持结论、限定结论或反证结论写进本角色experience.json，带证据局号、适用条件和置信度；去重合并已有经验。涉及出牌/药水/SL/终局的结论同时经learner/code_proposals.py登记或关联已有代码提案，遵守原并行所有权。
4. 实现已授权的必要适配；固定自测通过后合live，登记版本、decision-log和双通知，运维确认上线及ledger shipped。源码测试用现有沙箱入口；只有数据改动不造源码测试。不推送、不运行play、不重启对局、不读游戏二进制或凭据，不改ops prompt。
5. 保存实际消费者读取经验的回放或自然局证据。固定回放不冒充自然采用/胜率改善。回执至少含request_id、revision、character、experience_version、kind=fixed-consumer或natural-consumer、status=passed及evidence数组（每项{path,sha256}，保存实际探针输入/输出）；不能只手写passed。自然局效果仍另记待观察。
6. 报告和中间结果放在本工作树learner/runs下；不要修改notes/learning-requests、ops/codex-ops/learn.json或通知确认，注册/确认由ops和watcher负责。有充分证据的已授权修正可继续上线并通知，不因有异议一律等待用户批准。

最终用一个JSON代码块回报，保持strategy-proposal既有格式(task,character,fixes,merged,tests,code_proposals,implementation_domains,proposal_results,report)，并附learning_result：
- request_id、revision、input_sha256：逐字对应本次冻结输入。
- outcome：complete / continue / questioned / blocked；complete必须每项已进入live经验并有消费者读回证据。
- coverage：以requirements中每个ID为key，value是实际live经验引用数组，每项{id,sha256}。sha256算法为Python json.dumps(entry,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()的SHA256。
- consumer_receipt：{path,sha256}，指向上述真实消费者回执。
- questions：数组；每项含claim（原建议/旧知识）、finding（不同意见/冲突）、evidence（局号及材料）、recommendation，尽可能给existing_entry_ids。
- checkpoint：仅做完一阶段时，写具体新增产物、SHA、未完项及可执行下一步，outcome=continue。重复没有新增进度会自动报阻塞。
- reason：questioned/blocked的具体原因；不要把排队或退出0当已完成。

merged仅填实际live祖先的完整40位提交；无法合入就如实blocked并给ops固定源提交和错误。正确的否定/限定结论同样是学习成果，但必须入库且把异议通知Roy。不得伪造receipt或确认用户已收到。
