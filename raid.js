// ============================================================
// RAID.JS — Рейд
// Статичная карта 25×25, именованные клетки, красные зоны,
// лут по категориям, именные ключи, ПВП, эвакуация, смерть
// ============================================================

// ============================================================
// ПОСТРОЕНИЕ СТАТИЧНОЙ КАРТЫ
// Вызывается ОДИН РАЗ при первом создании аккаунта.
// Далее карта хранится в localStorage через gameData и
// никогда не перегенерируется — состояние клеток (visited,
// looted) сохраняется навсегда.
// ============================================================

function buildStaticMap() {
  const W = MAP_CONFIG.width;
  const H = MAP_CONFIG.height;
  const cells = [];

  for (let y = 0; y < H; y++) {
    cells[y] = [];
    for (let x = 0; x < W; x++) {
      const redData = RED_ZONE_INDEX[`${x}_${y}`];
      const isExit  = MAP_CONFIG.extractionPoints.some(e => e.x === x && e.y === y);

      if (redData) {
        cells[y][x] = {
          x, y,
          zoneType: 'red',
          zoneName: redData.zone.name,
          zoneIcon: redData.zone.icon,
          cellName: redData.cell.name,
          type:     redData.cell.type,
          keyId:    redData.cell.keyId || null,
          isExit:   false,
          looted:   false,
          visited:  false,
        };
      } else if (isExit) {
        const ep = MAP_CONFIG.extractionPoints.find(e => e.x === x && e.y === y);
        cells[y][x] = {
          x, y,
          zoneType: 'exit',
          cellName: ep.name,
          type:     'exit',
          isExit:   true,
          looted:   false,
          visited:  false,
        };
      } else {
        const nameIdx = (x * 7 + y * 13) % NORMAL_CELL_NAMES.length;
        cells[y][x] = {
          x, y,
          zoneType: 'normal',
          cellName: NORMAL_CELL_NAMES[nameIdx],
          type:     'pending',
          isExit:   false,
          looted:   false,
          visited:  false,
        };
      }
    }
  }

  return cells;
}

// Определить тип обычной клетки при первом посещении
function resolveNormalCell(cell) {
  if (cell.type !== 'pending') return;
  const r = Math.random();
  if (r < 0.40)      cell.type = 'loot';
  else if (r < 0.50) cell.type = 'loot_key';
  else               cell.type = 'empty';
}

// ============================================================
// СТАРТ РЕЙДА
// Карта берётся из gameData.persistentMap (создаётся один раз).
// Флаги visited/looted живут прямо в клетках persistentMap.
// ============================================================

function startRaid() {
  const lo = gameData.loadout;
  if (!lo.weapon) {
    showToast('Нет оружия!', 'warning');
    return;
  }

  // Автозарядка магазинов из стака при входе в рейд
  fillMagazinesFromStack();

  // Проверяем что хоть один магазин заряжен
  const totalAmmoReady = getTotalMagAmmo();
  if (totalAmmoReady === 0) {
    showToast('Нет патронов — зарядите магазины!', 'warning');
    return;
  }

  // Гарантируем что persistentMap уже существует (создаётся в init)
  if (!gameData.persistentMap) {
    gameData.persistentMap = buildStaticMap();
  }

  const spawnPoints = [
    { x: 1,  y: 1  }, { x: 23, y: 1  },
    { x: 1,  y: 23 }, { x: 23, y: 23 },
    { x: 12, y: 1  }, { x: 1,  y: 12 },
  ];
  const spawn = spawnPoints[randInt(0, spawnPoints.length - 1)];

  // Отмечаем стартовую клетку
  gameData.persistentMap[spawn.y][spawn.x].visited = true;
  resolveNormalCell(gameData.persistentMap[spawn.y][spawn.x]);

  gameData.raid = {
    active:       true,
    playerX:      spawn.x,
    playerY:      spawn.y,
    inCombat:     false,
    playerHP:     100,
    limbs:        { arms: false, legs: false, chest: false },
    loot:         [...(gameData.loadout.backpackItems || [])], // содержимое рюкзака идёт в рейд
    startLoadout: JSON.parse(JSON.stringify(gameData.loadout)),
  };

  // Ключница → доступные ключи в рейде
  gameData.loadout.keys = (gameData.loadout.keyring || []).filter(Boolean).map(k => ({...k}));

  gameData.totalRaids = (gameData.totalRaids || 0) + 1;
  saveData();
  switchTab('tab-raid');
}

// ============================================================
// РЕНДЕР РЕЙДА
// ============================================================

function renderRaidScreen() {
  if (!gameData.raid || !gameData.raid.active) return;
  const raid = gameData.raid;

  // Если inCombat=true но combatState потерян (перезагрузка страницы) — сбрасываем флаг
  if (raid.inCombat && (!combatState || !combatState.active)) {
    raid.inCombat = false;
    saveData();
  }
  if (raid.inCombat && combatState && combatState.active) {
    renderCombat();
    return;
  }

  const el   = document.getElementById('tab-raid');
  const map  = gameData.persistentMap;
  const cell = map[raid.playerY][raid.playerX];

  const backpack  = gameData.loadout.backpack ? EQUIPMENT[gameData.loadout.backpack] : null;
  const maxWeight = backpack ? backpack.carryWeight : 5;
  const curWeight = raid.loot.reduce((s, i) => s + (i.weight || 0), 0);

  const playerHP = combatState ? combatState.playerHP : (gameData.raid.playerHP || 100);
  const maxHP    = 100;
  const limbs    = combatState ? combatState.limbs : (gameData.raid.limbs || { arms: false, legs: false, chest: false });

  const exits = MAP_CONFIG.extractionPoints;
  const nearestExit = exits.reduce((best, ep) => {
    const dist = Math.abs(ep.x - raid.playerX) + Math.abs(ep.y - raid.playerY);
    return dist < best.dist ? { ...ep, dist } : best;
  }, { dist: Infinity });

  const isRed     = cell.zoneType === 'red';
  const isExitCell= cell.zoneType === 'exit';
  const zoneLabel = isExitCell ? '🚁 ВЫХОД'
                  : isRed      ? `🔴 ${cell.zoneName.toUpperCase()}`
                  :              '⬜ ОБЫЧНАЯ ЗОНА';
  const zoneClass = isExitCell ? 'zone-exit' : isRed ? 'zone-hot' : 'zone-safe';

  el.innerHTML = `
    <div class="raid-screen">

      <div class="raid-player-status">
        <div class="raid-hp">
          <div class="hp-bar-wrap">
            <div class="hp-bar hp-bar-player" style="width:${playerHP / maxHP * 100}%"></div>
          </div>
          <span>${Math.ceil(playerHP)} / ${maxHP} HP</span>
        </div>
        <div class="raid-limbs">
          ${limbs.arms  ? `<span class="limb-tag limb-arms">🤕 Руки</span>`  : ''}
          ${limbs.legs  ? `<span class="limb-tag limb-legs">🦽 Ноги</span>`  : ''}
          ${limbs.chest ? `<span class="limb-tag limb-chest">🩸 Грудь</span>` : ''}
        </div>
        <div class="raid-ammo">
          🔫 ${gameData.loadout.ammoCount || 0} патр.
          &nbsp;|&nbsp;
          🎒 ${curWeight.toFixed(1)} / ${maxWeight} кг
          &nbsp;|&nbsp;
          🚁 ~${nearestExit.dist} кл.
        </div>
      </div>

      <div class="raid-location">
        <div class="location-zone ${zoneClass}">${zoneLabel}</div>
        <div class="location-cellname">${cell.cellName}</div>
        <div class="location-coords">[ ${raid.playerX} : ${raid.playerY} ]</div>
      </div>

      ${renderMapD(raid.playerX, raid.playerY)}

      <div class="raid-nav">
        ${renderNav8(raid.playerX, raid.playerY)}
      </div>

      <div class="cell-actions">
        ${renderCellActions(cell)}
      </div>

      ${raid.loot.length > 0 ? renderRaidLoot(raid.loot, curWeight, maxWeight) : ''}
    </div>
  `;
}

// ============================================================
// КАРТА — КОНЦЕПТ D (3×3 вокруг игрока)
// ============================================================

function renderMapD(px, py) {
  const map = gameData.persistentMap;
  let html = '<div class="raid-map-d">';

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = px + dx;
      const cy = py + dy;
      const isMe = dx === 0 && dy === 0;

      // За границей карты — пустая клетка
      if (cx < 0 || cx >= MAP_CONFIG.width || cy < 0 || cy >= MAP_CONFIG.height) {
        html += '<div class="rmd-cell rmd-oob"><div class="rmd-coord">—</div><div class="rmd-icon">🚫</div><div class="rmd-name">Граница</div><div class="rmd-status s-empty">ПРЕДЕЛ</div></div>';
        continue;
      }

      const cell    = map[cy][cx];
      const t       = cell.type;
      const looted  = cell.looted;
      const visited = cell.visited;

      // CSS-класс фона
      let cls = 'rmd-cell ';
      if (isMe) {
        cls += 'rmd-me';
      } else if (cell.zoneType === 'exit') {
        cls += 'rmd-exit';
      } else if (t === 'red_safe' || t === 'red_free_safe') {
        cls += 'rmd-safe';
      } else if (cell.zoneType === 'red') {
        cls += 'rmd-red';
      } else {
        cls += 'rmd-norm';
      }
      if (!isMe && looted)  cls += ' rmd-looted';
      if (!isMe && visited && !looted) cls += ' rmd-visited';

      // Иконка
      const icon = isMe ? '🎯' : getCellIcon(cell);

      // Имя
      const nameRaw = cell.cellName || '';
      const name = nameRaw.length > 10 ? nameRaw.slice(0, 9) + '…' : nameRaw;

      // Статус
      let statusCls, statusTxt;
      if (isMe) {
        statusCls = 's-me';
        statusTxt = '▌ ЗДЕСЬ';
      } else if (looted) {
        statusCls = 's-clear';
        statusTxt = 'ОБЫСКАНО';
      } else if (cell.zoneType === 'exit') {
        statusCls = 's-exit';
        statusTxt = '🚁 ВЫХОД';
      } else if (t === 'red_paid_safe') {
        statusCls = 's-safe';
        statusTxt = '🔑 СЕЙФ';
      } else if (t === 'red_free_safe') {
        statusCls = 's-safe';
        statusTxt = '🗄 СЕЙФ';
      } else if (cell.zoneType === 'red') {
        statusCls = 's-loot';
        statusTxt = '⚠ УГРОЗА';
      } else if (t === 'loot' || t === 'loot_key') {
        statusCls = 's-loot';
        statusTxt = 'ЛУТ';
      } else if (t === 'empty') {
        statusCls = 's-empty';
        statusTxt = 'ПУСТО';
      } else {
        statusCls = 's-empty';
        statusTxt = '···';
      }

      // Угловые маркеры для текущей позиции
      const corners = isMe
        ? '<span class="rmd-corner nw">◤</span><span class="rmd-corner ne">◥</span><span class="rmd-corner sw">◣</span><span class="rmd-corner se">◢</span>'
        : '';

      html += `
        <div class="${cls}">
          ${corners}
          <div class="rmd-coord">[${cx}:${cy}]</div>
          <div class="rmd-icon">${icon}</div>
          <div class="rmd-name">${name}</div>
          <div class="rmd-status ${statusCls}">${statusTxt}</div>
        </div>`;
    }
  }

  html += '</div>';
  return html;
}

// Иконка клетки по типу
function getCellIcon(cell) {
  if (cell.zoneType === 'exit') return '🚁';
  if (cell.type === 'red_paid_safe') return '🔒';
  if (cell.type === 'red_free_safe') return '🗄️';
  if (cell.zoneType === 'red')       return cell.zoneIcon || '🔴';

  const iconMap = {
    'Лес':       '🌲', 'Деревня': '🏚️', 'Поле':    '🌾',
    'Холмы':     '⛰️', 'Поляна':  '🍃', 'Перелесок':'🌳',
    'Пустырь':   '🏜️', 'Развалины':'🧱', 'Овраг':   '〰️',
    'Брод':      '💧',
  };
  return iconMap[cell.cellName] || '🌿';
}

// ============================================================
// 8-НАПРАВЛЕННАЯ НАВИГАЦИЯ
// ============================================================

function renderNav8(px, py) {
  // Сетка 3×3: [dx,dy] по порядку строк
  const dirs = [
    [-1,-1], [0,-1], [1,-1],
    [-1, 0], [0, 0], [1, 0],
    [-1, 1], [0, 1], [1, 1],
  ];

  const arrows = ['↖','↑','↗','←','','→','↙','↓','↘'];

  let html = '<div class="nav8-grid">';
  dirs.forEach(([dx, dy], i) => {
    if (dx === 0 && dy === 0) {
      // Центр — компас
      html += `<div class="nav8-center">
        <span style="font-size:16px">🧭</span>
        <span class="nav8-pos">${px}:${py}</span>
      </div>`;
      return;
    }

    const nx = px + dx, ny = py + dy;
    const inBounds = nx >= 0 && nx < MAP_CONFIG.width && ny >= 0 && ny < MAP_CONFIG.height;
    const disabled = !inBounds ? 'disabled' : '';

    html += `<button class="nav8-btn" onclick="movePlayer(${dx},${dy})" ${disabled}>
      ${arrows[i]}
    </button>`;
  });
  html += '</div>';
  return html;
}

// ============================================================
// ИНФОРМАЦИЯ О КЛЕТКЕ (для actions)
// ============================================================

function renderCellInfo(cell) {
  if (cell.isExit) return `<div class="cell-icon">🚁</div><div class="cell-label">Точка эвакуации</div>`;
  if (cell.looted) return `<div class="cell-icon">📭</div><div class="cell-label">Уже обыскано</div>`;

  switch (cell.type) {
    case 'loot':
    case 'loot_key':
      return `<div class="cell-icon">📦</div><div class="cell-label">Здесь есть лут</div>`;
    case 'red_loot':
      return `<div class="cell-icon">🔴</div><div class="cell-label">Зона высокой ценности</div><div class="cell-sub">Лучший лут, высокий ПВП</div>`;
    case 'red_free_safe':
      return `<div class="cell-icon">🗄️</div><div class="cell-label">Бесплатный сейф</div>`;
    case 'red_paid_safe': {
      const keyData = cell.keyId ? ZONE_KEYS[cell.keyId] : null;
      const keyName = keyData ? keyData.name : 'ключ';
      return `<div class="cell-icon">🔒</div><div class="cell-label">Сейф</div><div class="cell-sub">Нужен: ${keyName}</div>`;
    }
    case 'empty':
    case 'pending':
    default:
      return `<div class="cell-icon">🌫️</div><div class="cell-label">Пусто</div>`;
  }
}

// ============================================================
// ДЕЙСТВИЯ НА КЛЕТКЕ
// ============================================================

function renderCellActions(cell) {
  const actions = [];

  if (cell.isExit) {
    actions.push(`<button class="btn-primary btn-extract" onclick="extractRaid()">🚁 ЭВАКУИРОВАТЬСЯ</button>`);
  }

  if (!cell.looted) {
    if (cell.type === 'loot' || cell.type === 'loot_key' || cell.type === 'red_loot') {
      actions.push(`<button class="btn-secondary" onclick="searchCell()">🔍 Обыскать</button>`);
    }
    if (cell.type === 'red_free_safe') {
      actions.push(`<button class="btn-secondary" onclick="openFreeSafe()">🗄️ Открыть сейф</button>`);
    }
    if (cell.type === 'red_paid_safe') {
      const keyData = cell.keyId ? ZONE_KEYS[cell.keyId] : null;
      const hasKey  = keyData && (gameData.loadout.keys || []).some(k => k.id === cell.keyId && (k.uses || 0) > 0);
      const keyName = keyData ? keyData.name : 'ключ';
      actions.push(`
        <button class="btn-secondary" onclick="openPaidSafe()"
                ${hasKey ? '' : 'disabled'}
                title="${hasKey ? `Открыть (${keyName})` : `Нужен: ${keyName}`}">
          🔑 Открыть сейф ${hasKey ? '' : '(нет ключа)'}
        </button>
      `);
    }
  }

  const meds = gameData.loadout.medkits;
  if (meds && meds.length > 0) {
    actions.push(`
      <div class="medkit-bar">
        ${meds.map(m => `
          <button class="btn-medkit" onclick="useFieldMedkit('${m._uid || m.id}')">
            ${m.icon} ${m.name}
          </button>
        `).join('')}
      </div>
    `);
  }

  return actions.join('') || '<div class="no-actions">Нечего делать здесь</div>';
}

function renderRaidLoot(loot, curWeight, maxWeight) {
  return `
    <div class="raid-loot">
      <h4>🎒 Найдено (${curWeight.toFixed(1)} / ${maxWeight} кг)</h4>
      <div class="loot-list">
        ${loot.map(item => {
          const rarityColor = LOOT_RARITY_COLORS[item.rarity] || '#fff';
          const hasAmmo     = item.ammoCount > 0;
          const hasModules  = item.type && WEAPON_TYPES[item.type];
          return `
            <div class="loot-item">
              <span style="color:${rarityColor}">${item.icon} ${escHtml(item.name)}${hasAmmo ? ' · ' + item.ammoCount + ' шт.' : ''}</span>
              <span class="loot-value">${formatCoins(item.price || 0)}</span>
              <span class="loot-weight">${item.weight} кг</span>
              <span class="loot-item-actions">
                ${hasAmmo    ? `<button class="btn-drop" title="Выщелкнуть патроны" onclick="openRaidEjectModal('${item._uid}')">📤</button>` : ''}
                ${hasModules ? `<button class="btn-drop" title="Модули" onclick="openRaidWeaponModsModal('${item._uid}')">🔧</button>` : ''}
                ${curWeight > maxWeight
                  ? `<button class="btn-drop" onclick="dropRaidItem('${item._uid}')">✕</button>`
                  : ''}
              </span>
            </div>
          `;
        }).join('')}
      </div>
      ${curWeight > maxWeight ? `<div class="overweight-warn">⚠️ Перегруз! Выброси лишнее</div>` : ''}
    </div>
  `;
}

// ============================================================
// ДВИЖЕНИЕ (8 направлений)
// ============================================================

function canMove(dx, dy) {
  if (!gameData.raid) return false;
  const nx = gameData.raid.playerX + dx;
  const ny = gameData.raid.playerY + dy;
  return nx >= 0 && nx < MAP_CONFIG.width && ny >= 0 && ny < MAP_CONFIG.height;
}

