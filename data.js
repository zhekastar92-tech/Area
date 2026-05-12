// ============================================================
// DATA.JS — База данных игры
// Все константы: тиры, оружие, патроны, экипировка, карта
// ============================================================

// ============================================================
// ВАЛЮТА
// ============================================================

const CURRENCY_NAME = 'Коин';
const CURRENCY_ICON = '₵';
const STARTING_COINS = 5000; // fallback, реальный старт — randomStartCoins()

// ============================================================
// ТИРЫ
// isActive: false — тир закрыт. Убрать строку _inactive чтобы открыть.
// ============================================================

const TIERS = {
  1: { name: 'Тир I',   label: 'I',   color: '#94a3b8', glowColor: 'rgba(148,163,184,0.4)', isActive: true  },
  2: { name: 'Тир II',  label: 'II',  color: '#4ade80', glowColor: 'rgba(74,222,128,0.4)',  isActive: true  },
  3: { name: 'Тир III', label: 'III', color: '#60a5fa', glowColor: 'rgba(96,165,250,0.4)',  isActive: true  },
  4: { name: 'Тир IV',  label: 'IV',  color: '#c084fc', glowColor: 'rgba(192,132,252,0.4)', isActive: true  },
  5: { name: 'Тир V',   label: 'V',   color: '#fb923c', glowColor: 'rgba(251,146,60,0.4)',  isActive: false }, // убрать isActive чтобы открыть тир V
  6: { name: 'Тир VI',  label: 'VI',  color: '#f43f5e', glowColor: 'rgba(244,63,94,0.4)',   isActive: false }, // убрать isActive чтобы открыть тир VI
};

// ============================================================
// ТИПЫ ОРУЖИЯ
// ammoType      — ключ типа патрона
// shotsPerRound — диапазон выстрелов за раунд (движок берёт рандом каждый раунд)
// ============================================================

const WEAPON_TYPES = {
  rifle: {
    id: 'rifle', name: 'Штурмовая винтовка', icon: '🎯',
    ammoType: 'rifle',
    shotsPerRound: { min: 4, max: 6 },
    slots: ['scope', 'grip', 'magazine', 'stock'],
    desc: 'Основной класс. Баланс урона, точности, скорострельности.',
  },
  smg: {
    id: 'smg', name: 'Пистолет-пулемёт', icon: '⚡',
    ammoType: 'smg',
    shotsPerRound: { min: 6, max: 12 },
    slots: ['scope', 'magazine', 'grip', 'stock'],
    desc: 'Высокая скорострельность, невысокий урон за пулю.',
  },
  shotgun: {
    id: 'shotgun', name: 'Дробовик', icon: '💥',
    ammoType: 'shotgun',
    shotsPerRound: { min: 10, max: 20 },
    slots: ['scope', 'grip', 'magazine', 'stock'],
    desc: 'Много дробин за раунд. Высокий суммарный урон в упор.',
  },
  sniper: {
    id: 'sniper', name: 'Снайперская винтовка', icon: '🔭',
    ammoType: 'sniper',
    shotsPerRound: { min: 1, max: 2 },
    slots: ['scope', 'stock'],
    desc: 'Высокий урон и ПРБ. Мало выстрелов за раунд.',
  },
};

// ============================================================
// ПАТРОНЫ
// dmg         — бонус урона за один выстрел
// pen         — пробитие брони за один выстрел
// ammoType    — тип оружия к которому подходят
// compatTiers — тиры оружия с которыми совместимы
// ============================================================

const AMMO = {

  // === ПП (9x19) ===
  smg_t1: {
    id: 'smg_t1', ammoType: 'smg', tier: 1,
    name: '9×19 PSO', icon: '🟤',
    dmg: 1, pen: 0.5,
    weight: 0.01, price: 8,
    compatTiers: [1, 2, 3, 4, 5, 6],
    desc: 'Базовый. 1 урона / 0.5 ПРБ за выстрел.',
  },
  smg_t2: {
    id: 'smg_t2', ammoType: 'smg', tier: 2,
    name: '9×19 GC', icon: '🟢',
    dmg: 1, pen: 1,
    weight: 0.011, price: 20,
    compatTiers: [1, 2, 3, 4, 5, 6],
    desc: 'Улучшенный. 1 урона / 1 ПРБ за выстрел.',
  },
  smg_t3: {
    id: 'smg_t3', ammoType: 'smg', tier: 3,
    name: '9×19 PST', icon: '🔵',
    dmg: 1.5, pen: 1,
    weight: 0.012, price: 50,
    compatTiers: [1, 2, 3, 4, 5, 6],
    desc: 'Армейский. 1.5 урона / 1 ПРБ за выстрел.',
  },
  smg_t4: {
    id: 'smg_t4', ammoType: 'smg', tier: 4,
    name: '9×19 AP 6.3', icon: '🟣',
    dmg: 2, pen: 1,
    weight: 0.013, price: 120,
    compatTiers: [1, 2, 3, 4, 5, 6],
    desc: 'Бронебойный. 2 урона / 1 ПРБ за выстрел.',
  },
  smg_t5: {
    id: 'smg_t5', ammoType: 'smg', tier: 5,
    name: '9×19 7N21', icon: '🟠',
    dmg: 3, pen: 1.5,
    weight: 0.014, price: 300,
    compatTiers: [4, 5, 6],
    _inactive: true, // убрать чтобы открыть
    desc: '3 урона / 1.5 ПРБ за выстрел.',
  },
  smg_t6: {
    id: 'smg_t6', ammoType: 'smg', tier: 6,
    name: '9×19 7N31', icon: '🔴',
    dmg: 4, pen: 2.5,
    weight: 0.015, price: 700,
    compatTiers: [4, 5, 6],
    _inactive: true,
    desc: 'Высший класс. 4 урона / 2.5 ПРБ за выстрел.',
  },

  // === ШТУРМОВЫЕ ВИНТОВКИ (5.56) ===
  rifle_t1: {
    id: 'rifle_t1', ammoType: 'rifle', tier: 1,
    name: '5×56 WM', icon: '🟤',
    dmg: 2, pen: 1,
    weight: 0.012, price: 12,
    compatTiers: [1, 2, 3, 4, 5, 6],
    desc: 'Базовый. 2 урона / 1 ПРБ за выстрел.',
  },
  rifle_t2: {
    id: 'rifle_t2', ammoType: 'rifle', tier: 2,
    name: '5×56 M193', icon: '🟢',
    dmg: 2, pen: 2.5,
    weight: 0.013, price: 30,
    compatTiers: [1, 2, 3, 4, 5, 6],
    desc: '2 урона / 2.5 ПРБ за выстрел.',
  },
  rifle_t3: {
    id: 'rifle_t3', ammoType: 'rifle', tier: 3,
    name: '5×56 M855', icon: '🔵',
    dmg: 2.5, pen: 3,
    weight: 0.013, price: 60,
    compatTiers: [1, 2, 3, 4, 5, 6],
    desc: 'Армейский стандарт. 2.5 урона / 3 ПРБ за выстрел.',
  },
  rifle_t4: {
    id: 'rifle_t4', ammoType: 'rifle', tier: 4,
    name: '5×56 M855A1', icon: '🟣',
    dmg: 3, pen: 3,
    weight: 0.014, price: 140,
    compatTiers: [1, 2, 3, 4, 5, 6],
    desc: 'Усиленный. 3 урона / 3 ПРБ за выстрел.',
  },
  rifle_t5: {
    id: 'rifle_t5', ammoType: 'rifle', tier: 5,
    name: '5×56 M995', icon: '🟠',
    dmg: 4, pen: 3,
    weight: 0.015, price: 320,
    compatTiers: [4, 5, 6],
    _inactive: true,
    desc: 'Вольфрамовый сердечник. 4 урона / 3 ПРБ за выстрел.',
  },
  rifle_t6: {
    id: 'rifle_t6', ammoType: 'rifle', tier: 6,
    name: '5×56 M99 AP', icon: '🔴',
    dmg: 6, pen: 4,
    weight: 0.016, price: 800,
    compatTiers: [4, 5, 6],
    _inactive: true,
    desc: 'Противоброневой. 6 урона / 4 ПРБ за выстрел.',
  },

  // === ДРОБОВИКИ ===
  shotgun_t1: {
    id: 'shotgun_t1', ammoType: 'shotgun', tier: 1,
    name: 'n7', icon: '🟤',
    dmg: 0.3, pen: 0.5,
    weight: 0.03, price: 10,
    compatTiers: [1, 2, 3, 4, 5, 6],
    desc: 'Базовая дробь. 0.3 урона / 0.5 ПРБ за дробину.',
  },
  shotgun_t2: {
    id: 'shotgun_t2', ammoType: 'shotgun', tier: 2,
    name: '8.2mm', icon: '🟢',
    dmg: 0.5, pen: 0.5,
    weight: 0.032, price: 28,
    compatTiers: [1, 2, 3, 4, 5, 6],
    desc: '0.5 урона / 0.5 ПРБ за дробину.',
  },
  shotgun_t3: {
    id: 'shotgun_t3', ammoType: 'shotgun', tier: 3,
    name: 'LS16', icon: '🔵',
    dmg: 1, pen: 0.5,
    weight: 0.034, price: 65,
    compatTiers: [1, 2, 3, 4, 5, 6],
    desc: 'Армейский. 1 урона / 0.5 ПРБ за дробину.',
  },
  shotgun_t4: {
    id: 'shotgun_t4', ammoType: 'shotgun', tier: 4,
    name: 'AP-20', icon: '🟣',
    dmg: 1, pen: 1,
    weight: 0.036, price: 150,
    compatTiers: [1, 2, 3, 4, 5, 6],
    desc: 'Бронебойная дробь. 1 урона / 1 ПРБ за дробину.',
  },
  shotgun_t5: {
    id: 'shotgun_t5', ammoType: 'shotgun', tier: 5,
    name: 'Fch22', icon: '🟠',
    dmg: 2, pen: 2,
    weight: 0.038, price: 380,
    compatTiers: [4, 5, 6],
    _inactive: true,
    desc: 'Усиленная. 2 урона / 2 ПРБ за дробину.',
  },
  shotgun_t6: {
    id: 'shotgun_t6', ammoType: 'shotgun', tier: 6,
    name: 'SPM Frag 12', icon: '🔴',
    dmg: 3, pen: 3,
    weight: 0.040, price: 900,
    compatTiers: [4, 5, 6],
    _inactive: true,
    desc: 'Осколочная. 3 урона / 3 ПРБ за дробину.',
  },

  // === СНАЙПЕРСКИЕ (.308) ===
  sniper_t1: {
    id: 'sniper_t1', ammoType: 'sniper', tier: 1,
    name: '.308 SP', icon: '🟤',
    dmg: 8, pen: 4,
    weight: 0.025, price: 40,
    compatTiers: [1, 2, 3, 4, 5, 6],
    desc: 'Базовый. 8 урона / 4 ПРБ за выстрел.',
  },
  sniper_t2: {
    id: 'sniper_t2', ammoType: 'sniper', tier: 2,
    name: '.308 FMJ', icon: '🟢',
    dmg: 12, pen: 6,
    weight: 0.026, price: 100,
    compatTiers: [1, 2, 3, 4, 5, 6],
    desc: 'Оболочечный. 12 урона / 6 ПРБ за выстрел.',
  },
  sniper_t3: {
    id: 'sniper_t3', ammoType: 'sniper', tier: 3,
    name: '.308 BCP', icon: '🔵',
    dmg: 15, pen: 10,
    weight: 0.027, price: 200,
    compatTiers: [1, 2, 3, 4, 5, 6],
    desc: 'Бронебойный. 15 урона / 10 ПРБ за выстрел.',
  },
  sniper_t4: {
    id: 'sniper_t4', ammoType: 'sniper', tier: 4,
    name: '.308 M80 6.3', icon: '🟣',
    dmg: 18, pen: 14,
    weight: 0.028, price: 450,
    compatTiers: [1, 2, 3, 4, 5, 6],
    desc: 'Усиленный. 18 урона / 14 ПРБ за выстрел.',
  },
  sniper_t5: {
    id: 'sniper_t5', ammoType: 'sniper', tier: 5,
    name: '.308 M61', icon: '🟠',
    dmg: 22, pen: 18,
    weight: 0.029, price: 1000,
    compatTiers: [4, 5, 6],
    _inactive: true,
    desc: '22 урона / 18 ПРБ за выстрел.',
  },
  sniper_t6: {
    id: 'sniper_t6', ammoType: 'sniper', tier: 6,
    name: '.308 M993', icon: '🔴',
    dmg: 25, pen: 22,
    weight: 0.030, price: 2500,
    compatTiers: [4, 5, 6],
    _inactive: true,
    desc: 'AP финального класса. 25 урона / 22 ПРБ за выстрел.',
  },
};

