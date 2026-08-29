// уклонение по манёвру (движение без атаки в этот ход; при атаке = 0)
const EVASION = {
  destroyer:{gk:0.60, torp:0.75},
  cruiser:{gk:0.40, torp:0.50},
  battleship:{gk:0.20, torp:0.25},
  submarine:{gk:0.50, torp:0.90},
};

// классовые таблицы меткости ГК: [верхняя_граница_%_дальности, шанс]
const GK_ACCURACY_TABLE = {
  battleship:[[50,0.90],[70,0.70],[90,0.50],[100,0.40]],
  cruiser:   [[50,1.00],[70,0.85],[90,0.70],[100,0.60]],
  destroyer: [[50,1.00],[70,0.90],[90,0.80],[100,0.70]],
};

const CombatMath = {
  vbr(){ return 0.8 + Math.random()*0.4; }, // 0.8-1.2

  gkAccuracy(shooterClass, distance, maxRange){
    if(distance > maxRange) return 0;
    const pct = (distance/maxRange)*100;
    const table = GK_ACCURACY_TABLE[shooterClass];
    for(const [upTo, chance] of table){
      if(pct <= upTo) return chance;
    }
    return table[table.length-1][1];
  },

  rollHit(chance){ return Math.random() < chance; },

  // targetMoved = true, если цель в этот ход выбрала Сближение/Отступление (не атаковала)
  resolveGkShot(attacker, target, range){
    const weapon = attacker.def.gk;
    if(!weapon) return {result:'no_weapon'};
    if(attacker.gkCooldown > 0) return {result:'reloading'};
    let acc = this.gkAccuracy(attacker.def.class, range, weapon.range);
    if(weapon.accMod) acc *= weapon.accMod;
    const targetMoved = target.order && (target.order.action==='approach' || target.order.action==='retreat');
    if(targetMoved) acc *= (1 - EVASION[target.def.class].gk);
    if(!this.rollHit(acc)) return {result: acc===0 ? 'out_of_range' : 'miss'};
    const pen = weapon.penetration * this.vbr();
    if(pen <= target.def.armor) return {result:'ricochet'};
    const dmg = Math.round(weapon.damage * this.vbr());
    return {result:'hit', damage:dmg};
  },

  resolveTorpedoShot(attacker, target, range){
    const weapon = attacker.def.torp;
    if(!weapon) return {result:'no_weapon'};
    if(attacker.torpCooldown > 0) return {result:'reloading'};
    if(range > weapon.range) return {result:'out_of_range'};
    let acc = 1.0; // торпеды: 100% на любой дистанции в момент пуска до проверки уклонения
    const targetMoved = target.order && (target.order.action==='approach' || target.order.action==='retreat');
    if(targetMoved) acc *= (1 - EVASION[target.def.class].torp);
    // подлодка под водой (не в ход погружения) неуязвима к ГК, но не к торпедам — обрабатывается отдельно в движке
    if(!this.rollHit(acc)) return {result:'miss'};
    return {result:'hit', damage:Math.round(weapon.damage)}; // без ВБР
  }
};

function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }
