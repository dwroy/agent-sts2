/** Ascension inputs for the Silent replay, using the existing boss-start opening rules. */
import type { BossOpening } from "../../src/sim/boss-start.js";
import { moveDamageAt, nearestAscension, type MonsterDb } from "../../src/knowledge/monster-db.js";

export function normalizeCalibrationOpening(raw: Record<string, unknown>, opening: BossOpening, db: MonsterDb, asc: number): Array<Record<string, unknown>> {
  const provenance: Array<Record<string, unknown>> = [];
  const combat = raw["combat"] as { enemies: Array<Record<string, unknown>> };
  const parts = [...opening.parts];
  for (const enemy of combat.enemies) {
    const at = parts.findIndex((p) => p.id === enemy["enemy_id"]);
    if (at < 0) throw new Error("missing boss part");
    const part = parts.splice(at, 1)[0]!;
    enemy["current_hp"] = part.hp;
    enemy["max_hp"] = part.hp;
    enemy["base_max_hp"] = part.hp;
    const hit = moveDamageAt(db.monsters, part.id, String(enemy["move_id"] ?? ""), asc);
    const powers = (enemy["powers"] as Array<{ power_id: string; amount: number }> | undefined) ?? [];
    const power = (id: string) => powers.find((p) => p.power_id === id)?.amount ?? 0;
    // Same first-hit handling as syntheticBossStart: the actual opening facing, Strength and Weak.
    const behind = power("BACK_ATTACK_LEFT_POWER") > 0 ? 1.5 : 1;
    const base = hit ? Math.floor((hit.base ?? hit.perHit) * behind) : 0;
    const shown = Math.max(0, Math.floor((base + power("STRENGTH_POWER")) * (power("WEAK_POWER") > 0 ? 0.75 : 1)));
    provenance.push({ id: part.id, hp: part.hp, hpAsc: nearestAscension(db.monsters[part.id]?.hp_by_asc, asc)?.key,
      openingAsc: opening.asc, exactOpening: opening.exact, hit, shown });
    if (hit) for (const intent of (enemy["intents"] as Array<Record<string, unknown>>)) {
      if (intent["damage"] != null) {
        intent["damage"] = shown;
        intent["hits"] = hit.hits;
        intent["total_damage"] = shown * hit.hits;
      }
    }
  }
  return provenance;
}