// ============================================================
// ОРУЖИЕ
// damage       — множитель урона (x патрон dmg)
// accuracy     — базовая точность 0–100 (% попадания в голову)
// magSize      — ёмкость магазина
// specialBonus — уникальный бонус (тир 4+):
//   type: 'accuracy' | 'armorPen' | 'damage'
//   value: прибавляется накопительно за каждый выстрел в раунде
// compatAmmo   — список id совместимых патронов
// _inactive    — закрыт до открытия тира
// ============================================================

const WEAPONS = {

  // ================================================================
  // ШТУРМОВЫЕ ВИНТОВКИ
  // ================================================================
  ar_t1: {
    id: 'ar_t1', type: 'rifle', tier: 1,
    name: 'АКМ', icon: '🎯',
    damage: 1.0, accuracy: 13, magSize: 30,
    weight: 1.6, price: 3500,
    compatAmmo: ['rifle_t1'],
    desc: 'Советская классика. Надёжна в любых условиях.',
  },
  ar_t2: {
    id: 'ar_t2', type: 'rifle', tier: 2,
    name: 'Galil', icon: '🎯',
    damage: 1.0, accuracy: 15, magSize: 35,
    weight: 1.9, price: 8000,
    compatAmmo: ['rifle_t1', 'rifle_t2'],
    desc: 'Израильский автомат. Чуть точнее АКМ, больший магазин.',
  },
  ar_t3: {
    id: 'ar_t3', type: 'rifle', tier: 3,
    name: 'FN SCAR-H', icon: '🎯',
    damage: 1.0, accuracy: 17, magSize: 30,
    weight: 2.4, price: 18000,
    compatAmmo: ['rifle_t1', 'rifle_t2', 'rifle_t3'],
    desc: 'Высокоточная платформа. Надёжна в любых климатических условиях.',
  },
  ar_t4a: {
    id: 'ar_t4a', type: 'rifle', tier: 4,
    name: 'G36C', icon: '🎯',
    damage: 1.0, accuracy: 19, magSize: 30,
    specialBonus: { type: 'accuracy', value: 5, desc: '+5 к меткости за выстрел' },
    weight: 2.8, price: 32000,
    compatAmmo: ['rifle_t1', 'rifle_t2', 'rifle_t3', 'rifle_t4'],
    desc: 'Немецкая точность. +5 к меткости накопительно за каждый выстрел в раунде.',
  },
  ar_t4b: {
    id: 'ar_t4b', type: 'rifle', tier: 4,
    name: 'ADAR 2-15', icon: '🎯',
    damage: 1.0, accuracy: 18, magSize: 30,
    specialBonus: { type: 'armorPen', value: 2, desc: '+2 к ПРБ за выстрел' },
    weight: 2.9, price: 30000,
    compatAmmo: ['rifle_t1', 'rifle_t2', 'rifle_t3', 'rifle_t4'],
    desc: 'Пробивная платформа. +2 к ПРБ за каждый выстрел в раунде.',
  },
  ar_t5a: {
    id: 'ar_t5a', type: 'rifle', tier: 5,
    name: 'HK416', icon: '🎯',
    damage: 1.0, accuracy: 22, magSize: 30,
    specialBonus: { type: 'accuracy', value: 10, desc: '+10 к меткости за выстрел' },
    weight: 3.6, price: 60000,
    compatAmmo: ['rifle_t4', 'rifle_t5'],
    _inactive: true,
    desc: 'Оружие спецподразделений. +10 к меткости за выстрел.',
  },
  ar_t5b: {
    id: 'ar_t5b', type: 'rifle', tier: 5,
    name: 'SIG Spear', icon: '🎯',
    damage: 1.0, accuracy: 20, magSize: 20,
    specialBonus: { type: 'armorPen', value: 4, desc: '+4 к ПРБ за выстрел' },
    weight: 3.4, price: 58000,
    compatAmmo: ['rifle_t4', 'rifle_t5'],
    _inactive: true,
    desc: 'Следующее поколение штурмовых платформ. +4 к ПРБ за выстрел.',
  },
  ar_t6a: {
    id: 'ar_t6a', type: 'rifle', tier: 6,
    name: 'HK417', icon: '🎯',
    damage: 1.0, accuracy: 24, magSize: 20,
    specialBonus: { type: 'accuracy', value: 15, desc: '+15 к меткости за выстрел' },
    weight: 4.0, price: 120000,
    compatAmmo: ['rifle_t4', 'rifle_t5', 'rifle_t6'],
    _inactive: true,
    desc: 'Элитная платформа. +15 к меткости за каждый выстрел.',
  },
  ar_t6b: {
    id: 'ar_t6b', type: 'rifle', tier: 6,
    name: 'MDRX', icon: '🎯',
    damage: 1.0, accuracy: 22, magSize: 20,
    specialBonus: { type: 'armorPen', value: 6, desc: '+6 к ПРБ за выстрел' },
    weight: 3.8, price: 115000,
    compatAmmo: ['rifle_t4', 'rifle_t5', 'rifle_t6'],
    _inactive: true,
    desc: 'Максимальная бронепробиваемость. +6 к ПРБ за каждый выстрел.',
  },

  // ================================================================
  // ПИСТОЛЕТЫ-ПУЛЕМЁТЫ
  // ================================================================
  smg_t1: {
    id: 'smg_t1', type: 'smg', tier: 1,
    name: 'ПП-19', icon: '⚡',
    damage: 1.0, accuracy: 13, magSize: 53,
    weight: 1.2, price: 2500,
    compatAmmo: ['smg_t1'],
    desc: 'Бизон. Огромный барабанный магазин, невысокая точность.',
  },
  smg_t2: {
    id: 'smg_t2', type: 'smg', tier: 2,
    name: 'MP5SD', icon: '⚡',
    damage: 1.0, accuracy: 15, magSize: 30,
    weight: 1.6, price: 7000,
    compatAmmo: ['smg_t1', 'smg_t2'],
    desc: 'Немецкий классик с интегрированным глушителем.',
  },
  smg_t3: {
    id: 'smg_t3', type: 'smg', tier: 3,
    name: 'P90', icon: '⚡',
    damage: 1.0, accuracy: 17, magSize: 50,
    weight: 2.0, price: 15000,
    compatAmmo: ['smg_t1', 'smg_t2', 'smg_t3'],
    desc: 'Бельгийский ПП. Уникальный магазин на 50 патронов.',
  },
  smg_t4a: {
    id: 'smg_t4a', type: 'smg', tier: 4,
    name: 'SIG MPX', icon: '⚡',
    damage: 1.0, accuracy: 19, magSize: 30,
    specialBonus: { type: 'accuracy', value: 8, desc: '+8 к меткости за выстрел' },
    weight: 2.4, price: 28000,
    compatAmmo: ['smg_t1', 'smg_t2', 'smg_t3', 'smg_t4'],
    desc: 'Высокая эргономика. +8 к меткости за каждый выстрел.',
  },
  smg_t4b: {
    id: 'smg_t4b', type: 'smg', tier: 4,
    name: 'MP7A2', icon: '⚡',
    damage: 1.0, accuracy: 17, magSize: 40,
    specialBonus: { type: 'damage', value: 2, desc: '+2 к урону за выстрел' },
    weight: 2.2, price: 26000,
    compatAmmo: ['smg_t1', 'smg_t2', 'smg_t3', 'smg_t4'],
    desc: 'Немецкая разработка для ближнего боя. +2 к урону за выстрел.',
  },
  smg_t5a: {
    id: 'smg_t5a', type: 'smg', tier: 5,
    name: 'MP9-N', icon: '⚡',
    damage: 1.0, accuracy: 21, magSize: 30,
    specialBonus: { type: 'accuracy', value: 13, desc: '+13 к меткости за выстрел' },
    weight: 1.8, price: 55000,
    compatAmmo: ['smg_t4', 'smg_t5'],
    _inactive: true,
    desc: 'Компактный швейцарский ПП. +13 к меткости за выстрел.',
  },
  smg_t5b: {
    id: 'smg_t5b', type: 'smg', tier: 5,
    name: 'Vector CBX', icon: '⚡',
    damage: 1.0, accuracy: 19, magSize: 33,
    specialBonus: { type: 'damage', value: 4, desc: '+4 к урону за выстрел' },
    weight: 2.1, price: 52000,
    compatAmmo: ['smg_t4', 'smg_t5'],
    _inactive: true,
    desc: 'Высокая отдача — высокий урон. +4 к урону за выстрел.',
  },
  smg_t6a: {
    id: 'smg_t6a', type: 'smg', tier: 6,
    name: 'MP8 "Asiris"', icon: '⚡',
    damage: 1.0, accuracy: 23, magSize: 35,
    specialBonus: { type: 'accuracy', value: 20, desc: '+20 к меткости за выстрел' },
    weight: 2.0, price: 110000,
    compatAmmo: ['smg_t4', 'smg_t5', 'smg_t6'],
    _inactive: true,
    desc: 'Прототип высшего класса. +20 к меткости за выстрел.',
  },
  smg_t6b: {
    id: 'smg_t6b', type: 'smg', tier: 6,
    name: 'SIG "Krait"', icon: '⚡',
    damage: 1.0, accuracy: 21, magSize: 35,
    specialBonus: { type: 'damage', value: 6, desc: '+6 к урону за выстрел' },
    weight: 2.2, price: 108000,
    compatAmmo: ['smg_t4', 'smg_t5', 'smg_t6'],
    _inactive: true,
    desc: 'Максимальный урон в классе ПП. +6 к урону за выстрел.',
  },

  // ================================================================
  // ДРОБОВИКИ
  // ================================================================
  sg_t1: {
    id: 'sg_t1', type: 'shotgun', tier: 1,
    name: 'МП-133', icon: '💥',
    damage: 1.0, accuracy: 12, magSize: 8,
    weight: 1.5, price: 2000,
    compatAmmo: ['shotgun_t1'],
    desc: 'Отечественный помповик. Просто и надёжно.',
  },
  sg_t2: {
    id: 'sg_t2', type: 'shotgun', tier: 2,
    name: 'Benelli Nova', icon: '💥',
    damage: 1.0, accuracy: 13, magSize: 8,
    weight: 1.9, price: 6000,
    compatAmmo: ['shotgun_t1', 'shotgun_t2'],
    desc: 'Итальянский помп. Надёжен в любых условиях.',
  },
  sg_t3: {
    id: 'sg_t3', type: 'shotgun', tier: 3,
    name: 'Saiga-12', icon: '💥',
    damage: 1.0, accuracy: 15, magSize: 10,
    weight: 2.4, price: 14000,
    compatAmmo: ['shotgun_t1', 'shotgun_t2', 'shotgun_t3'],
    desc: 'Самозарядный дробовик на базе АК. Высокая скорострельность.',
  },
  sg_t4a: {
    id: 'sg_t4a', type: 'shotgun', tier: 4,
    name: 'Vepr 12 "Molot"', icon: '💥',
    damage: 1.0, accuracy: 17, magSize: 12,
    specialBonus: { type: 'armorPen', value: 0.5, desc: '+0.5 к ПРБ за выстрел' },
    weight: 2.8, price: 26000,
    compatAmmo: ['shotgun_t1', 'shotgun_t2', 'shotgun_t3', 'shotgun_t4'],
    desc: 'Тактический самозарядный дробовик. +0.5 к ПРБ за выстрел.',
  },
  sg_t4b: {
    id: 'sg_t4b', type: 'shotgun', tier: 4,
    name: 'Tavor TS12', icon: '💥',
    damage: 1.0, accuracy: 16, magSize: 15,
    specialBonus: { type: 'damage', value: 1, desc: '+1 к урону за выстрел' },
    weight: 2.9, price: 24000,
    compatAmmo: ['shotgun_t1', 'shotgun_t2', 'shotgun_t3', 'shotgun_t4'],
    desc: 'Израильский дробовик с тройным магазином. +1 к урону за выстрел.',
  },
  sg_t5a: {
    id: 'sg_t5a', type: 'shotgun', tier: 5,
    name: 'SG Six12', icon: '💥',
    damage: 1.0, accuracy: 18, magSize: 12,
    specialBonus: { type: 'armorPen', value: 1, desc: '+1 к ПРБ за выстрел' },
    weight: 3.2, price: 50000,
    compatAmmo: ['shotgun_t4', 'shotgun_t5'],
    _inactive: true,
    desc: 'Барабанный дробовик. +1 к ПРБ за выстрел.',
  },
  sg_t5b: {
    id: 'sg_t5b', type: 'shotgun', tier: 5,
    name: 'Origin-12', icon: '💥',
    damage: 1.0, accuracy: 17, magSize: 16,
    specialBonus: { type: 'damage', value: 2, desc: '+2 к урону за выстрел' },
    weight: 3.7, price: 48000,
    compatAmmo: ['shotgun_t4', 'shotgun_t5'],
    _inactive: true,
    desc: 'Полуавтоматический дробовик с большим магазином. +2 к урону.',
  },
  sg_t6a: {
    id: 'sg_t6a', type: 'shotgun', tier: 6,
    name: 'AA-12 CQB', icon: '💥',
    damage: 1.0, accuracy: 20, magSize: 20,
    specialBonus: { type: 'accuracy', value: 2, desc: '+2 к меткости за выстрел' },
    weight: 5.0, price: 100000,
    compatAmmo: ['shotgun_t4', 'shotgun_t5', 'shotgun_t6'],
    _inactive: true,
    desc: 'Полностью автоматический дробовик. +2 к меткости за выстрел.',
  },
  sg_t6b: {
    id: 'sg_t6b', type: 'shotgun', tier: 6,
    name: 'Taur SW500', icon: '💥',
    damage: 1.0, accuracy: 18, magSize: 10,
    specialBonus: { type: 'damage', value: 3, desc: '+3 к урону за выстрел' },
    weight: 4.5, price: 96000,
    compatAmmo: ['shotgun_t4', 'shotgun_t5', 'shotgun_t6'],
    _inactive: true,
    desc: 'Крупнокалиберный дробовик. +3 к урону за выстрел.',
  },

  // ================================================================
  // СНАЙПЕРСКИЕ ВИНТОВКИ
  // ================================================================
  sr_t1: {
    id: 'sr_t1', type: 'sniper', tier: 1,
    name: 'СВДС', icon: '🔭',
    damage: 1.0, accuracy: 18, magSize: 10,
    weight: 1.8, price: 5000,
    compatAmmo: ['sniper_t1'],
    desc: 'Советская снайперская — складная версия. Надёжна и точна.',
  },
  sr_t2: {
    id: 'sr_t2', type: 'sniper', tier: 2,
    name: 'М40', icon: '🔭',
    damage: 1.0, accuracy: 21, magSize: 5,
    weight: 2.2, price: 12000,
    compatAmmo: ['sniper_t1', 'sniper_t2'],
    desc: 'Американская bolt-action. Высокая точность.',
  },
  sr_t3: {
    id: 'sr_t3', type: 'sniper', tier: 3,
    name: 'L96A1', icon: '🔭',
    damage: 1.0, accuracy: 23, magSize: 10,
    weight: 2.7, price: 24000,
    compatAmmo: ['sniper_t1', 'sniper_t2', 'sniper_t3'],
    desc: 'Британская прецизионная снайперка.',
  },
  sr_t4a: {
    id: 'sr_t4a', type: 'sniper', tier: 4,
    name: 'M200 CT', icon: '🔭',
    damage: 1.0, accuracy: 25, magSize: 7,
    specialBonus: { type: 'accuracy', value: 10, desc: '+10 к меткости за выстрел' },
    weight: 3.0, price: 44000,
    compatAmmo: ['sniper_t1', 'sniper_t2', 'sniper_t3', 'sniper_t4'],
    desc: 'CheyTac — точность на предельных дистанциях. +10 к меткости.',
  },
  sr_t4b: {
    id: 'sr_t4b', type: 'sniper', tier: 4,
    name: 'SR-25', icon: '🔭',
    damage: 1.0, accuracy: 23, magSize: 20,
    specialBonus: { type: 'damage', value: 10, desc: '+10 к урону за выстрел' },
    weight: 2.9, price: 42000,
    compatAmmo: ['sniper_t1', 'sniper_t2', 'sniper_t3', 'sniper_t4'],
    desc: 'Полуавтоматическая снайперка. Большой магазин. +10 к урону.',
  },
  sr_t5a: {
    id: 'sr_t5a', type: 'sniper', tier: 5,
    name: 'AXSR 01', icon: '🔭',
    damage: 1.0, accuracy: 27, magSize: 10,
    specialBonus: { type: 'accuracy', value: 20, desc: '+20 к меткости за выстрел' },
    weight: 7.0, price: 90000,
    compatAmmo: ['sniper_t4', 'sniper_t5'],
    _inactive: true,
    desc: 'Прецизионная система высшего уровня. +20 к меткости.',
  },
  sr_t5b: {
    id: 'sr_t5b', type: 'sniper', tier: 5,
    name: 'Barrett M82A1', icon: '🔭',
    damage: 1.0, accuracy: 23, magSize: 10,
    specialBonus: { type: 'damage', value: 15, desc: '+15 к урону за выстрел' },
    weight: 14.0, price: 85000,
    compatAmmo: ['sniper_t4', 'sniper_t5'],
    _inactive: true,
    desc: 'Противоматериальная. Пробивает всё. +15 к урону.',
  },
  sr_t6a: {
    id: 'sr_t6a', type: 'sniper', tier: 6,
    name: 'Anzio 20R', icon: '🔭',
    damage: 1.0, accuracy: 29, magSize: 5,
    specialBonus: { type: 'accuracy', value: 30, desc: '+30 к меткости за выстрел' },
    weight: 18.0, price: 180000,
    compatAmmo: ['sniper_t4', 'sniper_t5', 'sniper_t6'],
    _inactive: true,
    desc: 'Абсолютная точность. +30 к меткости за выстрел.',
  },
  sr_t6b: {
    id: 'sr_t6b', type: 'sniper', tier: 6,
    name: 'DVL-10 "Silence"', icon: '🔭',
    damage: 1.0, accuracy: 27, magSize: 10,
    specialBonus: { type: 'damage', value: 20, desc: '+20 к урону за выстрел' },
    weight: 5.8, price: 175000,
    compatAmmo: ['sniper_t4', 'sniper_t5', 'sniper_t6'],
    _inactive: true,
    desc: 'Бесшумная снайперка с интегрированным глушителем. +20 к урону.',
  },
};

