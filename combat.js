// ============================================================
// COMBAT.JS — Боевой движок
// Выстрелы фиксированы по типу оружия (WEAPON_TYPES.shotsPerRound).
// Тактики накладывают модификаторы к меткости / спец. действия.
// ============================================================

let combatState = null;

// ============================================================
// ИНИЦИАЛИЗАЦИЯ БОЯ
// ============================================================

function initCombat(enemyData) {
  const playerStats = calcLoadoutStats();
  const headArmor   = playerStats.headArmor || 0;
  const bodyArmor   = playerStats.bodyArmor || 0;

  combatState = {
    active:   true,
    round:    1,

    playerHP:   gameData.raid ? (gameData.raid.playerHP || 100) : 100,
    maxHP:      100,
    enemyHP:       enemyData.hp || 100,
    enemyMaxHP:    enemyData.hp || 100,
    enemyMagAmmo:  enemyData.currentMagAmmo || enemyData.magSize || 20,
    enemyTotalAmmo: enemyData.totalAmmo || (enemyData.magSize || 20),
    enemyMedkits:  (enemyData.medkits || []).map(function(m){ return Object.assign({},m); }),
    enemyTacticLocked:    false,
    activeMagIndexEnemy:  0,

    playerArmor: {
      head: headArmor, body: bodyArmor,
      headMax: headArmor, bodyMax: bodyArmor,
    },
    enemyArmor: {
      head: enemyData.headArmor || 0, body: enemyData.bodyArmor || 0,
      headMax: enemyData.headArmor || 0, bodyMax: enemyData.bodyArmor || 0,
    },

    armorRepairUsed:      false,
    tacticLockedNextRound: false,
    _enemyArmorRepairUsed: false,

    enemy:          enemyData,
    limbs:          { arms: false, legs: false, chest: false },
    // Физические магазины (копия)
    magazines:      JSON.parse(JSON.stringify(gameData.loadout.magazines || [])),
    activeMagIndex: _getFirstLoadedMagIndex(gameData.loadout.magazines || []),
    currentMagAmmo: _getActiveMagAmmo(gameData.loadout.magazines || []),
    log:            [],
    awaitingAction: true,
    playerChoice:   null,
  };

  renderCombat();
}

// ============================================================
// ОСНОВНОЙ РАУНД
// ============================================================

function playRound(tacticId) {
  if (!combatState || !combatState.active) return;

  if (combatState.tacticLockedNextRound && tacticId !== 'normal_shot') {
    showToast('Прицельная стрельба: этот ход — только обычная стрельба', 'warning');
    return;
  }

  const tactic = tacticId === 'normal_shot'
    ? { id: 'normal_shot', name: 'Обычная стрельба', icon: 'gun', category: 'balanced' }
    : COMBAT_TACTICS[tacticId];

  if (!tactic) return;

  if (tactic.repairArmor && combatState.armorRepairUsed) {
    showToast('Починка брони уже использована в этом бою', 'warning');
    return;
  }

  combatState.awaitingAction    = false;
  combatState.playerChoice      = tacticId;
  combatState.tacticLockedNextRound = false;

  const roundLog = [];

  // ── ПОБЕГ ──────────────────────────────────────────────────
  if (tactic.fleeChance !== undefined) {
    if (Math.random() < tactic.fleeChance) {
      roundLog.push({ type: 'flee', text: '🏃 Побег удался — вы вышли из боя!' });
      combatState.log.push({ round: combatState.round, entries: roundLog });
      combatState.active = false;
      combatState.result = 'flee';
      _syncHPToRaid();
      saveData();
      renderCombat();
      return;
    } else {
      roundLog.push({ type: 'flee', text: '🏃 Побег провалился — вы погибли!' });
      combatState.log.push({ round: combatState.round, entries: roundLog });
      endCombat('lose');
      return;
    }
  }

  // ── ПЕРЕЗАРЯДКА ─────────────────────────────────────────────
  if (tactic.reloadMag) {
    var reloadResult = _playerReload();
    roundLog.push({ type: 'action', side: 'player', text: reloadResult.text });
  }

  // ── ПОЧИНКА БРОНИ ───────────────────────────────────────────
  if (tactic.repairArmor && !combatState.armorRepairUsed) {
    combatState.armorRepairUsed = true;
    combatState.playerArmor.head = combatState.playerArmor.headMax;
    combatState.playerArmor.body = combatState.playerArmor.bodyMax;
    roundLog.push({ type: 'repair',
      text: '🔧 Броня восстановлена: голова ' + combatState.playerArmor.head + ' / тело ' + combatState.playerArmor.body });
  }

  // ── ХОД ИГРОКА ──────────────────────────────────────────────
  if (!tactic.noShots) {
    const pr = resolveAttack({
      isPlayer:      true,
      tactic,
      attackerStats: calcLoadoutStats(),
      targetArmor:   combatState.enemyArmor,
    });
    roundLog.push(...pr.log);
    combatState.enemyHP = Math.max(0, combatState.enemyHP - pr.totalDamage);
    if (pr.armorDamage) {
      combatState.enemyArmor.head = Math.max(0, combatState.enemyArmor.head - (pr.armorDamage.head || 0));
      combatState.enemyArmor.body = Math.max(0, combatState.enemyArmor.body - (pr.armorDamage.body || 0));
    }
  }

  if (tactic.lockNextTactic) {
    combatState.tacticLockedNextRound = true;
  }

  // ── ХОД ВРАГА ───────────────────────────────────────────────
  if (combatState.enemyHP > 0) {
    // Аптечка врага: автоматически при HP < 40% (не тратит ход)
    _enemyAutoHeal(roundLog);

    var enemyTactic = pickEnemyTactic();

    // Перезарядка врага — берём следующий заряженный магазин
    if (enemyTactic.reloadMag) {
      var eReload = _enemyReload();
      roundLog.push({ type: 'action', side: 'enemy', text: eReload.text });
    }

    // Починка брони врага (уже применена в pickEnemyTactic, логируем)
    if (enemyTactic.repairArmor) {
      roundLog.push({ type: 'repair',
        text: '🔧 ' + escHtml(combatState.enemy.name) + ' починил броню.' });
    }

    // Блокировка тактики на следующий ход врага от aimed_shot
    if (enemyTactic.lockNextTactic) {
      combatState.enemyTacticLocked = true;
    }

    if (!enemyTactic.noShots) {
      var er = resolveAttack({
        isPlayer:         false,
        tactic:           enemyTactic,
        attackerStats:    buildEnemyStats(combatState.enemy),
        targetArmor:      combatState.playerArmor,
        playerTacticUsed: tactic,
      });
      roundLog.push(...er.log);
      combatState.playerHP = Math.max(0, combatState.playerHP - er.totalDamage);
      if (er.armorDamage) {
        combatState.playerArmor.head = Math.max(0, combatState.playerArmor.head - (er.armorDamage.head || 0));
        combatState.playerArmor.body = Math.max(0, combatState.playerArmor.body - (er.armorDamage.body || 0));
      }
    }
  }

  // ── КОНЕЧНОСТИ ──────────────────────────────────────────────
  updateLimbStatus(roundLog);

  // ── КРОВОТЕЧЕНИЕ ────────────────────────────────────────────
  if (combatState.limbs.chest && combatState.playerHP > 0) {
    const bleed = LIMB_THRESHOLDS.chest.penaltyValue;
    combatState.playerHP = Math.max(0, combatState.playerHP - bleed);
    roundLog.push({ type: 'bleed', text: '🩸 Кровотечение: −' + bleed + ' HP' });
  }

  combatState.log.push({ round: combatState.round, entries: roundLog });
  combatState.round++;
  _syncHPToRaid();

  // ── ИСХОД ───────────────────────────────────────────────────
  if (combatState.enemyHP <= 0 && combatState.playerHP <= 0) {
    endCombat('draw');
  } else if (combatState.enemyHP <= 0) {
    endCombat('win');
  } else if (combatState.playerHP <= 0) {
    endCombat('lose');
  } else {
    combatState.awaitingAction = true;
    renderCombat();
  }
}

