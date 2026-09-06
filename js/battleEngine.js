const TEAM_COMPOSITION = { submarine:1, battleship:3, destroyer:3, cruiser:3 }; // сумма = 10
const ARENA_RADIUS = 30;
const POINT_A = {x:0, y:-8};
const POINT_B = {x:0, y:8};
const PLANNING_SECONDS = 15;

function pickRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

class BattleEngine{
  constructor(playerShipDef){
    this.turn = 1;
    this.phase = 'planning';
    this.timerSec = PLANNING_SECONDS;
    this.timerHandle = null;
    this.points = { player:0, enemy:0 };
    this.logMine = [];
    this.logGlobal = [];
    this.finished = false;

    this.allDefs = Storage.getShipsDB();

    this.playerShipDef = playerShipDef;
    this.tierPlan = this.computeTierPlan(playerShipDef.tier, playerShipDef.class);
    this.playerTeam = this.buildTeam('player', playerShipDef);
    this.enemyTeam = this.buildTeam('enemy', null);

    this.allShips = [...this.playerTeam, ...this.enemyTeam];
    this.player = this.allShips.find(s=>s.isPlayer);

    // статистика боя для послебоевого экрана и расчёта оценки/наград
    this.battleStats = new Map();
    this.allShips.forEach(s=> this.battleStats.set(s.id, {dealt:0, potential:0}));
    this.battleResult = null; // заполняется в endBattle()

    // архетипы крейсеров считаем один раз для всех
    this.allShips.forEach(s=>{
      if(s.def.class==='cruiser') s._archetype = computeCruiserArchetype(s.def, this.allDefs);
    });
    // назначаем skill-tier ботам
    this.allShips.forEach(s=>{ if(!s.isPlayer) s.skillTier = rollSkillTier(); });

    this.playerOrder = { action:null, targetId:null };

    this.logBoth(`Бой начался. Состав: 1 ПЛ / 3 БЛ / 3 ЭМ / 3 КР на команду. ${this.matchmakingBracket||''}`, 'system');
    this.startPlanningPhase();
  }

  static get CLASSES_FLAT(){
    const flat = [];
    for(const cls in TEAM_COMPOSITION){
      for(let i=0;i<TEAM_COMPOSITION[cls]; i++) flat.push(cls);
    }
    return flat;
  }

  availableTiersFor(cls){
    return [...new Set(this.allDefs.filter(d=>d.class===cls && d.tier<=10).map(d=>d.tier))].sort((a,b)=>a-b);
  }

  availableSuperTiersFor(cls){
    return [...new Set(this.allDefs.filter(d=>d.class===cls && d.tier>=11).map(d=>d.tier))];
  }

  nearestAvailableTier(cls, targetTier){
    const tiers = this.availableTiersFor(cls);
    if(tiers.length===0) return targetTier;
    return tiers.reduce((best,t)=> Math.abs(t-targetTier)<Math.abs(best-targetTier) ? t : best, tiers[0]);
  }