// ============================================================
// ЭКИПИРОВКА
// ============================================================

const EQUIPMENT = {

  // === ШЛЕМЫ (protection = броня головы) ===
  helmet_t1: {
    id: 'helmet_t1', slot: 'helmet', tier: 1,
    name: 'Ssh-60', icon: '⛑️',
    protection: 3, weight: 1.2, price: 800,
    desc: 'Стальной шлем советской эпохи. +3 брони.',
  },
  helmet_t2: {
    id: 'helmet_t2', slot: 'helmet', tier: 2,
    name: '6B47', icon: '🪖',
    protection: 6, weight: 1.0, price: 2500,
    desc: 'Лёгкий кевларовый шлем. +6 брони.',
  },
  helmet_t3: {
    id: 'helmet_t3', slot: 'helmet', tier: 3,
    name: 'H-V1', icon: '🪖',
    protection: 8, weight: 1.1, price: 6000,
    desc: 'Баллистический шлем с NVG-рейкой. +8 брони.',
  },
  helmet_t4: {
    id: 'helmet_t4', slot: 'helmet', tier: 4,
    name: 'T-7B "Ratnik-B"', icon: '🪖',
    protection: 12, weight: 1.4, price: 14000,
    desc: 'Шлем программы «Ратник». +12 брони.',
  },
  helmet_t5: {
    id: 'helmet_t5', slot: 'helmet', tier: 5,
    name: 'MG-8 "Рысь-Т"', icon: '🪖',
    protection: 16, weight: 1.6, price: 30000,
    _inactive: true,
    desc: 'Композитный шлем с интегрированным забралом. +16 брони.',
  },
  helmet_t6: {
    id: 'helmet_t6', slot: 'helmet', tier: 6,
    name: 'V-6 "Vanguard"', icon: '🪖',
    protection: 20, weight: 1.8, price: 65000,
    _inactive: true,
    desc: 'Титано-керамический шлем. Лучшая защита головы. +20 брони.',
  },

  // === БРОНИКИ (protection = броня тела) ===
  vest_t1: {
    id: 'vest_t1', slot: 'vest', tier: 1,
    name: 'P-10', icon: '🦺',
    protection: 5, weight: 2.5, price: 1200,
    desc: 'Мягкий бронежилет. +5 брони.',
  },
  vest_t2: {
    id: 'vest_t2', slot: 'vest', tier: 2,
    name: '6B23-1', icon: '🦺',
    protection: 10, weight: 3.0, price: 3500,
    desc: 'Армейский жилет 2-го класса. +10 брони.',
  },
  vest_t3: {
    id: 'vest_t3', slot: 'vest', tier: 3,
    name: 'H-V9', icon: '🦺',
    protection: 14, weight: 4.0, price: 9000,
    desc: 'Плитоноска с керамическими пластинами. +14 брони.',
  },
  vest_t4: {
    id: 'vest_t4', slot: 'vest', tier: 4,
    name: '6B45-3 "Ratnik-S"', icon: '🛡️',
    protection: 18, weight: 5.0, price: 20000,
    desc: 'Тяжёлая бронеплита программы «Ратник». +18 брони.',
  },
  vest_t5: {
    id: 'vest_t5', slot: 'vest', tier: 5,
    name: 'A-12 "Granit"', icon: '🛡️',
    protection: 22, weight: 8.0, price: 45000,
    _inactive: true,
    desc: 'Гранитная керамика. Высочайшая защита. +22 брони.',
  },
  vest_t6: {
    id: 'vest_t6', slot: 'vest', tier: 6,
    name: 'F99 "Thor-AX"', icon: '🛡️',
    protection: 28, weight: 9.5, price: 95000,
    _inactive: true,
    desc: 'Титановая экзоброня. Предел защиты. +28 брони.',
  },

  // === РАЗГРУЗКИ ===
  rig_t1: {
    id: 'rig_t1', slot: 'rig', tier: 1,
    name: 'ChekomT', icon: '👜',
    magSlots: 2, medSlots: 1, weight: 1.0, price: 600,
    desc: '2 магазина, 1 аптечка.',
  },
  rig_t2: {
    id: 'rig_t2', slot: 'rig', tier: 2,
    name: 'UMTBS', icon: '🎽',
    magSlots: 3, medSlots: 1, weight: 1.5, price: 2000,
    desc: '3 магазина, 1 аптечка.',
  },
  rig_t3: {
    id: 'rig_t3', slot: 'rig', tier: 3,
    name: 'D-Rig "Scout"', icon: '🎽',
    magSlots: 4, medSlots: 2, weight: 2.0, price: 5000,
    desc: '4 магазина, 2 аптечки.',
  },
  rig_t4: {
    id: 'rig_t4', slot: 'rig', tier: 4,
    name: 'MK3 "C-Fight"', icon: '🦸',
    magSlots: 5, medSlots: 4, weight: 2.5, price: 12000,
    desc: '5 магазинов, 4 аптечки.',
  },
  rig_t5: {
    id: 'rig_t5', slot: 'rig', tier: 5,
    name: 'ABT-19X1 "Alpha"', icon: '🦸',
    magSlots: 7, medSlots: 5, weight: 2.2, price: 28000,
    _inactive: true,
    desc: '7 магазинов, 5 аптечек.',
  },
  rig_t6: {
    id: 'rig_t6', slot: 'rig', tier: 6,
    name: 'D-SR "Odin"', icon: '🦸',
    magSlots: 10, medSlots: 7, weight: 2.8, price: 60000,
    _inactive: true,
    desc: '10 магазинов, 7 аптечек. Максимальная огневая мощь.',
  },

  // === РЮКЗАКИ ===
  backpack_t1: {
    id: 'backpack_t1', slot: 'backpack', tier: 1,
    name: 'M-B 12', icon: '🎒',
    carryWeight: 20, weight: 1.5, price: 600,
    desc: 'Базовый рейдовый рюкзак. 20 кг.',
  },
  backpack_t2: {
    id: 'backpack_t2', slot: 'backpack', tier: 2,
    name: 'S-20 "Assault"', icon: '🎒',
    carryWeight: 30, weight: 2.0, price: 2000,
    desc: 'Штурмовой рюкзак. 30 кг.',
  },
  backpack_t3: {
    id: 'backpack_t3', slot: 'backpack', tier: 3,
    name: 'M-35 "Raider"', icon: '🎒',
    carryWeight: 40, weight: 3.0, price: 5000,
    desc: 'Рейдерский рюкзак. 40 кг.',
  },
  backpack_t4: {
    id: 'backpack_t4', slot: 'backpack', tier: 4,
    name: 'L55 "Troop-X"', icon: '🎒',
    carryWeight: 60, weight: 4.0, price: 11000,
    desc: 'Тяжёлый тактический рюкзак. 60 кг.',
  },
  backpack_t5: {
    id: 'backpack_t5', slot: 'backpack', tier: 5,
    name: 'XL-80 "Cornel"', icon: '🎒',
    carryWeight: 85, weight: 3.0, price: 26000,
    _inactive: true,
    desc: 'Экспедиционный рюкзак. 85 кг.',
  },
  backpack_t6: {
    id: 'backpack_t6', slot: 'backpack', tier: 6,
    name: 'F-88 "Atlas"', icon: '🎒',
    carryWeight: 120, weight: 4.0, price: 55000,
    _inactive: true,
    desc: 'Экзоскелетный транспортный рюкзак. 120 кг.',
  },

};