function movePlayer(dx, dy) {
  const raid = gameData.raid;
  if (!raid || !raid.active) return;
  if (!canMove(dx, dy)) return;

  raid.playerX += dx;
  raid.playerY += dy;

  const map  = gameData.persistentMap;
  const cell = map[raid.playerY][raid.playerX];
  cell.visited = true;

  if (cell.type === 'pending') resolveNormalCell(cell);

  // Кровотечение (используем raid.limbs — единственный источник истины между боями)
  const raidLimbs = raid.limbs || { arms: false, legs: false, chest: false };
  raid.limbs = raidLimbs;
  if (raidLimbs.chest) {
    const bleed = LIMB_THRESHOLDS.chest.penaltyValue;
    raid.playerHP = Math.max(0, (raid.playerHP || 100) - bleed);
    showToast(`🩸 Кровотечение: −${bleed} HP`, 'danger');
    if (raid.playerHP <= 0) { playerDied(); return; }
  }

  // ПВП
  const pvpChance = cell.zoneType === 'red'
    ? MAP_CONFIG.pvpChance.red
    : MAP_CONFIG.pvpChance.normal;

  if (Math.random() < pvpChance) {
    triggerPVP();
    return;
  }

  saveData();
  renderRaidScreen();
}

// ============================================================
// ГЕНЕРАЦИЯ ЛУТА
// ============================================================

function generateLootItems(zoneType, count = 1) {
  const chances = LOOT_SPAWN_CHANCES[zoneType] || LOOT_SPAWN_CHANCES.normal;
  const result  = [];

  for (let i = 0; i < count; i++) {
    const rarity = rollRarity(chances);
    const pool   = Object.values(LOOT_ITEMS).filter(l => l.rarity === rarity);
    if (pool.length === 0) continue;
    const item = pool[randInt(0, pool.length - 1)];
    result.push({ ...item, _uid: generateUid() });
  }
  return result;
}

function generateSafeLoot(safeType, count = 2) {
  const chances = SAFE_LOOT_CHANCES[safeType] || SAFE_LOOT_CHANCES.free;
  const result  = [];

  for (let i = 0; i < count; i++) {
    const rarity = rollRarityFromMap(chances);
    const pool   = Object.values(LOOT_ITEMS).filter(l => l.rarity === rarity);
    if (pool.length === 0) continue;
    const item = pool[randInt(0, pool.length - 1)];
    result.push({ ...item, _uid: generateUid() });
  }
  return result;
}

function rollRarity(chances) {
  const r = Math.random();
  let acc = 0;
  for (const [rarity, chance] of Object.entries(chances)) {
    acc += chance;
    if (r < acc) return rarity;
  }
  return 'junk';
}

function rollRarityFromMap(chances) {
  const r = Math.random();
  let acc = 0;
  for (const [rarity, chance] of Object.entries(chances)) {
    acc += chance;
    if (r < acc) return rarity;
  }
  return 'rare';
}

function trySpawnKey(zoneType) {
  const chance = KEY_SPAWN_CHANCE[zoneType] || 0;
  if (Math.random() > chance) return null;

  const keyPool = Object.values(ZONE_KEYS);
  const key     = keyPool[randInt(0, keyPool.length - 1)];
  return { ...key, uses: key.uses, _uid: generateUid() };
}

// ============================================================
// ОБЫСК КЛЕТКИ
// ============================================================

function searchCell() {
  const raid = gameData.raid;
  const map  = gameData.persistentMap;
  const cell = map[raid.playerY][raid.playerX];
  if (cell.looted) return;

  cell.looted = true;
  const zoneType = cell.zoneType === 'red' ? 'red' : 'normal';
  const count    = zoneType === 'red' ? randInt(2, 3) : randInt(1, 2);
  const loot     = generateLootItems(zoneType, count);
  const gearDrops = generateGearDrop(zoneType);
  loot.push(...gearDrops);
  const key = trySpawnKey(zoneType);
  if (key) loot.push(key);

  saveData();

  if (loot.length === 0) { showToast('Ничего нет', 'info'); renderRaidScreen(); return; }
  openLootPickerModal(loot);
  renderRaidScreen();
}

// ============================================================
// ПИКЕР ЛУТА — модалка выбора предметов при обыске
// ============================================================

function openLootPickerModal(foundLoot) {
  const backpack  = gameData.loadout.backpack ? EQUIPMENT[gameData.loadout.backpack] : null;
  const maxWeight = backpack ? backpack.carryWeight : 0;

  const overlay = document.createElement('div');
  overlay.id = 'loot-picker-overlay';
  overlay.className = 'modal-overlay';

  function buildContent() {
    const curCarry = (gameData.raid.loot || []).reduce((s, i) => s + (i.weight || 0), 0);
    const rows = foundLoot.map(item => {
      const tierColor = item.tier
        ? getTierColor(item.tier)
        : (LOOT_RARITY_COLORS && LOOT_RARITY_COLORS[item.rarity]) || '#94a3b8';
      const sellPrice = getItemSellPrice(item);
      const canTake   = backpack && (curCarry + (item.weight || 0) <= maxWeight);
      return `
        <div class="loot-pick-row" style="border-color:${tierColor}33">
          <div class="loot-pick-icon">${item.icon || '📦'}</div>
          <div class="loot-pick-info">
            <div class="loot-pick-name" style="color:${tierColor}">${escHtml(item.name)}</div>
            <div class="loot-pick-meta">${item.weight ? item.weight.toFixed(1) + ' кг' : '—'} · ${CURRENCY_ICON} ${fmtNum(sellPrice)}</div>
          </div>
          <button class="btn-primary btn-small loot-take-btn"
                  onclick="takeLootItem('${item._uid}')"
                  ${canTake ? '' : 'disabled'}
                  title="${canTake ? 'Подобрать' : backpack ? 'Рюкзак полон' : 'Нет рюкзака'}">
            ${canTake ? '+ Взять' : backpack ? '⚠️ Полно' : '❌ Рюкзак'}
          </button>
        </div>`;
    }).join('');

    return `
      <div class="modal-box item-detail-modal">
        <div class="modal-title">🔍 Найдено (${foundLoot.length} предм.)</div>
        <div class="backpack-capacity-info">🎒 Рюкзак: ${curCarry.toFixed(1)} / ${maxWeight} кг</div>
        <div class="loot-pick-list">${rows || '<div class="empty-sub">Всё подобрано</div>'}</div>
        <div class="modal-actions">
          <button class="btn-primary" onclick="takeAllLoot()">+ Взять всё</button>
          <button class="btn-secondary" onclick="closeModal('loot-picker-overlay')">Закрыть</button>
        </div>
      </div>`;
  }

  overlay.innerHTML = buildContent();
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal('loot-picker-overlay'); });
  window._currentFoundLoot = foundLoot;
  window._lootPickerOverlay = overlay;
  window._buildLootPickerContent = buildContent;
  document.body.appendChild(overlay);
}

