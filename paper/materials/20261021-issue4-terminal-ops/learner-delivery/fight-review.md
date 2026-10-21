# 53场逐场核查去向

每场均核原帧、原动作、冻结回放；后续机制归因均未闭合。原字节全SHA索引见source-index.jsonl。以下首次可行动T1为起手/能力对齐点，不把未就绪入房帧当可行动起手。

## 2Q6ZYZ6JHM0M-f8-fight5

角色silent A10，V5，实战commit 99737be9fdb9c2ea92089d768947c49b49b62382（dirty=True）；F8，fight5，BYGONE_EFFIGY。
入场HP48/70，常驻牌17；实际起手9，合成首抽5；遗物RING_OF_THE_SNAKE,BOOMING_CONCH。
首试结局died，净掉血48，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.9687499999999999，掉血47.96874999999999；真实开场状态computed，死亡率0.21875000000000008，掉血40.90625。
入房：logs/states.jsonl offset=13794105496 bytes=20078 SHA256=09aaa9b98c027e74f9baa004509dee8d4ed2a49e3bae874f393dd6d55cdb1135
T1可行动：logs/states.jsonl offset=13794125574 bytes=28093 SHA256=6179cbe4595991238383f70653dcef95a117edd326efc85639824ab8082e59af
首试末战斗帧：logs/states.jsonl offset=13795105574 bytes=23453 SHA256=59c633a7ed64d05748d661abb7cf7248341402458cb74d5654261c2eb22f53ce
终局/退出帧：logs/states.jsonl offset=13795129027 bytes=21646 SHA256=c9358a13a0ddc2cc5cc15bdc24f5b9183be1e5e49e0512badd224822b9cef123
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数8，回放抽数8。
T1实打ID集合：DAGGER_SPRAY,DEFEND_SILENT,FOOTWORK,HIDDEN_DAGGERS,SHIV
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态38条、动作36条；逐T1—T7投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## JKDUL0AL0TW6-f9-fight4

角色silent A10，V5，实战commit 99737be9fdb9c2ea92089d768947c49b49b62382（dirty=True）；F9，fight4，PHROG_PARASITE。
入场HP55/70，常驻牌22；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,SCROLL_BOXES,PETRIFIED_TOAD,BYRDPIP。
首试结局won，净掉血26，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.65625，掉血48.625；真实开场状态computed，死亡率0.03125，掉血25.468750000000007。
入房：logs/states.jsonl offset=13797031995 bytes=25643 SHA256=85ca2c17db5a8ed9e03a50b414cf784a3e9dab31cc7f46856f59ba5d88a0c4f7
T1可行动：logs/states.jsonl offset=13797057638 bytes=31823 SHA256=aefb730b443d16f7938accc8e8a396dc2f58baaaccd0674fdcfd1bcec6d20763
首试末战斗帧：logs/states.jsonl offset=13798357666 bytes=29881 SHA256=8b786601ff3f08f06c28fe82c9d4e8102548787da743c83e59e690162a60e157
终局/退出帧：logs/states.jsonl offset=13798387547 bytes=21388 SHA256=16e350ae6ff6d1799aa33482445a3ac07da2296cc29f9fe18b42ed0cba04366c
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数15，回放抽数15。
T1实打ID集合：DAGGER_THROW,ESCAPE_PLAN,POTION:POTION_SHAPED_ROCK,STRIKE_SILENT
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态55条、动作39条；逐T1—T10投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## JKDUL0AL0TW6-f15-fight6

角色silent A10，V5，实战commit 99737be9fdb9c2ea92089d768947c49b49b62382（dirty=True）；F15，fight6，BYGONE_EFFIGY。
入场HP62/70，常驻牌25；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,SCROLL_BOXES,PETRIFIED_TOAD,BYRDPIP,MOLTEN_EGG,RAZOR_TOOTH。
首试结局won，净掉血36，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0，掉血18.09375；真实开场状态computed，死亡率0，掉血9.499999999999998。
入房：logs/states.jsonl offset=13799586152 bytes=29289 SHA256=d9a656dacd478cf7daff9f1d53803361231050454e3e5b376292dd806bee9253
T1可行动：logs/states.jsonl offset=13799615441 bytes=35709 SHA256=a9792628191357b77882b11cd75576fd4f8a5122399e666c17f358e40a6d3db2
首试末战斗帧：logs/states.jsonl offset=13800213729 bytes=36225 SHA256=9c9d18a8331b86dd951ec002febeb2a5fa59b860a11763e97b6c5eb7b2964532
终局/退出帧：logs/states.jsonl offset=13800249954 bytes=24538 SHA256=ef1de42df256178cffc4dd3a00ca5b2ef18d0f52fb9d90cb95eee2b15675a03f
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数18，回放抽数18。
T1实打ID集合：POISONED_STAB,POTION:POTION_SHAPED_ROCK,STRIKE_SILENT
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 32}
核过原状态30条、动作19条；逐T1—T5投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 5H83F3J0XSTE-f9-fight5

角色silent A10，V5，实战commit dbd41616420f62e6502e9cb6c5827e852a6b4949（dirty=True）；F9，fight5，PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER。
入场HP63/70，常驻牌21；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,SCROLL_BOXES。
首试结局won，净掉血37，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.4375，掉血55.46875000000001；真实开场状态computed，死亡率0.12500000000000003，掉血45.781249999999986。
入房：logs/states.jsonl offset=13825728327 bytes=25845 SHA256=3232bc1a8e7305846bb7e2b9301fd56dec1a245fe220087ca2a027ae4bae6742
T1可行动：logs/states.jsonl offset=13825754172 bytes=32264 SHA256=8d94c479941380e7fce95cba2ace86e0329428e54308a5c314cb334524dc165b
首试末战斗帧：logs/states.jsonl offset=13827320396 bytes=27856 SHA256=f374f7c5b371837f7e4ec18f900be96dfebd84bbef9c5fedf9681ace57ac5ca0
终局/退出帧：logs/states.jsonl offset=13827348252 bytes=20375 SHA256=114870ad7e37cbb509564142d48609e16ae5463078e2bff3720f178956e2ec3d
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数14，回放抽数14。
T1实打ID集合：DEADLY_POISON,STRIKE_SILENT,SUCKER_PUNCH
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 32}
核过原状态79条、动作38条；逐T1—T9投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 25MFNPAE37R2-f8-fight6

角色silent A10，V5，实战commit 6fbbd82abd6d407dbaf93f82639b7f927efa54a0（dirty=True）；F8，fight6，PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER。
入场HP57/70，常驻牌18；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,POMANDER。
首试结局won，净掉血56，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.59375，掉血53.15625000000002；真实开场状态computed，死亡率0.6875000000000001，掉血55。
入房：logs/states.jsonl offset=13863848931 bytes=23124 SHA256=e00f7c331c5a8c39b96f966f931fca32751c3424c4fd4875221eb6d0732f3ed2
T1可行动：logs/states.jsonl offset=13863872055 bytes=29971 SHA256=2c87ace834c21ab38f6e59571adf17f8ab944872dc5cd437abc1a9afde0d2958
首试末战斗帧：logs/states.jsonl offset=13865387830 bytes=26473 SHA256=548f7d5b2b8053a7adff83255f040a36d7e289ab6de2d66e023b43a3a8478dcd
终局/退出帧：logs/states.jsonl offset=13865414303 bytes=18453 SHA256=74ecef7782ef2839c92ecb783a68ae890d6dc1aebd0e88036ab6c37bf692c0f8
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数11，回放抽数11。
T1实打ID集合：DEFEND_SILENT,NEUTRALIZE,STRIKE_SILENT,SURVIVOR
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 32}
核过原状态74条、动作40条；逐T1—T10投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 25MFNPAE37R2-f12-fight7

角色silent A10，V5，实战commit 6fbbd82abd6d407dbaf93f82639b7f927efa54a0（dirty=True）；F12，fight7，TERROR_EEL。
入场HP43/70，常驻牌19；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,POMANDER,PRAYER_WHEEL,JOSS_PAPER。
首试结局won，净掉血34，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.09375000000000001，掉血25.09375；真实开场状态computed，死亡率0.125，掉血29.65625。
入房：logs/states.jsonl offset=13865771264 bytes=22073 SHA256=ad23d642825bc714fdcd3be99db28a64d94c5a8c1f7f612b2a62624245f5522f
T1可行动：logs/states.jsonl offset=13865793337 bytes=28848 SHA256=656607ff401a12e95e3c0325dd3dae42c4265a9a1c6068bddf76bc8bfa95ea55
首试末战斗帧：logs/states.jsonl offset=13866655521 bytes=27054 SHA256=a995a0b2141d376e95f423519fafa510cd94dc096f20580f0ed9476fcea72a9f
终局/退出帧：logs/states.jsonl offset=13866682575 bytes=19687 SHA256=0dd8ac85987f3050a6986305f268334a6c45ed1d2fdfe0fe09746d4dc9b851be
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数12，回放抽数12。
T1实打ID集合：DEFEND_SILENT,NEUTRALIZE,STRIKE_SILENT
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态45条、动作32条；逐T1—T8投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 25MFNPAE37R2-f28-fight14

角色silent A10，V5，实战commit 6fbbd82abd6d407dbaf93f82639b7f927efa54a0（dirty=True）；F28，fight14，INFESTED_PRISM。
入场HP47/70，常驻牌25；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,POMANDER,PRAYER_WHEEL,JOSS_PAPER,FESTIVE_POPPER,SEAL_OF_GOLD,JUZU_BRACELET,ANCHOR。
首试结局won，净掉血24，SL记录0；去向observed_and_static_replay_verified。
合成死亡率1，掉血47；真实开场状态computed，死亡率1，掉血47。
入房：logs/states.jsonl offset=13872724042 bytes=28809 SHA256=6bba70d0c123214c24ee3098066354da759e6679e2cc2e289493480c1e4b0c82
T1可行动：logs/states.jsonl offset=13872752851 bytes=35206 SHA256=2b384a1972b88a20e5e11485250b3264f0907bfcfba657623c07d7dc3866af13
首试末战斗帧：logs/states.jsonl offset=13873870234 bytes=33060 SHA256=9e857a3b2ca75725d3ad6320713b5b8ee48cb0c23ade5c56ead49ab4df8c5d73
终局/退出帧：logs/states.jsonl offset=13873903294 bytes=24132 SHA256=a0460bf9bc165f14a2f7d4785d7597e257361ebff79a509c4136df451bb3b929
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数18，回放抽数18。
T1实打ID集合：DEFLECT,FLICK_FLACK,MALAISE
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态51条、动作35条；逐T1—T8投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 2PQK67ULZY90-f8-fight4

