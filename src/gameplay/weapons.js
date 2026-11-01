// Player weapons: pistol (default, infinite magazines) and limited special weapons.
export const WEAPONS = {
  pistol: { name: 'אקדח', mag: 6, reload: 0.6, rate: 0.12, pellets: 1, auto: false, pierce: false, sound: 'pistol', shake: 0.08, model: 'pistol' },
  mpistol: { name: 'תת־מקלע', mag: 30, reload: 0, rate: 0.085, pellets: 1, auto: true, pierce: false, sound: 'mpistol', shake: 0.05, model: 'smg' },
  shotgun: { name: 'רובה ציד', mag: 6, reload: 0, rate: 0.45, pellets: 5, spread: 0.055, auto: false, pierce: false, sound: 'shotgun', shake: 0.3, model: 'shotgun' },
  magnum: { name: 'מגנום', mag: 6, reload: 0, rate: 0.32, pellets: 1, auto: false, pierce: true, sound: 'magnum', shake: 0.25, model: 'revolver' },
};

export class PlayerWeapon {
  constructor() { this.equip('pistol'); }

  equip(id) {
    this.id = id;
    this.def = WEAPONS[id];
    this.ammo = this.def.mag;
    this.reloading = 0;
    this.cooldown = 0;
  }

  get special() { return this.id !== 'pistol'; }

  canFire() { return this.cooldown <= 0 && this.reloading <= 0 && this.ammo > 0; }

  fire() {
    this.ammo--;
    this.cooldown = this.def.rate;
    if (this.ammo <= 0 && this.special) return 'depleted';
    return 'ok';
  }

  startReload() {
    if (this.special || this.reloading > 0 || this.ammo === this.def.mag) return false;
    this.reloading = this.def.reload;
    return true;
  }

  update(dt) {
    this.cooldown -= dt;
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) { this.reloading = 0; this.ammo = this.def.mag; return 'reloaded'; }
    }
    return null;
  }
}