function takeLootItem(uid) {
  const foundLoot = window._currentFoundLoot;
  if (!foundLoot) return;
  const idx = foundLoot.findIndex(i => i._uid === uid);
  if (idx === -1) return;
  const item = foundLoot[idx];
  const backpack  = gameData.loadout.backpack ? EQUIPMENT[gameData.loadout.backpack] : null;
  const maxWeight = backpack ? backpack.carryWeight : 0;
  const curCarry  = (gameData.raid.loot || []).reduce((s, i) => s + (i.weight || 0), 0);
  if (!backpack || curCarry + (item.weight || 0) > maxWeight) { showToast('⚠️ Рюкзак полон!', 'warning'); return; }
  foundLoot.splice(idx, 1);
  gameData.raid.loot.push(item);
  saveData();
  showToast(`+ ${item.name}`, 'success');
  const overlay = window._lootPickerOverlay;
  if (overlay) {
    if (foundLoot.length === 0) { closeModal('loot-picker-overlay'); }
    else overlay.innerHTML = window._buildLootPickerContent();
  }
}

function takeAllLoot() {
  const foundLoot = window._currentFoundLoot;
  if (!foundLoot) return;
  const backpack  = gameData.loadout.backpack ? EQUIPMENT[gameData.loadout.backpack] : null;
  const maxWeight = backpack ? backpack.carryWeight : 0;
  let added = 0;
  const toAdd = [...foundLoot];
  foundLoot.length = 0;
  toAdd.forEach(item => {
    const curCarry = (gameData.raid.loot || []).reduce((s, i) => s + (i.weight || 0), 0);
    if (backpack && curCarry + (item.weight || 0) <= maxWeight) {
      gameData.raid.loot.push(item); added++;
    } else { foundLoot.push(item); }
  });
  saveData();
  if (added > 0) showToast(`🎒 +${added} предметов`, 'success');
  if (foundLoot.length > 0) showToast(`⚠️ ${foundLoot.length} не влезло`, 'warning');
  const overlay = window._lootPickerOverlay;
  if (overlay) {
    if (foundLoot.length === 0) closeModal('loot-picker-overlay');
    else overlay.innerHTML = window._buildLootPickerContent();
  }
}

function renderRaidLoot(loot, curWeight, maxWeight) {
  return `
    <div class="raid-loot">
      <h4>🎒 Рюкзак (${curWeight.toFixed(1)} / ${maxWeight} кг)</h4>
      <div class="loot-list">
        ${loot.map(item => {
          const rarityColor = item.tier ? getTierColor(item.tier) : (LOOT_RARITY_COLORS[item.rarity] || '#fff');
          const sellPrice = getItemSellPrice(item);
          return `
            <div class="loot-item" onclick="openRaidItemModal('${item._uid}')" style="cursor:pointer">
              <span style="color:${rarityColor}">${item.icon || '📦'} ${escHtml(item.name)}${item.ammoCount ? ' · ' + item.ammoCount + ' шт.' : ''}</span>
              <span class="loot-value">${CURRENCY_ICON} ${fmtNum(sellPrice)}</span>
              <span class="loot-weight">${item.weight ? item.weight.toFixed(1) : 0} кг</span>
            </div>`;
        }).join('')}
      </div>
      ${curWeight > maxWeight ? `<div class="overweight-warn">⚠️ Перегруз! Нажми на предмет чтобы выбросить</div>` : ''}
    </div>
  `;
}

function openRaidItemModal(uid) {
  if (!gameData.raid) return;
  const item = (gameData.raid.loot || []).find(i => i._uid === uid);
  if (!item) return;
  const tierColor = item.tier
    ? getTierColor(item.tier)
    : (LOOT_RARITY_COLORS && LOOT_RARITY_COLORS[item.rarity]) || '#94a3b8';
  const sellPrice = getItemSellPrice(item);
  const descLines = getItemDescription(item).split('\n');

  const overlay = document.createElement('div');
  overlay.id = 'raid-item-modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box item-detail-modal">
      <div class="item-modal-header" style="border-color:${tierColor}">
        <div class="item-modal-icon">${item.icon || '📦'}</div>
        <div class="item-modal-title">
          <div class="item-modal-name">${escHtml(item.name)}</div>
          <div class="item-modal-tier" style="color:${tierColor}">${
            item.tier ? 'Тир ' + item.tier : (item.rarity || '')
          }${item.weight ? ' · ' + item.weight.toFixed(1) + ' кг' : ''}</div>
        </div>
      </div>
      <div class="item-modal-desc">
        ${descLines.map(l => `<div class="desc-line">${escHtml(l)}</div>`).join('')}
      </div>
      <div class="item-modal-prices">
        <div class="price-row">
          <span class="price-label">${item.rarity ? 'Цена торговца' : 'Рыночная цена (мин.)'}</span>
          <span class="price-val sell-price">${CURRENCY_ICON} ${fmtNum(sellPrice)}</span>
        </div>
      </div>
      <div class="item-modal-actions">
        <button class="btn-danger-ghost" onclick="dropRaidItemModal('${uid}')">🗑️ Выбросить</button>
        <button class="btn-secondary" onclick="closeModal('raid-item-modal-overlay')">Закрыть</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal('raid-item-modal-overlay'); });
}

function dropRaidItemModal(uid) {
  closeModal('raid-item-modal-overlay');
  dropRaidItem(uid);
}

// ============================================================
// ДРОП СНАРЯЖЕНИЯ (оружие, патроны, броня, снаряга)
// ============================================================