角色silent A10，V5，实战commit 5782a41c4b1db735e3eba8e769e0ad52c356f136（dirty=True）；F8，fight4，TERROR_EEL。
入场HP58/70，常驻牌18；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,LAVA_ROCK。
首试结局won，净掉血50，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.40625，掉血47.40625000000001；真实开场状态computed，死亡率0.06250000000000001，掉血38.93750000000001。
入房：logs/states.jsonl offset=13900229637 bytes=22384 SHA256=38c81909552781cb23bd9b6d7176ace9a3ebc39369b2410181fd69bda4bc9a0c
T1可行动：logs/states.jsonl offset=13900252021 bytes=28658 SHA256=bcc6a38711348714679a9a1dda5ad6b7f9054472ad2e5bbb1b1cdba340429688
首试末战斗帧：logs/states.jsonl offset=13901260989 bytes=27875 SHA256=27abd55008a90d811e2122dd48d120b2474f5554891e1925c241ccf92e0c0ff5
终局/退出帧：logs/states.jsonl offset=13901288864 bytes=19423 SHA256=46f35cf9f719c6d6d77bc3687b2b2dc4238eaa696b9a8e4df638a05456964b55
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数11，回放抽数11。
T1实打ID集合：DEFEND_SILENT,NEUTRALIZE,NOXIOUS_FUMES,SURVIVOR
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态68条、动作36条；逐T1—T8投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 2PQK67ULZY90-f27-fight10

角色silent A10，V5，实战commit 5782a41c4b1db735e3eba8e769e0ad52c356f136（dirty=True）；F27，fight10，DECIMILLIPEDE_SEGMENT_BACK+DECIMILLIPEDE_SEGMENT_FRONT+DECIMILLIPEDE_SEGMENT_MIDDLE。
入场HP71/80，常驻牌28；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,LAVA_ROCK,PEAR,REPTILE_TRINKET,ORNAMENTAL_FAN,SHURIKEN,NUTRITIOUS_SOUP,ETERNAL_FEATHER。
首试结局won，净掉血48，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.21874999999999997，掉血55.59375000000001；真实开场状态computed，死亡率0.34375，掉血57.3125。
入房：logs/states.jsonl offset=13908287972 bytes=36329 SHA256=5225a9754ab118edaeb064ad83385a55ef83c2156b29dc6a7d108bcf73ef0440
T1可行动：logs/states.jsonl offset=13908324301 bytes=42766 SHA256=5027d38aec2ac071eebc2254dad018e386086740e992de0dce66e8cb790f7eae
首试末战斗帧：logs/states.jsonl offset=13910055406 bytes=40833 SHA256=ad6fc48ee1a7a25028ebe2b4a5cb977cf5fe792ee404436af7c0425ef6f44530
终局/退出帧：logs/states.jsonl offset=13910096239 bytes=30739 SHA256=8cc96267be1b398e23f08a8dfff032d8f52683ac366090009984beecbf85ef2f
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数21，回放抽数21。
T1实打ID集合：IMPERVIOUS,STRIKE_SILENT
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态51条、动作41条；逐T1—T8投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## J2VR2DFJG8K4-f8-fight4

角色silent A10，V5，实战commit 7b61eaa636148221cbfc166067662e481ac7e0a7（dirty=True）；F8，fight4，SKULKING_COLONY。
入场HP57/70，常驻牌18；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,SCROLL_BOXES。
首试结局won，净掉血27，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0，掉血27；真实开场状态computed，死亡率0，掉血21.40625。
入房：logs/states.jsonl offset=13932962300 bytes=21627 SHA256=03dbf836e29f98ba77eb61aaad1a4d133d848bb90c1e88d8388c449003a763c8
T1可行动：logs/states.jsonl offset=13932983927 bytes=28229 SHA256=5a8bce174b5ecdea0572cc3be6d9d204d142fb1af78504b317386a1f8e82eef1
首试末战斗帧：logs/states.jsonl offset=13933464642 bytes=26816 SHA256=e7303399a3bf423c18b8c0154d0d9be6954461a61295602a01f476a64b3737a8
终局/退出帧：logs/states.jsonl offset=13933491458 bytes=18972 SHA256=1d507f23c5a57b97baab9a0f8331cefb050837a968d06b2f01a9472a06bcf1cb
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数11，回放抽数11。
T1实打ID集合：HIDDEN_DAGGERS,SHIV,STRIKE_SILENT
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态40条、动作17条；逐T1—T4投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## J2VR2DFJG8K4-f13-fight5

角色silent A10，V5，实战commit 7b61eaa636148221cbfc166067662e481ac7e0a7（dirty=True）；F13，fight5，PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER。
入场HP66/70，常驻牌20；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,SCROLL_BOXES,REGAL_PILLOW,SHOVEL,AKABEKO。
首试结局won，净掉血19，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0，掉血37.46875；真实开场状态computed，死亡率0，掉血27.874999999999996。
入房：logs/states.jsonl offset=13934001937 bytes=26605 SHA256=bd06d728b14b4f32576cf6083a5e46f8185e63c8ab8cc1229d6e0ce17bb78e55
T1可行动：logs/states.jsonl offset=13934028542 bytes=33211 SHA256=896495d0966a1d3bba039f0b01e08b91856ab85e799374ae761fb6a10f892614
首试末战斗帧：logs/states.jsonl offset=13935384298 bytes=27549 SHA256=85164d8efb60f9699f7876c95a2cf27e95314f2d917dc7efb907789fbfec5962
终局/退出帧：logs/states.jsonl offset=13935411847 bytes=20755 SHA256=5ba7cc410e8833a055b503344e8851b91f598d799921d3a866297191e00f85f2
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数13，回放抽数13。
T1实打ID集合：HIDDEN_DAGGERS,LEADING_STRIKE,SHIV,STRIKE_SILENT,SURVIVOR
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态49条、动作30条；逐T1—T6投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## S5GZG328S1LN-f28-fight14

角色silent A10，V5，实战commit 158d91006fcf0de9d1c487af7777358bfc584a5e（dirty=True）；F28，fight14，DECIMILLIPEDE_SEGMENT_BACK+DECIMILLIPEDE_SEGMENT_FRONT+DECIMILLIPEDE_SEGMENT_MIDDLE。
入场HP54/81，常驻牌26；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,LAVA_ROCK,CHOSEN_CHEESE,HAPPY_FLOWER,TINY_MAILBOX,VAMBRACE,PAELS_FLESH,ODDLY_SMOOTH_STONE,WHITE_BEAST_STATUE。
首试结局died，净掉血54，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.31250000000000006，掉血47.37500000000001；真实开场状态computed，死亡率0.5937499999999999，掉血50.812499999999986。
入房：logs/states.jsonl offset=13955487302 bytes=32311 SHA256=c5ad185808a3fe2bd2c9ea68c1a0692e39bd743e6cc89c13d33289f8765bf929
T1可行动：logs/states.jsonl offset=13955519613 bytes=39322 SHA256=58634dbc17104772e903e1b1e7db68b9a653fd4f57b852f298bab8583f0cb955
首试末战斗帧：logs/states.jsonl offset=13956580732 bytes=35471 SHA256=9bc891ebee8093c5ad3455ce6d231e7573abbed10de6aa0dd100568635b6abd9
终局/退出帧：logs/states.jsonl offset=13956616203 bytes=34793 SHA256=def322ea628be6f1d0a3b9bf01960ed6886fd994b79aa602b3831e8510d70237
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数19，回放抽数19。
T1实打ID集合：ASSASSINATE,DEFEND_SILENT,PIERCING_WAIL,POTION:WEAK_POTION,STRIKE_SILENT
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态32条、动作30条；逐T1—T6投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 4JS3T2UNKPVM-f8-fight5

角色silent A10，V5，实战commit 3910f41b9c3784a70362f63aad5f0994794c68b7（dirty=True）；F8，fight5，TERROR_EEL。
入场HP67/76，常驻牌20；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,SCROLL_BOXES。
首试结局won，净掉血14，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0，掉血26.406249999999996；真实开场状态computed，死亡率0，掉血18.90625。
入房：logs/states.jsonl offset=13959110701 bytes=23966 SHA256=96676eaffb6215d9134b7397dac9d1c59097f895d19763048a76dda0d6210f0b
T1可行动：logs/states.jsonl offset=13959134667 bytes=30664 SHA256=06d5c4dfbffe40f34b05126ce8e24f457f1e9f824529396e440d2b5af56b28ed
首试末战斗帧：logs/states.jsonl offset=13959806636 bytes=28512 SHA256=ab5f8146847c1f8f3ca7d8f0e212aaf28808c960b761cb5a2dc6dba80edfc185
终局/退出帧：logs/states.jsonl offset=13959835148 bytes=20364 SHA256=963b9bfbcb06e2b40f61a6309bd17f6e431208659a759e854e2bf4da54522193
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数13，回放抽数13。
T1实打ID集合：CLOAK_AND_DAGGER,DEFEND_SILENT,NEUTRALIZE,POTION:POWER_POTION,POTION:VULNERABLE_POTION,SHIV,SPEEDSTER,STRIKE_SILENT
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态30条、动作23条；逐T1—T5投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## WQB3YYNTRB2L-f14-fight6