// ============================================================
// МОДУЛИ ОРУЖИЯ
// Тиры 1–4 активны, 5–6 в _inactive
// magazine: magBonus — доп. патроны в магазине
// scope/grip/stock: accuracyBonus — прибавка к точности
// ============================================================

const MODULES = {

  // === МАГАЗИНЫ ===
  mag_t1: {
    id: 'mag_t1', type: 'magazine', tier: 1,
    name: 'RB Mag',           icon: '📦', magBonus: 10,
    weight: 0.20, price: 1000,
    desc: '+10 патронов.',
  },
  mag_t2: {
    id: 'mag_t2', type: 'magazine', tier: 2,
    name: 'SSteal Mag',       icon: '📦', magBonus: 15,
    weight: 0.25, price: 2500,
    desc: '+15 патронов.',
  },
  mag_t3: {
    id: 'mag_t3', type: 'magazine', tier: 3,
    name: 'P-MAG Gen 3',      icon: '📦', magBonus: 20,
    weight: 0.30, price: 8000,
    desc: '+20 патронов.',
  },
  mag_t4: {
    id: 'mag_t4', type: 'magazine', tier: 4,
    name: 'L5-AWM',           icon: '📦', magBonus: 30,
    weight: 0.40, price: 40000,
    desc: '+30 патронов.',
  },
  mag_t5: {
    id: 'mag_t5', type: 'magazine', tier: 5,
    name: 'SureFire MAG-X',   icon: '📦', magBonus: 40,
    weight: 0.50, price: 120000,
    _inactive: true,
    desc: '+40 патронов.',
  },
  mag_t6: {
    id: 'mag_t6', type: 'magazine', tier: 6,
    name: 'D-60 DRUM',        icon: '🥁', magBonus: 60,
    weight: 0.80, price: 300000,
    _inactive: true,
    desc: '+60 патронов.',
  },

  // === ПРИЦЕЛЫ ===
  scope_t1: {
    id: 'scope_t1', type: 'scope', tier: 1,
    name: 'DIY',              icon: '🎯', accuracyBonus: 2,
    weight: 0.10, price: 1000,
    desc: '+2 к точности.',
  },
  scope_t2: {
    id: 'scope_t2', type: 'scope', tier: 2,
    name: 'TR-25',            icon: '🔴', accuracyBonus: 5,
    weight: 0.18, price: 5000,
    desc: '+5 к точности.',
  },
  scope_t3: {
    id: 'scope_t3', type: 'scope', tier: 3,
    name: 'Sig Sauer 5',      icon: '💠', accuracyBonus: 8,
    weight: 0.25, price: 20000,
    desc: '+8 к точности.',
  },
  scope_t4: {
    id: 'scope_t4', type: 'scope', tier: 4,
    name: 'EOTech EXPS3',     icon: '🔭', accuracyBonus: 12,
    weight: 0.35, price: 80000,
    desc: '+12 к точности.',
  },
  scope_t5: {
    id: 'scope_t5', type: 'scope', tier: 5,
    name: 'Vortex Razor Gen II', icon: '🔭', accuracyBonus: 16,
    weight: 0.45, price: 200000,
    _inactive: true,
    desc: '+16 к точности.',
  },
  scope_t6: {
    id: 'scope_t6', type: 'scope', tier: 6,
    name: 'Trijicon REAP-IR', icon: '🔭', accuracyBonus: 20,
    weight: 0.55, price: 500000,
    _inactive: true,
    desc: '+20 к точности.',
  },

  // === РУКОЯТКИ ===
  grip_t1: {
    id: 'grip_t1', type: 'grip', tier: 1,
    name: 'WStubb',           icon: '✊', accuracyBonus: 2,
    weight: 0.08, price: 1000,
    desc: '+2 к точности.',
  },
  grip_t2: {
    id: 'grip_t2', type: 'grip', tier: 2,
    name: 'KAC Vertical Grip', icon: '🖐️', accuracyBonus: 4,
    weight: 0.12, price: 3000,
    desc: '+4 к точности.',
  },
  grip_t3: {
    id: 'grip_t3', type: 'grip', tier: 3,
    name: 'Magpul AFG-2',     icon: '🤜', accuracyBonus: 6,
    weight: 0.15, price: 10000,
    desc: '+6 к точности.',
  },
  grip_t4: {
    id: 'grip_t4', type: 'grip', tier: 4,
    name: 'BCM Gunfighter Mod.3', icon: '🤜', accuracyBonus: 10,
    weight: 0.18, price: 60000,
    desc: '+10 к точности.',
  },
  grip_t5: {
    id: 'grip_t5', type: 'grip', tier: 5,
    name: 'Zenitco RK-1',     icon: '🤜', accuracyBonus: 13,
    weight: 0.20, price: 180000,
    _inactive: true,
    desc: '+13 к точности.',
  },
  grip_t6: {
    id: 'grip_t6', type: 'grip', tier: 6,
    name: 'Fortis Shift "Skeleton"', icon: '🤜', accuracyBonus: 16,
    weight: 0.22, price: 450000,
    _inactive: true,
    desc: '+16 к точности.',
  },

  // === ПРИКЛАДЫ ===
  stock_t1: {
    id: 'stock_t1', type: 'stock', tier: 1,
    name: 'WF Stock',         icon: '📐', accuracyBonus: 3,
    weight: 0.25, price: 2500,
    desc: '+3 к точности.',
  },
  stock_t2: {
    id: 'stock_t2', type: 'stock', tier: 2,
    name: 'M4-CP',            icon: '📏', accuracyBonus: 5,
    weight: 0.30, price: 3000,
    desc: '+5 к точности.',
  },
  stock_t3: {
    id: 'stock_t3', type: 'stock', tier: 3,
    name: 'MQE SL2',          icon: '📏', accuracyBonus: 7,
    weight: 0.38, price: 15000,
    desc: '+7 к точности.',
  },
  stock_t4: {
    id: 'stock_t4', type: 'stock', tier: 4,
    name: 'ATOR E-MOD',       icon: '🔩', accuracyBonus: 10,
    weight: 0.45, price: 65000,
    desc: '+10 к точности.',
  },
  stock_t5: {
    id: 'stock_t5', type: 'stock', tier: 5,
    name: 'B5 Systems Bravo', icon: '🔩', accuracyBonus: 14,
    weight: 0.50, price: 200000,
    _inactive: true,
    desc: '+14 к точности.',
  },
  stock_t6: {
    id: 'stock_t6', type: 'stock', tier: 6,
    name: 'Zarya ZrS Gen.3',  icon: '🔩', accuracyBonus: 18,
    weight: 0.60, price: 500000,
    _inactive: true,
    desc: '+18 к точности.',
  },
};