function generateGearDrop(zoneType) {
  const result  = [];
  const chances = GEAR_DROP_CHANCES[zoneType] || GEAR_DROP_CHANCES.normal;

  // Для каждой категории — один независимый бросок
  const categories = ['weapon', 'ammo', 'armor', 'gear', 'module'];
  for (const cat of categories) {
    const tierChances = chances[cat];
    // Перебираем тиры от высшего к низшему — первый выпавший побеждает
    for (const tier of [4, 3, 2, 1]) {
      const chance = tierChances[tier] || 0;
      if (chance > 0 && Math.random() < chance) {
        const item = rollGearItem(cat, tier, zoneType);
        if (item) result.push(item);
        break; // только один предмет за категорию за обыск
      }
    }
  }
  return result;
}

function rollGearItem(category, tier, zoneType) {
  if (category === 'weapon') {
    const pool = Object.values(WEAPONS).filter(
      w => w.tier === tier && !w._inactive
    );
    if (pool.length === 0) return null;
    const weapon = pool[randInt(0, pool.length - 1)];

    // Оружие заряжено: 1 магазин в стволе + 1 запасной
    const ammoId  = pickAmmoForWeapon(weapon, tier);
    const ammoObj = ammoId ? AMMO[ammoId] : null;
    const ammoCount = weapon.magSize * 2; // 1 заряженный + 1 запасной

    return {
      ...weapon,
      _uid: generateUid(),
      _isFoundWeapon: true,
      _foundAmmoId:   ammoId,
      _foundAmmoCount: ammoCount,
      weight: weapon.weight,
      // Сообщаем игроку что с оружием
      desc: `${weapon.desc} [Заряжено: ${ammoCount} × ${ammoObj ? ammoObj.name : '?'}]`,
    };
  }

  if (category === 'ammo') {
    // Выбираем случайный тип патронов нужного тира
    const pool = Object.values(AMMO).filter(
      a => a.tier === tier && !a._inactive
    );
    if (pool.length === 0) return null;
    const ammo = pool[randInt(0, pool.length - 1)];
    return {
      ...ammo,
      _uid:       generateUid(),
      ammoCount:  AMMO_STACK_SIZE,
      weight:     0, // патроны без веса
      name:       `${ammo.name} ×${AMMO_STACK_SIZE}`,
      price:      ammo.price * AMMO_STACK_SIZE,
      _isAmmoStack: true,
    };
  }

  if (category === 'armor') {
    // Шлем или броник 50/50
    const slot = Math.random() < 0.5 ? 'helmet' : 'vest';
    const pool = Object.values(EQUIPMENT).filter(
      e => e.slot === slot && e.tier === tier && !e._inactive
    );
    if (pool.length === 0) return null;
    return { ...pool[randInt(0, pool.length - 1)], _uid: generateUid() };
  }

  if (category === 'gear') {
    // Рюкзак или разгрузка 50/50
    const slot = Math.random() < 0.5 ? 'backpack' : 'rig';
    const pool = Object.values(EQUIPMENT).filter(
      e => e.slot === slot && e.tier === tier && !e._inactive
    );
    if (pool.length === 0) return null;
    return { ...pool[randInt(0, pool.length - 1)], _uid: generateUid() };
  }

  if (category === 'module') {
    // Случайный тип модуля
    const moduleTypes = ['magazine', 'scope', 'grip', 'stock'];
    const mType = moduleTypes[randInt(0, moduleTypes.length - 1)];
    const pool = Object.values(MODULES).filter(
      m => m.type === mType && m.tier === tier && !m._inactive
    );
    if (pool.length === 0) return null;
    return { ...pool[randInt(0, pool.length - 1)], _uid: generateUid() };
  }

  return null;
}

// Выбрать патрон соответствующего тира для оружия
function pickAmmoForWeapon(weapon, tier) {
  const compat = (weapon.compatAmmo || []).map(id => AMMO[id]).filter(
    a => a && a.tier === tier && !a._inactive
  );
  if (compat.length > 0) return compat[randInt(0, compat.length - 1)].id;

  // fallback — любой совместимый патрон
  const any = (weapon.compatAmmo || []).map(id => AMMO[id]).filter(
    a => a && !a._inactive
  );
  if (any.length > 0) return any[randInt(0, any.length - 1)].id;
  return null;
}

// ============================================================
// ДОБАВЛЕНИЕ ЛУТА В РЕЙД
// ============================================================

function addLootToRaid(loot) {
  if (loot.length === 0) {
    showToast('Ничего нет', 'info');
    return;
  }

  const raid      = gameData.raid;
  const backpack  = gameData.loadout.backpack ? EQUIPMENT[gameData.loadout.backpack] : null;
  const maxWeight = backpack ? backpack.carryWeight : 5;
  let   added     = 0;

  loot.forEach(item => {
    const curW = raid.loot.reduce((s, i) => s + (i.weight || 0), 0);
    if (curW + (item.weight || 0) <= maxWeight) {
      raid.loot.push(item);
      added++;
    }
  });

  if (added > 0) {
    const names = loot.slice(0, 2).map(i => i.name).join(', ');
    showToast(`📦 +${added}: ${names}${loot.length > 2 ? '...' : ''}`, 'success');
  } else {
    showToast('Рюкзак полон!', 'warning');
  }
}

// ============================================================
// СЕЙФЫ
// ============================================================

function openFreeSafe() {
  const raid = gameData.raid;
  const map  = gameData.persistentMap;
  const cell = map[raid.playerY][raid.playerX];
  if (cell.looted) return;
  cell.looted = true;
  const loot = generateSafeLoot('free', randInt(2, 3));
  showToast('🗄️ Бесплатный сейф вскрыт!', 'success');
  saveData();
  if (loot.length > 0) openLootPickerModal(loot);
  renderRaidScreen();
}

function openPaidSafe() {
  const raid = gameData.raid;
  const map  = gameData.persistentMap;
  const cell = map[raid.playerY][raid.playerX];
  if (cell.looted || !cell.keyId) return;

  const keyIdx = (gameData.loadout.keys || []).findIndex(i => i.id === cell.keyId && (i.uses || 0) > 0);
  if (keyIdx === -1) {
    showToast('Нет ключа — возьми его в схроне', 'warning');
    return;
  }

  gameData.loadout.keys[keyIdx].uses -= 1;
  if (gameData.loadout.keys[keyIdx].uses <= 0) {
    gameData.loadout.keys.splice(keyIdx, 1);
    showToast('Ключ использован последний раз и сломался', 'info');
  }

  cell.looted = true;
  const loot = generateSafeLoot('paid', randInt(2, 4));
  showToast('🔒 Сейф вскрыт!', 'success');
  saveData();
  if (loot.length > 0) openLootPickerModal(loot);
  renderRaidScreen();
}

