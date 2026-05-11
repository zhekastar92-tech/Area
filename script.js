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
      medkits:       [],            // аптечки в слотах разгрузки
      keyring:       [null,null,null,null], // ключница — 4 слота
      backpackItems: [],            // предметы в рюкзаке (до рейда)
      keys:          [],            // legacy — оставляем для совместимости
      _equippedUids: {},
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
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));

  const content = document.getElementById(tabId);
  const btn = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
  if (content) content.classList.add('active');
  if (btn) btn.classList.add('active');

  currentTab = tabId;

  // В рейде доступны только рюкзак и снаряжение
  updateNavForRaidState();

  switch (tabId) {
    case 'tab-home':        renderHome();        break;
    case 'tab-stash':       renderStash();       break;
    case 'tab-backpack':    renderBackpack();    break;
    case 'tab-loadout':     renderLoadout();     break;
    case 'tab-traders':     renderTraders();     break;
    case 'tab-raid':        renderRaid();        break;
    case 'tab-leaderboard': renderLeaderboard(); break;
  }
}

// Скрываем/показываем вкладки в зависимости от того в рейде ли игрок
function updateNavForRaidState() {
  const inRaid = !!(gameData.raid && gameData.raid.active);
  const raidOnlyTabs = ['tab-home', 'tab-stash', 'tab-traders', 'tab-leaderboard'];
  const baseOnlyTabs = ['tab-raid'];

  document.querySelectorAll('.nav-tab').forEach(btn => {
    const tabId = btn.dataset.tab;
    if (inRaid) {
      // В рейде — прячем базовые вкладки, оставляем рейд/рюкзак/снаряжение
      btn.style.display = raidOnlyTabs.includes(tabId) ? 'none' : '';
    } else {
      // Вне рейда — прячем рюкзак (он пуст вне рейда, путаница)
      btn.style.display = tabId === 'tab-backpack' ? 'none' : '';
    }
  });
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
// ЦЕНЫ
// ============================================================

function getItemMarketMinPrice(item) {
  // Лут с редкостью (junk/common/rare/valuable/precious) — фиксированная цена
  if (item.rarity) return item.price || 0;
  // Аптечки, ключи — фиксированная цена
  if (MEDKITS[item.id] || ZONE_KEYS[item.id]) return item.price || 0;

  const tier = item.tier || 1;

  if (item.type && WEAPON_TYPES[item.type]) {
    const pr = BLACK_MARKET_PRICES.weapon[tier];
    return pr ? pr.min : (item.price || 0);
  }
  if (AMMO[item.id] || item._isAmmoStack) {
    const pr = BLACK_MARKET_PRICES.ammo[tier];
    return pr ? pr.min : (item.price || 0);
  }
  if (item.slot === 'helmet' || item.slot === 'vest') {
    const pr = BLACK_MARKET_PRICES.armor[tier];
    return pr ? pr.min : (item.price || 0);
  }
  if (item.slot === 'backpack' || item.slot === 'rig') {
    const pr = BLACK_MARKET_PRICES.gear[tier];
    return pr ? pr.min : (item.price || 0);
  }
  if (item.type && ['magazine','scope','grip','stock'].includes(item.type)) {
    const prMap = BLACK_MARKET_PRICES.module[item.type];
    const pr = prMap ? prMap[tier] : null;
    return pr ? pr.min : (item.price || 0);
  }
  return item.price || 0;
}

// Цена продажи = рыночный минимум (для лута — фиксированная цена из data.js)
function getItemSellPrice(item) {
  return getItemMarketMinPrice(item);
}

// Текстовое описание предмета для модалки
function getItemDescription(item) {
  const lines = [];
  if (item.desc) lines.push(item.desc);
  if (item.type && WEAPON_TYPES[item.type]) {
    lines.push(`Тип: ${item.type} · Точность: ${item.accuracy}% · Магазин: ${item.magSize} патр.`);
    if (item.specialBonus) lines.push(`🌟 ${item.specialBonus.desc}`);
    if (item.compatAmmo && item.compatAmmo.length)
      lines.push(`Патроны: ${item.compatAmmo.map(id => AMMO[id]?.name || id).join(', ')}`);
  }
  if (item.slot === 'helmet') lines.push(`Броня головы: ${item.protection}`);
  if (item.slot === 'vest')   lines.push(`Броня тела: ${item.protection}`);
  if (item.slot === 'backpack') lines.push(`Вместимость: ${item.carryWeight} кг`);
  if (item.slot === 'rig') lines.push(`Слоты: ${item.magSlots} маг. · ${item.medSlots} апт.`);
  if (AMMO[item.id] || item._isAmmoStack) {
    lines.push(`Урон: ${item.dmg} · Пробитие: ${item.pen}`);
    if (item.ammoCount) lines.push(`Количество: ${item.ammoCount} шт.`);
  }
  if (item.type === 'scope' || item.type === 'grip' || item.type === 'stock')
    lines.push(`Бонус точности: +${item.accuracyBonus}`);
  if (item.type === 'magazine') lines.push(`Бонус магазина: +${item.magBonus} патр.`);
  if (item.uses !== undefined) lines.push(`Использований: ${item.uses}`);
  if (item.healAmount) lines.push(`Лечит: ${item.healAmount} HP${item.healsBleeding ? ' + кровотечение' : ''}`);
  return lines.length ? lines.join('\n') : 'Нет описания';
}

// ============================================================
// РЕНДЕР — СХРОН
// ============================================================

function renderStash() {
  const el = document.getElementById('tab-stash');
  const items = gameData.stash.items;
  const totalWeight = items.reduce((s, i) => s + (i.weight || 0), 0);

  const backpack = gameData.loadout.backpack ? EQUIPMENT[gameData.loadout.backpack] : null;
  const inRaid   = !!(gameData.raid && gameData.raid.active);
  const raidLoot = inRaid ? (gameData.raid.loot || []) : [];
  const curCarry = raidLoot.reduce((s, i) => s + (i.weight || 0), 0);
  const maxCarry = backpack ? backpack.carryWeight : 0;

  el.innerHTML = `
    <div class="section-header">
      <h2>📦 Схрон</h2>
      <div class="stash-weight">${totalWeight.toFixed(1)} кг</div>
    </div>

    ${backpack ? `
      <div class="backpack-status-bar">
        🎒 ${escHtml(backpack.name)} — ${curCarry.toFixed(1)} / ${maxCarry} кг
        ${inRaid ? `<button class="btn-small btn-secondary" onclick="switchTab('tab-backpack')">Рюкзак →</button>` : ''}
      </div>
    ` : `
      <div class="backpack-status-bar warn">⚠️ Рюкзак не надет</div>
    `}

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
  const tierColor = item.tier
    ? getTierColor(item.tier)
    : (LOOT_RARITY_COLORS && LOOT_RARITY_COLORS[item.rarity]) || '#94a3b8';
  const tierLabel = item.tier
    ? TIERS[item.tier].label
    : item.rarity
      ? ({junk:'Мусор',common:'Обычный',rare:'Редкий',valuable:'Ценный',precious:'Драгоценный'}[item.rarity] || '')
      : '';
  const sellPrice = getItemSellPrice(item);
  const usesLabel = item.uses ? ` · ${item.uses} исп.` : '';

  return `
    <div class="stash-item" style="border-color:${tierColor}33;--tier-color:${tierColor}"
         onclick="openStashItemModal('${item._uid}')">
      <div class="item-icon">${item.icon || '📦'}</div>
      <div class="item-info">
        <div class="item-name">${escHtml(item.name)}</div>
        <div class="item-tier" style="color:${tierColor}">${tierLabel}${usesLabel}</div>
      </div>
      <div class="item-weight">${item.weight ? item.weight.toFixed(1) + ' кг' : ''}</div>
      <div class="item-price-tag">${CURRENCY_ICON} ${fmtNum(sellPrice)}</div>
    </div>
  `;
}

// ============================================================
// МОДАЛКА ПРЕДМЕТА В СХРОНЕ
// ============================================================

function openStashItemModal(uid) {
  const item = gameData.stash.items.find(i => i._uid === uid);
  if (!item) return;

  const tierColor = item.tier
    ? getTierColor(item.tier)
    : (LOOT_RARITY_COLORS && LOOT_RARITY_COLORS[item.rarity]) || '#94a3b8';
  const sellPrice = getItemSellPrice(item);
  const descLines = getItemDescription(item).split('\n');

  const inRaid   = !!(gameData.raid && gameData.raid.active);
  const backpack = gameData.loadout.backpack ? EQUIPMENT[gameData.loadout.backpack] : null;
  const maxCarry = backpack ? backpack.carryWeight : 0;
  const curCarry = inRaid ? (gameData.raid.loot || []).reduce((s, i) => s + (i.weight || 0), 0) : 0;
  const canPack  = inRaid && backpack && (curCarry + (item.weight || 0) <= maxCarry);
  const cantReason = !inRaid ? 'Только в рейде' : !backpack ? 'Нет рюкзака' : 'Рюкзак полон';

  const euids = gameData.loadout._equippedUids || {};
  const isEquipped = Object.values(euids).includes(uid)
    || (gameData.loadout.modules && Object.values(gameData.loadout.modules).includes(item.id));

  // Ключ — можно взять в рейд отдельно
  const isKey = !!ZONE_KEYS[item.id];
  const keyAlreadyInRaid = isKey && (gameData.loadout.keys || []).some(k => k._uid === uid);

  const overlay = document.createElement('div');
  overlay.id = 'item-modal-overlay';
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
        ${isKey
          ? keyAlreadyInRaid
            ? `<button class="btn-primary" disabled>🔑 Уже в рейде</button>`
            : inRaid
              ? `<button class="btn-primary" onclick="takeKeyToRaid('${uid}')">🔑 Взять в рейд</button>`
              : `<button class="btn-primary" disabled title="Войди в рейд">🔑 Взять в рейд</button>`
          : canPack
            ? `<button class="btn-primary" onclick="putInBackpack('${uid}')">🎒 В рюкзак</button>`
            : `<button class="btn-primary" disabled>${cantReason}</button>`
        }
        ${!isEquipped
          ? `<button class="btn-danger-ghost" onclick="sellItemFromModal('${uid}')">₵ Продать за ${fmtNum(sellPrice)}</button>`
          : `<button class="btn-danger-ghost" disabled>Надет — сначала сними</button>`
        }
        <button class="btn-secondary" onclick="closeModal('item-modal-overlay')">Закрыть</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal('item-modal-overlay'); });
}

function takeKeyToRaid(uid) {
  const item = gameData.stash.items.find(i => i._uid === uid);
  if (!item || !gameData.raid) return;
  if (!gameData.loadout.keys) gameData.loadout.keys = [];
  // Переносим из схрона в loadout.keys
  gameData.stash.items = gameData.stash.items.filter(i => i._uid !== uid);
  gameData.loadout.keys.push(item);
  closeModal('item-modal-overlay');
  saveData();
  renderStash();
  showToast(`🔑 ${item.name} — взят в рейд`, 'success');
}

function putInBackpack(uid) {
  const item = gameData.stash.items.find(i => i._uid === uid);
  if (!item || !gameData.raid || !gameData.raid.active) return;
  const backpack = gameData.loadout.backpack ? EQUIPMENT[gameData.loadout.backpack] : null;
  if (!backpack) { showToast('Нет рюкзака', 'warning'); return; }
  const maxCarry = backpack.carryWeight;
  const curCarry = (gameData.raid.loot || []).reduce((s, i) => s + (i.weight || 0), 0);
  if (curCarry + (item.weight || 0) > maxCarry) { showToast('⚠️ Рюкзак полон!', 'warning'); return; }
  gameData.stash.items = gameData.stash.items.filter(i => i._uid !== uid);
  gameData.raid.loot.push(item);
  closeModal('item-modal-overlay');
  saveData();
  renderStash();
  showToast(`🎒 ${item.name} → рюкзак`, 'success');
}

function sellItemFromModal(uid) {
  closeModal('item-modal-overlay');
  const idx = gameData.stash.items.findIndex(i => i._uid === uid);
  if (idx === -1) return;
  const item = gameData.stash.items[idx];
  const euids = gameData.loadout._equippedUids || {};
  const isEquipped = Object.values(euids).includes(uid)
    || (gameData.loadout.modules && Object.values(gameData.loadout.modules).includes(item.id));
  if (isEquipped) { showToast('Сначала сними предмет', 'warning'); return; }
  const price = getItemSellPrice(item);
  gameData.coins += price;
  gameData.stash.items.splice(idx, 1);
  saveData();
  renderStash();
  showToast(`Продано: +${CURRENCY_ICON}${fmtNum(price)}`, 'success');
}

function sellItem(uid) { sellItemFromModal(uid); }

// ============================================================
// РЕНДЕР — РЮКЗАК
// ============================================================

function renderBackpack() {
  const el = document.getElementById('tab-backpack');
  const inRaid   = !!(gameData.raid && gameData.raid.active);
  const backpack = gameData.loadout.backpack ? EQUIPMENT[gameData.loadout.backpack] : null;
  const loot     = inRaid ? (gameData.raid.loot || []) : [];
  const keys     = inRaid ? (gameData.loadout.keys || []) : [];
  const maxCarry = backpack ? backpack.carryWeight : 0;
  const curCarry = loot.reduce((s, i) => s + (i.weight || 0), 0);

  if (!inRaid) {
    el.innerHTML = `
      <div class="section-header"><h2>🎒 Рюкзак</h2></div>
      <div class="empty-state">
        <div class="empty-icon">🎯</div>
        <div class="empty-text">Вы не в рейде</div>
        <div class="empty-sub">Рюкзак доступен только во время рейда</div>
        <button class="btn-primary" onclick="switchTab('tab-raid')">🎯 В рейд</button>
      </div>`;
    return;
  }

  const pct = maxCarry > 0 ? Math.min(100, curCarry / maxCarry * 100) : 0;
  const barColor = pct >= 90 ? 'var(--danger)' : pct >= 70 ? '#f59e0b' : 'var(--success)';

  el.innerHTML = `
    <div class="section-header">
      <h2>🎒 Рюкзак</h2>
      <div class="stash-weight">${curCarry.toFixed(1)} / ${maxCarry} кг</div>
    </div>
    <div class="backpack-bar-wrap">
      <div class="backpack-bar" style="width:${pct}%;background:${barColor}"></div>
    </div>
    <div class="backpack-info">${backpack ? escHtml(backpack.name) + ' · Тир ' + backpack.tier : '⚠️ Рюкзака нет'}</div>

    ${keys.length > 0 ? `
      <div class="bm-section-title" style="margin-bottom:6px">🔑 Ключи в рейде</div>
      <div class="stash-grid" style="margin-bottom:12px">
        ${keys.map(k => `
          <div class="stash-item" style="border-color:#f59e0b33;--tier-color:#f59e0b">
            <div class="item-icon">${k.icon}</div>
            <div class="item-info">
              <div class="item-name">${escHtml(k.name)}</div>
              <div class="item-tier" style="color:#f59e0b">${k.uses} исп.</div>
            </div>
            <button class="btn-danger-ghost btn-small" onclick="returnKeyToStash('${k._uid}')">← Вернуть</button>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${loot.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">Рюкзак пуст</div>
        <div class="empty-sub">Подними лут в рейде или переложи из схрона</div>
      </div>
    ` : `
      <div class="stash-grid">
        ${loot.map(item => renderBackpackItem(item)).join('')}
      </div>
    `}
    ${curCarry > maxCarry ? `<div class="overweight-warn">⚠️ Перегруз! Выброси лишнее</div>` : ''}
  `;
}

function returnKeyToStash(uid) {
  if (!gameData.loadout.keys) return;
  const idx = gameData.loadout.keys.findIndex(k => k._uid === uid);
  if (idx === -1) return;
  const key = gameData.loadout.keys.splice(idx, 1)[0];
  gameData.stash.items.push(key);
  saveData();
  renderBackpack();
  showToast(`🔑 ${key.name} возвращён в схрон`, 'info');
}

function renderBackpackItem(item) {
  const tierColor = item.tier
    ? getTierColor(item.tier)
    : (LOOT_RARITY_COLORS && LOOT_RARITY_COLORS[item.rarity]) || '#94a3b8';
  const sellPrice = getItemSellPrice(item);
  return `
    <div class="stash-item" style="border-color:${tierColor}33;--tier-color:${tierColor}"
         onclick="openBackpackItemModal('${item._uid}')">
      <div class="item-icon">${item.icon || '📦'}</div>
      <div class="item-info">
        <div class="item-name">${escHtml(item.name)}</div>
        <div class="item-tier" style="color:${tierColor}">${item.tier ? 'Тир ' + item.tier : (item.rarity || '')}</div>
      </div>
      <div class="item-weight">${item.weight ? item.weight.toFixed(1) + ' кг' : ''}</div>
      <div class="item-price-tag">${CURRENCY_ICON} ${fmtNum(sellPrice)}</div>
    </div>
  `;
}

function openBackpackItemModal(uid) {
  if (!gameData.raid) return;
  const item = (gameData.raid.loot || []).find(i => i._uid === uid);
  if (!item) return;
  const tierColor = item.tier
    ? getTierColor(item.tier)
    : (LOOT_RARITY_COLORS && LOOT_RARITY_COLORS[item.rarity]) || '#94a3b8';
  const sellPrice = getItemSellPrice(item);
  const descLines = getItemDescription(item).split('\n');

  const overlay = document.createElement('div');
  overlay.id = 'item-modal-overlay';
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
        <button class="btn-danger-ghost" onclick="dropFromBackpackModal('${uid}')">🗑️ Выбросить</button>
        <button class="btn-secondary" onclick="closeModal('item-modal-overlay')">Закрыть</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal('item-modal-overlay'); });
}

function dropFromBackpackModal(uid) {
  if (!gameData.raid) return;
  const idx = (gameData.raid.loot || []).findIndex(i => i._uid === uid);
  if (idx === -1) return;
  const item = gameData.raid.loot.splice(idx, 1)[0];
  closeModal('item-modal-overlay');
  saveData();
  renderBackpack();
  showToast(`Выброшено: ${item.name}`, 'info');
}

// ============================================================
// РЕНДЕР — СНАРЯЖЕНИЕ (LOADOUT)
// Полная переработка: рюкзак в схроне, разгрузка с явными
// слотами, модули через попап на оружии, ключница 4 слота.
// ============================================================

// ── ВКЛАДКА СНАРЯЖЕНИЯ ──────────────────────────────────────

function renderLoadout() {
  const el = document.getElementById('tab-loadout');
  const lo = gameData.loadout;
  const inRaid = !!(gameData.raid && gameData.raid.active);

  el.innerHTML = `
    <div class="section-header"><h2>🪖 Снаряжение</h2></div>

    <div class="loadout-sections">

      <!-- ОРУЖИЕ -->
      <div class="lo-section">
        <div class="lo-section-title">🔫 Оружие</div>
        ${renderWeaponSlot(lo)}
      </div>

      <!-- БРОНЯ -->
      <div class="lo-section">
        <div class="lo-section-title">🛡️ Броня</div>
        <div class="lo-row2">
          ${renderArmorSlot('helmet', '🪖', 'Шлем', lo.helmet)}
          ${renderArmorSlot('vest', '🦺', 'Броник', lo.vest)}
        </div>
      </div>

      <!-- РАЗГРУЗКА -->
      <div class="lo-section">
        <div class="lo-section-title">🎽 Разгрузка</div>
        ${renderRigSection(lo)}
      </div>

      <!-- КЛЮЧНИЦА -->
      <div class="lo-section">
        <div class="lo-section-title">🔑 Ключница (4 слота)</div>
        ${renderKeyring(lo)}
      </div>

      <!-- РЮКЗАК -->
      <div class="lo-section">
        <div class="lo-section-title">🎒 Рюкзак</div>
        ${renderBackpackSection(lo)}
      </div>

    </div>

    <div class="loadout-weight">
      <span>Общий вес снаряжения:</span>
      <span class="weight-value">${calcLoadoutWeight().toFixed(1)} кг</span>
    </div>

    <div class="loadout-summary">${renderLoadoutStats()}</div>
  `;
}

// ── СЛОТ ОРУЖИЯ ─────────────────────────────────────────────

function renderWeaponSlot(lo) {
  const weapon = lo.weapon ? WEAPONS[lo.weapon] : null;
  const tierColor = weapon ? getTierColor(weapon.tier) : '#334155';

  if (!weapon) {
    return `
      <div class="lo-slot lo-slot-empty" onclick="openWeaponPicker()">
        <span class="lo-slot-icon">🔫</span>
        <span class="lo-slot-label">Выбрать оружие</span>
      </div>`;
  }

  // Модули
  const modSlots = WEAPON_TYPES[weapon.type] ? WEAPON_TYPES[weapon.type].slots : [];
  const modsHtml = modSlots.map(slotType => {
    const modId = lo.modules && lo.modules[slotType];
    const mod = modId ? MODULES[modId] : null;
    const names = { scope: 'Прицел', grip: 'Рукоять', magazine: 'Магазин', stock: 'Приклад' };
    return `<span class="lo-mod-tag ${mod ? 'lo-mod-filled' : 'lo-mod-empty'}">${mod ? mod.icon + ' ' + mod.name : '+ ' + names[slotType]}</span>`;
  }).join('');

  return `
    <div class="lo-weapon-card" style="border-color:${tierColor}55" onclick="openWeaponDetailModal()">
      <div class="lo-weapon-icon">${weapon.icon}</div>
      <div class="lo-weapon-info">
        <div class="lo-weapon-name">${escHtml(weapon.name)}</div>
        <div class="lo-weapon-tier" style="color:${tierColor}">Тир ${weapon.tier} · ${weapon.magSize} патр.</div>
        <div class="lo-mods-row">${modsHtml || '<span class="lo-mod-empty">нет слотов модулей</span>'}</div>
      </div>
      <div class="lo-weapon-acc">
        <div class="lo-acc-val">${calcLoadoutStats().accuracy}%</div>
        <div class="lo-acc-label">точн.</div>
      </div>
    </div>
    <div class="lo-weapon-actions">
      <button class="btn-secondary btn-small" onclick="openWeaponDetailModal()">🔩 Модули</button>
      <button class="btn-secondary btn-small" onclick="openWeaponPicker()">↔ Сменить</button>
      <button class="btn-danger-ghost btn-small" onclick="unequipSlot('weapon')">✕ Снять</button>
    </div>
    ${renderAmmoSlot(lo)}
    ${renderMagSection(lo)}
  `;
}

// ── СЛОТ ПАТРОНОВ ───────────────────────────────────────────

function renderAmmoSlot(lo) {
  const weapon = lo.weapon ? WEAPONS[lo.weapon] : null;
  const ammo = lo.ammo ? AMMO[lo.ammo] : null;
  if (!weapon) return '';

  const compatIds = weapon.compatAmmo || [];
  const compatNames = compatIds.map(id => AMMO[id] ? AMMO[id].name : id).join(', ');

  return `
    <div class="lo-ammo-row">
      <div class="lo-ammo-info">
        ${ammo
          ? `<span class="lo-ammo-name">${ammo.icon} ${escHtml(ammo.name)}</span>
             <span class="lo-ammo-count">${lo.ammoCount || 0} шт. в рюкзаке</span>`
          : `<span class="lo-ammo-empty">Патроны не выбраны</span>`}
        <span class="lo-ammo-compat">Совместимы: ${escHtml(compatNames)}</span>
      </div>
      <button class="btn-secondary btn-small" onclick="openAmmoPicker()">
        ${ammo ? '↔ Сменить' : '+ Выбрать патроны'}
      </button>
    </div>`;
}

// ── МАГАЗИНЫ ────────────────────────────────────────────────

function renderMagSection(lo) {
  const rig = lo.rig ? EQUIPMENT[lo.rig] : null;
  const maxSlots = rig ? rig.magSlots : 0;
  const cap = getMagCapacity();
  const mags = lo.magazines || [];

  if (!lo.weapon) return '';

  let html = `<div class="lo-mags-section">
    <div class="lo-mags-header">
      <span>📦 Магазины (${mags.length}/${maxSlots} слотов разгрузки)</span>
      ${lo.ammo && lo.ammoCount > 0 ? `<button class="btn-secondary btn-small" onclick="fillAllMagsAndRefresh()">⬇ Зарядить все</button>` : ''}
    </div>`;

  if (maxSlots === 0) {
    html += `<div class="lo-mags-warn">⚠️ Надень разгрузку чтобы носить магазины</div>`;
  } else {
    for (let i = 0; i < maxSlots; i++) {
      const mag = mags[i];
      if (mag) {
        const pct = cap > 0 ? Math.round(mag.ammoCount / cap * 100) : 0;
        const color = pct >= 75 ? 'var(--success)' : pct >= 30 ? '#f59e0b' : 'var(--danger)';
        html += `
          <div class="lo-mag-row">
            <span class="lo-mag-num">#${i+1}</span>
            <div class="mag-bar-wrap"><div class="mag-bar" style="width:${pct}%;background:${color}"></div></div>
            <span class="lo-mag-count">${mag.ammoCount}/${cap}</span>
            <button class="btn-icon btn-small" onclick="loadMagazine('${mag._uid}')" title="Зарядить">⬇️</button>
            <button class="btn-icon btn-small" onclick="unloadMagazine('${mag._uid}')" title="Выщелкнуть">📤</button>
          </div>`;
      } else {
        html += `<div class="lo-mag-row lo-mag-empty"><span class="lo-mag-num">#${i+1}</span><span style="color:var(--text3)">— пусто —</span></div>`;
      }
    }
  }
  html += `<div class="lo-mags-footer">В рюкзаке: <b>${lo.ammoCount || 0}</b> патр. · В магазинах: <b>${getTotalMagAmmo()}</b> патр.</div>`;
  html += `</div>`;
  return html;
}

// ── БРОНЯ ───────────────────────────────────────────────────

function renderArmorSlot(slotId, icon, label, itemId) {
  const item = itemId ? EQUIPMENT[itemId] : null;
  const tierColor = item ? getTierColor(item.tier) : '#334155';
  return `
    <div class="lo-armor-slot ${item ? 'filled' : 'empty'}" onclick="openSlotPicker('${slotId}')">
      <div class="lo-armor-icon">${item ? item.icon : icon}</div>
      <div class="lo-armor-info">
        <div class="lo-armor-label">${label}</div>
        ${item
          ? `<div class="lo-armor-name" style="color:${tierColor}">${escHtml(item.name)}</div>
             <div class="lo-armor-prot">🛡 ${item.protection} брони · ${item.weight} кг</div>`
          : `<div class="lo-armor-empty">Пусто</div>`}
      </div>
      ${item ? `<button class="btn-danger-ghost btn-small lo-unequip" onclick="event.stopPropagation();unequipSlot('${slotId}')">✕</button>` : ''}
    </div>`;
}

// ── РАЗГРУЗКА ───────────────────────────────────────────────

function renderRigSection(lo) {
  const rig = lo.rig ? EQUIPMENT[lo.rig] : null;
  const tierColor = rig ? getTierColor(rig.tier) : '#334155';

  let html = '';
  if (!rig) {
    html += `<div class="lo-slot lo-slot-empty" onclick="openSlotPicker('rig')">
      <span class="lo-slot-icon">🎽</span><span class="lo-slot-label">Выбрать разгрузку</span>
    </div>`;
    return html;
  }

  html += `
    <div class="lo-rig-card" style="border-color:${tierColor}55">
      <div class="lo-rig-header">
        <span>${rig.icon} <b>${escHtml(rig.name)}</b> · Тир ${rig.tier}</span>
        <div>
          <button class="btn-secondary btn-small" onclick="openSlotPicker('rig')">↔ Сменить</button>
          <button class="btn-danger-ghost btn-small" onclick="unequipSlot('rig')">✕</button>
        </div>
      </div>
      <div class="lo-rig-slots">
        <div class="lo-rig-col">
          <div class="lo-rig-col-title">💊 Аптечки (${(lo.medkits||[]).length}/${rig.medSlots})</div>`;

  // Слоты аптечек
  for (let i = 0; i < rig.medSlots; i++) {
    const med = lo.medkits && lo.medkits[i];
    if (med) {
      html += `<div class="lo-rig-med-slot filled">
        <span>${med.icon} ${escHtml(med.name)}</span>
        <button class="btn-danger-ghost btn-small" onclick="removeMedkitFromRig(${i})">✕</button>
      </div>`;
    } else {
      html += `<div class="lo-rig-med-slot empty" onclick="openMedkitPicker(${i})">
        <span class="lo-slot-add">+ Аптечка</span>
      </div>`;
    }
  }
  html += `</div></div></div>`;
  return html;
}

// ── КЛЮЧНИЦА ────────────────────────────────────────────────

function renderKeyring(lo) {
  const keys = lo.keyring || [null, null, null, null];
  // гарантируем 4 слота
  while (keys.length < 4) keys.push(null);

  let html = '<div class="lo-keyring">';
  for (let i = 0; i < 4; i++) {
    const key = keys[i];
    if (key) {
      html += `<div class="lo-key-slot filled">
        <span class="lo-key-icon">${key.icon}</span>
        <div class="lo-key-info">
          <div class="lo-key-name">${escHtml(key.name)}</div>
          <div class="lo-key-uses">${key.uses} исп.</div>
        </div>
        <button class="btn-danger-ghost btn-small" onclick="removeKeyFromRing(${i})">✕</button>
      </div>`;
    } else {
      html += `<div class="lo-key-slot empty" onclick="openKeyPicker(${i})">
        <span class="lo-key-add">🔑 Добавить ключ</span>
      </div>`;
    }
  }
  html += '</div>';
  return html;
}

// ── РЮКЗАК В СХРОНЕ ─────────────────────────────────────────

function renderBackpackSection(lo) {
  const backpack = lo.backpack ? EQUIPMENT[lo.backpack] : null;
  const tierColor = backpack ? getTierColor(backpack.tier) : '#334155';
  const items = lo.backpackItems || [];
  const curWeight = items.reduce((s, i) => s + (i.weight || 0), 0);
  const maxWeight = backpack ? backpack.carryWeight : 0;

  let html = '';

  if (!backpack) {
    html += `<div class="lo-slot lo-slot-empty" onclick="openSlotPicker('backpack')">
      <span class="lo-slot-icon">🎒</span><span class="lo-slot-label">Выбрать рюкзак</span>
    </div>`;
    return html;
  }

  html += `
    <div class="lo-bp-card" style="border-color:${tierColor}55">
      <div class="lo-bp-header">
        <span>${backpack.icon} <b>${escHtml(backpack.name)}</b> · ${curWeight.toFixed(1)}/${maxWeight} кг</span>
        <div>
          <button class="btn-secondary btn-small" onclick="openSlotPicker('backpack')">↔ Сменить</button>
          <button class="btn-danger-ghost btn-small" onclick="unequipSlot('backpack')">✕</button>
        </div>
      </div>
      <div class="backpack-bar-wrap">
        <div class="backpack-bar" style="width:${maxWeight>0?Math.min(100,curWeight/maxWeight*100):0}%;background:${curWeight>=maxWeight?'var(--danger)':'var(--success)'}"></div>
      </div>`;

  // Кнопка добавить предмет
  html += `<button class="btn-secondary btn-small lo-bp-add" onclick="openBackpackItemPicker()">+ Положить предмет из схрона</button>`;

  // Содержимое рюкзака
  if (items.length > 0) {
    html += '<div class="lo-bp-items">';
    items.forEach(item => {
      const c = item.tier ? getTierColor(item.tier) : (LOOT_RARITY_COLORS[item.rarity] || '#94a3b8');
      html += `<div class="lo-bp-item">
        <span style="color:${c}">${item.icon} ${escHtml(item.name)}${item.ammoCount ? ' ×'+item.ammoCount : ''}</span>
        <span class="lo-bp-weight">${item.weight ? item.weight.toFixed(1)+' кг' : '—'}</span>
        <button class="btn-danger-ghost btn-small" onclick="removeFromBackpack('${item._uid}')">✕</button>
      </div>`;
    });
    html += '</div>';
  } else {
    html += '<div class="lo-bp-empty">Рюкзак пуст — положи снаряжение для рейда</div>';
  }

  html += '</div>';
  return html;
}

// ── ПИКЕРЫ ──────────────────────────────────────────────────

function openWeaponPicker() {
  const candidates = gameData.stash.items.filter(i => i.type && WEAPON_TYPES[i.type]);
  _openGenericPicker('weapon', 'Выбрать оружие', candidates, (uid) => {
    const item = gameData.stash.items.find(i => i._uid === uid);
    if (!item) return;
    if (!gameData.loadout._equippedUids) gameData.loadout._equippedUids = {};
    gameData.loadout.weapon = item.id;
    gameData.loadout._equippedUids.weapon = uid;
    // Сброс модулей и патронов при смене оружия
    gameData.loadout.modules = { scope: null, grip: null, magazine: null, stock: null };
    gameData.loadout.ammo = null;
    gameData.loadout.ammoCount = 0;
    gameData.loadout.magazines = [];
    saveData(); renderLoadout();
    showToast(`✓ ${item.name}`, 'success');
  });
}

function openAmmoPicker() {
  const weapon = gameData.loadout.weapon ? WEAPONS[gameData.loadout.weapon] : null;
  if (!weapon) { showToast('Сначала выбери оружие', 'warning'); return; }
  const compatIds = weapon.compatAmmo || [];
  const candidates = gameData.stash.items.filter(i => AMMO[i.id] && compatIds.includes(i.id));
  _openGenericPicker('ammo', 'Выбрать патроны', candidates, (uid) => {
    const item = gameData.stash.items.find(i => i._uid === uid);
    if (!item) return;
    gameData.loadout.ammo = item.id;
    gameData.loadout.ammoCount = item.ammoCount || 0;
    if (!gameData.loadout._equippedUids) gameData.loadout._equippedUids = {};
    gameData.loadout._equippedUids.ammo = uid;
    saveData(); renderLoadout();
    showToast(`✓ ${item.name} — ${item.ammoCount} шт.`, 'success');
  });
}

function openMedkitPicker(slotIndex) {
  const rig = gameData.loadout.rig ? EQUIPMENT[gameData.loadout.rig] : null;
  if (!rig) { showToast('Нет разгрузки', 'warning'); return; }
  const candidates = gameData.stash.items.filter(i => MEDKITS[i.id]);
  _openGenericPicker('medkit', 'Выбрать аптечку', candidates, (uid) => {
    const item = gameData.stash.items.find(i => i._uid === uid);
    if (!item) return;
    if (!gameData.loadout.medkits) gameData.loadout.medkits = [];
    if (gameData.loadout.medkits.length >= rig.medSlots) { showToast('Слоты заполнены', 'warning'); return; }
    gameData.stash.items = gameData.stash.items.filter(i => i._uid !== uid);
    gameData.loadout.medkits.splice(slotIndex, 0, item);
    gameData.loadout.medkits = gameData.loadout.medkits.slice(0, rig.medSlots);
    saveData(); renderLoadout();
    showToast(`✓ ${item.name} → разгрузка`, 'success');
  });
}

function removeMedkitFromRig(index) {
  const med = (gameData.loadout.medkits || [])[index];
  if (!med) return;
  gameData.loadout.medkits.splice(index, 1);
  gameData.stash.items.push(med);
  saveData(); renderLoadout();
  showToast(`${med.name} → схрон`, 'info');
}

function openKeyPicker(slotIndex) {
  const candidates = gameData.stash.items.filter(i => ZONE_KEYS[i.id]);
  _openGenericPicker('key', 'Выбрать ключ', candidates, (uid) => {
    const item = gameData.stash.items.find(i => i._uid === uid);
    if (!item) return;
    if (!gameData.loadout.keyring) gameData.loadout.keyring = [null,null,null,null];
    gameData.stash.items = gameData.stash.items.filter(i => i._uid !== uid);
    gameData.loadout.keyring[slotIndex] = item;
    saveData(); renderLoadout();
    showToast(`🔑 ${item.name} → ключница`, 'success');
  });
}

function removeKeyFromRing(slotIndex) {
  const key = (gameData.loadout.keyring || [])[slotIndex];
  if (!key) return;
  gameData.loadout.keyring[slotIndex] = null;
  gameData.stash.items.push(key);
  saveData(); renderLoadout();
  showToast(`${key.name} → схрон`, 'info');
}

function openBackpackItemPicker() {
  const backpack = gameData.loadout.backpack ? EQUIPMENT[gameData.loadout.backpack] : null;
  if (!backpack) { showToast('Нет рюкзака', 'warning'); return; }
  const bpItems = gameData.loadout.backpackItems || [];
  const curWeight = bpItems.reduce((s, i) => s + (i.weight || 0), 0);

  // Всё из схрона что не надето и помещается
  const equipped = Object.values(gameData.loadout._equippedUids || {});
  const medkitUids = (gameData.loadout.medkits || []).map(m => m._uid);
  const keyUids = (gameData.loadout.keyring || []).filter(Boolean).map(k => k._uid);
  const bpUids = bpItems.map(i => i._uid);
  const candidates = gameData.stash.items.filter(i =>
    !equipped.includes(i._uid) &&
    !medkitUids.includes(i._uid) &&
    !keyUids.includes(i._uid) &&
    !bpUids.includes(i._uid)
  );

  _openGenericPicker('backpack-item', 'Положить в рюкзак', candidates, (uid) => {
    const item = gameData.stash.items.find(i => i._uid === uid);
    if (!item) return;
    const newWeight = curWeight + (item.weight || 0);
    if (newWeight > backpack.carryWeight) { showToast('⚠️ Рюкзак полон!', 'warning'); return; }
    gameData.stash.items = gameData.stash.items.filter(i => i._uid !== uid);
    if (!gameData.loadout.backpackItems) gameData.loadout.backpackItems = [];
    gameData.loadout.backpackItems.push(item);
    saveData(); renderLoadout();
    showToast(`🎒 ${item.name} → рюкзак`, 'success');
  });
}

function removeFromBackpack(uid) {
  const items = gameData.loadout.backpackItems || [];
  const idx = items.findIndex(i => i._uid === uid);
  if (idx === -1) return;
  const item = items.splice(idx, 1)[0];
  gameData.stash.items.push(item);
  saveData(); renderLoadout();
  showToast(`${item.name} → схрон`, 'info');
}

// Универсальный пикер-модалка
function _openGenericPicker(type, title, candidates, onSelect) {
  const existing = document.getElementById('generic-picker-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'generic-picker-overlay';
  overlay.className = 'modal-overlay';

  const rows = candidates.length === 0
    ? '<div class="empty-sub">В схроне нет подходящих предметов</div>'
    : candidates.map(item => {
        const tierColor = item.tier ? getTierColor(item.tier) : (LOOT_RARITY_COLORS[item.rarity] || '#94a3b8');
        let meta = '';
        if (item.protection) meta = `🛡 ${item.protection} брони`;
        else if (item.carryWeight) meta = `🎒 ${item.carryWeight} кг`;
        else if (item.healAmount) meta = `💊 +${item.healAmount} HP`;
        else if (item.ammoCount) meta = `× ${item.ammoCount} шт.`;
        else if (item.uses) meta = `${item.uses} исп.`;
        else if (item.accuracyBonus) meta = `+${item.accuracyBonus} точн.`;
        else if (item.magBonus) meta = `+${item.magBonus} патр.`;
        return `
          <div class="picker-item" style="border-color:${tierColor}55" onclick="window._pickerSelect('${item._uid}')">
            <div class="picker-icon">${item.icon || '📦'}</div>
            <div class="picker-info">
              <div class="picker-name">${escHtml(item.name)}</div>
              <div class="picker-sub" style="color:${tierColor}">${item.tier ? 'Тир '+item.tier : (item.rarity||'')} ${meta ? '· '+meta : ''}</div>
            </div>
            <div class="picker-weight">${item.weight ? item.weight.toFixed(1)+' кг' : ''}</div>
          </div>`;
      }).join('');

  overlay.innerHTML = `
    <div class="modal-box item-detail-modal">
      <div class="modal-title">${title}</div>
      <div class="picker-list">${rows}</div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="closeModal('generic-picker-overlay')">Закрыть</button>
      </div>
    </div>`;

  window._pickerSelect = (uid) => {
    closeModal('generic-picker-overlay');
    onSelect(uid);
  };

  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal('generic-picker-overlay'); });
  document.body.appendChild(overlay);
}

