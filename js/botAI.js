const SKILL_WEIGHTS = {
  newbie:  { noise:0.55, predictive:false, resourceMgmt:0.3 },
  average: { noise:0.25, predictive:false, resourceMgmt:0.6 },
  statist: { noise:0.05, predictive:true,  resourceMgmt:1.0 },
};

function rollSkillTier(){
  const r = Math.random();
  if(r < 0.10) return 'newbie';
  if(r < 0.75) return 'average'; // 0.10 + 0.65
  return 'statist';
}

// Определяет крейсерский архетип по отклонению от среднего по всем крейсерам той же нации/тира в БД
function computeCruiserArchetype(shipDef, allDefs){
  if(shipDef.class!=='cruiser') return null;
  const peers = allDefs.filter(d=>d.class==='cruiser' && d.tier===shipDef.tier);
  if(peers.length<2) return {torpedo:0, artillery:0, tank:0};
  const avg = (key)=> peers.reduce((s,p)=>s+(key(p)||0),0)/peers.length;
  const avgDmg = avg(p=>p.gk?p.gk.damage:0);
  const avgArmor = avg(p=>p.armor);
  const hasTorp = !!shipDef.torp;

  const dmgDelta = avgDmg ? (shipDef.gk.damage-avgDmg)/avgDmg : 0;
  const armorDelta = avgArmor ? (shipDef.armor-avgArmor)/avgArmor : 0;

  return {
    torpedo: hasTorp ? 1 : 0,
    artillery: Math.max(0, dmgDelta),
    tank: Math.max(0, armorDelta),
  };
}

