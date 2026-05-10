// ============================================================
// SCRIPT.JS — Ядро игры
// gameData, сохранение, вкладки, инициализация, лидерборд
// ============================================================

// ============================================================
// СОСТОЯНИЕ ИГРЫ
// ============================================================

let gameData = {};

const SAVE_KEY = 'extractionGameData';
const SAVE_VERSION = 1;

function randomStartCoins() {
  // 20 000 000 — 20 999 999
  return 20000000 + Math.floor(Math.random() * 1000000);
}

// ============================================================
// СТАРТОВЫЙ СХРОН — пре-альфа тест
// Оружие тир 3-4, экипировка тир 3-4, патроны и аптечки
// ============================================================

function buildStarterStash() {
  const items = [];

  function addItem(sourceObj) {
    items.push({ ...sourceObj, _uid: Math.random().toString(36).slice(2, 10) + Date.now().toString(36), _addedAt: Date.now() });
  }

  // === ОРУЖИЕ — 3 варианта каждого типа (тир 3 и 4) ===

  // Штурмовые винтовки
  addItem(WEAPONS.ar_t3);   // FN SCAR-H
  addItem(WEAPONS.ar_t4a);  // G36C
  addItem(WEAPONS.ar_t4b);  // ADAR 2-15

  // Дробовики
  addItem(WEAPONS.sg_t3);   // Saiga-12
  addItem(WEAPONS.sg_t4a);  // Vepr 12 "Molot"
  addItem(WEAPONS.sg_t4b);  // Tavor TS12

  // Пистолеты-пулемёты
  addItem(WEAPONS.smg_t3);  // P90
  addItem(WEAPONS.smg_t4a); // SIG MPX
  addItem(WEAPONS.smg_t4b); // MP7A2

  // Снайперки
  addItem(WEAPONS.sr_t3);   // L96A1
  addItem(WEAPONS.sr_t4a);  // M200 CT
  addItem(WEAPONS.sr_t4b);  // SR-25

  // === ЭКИПИРОВКА — 3 варианта каждого типа (тир 3 и 4) ===

  addItem(EQUIPMENT.helmet_t3);
  addItem(EQUIPMENT.helmet_t4);
  addItem(EQUIPMENT.helmet_t3);

  addItem(EQUIPMENT.vest_t3);
  addItem(EQUIPMENT.vest_t4);
  addItem(EQUIPMENT.vest_t3);

  addItem(EQUIPMENT.rig_t3);
  addItem(EQUIPMENT.rig_t4);
  addItem(EQUIPMENT.rig_t3);

  addItem(EQUIPMENT.backpack_t3);
  addItem(EQUIPMENT.backpack_t4);
  addItem(EQUIPMENT.backpack_t3);

  // === ПАТРОНЫ — по 120 штук каждого типа, тир 3 и 4 ===
  addItem({ ...AMMO.rifle_t3,   ammoCount: 120, id: 'rifle_t3'   });
  addItem({ ...AMMO.rifle_t4,   ammoCount: 90,  id: 'rifle_t4'   });
  addItem({ ...AMMO.smg_t3,     ammoCount: 180, id: 'smg_t3'     });
  addItem({ ...AMMO.smg_t4,     ammoCount: 120, id: 'smg_t4'     });
  addItem({ ...AMMO.shotgun_t3, ammoCount: 60,  id: 'shotgun_t3' });
  addItem({ ...AMMO.shotgun_t4, ammoCount: 50,  id: 'shotgun_t4' });
  addItem({ ...AMMO.sniper_t3,  ammoCount: 30,  id: 'sniper_t3'  });
  addItem({ ...AMMO.sniper_t4,  ammoCount: 20,  id: 'sniper_t4'  });

  // === АПТЕЧКИ ===
  addItem(MEDKITS.ifak);
  addItem(MEDKITS.ifak);
  addItem(MEDKITS.ifak);
  addItem(MEDKITS.salewa);
  addItem(MEDKITS.salewa);

  // === КЛЮЧИ ОТ КРАСНЫХ ЗОН (для тестирования) ===
  addItem({ ...ZONE_KEYS.key_army,     uses: 5 });
  addItem({ ...ZONE_KEYS.key_hospital, uses: 5 });
  addItem({ ...ZONE_KEYS.key_bunker,   uses: 5 });
  addItem({ ...ZONE_KEYS.key_lab7,     uses: 5 });

  // === МОДУЛИ — по одному каждого тира 2–4 ===
  addItem(MODULES.scope_t2);
  addItem(MODULES.scope_t3);
  addItem(MODULES.scope_t4);
  addItem(MODULES.grip_t2);
  addItem(MODULES.grip_t3);
  addItem(MODULES.grip_t4);
  addItem(MODULES.mag_t2);
  addItem(MODULES.mag_t3);
  addItem(MODULES.mag_t4);
  addItem(MODULES.stock_t2);
  addItem(MODULES.stock_t3);
  addItem(MODULES.stock_t4);

  return items;
}

function defaultGameData() {
  return {
    version: SAVE_VERSION,

    // Профиль
    playerName: 'Оператор',
    coins: randomStartCoins(),
    totalRaids: 0,
    totalKills: 0,
    totalDeaths: 0,
    totalCoinsEarned: 0,
    totalCoinsLost: 0,

    // Схрон
    stash: {
      items: buildStarterStash(),
    },

    // Снаряжение которое игрок надевает перед рейдом
    loadout: {
      weapon:    null,  // id оружия
      ammo:      null,  // id патронов (стак в рюкзаке)
      ammoCount: 0,     // количество патронов в стаке
      modules: {        // установленные модули { scope: id|null, grip: id|null, ... }
        scope:    null,
        grip:     null,
        magazine: null,
        stock:    null,
      },
      // Физические магазины в разгрузке (заряженные):
      // [{ _uid, moduleId, ammoId, ammoCount, capacity }]
      magazines: [],
      helmet:    null,
      vest:      null,
      rig:       null,
      backpack:  null,
      medkits:   [],    // аптечки взятые в рейд
    },

    // Текущий рейд (null если не в рейде)
    raid: null,

    // Лидерборд — боты
    leaderboard: [],

    // Настройки
    settings: {
      soundEnabled: true,
      animationsEnabled: true,
    },
  };
}

// ============================================================
// СОХРАНЕНИЕ / ЗАГРУЗКА
// ============================================================

function saveData() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameData));
  } catch (e) {
    console.error('Ошибка сохранения:', e);
  }
}

function loadData() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== SAVE_VERSION) return false;
    // Мёрдж: дефолт как основа, поверх — сохранённое
    gameData = deepMerge(defaultGameData(), parsed);
    return true;
  } catch (e) {
    console.error('Ошибка загрузки:', e);
    return false;
  }
}

function resetData() {
  if (!confirm('Сбросить прогресс? Это действие необратимо.')) return;
  localStorage.removeItem(SAVE_KEY);
  gameData = defaultGameData();
  generateLeaderboard();
  saveData();
  renderCurrentTab();
  showToast('Прогресс сброшен', 'warning');
}

// Глубокий мёрдж двух объектов (дефолт + сохранение)
function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// ============================================================
// ЛИДЕРБОРД
// ============================================================

// ============================================================
// ЛИДЕРБОРД — 100 игроков, 50 видимых + 50 невидимых
// ============================================================