// ============================================================
// СИНХРОНИЗАЦИЯ HP В gameData.raid
// ============================================================

function _syncHPToRaid() {
  if (gameData.raid && combatState) {
    gameData.raid.playerHP = combatState.playerHP;
    gameData.raid.limbs    = Object.assign({}, combatState.limbs);
    // Синхронизируем магазины
    _syncMagsToLoadout();
  }
}

// ============================================================
// УНИВЕРСАЛЬНЫЙ ДВИЖОК АТАКИ
// ============================================================

function resolveAttack(opts) {
  var isPlayer         = opts.isPlayer;
  var tactic           = opts.tactic;
  var attackerStats    = opts.attackerStats;
  var targetArmor      = opts.targetArmor;
  var playerTacticUsed = opts.playerTacticUsed || null;

  var log           = [];
  var totalDmgArmor = { head: 0, body: 0 };
  var totalDamage   = 0;

  var shotsRange = getWeaponShotsRange(attackerStats.weaponType);
  var shots      = randInt(shotsRange.min, shotsRange.max);

  if (isPlayer) {
    var actual = Math.min(shots, combatState.currentMagAmmo);
    if (actual <= 0) {
      log.push({ type: 'action', side: 'player', text: '🚫 Пустой магазин — сделай перезарядку' });
      return { totalDamage: 0, armorDamage: totalDmgArmor, log, shots: 0, hits: 0, hitHead: 0, hitBody: 0, misses: 0, armorBlocked: 0 };
    }
    shots = actual;
    combatState.currentMagAmmo -= shots;
  } else {
    // Враг тратит патроны из активного магазина
    var enemyActual = Math.min(shots, combatState.enemyMagAmmo);
    if (enemyActual <= 0) {
      // Экстренная перезарядка (pickEnemyTactic должен был поймать раньше)
      var eRl = _enemyReload();
      log.push({ type: 'action', side: 'enemy', text: eRl.text });
      enemyActual = Math.min(shots, combatState.enemyMagAmmo);
    }
    shots = Math.max(0, enemyActual);
    combatState.enemyMagAmmo -= shots;
    // Синхронизируем в массив магазинов врага
    var eMags = combatState.enemy.magazines;
    if (eMags && eMags[combatState.activeMagIndexEnemy || 0]) {
      eMags[combatState.activeMagIndexEnemy || 0].ammoCount = combatState.enemyMagAmmo;
    }
  }

  // Точность
  var acc = attackerStats.accuracy || 40;

  if (isPlayer) {
    if (tactic.playerAccBonus) acc += tactic.playerAccBonus;
    if (combatState.limbs.arms) acc -= LIMB_THRESHOLDS.arms.penaltyValue;
  } else {
    // Враг использует свою тактику: у enemy-тактик нет playerAccBonus по смыслу,
    // но если вдруг есть — применяем как его собственный бонус меткости
    if (tactic.playerAccBonus) acc += tactic.playerAccBonus;
    // Модификаторы от тактики игрока
    if (playerTacticUsed) {
      if (playerTacticUsed.enemyAccBonus)   acc += playerTacticUsed.enemyAccBonus;
      if (playerTacticUsed.enemyAccPenalty) acc -= playerTacticUsed.enemyAccPenalty;
    }
  }

  acc = Math.max(1, Math.min(99, acc));

  var hitHead = 0, hitBody = 0, misses = 0, armorBlocked = 0;
  var bulletLog = [];

  for (var i = 0; i < shots; i++) {
    var sr = resolveSingleShot(acc, attackerStats, targetArmor);
    totalDamage         += sr.damage;
    totalDmgArmor.head  += sr.armorHit.head;
    totalDmgArmor.body  += sr.armorHit.body;

    if (!sr.hit) {
      misses++;
      bulletLog.push({ miss: true, bullet: i + 1 });
    } else {
      if (sr.zone === 'head') hitHead++; else hitBody++;
      armorBlocked += sr.armorAbsorbed || 0;
      bulletLog.push({
        miss: false, bullet: i + 1,
        zone: sr.zone, pen: sr.pen, rawDmg: sr.rawDmg,
        armorVal: sr.armorVal, finalDmg: sr.damage, absorbed: sr.armorAbsorbed || 0,
      });
    }
  }

  var side = isPlayer ? 'player' : 'enemy';
  log.push({
    type: 'round-summary', side,
    shots: shots, hits: hitHead + hitBody, hitHead: hitHead, hitBody: hitBody, misses: misses,
    armorBlocked: parseFloat(armorBlocked.toFixed(1)),
    totalDamage:  parseFloat(totalDamage.toFixed(1)),
    bulletLog: bulletLog,
  });

  return { totalDamage: totalDamage, armorDamage: totalDmgArmor, log: log,
           shots: shots, hits: hitHead + hitBody, hitHead: hitHead, hitBody: hitBody,
           misses: misses, armorBlocked: armorBlocked };
}