  // Матчмейкинг: равновероятно (1/3 каждый) — бой на T-1/T, только T, или T/T+1.
  // Если бой не "только T" — случайное кол-во (1-3) слотов не родного тира, зеркально одинаковое на обе команды.
  computeTierPlan(playerTier, playerClass){
    const classesFlat = BattleEngine.CLASSES_FLAT;
    const playerSlotIndex = classesFlat.indexOf(playerClass);

    // Игрок сам на суперкорабле (тир 11+): его слот ВСЕГДА занят супером — это не "кандидат", это гарантия.
    // Симметрично у обеих команд получается 1 (только игрок/его зеркало) или 2 (плюс ещё один случайный слот) супера.
    if(playerTier>=11){
      const plan = classesFlat.map(cls => this.nearestAvailableTier(cls, 10)); // фон — обычные тир10 корабли
      plan[playerSlotIndex] = playerTier;
      const addSecond = Math.random()<0.5;
      let totalSupers = 1;
      if(addSecond){
        const eligibleSlots = classesFlat
          .map((cls,i)=>({i, cls}))
          .filter(({cls,i})=> i!==playerSlotIndex && this.availableSuperTiersFor(cls).length>0);
        if(eligibleSlots.length>0){
          const pick = eligibleSlots[Math.floor(Math.random()*eligibleSlots.length)];
          const superTiers = this.availableSuperTiersFor(pick.cls);
          plan[pick.i] = superTiers[Math.floor(Math.random()*superTiers.length)];
          totalSupers = 2;
        }
      }
      this.matchmakingBracket = `Бой суперкораблей: ${totalSupers} на команду`;
      return plan;
    }

    const roll = Math.random();
    const bracket = roll < 1/3 ? 'down' : roll < 2/3 ? 'same' : 'up';

    const plan = classesFlat.map(cls => this.nearestAvailableTier(cls, playerTier));
    if(bracket==='same'){
      this.matchmakingBracket = 'Бой на ' + playerTier + ' тире';
      return plan;
    }

    const offDelta = bracket==='down' ? -1 : 1;
    const offCount = 1 + Math.floor(Math.random()*3); // 1-3 слота не родного тира
    const indices = classesFlat.map((_,i)=>i);
    for(let i=indices.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [indices[i],indices[j]]=[indices[j],indices[i]]; }
    const offIndices = new Set(indices.slice(0, offCount));

    offIndices.forEach(i=>{
      plan[i] = this.nearestAvailableTier(classesFlat[i], playerTier + offDelta);
    });

    const otherTier = playerTier + offDelta;
    this.matchmakingBracket = `Бой на ${Math.min(playerTier,otherTier)}-${Math.max(playerTier,otherTier)} тирах (${offCount} корабл${offCount===1?'ь':offCount<5?'я':'ей'} не вашего тира на команду)`;

    // Суперкорабли (тир 11+) — отдельная, управляемая механика: появляются ТОЛЬКО в сценарии "10+1"
    // (игрок тира 10, бракет "вверх"), количество на команду случайно 1 или 2 (не больше), одинаково для обеих команд.
    if(playerTier===10 && bracket==='up'){
      const eligibleSlots = classesFlat
        .map((cls,i)=>({i, cls}))
        .filter(({cls,i})=> i!==playerSlotIndex && this.availableSuperTiersFor(cls).length>0);
      if(eligibleSlots.length>0){
        const superCount = Math.min(eligibleSlots.length, Math.random()<0.5 ? 1 : 2);
        const shuffled = [...eligibleSlots];
        for(let i=shuffled.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]; }
        shuffled.slice(0, superCount).forEach(({i, cls})=>{
          const superTiers = this.availableSuperTiersFor(cls);
          plan[i] = superTiers[Math.floor(Math.random()*superTiers.length)];
        });
        this.matchmakingBracket += ` · суперкораблей на команду: ${superCount}`;
      }
    }

