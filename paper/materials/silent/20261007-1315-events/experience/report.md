## 经验库更新回报
- 版本：2026-10-07.17 → 2026-10-07.18；提交：908a2ddd93fbce59f9add60bd1b17c2fc2f1a53f（分支 exp-silent）；合入：未合入（7个刷新知识文件重叠，保留刷新提交070c5cf2，待运维兜底）
- 条数：新增0、更新9（加证据9、只改数字0）、退役0；active 139→139；总字符48947→48917；置信度高69/中45/低25；A8适用132条/45825字，A9适用133条/46109字
- 机制推理：
  - 力敏/吸取 — 现场力敏影响攻击与牌挡 — 86支持/0反例 — W7BHM8U02RKG 族母T7力/敏各−2
  - 触媒 — 增结算次数，每次减1毒 — 31支持/0反例 — W7BHM8U02RKG 族母T4结算13+12=25
  - 尖啸 — 当轮减力、次轮恢复 — 41支持/0反例 — W7BHM8U02RKG 族母T4单击21→15
  - 蛇咬 — 施毒不吃负力量 — 10支持/0反例 — W7BHM8U02RKG 族母T9负2力仍加7毒
  - 面包/古茶具 — 首轮与后轮能量分别核 — 面包2支持/0反例，茶具交互1局 — W7BHM8U02RKG F14首轮1、火后族母首轮3
  - 能力建立观察 — 计划与持有不等已建立 — 85支持/0反例 — W7BHM8U02RKG 族母触媒到T4或T8才建立
  - 族母/SL观察 — 吸取压缩攻防，同抽序不补缺口 — 12支持/0反例 — W7BHM8U02RKG 六试0胜，末轮差13血
- 改了的手写知识：无
- 测试：沙箱tsc退出0；vitest 224文件/2374用例/退出0，首轮通过
- 切片大小：整体中位+48字，配对增量中位−7字；最大5300字（原5307）
- 学习账本：新增无；改成proposed silent-0005,silent-0007,silent-0019,silent-0020,silent-0021,silent-0027,silent-0030,silent-0046,silent-0109,silent-0220；退役无；ledger.py check退出0
- 需要Dai定的事：无

```json
{"task": "experience-update", "version": "2026-10-07.18", "commit": "908a2ddd93fbce59f9add60bd1b17c2fc2f1a53f", "merged": null, "added": 0, "updated": 9, "retired": 0, "active": 139, "mechanisms": ["逐击力敏/吸取", "触媒多次结算", "尖啸临时减力", "蛇咬负力量施毒", "面包与古茶具时序", "能力实际建立观察", "族母毒/生存与SL观察"], "tests": {"tsc": 0, "vitest": 0, "cases": 2374}, "ledger": {"added": [], "proposed": ["silent-0005", "silent-0007", "silent-0019", "silent-0020", "silent-0021", "silent-0027", "silent-0030", "silent-0046", "silent-0109", "silent-0220"], "retired": [], "check": 0}}
```