// ============================================================
// ПРОСЧЁТ ОДНОГО ВЫСТРЕЛА
// ============================================================

function resolveSingleShot(accuracy, attackerStats, targetArmor) {
  var armorHit     = { head: 0, body: 0 };
  var shotPenBonus = 0, shotDmgBonus = 0, shotAccBonus = 0;

  if (attackerStats.specialBonus) {
    var b = attackerStats.specialBonus;
    if (b.type === 'armorPen')  shotPenBonus = b.value;
    if (b.type === 'damage')    shotDmgBonus = b.value;
    if (b.type === 'accuracy')  shotAccBonus = b.value;
  }

  var effectiveAcc = Math.max(1, Math.min(99, accuracy + shotAccBonus));
  var zone = null;

  if (Math.random() * 100 < effectiveAcc) {
    zone = 'head';
  } else if (Math.random() * 100 < effectiveAcc * 2) {
    zone = 'chest';
  }

  if (!zone) {
    return { hit: false, damage: 0, zone: null, pen: 0, rawDmg: 0,
             armorVal: 0, armorAbsorbed: 0, armorHit: armorHit };
  }

  var baseDmg = attackerStats.ammoDmg || 1;
  var basePen = attackerStats.ammoPen || 0;
  var pen     = basePen + shotPenBonus;
  var dmg     = baseDmg + shotDmgBonus;

  var armorVal     = zone === 'head' ? (targetArmor.head || 0) : (targetArmor.body || 0);
  var finalDmg     = 0;
  var armorAbsorbed = 0;

  if (armorVal > 0) {
    if (pen >= armorVal) {
      finalDmg = dmg;
      if (zone === 'head') armorHit.head += armorVal;
      else                 armorHit.body += armorVal;
    } else {
      var dmgThrough = pen + dmg * 0.5;
      var absorbed   = Math.max(0, armorVal - pen);
      finalDmg       = Math.max(0, dmgThrough - absorbed);
      armorAbsorbed  = dmg - finalDmg;
      var armorDmg   = Math.min(armorVal, pen + 1);
      if (zone === 'head') armorHit.head += armorDmg;
      else                 armorHit.body += armorDmg;
    }
  } else {
    finalDmg = pen * 0.5 + dmg;
  }

  finalDmg = parseFloat(finalDmg.toFixed(2));

  return {
    hit: true,
    zone: zone,
    pen:           parseFloat(pen.toFixed(1)),
    rawDmg:        parseFloat(dmg.toFixed(1)),
    armorVal:      armorVal,
    armorAbsorbed: parseFloat(Math.max(0, armorAbsorbed).toFixed(1)),
    damage:        finalDmg,
    armorHit:      armorHit,
  };
}

// ============================================================
// ХАРАКТЕРИСТИКИ ВРАГА
// ============================================================

function buildEnemyStats(enemy) {
  if (enemy._pvp) {
    return {
      accuracy:     enemy.accuracy,
      ammoDmg:      enemy.ammoDmg,
      ammoPen:      enemy.ammoPen,
      magSize:      enemy.magSize,
      weaponType:   enemy.weaponType,
      specialBonus: enemy.specialBonus || null,
      // Текущий магазин берётся из combatState (обновляется при перезарядке)
      _magAmmoRef:  combatState,
    };
  }
  return {
    accuracy:     enemy.accuracy   || 40,
    ammoDmg:      enemy.ammoDmg    || 2,
    ammoPen:      enemy.ammoPen    || 1,
    magSize:      enemy.magSize    || 20,
    weaponType:   enemy.weaponType || 'rifle',
    specialBonus: null,
    _magAmmoRef:  combatState,
  };
}

// Автоматическая аптечка врага (не тратит ход, срабатывает при HP < 40%)
function _enemyAutoHeal(roundLog) {
  var cs      = combatState;
  var hpRatio = cs.enemyHP / cs.enemyMaxHP;
  if (hpRatio >= 0.40) return;
  if (!cs.enemyMedkits || cs.enemyMedkits.length === 0) return;

  // Берём лучшую аптечку (по healAmount)
  cs.enemyMedkits.sort(function(a,b){ return b.healAmount - a.healAmount; });
  var med    = cs.enemyMedkits[0];
  var healed = Math.min(med.healAmount, cs.enemyMaxHP - cs.enemyHP);
  cs.enemyHP += healed;
  cs.enemyMedkits.shift();

  roundLog.push({ type: 'heal', side: 'enemy',
    text: med.icon + ' ' + escHtml(cs.enemy.name) + ' применил ' + med.name + ': +' + healed + ' HP' });
}

