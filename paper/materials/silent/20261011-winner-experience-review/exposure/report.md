# 首个 A10 胜局：经验读取和实际决策核查

核查时间：2026-10-11T00:39:04+08:00。局号 `7S8HCC0M6G9W`。

本局在20:51开局时实际使用经验版本2026-10-10.8。51次已接受Codex问答均使用full知识前缀16b34215caf4、系统摘要4c5fda6fcce5；每次实际客户端instructions SHA均匹配。该运行Git提交经验文件含四条已上线核心组合经验，与发布原件相同，经验文件不在当时dirty列表中，四条均适用A10。

这些证据支持四核心已经进入本局可用知识。原日志不保存全量system文本，故这里保留版本/blob、渲染机制、运行摘要与实际客户端摘要链，不冒称获得完整原始prompt快照。

实际答案没有显式引用四核心ID；下列决策明确围绕毒防、抽牌、留费、拒绝边际牌展开，是与经验方向一致的实际采用行为，但旧经验/题面也含重叠信息，无法证明独立由某条新经验引发，更不能把单局胜利因果归于新经验。

## 最新综合经验的状态

核查时 live 仍为 2026-10-10.8 / 208 条，字节与本局开局commit经验blob相同。0374（牌组规模）、0376（能量/核心循环）、0385（有限回合输出）的唯一入库请求 `roy-20261010-silent-core-reuse-experience-integration` 状态仍为 `pending`、batch=None；尚未成为新的综合生产经验。本局不能作为这些待入库综合结论已经生效的证据。

## 实际大脑决策原文

### F14 shop/plan / mv2e83du-217951-15

UTC 2026-10-10T13:01:54.317Z；brain.jsonl 字节偏移 387038172，长度 34319，SHA256 a42df203b878da8e4ed97867bb1242827beb4ed104f34102242a4620b3a44dc5。

```json
{
  "plan": [
    "buy_card2",
    "buy_card0"
  ],
  "reason": "Backflip+ improves defensive cycling and finds poison components. Predator adds needed damage and next-turn draw. Both strengthen the deck long-term for 75 gold."
}
```

### F24 reward/card / mv2e83du-217951-25

UTC 2026-10-10T13:10:53.921Z；brain.jsonl 字节偏移 387393918，长度 30837，SHA256 caf215a8e14b0b96d53cd42416278b063eccec3c234d4e17a42709a16052d7cc。

```json
{
  "choice": "skip",
  "reason": "Preserve poison consistency in this 31-card deck. Extra setup or unscaled shivs dilute key draws; all additions worsen boss simulations."
}
```

### F27 reward/card / mv2e83du-217951-27

UTC 2026-10-10T13:12:40.199Z；brain.jsonl 字节偏移 387485831，长度 36159，SHA256 8c501dc987655f280791840f13bb420aa4e742b6d209ce303bf6aab576fed653。

```json
{
  "choice": "skip",
  "reason": "These rewards dilute a 31-card deck without improving its poison engine or defensive cycling. Prioritize healing and stronger draw.",
  "run_plan": {
    "archetype": "Accelerant poison with dexterity defense and reliable cycling",
    "want": [
      "NOXIOUS_FUMES",
      "BACKFLIP",
      "FOOTWORK",
      "PIERCING_WAIL",
      "CALCULATED_GAMBLE",
      "ACROBATICS"
    ],
    "avoid": [
      "GRAND_FINALE",
      "KNIFE_TRAP",
      "SHADOW_STEP",
      "LEADING_STRIKE",
      "SLICE",
      "FLICK_FLACK"
    ],
    "remove": [
      "STRIKE_SILENT",
      "LEADING_STRIKE",
      "DEFEND_SILENT"
    ],
    "block_target": 10,
    "elites": "avoid",
    "rest": "heal",
    "boss_prep": "Bring high HP, defensive potions, and gold for Golden Seal. Coordinate poison with Accelerant and Mirage; preserve energy for Frantic Escape.",
    "summary": "Heal at remaining fires and avoid the optional elite. Improve cycling to find poison and defense together. Add sustained poison and dexterity; remove weak attacks rather than adding marginal damage."
  }
}
```

### F34 event/act-plan / mv2e83du-217951-36

UTC 2026-10-10T13:18:10.935Z；brain.jsonl 字节偏移 387840820，长度 43091，SHA256 efb3ecdac6c6679d26f08a5ed5aeca668728009ce64d64d32ee594a3ce6daaed。

```json
{
  "choice": "o0",
  "reason": "巨额金币补强毒防，三火护航单精英。",
  "route": "r1c5 r2c6 r3c6 r4c6 r5c6 r6c6 r7c5 r8c5 r9c5 r10c5 r11c5 r12c5 r13c5 r14c3 r15c3",
  "run_plan": {
    "archetype": "Accelerant poison burst with dexterity defense and faster cycling",
    "want": [
      "BACKFLIP",
      "FOOTWORK",
      "PIERCING_WAIL",
      "CALCULATED_GAMBLE",
      "NOXIOUS_FUMES",
      "ACCELERANT"
    ],
    "avoid": [
      "GRAND_FINALE",
      "KNIFE_TRAP",
      "SHADOW_STEP",
      "LEADING_STRIKE",
      "SLICE",
      "FLICK_FLACK"
    ],
    "remove": [
      "STRIKE_SILENT",
      "LEADING_STRIKE",
      "SLICE"
    ],
    "block_target": 11,
    "elites": "avoid",
    "rest": "auto",
    "boss_prep": "Enter consecutive bosses healthy, with defensive potions and Lizard Tail intact. Preserve Golden Seal funding; establish poison, Accelerant, and reliable block quickly.",
    "summary": "Use the shop windfall for strong defensive relics, cycling, poison scaling, and removals—not marginal cards. Three campfires support the single unavoidable elite. Heal when needed; otherwise upgrade Footwork or key defense. Budget resources for both bosses."
  }
}
```

