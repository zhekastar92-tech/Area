/* ============================================================
   БАЗОВЫЕ КРИВЫЕ РОСТА ПО ТИРАМ (универсальные, до нац. модификаторов)
   ============================================================ */
const Curves = {
  ddHp: t => 3500 * Math.pow(1.28, t - 1),
  bbHp: t => 32000 * Math.pow(1.30, t - 4),
  caHp: t => 13000 * Math.pow(1.30, t - 4),
  ssHp: t => 8000 * Math.pow(1.30, t - 6),

  bbArmor: t => 38 * Math.pow(1.14, t - 4),
  caArmor: t => 19 * Math.pow(1.14, t - 4),

  ddGkDmg: t => 550 * Math.pow(1.22, t - 1),
  ddGkPen: t => 8 * Math.pow(1.22, t - 1),
  ddGkRange: t => 6.0 + 0.5 * (t - 1),

  caGkDmg: t => 2100 * Math.pow(1.22, t - 4),
  caGkPen: t => 22 * Math.pow(1.22, t - 4),
  caGkRange: t => 11.0 + 0.6 * (t - 4),

  bbGkDmg: t => 4200 * Math.pow(1.22, t - 4),
  bbGkPen: t => 36 * Math.pow(1.22, t - 4),
  bbGkRange: t => 15.0 + 0.8 * (t - 4),

  ddTorpDmg: t => 3500 * Math.pow(1.15, t - 1),
  ddTorpRange: t => 6.0 + 0.4 * (t - 1),

  ssTorpDmg: t => Curves.ddTorpDmg(t) * 0.9,
  ssTorpRange: t => Curves.ddTorpRange(t) * 0.8,

  ddSpeed: t => 3.0 + 0.15 * (t - 1),
  caSpeed: t => 2.0 + 0.08 * (t - 4),
  bbSpeed: t => 1.0 + 0.05 * (t - 4),
  ssSpeed: t => 2.5 + 0.10 * (t - 6),

  ddConceal: t => 6.0 - 0.10 * (t - 1),
  caConceal: t => 9.0 - 0.15 * (t - 4),
  bbConceal: t => 13.0 - 0.10 * (t - 4),
  ssConceal: t => 2.5 - 0.10 * (t - 6),

  ssDiveCharges: t => 4 + Math.floor((t - 6) / 2),
};

// множители "правок по фидбеку": торпеды ЭМ x3, торпеды ПЛ x2, урон ГК БЛ x1.5
const GLOBAL_TUNING = {
  ddTorpMult: 3,
  ssTorpMult: 2,
  bbGkDmgMult: 1.5,
};

/* ============================================================
   НАЦИОНАЛЬНЫЕ МОДИФИКАТОРЫ (относительно среднего по трём нациям)
   ============================================================ */
const NATION_MODS = {
  germany: {
    dd: { concealMod: 1.15, torpDmgMod: 1.15, speedMod: 1.00 },
    bb: { armorMod: 1.15, dmgMod: 0.85, penMod: 1.00, accMod: 1.00 },
    ca: { armorMod: 1.15, dmgMod: 1.15, accMod: 1.00, penMod: 1.00, concealMod: 1.00, hasTorp:false },
    ss: { torpDmgMod: 0.85, concealMod: 0.85, diveBonus: 1 },
  },
  ussr: {
    dd: { concealMod: 0.85, torpDmgMod: 1.00, speedMod: 0.85 },
    bb: { armorMod: 0.85, dmgMod: 1.00, penMod: 1.15, accMod: 1.00 },
    ca: { armorMod: 1.00, dmgMod: 1.00, accMod: 1.15, penMod: 1.15, concealMod: 1.00, hasTorp:false },
    ss: { torpDmgMod: 1.00, concealMod: 1.00, diveBonus: 0 },
  },
  japan: {
    dd: { concealMod: 1.00, torpDmgMod: 1.00, speedMod: 1.00 },
    bb: { armorMod: 1.00, dmgMod: 1.15, penMod: 1.00, accMod: 0.85 },
    ca: { armorMod: 0.85, dmgMod: 0.85, accMod: 1.00, penMod: 0.85, concealMod: 1.00, hasTorp:true, torpDmgMod:0.7 },
    // японских ПЛ нет на старте
  },
};

const NATIONS = [
  { id:'germany', name:'Германия' },
  { id:'ussr', name:'СССР' },
  { id:'japan', name:'Япония' },
  { id:'uk', name:'Великобритания' },
  { id:'usa', name:'США' },
  { id:'italy', name:'Италия' },
  { id:'spain', name:'Испания' },
  { id:'pan_america', name:'Пан-Америка' },
  { id:'france', name:'Франция' },
];

const SHIP_NAMES = {
  germany: {
    dd: ["V-25","V-170","Dresden","T-22","T-23Z","Ernst Gaede","Z-39","Z-35","Felix Schultz","Elbing"],
    bb: {4:"Kaiser",5:"König",6:"Bayern",7:"Prinz Heinrich",8:"Zieten",9:"Friedrich der Grosse",10:"Schlieffen"},
    ca: {4:"Karlsruhe",5:"Königsberg",6:"Nürnberg",7:"Admiral Scheer",8:"Knesebeck",9:"Roon",10:"Hindenburg"},
    ss: {6:"U-69",8:"U-190",10:"U-2501"},
  },
  ussr: {
    dd: ["Orlan","Diana","Derzki","Izyaslav","Podvoisky","Ognevoi","Udaloi","Neustrashimy","Kiev","Grozovoi"],
    bb: {4:"Knyaz Suvorov",5:"Pyotr Velikiy",6:"Izmail",7:"Poltava",8:"Vladivostok",9:"Sovetsky Soyuz",10:"Slava"},
    ca: {4:"Varyag",5:"Svietlana",6:"Murmansk",7:"Lazo",8:"Chapayev",9:"Riga",10:"Alexander Nevsky"},
    ss: {6:"S-1",8:"L-20",10:"K-1"},
  },
  japan: {
    dd: ["Hashidate","Chikuma","Tenryū","Isokaze","Minekaze","Fubuki","Shiratsuyu","Kagerō","Yūgumo","Harugumo"],
    bb: {4:"Myōgi",5:"Kongō",6:"Ise",7:"Nagato",8:"Amagi",9:"Izumo",10:"Yamato"},
    ca: {4:"Kuma",5:"Furutaka",6:"Aoba",7:"Omono",8:"Takahashi",9:"Shimanto",10:"Zaō"},
  },
};

