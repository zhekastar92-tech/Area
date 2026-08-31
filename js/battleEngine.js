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
    this.tierPlan = this.computeTierPlan(playerShipDef.tier);
    this.playerTeam = this.buildTeam('player', playerShipDef);
    this.enemyTeam = this.buildTeam('enemy', null);

    this.allShips = [...this.playerTeam, ...this.enemyTeam];
    this.player = this.allShips.find(s=>s.isPlayer);

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
    return [...new Set(this.allDefs.filter(d=>d.class===cls).map(d=>d.tier))].sort((a,b)=>a-b);
  }

  nearestAvailableTier(cls, targetTier){
    const tiers = this.availableTiersFor(cls);
    if(tiers.length===0) return targetTier;
    return tiers.reduce((best,t)=> Math.abs(t-targetTier)<Math.abs(best-targetTier) ? t : best, tiers[0]);
  }

  // Матчмейкинг: равновероятно (1/3 каждый) — бой на T-1/T, только T, или T/T+1.
  // Если бой не "только T" — случайное кол-во (1-3) слотов не родного тира, зеркально одинаковое на обе команды.
  computeTierPlan(playerTier){
    const classesFlat = BattleEngine.CLASSES_FLAT;
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
    return plan;
  }

  buildTeam(team, forcedPlayerDef){
    const spawnBaseX = team==='player' ? -18 : 18;
    const ships = [];
    const classesFlat = BattleEngine.CLASSES_FLAT;
    const totalSlots = classesFlat.length;

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
      const spread = (i - totalSlots/2) * 4;
      const pos = { x: spawnBaseX, y: spread + (Math.random()*3-1.5) };
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
        s.botStatus='thinking';
        s.plannedOrder = null;
        const delay = 1.5 + Math.random()*10.5;
        setTimeout(()=>{
          if(this.phase!=='planning' || !s.alive) return;
          s.plannedOrder = BotAI.decide(s, this.allShips);
          s.botStatus='ready';
          if(typeof UIBattle!=='undefined') UIBattle.renderFleets(this);
        }, delay*1000);
      }
    });

    if(typeof UIBattle!=='undefined') UIBattle.renderAll(this);
    this.tickTimer();
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

      if(res.result==='hit') dmgEvents.push({from:s, to:t, dmg:res.damage});
      this.logShot(s, t, s.order.action, res);

      // выстрел из-под воды форсирует всплытие
      if(s.order.action==='torp' && s.def.class==='submarine' && s.submerged && !s.diveEntryThisTurn){
        s.submerged=false; s.justSurfaced=true; s.turnsSubmerged=0;
        this.logG(`${s.def.name} всплывает после пуска торпед из-под воды.`, 'system');
      }
    }

    // кулдауны: у стрелявших — выставляем; у остальных — декремент
    for(const s of this.allShips){
      if(!s.alive) continue;
      const fired = s.order && (s.order.action==='gk' || s.order.action==='torp');
      if(fired){
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

    if(typeof UIBattle!=='undefined') UIBattle.renderAll(this);

    const winner = this.checkVictory();
    if(winner){ this.endBattle(winner); return; }

    this.phase='report';
    if(typeof UIBattle!=='undefined') UIBattle.updateTimer(this,true);
    setTimeout(()=>{ this.turn++; this.startPlanningPhase(); }, 2200);
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

  endBattle(winner){
    this.finished = true;
    clearInterval(this.timerHandle);
    this.logBoth(winner==='player' ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ', 'system');
    if(typeof UIBattle!=='undefined') UIBattle.showResult(this, winner);
    ProgressionSystem.applyBattleResult(winner==='player');
  }
}
