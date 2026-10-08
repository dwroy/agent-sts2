import { readFileSync, writeFileSync } from 'node:fs';
import { modelHandCard } from '../../../.worktrees/live/agent/src/reflex/card-model.ts';
import { replaySteps } from '../../../.worktrees/live/agent/src/reflex/turn-solver.ts';
const scratch = '/home/dw/Projects/agent-sts2/learner/runs/20261008-131301-postmortem';
const rows = JSON.parse(readFileSync(`${scratch}/states.json`, 'utf8'));
const before = rows.find((r: any) => r._line === 297418).state;
const after = rows.find((r: any) => r._line === 297419).state;
const card = before.combat.hand.find((c: any) => c.card_id === 'BOUNCING_FLASK');
const knowledge: any = { card: (id: string) => before.run.deck.find((c: any) => c.card_id === id) && { type: 'Skill' } };
const model = modelHandCard(card, card.index, knowledge, 'silent', 10);
const amount = (e: any, id: string) => e.powers.find((p: any) => p.power_id === id)?.amount ?? 0;
const input: any = {
 hand: [model], fightKind: 'monster', turn: 5,
 player: { hp: 1, maxHp: 76, block: 0, energy: 2, weak: false, vulnerable: true, intangible: false },
 enemies: before.combat.enemies.map((e: any) => ({
  index: e.index, name: e.name, hp: e.current_hp, maxHp: e.max_hp, block: e.block,
  vulnerable: 0, weak: 0, poison: amount(e, 'POISON_POWER'), artifact: 0, intangible: false,
  minion: amount(e, 'MINION_POWER') > 0,
  attacks: e.intents.filter((i: any) => i.damage !== null).map((i: any) => ({damage:i.damage,hits:i.hits})),
 })),
};
const simulated = replaySteps(input, [{cardIndex:model.index,cardId:model.cardId,upgraded:false,name:model.name,target:null,targetName:null}]);
const out = {
 范围: '只复现原始帧297418中弹跳药瓶的施毒与当前回合评估；不重建整场、不引入其他角色数据。',
 输入: input,
 模拟: simulated?.outcome,
 实际施毒后: after.combat.enemies.map((e: any) => ({index:e.index,id:e.enemy_id,hp:e.current_hp,poison:amount(e,'POISON_POWER')})),
};
writeFileSync(`${scratch}/随机施毒核对.json`, JSON.stringify(out,null,2));
console.log(JSON.stringify({model:{target:model.target,poison:model.poison,hits:model.hits},winsFight:simulated?.outcome.winsFight,enemyHpAfter:simulated?.outcome.enemyHpAfter,actual:out.实际施毒后}));