// ============================================================
// АПТЕЧКИ
// ============================================================

// ============================================================
// АПТЕЧКИ
// healsBleeding — останавливает кровотечение (limbs.chest)
// _craft — только крафт, не появляется в магазине
// ============================================================

const MEDKITS = {
  ifak: {
    id: 'ifak', name: 'IFAK Mod.3', icon: '🩹',
    healAmount: 10, healsBleeding: false,
    weight: 0.5, price: 10000,
    desc: '+10 HP. Не останавливает кровотечение.',
  },
  salewa: {
    id: 'salewa', name: 'Salewa', icon: '🩺',
    healAmount: 20, healsBleeding: true,
    weight: 0.8, price: 50000,
    desc: '+20 HP. Убирает кровотечение.',
  },
  grizzly: {
    id: 'grizzly', name: 'Grizzly Surv', icon: '🏥',
    healAmount: 30, healsBleeding: true,
    weight: 1.0, price: 120000,
    _craft: true,
    desc: '+30 HP. Убирает кровотечение. [Крафт]',
  },
};

// ============================================================
// КЛЮЧИ ОТ СЕЙФОВ
// ============================================================

const SAFE_KEYS = {
  key_common: { id: 'key_common', name: 'Ржавый ключ',        icon: '🗝️', weight: 0.05, price: 500,  desc: 'Открывает обычные сейфы.' },
  key_rare:   { id: 'key_rare',   name: 'Бронированный ключ', icon: '🔑', weight: 0.05, price: 2000, desc: 'Открывает редкие сейфы.' },
  key_elite:  { id: 'key_elite',  name: 'Золотой ключ',       icon: '✨', weight: 0.05, price: 8000, desc: 'Открывает элитные сейфы.' },
};

// ============================================================
// БАЗА ЛУТА
// rarity: 'junk' | 'common' | 'rare' | 'valuable' | 'precious'
// spawnNormal — шанс на обычных зонах (0–1)
// spawnRed    — шанс на красных зонах (0–1)
// precious — только в сейфах, на клетках не спавнятся
// ============================================================