// Получить zoneType клетки по координатам (из persistentMap)
function getCellZoneType(x, y) {
  if (!gameData.persistentMap) return 'normal';
  const row = gameData.persistentMap[y];
  if (!row) return 'normal';
  const cell = row[x];
  return cell ? cell.zoneType : 'normal';
}

// ============================================================
// ПВП
// ============================================================

function triggerPVP() {
  const raid     = gameData.raid;
  raid.inCombat  = true;
  const zoneType = getCellZoneType(gameData.raid.playerX, gameData.raid.playerY);
  const enemy    = buildPVPEnemy(zoneType);
  saveData();
  showToast(`⚠️ Контакт! ${enemy.icon} ${enemy.name} [T${enemy.tier} · Б: ${fmtNum(enemy.budget)}₵]`, 'danger');
  initCombat(enemy);
}

function afterCombatWin() {
  const enemy = combatState ? combatState.enemy : null;
  if (gameData.raid) gameData.raid.inCombat = false;
  if (enemy) addLootToRaid(buildEnemyLootPool(enemy));
  simulateBots();
  combatState = null;
  saveData();
  renderRaidScreen();
}

function buildEnemyLootPool(enemy) {
  const pool = [];

  // Оружие — с модулями (они хранятся в dropWeapon.modules)
  if (enemy.dropWeapon) {
    pool.push({ ...enemy.dropWeapon, _uid: generateUid() });
  }

  // Патроны — остаток после боя (берём из enemy.dropAmmo.ammoCount — выставлен при генерации)
  if (enemy.dropAmmo && (enemy.dropAmmo.ammoCount || 0) > 0) {
    pool.push({ ...enemy.dropAmmo, weight: 0, _uid: generateUid() });
  }

  // Броня — с шансом
  if (enemy.dropHelmet && Math.random() < 0.6) pool.push({ ...enemy.dropHelmet, _uid: generateUid() });
  if (enemy.dropVest   && Math.random() < 0.6) pool.push({ ...enemy.dropVest,   _uid: generateUid() });

  // Разгрузка
  if (enemy.dropRig && Math.random() < 0.5) pool.push({ ...enemy.dropRig, _uid: generateUid() });

  // Лут
  if (enemy.dropLoot) pool.push(...enemy.dropLoot);

  return pool;
}

// Победа отображена, игрок кликнул «Забрать лут» — обработано в afterCombatWin
// Побег удался — возврат на карту
function afterCombatFlee() {
  if (gameData.raid) gameData.raid.inCombat = false;
  combatState = null;
  saveData();
  renderRaidScreen();
}

// Смерть: нажата кнопка «Продолжить»/«К схрону»
function afterCombatLose() {
  if (gameData.raid) gameData.raid.inCombat = false;
  combatState = null;
  playerDied();
}

// Кнопка «К схрону» после экрана смерти
function afterCombatLoseFinal() {
  switchTab('tab-stash');
}

// Вызывается из endCombat при поражении — рендер уже сделан, ждём клика
function onCombatLose() {
  // no-op: экран смерти рисует renderCombat() -> renderCombatResult()
}

// ============================================================
// АПТЕЧКА В ПОЛЕ
// ============================================================

function useFieldMedkit(uid) {
  const idx = (gameData.loadout.medkits || []).findIndex(m => (m._uid || m.id) === uid);
  if (idx === -1) return;

  const med = gameData.loadout.medkits[idx];
  let toastText = `${med.icon} +${med.healAmount} HP`;

  if (combatState && combatState.active) {
    // Аптечка во время боя обрабатывается через useMedkit в combat.js
    useMedkit(uid);
    return;
  }

  // Аптечка между боями: хилим raid.playerHP
  if (gameData.raid) {
    const maxHP  = 100;
    const curHP  = gameData.raid.playerHP || 100;
    if (curHP >= maxHP) {
      showToast('HP уже максимальное', 'info');
      return;
    }
    const healed = Math.min(med.healAmount, maxHP - curHP);
    gameData.raid.playerHP = curHP + healed;
    toastText = `${med.icon} +${healed} HP`;
    if (med.healsBleeding && gameData.raid.limbs && gameData.raid.limbs.chest) {
      gameData.raid.limbs.chest = false;
      toastText += ' · кровотечение остановлено';
    }
  }

  gameData.loadout.medkits.splice(idx, 1);
  showToast(toastText, 'success');
  saveData();
  renderRaidScreen();
}

// ============================================================
// ВЫБРОСИТЬ ПРЕДМЕТ
// ============================================================

function dropRaidItem(uid) {
  const raid = gameData.raid;
  const idx  = raid.loot.findIndex(i => i._uid === uid);
  if (idx === -1) return;
  const item = raid.loot.splice(idx, 1)[0];
  showToast(`Выброшено: ${item.name}`, 'info');
  saveData();
  renderRaidScreen();
}

// ============================================================
// ЭВАКУАЦИЯ
// ============================================================

function extractRaid() {
  const raid = gameData.raid;
  const map  = gameData.persistentMap;
  const cell = map[raid.playerY][raid.playerX];
  if (!cell.isExit) return;

  const backpack  = gameData.loadout.backpack ? EQUIPMENT[gameData.loadout.backpack] : null;
  const maxWeight = backpack ? backpack.carryWeight : 5;
  const curWeight = raid.loot.reduce((s, i) => s + (i.weight || 0), 0);

  if (curWeight > maxWeight) {
    showToast('⚠️ Перегруз! Выброси лишнее', 'warning');
    return;
  }

  const lootCount  = raid.loot.length;
  const totalValue = raid.loot.reduce((s, i) => s + (i.price || 0), 0);

  raid.loot.forEach(item => gameData.stash.items.push(item));
  gameData.raid = null;
  if (typeof refreshBlackMarketAfterRaid === 'function') refreshBlackMarketAfterRaid();
  saveData();

  showToast(`🚁 Эвакуация! ${lootCount} предм. на ${formatCoins(totalValue)}`, 'success');
  switchTab('tab-stash');
}

// ============================================================
// СМЕРТЬ
// ============================================================