角色silent A10，V5，实战commit 6f2a20594536087c3453fa9076c5908cbec40e40（dirty=True）；F14，fight6，BYGONE_EFFIGY。
入场HP73/79，常驻牌19；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,GOLDEN_PEARL,MERCURY_HOURGLASS,CHOSEN_CHEESE,RED_MASK。
首试结局won，净掉血17，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0，掉血27.218750000000004；真实开场状态computed，死亡率0，掉血20.437500000000004。
入房：logs/states.jsonl offset=13971695534 bytes=23843 SHA256=339f14c565d2623f7f7480505b46a23ffbc5262d1754e39c1d2bab6ff3b82aae
T1可行动：logs/states.jsonl offset=13971719377 bytes=30728 SHA256=71fcf7507c8d117ca829f9ce287d1b06433273e0570642823601968b577b14ea
首试末战斗帧：logs/states.jsonl offset=13972604935 bytes=19499 SHA256=feb7ef0408da1e74baacde6bda376eb6094c500e3030ff0d399e1e47e17a3b56
终局/退出帧：logs/states.jsonl offset=13972624434 bytes=20414 SHA256=4ca684cff9ebb3214904d048f350644e8d29fd882ac674cbe704a472119135bc
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数12，回放抽数12。
T1实打ID集合：BACKFLIP,DAGGER_SPRAY,ECHOING_SLASH,HIDDEN_DAGGERS,POTION:FYSH_OIL,SHIV
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态34条、动作25条；逐T1—T5投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## BXU0CKWKH2RU-f9-fight4

角色silent A10，V5，实战commit 6f2a20594536087c3453fa9076c5908cbec40e40（dirty=True）；F9，fight4，BYGONE_EFFIGY。
入场HP54/70，常驻牌18；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,GOLDEN_PEARL,CHOSEN_CHEESE。
首试结局won，净掉血14，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0，掉血17.78125；真实开场状态computed，死亡率0，掉血18.968749999999993。
入房：logs/states.jsonl offset=13980298217 bytes=22100 SHA256=28e1db6ba804329b141bf428e2b7b3c73fc238e54aa1f91f399a5b305fc28d88
T1可行动：logs/states.jsonl offset=13980320317 bytes=29106 SHA256=eda76f667be3994b55f9b4803c425ea2fc6187a505b28ed77a1735263cd7ccd6
首试末战斗帧：logs/states.jsonl offset=13980922612 bytes=18225 SHA256=547dcd9238ec680a60890862ca0e693147335c8c6918d52900975f8456ead088
终局/退出帧：logs/states.jsonl offset=13980940837 bytes=19128 SHA256=7ed98f17161a3e629a673c6058fc873b1c32239003075a634e3015e55a7ad706
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数11，回放抽数11。
T1实打ID集合：DEFEND_SILENT,ECHOING_SLASH,NEUTRALIZE,POTION:STRENGTH_POTION,PRECISE_CUT,STRIKE_SILENT
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态43条、动作21条；逐T1—T4投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## BXU0CKWKH2RU-f15-fight6

角色silent A10，V5，实战commit 6f2a20594536087c3453fa9076c5908cbec40e40（dirty=True）；F15，fight6，PHROG_PARASITE。
入场HP64/72，常驻牌20；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,GOLDEN_PEARL,CHOSEN_CHEESE,JOSS_PAPER,ETERNAL_FEATHER,LIZARD_TAIL。
首试结局won，净掉血24，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.03125，掉血54.125；真实开场状态computed，死亡率0，掉血16.5。
入房：logs/states.jsonl offset=13982387320 bytes=24906 SHA256=8a722fc4673085bcd7039b052c8d26ed3b53c40be7f3304c572f62a7f901a66d
T1可行动：logs/states.jsonl offset=13982412226 bytes=31630 SHA256=bf0e4a71065bc5800dd13a5a6955b26e4333583753e2d828346a889a331e0c1c
首试末战斗帧：logs/states.jsonl offset=13983276160 bytes=20841 SHA256=280d37b07499fe21aa597bf7a51bd84bb73115d48bd0686247eeb1b3cd22f8f1
终局/退出帧：logs/states.jsonl offset=13983297001 bytes=21744 SHA256=f76ce69a21cf41a546061015f986f987133dd381436d3c22c86169832e0b91e0
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数13，回放抽数13。
T1实打ID集合：NEUTRALIZE,SKEWER
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 32}
核过原状态40条、动作27条；逐T1—T7投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## BXU0CKWKH2RU-f46-fight20

角色silent A10，V5，实战commit 6f2a20594536087c3453fa9076c5908cbec40e40（dirty=True）；F46，fight20，SOUL_NEXUS。
入场HP73/84，常驻牌36；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,GOLDEN_PEARL,CHOSEN_CHEESE,JOSS_PAPER,ETERNAL_FEATHER,LIZARD_TAIL,MEAL_TICKET,NUTRITIOUS_SOUP,BLOOD_VIAL,STRIKE_DUMMY,THROWING_AXE,MOLTEN_EGG,ODDLY_SMOOTH_STONE,CHANDELIER。
首试结局won，净掉血20，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0，掉血50.84375；真实开场状态error，死亡率None，掉血None。
入房：logs/states.jsonl offset=14012490300 bytes=43873 SHA256=44d7b4e76006876bc6163dc949634bc76e7126e74d2652f9a61033a7c4374971
T1可行动：logs/states.jsonl offset=14012534173 bytes=50808 SHA256=dc49286a1fb96b8148c8e320e6e2fb1446d9dae763ed666ad228537c285a943e
首试末战斗帧：logs/states.jsonl offset=14014291566 bytes=35936 SHA256=9d03368605530589c7b2f39937460d11400cc54e2bba765e3d4314af13cafbd1
终局/退出帧：logs/states.jsonl offset=14014327502 bytes=36863 SHA256=f733736b131a62476c7bdc5a1e69dcfcc7436f2ad76a13aacd54bb7c25c90207
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=unknown/no-solve；原抽数unknown，回放抽数unknown。
T1实打ID集合：AFTERIMAGE,ASSASSINATE,NOXIOUS_FUMES,PIERCING_WAIL,POTION:HEART_OF_IRON,PRECISE_CUT,SKEWER
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态47条、动作33条；逐T1—T5投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 75DAD6GBWEU1-f11-fight5

角色silent A10，V5，实战commit b23506b242de724d2ab9c066927ddb0d70d3f706（dirty=True）；F11，fight5，PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER。
入场HP54/70，常驻牌19；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,GOLDEN_PEARL,ORNAMENTAL_FAN。
首试结局won，净掉血8，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0，掉血12.468750000000005；真实开场状态computed，死亡率0，掉血5.031250000000002。
入房：logs/states.jsonl offset=14062379567 bytes=25648 SHA256=f79069faa226f05614d2c7f2c0314587f948f171937dc28cf0e2955af2b245d9
T1可行动：logs/states.jsonl offset=14062405215 bytes=32133 SHA256=ca50477b6417a4e614d42bc1e031a2db6c47e7c35bc079d6a56efdf455812033
首试末战斗帧：logs/states.jsonl offset=14063286440 bytes=27683 SHA256=3f6534e836c46cd4009b785fdccbae79d910c5a5c2f4b4eaf261284d3d88d6a4
终局/退出帧：logs/states.jsonl offset=14063314123 bytes=19564 SHA256=2d3bb5d345f93eb475eb9cdef2faff6fd7052e339cec048a1178955d822aec3c
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数12，回放抽数12。
T1实打ID集合：DAGGER_SPRAY,NEUTRALIZE,POTION:RADIANT_TINCTURE,SLICE,SNAKEBITE,STRIKE_SILENT
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态38条、动作23条；逐T1—T5投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## W9610N90MMCT-f15-fight10

角色silent A10，V5，实战commit deb9135b8c8e63080beae091b959a04738c64587（dirty=True）；F15，fight10，BYRDONIS。
入场HP22/70，常驻牌22；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,GOLDEN_PEARL,GORGET。
首试结局won，净掉血16，SL记录0；去向observed_and_static_replay_verified。
合成死亡率1，掉血22；真实开场状态computed，死亡率0.25000000000000006，掉血15.218750000000002。
入房：logs/states.jsonl offset=14092984057 bytes=25307 SHA256=8848eaa0d7944e98591fb9c7406444113ac84bb3963de3394b92da17da8fba9f
T1可行动：logs/states.jsonl offset=14093009364 bytes=32301 SHA256=c3c582c773f8658f0fb7757af8a84b881c30c39f73c3a9e9a614bc492811b282
首试末战斗帧：logs/states.jsonl offset=14093854173 bytes=30438 SHA256=e2ecfceccf846f588b11b24910eebb1c5abd9c5849ff4f5d7562b04822a1a74f
终局/退出帧：logs/states.jsonl offset=14093884611 bytes=21093 SHA256=4d51e84caeee7d5ecf148f14f50f0e664f1a84c51d1acba126715f808c95b6c4
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数15，回放抽数15。
T1实打ID集合：CLOAK_AND_DAGGER,DEFLECT,POTION:SPEED_POTION,RICOCHET,SHIV
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态40条、动作30条；逐T1—T6投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## J5E7A3MS9NSH-f9-fight5

角色silent A10，V5，实战commit 017453260488d82709423fe76dbd1152d22de2c7（dirty=True）；F9，fight5，TERROR_EEL。
入场HP42/70，常驻牌18；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,NEOWS_TORMENT。
首试结局won，净掉血26，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.09375，掉血24.21875；真实开场状态computed，死亡率0.0625，掉血20.28125。
入房：logs/states.jsonl offset=14102935269 bytes=22785 SHA256=45b4498626ac0df67a87a4c9ec4c38b7155885860b8601ee927243cd7e33ee69
T1可行动：logs/states.jsonl offset=14102958054 bytes=29690 SHA256=9b7af0a45a715f80f2b8dfdf48fd0dce1c30717bc07024fdae99cd3a1df08b16
首试末战斗帧：logs/states.jsonl offset=14103678431 bytes=27534 SHA256=9bd35f72754f90a30871b0bef921314dae548091cfacac1a85e423d0b7d3be43
终局/退出帧：logs/states.jsonl offset=14103705965 bytes=19686 SHA256=cf92a00b76a8a263f8938f37f717ad824ca8c4f6114829aab0ed8cc1e824a0cb
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数11，回放抽数11。
T1实打ID集合：DEFEND_SILENT,MEMENTO_MORI,NEOWS_FURY,NEUTRALIZE,POTION:ENERGY_POTION,POTION:STRENGTH_POTION,STRIKE_SILENT,SURVIVOR
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 22}
核过原状态49条、动作26条；逐T1—T6投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 0NMF36KX3F7Y-f9-fight5