const BotAI = {
  decide(ship, allShips){
    const weights = SKILL_WEIGHTS[ship.skillTier];
    if(Math.random() < 0.015) return null; // имитация AFK 1-2%

    const enemies = allShips.filter(s=>s.alive && s.team!==ship.team);
    const allies = allShips.filter(s=>s.alive && s.team===ship.team && s.id!==ship.id);
    if(enemies.length===0) return {action:'hold_still'};

    // --- Подлодки: отдельная логика ---
    if(ship.def.class==='submarine'){
      return this.decideSubmarine(ship, enemies, weights);
    }

    // видимые враги (детект по команде: хоть один союзник/сам корабль в радиусе засвета цели)
    const spotters = [ship, ...allies];
    const visibleEnemies = enemies.filter(e=> spotters.some(s=>dist(s.pos,e.pos) <= e.detectionRadius));
    const targetPool = visibleEnemies.length ? visibleEnemies : enemies;

    // приоритет цели: близость + класс + фокус союзников + инстинкт ПЛО у ЭМ + липкость по skill-tier
    const candidates = targetPool.map(e=>{
      const ed = dist(ship.pos, e.pos);
      let score = 200 - ed*3;
      if(e.def.class==='battleship') score += 20;
      if(ship.def.class==='destroyer' && e.def.class==='submarine') score += 90; // инстинкт ПЛО: скорость ЭМ — контраргумент скрытности ПЛ
      const alliesTargeting = allies.filter(a=>a.plannedOrder && a.plannedOrder.targetId===e.id).length;
      score += alliesTargeting*15;
      if(ship.currentTargetId===e.id) score += 40*(1-weights.noise); // липкость: статист держит цель, новичок дёргается
      return { ship:e, score };
    });
    candidates.sort((a,b)=>b.score-a.score);

    let target;
    if(Math.random() < weights.noise && candidates.length>1){
      // менее опытные боты иногда выбирают не оптимальную, а случайную цель из топ-3 — реальный разброс по архетипам
      target = pickRandom(candidates.slice(0, Math.min(3, candidates.length))).ship;
    } else {
      target = candidates[0].ship;
    }
    ship.currentTargetId = target.id;
    const d = dist(ship.pos, target.pos);

    // определить архетип крейсера один раз
    if(ship.def.class==='cruiser' && !ship.cruiserArchetype){
      ship.cruiserArchetype = ship._archetype || {torpedo:0,artillery:0,tank:0};
    }
    const arche = ship.cruiserArchetype || {torpedo:0,artillery:0,tank:0};

    const gk = ship.def.gk, torp = ship.def.torp;
    const gkReady = gk && ship.gkCooldown<=0 && d<=gk.range;
    const torpReady = torp && ship.torpCooldown<=0 && d<=torp.range;

    // урон под угрозой в этот ход, если остаться на месте и стрелять — считаем для ВСЕХ тиров,
    // но менее опытные боты реагируют на сигнал реже (шумнее), а не игнорируют его совсем
    let predictedDanger = 0;
    for(const e of enemies){
      const ed = dist(ship.pos, e.pos);
      if(e.def.gk && ed<=e.def.gk.range && e.gkCooldown<=0){
        const acc = CombatMath.gkAccuracy(e.def.class, ed, e.def.gk.range);
        predictedDanger += acc * e.def.gk.damage;
      }
    }
    const dangerRatio = predictedDanger / ship.maxHp;

    // Правило класса: БЛ почти не боится стоять (штраф риска низкий), ЭМ/КР куда чувствительнее
    const riskTolerance = { battleship:0.9, cruiser:0.5, destroyer:0.25 }[ship.def.class];
    const shouldDodgeInstead = dangerRatio > riskTolerance && Math.random() > weights.noise*0.6;

    if((gkReady || torpReady) && !shouldDodgeInstead){
      // выбор оружия: КР с торпедным архетипом предпочитает торпеды на дистанции пуска
      let useTorp = torpReady && !gkReady;
      if(gkReady && torpReady){
        useTorp = arche.torpedo>0 ? Math.random()<0.7 : Math.random()<0.15;
      }
      return { action: useTorp?'torp':'gk', targetId: target.id };
    }

    // манёвр: подход к дистанции боя или удержание/отход (кайт для артиллерийских КР)
    const preferredRange = gk ? gk.range*0.75 : (torp? torp.range*0.6 : 8);
    if(d > preferredRange*1.1){
      return { action:'approach', targetId: target.id };
    }
    if(ship.def.class==='cruiser' && arche.artillery>0.15 && d < preferredRange*0.8){
      return { action:'retreat', targetId: target.id }; // кайт-поведение
    }
    if(shouldDodgeInstead || d < (ship.def.gk? ship.def.gk.range*0.3 : 3)){
      return { action:'retreat', targetId: target.id };
    }
    return { action:'approach', targetId: target.id };
  },

  decideSubmarine(ship, enemies, weights){
    const nearest = enemies.reduce((a,b)=> dist(ship.pos,b.pos)<dist(ship.pos,a.pos)?b:a);
    const d = dist(ship.pos, nearest.pos);
    const torp = ship.def.torp;

    if(ship.submerged){
      // под водой: может стрелять (форсирует всплытие) либо просто двигаться
      if(torp && ship.torpCooldown<=0 && d<=torp.range && Math.random() < (0.4 + weights.resourceMgmt*0.3)){
        return { action:'torp', targetId: nearest.id };
      }
      return { action: d>torp.range*0.6 ? 'approach':'retreat', targetId: nearest.id };
    }

    // на поверхности
    const underThreat = enemies.some(e => e.def.gk && dist(ship.pos,e.pos) <= e.def.gk.range);
    const canDive = ship.diveChargesLeft>0 && !ship.justSurfaced;
    if(underThreat && canDive){
      const diveChance = { newbie:0.9, average:0.6, statist:0.4 }[ship.skillTier]; // статист бережёт заряды
      if(Math.random() < diveChance) return { action:'dive', targetId:null };
    }
    if(torp && ship.torpCooldown<=0 && d<=torp.range){
      return { action:'torp', targetId: nearest.id };
    }
    return { action:'approach', targetId: nearest.id };
  }
};
