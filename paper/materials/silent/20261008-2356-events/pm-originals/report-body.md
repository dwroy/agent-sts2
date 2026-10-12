## 复盘回报

- 已追加：M0GY0A4M2F7H（A10，第17层，墨影幻灵 VANTOM 六次尝试均未过，末次T7以8血、20挡对32攻击阵亡，敌剩126血）。
- 已追加：Z91JN3S3PQX2（A10，第33层，无厌沙虫 THE_INSATIABLE T13沙坑归零致死，末轮17血、8挡，敌结毒后剩45血）。
- 新的纯 bug（file:line，每条一行；没有写「无」）：
  - 无。
- 写成「未记录」的项：M0GY0A4M2F7H：完整dirty源码、前五次SL退出及截断结算、部分末击／毛伤／幻象退场、实际最优执行比例、逐房投影／boss时钟、未选方案的整场对照、后续幕资源、Jev缓存／实际费用；Z91JN3S3PQX2：完整dirty源码、部分末击／过量伤／最后两敌击杀先后／末轮独立攻击结算、实际最优执行比例、逐房投影／boss时钟、未选方案的整场对照、三幕资源、Jev缓存／实际费用。
- 学习账本：M0GY0A4M2F7H：新增无；更新 silent-0079、silent-0224、silent-0019、silent-0005、silent-0227、silent-0020（老错 silent-0079）。
- 学习账本：Z91JN3S3PQX2：新增 silent-0313；更新 silent-0093、silent-0125、silent-0094、silent-0005、silent-0018、silent-0178、silent-0046、silent-0278、silent-0243、silent-0020、silent-0023、silent-0276、silent-0019、silent-0162；无新增repeat。`ledger.py check` 退出码0。
- 代码提案（证据／账本／CLI id／实现任务，证据不足明确写限制）：
  - M0GY0A4M2F7H F17T9／T3等，silent-0079／0224／0227／0005 → silent-proposal-2d711af284735508 → strategy-proposal：核全败换线血价和滑溜进度；缺保血线整场对照，保留现门槛。
  - Z91JN3S3PQX2 F17及F33T3／T5／T9／T11等，silent-0093／0094／0125／0005／0018／0162 → silent-proposal-1de0737d94ac87f5 → strategy-proposal：核能力建立、护栏与双结束线；缺单改启动时点／原护栏线的整场对照，保留现规则。
  - Z91JN3S3PQX2 F33T13，silent-0313／0018／0178 → silent-proposal-90a4a4981be3c760 → strategy-proposal：接入已观察钨棍／沙坑组合；仅限已见条件，不推广其他防死交互，不保证SL转胜。
  - 两局F17饮无色及F12T1／F33T3、T12等，silent-0079／0224／0278／0276／0023 → silent-proposal-16f7cf00059df9a0 → strategy-proposal：核药效、生成牌兑现和SL恢复分账；缺饮药时点整场对照，不拟新饮用／留药门槛。四份均待独立实现，未登记implemented或shipped。