角色silent A10，V5，实战commit bbc7cfcca32bcf303324c10d540b348b912418a0（dirty=True）；F9，fight5，BYRDONIS。
入场HP56/70，常驻牌19；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,PHIAL_HOLSTER。
首试结局won，净掉血36，SL记录0；去向observed_and_static_replay_verified。
合成死亡率1，掉血56；真实开场状态computed，死亡率0.5625000000000002，掉血53.21875。
入房：logs/states.jsonl offset=14114935978 bytes=23687 SHA256=2fae35a96c10397371219666e7f1af45a796259465971c7737c22a755e7f9a64
T1可行动：logs/states.jsonl offset=14114959665 bytes=30299 SHA256=6b4e898c22862a17b71e43fad9bb43c2d99adf05967d21c55ddbdbeb60db6719
首试末战斗帧：logs/states.jsonl offset=14115567202 bytes=29295 SHA256=8e1ca5408bf30faf0d27a5b51d0a53e840ca7b795df81b4a8b28dde12ab626bb
终局/退出帧：logs/states.jsonl offset=14115596497 bytes=20454 SHA256=c0486894e8bc22a547e4249f288b4d2ba3596d5320a0d31393e01d86a5d94d0b
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数12，回放抽数12。
T1实打ID集合：DEFEND_SILENT,NEUTRALIZE,PIERCING_WAIL,POISONED_STAB,POTION:SHIP_IN_A_BOTTLE
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态37条、动作22条；逐T1—T6投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## U6JELGQTBMHN-f8-fight5

角色silent A10，V5，实战commit 090b64ebfb29cb5ca48392ae91e2d5543964855f（dirty=True）；F8，fight5，PHROG_PARASITE。
入场HP48/75，常驻牌18；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,STONE_HUMIDIFIER。
首试结局won，净掉血9，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.7812500000000002，掉血46.1875；真实开场状态computed，死亡率0.06250000000000001，掉血16.062499999999996。
入房：logs/states.jsonl offset=14141192474 bytes=21206 SHA256=4c8e442cfefcab47845ed3bf385c2221aa1d5ae9e7aa9bdce2764b965f888fc9
T1可行动：logs/states.jsonl offset=14141213680 bytes=27529 SHA256=bb42b343ce78af12aaad371fca2ee485772bfe2bd4874d42264b060fa91acbe2
首试末战斗帧：logs/states.jsonl offset=14141859548 bytes=26432 SHA256=7d1902c0dcc87d64c1a4001cc94a267b8875fb9614cee53725dd3b119c472486
终局/退出帧：logs/states.jsonl offset=14141885980 bytes=18651 SHA256=66e6800b3adf0bf80422eb6abd0a59ae53e5ceab35765c7eb1d575003a8151d1
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数11，回放抽数11。
T1实打ID集合：DAGGER_SPRAY,POTION:STRENGTH_POTION,SLICE,STRIKE_SILENT
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 1, 'actual-opening': 32}
核过原状态33条、动作24条；逐T1—T6投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## U6JELGQTBMHN-f28-fight14

角色silent A10，V5，实战commit 090b64ebfb29cb5ca48392ae91e2d5543964855f（dirty=True）；F28，fight14，DECIMILLIPEDE_SEGMENT_BACK+DECIMILLIPEDE_SEGMENT_FRONT+DECIMILLIPEDE_SEGMENT_MIDDLE。
入场HP82/102，常驻牌28；实际起手9，合成首抽7；遗物RING_OF_THE_SNAKE,STONE_HUMIDIFIER,STRAWBERRY,MINIATURE_CANNON,YUMMY_COOKIE,POLLINOUS_CORE,BAG_OF_PREPARATION。
首试结局died，净掉血82，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.8125000000000002，掉血78.75；真实开场状态computed，死亡率0.8437499999999999，掉血80.93749999999997。
入房：logs/states.jsonl offset=14150956509 bytes=34499 SHA256=57b755fa71226f8c58de0cc3c9e723f7797762d7d88fcff099d884e4cff3c075
T1可行动：logs/states.jsonl offset=14150991008 bytes=42749 SHA256=703cdb13f3a078d5298f8548a3033305516e9f08a5e86c4a6cba7887336c6192
首试末战斗帧：logs/states.jsonl offset=14152361110 bytes=36554 SHA256=6e438a4a7367cf7c364d456d597921409b3d8dad3ec70e4eca3ecaeaee949064
终局/退出帧：logs/states.jsonl offset=14152397664 bytes=35721 SHA256=3fb1fcc5937e303a02122817b5dc51276cc96f33acdb9079e83fcfd6656cc5cd
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数19，回放抽数19。
T1实打ID集合：CLOAK_AND_DAGGER,LEG_SWEEP,SHIV,SLICE
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态37条、动作35条；逐T1—T7投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 9W38TRGPJW9Q-f8-fight4

角色silent A10，V5，实战commit f7abb0e13d3ee0943637be2146ca52ee25486289（dirty=True）；F8，fight4，BYRDONIS。
入场HP59/70，常驻牌20；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,LEAD_PAPERWEIGHT。
首试结局won，净掉血15，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.21875000000000003，掉血41.53125；真实开场状态computed，死亡率0，掉血6.531249999999999。
入房：logs/states.jsonl offset=14154506921 bytes=24178 SHA256=1b421650dca54a9e0e0e4f475ca8e1f5f475da38a6c57f4665b971ad1470fe83
T1可行动：logs/states.jsonl offset=14154531099 bytes=30844 SHA256=1fcf43936ce56dae15338e7791d8d7ebdf47a8de08349bfff5b5cc3732d818d9
首试末战斗帧：logs/states.jsonl offset=14155382663 bytes=26053 SHA256=1639b7996d471de15ced3f2f86f88216ae00dbcefb94fbeaa808fe7c89f76764
终局/退出帧：logs/states.jsonl offset=14155408716 bytes=20438 SHA256=2366dbf38e5b0983f88b8544ef2d22250ab7d56ee019518b44c193e124519609
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数13，回放抽数13。
T1实打ID集合：DAGGER_THROW,DEFEND_SILENT,MIND_BLAST,POTION:HEART_OF_IRON,POTION:WEAK_POTION
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 32}
核过原状态35条、动作28条；逐T1—T6投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 9W38TRGPJW9Q-f13-fight7

角色silent A10，V5，实战commit f7abb0e13d3ee0943637be2146ca52ee25486289（dirty=True）；F13，fight7，BYGONE_EFFIGY。
入场HP59/70，常驻牌22；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,LEAD_PAPERWEIGHT,GAME_PIECE,AMETHYST_AUBERGINE。
首试结局won，净掉血25，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0，掉血31.21875；真实开场状态computed，死亡率0，掉血25.187499999999996。
入房：logs/states.jsonl offset=14157098622 bytes=26218 SHA256=aebe58c67ee785d86588491b16cab93b0b92f16b74aba5b1787d5c651a41a1f4
T1可行动：logs/states.jsonl offset=14157124840 bytes=33398 SHA256=1a0a6a18387381e07e0f86ab5ae4a81d318101001d02852dc294e78de7a150e7
首试末战斗帧：logs/states.jsonl offset=14157702852 bytes=29047 SHA256=cc77802c5ac3f53c02f7aff90047b0f02e9a7d734eba0d2cf112daed85b159c8
终局/退出帧：logs/states.jsonl offset=14157731899 bytes=22671 SHA256=4aa6d3ed2ec96c3d83f983b38ccb0e2a65f6598b65a3388ff7aa5b686fb71375
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数15，回放抽数15。
T1实打ID集合：DEFEND_SILENT,MIND_BLAST,NOXIOUS_FUMES,POTION:STRENGTH_POTION,PRECISE_CUT
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 23}
核过原状态32条、动作19条；逐T1—T4投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## NRZAYVRMM7M0-f11-fight5

角色silent A10，V5，实战commit ee57b0c8aa773a7303d404eb98f8a1a03a5c66b8（dirty=True）；F11，fight5，BYGONE_EFFIGY。
入场HP61/72，常驻牌19；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,FISHING_ROD,CHOSEN_CHEESE。
首试结局won，净掉血43，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.06250000000000001，掉血48.125；真实开场状态computed，死亡率0.09375000000000001，掉血46.0625。
入房：logs/states.jsonl offset=14171202276 bytes=22612 SHA256=7b7b039efbd89ce1fb32af8254e968f1d1fbe28da37a7dc20b36abfca693ee66
T1可行动：logs/states.jsonl offset=14171224888 bytes=29359 SHA256=280e70d4c7da55dc2e415b638fb5a913a5b46d8cd4a07841bbc99e100e8ae07e
首试末战斗帧：logs/states.jsonl offset=14172015564 bytes=18793 SHA256=d7d32b62b37fb23264eeef000a0f2bbdd2c5bde6dc5470b8bd9dd68700c1e55a
终局/退出帧：logs/states.jsonl offset=14172034357 bytes=19564 SHA256=069b63408a22bc489e96f126224beab21d5aa079386c715d065a7fdc00dd8282
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数12，回放抽数12。
T1实打ID集合：NEUTRALIZE,STRIKE_SILENT
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 32}
核过原状态37条、动作29条；逐T1—T7投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## KCA04Q3SEYTF-f8-fight4