### F35 reward/card / mv2e83du-217951-37

UTC 2026-10-10T13:19:10.503Z；brain.jsonl 字节偏移 387883911，长度 48271，SHA256 5f9689f3cf2c91fd68a445f59357b2d9a2e3e033136bd66242740c3991e5b4ae。

```json
{
  "choice": "card2",
  "reason": "Piercing Wail+ supplies missing burst defense against multihits and groups, buying poison turns while preserving health and revival resources for consecutive bosses.",
  "route": "keep"
}
```

### F36 reward/card / mv2e83du-217951-38

UTC 2026-10-10T13:20:06.860Z；brain.jsonl 字节偏移 387932182，长度 49235，SHA256 a22e3caba78b3729295e057539a2984dc727d208f467b0a47cdfeafd65d29089。

```json
{
  "choice": "skip",
  "reason": "Unscaled shivs dilute the poison engine; conditional Bubble worsens paired boss progress. Preserve consistency and seek cycling at the shop.",
  "route": "keep"
}
```

### F38 reward/card / mv2e83du-217951-41

UTC 2026-10-10T13:22:04.400Z；brain.jsonl 字节偏移 388070226，长度 46758，SHA256 149e69f5cddf6a6a0e3b9c657b09e71ab9b7b3d50e9fcf9d5c3ff16b5be5b8d2。

```json
{
  "choice": "card1",
  "reason": "A second upgraded Wail provides efficient multihit protection, buying poison turns and preserving HP and Lizard Tail for consecutive bosses.",
  "route": "keep"
}
```

### F44 reward/card / mv2e83du-217951-46

UTC 2026-10-10T13:26:03.956Z；brain.jsonl 字节偏移 388325510，长度 43679，SHA256 bf63366d98cd1c53a6a2339a8ad4fe0606def191c049c84c56cfbc4f94470b2c。

```json
{
  "choice": "card1",
  "reason": "Adrenaline+ supplies free cycling and energy to establish poison scaling while maintaining defense, improving both boss fights without lasting deck dilution."
}
```

### F45 event/plan / mv2e83du-217951-47

UTC 2026-10-10T13:26:25.195Z；brain.jsonl 字节偏移 388369189，长度 56630，SHA256 677b7d7dd9c70e21c3cb7719a3b01e3d00e34284f291966efa23d4a6968d9ee9。

```json
{
  "choice": "o2:c17",
  "reason": "Footwork’s draw enchantment accelerates this oversized deck, finding poison and defensive cards while establishing dexterity for both consecutive bosses."
}
```

### F46 shop/plan / mv2e83du-217951-48

UTC 2026-10-10T13:27:02.086Z；brain.jsonl 字节偏移 388425819，长度 60618，SHA256 dfa6dbaa0995de9ae6124949ccad10fe3ab90cf68fe63f90791b0bb460698b4c。

```json
{
  "plan": [
    "buy_card3",
    "buy_card2",
    "buy_potion1"
  ],
  "reason": "Acrobatics accelerates setup; another Flask sustains Accelerant and Mirage. Gambler’s Brew rescues poor hands. Preserve 60 gold for Golden Seal across consecutive bosses."
}
```

### FNone run-plan / mv2e83du-217951-51

UTC 2026-10-10T13:29:49.457Z；brain.jsonl 字节偏移 388587808，长度 37426，SHA256 fe18c0aa2d1eb027b35752cf1352307a45012fe84739bc0b3d2afe22a1dd03ae。

```json
{
  "archetype": "Accelerant poison burst with fast setup and dexterity defense",
  "want": [
    "ACCELERANT",
    "ADRENALINE",
    "FOOTWORK",
    "NOXIOUS_FUMES",
    "BACKFLIP",
    "OUTBREAK"
  ],
  "avoid": [
    "GRAND_FINALE",
    "KNIFE_TRAP",
    "SHADOW_STEP",
    "LEADING_STRIKE",
    "SLICE",
    "FLICK_FLACK"
  ],
  "remove": [
    "STRIKE_SILENT",
    "DEFEND_SILENT",
    "LEADING_STRIKE"
  ],
  "block_target": 12,
  "elites": "avoid",
  "rest": "auto",
  "boss_prep": "Second boss unknown. Establish poison and Accelerant while defending. Check remaining revival availability; use the newly generated stone effectively. Budget Golden Seal gold.",
  "summary": "No recovery remains before the unknown second boss. Favor immediately useful scaling or free cycling at the reward. Rebuild powers without sacrificing critical defense; adapt to artifact, phase resets, and skill-triggered strength."
}
```
