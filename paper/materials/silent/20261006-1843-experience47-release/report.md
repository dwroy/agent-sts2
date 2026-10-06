## 经验库更新回报
- 版本：2026-10-06.21 → 2026-10-06.22；提交：0723092c（分支 exp-silent）；合入：a95d92ecee0152abcb433b00b3aa0305d3fa2e43
- 条数：新增 1、更新 17（加证据 12、只改数字 0、仅压缩 5）、退役 0；active 121 → 122；56362 字，A8/A9 各116条53707字
- 机制推理：
  - 复制返还与五轮书回血 — 复制加牌与五张回20血同时兑现 — 支持1局、反例0 — PU80F84P6HPN
  - 敏捷逐后续挡牌 — 5敏捷让两防御各10挡，未建立不预支 — 支持36局、反例0 — PU80F84P6HPN
  - 力量与虚弱/脆弱 — 力量逐段，虚弱/脆弱逐项取整 — 支持55局、反例0 — PU80F84P6HPN
  - 金刚杵开场力量 — 开场1力使打击+9→10，不补毒或挡 — 支持7局、反例0 — PU80F84P6HPN
  - 触媒建立与毒触发 — 无毒不触发，未建立不增加结算次数 — 支持18局、反例0 — PU80F84P6HPN
  - 铜质鳞片逐击荆棘 — 3荆棘按实际攻击次数与行动伤分账 — 支持7局、反例0 — PU80F84P6HPN
  - 蟹朝向及剩余预算 — 转向57→38仍超过现血和挡 — 支持12局、反例0 — PU80F84P6HPN
  - 计划妥当保留与兑现 — 保留不等于施放或满足毒条件 — 支持2局、反例0 — 1HC609GTLGN3、PU80F84P6HPN
  - 巨兽双结束线与SL — 本体归零仍须过自爆，舍挡胜因未受控 — 支持15局、反例0 — PU80F84P6HPN
  - 构筑兑现观察 — 持有、建立、触发分账，不由败局认构筑必输 — 支持54局、反例0 — PU80F84P6HPN
- 改了的手写知识：无
- 测试：源 tsc 0；vitest 203文件/2194用例/0（校正n文字后完整重跑通过）；合后 tsc 0、vitest 204文件/2203用例/0
- 切片大小：配对增量中位 +46 字；最大6346→6260字
- 学习账本：新增无；改成 proposed silent-0005,silent-0006,silent-0017,silent-0018,silent-0019,silent-0020,silent-0021,silent-0057,silent-0007,silent-0011,silent-0027,silent-0030,silent-0046,silent-0049,silent-0024,silent-0065,silent-0107,silent-0129,silent-0187,silent-0188；退役无；ledger.py check 0
- 需要 Dai 定的事：无

```json
{"task": "experience-update", "version": "2026-10-06.22", "commit": "0723092c1d575122896945935e5b55d89983c57d", "merged": "a95d92ecee0152abcb433b00b3aa0305d3fa2e43", "added": 1, "updated": 17, "retired": 0, "active": 122, "mechanisms": ["复制返还与五轮书回血", "敏捷逐后续挡牌", "力量与虚弱/脆弱", "金刚杵开场力量", "触媒建立与毒触发", "铜质鳞片逐击荆棘", "蟹朝向及剩余预算", "计划妥当保留与兑现", "巨兽双结束线与SL", "构筑兑现观察"], "tests": {"tsc": 0, "vitest": 0, "cases": 2203}, "ledger": {"added": [], "proposed": ["silent-0005", "silent-0006", "silent-0017", "silent-0018", "silent-0019", "silent-0020", "silent-0021", "silent-0057", "silent-0007", "silent-0011", "silent-0027", "silent-0030", "silent-0046", "silent-0049", "silent-0024", "silent-0065", "silent-0107", "silent-0129", "silent-0187", "silent-0188"], "retired": [], "check": 0}}
```