角色silent A10，V5，实战commit 58eaab9e8062c466efff21cbc1cd18662d75896b（dirty=True）；F8，fight4，SKULKING_COLONY。
入场HP59/80，常驻牌21；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,SCROLL_BOXES。
首试结局won，净掉血23，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0，掉血25.562499999999996；真实开场状态computed，死亡率0，掉血21.5625。
入房：logs/states.jsonl offset=14182471115 bytes=23293 SHA256=4711ece83bd0c52935e94ad45104dd86709fccc1943247d30dde7057551917f5
T1可行动：logs/states.jsonl offset=14182494408 bytes=29847 SHA256=948271d926560080554eb17d81e431a68fe6835a9704ee91ec73a6546ce67bcd
首试末战斗帧：logs/states.jsonl offset=14183303456 bytes=27356 SHA256=74633e39b10ba864b04d02cc585c57b185bda122e23985c847f996bf9516159e
终局/退出帧：logs/states.jsonl offset=14183330812 bytes=20266 SHA256=00b6aa7cd0b850524e166f63fe9575c8eddcb4c7c046c7b12f75299203bad6ac
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数14，回放抽数14。
T1实打ID集合：DEFEND_SILENT,DRAMATIC_ENTRANCE,SLICE,SURVIVOR
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 2}
核过原状态44条、动作28条；逐T1—T6投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## KCA04Q3SEYTF-f14-fight6

角色silent A10，V5，实战commit 58eaab9e8062c466efff21cbc1cd18662d75896b（dirty=True）；F14，fight6，PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER。
入场HP44/80，常驻牌22；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,SCROLL_BOXES,JUZU_BRACELET,BRONZE_SCALES,SWORD_OF_STONE。
首试结局won，净掉血5，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0，掉血6.156250000000001；真实开场状态computed，死亡率0，掉血5.281249999999999。
入房：logs/states.jsonl offset=14184604625 bytes=27514 SHA256=cfa38a8c71760c8cc09ce61ff6cbb12dea8ae0b5bb936d7bc2684dba6a143f80
T1可行动：logs/states.jsonl offset=14184632139 bytes=34407 SHA256=8d4e1f44b5151b7c5a91b9612f5afdffebf237507030e761f2db82969672d2c2
首试末战斗帧：logs/states.jsonl offset=14185412346 bytes=29792 SHA256=9d8fd38abac5343b17b03f1fdc9cb27eaab8a8e5236093df3c4422246c5ea9e4
终局/退出帧：logs/states.jsonl offset=14185442138 bytes=21845 SHA256=0bc7f30f68b35a26b4130df9de0d6c116d8c8f809c4f8fbde2e7be81d8724c5b
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数15，回放抽数15。
T1实打ID集合：BACKFLIP,DEFEND_SILENT,DRAMATIC_ENTRANCE,POTION:ENERGY_POTION,STRIKE_SILENT,SUCKER_PUNCH
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 1, 'actual-opening': 12}
核过原状态31条、动作18条；逐T1—T4投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## KRLPMR0FWVZE-f8-fight5

角色silent A10，V5，实战commit adbdcb0a92e98a64a3f96bfe7faddf60642ab05a（dirty=True）；F8，fight5，SKULKING_COLONY。
入场HP43/70，常驻牌17；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,LAVA_ROCK。
首试结局won，净掉血37，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.15625，掉血37.21875000000001；真实开场状态computed，死亡率0.12500000000000003，掉血36.6875。
入房：logs/states.jsonl offset=14213381118 bytes=20714 SHA256=699e6397a65c902a1fdb2e57396a5f14a8c109e914719aabc92ce604a02fda06
T1可行动：logs/states.jsonl offset=14213401832 bytes=27555 SHA256=9a8f8dc992e8d74909259fb5d987fc92e93b681cfb81f36da0adad058e0aa404
首试末战斗帧：logs/states.jsonl offset=14214480302 bytes=26037 SHA256=558548556c5a35796e364b59ac694f9deac741c7cad1e9fc7ec55684af1106ac
终局/退出帧：logs/states.jsonl offset=14214506339 bytes=18092 SHA256=2f6c08b87f02e27437574d792bbbb061aa3753ab0e8c480e98bc76ec3eabdbcd
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数10，回放抽数10。
T1实打ID集合：DEFEND_SILENT,PIERCING_WAIL
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 3, 'actual-opening': 0}
核过原状态62条、动作41条；逐T1—T9投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## Q9KFP3J3JNU5-f9-fight5

角色silent A10，V5，实战commit cacff7cd8e8013d95aca4dffa8e791a0c3f60df1（dirty=True）；F9，fight5，BYGONE_EFFIGY。
入场HP65/70，常驻牌19；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,PHIAL_HOLSTER。
首试结局won，净掉血47，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.03125，掉血51.96874999999999；真实开场状态computed，死亡率0.03125000000000001，掉血49.687500000000014。
入房：logs/states.jsonl offset=14236316598 bytes=22952 SHA256=7921cc7e8df2aa8904e5e6314ea06c60b202a5095d1c47b8fb7c2c19e2f1db82
T1可行动：logs/states.jsonl offset=14236339550 bytes=29492 SHA256=0009c64d6eb34c2e99742c4ee6614d16a84f902c20d2aea85978aa1f4502f527
首试末战斗帧：logs/states.jsonl offset=14237587424 bytes=25623 SHA256=bfba95cebe8bb829f68baac6e678ad0228e5329883758ba57fa1fba351dc9b13
终局/退出帧：logs/states.jsonl offset=14237613047 bytes=19800 SHA256=a7dcb65bf871a02022a282b8ec39bb66671953b3b0be314eb01a2e30930f57c2
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数12，回放抽数12。
T1实打ID集合：ANTICIPATE,SLICE,STRIKE_SILENT,SUCKER_PUNCH
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 32}
核过原状态60条、动作46条；逐T1—T10投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## Q9KFP3J3JNU5-f28-fight14

角色silent A10，V5，实战commit cacff7cd8e8013d95aca4dffa8e791a0c3f60df1（dirty=True）；F28，fight14，DECIMILLIPEDE_SEGMENT_BACK+DECIMILLIPEDE_SEGMENT_FRONT+DECIMILLIPEDE_SEGMENT_MIDDLE。
入场HP70/70，常驻牌31；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,PHIAL_HOLSTER,FESTIVE_POPPER,MEAL_TICKET,NUTRITIOUS_SOUP,ODDLY_SMOOTH_STONE。
首试结局won，净掉血24，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0，掉血39.25；真实开场状态computed，死亡率0，掉血24.531249999999996。
入房：logs/states.jsonl offset=14244979470 bytes=37030 SHA256=2de99b11a8b9ed503bd706abf445baa2659ae3e0b3eca4de242ad05bf583a974
T1可行动：logs/states.jsonl offset=14245016500 bytes=43176 SHA256=6f5d5a232f935136f54e6ee47939f9ba19148295f4704e4d98d6766fd39612e7
首试末战斗帧：logs/states.jsonl offset=14245692691 bytes=42330 SHA256=01750b3f7337f0d15424d345c77b9249ac6f7bd7c3dea74e943cb672b2dd79f0
终局/退出帧：logs/states.jsonl offset=14245735021 bytes=31503 SHA256=ef52770c11aba3d0a901071eda2e0ecd519f7fd6aef964d61c1a236859586af8
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数24，回放抽数24。
T1实打ID集合：ACCELERANT,BACKSTAB,FINESSE,NOXIOUS_FUMES,PIERCING_WAIL
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 1}
核过原状态29条、动作17条；逐T1—T4投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## ET1QAZCV8GUP-f9-fight4

角色silent A10，V5，实战commit b155d00a36080418149e63d2f21b491d34d7f40a（dirty=True）；F9，fight4，PHROG_PARASITE。
入场HP46/62，常驻牌21；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,SCROLL_BOXES,BRONZE_SCALES。
首试结局won，净掉血4，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.6874999999999999，掉血43.71874999999999；真实开场状态computed，死亡率0，掉血20.812500000000007。
入房：logs/states.jsonl offset=14287814994 bytes=24506 SHA256=d5e09699d8279f1e6cc257731ee27a51bbd51985a5cdde9a8a0b957548b38d3d
T1可行动：logs/states.jsonl offset=14287839500 bytes=30795 SHA256=b4622465a1aeb30caece92f41cf74f007f199358cb33710f2d933b6c68db6469
首试末战斗帧：logs/states.jsonl offset=14288627952 bytes=29945 SHA256=1087a8ed75107b2db081ba389ed1a2affa38f79c804dd25eedd1565955e6dff3
终局/退出帧：logs/states.jsonl offset=14288657897 bytes=20832 SHA256=e6fc793496976edde0a4815b23ab8d0bebfc30cc0ce946349bc440d93a779a90
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数14，回放抽数14。
T1实打ID集合：DRAMATIC_ENTRANCE,ESCAPE_PLAN,POTION:DUPLICATOR,STRIKE_SILENT
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态41条、动作25条；逐T1—T7投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## ET1QAZCV8GUP-f31-fight11

角色silent A10，V5，实战commit b155d00a36080418149e63d2f21b491d34d7f40a（dirty=True）；F31，fight11，INFESTED_PRISM。
入场HP35/62，常驻牌28；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,SCROLL_BOXES,BRONZE_SCALES,JUZU_BRACELET,PAELS_FLESH,STONE_CRACKER,VAJRA,BONE_TEA。
首试结局won，净掉血22，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.9375，掉血34.687499999999986；真实开场状态computed，死亡率0.75，掉血33.718750000000014。
入房：logs/states.jsonl offset=14296011412 bytes=33319 SHA256=eccb8a3c16641484ec866efa04baa59b2608261e4c65b0a647984229761f2ece
T1可行动：logs/states.jsonl offset=14296044731 bytes=40115 SHA256=385cfbe3b57c560e59604cf56839725c288fe49c4b85e2a0551eea1614416ca2
首试末战斗帧：logs/states.jsonl offset=14297415505 bytes=36161 SHA256=705f2fa82a89e744816f0026dde717c6f39fb887ce6087d404208efb501a85d1
终局/退出帧：logs/states.jsonl offset=14297451666 bytes=26805 SHA256=125562c1409d762705f0f54615205f2ed2819fdc79b5d7f298e7877913b92cf3
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=False；原抽数21，回放抽数27。
T1实打ID集合：DRAMATIC_ENTRANCE,FLICK_FLACK,LEG_SWEEP,NEUTRALIZE,POTION:DEXTERITY_POTION
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态48条、动作37条；逐T1—T7投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 67AFTXLWVN4L-f14-fight8