function generateLeaderboard() {
  const names   = LEADERBOARD_NAMES; // должно быть >= 99 имён
  const bots    = [];

  // Распределение монет: место 1 → ~90M, место 100 → ~5M
  // Игрок стартует с ~20M → примерно 40-е место
  for (let i = 0; i < 99; i++) {
    const t = i / 98; // 0..1
    const base = Math.round(90_000_000 - 85_000_000 * t);
    const jitter = Math.floor((Math.random() - 0.5) * 2_000_000);
    bots.push({
      name:      names[i] || `Player_${i + 1}`,
      coins:     Math.max(1_000_000, base + jitter),
      kills:     Math.floor(Math.random() * 1500) + 10,
      raids:     Math.floor(Math.random() * 800)  + 10,
      isBot:     true,
      visible:   i < 49,   // первые 49 видимы игроку
    });
  }

  gameData.leaderboard = bots;
  updateLeaderboardPlayer();
}

function simulateBots() {
  const playerRank = getPlayerRank();
  const inTop5     = playerRank <= 5;

  gameData.leaderboard.forEach((entry, idx) => {
    if (!entry.isBot) return;

    // Текущее место бота (после сортировки)
    const rank = gameData.leaderboard
      .slice().sort((a, b) => b.coins - a.coins)
      .findIndex(e => e === entry) + 1;

    // Шансы эвакуации vs смерти
    let evacChance = 0.50; // базово 50/50

    if (inTop5) {
      // Система догоняющего: топ-игрок убежал — боты топа активнее
      evacChance = 0.65;
    }

    if (rank >= 60) {
      // Аутсайдеры получают буст пока не войдут в топ-59
      evacChance = 0.70;
    }

    // Результат «рейда» бота
    const evaced = Math.random() < evacChance;
    if (evaced) {
      const jackpot = Math.random() < 0.03;
      const gain = jackpot
        ? 5_000_000
        : randInt(500_000, 2_000_000);
      entry.coins += gain;
      entry.raids  = (entry.raids || 0) + 1;
    } else {
      const loss = randInt(100_000, 800_000);
      entry.coins = Math.max(500_000, entry.coins - loss);
      entry.raids = (entry.raids || 0) + 1;
    }
  });

  updateLeaderboardPlayer();
}

function updateLeaderboardPlayer() {
  gameData.leaderboard = gameData.leaderboard.filter(e => !e.isPlayer);
  gameData.leaderboard.push({
    name:    gameData.playerName,
    coins:   gameData.totalCoinsEarned || gameData.coins,
    kills:   gameData.totalKills,
    raids:   gameData.totalRaids,
    isBot:   false,
    isPlayer: true,
    visible:  true,
  });
  gameData.leaderboard.sort((a, b) => b.coins - a.coins);
}

function getPlayerRank() {
  updateLeaderboardPlayer();
  return gameData.leaderboard.findIndex(e => e.isPlayer) + 1;
}

// ============================================================
// СИСТЕМА ВКЛАДОК
// ============================================================

let currentTab = 'tab-home';

function switchTab(tabId) {
  // Скрыть все вкладки
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));

  // Показать нужную
  const content = document.getElementById(tabId);
  const btn = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
  if (content) content.classList.add('active');
  if (btn) btn.classList.add('active');

  currentTab = tabId;

  // Рендерить содержимое вкладки
  switch (tabId) {
    case 'tab-home':      renderHome();      break;
    case 'tab-stash':     renderStash();     break;
    case 'tab-loadout':   renderLoadout();   break;
    case 'tab-traders':   renderTraders();   break;
    case 'tab-raid':      renderRaid();      break;
    case 'tab-leaderboard': renderLeaderboard(); break;
  }
}

function renderCurrentTab() {
  switchTab(currentTab);
}

// ============================================================
// РЕНДЕР — ГЛАВНАЯ
// ============================================================

function renderHome() {
  const rank = getPlayerRank();
  const el = document.getElementById('tab-home');
  el.innerHTML = `
    <div class="profile-card">
      <div class="profile-avatar">🪖</div>
      <div class="profile-info">
        <div class="profile-name">${escHtml(gameData.playerName)}</div>
        <div class="profile-rank"># ${rank} в рейтинге</div>
      </div>
      <div class="profile-coins">${CURRENCY_ICON} ${fmtNum(gameData.coins)}</div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${gameData.totalRaids}</div>
        <div class="stat-label">Рейдов</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${gameData.totalKills}</div>
        <div class="stat-label">Убийств</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${gameData.totalDeaths}</div>
        <div class="stat-label">Смертей</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${gameData.totalRaids > 0 ? Math.round((gameData.totalRaids - gameData.totalDeaths) / gameData.totalRaids * 100) : 0}%</div>
        <div class="stat-label">Выживаемость</div>
      </div>
    </div>

    <div class="home-actions">
      <button class="btn-primary btn-large" onclick="switchTab('tab-raid')">
        🎯 В РЕЙД
      </button>
      <button class="btn-secondary" onclick="switchTab('tab-loadout')">
        🎒 Снаряжение
      </button>
    </div>

    <div class="home-tip">
      <span class="tip-icon">💡</span>
      <span>Снарядись перед рейдом. При смерти — теряешь всё.</span>
    </div>

    <div class="reset-zone">
      <button class="btn-danger-ghost" onclick="resetData()">Сбросить прогресс</button>
    </div>
  `;
}

// ============================================================
// РЕНДЕР — СХРОН
// ============================================================