// ── МОДАЛКА ДЕТАЛЕЙ ОРУЖИЯ (модули) ─────────────────────────

function openWeaponDetailModal() {
  const lo = gameData.loadout;
  const weapon = lo.weapon ? WEAPONS[lo.weapon] : null;
  if (!weapon) return;

  const tierColor = getTierColor(weapon.tier);
  const wtype = WEAPON_TYPES[weapon.type];
  const modSlots = wtype ? wtype.slots : [];
  const slotNames = { scope: 'Прицел', grip: 'Рукоять', magazine: 'Магазин', stock: 'Приклад' };

  const slotsHtml = modSlots.map(slotType => {
    const modId = lo.modules && lo.modules[slotType];
    const mod = modId ? MODULES[modId] : null;
    return `
      <div class="mod-detail-row">
        <span class="mod-slot-name">${slotNames[slotType] || slotType}</span>
        ${mod
          ? `<span class="mod-detail-filled">${mod.icon} ${escHtml(mod.name)} (${mod.accuracyBonus ? '+'+mod.accuracyBonus+' точн.' : '+'+mod.magBonus+' патр.'})</span>
             <button class="btn-secondary btn-small" onclick="openModulePickerForSlot('${slotType}')">↔</button>
             <button class="btn-danger-ghost btn-small" onclick="unequipModuleAndRefresh('${slotType}')">✕</button>`
          : `<span class="mod-detail-empty">— пусто —</span>
             <button class="btn-secondary btn-small" onclick="openModulePickerForSlot('${slotType}')">+ Установить</button>`}
      </div>`;
  }).join('');

  const stats = calcLoadoutStats();

  const overlay = document.createElement('div');
  overlay.id = 'weapon-detail-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box item-detail-modal">
      <div class="item-modal-header" style="border-color:${tierColor}">
        <div class="item-modal-icon">${weapon.icon}</div>
        <div class="item-modal-title">
          <div class="item-modal-name">${escHtml(weapon.name)}</div>
          <div class="item-modal-tier" style="color:${tierColor}">Тир ${weapon.tier} · ${weapon.type}</div>
        </div>
      </div>
      <div class="mod-detail-stats">
        <span>🎯 Точность: <b>${stats.accuracy}%</b></span>
        <span>📦 Магазин: <b>${stats.magSize} патр.</b></span>
        ${weapon.specialBonus ? `<span>🌟 ${weapon.specialBonus.desc}</span>` : ''}
      </div>
      <div class="mod-detail-list">${slotsHtml || '<div class="empty-sub">Нет слотов модулей</div>'}</div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="closeModal('weapon-detail-overlay')">Закрыть</button>
      </div>
    </div>`;

  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal('weapon-detail-overlay'); });
  document.body.appendChild(overlay);
}

function openModulePickerForSlot(slotType) {
  closeModal('weapon-detail-overlay');
  const candidates = gameData.stash.items.filter(i => i.type === slotType && MODULES[i.id]);
  _openGenericPicker('module', 'Выбрать: ' + slotType, candidates, (uid) => {
    const item = gameData.stash.items.find(i => i._uid === uid);
    if (!item) return;
    if (!gameData.loadout.modules) gameData.loadout.modules = {};
    gameData.loadout.modules[slotType] = item.id;
    saveData(); renderLoadout();
    showToast(`✓ ${item.name}`, 'success');
    openWeaponDetailModal();
  });
}

function unequipModuleAndRefresh(slotType) {
  closeModal('weapon-detail-overlay');
  unequipModule(slotType);
  openWeaponDetailModal();
}

// ── ОБНОВЛЁННЫЕ ФУНКЦИИ ЭКИПИРОВКИ ──────────────────────────

function openSlotPicker(slotId) {
  let candidates = [];
  if (slotId === 'helmet' || slotId === 'vest' || slotId === 'rig' || slotId === 'backpack') {
    candidates = gameData.stash.items.filter(i => i.slot === slotId && !i._inactive);
  }
  _openGenericPicker(slotId, 'Выбрать: ' + slotId, candidates, (uid) => {
    equipItem(slotId, uid);
  });
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