角色silent A10，V5，实战commit b155d00a36080418149e63d2f21b491d34d7f40a（dirty=True）；F14，fight8，SKULKING_COLONY。
入场HP15/70，常驻牌25；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,SCROLL_BOXES,CHANDELIER。
首试结局won，净掉血2，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.28125000000000006，掉血11.343750000000002；真实开场状态computed，死亡率0，掉血3.15625。
入房：logs/states.jsonl offset=14310603740 bytes=28498 SHA256=6d79b5357914d7400b43e7ce738c1a384697b549353a167aaa8554b335b360ef
T1可行动：logs/states.jsonl offset=14310632238 bytes=35077 SHA256=99b965c530422a2b98f7bfcb21d80ac9cc745b9665c6eda7242cd118766cdafd
首试末战斗帧：logs/states.jsonl offset=14311151879 bytes=34352 SHA256=0200bf4bf7e73ef06cd2b9d9294a6381a1e59c852035de6c652f416f42428709
终局/退出帧：logs/states.jsonl offset=14311186231 bytes=23692 SHA256=33ff9be120a22268447d2109d7f3d8d14ed64671d3ea0e6969636f3bbcb71305
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数18，回放抽数18。
T1实打ID集合：BOUNCING_FLASK,MIRAGE,POTION:WEAK_POTION
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 1, 'actual-opening': 32}
核过原状态23条、动作16条；逐T1—T4投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 0QDRNCRMC8BU-f8-fight5

角色silent A10，V5，实战commit e713f211362f23e21102c63cd9a5e0195833021c（dirty=True）；F8，fight5，PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER。
入场HP72/76，常驻牌17；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,WINGED_BOOTS。
首试结局won，净掉血30，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0，掉血39.125000000000014；真实开场状态computed，死亡率0，掉血39.34375。
入房：logs/states.jsonl offset=14327431885 bytes=22521 SHA256=f8c95ccff03111456ac084eb67794ce0f2b810ce76c8532f35054f5c969136b3
T1可行动：logs/states.jsonl offset=14327454406 bytes=28953 SHA256=97464c443a04c9c627e93e41ac7eaa4766ccd278cf293dbcafad00a8fab8cf8f
首试末战斗帧：logs/states.jsonl offset=14328203560 bytes=25009 SHA256=f8e25fc1b8dc6286acc3a2f7ab1045d7387fff3b37edd4a3b08347799452d3fa
终局/退出帧：logs/states.jsonl offset=14328228569 bytes=18013 SHA256=f8431fffe12d996775ab5bf079ab5a7eed4d751ae382794152322e8b1fff3fdc
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数10，回放抽数10。
T1实打ID集合：DAGGER_SPRAY,DEFEND_SILENT,PIERCING_WAIL
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 2, 'actual-opening': 32}
核过原状态58条、动作21条；逐T1—T6投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 0QDRNCRMC8BU-f15-fight7

角色silent A10，V5，实战commit e713f211362f23e21102c63cd9a5e0195833021c（dirty=True）；F15，fight7，SKULKING_COLONY。
入场HP64/76，常驻牌21；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,WINGED_BOOTS,GORGET,LASTING_CANDY,TEA_OF_DISCOURTESY。
首试结局won，净掉血0，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0，掉血19.59375；真实开场状态computed，死亡率0，掉血9.21875。
入房：logs/states.jsonl offset=14329445932 bytes=25880 SHA256=0979e26f104ee6fe3a094b73430d999ace6b21838f2dc59ac788571bf511c85f
T1可行动：logs/states.jsonl offset=14329471812 bytes=32265 SHA256=4b0ef0229a782aa50a2f8f3e21ffe3c9d6e9041ebaa7d87b317258682777fff8
首试末战斗帧：logs/states.jsonl offset=14329978021 bytes=27744 SHA256=c69044623bba6fe84312dfcb203c48acb705d72596319cb8be805768491ddf09
终局/退出帧：logs/states.jsonl offset=14330005765 bytes=21631 SHA256=a18050edcf774762f24d288e3e898f4337c4604788b9b06d40ce0bdcda741ab1
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数14，回放抽数14。
T1实打ID集合：DAGGER_SPRAY,DASH,SHADOWMELD
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态29条、动作18条；逐T1—T4投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## T4PL60Z0DZV3-f12-fight6

角色silent A10，V5，实战commit acfd63aaa8f664ca6f81a025cf8ebf25883531a9（dirty=True）；F12，fight6，SKULKING_COLONY。
入场HP60/84，常驻牌20；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,GOLDEN_PEARL,MANGO。
首试结局won，净掉血21，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0，掉血17；真实开场状态computed，死亡率0，掉血11.5625。
入房：logs/states.jsonl offset=14349795787 bytes=24689 SHA256=81817ad255333b2416a1a808b6a71abdbb26663939c874ca1b70ac5843cad165
T1可行动：logs/states.jsonl offset=14349820476 bytes=30730 SHA256=b14df48d403bcb93c9fa8a4bc198531204c1b4c7613efca6238ae0c9592ec218
首试末战斗帧：logs/states.jsonl offset=14350439015 bytes=31635 SHA256=3da7940fdfc8990181805716ac2edf1d122c175df44d297c119573e08e58820a
终局/退出帧：logs/states.jsonl offset=14350470650 bytes=21097 SHA256=1598abeb735d79acf0e90b0b44ddf816f401ff4c33451489554b32e9cb88819f
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数13，回放抽数13。
T1实打ID集合：DEFEND_SILENT,SLICE,STRIKE_SILENT,SUCKER_PUNCH
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 1, 'actual-opening': 0}
核过原状态31条、动作20条；逐T1—T5投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## T4PL60Z0DZV3-f15-fight8

角色silent A10，V5，实战commit acfd63aaa8f664ca6f81a025cf8ebf25883531a9（dirty=True）；F15，fight8，PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER。
入场HP54/84，常驻牌22；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,GOLDEN_PEARL,MANGO,VAMBRACE。
首试结局won，净掉血27，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0，掉血23.031250000000004；真实开场状态computed，死亡率0，掉血21.09375。
入房：logs/states.jsonl offset=14351424725 bytes=29513 SHA256=f9487511f7494229d89bd9d829e1ea1244c0c701de78e1d0af65008ef7bd2efe
T1可行动：logs/states.jsonl offset=14351454238 bytes=35337 SHA256=87ef25351285472bb454b5d3716de032f6226ebc6e50ec1295fd153a22c95983
首试末战斗帧：logs/states.jsonl offset=14352879016 bytes=31636 SHA256=13401c4a73ccb2fd83dd220a53378511a8a4ff70895530a3e4857bf9c04e8474
终局/退出帧：logs/states.jsonl offset=14352910652 bytes=22493 SHA256=d0000722ed33a5eb9862234c6828a41868e27322e891834797f23ab888f66a63
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数15，回放抽数15。
T1实打ID集合：ADRENALINE,DAGGER_THROW,DEFEND_SILENT,PREDATOR,SLICE
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态51条、动作31条；逐T1—T6投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## T4PL60Z0DZV3-f30-fight14

角色silent A10，V5，实战commit acfd63aaa8f664ca6f81a025cf8ebf25883531a9（dirty=True）；F30，fight14，ENTOMANCER。
入场HP81/84，常驻牌31；实际起手9，合成首抽7；遗物RING_OF_THE_SNAKE,GOLDEN_PEARL,MANGO,VAMBRACE,BAG_OF_PREPARATION,VERY_HOT_COCOA,TUNING_FORK。
首试结局won，净掉血50，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0，掉血35.96875；真实开场状态computed，死亡率0.03125000000000001，掉血42.34375。
入房：logs/states.jsonl offset=14360178401 bytes=35560 SHA256=7c877649af4efb13d2fc8682abc28215793b6f7acb852dc279a2bb2ae1f0d0ca
T1可行动：logs/states.jsonl offset=14360213961 bytes=43866 SHA256=389224fe55e427a116956f45ae87e474d52a3c4cf34cfb137fdbd5fa96fde33e
首试末战斗帧：logs/states.jsonl offset=14361369310 bytes=40616 SHA256=050596589014a05304cfd11ec9cec56330940a6a7dee4a1c5c7e040c5d32c4de
终局/退出帧：logs/states.jsonl offset=14361409926 bytes=29023 SHA256=e8a52342767856a4ad88714514b46bc36e17cef34cf220577f4d5fb3b58f95e7
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数22，回放抽数22。
T1实打ID集合：DAGGER_THROW,DEFEND_SILENT,INFINITE_BLADES,NEUTRALIZE,STRIKE_SILENT,ULTIMATE_DEFEND
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态34条、动作27条；逐T1—T6投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## MPWMW6P91U0B-f11-fight5

角色silent A10，V5，实战commit acfd63aaa8f664ca6f81a025cf8ebf25883531a9（dirty=True）；F11，fight5，PHROG_PARASITE。
入场HP55/70，常驻牌19；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,WINGED_BOOTS。
首试结局won，净掉血25，SL记录0；去向observed_and_static_replay_verified。
合成死亡率1，掉血55；真实开场状态computed，死亡率0.5625，掉血50.21875。
入房：logs/states.jsonl offset=14382616767 bytes=23106 SHA256=a513427e7000e8258cb65fb5f2408c8dd8be9589aa68f109a2758a382eb7d7d3
T1可行动：logs/states.jsonl offset=14382639873 bytes=29189 SHA256=d3a29762ec8b7f9ebe94d70425992a75d2449dd28b5ccf36dc8b3e2b8c533cd9
首试末战斗帧：logs/states.jsonl offset=14383814141 bytes=29192 SHA256=43aa48b5b241695abde1e41b629fdaf4a7bc990bbc9f45a5ce8df4e580436bb3
终局/退出帧：logs/states.jsonl offset=14383843333 bytes=19734 SHA256=27cd17302870e7eb65af6d12f2243c3c9fc1b0b090e12760037d1e50ba9b7b1a
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数12，回放抽数12。
T1实打ID集合：ABRASIVE,FLICK_FLACK,FOOTWORK,HIDDEN_DAGGERS,POTION:POWER_POTION,SHIV,SURVIVOR
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态56条、动作35条；逐T1—T9投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## U084Q0B4EJSX-f14-fight6