// ============================================================
// ГЕНЕРАЦИЯ ПВП-ВРАГА
// ============================================================

function buildPVPEnemy(zoneType) {
  var budget;
  if (Math.random() < 0.05) {
    budget = randInt(4500000, 8000000);
  } else if (zoneType === 'red') {
    budget = randInt(400000, 3000000);
  } else {
    budget = randInt(100000, 350000);
  }

  var remaining = budget;

  function spend(cost) {
    if (remaining >= cost) { remaining -= cost; return true; }
    return false;
  }

  function pickByBudget(pool, priceField) {
    var affordable = pool.filter(function(x) { return !x._inactive && x[priceField] <= remaining; });
    if (affordable.length === 0) return null;
    affordable.sort(function(a, b) { return b[priceField] - a[priceField]; });
    var top = affordable.slice(0, Math.min(3, affordable.length));
    return top[randInt(0, top.length - 1)];
  }

  var weapon    = pickByBudget(Object.values(WEAPONS), 'price');
  var weaponObj = weapon || Object.values(WEAPONS).filter(function(w) { return !w._inactive; })[0];
  if (weapon) spend(weapon.price);

  var compatAmmo = (weaponObj.compatAmmo || [])
    .map(function(id) { return AMMO[id]; })
    .filter(function(a) { return a && !a._inactive && a.price <= remaining; });
  compatAmmo.sort(function(a, b) { return b.price - a.price; });
  var ammoObj = compatAmmo[0] || null;
  if (ammoObj) spend(ammoObj.price);

  var helmet = pickByBudget(Object.values(EQUIPMENT).filter(function(e) { return e.slot === 'helmet'; }), 'price');
  if (helmet) spend(helmet.price);

  var vest = pickByBudget(Object.values(EQUIPMENT).filter(function(e) { return e.slot === 'vest'; }), 'price');
  if (vest) spend(vest.price);

  // 5. Модули — сохраняем объекты, считаем бонусы
  var totalAccBonus = 0, magBonus = 0;
  var equippedMods  = { scope: null, grip: null, magazine: null, stock: null };
  var modTypes = ['scope', 'grip', 'magazine', 'stock'];
  for (var mi = 0; mi < modTypes.length; mi++) {
    var mType = modTypes[mi];
    var mod   = pickByBudget(Object.values(MODULES).filter(function(m) { return m.type === mType; }), 'price');
    if (mod) {
      spend(mod.price);
      equippedMods[mType] = mod;
      if (mod.accuracyBonus) totalAccBonus += mod.accuracyBonus;
      if (mod.magBonus)      magBonus      += mod.magBonus;
    }
  }

  // 6. Разгрузка (rig) — определяет кол-во аптечек
  var rig = pickByBudget(Object.values(EQUIPMENT).filter(function(e) { return e.slot === 'rig'; }), 'price');
  if (rig) spend(rig.price);

  // 7. Аптечки — по medSlots разгрузки и бюджету
  var medkits = [];
  if (rig && rig.medSlots > 0) {
    var medPool = Object.values(MEDKITS).filter(function(m) { return !m._craft && m.price <= remaining; });
    medPool.sort(function(a, b) { return b.price - a.price; });
    var bestMed = medPool[0] || null;
    if (bestMed) {
      for (var ki = 0; ki < rig.medSlots; ki++) {
        if (remaining >= bestMed.price) {
          spend(bestMed.price);
          medkits.push(Object.assign({}, bestMed, { _uid: generateUid() }));
        }
      }
    }
  }

  // 8. Патроны — magSlots разгрузки × размер магазина; без riga — 1 магазин
  var magSlotsCount = rig ? rig.magSlots : 1;
  var magSize = (weaponObj.magSize || 20) + magBonus;
  var totalAmmo = magSlotsCount * magSize;
  if (ammoObj) {
    var ammoStackPrice = Math.floor(ammoObj.price * totalAmmo / 30);
    spend(ammoStackPrice);
  }

  // Строим физические магазины врага
  var enemyMagazines = [];
  var magModuleId    = equippedMods.magazine ? equippedMods.magazine.id : 'mag_t1';
  for (var ei = 0; ei < magSlotsCount; ei++) {
    enemyMagazines.push({
      _uid:       generateUid(),
      moduleId:   magModuleId,
      ammoId:     ammoObj ? ammoObj.id : null,
      ammoCount:  magSize,
      capacity:   magSize,
    });
  }

  // 9. Лут на остаток
  var lootItems = [];
  if (remaining > 5000) {
    var lootPool = Object.values(LOOT_ITEMS).filter(function(l) {
      return l.price <= remaining &&
        (l.rarity === 'rare' || l.rarity === 'valuable' || l.rarity === 'precious');
    });
    lootPool.sort(function(a, b) { return b.price - a.price; });
    var lootBudget = remaining;
    for (var li = 0; li < Math.min(4, lootPool.length); li++) {
      if (lootBudget >= lootPool[li].price) {
        lootItems.push(Object.assign({}, lootPool[li], { _uid: generateUid() }));
        lootBudget -= lootPool[li].price;
      }
    }
  }

  var accuracy = Math.min(99, (weaponObj.accuracy || 50) + totalAccBonus);
  var ammoDmg  = ammoObj ? ammoObj.dmg : 2;
  var ammoPen  = ammoObj ? ammoObj.pen : 1;
  var tier     = weaponObj.tier || 1;

  return {
    _pvp:           true,
    name:           LEADERBOARD_NAMES[randInt(0, LEADERBOARD_NAMES.length - 1)],
    icon:           '👤',
    hp:             100,
    accuracy:       accuracy,
    ammoDmg:        ammoDmg,
    ammoPen:        ammoPen,
    magSize:        magSize,
    magazines:      enemyMagazines,  // физические магазины врага
    totalAmmo:      totalAmmo,       // общий запас патронов
    currentMagAmmo: magSize,         // текущий магазин (полный в начале боя)
    activeMagIndex: 0,
    weaponType:     weaponObj.type,
    specialBonus:   weaponObj.specialBonus || null,
    headArmor:      helmet ? helmet.protection : 0,
    bodyArmor:      vest   ? vest.protection   : 0,
    tier:           tier,
    aggression:     0.55,
    medkits:        medkits,         // аптечки врага
    tacticLocked:   false,           // блокировка тактики (aimed_shot)
    dropWeapon:     Object.assign({}, weaponObj, { modules: equippedMods }),
    dropAmmo:       ammoObj ? Object.assign({}, ammoObj, { ammoCount: Math.floor(totalAmmo * 0.4) }) : null,
    dropHelmet:     helmet,
    dropVest:       vest,
    dropRig:        rig,
    dropLoot:       lootItems,
    budget:         budget,
  };
}

