# 复核与提案补充

复盘MTQ0EUBJ3R6T已追加，关键数字再次从原logs/states.jsonl按局号流式rg核对：26个关键帧、424条本局决策，死亡前2血/0挡/13攻击，结算后敌29血，首末决策间1192秒；verification.json记录0错误。

已按只追加规则纠正复盘记录：“keeps the most HP (-11)”是预计剩余血量，2−13＝−11，与实际死亡一致，不是损11、不是独立漏算2血。决策未给出动作伤害20，该项改为未记录。原初稿及已追加原句保留，勘误位于同局小节后。

proposal-guard.md限制段的“13轮摘要”为文字误写，应为“SL回合摘要”；本局末次SL为5轮，前三试各T6截断。该句不提供额外13轮证据。原提案Markdown及CLI指纹保持，补充由ledger.py链接至silent-0125，实施时以原states/decisions/sl-attempts和此说明为准。

本局没有新纯bug，没有新增mechanic独立发现。三个主要经验更新silent-0079（repeat）、silent-0125/silent-0019（support）；其余10项是已有机制的support，不改旧claim、首证、prior或上线状态。提案均pending，未实现、未上线；报告不声称它们已经修复。