角色silent A10，V5，实战commit 080c347c35df3e2c42d4caf3a02dc4bd3930895f（dirty=True）；F14，fight6，TERROR_EEL。
入场HP53/70，常驻牌20；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,SMALL_CAPSULE,VAJRA,HAND_DRILL,BRONZE_SCALES,FESTIVE_POPPER。
首试结局won，净掉血10，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.34375000000000006，掉血42.78125；真实开场状态computed，死亡率0.125，掉血35.875。
入房：logs/states.jsonl offset=14417246398 bytes=24303 SHA256=bfe8cd8f96393768e1fb92e31272562a2b5e82037bfbda2c65d8877ba1141035
T1可行动：logs/states.jsonl offset=14417270701 bytes=30868 SHA256=1e422692b8503c244967b30f4ae41bc00912acb55a3b2cecafd521309d86d332
首试末战斗帧：logs/states.jsonl offset=14418119761 bytes=27663 SHA256=748439567a6a4743fc10cbc1c3b2897b755474235b2a9c47fe4d093484dfe88e
终局/退出帧：logs/states.jsonl offset=14418147424 bytes=20993 SHA256=71873dbbb519182e45510a869001f23b105a0ef160e606a2553e1e72393832a3
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数13，回放抽数13。
T1实打ID集合：DEFEND_SILENT,NEUTRALIZE,SLICE,STRIKE_SILENT,SURVIVOR
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 32}
核过原状态43条、动作27条；逐T1—T6投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## MRJ4E5HL3ZA9-f8-fight5

角色silent A10，V5，实战commit 3fb989e95d294fad9f772ed970ffe26e437bd1ca（dirty=True）；F8，fight5，BYGONE_EFFIGY。
入场HP71/77，常驻牌18；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,NEOWS_TORMENT。
首试结局died，净掉血71，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.65625，掉血67.34375000000003；真实开场状态computed，死亡率0.4375000000000001，掉血65.43750000000001。
入房：logs/states.jsonl offset=14428184461 bytes=21585 SHA256=f15cd311d4c1d20b87f95932bf9cce3149f34dd27377c6254ef62f1f555b7b62
T1可行动：logs/states.jsonl offset=14428206046 bytes=28267 SHA256=a2c5e7918c4ed92eb3c57f8ce2a69d0809d21f4a57fa1584e6284fb8da132bc1
首试末战斗帧：logs/states.jsonl offset=14428950341 bytes=24663 SHA256=d6c0279f92989285939000a0611a5b50b9b8b8db2a1afef8258e3dea8b1ff2fc
终局/退出帧：logs/states.jsonl offset=14428975004 bytes=23181 SHA256=83b3e6d6036651d6189e9e2400b2f5e6859cfcdacde07c981bbcd654f38bed1b
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数11，回放抽数11。
T1实打ID集合：ECHOING_SLASH,NEOWS_FURY,SUCKER_PUNCH
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 2, 'actual-opening': 27}
核过原状态30条、动作28条；逐T1—T7投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## Y0EMJR6MKWYW-f11-fight6

角色silent A10，V5，实战commit 3fb989e95d294fad9f772ed970ffe26e437bd1ca（dirty=True）；F11，fight6，PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER。
入场HP36/70，常驻牌22；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,LARGE_CAPSULE,ANCHOR,NUNCHAKU,DARKSTONE_PERIAPT,AMETHYST_AUBERGINE。
首试结局won，净掉血27，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.1875，掉血24.90625000000001；真实开场状态computed，死亡率0.0625，掉血19.65625。
入房：logs/states.jsonl offset=14432614907 bytes=28515 SHA256=fac3de31a05202858494565df35fe5875b888d9424377f9632488ca0fc1ddafc
T1可行动：logs/states.jsonl offset=14432643422 bytes=35086 SHA256=25cc0ad30b626becda8656aec535116ebd128d363c0bb7090828db19f177dc43
首试末战斗帧：logs/states.jsonl offset=14434663937 bytes=30837 SHA256=cda9cd94d5eac2d3f16dacf8cf3f74f456317df277f4bae0420cfbb4c055b6d5
终局/退出帧：logs/states.jsonl offset=14434694774 bytes=22782 SHA256=ca1c4e9d73742d5631896eea125f6a4c0f679a418aa940957d1c582ed19e545c
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数15，回放抽数15。
T1实打ID集合：DEFEND_SILENT,FOOTWORK,STRIKE_SILENT
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 3, 'actual-opening': 15}
核过原状态74条、动作47条；逐T1—T10投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 76VEDXJJ2PFL-f8-fight5

角色silent A10，V5，实战commit 3fb989e95d294fad9f772ed970ffe26e437bd1ca（dirty=True）；F8，fight5，TERROR_EEL。
入场HP48/73，常驻牌18；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,LEAD_PAPERWEIGHT,CHOSEN_CHEESE。
首试结局won，净掉血29，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.8125，掉血46.59374999999999；真实开场状态computed，死亡率0.6250000000000001，掉血43.750000000000014。
入房：logs/states.jsonl offset=14467261930 bytes=21310 SHA256=62553ea0b1b35e929a521e21e1c5e923e28dcd3dde4f06ad1ef2a0788180c9b1
T1可行动：logs/states.jsonl offset=14467283240 bytes=28062 SHA256=45675a04d54de92ca8264c8fef0118abfa65781dbddba4f3e4454ecaa49a459d
首试末战斗帧：logs/states.jsonl offset=14468107093 bytes=18007 SHA256=593dc78b82c5ea8b5c58751cf889a959afde5bb41dede8d9a0ec1309cf999ef2
终局/退出帧：logs/states.jsonl offset=14468125100 bytes=18975 SHA256=6ce72612527427d10ff87a8677304c83b172f72df8640eb4784f3802e78c3116
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数11，回放抽数11。
T1实打ID集合：DEFEND_SILENT,NEUTRALIZE,STRIKE_SILENT,SURVIVOR
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 2, 'actual-opening': 32}
核过原状态37条、动作28条；逐T1—T7投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 76VEDXJJ2PFL-f28-fight14

角色silent A10，V5，实战commit 3fb989e95d294fad9f772ed970ffe26e437bd1ca（dirty=True）；F28，fight14，ENTOMANCER。
入场HP82/82，常驻牌28；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,LEAD_PAPERWEIGHT,CHOSEN_CHEESE,MEAL_TICKET,SHOVEL,VERY_HOT_COCOA,GORGET。
首试结局won，净掉血-1，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0，掉血17.25；真实开场状态computed，死亡率0，掉血17.968750000000004。
入房：logs/states.jsonl offset=14477175739 bytes=32101 SHA256=f52d9f187621183049a7bb1330e863fe551409f7f41d85a62b9bcd32c3f782e6
T1可行动：logs/states.jsonl offset=14477207840 bytes=38932 SHA256=beac4b9f92929387a67e34f2441418021aef9502aefeaab6cf92bd8526fb9fbd
首试末战斗帧：logs/states.jsonl offset=14477873357 bytes=26249 SHA256=1a0a88dbbdb29c8ef118b4396b736835ed92cbef30372fbc51996ece94fb36a6
终局/退出帧：logs/states.jsonl offset=14477899606 bytes=27113 SHA256=76d7b686e276795513fcb9e34b570c408a4cf0d8a847e99e67b66aec2cbec8b7
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数21，回放抽数21。
T1实打ID集合：DEADLY_POISON,DEFEND_SILENT,FISTICUFFS,POISONED_STAB,SNAKEBITE
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态31条、动作18条；逐T1—T5投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 76VEDXJJ2PFL-f30-fight15

角色silent A10，V5，实战commit 3fb989e95d294fad9f772ed970ffe26e437bd1ca（dirty=True）；F30，fight15，INFESTED_PRISM。
入场HP83/83，常驻牌29；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,LEAD_PAPERWEIGHT,CHOSEN_CHEESE,MEAL_TICKET,SHOVEL,VERY_HOT_COCOA,GORGET,WHITE_BEAST_STATUE。
首试结局won，净掉血18，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.09375000000000001，掉血48.09375；真实开场状态computed，死亡率0.03125，掉血54.78125。
入房：logs/states.jsonl offset=14478242155 bytes=34055 SHA256=d7e283199755c3efb6c53975828d98c371430efcd8d69924a027a954deee88e6
T1可行动：logs/states.jsonl offset=14478276210 bytes=40823 SHA256=83cc8cc3e7dd509dd2fa63e373d3bde02fe11120ecfc673673c22e022b4f61c2
首试末战斗帧：logs/states.jsonl offset=14479094328 bytes=27184 SHA256=5c94fe80d034c79555ef3fbfd67679aec5507792743a3fb02ca137b10c07971c
终局/退出帧：logs/states.jsonl offset=14479121512 bytes=28048 SHA256=d6192e4c7385583c2a517453695afe62434174cbaadffef35402e74b50d70e9b
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数22，回放抽数22。
T1实打ID集合：DEADLY_POISON,DEFEND_SILENT,LEG_SWEEP,STRIKE_SILENT
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态38条、动作20条；逐T1—T5投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 2XCG8LXUZLRE-f9-fight5