// ============================================================
// ДИАПАЗОН ВЫСТРЕЛОВ ПО ТИПУ ОРУЖИЯ
// ============================================================

function getWeaponShotsRange(weaponType) {
  var wt = WEAPON_TYPES[weaponType];
  return wt ? wt.shotsPerRound : { min: 3, max: 5 };
}

// ============================================================
// ИИ ВРАГА — выбор тактики
//
// Полная симметрия с игроком. Приоритеты:
//   0. Магазин пуст → обязательная перезарядка
//   1. Тактика заблокирована (aimed_shot прошлого хода) → normal_shot
//   2. Починка брони если броня < 40% и не использована
//   3. HP < 30%  → укрытие (50%), перезарядка (30%), укрытие+reload (20%)
//   4. HP 30–60% → шквал (40%), укрытие (30%), прицел (30%)
//   5. HP > 60%  → шквал (50%) или прицел (50%)
// ============================================================

function pickEnemyTactic() {
  var cs      = combatState;
  var hpRatio = cs.enemyHP / cs.enemyMaxHP;

  // 0. Пустой магазин — только перезарядка
  if (cs.enemyMagAmmo <= 0) {
    return COMBAT_TACTICS.reload;
  }

  // 1. Тактика заблокирована прошлым aimed_shot
  if (cs.enemyTacticLocked) {
    cs.enemyTacticLocked = false;
    return { id: 'normal_shot', name: 'Обычная стрельба', icon: '🔫', category: 'balanced' };
  }

  // 2. Починка брони (эффект применяется сразу, ход тратится)
  var totalArmorMax = cs.enemyArmor.headMax + cs.enemyArmor.bodyMax;
  if (!cs._enemyArmorRepairUsed && totalArmorMax > 0) {
    var totalArmor = cs.enemyArmor.head + cs.enemyArmor.body;
    if (totalArmor / totalArmorMax < 0.40) {
      cs._enemyArmorRepairUsed = true;
      cs.enemyArmor.head = cs.enemyArmor.headMax;
      cs.enemyArmor.body = cs.enemyArmor.bodyMax;
      return COMBAT_TACTICS.repair_armor;
    }
  }

  // 3. Критически мало HP
  if (hpRatio < 0.30) {
    var r3 = Math.random();
    if (r3 < 0.50) return COMBAT_TACTICS.cover_fire;
    if (r3 < 0.80) return COMBAT_TACTICS.reload;
    return COMBAT_TACTICS.cover_fire;
  }

  // 4. Средний HP
  if (hpRatio < 0.60) {
    var r4 = Math.random();
    if (r4 < 0.40) return COMBAT_TACTICS.suppression;
    if (r4 < 0.70) return COMBAT_TACTICS.cover_fire;
    return COMBAT_TACTICS.aimed_shot;
  }

  // 5. Полное HP — агрессия
  return Math.random() < 0.50
    ? COMBAT_TACTICS.suppression
    : COMBAT_TACTICS.aimed_shot;
}

// ============================================================
// ОБНОВЛЕНИЕ СТАТУСОВ КОНЕЧНОСТЕЙ
// ============================================================

function updateLimbStatus(log) {
  var ratio = combatState.playerHP / combatState.maxHP;

  if (ratio < LIMB_THRESHOLDS.arms.threshold && !combatState.limbs.arms) {
    combatState.limbs.arms = true;
    log.push({ type: 'limb', text: '🤕 ' + LIMB_THRESHOLDS.arms.desc });
  }
  if (ratio < LIMB_THRESHOLDS.legs.threshold && !combatState.limbs.legs) {
    combatState.limbs.legs = true;
    log.push({ type: 'limb', text: '🦽 ' + LIMB_THRESHOLDS.legs.desc });
  }
  if (ratio < LIMB_THRESHOLDS.chest.threshold && !combatState.limbs.chest) {
    combatState.limbs.chest = true;
    log.push({ type: 'limb', text: '🩸 ' + LIMB_THRESHOLDS.chest.desc });
  }
}

// ============================================================
// АПТЕЧКИ В БОЮ
// ============================================================

function useMedkit(medkitId) {
  if (!combatState || !combatState.active) return;

  var meds = gameData.loadout.medkits || [];
  var idx  = meds.findIndex(function(m) { return (m._uid || m.id) === medkitId; });
  if (idx === -1) { showToast('Аптечка не найдена', 'warning'); return; }

  var med    = meds[idx];
  var healed = Math.min(med.healAmount, combatState.maxHP - combatState.playerHP);
  combatState.playerHP += healed;

  var text = med.icon + ' ' + med.name + ': +' + healed + ' HP';
  if (med.healsBleeding && combatState.limbs.chest) {
    combatState.limbs.chest = false;
    text += ' · 🩸 кровотечение остановлено';
  }

  gameData.loadout.medkits.splice(idx, 1);
  combatState.log.push({
    round:   combatState.round,
    entries: [{ type: 'heal', text: text, side: 'player' }],
  });
  _syncHPToRaid();
  saveData();
  renderCombat();
}