const LOOT_ITEMS = {

  // ===== МУСОР (серый, 50–100 коинов) =====
  junk_bolt:       { id: 'junk_bolt',       rarity: 'junk', name: 'Ржавый болт',            icon: '🔩', price: 50,  weight: 0.1 },
  junk_can:        { id: 'junk_can',         rarity: 'junk', name: 'Пустая консервная банка', icon: '🥫', price: 60,  weight: 0.1 },
  junk_newspaper:  { id: 'junk_newspaper',   rarity: 'junk', name: 'Обрывки газет',           icon: '📰', price: 50,  weight: 0.1 },
  junk_syringe:    { id: 'junk_syringe',     rarity: 'junk', name: 'Использованный шприц',    icon: '💉', price: 55,  weight: 0.1 },
  junk_rag:        { id: 'junk_rag',         rarity: 'junk', name: 'Грязная ветошь',          icon: '🧻', price: 50,  weight: 0.2 },
  junk_bottlecap:  { id: 'junk_bottlecap',   rarity: 'junk', name: 'Крышка от бутылки',       icon: '⭕', price: 50,  weight: 0.05 },
  junk_casing:     { id: 'junk_casing',      rarity: 'junk', name: 'Отработанная гильза',     icon: '🟡', price: 70,  weight: 0.05 },
  junk_tape:       { id: 'junk_tape',        rarity: 'junk', name: 'Моток изоленты',          icon: '🖤', price: 80,  weight: 0.2 },
  junk_bottle:     { id: 'junk_bottle',      rarity: 'junk', name: 'Пластиковая бутылка',     icon: '🧴', price: 55,  weight: 0.1 },
  junk_cigarettes: { id: 'junk_cigarettes',  rarity: 'junk', name: 'Пачка дешёвых сигарет',  icon: '🚬', price: 90,  weight: 0.1 },
  junk_lens:       { id: 'junk_lens',        rarity: 'junk', name: 'Разбитая линза',          icon: '🔍', price: 75,  weight: 0.1 },
  junk_nail:       { id: 'junk_nail',        rarity: 'junk', name: 'Гнутый гвоздь',           icon: '📌', price: 50,  weight: 0.05 },
  junk_soap:       { id: 'junk_soap',        rarity: 'junk', name: 'Кусок мыла',              icon: '🧼', price: 60,  weight: 0.15 },
  junk_oldpaper:   { id: 'junk_oldpaper',    rarity: 'junk', name: 'Старая газета',           icon: '🗞️', price: 50,  weight: 0.1 },
  junk_pcboard:    { id: 'junk_pcboard',     rarity: 'junk', name: 'Обломок печатной платы',  icon: '🖥️', price: 85,  weight: 0.15 },
  junk_cable:      { id: 'junk_cable',       rarity: 'junk', name: 'Медный кабель',           icon: '🔌', price: 95,  weight: 0.3 },
  junk_juicebox:   { id: 'junk_juicebox',    rarity: 'junk', name: 'Пустая пачка из-под сока',icon: '🧃', price: 50,  weight: 0.05 },
  junk_gasket:     { id: 'junk_gasket',      rarity: 'junk', name: 'Резиновая прокладка',     icon: '⬛', price: 60,  weight: 0.1 },
  junk_tincap:     { id: 'junk_tincap',      rarity: 'junk', name: 'Жестяная крышка',         icon: '🔘', price: 50,  weight: 0.05 },
  junk_glass:      { id: 'junk_glass',       rarity: 'junk', name: 'Треснувший стакан',       icon: '🥃', price: 55,  weight: 0.2 },

  // ===== ОБЫЧНЫЕ (синий, 300–1000 коинов) =====
  com_screwset:    { id: 'com_screwset',   rarity: 'common', name: 'Набор отвёрток',        icon: '🔧', price: 450,  weight: 0.5 },
  com_gloves:      { id: 'com_gloves',     rarity: 'common', name: 'Рабочие перчатки',      icon: '🧤', price: 300,  weight: 0.3 },
  com_wrench:      { id: 'com_wrench',     rarity: 'common', name: 'Гаечный ключ',          icon: '🔑', price: 400,  weight: 0.6 },
  com_dryfuel:     { id: 'com_dryfuel',    rarity: 'common', name: 'Сухое горючее',         icon: '🔥', price: 350,  weight: 0.4 },
  com_tape:        { id: 'com_tape',       rarity: 'common', name: 'Армированный скотч',    icon: '🟫', price: 500,  weight: 0.2 },
  com_water:       { id: 'com_water',      rarity: 'common', name: 'Бутылка чистой воды',   icon: '💧', price: 320,  weight: 0.5 },
  com_batteries:   { id: 'com_batteries',  rarity: 'common', name: 'Батарейки AA',          icon: '🔋', price: 600,  weight: 0.2 },
  com_matches:     { id: 'com_matches',    rarity: 'common', name: 'Коробка спичек',        icon: '🪓', price: 300,  weight: 0.1 },
  com_sandpaper:   { id: 'com_sandpaper',  rarity: 'common', name: 'Наждачная бумага',      icon: '📄', price: 350,  weight: 0.2 },
  com_alpowder:    { id: 'com_alpowder',   rarity: 'common', name: 'Алюминиевая пудра',     icon: '⚗️', price: 800,  weight: 0.3 },
  com_superglue:   { id: 'com_superglue',  rarity: 'common', name: 'Тюбик суперклея',       icon: '🧪', price: 450,  weight: 0.1 },
  com_thermos:     { id: 'com_thermos',    rarity: 'common', name: 'Металлический термос',  icon: '🫙', price: 550,  weight: 0.5 },
  com_sealant:     { id: 'com_sealant',    rarity: 'common', name: 'Силиконовый герметик',  icon: '🟨', price: 700,  weight: 0.4 },
  com_lighter:     { id: 'com_lighter',    rarity: 'common', name: 'Зажигалка',             icon: '🔦', price: 300,  weight: 0.1 },
  com_rope:        { id: 'com_rope',       rarity: 'common', name: 'Моток бечёвки',         icon: '🧵', price: 400,  weight: 0.4 },
  com_radiator:    { id: 'com_radiator',   rarity: 'common', name: 'Стальной радиатор',     icon: '♨️', price: 900,  weight: 2.5 },
  com_carabiner:   { id: 'com_carabiner',  rarity: 'common', name: 'Крепёжный карабин',     icon: '🔗', price: 500,  weight: 0.2 },
  com_flashlight:  { id: 'com_flashlight', rarity: 'common', name: 'Фонарик',               icon: '🔦', price: 650,  weight: 0.3 },
  com_oilcan:      { id: 'com_oilcan',     rarity: 'common', name: 'Масленка',              icon: '🫙', price: 350,  weight: 0.4 },
  com_drillset:    { id: 'com_drillset',   rarity: 'common', name: 'Набор свёрл',           icon: '⚙️', price: 750,  weight: 0.5 },

  // ===== РЕДКИЕ (фиолетовый, 2000–5000 коинов) =====
  rare_battery:    { id: 'rare_battery',   rarity: 'rare', name: 'Автомобильный аккумулятор', icon: '🔋', price: 2500, weight: 5.0 },
  rare_gasburner:  { id: 'rare_gasburner', rarity: 'rare', name: 'Газовая горелка',           icon: '🔥', price: 2200, weight: 1.5 },
  rare_geiger:     { id: 'rare_geiger',    rarity: 'rare', name: 'Счётчик Гейгера',           icon: '☢️', price: 4500, weight: 0.8 },
  rare_ddr3:       { id: 'rare_ddr3',      rarity: 'rare', name: 'Оперативная память DDR3',   icon: '💾', price: 3000, weight: 0.2 },
  rare_mre:        { id: 'rare_mre',       rarity: 'rare', name: 'Армейский паёк MRE',        icon: '🍱', price: 2000, weight: 1.0 },
  rare_microscope: { id: 'rare_microscope',rarity: 'rare', name: 'Медицинский микроскоп',     icon: '🔬', price: 5000, weight: 3.0 },
  rare_drill:      { id: 'rare_drill',     rarity: 'rare', name: 'Электродрель',              icon: '🔩', price: 2800, weight: 2.0 },
  rare_hdd:        { id: 'rare_hdd',       rarity: 'rare', name: 'Жёсткий диск HDD',         icon: '💿', price: 3200, weight: 0.5 },
  rare_psu:        { id: 'rare_psu',       rarity: 'rare', name: 'Блок питания 500W',        icon: '⚡', price: 3500, weight: 2.5 },
  rare_gunkit:     { id: 'rare_gunkit',    rarity: 'rare', name: 'Набор для чистки оружия',  icon: '🔫', price: 2400, weight: 0.8 },
  rare_radio:      { id: 'rare_radio',     rarity: 'rare', name: 'Рация',                    icon: '📻', price: 4000, weight: 0.6 },
  rare_knife:      { id: 'rare_knife',     rarity: 'rare', name: 'Охотничий нож',            icon: '🔪', price: 2600, weight: 0.4 },
  rare_phone:      { id: 'rare_phone',     rarity: 'rare', name: 'Смартфон',                 icon: '📱', price: 3800, weight: 0.2 },
  rare_watch:      { id: 'rare_watch',     rarity: 'rare', name: 'Электронные часы',         icon: '⌚', price: 2900, weight: 0.1 },
  rare_toolset:    { id: 'rare_toolset',   rarity: 'rare', name: 'Набор инструментов',       icon: '🧰', price: 3400, weight: 3.0 },
  rare_cleanlens:  { id: 'rare_cleanlens', rarity: 'rare', name: 'Чистая линза',             icon: '🔍', price: 4200, weight: 0.2 },
  rare_optrelay:   { id: 'rare_optrelay',  rarity: 'rare', name: 'Оптическое реле',          icon: '💡', price: 4800, weight: 0.3 },
  rare_pressctrl:  { id: 'rare_pressctrl', rarity: 'rare', name: 'Контроллер давления',      icon: '🔄', price: 3600, weight: 0.5 },
  rare_coppertube: { id: 'rare_coppertube',rarity: 'rare', name: 'Медная трубка',            icon: '🟠', price: 2100, weight: 1.2 },
  rare_handbore:   { id: 'rare_handbore',  rarity: 'rare', name: 'Ручной бур',               icon: '🔨', price: 2700, weight: 2.0 },

  // ===== ДОРОГИЕ (золотой, фиксированные цены) =====
  val_rtx5090:     { id: 'val_rtx5090',    rarity: 'valuable', name: 'Видеокарта RTX 5090',         icon: '🖥️', price: 60000,  weight: 1.5 },
  val_i9:          { id: 'val_i9',         rarity: 'valuable', name: 'Процессор Core i9',           icon: '💻', price: 30000,  weight: 0.1 },
  val_gyroscope:   { id: 'val_gyroscope',  rarity: 'valuable', name: 'Военный гироскоп',           icon: '🎯', price: 90000,  weight: 0.8 },
  val_satmodule:   { id: 'val_satmodule',  rarity: 'valuable', name: 'Модуль спутниковой связи',   icon: '📡', price: 20000,  weight: 1.2 },
  val_thermsensor: { id: 'val_thermsensor',rarity: 'valuable', name: 'Тепловизионный сенсор',      icon: '🌡️', price: 55000,  weight: 0.5 },
  val_casket:      { id: 'val_casket',     rarity: 'valuable', name: 'Резная шкатулка',            icon: '📦', price: 42000,  weight: 0.8 },
  val_cryptblock:  { id: 'val_cryptblock', rarity: 'valuable', name: 'Шифровальный блок',          icon: '🔐', price: 15000,  weight: 0.6 },
  val_goldchain:   { id: 'val_goldchain',  rarity: 'valuable', name: 'Золотая цепочка',            icon: '⛓️', price: 38000,  weight: 0.2 },
  val_drone:       { id: 'val_drone',      rarity: 'valuable', name: 'Военный дрон',               icon: '🚁', price: 150000, weight: 3.0 },
  val_nanoenergy:  { id: 'val_nanoenergy', rarity: 'valuable', name: 'Нано-энергоблок',            icon: '⚛️', price: 200000, weight: 0.4 },

  // ===== ДРАГОЦЕННОСТИ (красный, только в сейфах) =====
  prec_goldbar:    { id: 'prec_goldbar',   rarity: 'precious', name: 'Золотой слиток 1кг',              icon: '🏅', price: 250000,   weight: 1.0 },
  prec_vase:       { id: 'prec_vase',      rarity: 'precious', name: 'Античная ваза',                   icon: '🏺', price: 300000,   weight: 2.0 },
  prec_ssd:        { id: 'prec_ssd',       rarity: 'precious', name: 'Зашифрованный SSD-накопитель',    icon: '💿', price: 500000,   weight: 0.2 },
  prec_microchip:  { id: 'prec_microchip', rarity: 'precious', name: 'Прототип военной микросхемы',     icon: '🔬', price: 800000,   weight: 0.1 },
  prec_diamring:   { id: 'prec_diamring',  rarity: 'precious', name: 'Кольцо с крупным алмазом',        icon: '💍', price: 380000,   weight: 0.05 },
  prec_jade:       { id: 'prec_jade',      rarity: 'precious', name: 'Статуэтка из чистого нефрита',    icon: '🗿', price: 1000000,  weight: 1.5 },
  prec_blackcard:  { id: 'prec_blackcard', rarity: 'precious', name: 'Ключ-карта доступа Black',        icon: '🖤', price: 2000000,  weight: 0.05 },
  prec_goldpistol: { id: 'prec_goldpistol',rarity: 'precious', name: 'Наградной золотой пистолет',      icon: '🔫', price: 410000,   weight: 1.2 },
  prec_server:     { id: 'prec_server',    rarity: 'precious', name: 'Портативный сервер базы данных',  icon: '🖧',  price: 1300000,  weight: 2.5 },
  prec_vangogh:    { id: 'prec_vangogh',   rarity: 'precious', name: 'Ван Гог — Звёздная ночь',        icon: '🖼️', price: 5000000,  weight: 3.0 },
};