function renderStash() {
  const el = document.getElementById('tab-stash');
  const items = gameData.stash.items;

  const totalWeight = items.reduce((s, i) => s + (i.weight || 0), 0);

  el.innerHTML = `
    <div class="section-header">
      <h2>📦 Схрон</h2>
      <div class="stash-weight">${totalWeight.toFixed(1)} кг</div>
    </div>

    ${items.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">Схрон пуст</div>
        <div class="empty-sub">Иди на рейд и принеси лут</div>
      </div>
    ` : `
      <div class="stash-grid">
        ${items.map(item => renderStashItem(item)).join('')}
      </div>
    `}
  `;
}

function renderStashItem(item) {
  // Предметы могут быть: оружие/экипировка (tier), лут (rarity), ключи, аптечки
  const tierColor = item.tier
    ? getTierColor(item.tier)
    : (LOOT_RARITY_COLORS && LOOT_RARITY_COLORS[item.rarity]) || '#94a3b8';

  const tierLabel = item.tier
    ? TIERS[item.tier].label
    : item.rarity
      ? ({ junk:'Мусор', common:'Обычный', rare:'Редкий', valuable:'Ценный', precious:'Драгоценный' }[item.rarity] || '')
      : '';

  const priceLabel = item.price ? `${formatCoins(item.price)}` : '';
  const usesLabel  = item.uses  ? ` · ${item.uses} исп.` : '';

  // Кнопка выщёлкивания для патронов
  const ejectBtn = (item.ammoCount > 0)
    ? `<button class="btn-icon btn-eject" title="Выщелкнуть патроны" onclick="openEjectModal('${item._uid}')">📤 ${item.ammoCount}</button>`
    : '';

  // Кнопка модулей для оружия
  const modsBtn = (item.type && WEAPON_TYPES[item.type])
    ? `<button class="btn-icon btn-mods" title="Модули" onclick="openWeaponModsModal('${item._uid}')">🔧</button>`
    : '';

  return `
    <div class="stash-item" style="border-color: ${tierColor}33; --tier-color: ${tierColor}">
      <div class="item-icon">${item.icon || '📦'}</div>
      <div class="item-info">
        <div class="item-name">${escHtml(item.name)}</div>
        <div class="item-tier" style="color: ${tierColor}">${tierLabel}${usesLabel}</div>
      </div>
      <div class="item-weight">${item.weight ? item.weight.toFixed(1) + ' кг' : ''}</div>
      <div class="item-actions">
        ${ejectBtn}
        ${modsBtn}
        <button class="btn-icon btn-sell" onclick="sellItem('${item._uid}')">
          ₵ ${priceLabel}
        </button>
      </div>
    </div>
  `;
}

function sellItem(uid) {
  const idx = gameData.stash.items.findIndex(i => i._uid === uid);
  if (idx === -1) return;
  const item = gameData.stash.items[idx];

  // Не продавать надетые предметы
  // Сравниваем по _uid чтобы не блокировать дубликаты с тем же item.id
  const lo = gameData.loadout;
  const euids = lo._equippedUids || {};
  const isEquipped = Object.values(euids).includes(uid)
    || (lo.modules && Object.values(lo.modules).includes(item.id));
  if (isEquipped) {
    showToast('Сначала сними предмет', 'warning');
    return;
  }

  const price = Math.floor((item.price || 100) * 0.6); // продажа за 60%
  gameData.coins += price;
  gameData.stash.items.splice(idx, 1);
  saveData();
  renderStash();
  showToast(`Продано: +${CURRENCY_ICON}${fmtNum(price)}`, 'success');
}

// ============================================================
// РЕНДЕР — СНАРЯЖЕНИЕ (LOADOUT)
// ============================================================

function renderLoadout() {
  const el = document.getElementById('tab-loadout');
  const lo = gameData.loadout;

  el.innerHTML = `
    <div class="section-header">
      <h2>🎒 Снаряжение</h2>
    </div>

    <div class="loadout-grid">
      ${renderLoadoutSlot('weapon',   '🔫', 'Оружие',    lo.weapon)}
      ${renderLoadoutSlot('ammo',     '📦', 'Патроны',   lo.ammo)}
      ${renderLoadoutSlot('helmet',   '🪖', 'Шлем',      lo.helmet)}
      ${renderLoadoutSlot('vest',     '🦺', 'Бронежилет',lo.vest)}
      ${renderLoadoutSlot('rig',      '🎽', 'Разгрузка', lo.rig)}
      ${renderLoadoutSlot('backpack', '🎒', 'Рюкзак',    lo.backpack)}
    </div>

    <div class="loadout-modules">
      <h3>🔩 Модули оружия</h3>
      ${lo.weapon ? renderModuleSlots() : '<div class="empty-sub">Сначала выбери оружие</div>'}
    </div>

    <div class="loadout-weight">
      <span>Общий вес загрузки:</span>
      <span class="weight-value">${calcLoadoutWeight().toFixed(1)} кг</span>
    </div>

    <div class="loadout-summary">
      ${renderLoadoutStats()}
    </div>
  `;
}

function renderLoadoutSlot(slotId, icon, label, itemId) {
  const item = itemId ? findItemById(itemId) : null;
  const tierColor = item ? getTierColor(item.tier || 1) : '#334155';

  // Для слота патронов — показываем совместимость с текущим оружием
  let compatNote = '';
  if (slotId === 'ammo') {
    const weapon = gameData.loadout.weapon ? WEAPONS[gameData.loadout.weapon] : null;
    if (weapon && weapon.compatAmmo && weapon.compatAmmo.length > 0) {
      const compatNames = weapon.compatAmmo
        .map(id => AMMO[id] ? AMMO[id].name : null)
        .filter(Boolean)
        .join(', ');
      compatNote = `<div class="slot-compat">🔗 ${escHtml(compatNames)}</div>`;
    } else if (!weapon) {
      compatNote = `<div class="slot-compat" style="color:var(--text3)">Сначала выбери оружие</div>`;
    }
  }

  return `
    <div class="loadout-slot ${item ? 'filled' : 'empty'}"
         style="--tier-color: ${tierColor}"
         onclick="openSlotPicker('${slotId}')">
      <div class="slot-icon">${item ? item.icon : icon}</div>
      <div class="slot-info">
        <div class="slot-label">${label}</div>
        <div class="slot-value">${item ? escHtml(item.name) : 'Пусто'}</div>
        ${compatNote}
      </div>
      ${item ? `<div class="slot-tier" style="color:${tierColor}">T${item.tier}</div>` : ''}
    </div>
  `;
}

function renderModuleSlots() {
  const weaponId = gameData.loadout.weapon;
  if (!weaponId) return '';
  const weapon = WEAPONS[weaponId];
  if (!weapon) return '';

  return weapon.type && WEAPON_TYPES[weapon.type]
    ? WEAPON_TYPES[weapon.type].slots.map(slotType => {
        const modId = gameData.loadout.modules[slotType];
        const mod = modId ? MODULES[modId] : null;
        const slotNames = { scope: 'Прицел', grip: 'Рукоять', magazine: 'Магазин', stock: 'Приклад' };
        return `
          <div class="module-slot ${mod ? 'filled' : 'empty'}"
               onclick="openModulePicker('${slotType}')">
            <div class="slot-icon">${mod ? mod.icon : '➕'}</div>
            <div class="slot-info">
              <div class="slot-label">${slotNames[slotType]}</div>
              <div class="slot-value">${mod ? escHtml(mod.name) : 'Пусто'}</div>
            </div>
          </div>
        `;
      }).join('')
    : '';
}

function renderLoadoutStats() {
  const stats = calcLoadoutStats();
  const weapon = gameData.loadout.weapon ? WEAPONS[gameData.loadout.weapon] : null;
  const bonusStr = weapon && weapon.specialBonus
    ? `<div class="stat-row highlight"><span>Бонус оружия</span><span>${weapon.specialBonus.desc}</span></div>`
    : '';
  return `
    <div class="stat-row"><span>Точность</span><span>${stats.accuracy}%</span></div>
    <div class="stat-row"><span>Урон/выстрел</span><span>${stats.ammoDmg || '—'}</span></div>
    <div class="stat-row"><span>ПРБ/выстрел</span><span>${stats.ammoPen || '—'}</span></div>
    <div class="stat-row"><span>Магазин</span><span>${stats.magSize} патр.</span></div>
    <div class="stat-row"><span>Броня тела</span><span>${stats.bodyArmor}</span></div>
    <div class="stat-row"><span>Броня головы</span><span>${stats.headArmor}</span></div>
    ${bonusStr}
  `;
}

function calcLoadoutStats() {
  const lo = gameData.loadout;
  const weapon = lo.weapon ? WEAPONS[lo.weapon] : null;
  const vest   = lo.vest   ? EQUIPMENT[lo.vest]   : null;
  const helmet = lo.helmet ? EQUIPMENT[lo.helmet] : null;
  const ammo   = lo.ammo   ? AMMO[lo.ammo]        : null;

  // Точность — целые числа 0–99
  let accuracy = weapon ? weapon.accuracy : 0;
  Object.values(lo.modules || {}).forEach(modId => {
    const mod = modId ? MODULES[modId] : null;
    if (mod && mod.accuracyBonus) accuracy += mod.accuracyBonus;
  });
  accuracy = Math.min(99, Math.max(0, accuracy));

  // Магазин
  let magSize = weapon ? weapon.magSize : 0;
  const magMod = lo.modules && lo.modules.magazine ? MODULES[lo.modules.magazine] : null;
  if (magMod && magMod.magBonus) magSize += magMod.magBonus;

  // Урон и ПРБ берутся из патрона
  const ammoDmg = ammo ? ammo.dmg : 0;
  const ammoPen = ammo ? ammo.pen : 0;

  // Броня
  const headArmor = helmet ? helmet.protection : 0;
  const bodyArmor = vest   ? vest.protection   : 0;

  return {
    accuracy,
    ammoDmg,
    ammoPen,
    magSize,
    headArmor,
    bodyArmor,
    vestProtection:   bodyArmor,
    helmetProtection: headArmor,
    weaponType:       weapon ? weapon.type : 'rifle',
    specialBonus:     weapon ? (weapon.specialBonus || null) : null,
  };
}

// ============================================================
// МАГАЗИНЫ — вспомогательные функции
// ============================================================

// Ёмкость магазина = базовый magSize оружия + magBonus модуля
function getMagCapacity() {
  const lo     = gameData.loadout;
  const weapon = lo.weapon ? WEAPONS[lo.weapon] : null;
  if (!weapon) return 0;
  const magMod = lo.modules && lo.modules.magazine ? MODULES[lo.modules.magazine] : null;
  return weapon.magSize + (magMod && magMod.magBonus ? magMod.magBonus : 0);
}

// id модуля-магазина (или 'mag_t1' по умолчанию)
function getActiveMagModuleId() {
  const lo = gameData.loadout;
  if (lo.modules && lo.modules.magazine) return lo.modules.magazine;
  return 'mag_t1'; // встроенный для оружий без слота magazine
}

// Максимальное число магазинов = rig.magSlots (1 если нет разгрузки)
function getMaxMagSlots() {
  const lo  = gameData.loadout;
  const rig = lo.rig ? EQUIPMENT[lo.rig] : null;
  return rig && rig.magSlots ? rig.magSlots : 1;
}

// Суммарное количество патронов во всех магазинах
function getTotalMagAmmo() {
  return (gameData.loadout.magazines || []).reduce((s, m) => s + (m.ammoCount || 0), 0);
}

// Заполнить магазины из стака (ammoCount) насколько возможно.
// Возвращает количество патронов потраченных из стака.
function fillMagazinesFromStack() {
  const lo       = gameData.loadout;
  if (!lo.ammo || !lo.weapon) return 0;

  const cap      = getMagCapacity();
  const moduleId = getActiveMagModuleId();
  const maxSlots = getMaxMagSlots();
  let   spent    = 0;

  // Убедимся что массив magazines существует и имеет нужное число слотов
  if (!lo.magazines) lo.magazines = [];

  // Удалить магазины для другого типа патронов / другого оружия
  lo.magazines = lo.magazines.filter(m => m.ammoId === lo.ammo && m.capacity === cap);

  // Добавить недостающие слоты
  while (lo.magazines.length < maxSlots) {
    lo.magazines.push({ _uid: generateUid(), moduleId, ammoId: lo.ammo, ammoCount: 0, capacity: cap });
  }

  // Обрезать лишние слоты (если разгрузку сменили на меньшую)
  lo.magazines = lo.magazines.slice(0, maxSlots);

  // Заполнить каждый магазин до capacity
  for (const mag of lo.magazines) {
    const need = cap - mag.ammoCount;
    if (need <= 0) continue;
    const take = Math.min(need, lo.ammoCount);
    mag.ammoCount  += take;
    lo.ammoCount   -= take;
    spent          += take;
    if (lo.ammoCount <= 0) break;
  }
  return spent;
}

// Зарядить конкретный магазин из стака
function loadMagazine(magUid) {
  const lo  = gameData.loadout;
  const mag = (lo.magazines || []).find(m => m._uid === magUid);
  if (!mag || !lo.ammo || lo.ammoCount <= 0) return;
  if (mag.ammoId && mag.ammoId !== lo.ammo) {
    showToast('Несовместимый тип патронов', 'warning');
    return;
  }
  const cap  = getMagCapacity();
  const need = cap - mag.ammoCount;
  if (need <= 0) { showToast('Магазин полный', 'info'); return; }
  const take = Math.min(need, lo.ammoCount);
  mag.ammoCount += take;
  mag.ammoId     = lo.ammo;
  mag.capacity   = cap;
  lo.ammoCount  -= take;
  if (lo.ammoCount <= 0) { lo.ammoCount = 0; }
  saveData();
  renderLoadout();
  showToast('🔫 +' + take + ' патр. заряжено в магазин', 'success');
}

// Выщелкнуть все патроны из конкретного магазина в стак
function unloadMagazine(magUid) {
  const lo  = gameData.loadout;
  const mag = (lo.magazines || []).find(m => m._uid === magUid);
  if (!mag || mag.ammoCount <= 0) return;
  // Убедимся что стак совместим
  if (lo.ammo && lo.ammo !== mag.ammoId) {
    showToast('В рюкзаке другой тип патронов', 'warning');
    return;
  }
  if (!lo.ammo) {
    lo.ammo = mag.ammoId;
  }
  var ejected = mag.ammoCount;
  lo.ammoCount  += ejected;
  mag.ammoCount  = 0;
  saveData();
  renderLoadout();
  showToast('📤 Выщелкнуто ' + ejected + ' патр.', 'success');
}

function calcLoadoutWeight() {
  const lo = gameData.loadout;
  let w = 0;
  ['weapon', 'helmet', 'vest', 'rig', 'backpack'].forEach(slot => {
    if (lo[slot]) {
      const item = findItemById(lo[slot]);
      if (item) w += item.weight || 0;
    }
  });
  Object.values(lo.modules || {}).forEach(modId => {
    if (modId && MODULES[modId]) w += MODULES[modId].weight || 0;
  });
  return w;
}

// ============================================================
// ПИКЕР ПРЕДМЕТОВ ДЛЯ СНАРЯЖЕНИЯ
// ============================================================

function openSlotPicker(slotId) {
  const el = document.getElementById('tab-loadout');

  // Собираем доступные предметы из схрона для данного слота
  let candidates = [];

  if (slotId === 'weapon') {
    candidates = gameData.stash.items.filter(i => i.type && WEAPON_TYPES[i.type]);
  } else if (slotId === 'ammo') {
    // Показываем только патроны совместимые с выбранным оружием
    const weapon = gameData.loadout.weapon ? WEAPONS[gameData.loadout.weapon] : null;
    const compatIds = weapon ? (weapon.compatAmmo || []) : [];
    candidates = gameData.stash.items.filter(i =>
      AMMO[i.id] && (compatIds.length === 0 || compatIds.includes(i.id))
    );
  } else {
    candidates = gameData.stash.items.filter(i => i.slot === slotId);
  }

  const currentUid = (gameData.loadout._equippedUids || {})[slotId] || null;

  const itemsHtml = candidates.length === 0
    ? '<div class="empty-sub">В схроне нет подходящих предметов</div>'
    : candidates.map(item => {
        const tierColor = getTierColor(item.tier || 1);
        const isEquipped = currentUid ? item._uid === currentUid : item.id === gameData.loadout[slotId];
        const extraInfo = slotId === 'ammo' ? ` · ${item.ammoCount} шт.`
          : item.protection ? ` · Броня: ${item.protection}`
          : item.carryWeight ? ` · ${item.carryWeight} кг`
          : '';
        return `
          <div class="picker-item ${isEquipped ? 'picker-equipped' : ''}"
               style="border-color: ${tierColor}55"
               onclick="equipItem('${slotId}', '${item._uid}')">
            <div class="picker-icon">${item.icon || '📦'}</div>
            <div class="picker-info">
              <div class="picker-name">${escHtml(item.name)}</div>
              <div class="picker-sub" style="color:${tierColor}">
                ${item.tier ? 'Тир ' + item.tier : ''}${extraInfo}
              </div>
            </div>
            ${isEquipped ? '<div class="picker-badge">✓ В слоте</div>' : ''}
          </div>
        `;
      }).join('');

  const slotNames = {
    weapon: 'Оружие', ammo: 'Патроны', helmet: 'Шлем',
    vest: 'Бронежилет', rig: 'Разгрузка', backpack: 'Рюкзак',
  };

  const unequipBtn = currentId
    ? `<button class="btn-secondary picker-unequip" onclick="unequipSlot('${slotId}')">✕ Снять</button>`
    : '';

  el.innerHTML = `
    <div class="section-header">
      <button class="btn-back" onclick="renderLoadout()">← Назад</button>
      <h2>Выбор: ${slotNames[slotId] || slotId}</h2>
    </div>
    ${unequipBtn}
    <div class="picker-list">
      ${itemsHtml}
    </div>
  `;
}

function openModulePicker(slotType) {
  const el = document.getElementById('tab-loadout');

  const candidates = gameData.stash.items.filter(i => i.type === slotType && MODULES[i.id]);
  const currentId = gameData.loadout.modules[slotType];

  const itemsHtml = candidates.length === 0
    ? '<div class="empty-sub">В схроне нет подходящих модулей</div>'
    : candidates.map(item => {
        const isEquipped = item.id === currentId;
        return `
          <div class="picker-item ${isEquipped ? 'picker-equipped' : ''}"
               onclick="equipModule('${slotType}', '${item.id}')">
            <div class="picker-icon">${item.icon || '🔩'}</div>
            <div class="picker-info">
              <div class="picker-name">${escHtml(item.name)}</div>
              <div class="picker-sub">${escHtml(item.desc || '')}</div>
            </div>
            ${isEquipped ? '<div class="picker-badge">✓ В слоте</div>' : ''}
          </div>
        `;
      }).join('');

  const slotNames = { scope: 'Прицел', grip: 'Рукоять', magazine: 'Магазин', stock: 'Приклад' };

  const unequipBtn = currentId
    ? `<button class="btn-secondary picker-unequip" onclick="unequipModule('${slotType}')">✕ Снять</button>`
    : '';

  el.innerHTML = `
    <div class="section-header">
      <button class="btn-back" onclick="renderLoadout()">← Назад</button>
      <h2>Модуль: ${slotNames[slotType] || slotType}</h2>
    </div>
    ${unequipBtn}
    <div class="picker-list">
      ${itemsHtml}
    </div>
  `;
}

function equipItem(slotId, uid) {
  const item = gameData.stash.items.find(i => i._uid === uid);
  if (!item) return;

  if (!gameData.loadout._equippedUids) gameData.loadout._equippedUids = {};

  if (slotId === 'ammo') {
    gameData.loadout.ammo = item.id;
    gameData.loadout.ammoCount = item.ammoCount || 0;
    gameData.loadout._equippedUids.ammo = uid;
  } else {
    gameData.loadout[slotId] = item.id;
    gameData.loadout._equippedUids[slotId] = uid;
  }

  saveData();
  renderLoadout();
  showToast(`✓ ${item.name} — надет`, 'success');
}

function unequipSlot(slotId) {
  if (!gameData.loadout._equippedUids) gameData.loadout._equippedUids = {};
  if (slotId === 'ammo') {
    gameData.loadout.ammo = null;
    gameData.loadout.ammoCount = 0;
  } else {
    gameData.loadout[slotId] = null;
  }
  gameData.loadout._equippedUids[slotId] = null;
  saveData();
  renderLoadout();
  showToast('Предмет снят', 'info');
}

function equipModule(slotType, modId) {
  gameData.loadout.modules[slotType] = modId;
  saveData();
  renderLoadout();
  showToast(`✓ Модуль установлен`, 'success');
}

function unequipModule(slotType) {
  gameData.loadout.modules[slotType] = null;
  saveData();
  renderLoadout();
  showToast('Модуль снят', 'info');
}

// ============================================================
// РЕНДЕР — ТОРГОВЦЫ (ЗАДЕЛ)
// ============================================================

// ============================================================
// РЕНДЕР — ТОРГОВЦЫ / ЧЁК РЫНОК
// ============================================================

function renderTraders() {
  const el = document.getElementById('tab-traders');

  // Инициализировать рынок если пустой
  if (!gameData.blackMarket || !gameData.blackMarket.listings || gameData.blackMarket.listings.length === 0) {
    gameData.blackMarket = generateBlackMarket();
    saveData();
  }

  const bm = gameData.blackMarket;

  el.innerHTML = `
    <div class="section-header">
      <h2>🕶️ Торговец</h2>
      <div class="bm-refresh-hint">Рынок обновится после следующего рейда</div>
    </div>

    <div class="bm-balance">
      <span class="bm-balance-label">Баланс</span>
      <span class="bm-balance-value">${CURRENCY_ICON} ${fmtNum(gameData.coins)}</span>
    </div>

    <!-- МЕДИЦИНА — фиксированные цены у торговца -->
    <div class="bm-section">
      <div class="bm-section-title">💊 Медицина</div>
      <div class="bm-listings">
        ${Object.values(MEDKITS).map(med => {
          if (med._craft) {
            return `
              <div class="bm-listing bm-cant-afford">
                <div class="bm-listing-icon" style="font-size:22px">${med.icon}</div>
                <div class="bm-listing-info">
                  <div class="bm-listing-name">${escHtml(med.name)}</div>
                  <div class="bm-listing-meta">
                    <span class="bm-desc">${escHtml(med.desc)}</span>
                  </div>
                </div>
                <div class="bm-listing-right">
                  <div class="bm-price" style="color:#64748b">🔨 Крафт</div>
                  <button class="btn-bm-buy disabled" disabled>Крафт</button>
                </div>
              </div>`;
          }
          const canAfford = gameData.coins >= med.price;
          return `
            <div class="bm-listing ${canAfford ? '' : 'bm-cant-afford'}">
              <div class="bm-listing-icon" style="font-size:22px">${med.icon}</div>
              <div class="bm-listing-info">
                <div class="bm-listing-name">${escHtml(med.name)}</div>
                <div class="bm-listing-meta">
                  <span class="bm-desc">${escHtml(med.desc)}</span>
                </div>
              </div>
              <div class="bm-listing-right">
                <div class="bm-price ${canAfford ? 'bm-price-ok' : 'bm-price-no'}">${CURRENCY_ICON} ${fmtNum(med.price)}</div>
                <button class="btn-bm-buy ${canAfford ? '' : 'disabled'}"
                        onclick="buyMedkit('${med.id}')"
                        ${canAfford ? '' : 'disabled'}>
                  Купить
                </button>
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>

    ${renderBMSection('weapon',   '🔫 Оружие',   bm.listings)}
    ${renderBMSection('ammo',     '🟤 Патроны',  bm.listings)}
    ${renderBMSection('armor',    '🪖 Броня',    bm.listings)}
    ${renderBMSection('gear',     '🎒 Снаряга',  bm.listings)}
    ${renderBMSection('module',   '🔩 Модули',   bm.listings)}
  `;
}

function renderBMSection(category, title, listings) {
  const items = listings.filter(l => l.category === category);
  if (items.length === 0) return '';

  const rows = items.map(listing => {
    const canAfford = gameData.coins >= listing.price;
    const tierColor = getTierColor(listing.tier);

    return `
      <div class="bm-listing ${canAfford ? '' : 'bm-cant-afford'}">
        <div class="bm-listing-icon" style="font-size:22px">${listing.icon}</div>
        <div class="bm-listing-info">
          <div class="bm-listing-name">${escHtml(listing.name)}</div>
          <div class="bm-listing-meta">
            <span class="bm-tier" style="color:${tierColor}">T${listing.tier}</span>
            ${listing.desc ? `<span class="bm-desc">${escHtml(listing.desc)}</span>` : ''}
          </div>
        </div>
        <div class="bm-listing-right">
          <div class="bm-price ${canAfford ? 'bm-price-ok' : 'bm-price-no'}">${CURRENCY_ICON} ${fmtNum(listing.price)}</div>
          <button class="btn-bm-buy ${canAfford ? '' : 'disabled'}"
                  onclick="buyBMListing('${listing._uid}')"
                  ${canAfford ? '' : 'disabled'}>
            Купить
          </button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="bm-section">
      <div class="bm-section-title">${title}</div>
      <div class="bm-listings">${rows}</div>
    </div>
  `;
}

function buyMedkit(medId) {
  const med = MEDKITS[medId];
  if (!med || med._craft) return;
  if (gameData.coins < med.price) { showToast('Недостаточно монет', 'warning'); return; }
  gameData.coins -= med.price;
  gameData.stash.items.push({ ...med, _uid: generateUid() });
  saveData();
  showToast(`✅ Куплено: ${med.name}`, 'success');
  renderTraders();
}

function buyBMListing(uid) {
  const bm = gameData.blackMarket;
  const idx = bm.listings.findIndex(l => l._uid === uid);
  if (idx === -1) return;
  const listing = bm.listings[idx];

  if (gameData.coins < listing.price) {
    showToast('Недостаточно монет', 'warning');
    return;
  }

  gameData.coins -= listing.price;

  // Добавить в схрон
  const items = buildBMItemsForStash(listing);
  items.forEach(item => gameData.stash.items.push(item));

  // Удалить лот с рынка
  bm.listings.splice(idx, 1);

  saveData();
  showToast(`✅ Куплено: ${listing.name}`, 'success');
  renderTraders();
}

function buildBMItemsForStash(listing) {
  if (listing.category === 'ammo') {
    return [{
      ...AMMO[listing.itemId],
      _uid:       generateUid(),
      ammoCount:  AMMO_STACK_SIZE,
      weight:     0,
      name:       `${AMMO[listing.itemId].name} ×${AMMO_STACK_SIZE}`,
      price:      listing.price,
      _isAmmoStack: true,
    }];
  }

  if (listing.category === 'weapon') {
    const weapon  = WEAPONS[listing.itemId];
    const ammoId  = pickBMAmmoForWeapon(weapon, listing.tier);
    const ammoObj = ammoId ? AMMO[ammoId] : null;
    const ammoCount = weapon.magSize * 2;
    const result = [{
      ...weapon,
      _uid: generateUid(),
      _isFoundWeapon: true,
      _foundAmmoId:    ammoId,
      _foundAmmoCount: ammoCount,
    }];
    if (ammoObj) {
      result.push({
        ...ammoObj,
        _uid:        generateUid(),
        ammoCount:   ammoCount,
        weight:      0,
        name:        `${ammoObj.name} ×${ammoCount}`,
        _isAmmoStack: true,
      });
    }
    return result;
  }

  // armor / gear — просто предмет
  const base = listing.category === 'module'
    ? MODULES[listing.itemId]
    : EQUIPMENT[listing.itemId];
  if (!base) return [];
  return [{ ...base, _uid: generateUid() }];
}

function pickBMAmmoForWeapon(weapon, tier) {
  const compat = (weapon.compatAmmo || []).map(id => AMMO[id]).filter(
    a => a && a.tier === tier && !a._inactive
  );
  if (compat.length > 0) return compat[randInt(0, compat.length - 1)].id;
  const any = (weapon.compatAmmo || []).map(id => AMMO[id]).filter(a => a && !a._inactive);
  if (any.length > 0) return any[randInt(0, any.length - 1)].id;
  return null;
}

// ============================================================
// ГЕНЕРАЦИЯ РЫНКА
// ============================================================

function generateBlackMarket() {
  const listings = [];

  const tiers = [1, 2, 3, 4];
  const activeTiers = tiers.filter(t => TIERS[t] && TIERS[t].isActive);

  // ОРУЖИЕ — 4 лота: по одному на тир (из активных)
  for (let i = 0; i < BLACK_MARKET_SLOTS.weapon; i++) {
    const tier = activeTiers[randInt(0, activeTiers.length - 1)];
    const pool = Object.values(WEAPONS).filter(w => w.tier === tier && !w._inactive);
    if (pool.length === 0) continue;
    const item = pool[randInt(0, pool.length - 1)];
    const pr   = BLACK_MARKET_PRICES.weapon[tier];
    listings.push({
      _uid:     generateUid(),
      category: 'weapon',
      itemId:   item.id,
      name:     item.name,
      icon:     item.icon,
      tier,
      desc:     `${item.type} · ${item.magSize} патр.`,
      price:    randInt(pr.min, pr.max),
    });
  }

  // ПАТРОНЫ — 4 лота
  for (let i = 0; i < BLACK_MARKET_SLOTS.ammo; i++) {
    const tier = activeTiers[randInt(0, activeTiers.length - 1)];
    const pool = Object.values(AMMO).filter(a => a.tier === tier && !a._inactive);
    if (pool.length === 0) continue;
    const item = pool[randInt(0, pool.length - 1)];
    const pr   = BLACK_MARKET_PRICES.ammo[tier];
    listings.push({
      _uid:     generateUid(),
      category: 'ammo',
      itemId:   item.id,
      name:     `${item.name} ×${AMMO_STACK_SIZE}`,
      icon:     item.icon,
      tier,
      desc:     `${item.dmg} урон · ${item.pen} ПРБ`,
      price:    randInt(pr.min, pr.max),
    });
  }

  // БРОНЯ — 3 лота (шлем или броник)
  for (let i = 0; i < BLACK_MARKET_SLOTS.armor; i++) {
    const tier = activeTiers[randInt(0, activeTiers.length - 1)];
    const slot = Math.random() < 0.5 ? 'helmet' : 'vest';
    const pool = Object.values(EQUIPMENT).filter(e => e.slot === slot && e.tier === tier && !e._inactive);
    if (pool.length === 0) continue;
    const item = pool[randInt(0, pool.length - 1)];
    const pr   = BLACK_MARKET_PRICES.armor[tier];
    listings.push({
      _uid:     generateUid(),
      category: 'armor',
      itemId:   item.id,
      name:     item.name,
      icon:     item.icon,
      tier,
      desc:     `+${item.protection} брони · ${item.weight} кг`,
      price:    randInt(pr.min, pr.max),
    });
  }

  // СНАРЯГА — 3 лота (рюкзак или разгрузка)
  for (let i = 0; i < BLACK_MARKET_SLOTS.gear; i++) {
    const tier = activeTiers[randInt(0, activeTiers.length - 1)];
    const slot = Math.random() < 0.5 ? 'backpack' : 'rig';
    const pool = Object.values(EQUIPMENT).filter(e => e.slot === slot && e.tier === tier && !e._inactive);
    if (pool.length === 0) continue;
    const item = pool[randInt(0, pool.length - 1)];
    const pr   = BLACK_MARKET_PRICES.gear[tier];
    const desc = item.carryWeight
      ? `${item.carryWeight} кг ёмкость`
      : `${item.magSlots} маг · ${item.medSlots} апт.`;
    listings.push({
      _uid:     generateUid(),
      category: 'gear',
      itemId:   item.id,
      name:     item.name,
      icon:     item.icon,
      tier,
      desc,
      price:    randInt(pr.min, pr.max),
    });
  }

  // МОДУЛИ — magazine / scope / grip / stock
  const moduleTypes = ['magazine', 'scope', 'grip', 'stock'];
  for (const mType of moduleTypes) {
    const slotCount = BLACK_MARKET_SLOTS[mType] || 0;
    for (let i = 0; i < slotCount; i++) {
      const tier = activeTiers[randInt(0, activeTiers.length - 1)];
      const pool = Object.values(MODULES).filter(m => m.type === mType && m.tier === tier && !m._inactive);
      if (pool.length === 0) continue;
      const item = pool[randInt(0, pool.length - 1)];
      const prMap = BLACK_MARKET_PRICES.module[mType];
      const pr    = prMap ? (prMap[tier] || { min: item.price, max: item.price * 2 }) : { min: item.price, max: item.price * 2 };
      const desc  = item.magBonus ? `+${item.magBonus} патронов` : `+${item.accuracyBonus} к точности`;
      listings.push({
        _uid:     generateUid(),
        category: 'module',
        modType:  mType,
        itemId:   item.id,
        name:     item.name,
        icon:     item.icon,
        tier,
        desc,
        price:    randInt(pr.min, pr.max),
      });
    }
  }

  return { listings, generatedAtRaid: gameData.totalRaids || 0 };
}

// Вызывается из startRaid после завершения рейда (через endRaid)
function refreshBlackMarketAfterRaid() {
  gameData.blackMarket = generateBlackMarket();
}



// ============================================================
// РЕНДЕР — РЕЙД (вход)
// Если рейд активен — передать управление raid.js
// ============================================================

function renderRaid() {
  const el = document.getElementById('tab-raid');

  if (gameData.raid && gameData.raid.active) {
    // Рейд идёт — рендерит raid.js
    if (typeof renderRaidScreen === 'function') renderRaidScreen();
    return;
  }

  // Экран подготовки к рейду
  const stats      = calcLoadoutStats();
  const lo         = gameData.loadout;
  const hasWeapon  = !!lo.weapon;
  const hasMags    = (lo.magazines || []).some(m => m.ammoCount > 0);
  const hasAmmo    = !!lo.ammo && (lo.ammoCount > 0 || hasMags);
  const totalMagAmmo = getTotalMagAmmo();
  const cap        = getMagCapacity();
  const maxSlots   = getMaxMagSlots();
  const canFill    = lo.ammo && lo.ammoCount > 0 && (lo.magazines || []).some(m => m.ammoCount < cap);

  // Строки магазинов
  const magRows = (lo.magazines || []).map(mag => {
    const pct   = cap > 0 ? Math.round(mag.ammoCount / cap * 100) : 0;
    const color = pct >= 75 ? 'var(--success)' : pct >= 30 ? '#f59e0b' : 'var(--danger)';
    return `
      <div class="mag-row">
        <span class="mag-icon">🔫</span>
        <div class="mag-bar-wrap">
          <div class="mag-bar" style="width:${pct}%; background:${color}"></div>
        </div>
        <span class="mag-count">${mag.ammoCount}/${cap}</span>
        <button class="btn-icon btn-small" title="Зарядить" onclick="loadMagazine('${mag._uid}')">⬇️</button>
        <button class="btn-icon btn-small" title="Выщелкнуть" onclick="unloadMagazine('${mag._uid}')">📤</button>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="section-header">
      <h2>🎯 Рейд</h2>
    </div>

    <div class="raid-prep">
      <div class="prep-block">
        <h3>Текущее снаряжение</h3>
        <div class="prep-stats">
          <div class="prep-row ${!hasWeapon ? 'warn' : ''}">
            <span>Оружие</span>
            <span>${hasWeapon ? escHtml(WEAPONS[lo.weapon].name) : '⚠️ Не выбрано'}</span>
          </div>
          <div class="prep-row">
            <span>Точность</span>
            <span>${stats.accuracy}%</span>
          </div>
          <div class="prep-row">
            <span>Броня тела / головы</span>
            <span>${stats.bodyArmor} / ${stats.headArmor}</span>
          </div>
        </div>
      </div>

      ${hasWeapon ? `
      <div class="prep-block">
        <h3>📦 Магазины (${(lo.magazines||[]).length}/${maxSlots} слотов)</h3>
        <div class="mag-list">
          ${lo.magazines && lo.magazines.length > 0 ? magRows : '<div class="warn-text">Нет магазинов — надень разгрузку</div>'}
        </div>
        <div class="mag-footer">
          <span>В рюкзаке: <b>${lo.ammoCount || 0}</b> патр.</span>
          <span>В магазинах: <b>${totalMagAmmo}</b> патр.</span>
          ${canFill
            ? `<button class="btn-secondary btn-small" onclick="fillAllMagsAndRefresh()">⬇️ Зарядить все</button>`
            : ''}
        </div>
      </div>
      ` : ''}

      <div class="raid-warning">
        <span class="warn-icon">☠️</span>
        <span>При смерти в рейде вы теряете всё снаряжение и лут</span>
      </div>

      <button class="btn-primary btn-large btn-raid"
        ${!hasWeapon || !hasAmmo ? 'disabled' : ''}
        onclick="startRaid()">
        ${!hasWeapon ? '⚠️ Нет оружия' : !hasAmmo ? '⚠️ Нет патронов' : '🚁 НАЧАТЬ РЕЙД'}
      </button>

      ${!hasWeapon || !hasAmmo ? `
        <button class="btn-secondary" onclick="switchTab('tab-traders')">
          Купить снаряжение
        </button>
      ` : ''}
    </div>
  `;
}

// ============================================================
// РЕНДЕР — ЛИДЕРБОРД
// ============================================================

function renderLeaderboard() {
  const el = document.getElementById('tab-leaderboard');
  updateLeaderboardPlayer();
  const top = gameData.leaderboard.slice(0, 50);
  const playerRank = getPlayerRank();

  el.innerHTML = `
    <div class="section-header">
      <h2>🏆 Рейтинг</h2>
      <div class="player-rank-badge">Ваше место: #${playerRank}</div>
    </div>

    <div class="leaderboard-list">
      ${top.map((entry, i) => {
        const rank = i + 1;
        const isPlayer = entry.isPlayer;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
        return `
          <div class="lb-row ${isPlayer ? 'lb-player' : ''}">
            <div class="lb-rank">${medal}</div>
            <div class="lb-name">${escHtml(entry.name)}${isPlayer ? ' 👤' : ''}</div>
            <div class="lb-coins">${CURRENCY_ICON} ${fmtNum(entry.coins)}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ УТИЛИТЫ
// ============================================================

// Найти предмет по id во всех справочниках (единственное место определения)
function findItemById(id) {
  return WEAPONS[id] || EQUIPMENT[id] || AMMO[id] || MODULES[id]
      || MEDKITS[id] || ZONE_KEYS[id] || LOOT_ITEMS[id] || null;
}

// Добавить предмет в схрон
function addToStash(itemId, extraData = {}) {
  const item = findItemById(itemId);
  if (!item) return;
  gameData.stash.items.push({ ...item, ...extraData, _uid: generateUid(), _addedAt: Date.now() });
}

// Генерация уникального ID — единственное место определения
function generateUid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Форматирование коинов (используется и в raid.js и в script.js)
function formatCoins(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M ₵';
  if (n >= 1000)    return (n / 1000).toFixed(0) + 'K ₵';
  return n + ' ₵';
}

// Безопасный HTML
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Форматирование числа с разделителями
function fmtNum(n) {
  return Number(n).toLocaleString('ru-RU');
}

// Случайное целое в диапазоне [min, max]
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Toast-уведомление
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const loaded = loadData();
  if (!loaded) {
    gameData = defaultGameData();
    generateLeaderboard();
    // Карта строится ОДИН РАЗ при первом старте аккаунта
    gameData.persistentMap = buildStaticMap();
    saveData();
  } else if (!gameData.persistentMap) {
    // Миграция: у старых сохранений карты ещё нет
    gameData.persistentMap = buildStaticMap();
    saveData();
  }

  // Навигация
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      if (tabId) switchTab(tabId);
    });
  });

  // Первая вкладка
  switchTab('tab-home');

  // Симуляция ботов каждые 30 секунд
  setInterval(() => {
    simulateBots();
    saveData();
    if (currentTab === 'tab-leaderboard') renderLeaderboard();
  }, 30000);

  console.log('Extraction Game — загружено');
});

// ============================================================
// ВЫЩЁЛКИВАНИЕ ПАТРОНОВ ИЗ МАГАЗИНА
// ============================================================

function openEjectModal(uid) {
  const item = gameData.stash.items.find(function(i){ return i._uid === uid; });
  if (!item || !item.ammoCount) return;

  // Найти существующий стак того же типа в схроне (не этот)
  const existingStack = gameData.stash.items.find(function(i){
    return i._uid !== uid && i.id === item.id && i.ammoCount > 0;
  });

  const el = document.getElementById('tab-stash');
  const overlay = document.createElement('div');
  overlay.id = 'eject-modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-title">📤 Выщелкнуть патроны</div>
      <div class="modal-sub">${escHtml(item.name)} · ${item.ammoCount} шт.</div>
      <div class="modal-row">
        <label>Количество:</label>
        <input id="eject-count" type="number" min="1" max="${item.ammoCount}" value="${item.ammoCount}"
               class="modal-input" style="width:80px">
        <span> / ${item.ammoCount}</span>
      </div>
      <div class="modal-row">
        <label>Куда:</label>
        <select id="eject-dest" class="modal-input">
          <option value="pool">В общий пул (добавить к стаку)</option>
          <option value="stack">Как отдельный стак</option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn-primary" onclick="confirmEject('${uid}')">Выщелкнуть</button>
        <button class="btn-secondary" onclick="closeModal('eject-modal-overlay')">Отмена</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function confirmEject(uid) {
  const item = gameData.stash.items.find(function(i){ return i._uid === uid; });
  if (!item) { closeModal('eject-modal-overlay'); return; }

  const countEl = document.getElementById('eject-count');
  const destEl  = document.getElementById('eject-dest');
  const count   = Math.min(Math.max(1, parseInt(countEl.value) || 1), item.ammoCount);
  const dest    = destEl.value;

  if (dest === 'pool') {
    // Ищем существующий стак в схроне (не этот предмет)
    const existing = gameData.stash.items.find(function(i){
      return i._uid !== uid && i.id === item.id && i.ammoCount !== undefined;
    });
    if (existing) {
      existing.ammoCount += count;
    } else {
      // Нет стака — создаём новый
      gameData.stash.items.push(Object.assign({}, item, {
        ammoCount: count, _uid: generateUid(), _addedAt: Date.now()
      }));
    }
  } else {
    // Отдельный стак
    gameData.stash.items.push(Object.assign({}, item, {
      ammoCount: count, _uid: generateUid(), _addedAt: Date.now()
    }));
  }

  // Уменьшаем источник
  item.ammoCount -= count;
  if (item.ammoCount <= 0) {
    gameData.stash.items = gameData.stash.items.filter(function(i){ return i._uid !== uid; });
  }

  closeModal('eject-modal-overlay');
  saveData();
  renderStash();
  showToast('📤 Выщелкнуто: ' + count + ' патр.', 'success');
}

// ============================================================
// ОКНО МОДУЛЕЙ НА ОРУЖИИ (схрон)
// ============================================================

function openWeaponModsModal(uid) {
  const weapon = gameData.stash.items.find(function(i){ return i._uid === uid; });
  if (!weapon) return;

  const mods    = weapon.modules || {};
  const wtype   = WEAPON_TYPES[weapon.type];
  const slots   = wtype ? wtype.slots : ['scope','grip','magazine','stock'];
  const slotNames = { scope:'Прицел', grip:'Рукоять', magazine:'Магазин', stock:'Приклад' };

  const rows = slots.map(function(s) {
    const mod = mods[s] ? (typeof mods[s] === 'object' ? mods[s] : MODULES[mods[s]]) : null;
    if (!mod) return `<div class="mod-row"><span class="mod-slot-name">${slotNames[s]||s}</span><span class="mod-empty">—</span></div>`;
    return `
      <div class="mod-row">
        <span class="mod-slot-name">${slotNames[s]||s}</span>
        <span class="mod-icon">${mod.icon||'🔩'}</span>
        <span class="mod-name">${escHtml(mod.name)}</span>
        <button class="btn-icon btn-eject" title="Снять модуль" onclick="removeModFromWeapon('${uid}','${s}')">✕</button>
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

function removeModFromWeapon(weaponUid, slot) {
  const weapon = gameData.stash.items.find(function(i){ return i._uid === weaponUid; });
  if (!weapon || !weapon.modules || !weapon.modules[slot]) return;

  const mod = weapon.modules[slot];
  const modData = typeof mod === 'object' ? mod : MODULES[mod];

  if (modData) {
    // Кладём модуль в схрон как отдельный предмет
    gameData.stash.items.push(Object.assign({}, modData, {
      _uid: generateUid(), _addedAt: Date.now()
    }));
  }

  weapon.modules[slot] = null;
  closeModal('mods-modal-overlay');
  saveData();
  renderStash();
  showToast('Модуль снят: ' + (modData ? modData.name : slot), 'success');
  // Открыть заново если есть ещё модули
  const hasAny = Object.values(weapon.modules||{}).some(function(v){ return v; });
  if (hasAny) openWeaponModsModal(weaponUid);
}

// ============================================================
// УНИВЕРСАЛЬНОЕ ЗАКРЫТИЕ МОДАЛКИ
// ============================================================

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// Кнопка «Зарядить все» — вызов из UI
function fillAllMagsAndRefresh() {
  const spent = fillMagazinesFromStack();
  saveData();
  renderCurrentTab();
  if (spent > 0) showToast('⬇️ Заряжено ' + spent + ' патр. в магазины', 'success');
  else showToast('Нечего заряжать', 'info');
}