// ============================================================
// ИСХОД БОЯ
// ============================================================

function endCombat(result) {
  combatState.active = false;
  combatState.result = result;

  if (result === 'win') {
    gameData.totalKills = (gameData.totalKills || 0) + 1;
  }

  _syncHPToRaid();
  saveData();
  renderCombat();
}

// ============================================================
// РЕНДЕР БОЕВОГО ЭКРАНА
// ============================================================

function renderCombat() {
  if (!combatState) return;
  var el = document.getElementById('tab-raid');
  if (!el) return;

  var cs  = combatState;
  var pa  = cs.playerArmor;
  var ea  = cs.enemyArmor;
  var env = cs.enemy;

  el.innerHTML = '<div class="combat-screen">' +

    '<div class="combat-side combat-player">' +
      '<div class="combatant-header">' +
        '<span class="combatant-name">👤 ' + escHtml(gameData.playerName) + '</span>' +
        '<span class="combatant-hp">' + Math.ceil(cs.playerHP) + ' / ' + cs.maxHP + ' HP</span>' +
      '</div>' +
      '<div class="hp-bar-wrap"><div class="hp-bar hp-bar-player" style="width:' + (cs.playerHP / cs.maxHP * 100) + '%"></div></div>' +
      '<div class="armor-status">' +
        '<span title="Броня головы">⛑️ ' + Math.ceil(pa.head) + '/' + pa.headMax + '</span>' +
        '<span title="Броня тела">🦺 ' + Math.ceil(pa.body) + '/' + pa.bodyMax + '</span>' +
        '<span title="Магазин">🔫 ' + cs.currentMagAmmo + '/' + _getCombatMagCap() + ' · резерв: ' + _getCombatTotalAmmo() + '</span>' +
      '</div>' +
      '<div class="limb-status">' +
        (cs.limbs.arms  ? '<span class="limb-tag limb-arms">🤕 Руки</span>'  : '') +
        (cs.limbs.legs  ? '<span class="limb-tag limb-legs">🦽 Ноги</span>'  : '') +
        (cs.limbs.chest ? '<span class="limb-tag limb-chest">🩸 Грудь</span>' : '') +
      '</div>' +
      (cs.tacticLockedNextRound ? '<div class="tactic-lock-warn">🔒 Следующий ход — только обычная стрельба</div>' : '') +
    '</div>' +

    '<div class="combat-vs">⚔️ Раунд ' + cs.round + '</div>' +

    '<div class="combat-side combat-enemy">' +
      '<div class="combatant-header">' +
        '<span class="combatant-name">' + env.icon + ' ' + escHtml(env.name) + '</span>' +
        '<span class="combatant-hp">' + Math.ceil(cs.enemyHP) + ' / ' + cs.enemyMaxHP + ' HP</span>' +
      '</div>' +
      '<div class="hp-bar-wrap"><div class="hp-bar hp-bar-enemy" style="width:' + (cs.enemyHP / cs.enemyMaxHP * 100) + '%"></div></div>' +
      '<div class="armor-status">' +
        '<span title="Броня головы">⛑️ ' + Math.ceil(ea.head) + '/' + ea.headMax + '</span>' +
        '<span title="Броня тела">🦺 ' + Math.ceil(ea.body) + '/' + ea.bodyMax + '</span>' +
        '<span title="Магазин врага">🔫 ' + cs.enemyMagAmmo + '/' + env.magSize + '</span>' +
        '<span style="color:' + getTierColor(env.tier || 1) + '">Тир ' + (env.tier || 1) + '</span>' +
      '</div>' +
      '<div class="armor-status">' +
        (cs.enemyMedkits && cs.enemyMedkits.length > 0
          ? cs.enemyMedkits.map(function(m){ return '<span title="' + m.name + '">' + m.icon + '</span>'; }).join('')
          : '<span style="color:var(--text3)">Аптечек нет</span>') +
      '</div>' +
    '</div>' +

    '<div class="combat-log">' +
      (cs.log.length > 0 ? renderLastRoundLog() : '<div class="log-placeholder">Выбери тактику для первого раунда</div>') +
    '</div>' +

    (!cs.active ? renderCombatResult() : '') +
    (cs.active && cs.awaitingAction ? renderTacticButtons() : '') +
    (cs.active ? renderMedkitButtons() : '') +

  '</div>';
}

// ============================================================
// РЕНДЕР ЛОГА ПОСЛЕДНЕГО РАУНДА
// ============================================================