// Цвета редкостей лута
const LOOT_RARITY_COLORS = {
  junk:     '#94a3b8', // серый
  common:   '#60a5fa', // синий
  rare:     '#c084fc', // фиолетовый
  valuable: '#fbbf24', // золотой
  precious: '#f43f5e', // красный
};

// Шансы спавна лута по типу зоны
// Каждый уровень: [junk, common, rare, valuable] (precious — только сейфы)
const LOOT_SPAWN_CHANCES = {
  normal: { junk: 0.50, common: 0.35, rare: 0.12, valuable: 0.03 },
  red:    { junk: 0.00, common: 0.50, rare: 0.35, valuable: 0.15 },
};

// Шансы в сейфах
const SAFE_LOOT_CHANCES = {
  free: { rare: 0.60, valuable: 0.30, precious: 0.10 },
  paid: { rare: 0.40, valuable: 0.40, precious: 0.20 },
};

// Шанс выпадения ключа на клетке
const KEY_SPAWN_CHANCE = {
  normal: 0.03,
  red:    0.10,
};

// ============================================================
// КЛЮЧИ КРАСНЫХ ЗОН (именные)
// ============================================================

const ZONE_KEYS = {
  key_army:      { id: 'key_army',      name: 'Армейский ключ',            icon: '🔑', weight: 0.05, price: 5000,  uses: 5, desc: 'Открывает подземное хранилище военной базы.' },
  key_hospital:  { id: 'key_hospital',  name: 'Ключ директора госпиталя',  icon: '🔑', weight: 0.05, price: 6000,  uses: 5, desc: 'Открывает реанимацию госпиталя.' },
  key_bunker:    { id: 'key_bunker',    name: 'Красная карта допуска',     icon: '🟥', weight: 0.05, price: 8000,  uses: 5, desc: 'Открывает хранилище бункера.' },
  key_lab7:      { id: 'key_lab7',      name: 'Карта допуска №7',          icon: '🪪', weight: 0.05, price: 7000,  uses: 5, desc: 'Открывает кабинет №7 лаборатории.' },
};

// ============================================================
// СТАТИЧНАЯ КАРТА 25×25
// Все клетки определены явно — карта не генерируется рандомно
// ============================================================

const MAP_CONFIG = {
  width: 25,
  height: 25,

  pvpChance: {
    normal: 0.12,
    red:    0.45,
  },

  extractionPoints: [
    { id: 'exit_nw', x: 0,  y: 0,  name: 'Северо-западный выход', icon: '🚁' },
    { id: 'exit_ne', x: 24, y: 0,  name: 'Северо-восточный выход', icon: '🚁' },
    { id: 'exit_sw', x: 0,  y: 24, name: 'Юго-западный выход',    icon: '🚁' },
    { id: 'exit_se', x: 24, y: 24, name: 'Юго-восточный выход',   icon: '🚁' },
  ],
};

// ============================================================
// КРАСНЫЕ ЗОНЫ — статичные локации с именованными клетками
// type: 'red_free_safe' | 'red_paid_safe' | 'red_loot' | 'red_empty'
// keyId — ключ нужный для платного сейфа
// ============================================================

const RED_ZONES = {
  military_base: {
    id: 'military_base', name: 'Военная база', icon: '🪖',
    cells: [
      { x: 10, y: 3,  name: 'Плац',                  type: 'red_loot'      },
      { x: 11, y: 3,  name: 'Казармы',                type: 'red_loot'      },
      { x: 10, y: 4,  name: 'Гараж',                  type: 'red_loot'      },
      { x: 11, y: 4,  name: 'Стрельбище',             type: 'red_loot'      },
      { x: 10, y: 5,  name: 'Штаб',                   type: 'red_free_safe' },
      { x: 11, y: 5,  name: 'Подземное хранилище',    type: 'red_paid_safe', keyId: 'key_army' },
    ],
  },
  hospital: {
    id: 'hospital', name: 'Госпиталь', icon: '🏥',
    cells: [
      { x: 19, y: 8,  name: 'Палаты',        type: 'red_loot'      },
      { x: 20, y: 8,  name: 'Холл',          type: 'red_loot'      },
      { x: 19, y: 9,  name: 'Кабинет №9',    type: 'red_loot'      },
      { x: 20, y: 9,  name: 'Реанимация',    type: 'red_paid_safe', keyId: 'key_hospital' },
    ],
  },
  bunker: {
    id: 'bunker', name: 'Бункер', icon: '🏗️',
    cells: [
      { x: 4,  y: 18, name: 'Спуск',         type: 'red_loot'      },
      { x: 5,  y: 18, name: 'Техническая зона', type: 'red_loot'   },
      { x: 4,  y: 19, name: 'Жилая зона',    type: 'red_free_safe' },
      { x: 5,  y: 19, name: 'Хранилище',     type: 'red_paid_safe', keyId: 'key_bunker' },
    ],
  },
  laboratory: {
    id: 'laboratory', name: 'Лаборатория', icon: '🔬',
    cells: [
      { x: 14, y: 14, name: 'Проходная',           type: 'red_loot'      },
      { x: 15, y: 14, name: 'Камера обработки',    type: 'red_loot'      },
      { x: 14, y: 15, name: 'Кабинет №4',          type: 'red_free_safe' },
      { x: 15, y: 15, name: 'Кабинет №7',          type: 'red_paid_safe', keyId: 'key_lab7' },
      { x: 14, y: 16, name: 'Хранилище образцов',  type: 'red_loot'      },
      { x: 15, y: 16, name: 'Лабораторная',        type: 'red_loot'      },
    ],
  },
  mil_village: {
    id: 'mil_village', name: 'Военный посёлок', icon: '🏘️',
    cells: [
      { x: 20, y: 18, name: 'Магазин',    type: 'red_loot' },
      { x: 21, y: 18, name: 'Аптека',     type: 'red_loot' },
      { x: 22, y: 18, name: 'Станция',    type: 'red_loot' },
      { x: 20, y: 19, name: 'Дом №3',     type: 'red_loot' },
      { x: 21, y: 19, name: 'Дом №4',     type: 'red_loot' },
      { x: 22, y: 19, name: 'Дом №5',     type: 'red_loot' },
      { x: 20, y: 20, name: 'Дом №6',     type: 'red_loot' },
      { x: 21, y: 20, name: 'Спортзал',   type: 'red_loot' },
      { x: 22, y: 20, name: 'Стрельбище', type: 'red_loot' },
    ],
  },
};

// Быстрый поиск: координата → данные красной зоны
function buildRedZoneIndex() {
  const index = {};
  for (const zone of Object.values(RED_ZONES)) {
    for (const cell of zone.cells) {
      index[`${cell.x}_${cell.y}`] = { zone, cell };
    }
  }
  return index;
}
const RED_ZONE_INDEX = buildRedZoneIndex();

// Имена обычных клеток для рандома
const NORMAL_CELL_NAMES = [
  'Лес', 'Деревня', 'Поле', 'Холмы', 'Поляна',
  'Перелесок', 'Пустырь', 'Развалины', 'Овраг', 'Брод',
];

// ============================================================
// ПОРОГИ КОНЕЧНОСТЕЙ
// ============================================================

const LIMB_THRESHOLDS = {
  arms: {
    threshold: 0.70, label: 'Руки повреждены', icon: '🤕',
    effect: 'accuracyPenalty', penaltyValue: 15,
    desc: 'Повреждены руки. −15 к точности.',
  },
  legs: {
    threshold: 0.50, label: 'Ноги повреждены', icon: '🦽',
    effect: 'tacticsBlocked',
    desc: 'Повреждены ноги. Агрессивные тактики недоступны.',
  },
  chest: {
    threshold: 0.30, label: 'Грудь пробита', icon: '🩸',
    effect: 'bleedPerCell', penaltyValue: 4,
    desc: 'Пробита грудь. −4 HP при каждом переходе.',
  },
};

