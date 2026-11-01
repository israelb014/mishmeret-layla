// Score, combo multiplier and per-stage statistics.
export const POINTS = { torso: 100, head: 200, weapon: 300, legs: 100, barrel: 500, boss: 3000, grenade: 100, rescue: 500 };

export class Scoring {
  constructor() { this.total = 0; this.resetStage(); }

  resetStage() {
    this.stage = { score: 0, shots: 0, hits: 0, heads: 0, disarms: 0, civilians: 0, damage: 0, time: 0, kills: 0 };
    this.combo = 0;
  }

  get multiplier() { return this.combo >= 12 ? 4 : this.combo >= 8 ? 3 : this.combo >= 4 ? 2 : 1; }

  shot() { this.stage.shots++; }
  miss() { this.combo = 0; }

  // a successful hit on an enemy; returns points awarded (after multiplier)
  hit(part) {
    this.stage.hits++;
    this.combo++;
    if (part === 'head') this.stage.heads++;
    if (part === 'weapon') this.stage.disarms++;
    return this.add(POINTS[part] || 100, true);
  }

  add(points, withMultiplier = false) {
    const p = withMultiplier ? points * this.multiplier : points;
    this.stage.score += p;
    this.total += p;
    return p;
  }

  // continuing resets the score to 0 (progress kept)
  resetScore() { this.total = 0; this.stage.score = 0; this.combo = 0; }

  accuracy() { return this.stage.shots ? Math.round((100 * this.stage.hits) / this.stage.shots) : 0; }

  rank(stageTarget = 30000, continues = 0) {
    const acc = this.accuracy();
    const scoreF = Math.min(1, this.stage.score / stageTarget);
    let v = acc * 0.45 + scoreF * 45 + Math.min(10, this.stage.heads + this.stage.disarms * 2) - this.stage.civilians * 8 - this.stage.damage * 3 - continues * 15;
    v = Math.max(0, Math.min(100, v));
    const letter = v >= 85 ? 'S' : v >= 70 ? 'A' : v >= 55 ? 'B' : v >= 38 ? 'C' : 'D';
    return { letter, value: v };
  }
}

export function zoneBonus(seconds, par = 20) {
  const over = Math.max(0, seconds - par);
  return Math.max(200, Math.round((2000 - over * 60) / 10) * 10);
}