    return plan;
  }

  buildTeam(team, forcedPlayerDef){
    const spawnBaseX = team==='player' ? -18 : 18;
    const ships = [];
    const classesFlat = BattleEngine.CLASSES_FLAT;
    const totalSlots = classesFlat.length;

    // Групповой спавн: 3 тактических кластера (3/4/3 корабля), случайное распределение слотов
    // по кластерам — независимо у каждой команды, поэтому классы больше не совпадают детерминированно
    // между командами (раньше, например, ПЛ обеих команд всегда стояли на одной Y-линии).
    const groupSizes = [3,4,3];
    const groupCenters = [-14, 0, 14];
    const shuffledSlots = classesFlat.map((_,i)=>i);
    for(let i=shuffledSlots.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [shuffledSlots[i],shuffledSlots[j]]=[shuffledSlots[j],shuffledSlots[i]]; }
    const groupOfSlot = new Array(totalSlots);
    let cursor=0;
    groupSizes.forEach((size, gi)=>{
      for(let k=0;k<size;k++){ groupOfSlot[shuffledSlots[cursor]] = gi; cursor++; }
    });

    // слот игрока — тот же индекс класса, что и его корабль; его план фиксируем на реальный тир игрока
    let playerSlotIndex = -1;
    if(team==='player' && forcedPlayerDef){
      playerSlotIndex = classesFlat.indexOf(forcedPlayerDef.class);
    }

    classesFlat.forEach((cls, i)=>{
      let def;
      const isPlayerSlot = team==='player' && i===playerSlotIndex;
      if(isPlayerSlot){
        def = forcedPlayerDef;
      } else {
        const targetTier = this.tierPlan[i];
        const pool = this.allDefs.filter(d=>d.class===cls && d.tier===targetTier);
        def = pickRandom(pool.length ? pool : this.allDefs.filter(d=>d.class===cls));
      }
      const gi = groupOfSlot[i];
      const pos = { x: spawnBaseX + (Math.random()*3-1.5), y: groupCenters[gi] + (Math.random()*4-2) };
      const inst = new ShipInstance(def, team, pos);
      if(isPlayerSlot) inst.isPlayer = true;
      ships.push(inst);
    });

    return ships;
  }

  aliveList(team){ return this.allShips.filter(s=>s.team===team && s.alive); }

  logBoth(text, cls){ this.logMine.push({text,cls}); this.logGlobal.push({text,cls}); }
  logM(text, cls){ this.logMine.push({text,cls}); }
  logG(text, cls){ this.logGlobal.push({text,cls}); }

  // видит ли команда team корабль ship (командный засвет)
  isDetectedBy(ship, byTeam){
    const spotters = this.allShips.filter(s=>s.alive && s.team===byTeam);
    return spotters.some(s => dist(s.pos, ship.pos) <= ship.detectionRadius);
  }

  startPlanningPhase(){
    if(this.finished) return;
    this.phase='planning';
    this.timerSec = PLANNING_SECONDS;

    this.allShips.forEach(s=>{
      if(!s.alive) return;
      s.justSurfaced = false; // снимаем блок погружения к новому ходу
      if(!s.isPlayer){
        if(this.fastForward){
          s.plannedOrder = BotAI.decide(s, this.allShips, this);
          s.botStatus='ready';
          return;
        }
        s.botStatus='thinking';
        s.plannedOrder = null;
        const delay = 1.5 + Math.random()*10.5;
        setTimeout(()=>{
          if(this.phase!=='planning' || !s.alive) return;
          s.plannedOrder = BotAI.decide(s, this.allShips, this);
          s.botStatus='ready';
          if(typeof UIBattle!=='undefined') UIBattle.renderFleets(this);
        }, delay*1000);
      }
    });
    this.playerOrder = { action:null, targetId:null }; // сброс каждый ход — иначе старый приказ "стрелять" зацикливает кулдаун

    if(this.fastForward){
      // игрок мёртв — реального приказа быть не может, сразу разрешаем ход без ожидания
      this.runExecutionPhase();
      return;
    }

    if(typeof UIBattle!=='undefined') UIBattle.renderAll(this);
    this.tickTimer();
  }

  // Вызывается кнопкой "Пропустить бой" после гибели игрока — доигрывает оставшийся бой мгновенно (0мс на ход)
  activateFastForward(){
    if(this.finished || this.fastForward) return;
    this.fastForward = true;
    clearInterval(this.timerHandle);
    clearTimeout(this.reportTimeoutHandle);
    if(this.phase!=='execution'){ // не встреваем в уже идущий расчёт хода — он сам корректно продолжит цепочку
      this.startPlanningPhase();
    }
  }

  tickTimer(){
    clearInterval(this.timerHandle);
    this.timerHandle = setInterval(()=>{
      this.timerSec--;
      if(typeof UIBattle!=='undefined') UIBattle.updateTimer(this);
      if(this.timerSec<=0){
        clearInterval(this.timerHandle);
        this.runExecutionPhase();
      }
    },1000);
  }

  runExecutionPhase(){
    if(this.finished) return;
    this.phase='execution';
    if(typeof UIBattle!=='undefined') UIBattle.updateTimer(this,true);

    this.player.order = this.playerOrder.action ? {...this.playerOrder} : null;
    this.allShips.forEach(s=>{
      if(s.isPlayer || !s.alive) return;
      s.order = s.plannedOrder || null;
    });

    // --- обработка погружений/всплытий подлодок (до боя) ---
    this.allShips.forEach(s=>{
      s.diveEntryThisTurn = false;
      if(!s.alive || s.def.class!=='submarine') return;
      if(s.order && s.order.action==='dive' && !s.submerged && s.diveChargesLeft>0 && !s.justSurfaced){
        s.submerged = true;
        s.diveChargesLeft--;
        s.turnsSubmerged = 0;
        s.diveEntryThisTurn = true;
        this.logG(`${s.def.name} уходит на погружение.`, 'system');
        if(s.isPlayer) this.logM('Вы погружаетесь. Полная неуязвимость в этот ход.', 'system');
      } else if(s.submerged){
        s.turnsSubmerged++;
        if(s.turnsSubmerged >= 3){
          s.submerged = false;
          s.justSurfaced = true;
          s.turnsSubmerged = 0;
          this.logG(`${s.def.name} вынужденно всплывает (лимит хода под водой).`, 'system');
        }
      }
    });

    // --- ШАГ 1: атаки по дистанциям начала фазы ---
    const dmgEvents = [];
    this.lastShotEvents = [];
    const firedThisPhase = new Set(); // корабли, реально совершившие попытку выстрела (не reloading/out_of_range/без цели)
    for(const s of this.allShips){
      if(!s.alive || !s.order || !(s.order.action==='gk' || s.order.action==='torp')) continue;
      const t = this.allShips.find(x=>x.id===s.order.targetId);
      if(!t || !t.alive) continue;
      const d = dist(s.pos, t.pos);

      let res;
      if(t.diveEntryThisTurn){
        res = {result:'immune_diving'};
      } else if(s.order.action==='gk' && t.def.class==='submarine' && t.submerged){
        res = {result:'immune_submerged'};
      } else if(s.order.action==='gk'){
        res = CombatMath.resolveGkShot(s, t, d);
      } else {
        res = CombatMath.resolveTorpedoShot(s, t, d);
      }

      // --- трекинг боевой статистики (для послебоевого экрана и оценки) ---
      const targetMovedForStats = t.order && (t.order.action==='approach' || t.order.action==='retreat');
      const weaponBaseDmg = s.order.action==='gk' ? s.def.gk.damage : s.def.torp.damage;
      const sStat = this.battleStats.get(s.id), tStat = this.battleStats.get(t.id);
      if(res.result==='hit' && sStat) sStat.dealt += res.damage;
      if(res.result==='ricochet' && tStat) tStat.potential += weaponBaseDmg;
      if(res.result==='miss' && targetMovedForStats && tStat) tStat.potential += weaponBaseDmg;

      if(res.result!=='reloading' && res.result!=='out_of_range' && res.result!=='no_weapon'){
        firedThisPhase.add(s.id); // кулдаун ставим только если выстрел реально состоялся
      }

      if(res.result==='hit') dmgEvents.push({from:s, to:t, dmg:res.damage});
      this.logShot(s, t, s.order.action, res);
      this.lastShotEvents.push({ shooterId:s.id, targetId:t.id, weaponType:s.order.action, result:res.result });

      // выстрел из-под воды форсирует всплытие
      if(s.order.action==='torp' && s.def.class==='submarine' && s.submerged && !s.diveEntryThisTurn){
        s.submerged=false; s.justSurfaced=true; s.turnsSubmerged=0;
        this.logG(`${s.def.name} всплывает после пуска торпед из-под воды.`, 'system');
      }
    }

    // кулдауны: у реально стрелявших — выставляем; у остальных — декремент
    for(const s of this.allShips){
      if(!s.alive) continue;
      if(firedThisPhase.has(s.id)){
        if(s.order.action==='gk') s.gkCooldown = s.def.gk.reloadTurns;
        else s.torpCooldown = s.def.torp.reloadTurns;
      } else {
        if(s.gkCooldown>0) s.gkCooldown--;
        if(s.torpCooldown>0) s.torpCooldown--;
      }
    }

    // --- ШАГ 2: движение ---
    for(const s of this.allShips){
      if(!s.alive || !s.order) continue;
      if(s.order.action==='approach' || s.order.action==='retreat') this.applyMovement(s);
    }

    // --- ШАГ 3: применение урона одновременно (правило последнего залпа) ---
    for(const ev of dmgEvents) ev.to.hp -= ev.dmg;
    for(const s of this.allShips){
      if(s.alive && s.hp<=0){
        s.alive=false; s.hp=0;
        this.logG(`${s.def.name} [${s.team==='player'?'союзник':'враг'}] уничтожен(а)!`, s.team==='enemy'?'ally-kill':'enemy-kill');
        if(s.isPlayer) this.logM('Ваш корабль уничтожен.', 'hit');
      }
    }

    // --- ШАГ 4: очки за точки A/Б ---
    for(const s of this.allShips){
      if(!s.alive) continue;
      const dA = dist(s.pos, POINT_A), dB = dist(s.pos, POINT_B);
      if(dA<=2.0 || dB<=2.0) this.points[s.team]++;
    }

    if(!this.fastForward && typeof UIBattle!=='undefined') UIBattle.renderAll(this);

    const winner = this.checkVictory();
    if(winner){ this.endBattle(winner); return; }

    this.phase='report';
    if(this.fastForward){
      this.turn++;
      this.startPlanningPhase();
      return;
    }
    if(typeof UIBattle!=='undefined') UIBattle.updateTimer(this,true);
    this.reportTimeoutHandle = setTimeout(()=>{ this.turn++; this.startPlanningPhase(); }, 2200);
  }

  logShot(shooter, target, action, res){
    const wname = action==='torp' ? 'Торпеды' : 'Залп ГК';
    const sSide = shooter.team, tSide = target.team;
    const globalCls = res.result==='hit' ? (sSide==='player'?'ally-hit':'enemy-hit') : null;

    let text;
    switch(res.result){
      case 'hit': text = `${wname} ${shooter.def.name} → ${target.def.name}: попадание, урон ${res.damage}`; break;
      case 'miss': text = `${wname} ${shooter.def.name} → ${target.def.name}: промах`; break;
      case 'ricochet': text = `${wname} ${shooter.def.name} → ${target.def.name}: рикошет`; break;
      case 'out_of_range': text = `${shooter.def.name}: цель вне досягаемости`; break;
      case 'reloading': text = `${shooter.def.name}: орудия перезаряжаются`; break;
      case 'immune_submerged': text = `${wname} ${shooter.def.name} → ${target.def.name}: цель под водой, недосягаема для ГК`; break;
      case 'immune_diving': text = `${wname} ${shooter.def.name} → ${target.def.name}: цель ушла на погружение, промах`; break;
      default: return;
    }

    // в лог боя (глобальный) — только успешные попадания
    if(res.result==='hit') this.logG(text, globalCls);

    // в личный лог — все события, где участвует игрок (атакующий или цель)
    if(shooter.isPlayer || target.isPlayer){
      const cls = res.result==='hit' ? 'hit' : (res.result==='ricochet'||res.result==='miss' ? 'miss' : 'system');
      this.logM(text, cls);
    }
  }

  applyMovement(s){
    let targetPos = null;
    if(s.order.targetId==='POINT_A') targetPos = POINT_A;
    else if(s.order.targetId==='POINT_B') targetPos = POINT_B;
    else{
      const t = this.allShips.find(x=>x.id===s.order.targetId);
      if(t && t.alive) targetPos = t.pos;
    }
    if(!targetPos) return;

    const speed = s.def.speed;
    const dx = targetPos.x - s.pos.x, dy = targetPos.y - s.pos.y;
    const d = Math.hypot(dx,dy) || 0.0001;
    let newPos = {...s.pos};
    const dirX = dx/d, dirY = dy/d;
    if(s.order.action==='approach'){ newPos.x += dirX*speed; newPos.y += dirY*speed; }
    else { newPos.x -= dirX*speed; newPos.y -= dirY*speed; }

    const distFromCenter = Math.hypot(newPos.x, newPos.y);
    if(distFromCenter > ARENA_RADIUS){
      const k = ARENA_RADIUS/distFromCenter;
      newPos.x *= k; newPos.y *= k;
      if(s.isPlayer){
        s.hp -= Math.round(s.maxHp*0.05);
        this.logM('Вы покидаете акваторию! Получен урон.', 'system');
      }
    }
    s.pos = newPos;
  }

  checkVictory(){
    const pAlive = this.aliveList('player').length;
    const eAlive = this.aliveList('enemy').length;
    if(pAlive===0) return 'enemy';
    if(eAlive===0) return 'player';
    if(this.points.player>=250) return 'player';
    if(this.points.enemy>=250) return 'enemy';
    if(this.turn>=180){
      if(this.points.player!==this.points.enemy) return this.points.player>this.points.enemy?'player':'enemy';
      return pAlive>=eAlive ? 'player':'enemy';
    }
    return null;
  }

  computeBattleResult(winnerTeam){
    const loserTeam = winnerTeam==='player' ? 'enemy' : 'player';
    const POOL_ELO = 200;
    const RANK_WEIGHTS = [10,9,8,7,6,5,4,3,2,1];
    const WEIGHT_SUM = RANK_WEIGHTS.reduce((a,b)=>a+b,0);
    const WINNER_PENALTY = -20;
    const LOSER_PENALTY = -25;
    const SILVER_WIN=500000, SILVER_LOSE=300000, XP_WIN=20000, XP_LOSE=5000;

    const scored = this.allShips.map(s=>{
      const st = this.battleStats.get(s.id);
      const score = ScoringSystem.rawScore(s.def.class, st.dealt, st.potential);
      return {
        id:s.id, name:s.def.name, cls:s.def.class, team:s.team, isPlayer:s.isPlayer, alive:s.alive,
        dealt:Math.round(st.dealt), potential:Math.round(st.potential), score,
        rating: ScoringSystem.toRating(s.def.class, score),
        eloDelta:0, silverReward:0, xpReward:0,
      };
    });

    const winners = scored.filter(s=>s.team===winnerTeam).sort((a,b)=>b.score-a.score);
    const losers = scored.filter(s=>s.team===loserTeam).sort((a,b)=>b.score-a.score);

    // --- ELO: пул делят 9 лучших победителей + 1 лучший проигравший; худший победитель и остальные проигравшие — фикс. штраф ---
    const excludedWinner = winners[winners.length-1];
    const poolWinners = winners.slice(0, winners.length-1);
    const bestLoser = losers[0];
    const excludedLosers = losers.slice(1);

    const poolEligible = [...poolWinners, bestLoser].sort((a,b)=>b.score-a.score);
    poolEligible.forEach((s, idx)=>{ s.eloDelta = Math.round(POOL_ELO * RANK_WEIGHTS[idx] / WEIGHT_SUM); });
    if(excludedWinner) excludedWinner.eloDelta = WINNER_PENALTY;
    excludedLosers.forEach(s=> s.eloDelta = LOSER_PENALTY);

    // --- Серебро/опыт: по рангу ВНУТРИ каждой команды (все 10 участников) ---
    winners.forEach((s, idx)=>{
      s.silverReward = Math.round(SILVER_WIN * RANK_WEIGHTS[idx] / WEIGHT_SUM);
      s.xpReward = Math.round(XP_WIN * RANK_WEIGHTS[idx] / WEIGHT_SUM);
    });
    losers.forEach((s, idx)=>{
      s.silverReward = Math.round(SILVER_LOSE * RANK_WEIGHTS[idx] / WEIGHT_SUM);
      s.xpReward = Math.round(XP_LOSE * RANK_WEIGHTS[idx] / WEIGHT_SUM);
    });

    scored.sort((a,b)=>b.score-a.score);
    return { winnerTeam, loserTeam, ships:scored, playerRow: scored.find(s=>s.isPlayer) };
  }

  endBattle(winner){
    this.finished = true;
    clearInterval(this.timerHandle);
    this.logBoth(winner==='player' ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ', 'system');
    this.battleResult = this.computeBattleResult(winner);
    ProgressionSystem.applyBattleResult(this.battleResult, this.playerShipDef);
    if(typeof UIBattle!=='undefined') UIBattle.showResult(this, winner);
  }
}