function renderLastRoundLog() {
  if (!combatState.log.length) return '';
  var last    = combatState.log[combatState.log.length - 1];
  var entries = last.entries || [];

  var summaries = entries.filter(function(e) { return e.type === 'round-summary'; });
  var actions   = entries.filter(function(e) {
    return e.type === 'action' || e.type === 'heal' || e.type === 'repair' ||
           e.type === 'limb'   || e.type === 'bleed' || e.type === 'flee';
  });

  var html = '<div class="log-round-header">⚔️ Раунд ' + last.round + '</div>';

  actions.forEach(function(e) {
    html += '<div class="log-entry log-' + e.type + '">' + e.text + '</div>';
  });

  summaries.forEach(function(s) {
    var isP   = s.side === 'player';
    var label = isP
      ? ('👤 ' + escHtml(gameData.playerName))
      : (combatState.enemy.icon + ' ' + escHtml(combatState.enemy.name));
    var cls   = isP ? 'log-summary-player' : 'log-summary-enemy';
    var uid   = 'detail-' + s.side + '-' + last.round;

    html += '<div class="log-summary ' + cls + '">' +
      '<div class="log-summary-header">' +
        '<span class="log-summary-who">' + label + '</span>' +
        '<button class="btn-log-detail" onclick="toggleCombatDetail(\'' + uid + '\')">Детально</button>' +
      '</div>' +
      '<div class="log-summary-stats">' +
        '<span>🔫 ' + s.shots + ' выстр.</span>' +
        '<span>🎯 ' + s.hits + ' попад. <span class="log-hits-breakdown">(🔴 голова: ' + s.hitHead + ' · 🟠 тело: ' + s.hitBody + ')</span></span>' +
        '<span>💨 ' + s.misses + ' промах.</span>' +
        (s.armorBlocked > 0 ? '<span>🛡️ броня: ' + s.armorBlocked + '</span>' : '') +
        '<span class="' + (isP ? 'log-dmg-player' : 'log-dmg-enemy') + '">💥 урон: ' + s.totalDamage + '</span>' +
      '</div>' +
      '<div class="log-detail-panel" id="' + uid + '" style="display:none">' +
        renderBulletDetail(s.bulletLog, isP) +
      '</div>' +
    '</div>';
  });

  return html;
}

function renderBulletDetail(bulletLog, isPlayer) {
  if (!bulletLog || bulletLog.length === 0)
    return '<div class="log-detail-empty">Нет данных</div>';

  return bulletLog.map(function(b) {
    if (b.miss) return '<div class="log-bullet log-bullet-miss">💨 Пуля ' + b.bullet + ': промах</div>';
    var zoneIcon = b.zone === 'head' ? '🔴' : '🟠';
    var zoneName = b.zone === 'head' ? 'Голова' : 'Тело';
    var penetrated = b.pen >= b.armorVal && b.armorVal > 0;
    var armorTag = b.armorVal > 0
      ? (penetrated
          ? '<span class="tag-pen-ok">пробито</span>'
          : '<span class="tag-pen-no">не пробито (броня ' + b.armorVal + ')</span>')
      : '<span class="tag-no-armor">без брони</span>';

    return '<div class="log-bullet log-bullet-hit">' +
      zoneIcon + ' Пуля ' + b.bullet + ': <b>' + zoneName + '</b> &nbsp;|&nbsp; ' +
      'ПРБ <b>' + b.pen + '</b> · урон <b>' + b.rawDmg + '</b> &nbsp;' + armorTag + '&nbsp; ' +
      '→ <b class="' + (isPlayer ? 'clr-player' : 'clr-enemy') + '">' + b.finalDmg + ' HP</b>' +
      (b.absorbed > 0 ? '<span class="log-absorbed">(броня −' + b.absorbed + ')</span>' : '') +
    '</div>';
  }).join('');
}