function makeShip(partial){
  // единая схема, совместимая с конструктором (future_features — задел на будущее)
  return Object.assign({
    id: null, name:'', nation:'', class:'', tier:1, isPremium:false,
    silverCost:0, xpCost:0,
    hp:0, armor:0, speed:0, concealment:0,
    gk:null, torp:null, diveCharges:null,
    future_features:{ consumables:[], upgrades:[], ammoTypes:["AP","HE"] },
  }, partial);
}

function generateBaseShips(){
  const ships = [];

  for(const nationId of ['germany','ussr','japan']){
    const mods = NATION_MODS[nationId];
    const names = SHIP_NAMES[nationId];

    // Эсминцы (тир 1-10)
    names.dd.forEach((name, idx)=>{
      const t = idx+1;
      ships.push(makeShip({
        id:`${nationId}_dd_${t}`, name, nation:nationId, class:'destroyer', tier:t,
        silverCost: t===1?0: Math.round(15000*Math.pow(1.6,t-1)),
        hp: Math.round(Curves.ddHp(t)),
        armor: 0,
        speed: +(Curves.ddSpeed(t)*mods.dd.speedMod).toFixed(2),
        concealment: +(Curves.ddConceal(t)*mods.dd.concealMod).toFixed(2),
        gk: { damage: Math.round(Curves.ddGkDmg(t)), penetration: +Curves.ddGkPen(t).toFixed(1), range:+Curves.ddGkRange(t).toFixed(1), reloadTurns:1 },
        torp: { damage: Math.round(Curves.ddTorpDmg(t)*mods.dd.torpDmgMod*GLOBAL_TUNING.ddTorpMult), range:+Curves.ddTorpRange(t).toFixed(1), reloadTurns:1 },
      }));
    });

    // Линкоры (тир 4-10)
    for(const t of [4,5,6,7,8,9,10]){
      ships.push(makeShip({
        id:`${nationId}_bb_${t}`, name:names.bb[t], nation:nationId, class:'battleship', tier:t,
        silverCost: Math.round(60000*Math.pow(1.55,t-4)),
        hp: Math.round(Curves.bbHp(t)),
        armor: +(Curves.bbArmor(t)*mods.bb.armorMod).toFixed(1),
        speed: +Curves.bbSpeed(t).toFixed(2),
        concealment: +Curves.bbConceal(t).toFixed(2),
        gk: { damage: Math.round(Curves.bbGkDmg(t)*mods.bb.dmgMod*GLOBAL_TUNING.bbGkDmgMult), penetration:+(Curves.bbGkPen(t)*mods.bb.penMod).toFixed(1), range:+Curves.bbGkRange(t).toFixed(1), reloadTurns:2, accMod: mods.bb.accMod },
      }));
    }

    // Крейсеры (тир 4-10)
    for(const t of [4,5,6,7,8,9,10]){
      const gk = { damage: Math.round(Curves.caGkDmg(t)*mods.ca.dmgMod), penetration:+(Curves.caGkPen(t)*mods.ca.penMod).toFixed(1), range:+Curves.caGkRange(t).toFixed(1), reloadTurns:1, accMod: mods.ca.accMod };
      const torp = mods.ca.hasTorp ? { damage: Math.round(Curves.ddTorpDmg(t)*mods.ca.torpDmgMod), range:+Curves.ddTorpRange(t).toFixed(1), reloadTurns:1 } : null;
      ships.push(makeShip({
        id:`${nationId}_ca_${t}`, name:names.ca[t], nation:nationId, class:'cruiser', tier:t,
        silverCost: Math.round(35000*Math.pow(1.5,t-4)),
        hp: Math.round(Curves.caHp(t)),
        armor: +(Curves.caArmor(t)*mods.ca.armorMod).toFixed(1),
        speed: +Curves.caSpeed(t).toFixed(2),
        concealment: +(Curves.caConceal(t)*mods.ca.concealMod).toFixed(2),
        gk, torp,
      }));
    }

    // Подлодки (только Германия/СССР, тиры 6/8/10)
    if(names.ss){
      for(const t of [6,8,10]){
        ships.push(makeShip({
          id:`${nationId}_ss_${t}`, name:names.ss[t], nation:nationId, class:'submarine', tier:t,
          silverCost: Math.round(80000*Math.pow(1.5,(t-6)/2)),
          hp: Math.round(Curves.ssHp(t)),
          armor: 0,
          speed: +Curves.ssSpeed(t).toFixed(2),
          concealment: +(Curves.ssConceal(t)*mods.ss.concealMod).toFixed(2),
          torp: { damage: Math.round(Curves.ssTorpDmg(t)*mods.ss.torpDmgMod*GLOBAL_TUNING.ssTorpMult), range:+Curves.ssTorpRange(t).toFixed(1), reloadTurns:1 },
          diveCharges: Curves.ssDiveCharges(t) + mods.ss.diveBonus,
        }));
      }
    }
  }

  return ships;
}