// ============================================================
// БОЕВЫЕ ТАКТИКИ
//
// Выстрелы за раунд ФИКСИРОВАНЫ по типу оружия (WEAPON_TYPES.shotsPerRound).
// Тактика не меняет количество выстрелов — только накладывает модификаторы.
//
// Поля модификаторов:
//   playerAccBonus    — прибавка к меткости игрока в этом раунде
//   enemyAccBonus     — прибавка к меткости ВРАГА в этом раунде (положительное = хуже для игрока)
//   enemyAccPenalty   — штраф к меткости врага в этом раунде (снижает точность врага)
//   noShots           — true: игрок не стреляет в этом раунде
//   reloadMag         — true: перезарядить магазин (работает вместе с noShots)
//   repairArmor       — true: восстановить броню (1 раз за бой, работает вместе с noShots)
//   lockNextTactic    — true: следующий ход тактика заблокирована (только обычная стрельба)
//   fleeChance        — число 0–1: шанс побега; при провале — мгновенная смерть
//
// category: 'aggressive' | 'balanced' | 'defensive' — для ИИ врага
// ============================================================

const COMBAT_TACTICS = {

  suppression: {
    id: 'suppression', name: 'Шквальный огонь', icon: '🔥',
    category: 'aggressive',
    playerAccBonus: 15,
    enemyAccBonus:  10,
    desc: '+15 к твоей меткости. Враг получает +10 к меткости по тебе.',
  },

  aimed_shot: {
    id: 'aimed_shot', name: 'Прицельная стрельба', icon: '🎯',
    category: 'balanced',
    playerAccBonus: 20,
    lockNextTactic: true,
    desc: '+20 к меткости. Следующий ход — только обычная стрельба.',
  },

  cover_fire: {
    id: 'cover_fire', name: 'Стрельба из укрытия', icon: '🧱',
    category: 'balanced',
    enemyAccPenalty: 10,
    playerAccBonus:  -5,
    desc: '−10 к меткости врага. −5 к твоей меткости.',
  },

  reload: {
    id: 'reload', name: 'Перезарядка', icon: '🔄',
    category: 'defensive',
    noShots:   true,
    reloadMag: true,
    desc: 'Сменить магазин. Выстрелов нет.',
  },

  repair_armor: {
    id: 'repair_armor', name: 'Починить броню', icon: '🔧',
    category: 'defensive',
    noShots:     true,
    repairArmor: true,
    desc: 'Восстановить шлем и бронежилет. Доступно 1 раз за бой.',
  },

  retreat: {
    id: 'retreat', name: 'Побег', icon: '🏃',
    category: 'defensive',
    noShots:    true,
    fleeChance: 0.20,
    desc: '20% шанс уйти из боя. При провале — мгновенная гибель.',
  },
};

// ============================================================
// ЗОНЫ ПОПАДАНИЯ
// weight — доля попаданий приходящихся на эту зону
// ============================================================

const HIT_ZONES = {
  head:  { name: 'Голова', icon: '💀', weight: 0.15 },
  chest: { name: 'Грудь',  icon: '🫁', weight: 0.55 },
  arms:  { name: 'Руки',   icon: '💪', weight: 0.15 },
  legs:  { name: 'Ноги',   icon: '🦵', weight: 0.15 },
};

// ============================================================
// ЛИДЕРБОРД — имена ботов
// ============================================================

const LEADERBOARD_NAMES = [
  'GhostOperator', 'XxShadowRunnerxX', 'Tarkov_Rat', 'BulletFarmer99',
  'Silent_Loot', 'NightStalker228', 'ChadExtractor', 'LonerInTheZone',
  'QuietProfessional', 'GearFearNone', 'RaidOrDie', 'PackRat_Pro',
  'FullSendRaid', 'Scav_Hunter', 'DarkZone_King', 'InsuredGear',
  'OneManArmy', 'CashAndCarry', 'LegendaryLoOt', 'WipeKing777',
  'ZeroFearZone', 'BloodMoney_RU', 'BlackMarket_Boss', 'SilentProfit',
  'GoldenBackpack', 'RiskyBusiness', 'DeadDropDealer', 'ExfilKing',
  'NightRaider404', 'StashGoals', 'Operator_Zero', 'PointManPro',
  'ClearanceLevel5', 'UnsafeSafe', 'ChokepointGod', 'BossHunter',
  'FleaMarket_Lord', 'ContrabandKing', 'SectorClear', 'DeadReckon',
  'SniperNest', 'ThermalScope', 'BloodTrail', 'SupplyRun_Pro',
  'HeadshotOnly', 'ArmorPiercer', 'HotZoneHero', 'MapControl',
  'BreachAndClear', 'AlphaExtract',
];

// ============================================================
// ЧЁК РЫНОК — диапазоны цен (рандом в этих пределах)
// Цены меняются после каждого рейда игрока
// ============================================================

const BLACK_MARKET_PRICES = {
  weapon: {
    1: { min: 5000,     max: 10000   },
    2: { min: 15000,    max: 50000   },
    3: { min: 60000,    max: 150000  },
    4: { min: 2000000,  max: 5000000 },
  },
  ammo: {
    1: { min: 1000,   max: 3000   },
    2: { min: 5000,   max: 10000  },
    3: { min: 25000,  max: 50000  },
    4: { min: 100000, max: 200000 },
  },
  armor: {   // шлем + броник
    1: { min: 3000,   max: 5000   },
    2: { min: 10000,  max: 30000  },
    3: { min: 40000,  max: 80000  },
    4: { min: 150000, max: 300000 },
  },
  gear: {    // рюкзак + разгрузка
    1: { min: 5000,   max: 10000  },
    2: { min: 15000,  max: 20000  },
    3: { min: 50000,  max: 80000  },
    4: { min: 100000, max: 200000 },
  },
  module: {  // модули оружия (magazine / scope / grip / stock)
    magazine: {
      1: { min: 1000,  max: 2000  },
      2: { min: 2500,  max: 4000  },
      3: { min: 8000,  max: 15000 },
      4: { min: 40000, max: 80000 },
    },
    scope: {
      1: { min: 1000,  max: 2000   },
      2: { min: 5000,  max: 10000  },
      3: { min: 20000, max: 35000  },
      4: { min: 80000, max: 130000 },
    },
    grip: {
      1: { min: 1000,  max: 2000  },
      2: { min: 3000,  max: 6000  },
      3: { min: 10000, max: 20000 },
      4: { min: 60000, max: 90000 },
    },
    stock: {
      1: { min: 2500,  max: 4000   },
      2: { min: 3000,  max: 6000   },
      3: { min: 15000, max: 30000  },
      4: { min: 65000, max: 100000 },
    },
  },
};

// Количество лотов каждого типа на рынке
const BLACK_MARKET_SLOTS = {
  weapon:   4,
  ammo:     4,
  armor:    3,
  gear:     3,
  magazine: 3,
  scope:    3,
  grip:     2,
  stock:    2,
};

// Стак патронов (и при дропе, и на рынке)
const AMMO_STACK_SIZE = 60;

// ============================================================
// ШАНСЫ ДРОПА ОРУЖИЯ / ПАТРОНОВ / БРОНИ / СНАРЯГИ в рейде
// normal — обычные зоны, red — красные зоны (шанс x2 + T4)
// ============================================================

const GEAR_DROP_CHANCES = {
  normal: {
    weapon:   { 1: 0.20, 2: 0.10, 3: 0.05, 4: 0 },
    ammo:     { 1: 0.20, 2: 0.10, 3: 0.05, 4: 0 },
    armor:    { 1: 0.20, 2: 0.10, 3: 0.05, 4: 0 },
    gear:     { 1: 0.20, 2: 0.10, 3: 0.05, 4: 0 },
    module:   { 1: 0.15, 2: 0.08, 3: 0.03, 4: 0 },
  },
  red: {
    weapon:   { 1: 0.40, 2: 0.20, 3: 0.10, 4: 0.05 },
    ammo:     { 1: 0.40, 2: 0.20, 3: 0.10, 4: 0.05 },
    armor:    { 1: 0.40, 2: 0.20, 3: 0.10, 4: 0.05 },
    gear:     { 1: 0.40, 2: 0.20, 3: 0.10, 4: 0.05 },
    module:   { 1: 0.30, 2: 0.15, 3: 0.08, 4: 0.03 },
  },
};



const TRADERS = {
  gunsmith:    { id: 'gunsmith',    name: 'Оружейник',   icon: '🔧', nickname: 'Дядя Вася', desc: 'Торгует оружием, патронами и модулями.', inventory: [] },
  junk_dealer: { id: 'junk_dealer', name: 'Барахольщик', icon: '🗃️', nickname: 'Крыса',     desc: 'Торгует экипировкой, аптечками и ключами.', inventory: [] },
  black_market: { id: 'black_market', name: 'Чёрный рынок', icon: '🕶️', nickname: '???',   desc: 'Анонимные лоты. Никто не знает кто продаёт.', listings: [] },
};

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

function getEquipmentBySlot(slot) {
  return Object.values(EQUIPMENT).filter(e => e.slot === slot && !e._inactive);
}

function getWeaponsByType(type) {
  return Object.values(WEAPONS).filter(w => w.type === type && !w._inactive);
}

function getAmmoByType(ammoType) {
  return Object.values(AMMO).filter(a => a.ammoType === ammoType && !a._inactive);
}

function getCompatibleAmmo(weaponId) {
  const weapon = WEAPONS[weaponId];
  if (!weapon) return [];
  return (weapon.compatAmmo || []).map(id => AMMO[id]).filter(a => a && !a._inactive);
}

function getActiveTiers() {
  return Object.entries(TIERS)
    .filter(([, t]) => t.isActive)
    .map(([k, t]) => ({ ...t, num: parseInt(k) }));
}

function getTierColor(tierNum) {
  return TIERS[tierNum] ? TIERS[tierNum].color : '#94a3b8';
}

function calcTotalWeight(items) {
  return items.reduce((sum, item) => sum + (item.weight || 0), 0);
}
