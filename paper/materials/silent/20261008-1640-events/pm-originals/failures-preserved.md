# 临时抽取／核验失败记录

初稿与最终追加脚本均保留：lesson-draft.md、write_draft.py、append-lesson.sh；没有重写旧lessons。

首次analyse.py stats因直接对所有方案题的rationale匹配code rank，遇到饮药分支无匹配而失败：
AttributeError: 'NoneType' object has no attribute 'group'
已在临时脚本将无rank分支单列为饮药，并重跑得完整结果。

首次追加前临时核验脚本直接使用x['chosen']，遇到缺省chosen记录而失败：
KeyError: 'chosen'
该shell未设置set -e，随后已经执行一次cat追加；因此没有追加前指纹记录，也不能声称首轮核验通过。后续按get缺省访问重新核验全部16个主项、唯一标题及精确草稿字节，全部通过；verification.json保留第二次结果。没有发现复盘数字需勘误。分类勘误另因核实既有shipped历史追加。

早期只读检索曾查不存在的reflex/enemy-model.ts、core/run-summary.ts及eye统计通配文件，返回路径缺失；随后定位到现有loop.ts／ops/report.py。所有这些均为临时核验或定位错误，不登记为生产代码纯bug。
