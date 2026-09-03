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

/* ============================================================
   СИСТЕМА ОЦЕНКИ БОЯ (из симуляции 500 боёв, откалибровано по классам)
   ============================================================ */
const ScoringSystem = {
  MULT: {
    battleship:{dmg:0.62, pot:0.62},
    cruiser:{dmg:2.0, pot:2.3},
    destroyer:{dmg:2.0, pot:2.7},
    submarine:{dmg:0.25, pot:0.4},
  },
  RATING_SCALE: {
    battleship:{p1:1.56, median:18.18, p995:75.15},
    cruiser:{p1:0.00, median:14.80, p995:95.15},
    destroyer:{p1:0.00, median:14.65, p995:178.08},
    submarine:{p1:0.00, median:15.84, p995:44.35},
  },
  rawScore(cls, dealt, potential){
    const m = this.MULT[cls];
    return (dealt/1000)*m.dmg + (potential/5000)*m.pot;
  },
  toRating(cls, score){
    const {p1, median, p995} = this.RATING_SCALE[cls];
    if(score<=p1) return 0.1;
    if(score>=p995) return 10.0;
    if(score<=median) return +(0.1 + (score-p1)/(median-p1)*(6.0-0.1)).toFixed(1);
    return +(6.0 + (score-median)/(p995-median)*(10.0-6.0)).toFixed(1);
  },
};