function playerDied() {
  gameData.totalDeaths = (gameData.totalDeaths || 0) + 1;

  gameData.loadout = {
    weapon: null, ammo: null, ammoCount: 0,
    modules: { scope: null, grip: null, magazine: null, stock: null },
    magazines: [],
    helmet: null, vest: null, rig: null, backpack: null,
    medkits: [],
    keyring: [null, null, null, null],
    backpackItems: [],
    keys: [],
    _equippedUids: {},
  };

  gameData.raid = null;
  combatState   = null;

  if (typeof refreshBlackMarketAfterRaid === 'function') refreshBlackMarketAfterRaid();
  saveData();

  const el = document.getElementById('tab-raid');
  el.innerHTML = `
    <div class="death-screen">
      <div class="death-icon">💀</div>
      <h2 class="death-title">ВЫ ПОГИБЛИ</h2>
      <p class="death-sub">Всё снаряжение и найденный лут потеряны</p>
      <div class="death-stats">
        <div class="stat-row"><span>Всего рейдов</span><span>${gameData.totalRaids}</span></div>
        <div class="stat-row"><span>Смертей</span><span>${gameData.totalDeaths}</span></div>
        <div class="stat-row"><span>Убийств</span><span>${gameData.totalKills || 0}</span></div>
      </div>
      <button class="btn-primary btn-large" onclick="switchTab('tab-stash')">
        🎒 Схрон — взять снаряжение
      </button>
      <button class="btn-secondary" onclick="switchTab('tab-home')">
        🏠 Главная
      </button>
    </div>
  `;
}

// generateUid, formatCoins, randInt определены в script.js

// ============================================================
// ВЫЩЁЛКИВАНИЕ ПАТРОНОВ В РЕЙДЕ
// ============================================================

function openRaidEjectModal(uid) {
  const item = (gameData.raid && gameData.raid.loot || []).find(i => i._uid === uid);
  if (!item || !item.ammoCount) return;

  const overlay = document.createElement('div');
  overlay.id = 'eject-modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-title">📤 Выщелкнуть патроны</div>
      <div class="modal-sub">${escHtml(item.name)} · ${item.ammoCount} шт.</div>
      <div class="modal-row">
        <label>Количество:</label>
        <input id="eject-count" type="number" min="1" max="${item.ammoCount}" value="${item.ammoCount}" class="modal-input" style="width:80px">
        <span> / ${item.ammoCount}</span>
      </div>
      <div class="modal-row">
        <label>Куда:</label>
        <select id="eject-dest" class="modal-input">
          <option value="pool">В общий пул (добавить к стаку в рейде)</option>
          <option value="stack">Как отдельный стак</option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn-primary" onclick="confirmRaidEject('${uid}')">Выщелкнуть</button>
        <button class="btn-secondary" onclick="closeModal('eject-modal-overlay')">Отмена</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function confirmRaidEject(uid) {
  const loot = gameData.raid && gameData.raid.loot;
  if (!loot) return;
  const item = loot.find(i => i._uid === uid);
  if (!item) { closeModal('eject-modal-overlay'); return; }

  const count = Math.min(Math.max(1, parseInt(document.getElementById('eject-count').value)||1), item.ammoCount);
  const dest  = document.getElementById('eject-dest').value;

  if (dest === 'pool') {
    const existing = loot.find(i => i._uid !== uid && i.id === item.id && i.ammoCount !== undefined);
    if (existing) {
      existing.ammoCount += count;
    } else {
      loot.push({ ...item, ammoCount: count, _uid: generateUid(), _addedAt: Date.now() });
    }
  } else {
    loot.push({ ...item, ammoCount: count, _uid: generateUid(), _addedAt: Date.now() });
  }

  item.ammoCount -= count;
  if (item.ammoCount <= 0) {
    gameData.raid.loot = loot.filter(i => i._uid !== uid);
  }

  closeModal('eject-modal-overlay');
  saveData();
  renderRaidScreen();
  showToast('📤 Выщелкнуто: ' + count + ' патр.', 'success');
}

// ============================================================
// МОДУЛИ НА ОРУЖИИ В РЕЙДЕ
// ============================================================

function openRaidWeaponModsModal(uid) {
  const loot = gameData.raid && gameData.raid.loot;
  if (!loot) return;
  const weapon = loot.find(i => i._uid === uid);
  if (!weapon) return;

  const mods      = weapon.modules || {};
  const wtype     = WEAPON_TYPES[weapon.type];
  const slots     = wtype ? wtype.slots : ['scope','grip','magazine','stock'];
  const slotNames = { scope:'Прицел', grip:'Рукоять', magazine:'Магазин', stock:'Приклад' };

  const rows = slots.map(s => {
    const mod = mods[s] ? (typeof mods[s] === 'object' ? mods[s] : MODULES[mods[s]]) : null;
    if (!mod) return `<div class="mod-row"><span class="mod-slot-name">${slotNames[s]||s}</span><span class="mod-empty">—</span></div>`;
    return `
      <div class="mod-row">
        <span class="mod-slot-name">${slotNames[s]||s}</span>
        <span class="mod-icon">${mod.icon||'🔩'}</span>
        <span class="mod-name">${escHtml(mod.name)}</span>
        <button class="btn-icon btn-eject" onclick="removeModFromRaidWeapon('${uid}','${s}')">✕ Снять</button>
      </div>`;
  }).join('');

  const overlay = document.createElement('div');
  overlay.id = 'mods-modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-title">🔧 Модули: ${escHtml(weapon.name)}</div>
      <div class="mods-list">${rows}</div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="closeModal('mods-modal-overlay')">Закрыть</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function removeModFromRaidWeapon(weaponUid, slot) {
  const loot = gameData.raid && gameData.raid.loot;
  if (!loot) return;
  const weapon = loot.find(i => i._uid === weaponUid);
  if (!weapon || !weapon.modules || !weapon.modules[slot]) return;

  const mod     = weapon.modules[slot];
  const modData = typeof mod === 'object' ? mod : MODULES[mod];

  if (modData) {
    loot.push({ ...modData, _uid: generateUid(), _addedAt: Date.now() });
    showToast('🔩 Снято: ' + modData.name, 'success');
  }

  weapon.modules[slot] = null;
  closeModal('mods-modal-overlay');
  saveData();
  renderRaidScreen();

  const hasAny = Object.values(weapon.modules||{}).some(v => v);
  if (hasAny) openRaidWeaponModsModal(weaponUid);
}

// closeModal определена в script.js — доступна глобально