角色silent A10，V5，实战commit 9f4245511181c6228cf63dc44700ea28ccf35730（dirty=True）；F9，fight5，PHROG_PARASITE。
入场HP60/80，常驻牌19；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,LARGE_CAPSULE,BOOK_OF_FIVE_RINGS,PEAR。
首试结局won，净掉血35，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.78125，掉血58.625；真实开场状态computed，死亡率0.34374999999999994，掉血49.81250000000001。
入房：logs/states.jsonl offset=14516530153 bytes=23300 SHA256=820d378089c7cf7750fcc5ff68c7d9656056495bab95f832db599d51c9fadf2d
T1可行动：logs/states.jsonl offset=14516553453 bytes=30452 SHA256=9de6174c27382f0546c6348a5e2b0a5078caa8374aff1b708d05166ec10d08fd
首试末战斗帧：logs/states.jsonl offset=14517742691 bytes=28839 SHA256=42d20327e2babe2fc598bef92a600e9f8da40450e26f356da7dd9cdb4016e8ee
终局/退出帧：logs/states.jsonl offset=14517771530 bytes=20474 SHA256=fbd7cdd050b057e3a47517fb9173ae9c51eac0473cab8015aa52498ce09c7223
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数12，回放抽数12。
T1实打ID集合：MEMENTO_MORI,NEUTRALIZE,STRIKE_SILENT
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 1, 'actual-opening': 32}
核过原状态58条、动作35条；逐T1—T8投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 2XCG8LXUZLRE-f31-fight14

角色silent A10，V5，实战commit 9f4245511181c6228cf63dc44700ea28ccf35730（dirty=True）；F31，fight14，ENTOMANCER。
入场HP70/80，常驻牌28；实际起手8，合成首抽6；遗物RING_OF_THE_SNAKE,LARGE_CAPSULE,BOOK_OF_FIVE_RINGS,PEAR,HORN_CLEAT,PAELS_BLOOD,POLLINOUS_CORE,AKABEKO。
首试结局won，净掉血11，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.15625，掉血39.6875；真实开场状态computed，死亡率0.09375000000000003，掉血30.374999999999996。
入房：logs/states.jsonl offset=14526171787 bytes=32497 SHA256=88ebd7a7ca540088f905fe338b086b486fc8683425df1045ab0bf9c7f7870e58
T1可行动：logs/states.jsonl offset=14526204284 bytes=40476 SHA256=66598c7b13602eac3ee36025b9a0c11075c897d3ab190b414ce9400111622290
首试末战斗帧：logs/states.jsonl offset=14526779937 bytes=39304 SHA256=9adff5e95aeb304c74a9f91276900617bd56454aa82fd4b72266b84a79b1c672
终局/退出帧：logs/states.jsonl offset=14526819241 bytes=27392 SHA256=7fb61817179a1a783c26154dac257738f922f8aed06193a3c7a5a975969eeb72
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数20，回放抽数20。
T1实打ID集合：BACKSTAB,DEFEND_SILENT,HAZE
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态27条、动作16条；逐T1—T4投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 34XTHUP4433X-f9-fight6

角色silent A10，V5，实战commit 9f4245511181c6228cf63dc44700ea28ccf35730（dirty=True）；F9，fight6，PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER。
入场HP49/70，常驻牌19；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,FISHING_ROD。
首试结局won，净掉血29，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.15625，掉血30.8125；真实开场状态computed，死亡率0.375，掉血37.875000000000014。
入房：logs/states.jsonl offset=14553328040 bytes=25126 SHA256=0cb21a2a345db9ab6c15d59a518bc6b3ed5b581fc3a912efae93e50aff1b37b2
T1可行动：logs/states.jsonl offset=14553353166 bytes=31718 SHA256=aac7f2e1520bcd268b498bc97d79dee5f998460b5735f069e5630395d876acd1
首试末战斗帧：logs/states.jsonl offset=14554818150 bytes=27474 SHA256=7fbe03eba821be68781d4966745e270a8952d0acec04c1f799200d7125bf0cfb
终局/退出帧：logs/states.jsonl offset=14554845624 bytes=19688 SHA256=f0200ef9e44836177cb1d6ffb3ce8bb9c193d2d1f2a8c51ba5142c651eded353
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数12，回放抽数12。
T1实打ID集合：DEFEND_SILENT
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 1, 'actual-opening': 32}
核过原状态75条、动作35条；逐T1—T9投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 34XTHUP4433X-f14-fight7

角色silent A10，V5，实战commit 9f4245511181c6228cf63dc44700ea28ccf35730（dirty=True）；F14，fight7，TERROR_EEL。
入场HP62/70，常驻牌21；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,FISHING_ROD,FESTIVE_POPPER,RED_MASK。
首试结局won，净掉血21，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0，掉血26.781250000000004；真实开场状态computed，死亡率0.031250000000000014，掉血19.125。
入房：logs/states.jsonl offset=14555430678 bytes=26120 SHA256=25e8a279f35856525e0696b2e2110f12df08b6c307f63e2e50ec17894ff129b9
T1可行动：logs/states.jsonl offset=14555456798 bytes=32344 SHA256=2488a0c68dd404706975222f7e735b4da1a52fd9ffd5f5609ab4e67750a8e557
首试末战斗帧：logs/states.jsonl offset=14556529091 bytes=29743 SHA256=d1f654e6ba6985b649e59e15a640a0f5ecdad03b82b71369f517b35f8d4b55ed
终局/退出帧：logs/states.jsonl offset=14556558834 bytes=21835 SHA256=e5146e2769abbf75ccaefd58efc116cc7652ad2f98a352ce251af4ff6f726eb3
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数14，回放抽数14。
T1实打ID集合：DAGGER_THROW,DEFEND_SILENT,POTION:EXPLOSIVE_AMPOULE,SLICE,STRIKE_SILENT
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态41条、动作34条；逐T1—T8投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 34XTHUP4433X-f24-fight13

角色silent A10，V5，实战commit 9f4245511181c6228cf63dc44700ea28ccf35730（dirty=True）；F24，fight13，ENTOMANCER。
入场HP1/70，常驻牌28；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,FISHING_ROD,FESTIVE_POPPER,RED_MASK,ORNAMENTAL_FAN,PAELS_TEARS,DAUGHTER_OF_THE_WIND。
首试结局predicted_death_reload，净掉血None，SL记录4；去向excluded_first_attempt_unknown。
合成死亡率1，掉血1；真实开场状态computed，死亡率1，掉血1。
入房：logs/states.jsonl offset=14562917367 bytes=33925 SHA256=ab4fa4e4517782631786b52e08d577e7905f338a8807c6dbf62f2ac28d686066
T1可行动：logs/states.jsonl offset=14562951292 bytes=40294 SHA256=187f515433d44b5abe0fee5d8102375f88a05e3dc602d91fc3be2828a3f1b5d9
首试末战斗帧：logs/states.jsonl offset=14563298715 bytes=36694 SHA256=2d80a30e262ea7eb4b680ef363b1f3ec8b12a33f227a89451acf8d9bb3b23ed4
终局/退出帧：logs/states.jsonl offset=14565462897 bytes=34911 SHA256=8c057110fc3ff81287415b696eab4847bf10df0476eef32893b46c3c20557620
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数21，回放抽数21。
T1实打ID集合：DEFEND_SILENT,POTION:DEXTERITY_POTION,SLICE,STRIKE_SILENT
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 0}
核过原状态62条、动作60条；逐T1—T2投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## 79421JK2WBA9-f14-fight6

角色silent A10，V5，实战commit 9f4245511181c6228cf63dc44700ea28ccf35730（dirty=True）；F14，fight6，BYGONE_EFFIGY。
入场HP69/77，常驻牌19；实际起手9，合成首抽5；遗物RING_OF_THE_SNAKE,BOOMING_CONCH。
首试结局won，净掉血35，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0，掉血37.6875；真实开场状态computed，死亡率0，掉血27.968749999999996。
入房：logs/states.jsonl offset=14569119993 bytes=22269 SHA256=511d50cd6e91e81aee856e84c8303da982e0198fe47805de3def61e0e2e6f2be
T1可行动：logs/states.jsonl offset=14569142262 bytes=30533 SHA256=47fef7b7e0b60ac7bfcb8f63fbdb7a0f2e0105e0aabebf9e400bcaeb6f05aef4
首试末战斗帧：logs/states.jsonl offset=14569810841 bytes=27269 SHA256=5f4964e544d9d507e20b6de1bb0747a472c1ad54190aa93994d46f7c8a0f07c2
终局/退出帧：logs/states.jsonl offset=14569838110 bytes=19341 SHA256=a65b114bd51a6fb5872daa44f08a4f75343d8edfde95f77c43101ab7bebad0f3
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数10，回放抽数10。
T1实打ID集合：BACKSTAB,DEFEND_SILENT,FLASH_OF_STEEL,NEUTRALIZE,PECK,STRIKE_SILENT
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 12}
核过原状态32条、动作25条；逐T1—T6投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。

## MEQ6ETDCEEE9-f13-fight6

角色silent A10，V5，实战commit 9f4245511181c6228cf63dc44700ea28ccf35730（dirty=True）；F13，fight6，PHROG_PARASITE。
入场HP58/70，常驻牌20；实际起手7，合成首抽5；遗物RING_OF_THE_SNAKE,CURSED_PEARL,GORGET,POTION_BELT。
首试结局won，净掉血6，SL记录0；去向observed_and_static_replay_verified。
合成死亡率0.7812500000000001，掉血54.875000000000014；真实开场状态computed，死亡率0.21875000000000003，掉血33.8125。
入房：logs/states.jsonl offset=14587361495 bytes=25174 SHA256=8917c9d435235f2186ab468bd0ffea35a194ebd978047227a7dc6e08df478b80
T1可行动：logs/states.jsonl offset=14587386669 bytes=30991 SHA256=cdd6692ea54a2b6dfe7285b96608121def75bcfc9bc6ea2f95f9b78fccc2b49e
首试末战斗帧：logs/states.jsonl offset=14588505554 bytes=30281 SHA256=36fa3d743837e9143033a819f53e3c6c841c9f281378ce230db7084518e274ff
终局/退出帧：logs/states.jsonl offset=14588535835 bytes=21624 SHA256=6e095fa13477516142203a864db697ade66f58346f860096ff9e4739e66c2690
最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。
原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal=True；原抽数13，回放抽数13。
T1实打ID集合：CLOAK_AND_DAGGER,DASH,DRAMATIC_ENTRANCE,NEUTRALIZE,SHIV,SLICE
回放T1集合相同样本数（集合相同也不证明顺序相同）：{'synthetic': 0, 'actual-opening': 1}
核过原状态56条、动作35条；逐T1—T8投影及32种子序列见turn-alignment.jsonl。
未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。