function toggleCombatDetail(uid) {
  var el = document.getElementById(uid);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// ============================================================
// РЕНДЕР КНОПОК ТАКТИК
// ============================================================

function renderTacticButtons() {
  var cs = combatState;

  if (cs.tacticLockedNextRound) {
    return '<div class="tactic-buttons">' +
      '<div class="tactic-label">🔒 Прицельная стрельба — ход ' + cs.round + ': только обычная стрельба</div>' +
      '<div class="tactic-grid">' +
        '<button class="btn-tactic btn-balanced" onclick="playRound(\'normal_shot\')" title="Стрелять без модификаторов">' +
          '<span class="tactic-icon">🔫</span>' +
          '<span class="tactic-name">Стрелять</span>' +
        '</button>' +
      '</div></div>';
  }

  var rows = Object.values(COMBAT_TACTICS).map(function(t) {
    var blocked = t.repairArmor && cs.armorRepairUsed;
    return '<button class="btn-tactic btn-' + t.category + (blocked ? ' blocked' : '') + '"' +
      (blocked ? ' disabled' : '') +
      ' onclick="playRound(\'' + t.id + '\')"' +
      ' title="' + t.desc + '">' +
      '<span class="tactic-icon">' + t.icon + '</span>' +
      '<span class="tactic-name">' + t.name + '</span>' +
    '</button>';
  }).join('');

  return '<div class="tactic-buttons">' +
    '<div class="tactic-label">Выбери тактику — Раунд ' + cs.round + ':</div>' +
    '<div class="tactic-grid">' + rows + '</div>' +
  '</div>';
}

// ============================================================
// РЕНДЕР АПТЕЧЕК
// ============================================================

function renderMedkitButtons() {
  var meds = gameData.loadout.medkits;
  if (!meds || meds.length === 0) return '';
  return '<div class="medkit-bar">' +
    meds.map(function(m) {
      return '<button class="btn-medkit" onclick="useMedkit(\'' + (m._uid || m.id) + '\')" title="' + m.desc + '">' +
        m.icon + ' ' + m.name + ' (+' + m.healAmount + ')' +
      '</button>';
    }).join('') +
  '</div>';
}

// ============================================================
// РЕНДЕР ИТОГА БОЯ
// ============================================================

function renderCombatResult() {
  var cs     = combatState;
  var result = cs.result;
  var icon, text, btnLabel, btnAction;

  if (result === 'win') {
    icon = '🏆'; text = 'ПРОТИВНИК УНИЧТОЖЕН';
    btnLabel = 'Забрать лут'; btnAction = 'afterCombatWin()';
  } else if (result === 'flee') {
    icon = '🏃'; text = 'ПОБЕГ УДАЛСЯ';
    btnLabel = 'Продолжить рейд'; btnAction = 'afterCombatFlee()';
  } else if (result === 'draw') {
    icon = '💀'; text = 'НИЧЬЯ';
    btnLabel = 'Продолжить'; btnAction = 'afterCombatLose()';
  } else {
    icon = '💀'; text = 'ВЫ ПОГИБЛИ';
    btnLabel = 'К схрону'; btnAction = 'afterCombatLoseFinal()';
  }

  return '<div class="combat-result ' + (result === 'win' || result === 'flee' ? 'result-win' : 'result-lose') + '">' +
    '<div class="result-icon">' + icon + '</div>' +
    '<div class="result-text">' + text + '</div>' +
    '<button class="btn-primary" onclick="' + btnAction + '">' + btnLabel + '</button>' +
  '</div>';
}

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ — МАГАЗИНЫ ИГРОКА В БОЮ
// ============================================================

// Индекс первого заряженного магазина
function _getFirstLoadedMagIndex(magazines) {
  for (var i = 0; i < magazines.length; i++) {
    if (magazines[i].ammoCount > 0) return i;
  }
  return 0;
}

// Патроны в первом заряженном магазине (или 0 если нет)
function _getActiveMagAmmo(magazines) {
  for (var i = 0; i < magazines.length; i++) {
    if (magazines[i].ammoCount > 0) return magazines[i].ammoCount;
  }
  return 0;
}

// Ёмкость активного магазина
function _getCombatMagCap() {
  var cs  = combatState;
  var mags = cs ? cs.magazines : (gameData.loadout.magazines || []);
  var cap  = getMagCapacity(); // из script.js
  return cap || (mags.length > 0 ? mags[0].capacity : 1);
}

// Суммарно патронов в резерве (все магазины кроме активного + стак)
function _getCombatTotalAmmo() {
  var cs   = combatState;
  if (!cs) return 0;
  var total = 0;
  for (var i = 0; i < cs.magazines.length; i++) {
    if (i !== cs.activeMagIndex) total += cs.magazines[i].ammoCount || 0;
  }
  total += gameData.loadout.ammoCount || 0;
  return total;
}

// Перезарядка игрока: берём следующий заряженный магазин из массива
function _playerReload() {
  var cs   = combatState;
  var mags = cs.magazines;

  // Сохраняем остаток из текущего магазина обратно в объект
  if (mags[cs.activeMagIndex]) {
    mags[cs.activeMagIndex].ammoCount = cs.currentMagAmmo;
  }

  // Ищем следующий заряженный магазин (по кругу)
  var start = cs.activeMagIndex;
  for (var step = 1; step <= mags.length; step++) {
    var idx = (start + step) % mags.length;
    if (mags[idx].ammoCount > 0) {
      cs.activeMagIndex  = idx;
      cs.currentMagAmmo  = mags[idx].ammoCount;
      // Синхронизируем в loadout
      gameData.loadout.magazines = cs.magazines;
      saveData();
      return { text: '🔄 Магазин №' + (idx + 1) + '. Патронов: ' + cs.currentMagAmmo };
    }
  }

  // Нет заряженных магазинов — пробуем добрать из стака рюкзака
  var cap  = _getCombatMagCap();
  var stak = gameData.loadout.ammoCount || 0;
  if (stak > 0) {
    var take = Math.min(cap, stak);
    cs.currentMagAmmo = take;
    gameData.loadout.ammoCount -= take;
    cs.activeMagIndex = start;
    if (mags[start]) mags[start].ammoCount = take;
    gameData.loadout.magazines = cs.magazines;
    saveData();
    return { text: '🔄 Заряжено из рюкзака: ' + take + ' патр.' };
  }

  return { text: '🚫 Все магазины пусты — патронов нет!' };
}

// Перезарядка врага — симметрично игроку
function _enemyReload() {
  var cs   = combatState;
  var mags = cs.enemy.magazines || [];
  if (!mags.length) {
    // Fallback: заряжаем из totalAmmo
    var refill = Math.min(cs.enemy.magSize, cs.enemyTotalAmmo);
    cs.enemyMagAmmo    = refill;
    cs.enemyTotalAmmo -= refill;
    return { text: '🔄 ' + escHtml(cs.enemy.name) + ' перезарядился: ' + refill + ' патр.' };
  }

  // Сохраняем остаток в текущий магазин
  if (mags[cs.activeMagIndexEnemy || 0]) {
    mags[cs.activeMagIndexEnemy || 0].ammoCount = cs.enemyMagAmmo;
  }

  var start = cs.activeMagIndexEnemy || 0;
  for (var step = 1; step <= mags.length; step++) {
    var idx = (start + step) % mags.length;
    if (mags[idx].ammoCount > 0) {
      cs.activeMagIndexEnemy = idx;
      cs.enemyMagAmmo        = mags[idx].ammoCount;
      return { text: '🔄 ' + escHtml(cs.enemy.name) + ' сменил магазин: ' + cs.enemyMagAmmo + ' патр.' };
    }
  }
  return { text: '🚫 ' + escHtml(cs.enemy.name) + ' — все магазины пусты!' };
}

// Синхронизировать состояние магазинов после боя в loadout
function _syncMagsToLoadout() {
  if (combatState && combatState.magazines) {
    // Сохраняем текущий остаток в активный магазин
    if (combatState.magazines[combatState.activeMagIndex]) {
      combatState.magazines[combatState.activeMagIndex].ammoCount = combatState.currentMagAmmo;
    }
    gameData.loadout.magazines = combatState.magazines;
  }
}

// Устаревшая — оставляем для совместимости (использует враг)
function calcCurrentMagSize() {
  var lo     = gameData.loadout;
  var weapon = lo.weapon ? WEAPONS[lo.weapon] : null;
  if (!weapon) return 0;
  var magMod = lo.modules && lo.modules.magazine ? MODULES[lo.modules.magazine] : null;
  return weapon.magSize + (magMod ? (magMod.magBonus || 0) : 0);
}

// randInt, escHtml, generateUid, getTierColor, getMagCapacity, getTotalMagAmmo определены в script.js
