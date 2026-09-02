const Storage = {
  KEYS: { SHIPS:'wgn_ships_db', PROFILE:'wgn_profile', LEADERBOARD:'wgn_leaderboard' },

  SHIPS_DB_VERSION: 2, // v2 = добавлено поле xpCost (экономика v3)

  getShipsDB(){
    let raw = localStorage.getItem(this.KEYS.SHIPS);
    if(!raw){
      const base = generateBaseShips();
      localStorage.setItem(this.KEYS.SHIPS, JSON.stringify(base));
      localStorage.setItem(this.KEYS.SHIPS+'_ver', String(this.SHIPS_DB_VERSION));
      return base;
    }
    let db = JSON.parse(raw);
    const verRaw = localStorage.getItem(this.KEYS.SHIPS+'_ver');
    if(!verRaw || parseInt(verRaw) < this.SHIPS_DB_VERSION){
      // миграция: добавляем недостающие поля, НЕ перезаписывая существующие правки (в т.ч. из конструктора)
      const startTierByClass = { destroyer:1, battleship:4, cruiser:4, submarine:6 };
      db = db.map(s=>{
        if(s.xpCost===undefined || s.xpCost===null){
          const isFirst = s.tier === (startTierByClass[s.class] ?? s.tier);
          s.xpCost = researchXpCost(s.class, s.tier, isFirst);
        }
        return s;
      });
      localStorage.setItem(this.KEYS.SHIPS, JSON.stringify(db));
      localStorage.setItem(this.KEYS.SHIPS+'_ver', String(this.SHIPS_DB_VERSION));
    }
    return db;
  },
  saveShipsDB(arr){
    localStorage.setItem(this.KEYS.SHIPS, JSON.stringify(arr));
  },
  upsertShip(ship){
    const db = this.getShipsDB();
    const idx = db.findIndex(s=>s.id===ship.id);
    if(idx>=0) db[idx] = ship; else db.push(ship);
    this.saveShipsDB(db);
    return db;
  },
  deleteShip(id){
    const db = this.getShipsDB().filter(s=>s.id!==id);
    this.saveShipsDB(db);
    return db;
  },

  getProfile(){
    let raw = localStorage.getItem(this.KEYS.PROFILE);
    if(!raw){
      const p = { silver:5000000, freeXp:0, shipXp:{}, elo:0, battles:0, wins:0, ownedShipIds:[], selectedShipId:null };
      // на старте открыты все ЭМ 1 тира каждой нации
      Storage.getShipsDB().filter(s=>s.tier===1).forEach(s=>p.ownedShipIds.push(s.id));
      localStorage.setItem(this.KEYS.PROFILE, JSON.stringify(p));
      return p;
    }
    const p = JSON.parse(raw);
    let migrated = false;
    if(p.freeXp===undefined){ p.freeXp = p.xp||0; delete p.xp; migrated = true; }
    if(p.shipXp===undefined){ p.shipXp = {}; migrated = true; }
    if(migrated) localStorage.setItem(this.KEYS.PROFILE, JSON.stringify(p));
    return p;
  },
  saveProfile(p){ localStorage.setItem(this.KEYS.PROFILE, JSON.stringify(p)); },

  LEADERBOARD_VERSION: 2, // увеличивать при любой смене формулы генерации ботов/эло — заставляет пересоздать сохранённые данные

  getLeaderboard(){
    let raw = localStorage.getItem(this.KEYS.LEADERBOARD);
    const verRaw = localStorage.getItem(this.KEYS.LEADERBOARD+'_ver');
    const staleVersion = !verRaw || parseInt(verRaw) !== this.LEADERBOARD_VERSION;
    if(!raw || staleVersion){
      const bots = [];
      // 20 префиксов x 20 суффиксов = 400 уникальных комбинаций без цифровых хвостов — берём 300 вразнобой
      const PREFIXES = ["Veq","Dast","Ferr","Mant","Cmdr_Blake","Iron","Nord","Kestr","Vant","Obsid","Ror","Halc","Strak","Vire","Ashgr","Tundr","Merid","Cors","Blackf","Talv","Grim","Vost","Shad","Rax","Nyx","Kael","Sever","Drak","Wraith","Solst"];
      const SUFFIXES = ["X","i","us","on","yn","ar","ex","ith","or","an","ael","yx","ov","en","ix","ash","yr","ol","um","ec"];
      const combos = [];
      PREFIXES.forEach(p=> SUFFIXES.forEach(s=> combos.push(p+s)));
      for(let i=combos.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [combos[i],combos[j]]=[combos[j],combos[i]]; }
      const names = combos.slice(0,300);

      for(let i=0;i<300;i++){
        const place = i+1;
        const t = (300 - place) / 299;
        let base = 9000 + t*4000;
        if(place<=50){
          const t50 = (50-place)/49;
          base += t50*1200;
        }
        const jitter = (Math.random()-0.5)*200;
        bots.push({ id:'bot_'+i, name:names[i], elo: Math.round(base+jitter), isPlayer:false });
      }
      bots.sort((a,b)=>b.elo-a.elo);
      localStorage.setItem(this.KEYS.LEADERBOARD, JSON.stringify(bots));
      localStorage.setItem(this.KEYS.LEADERBOARD+'_ver', String(this.LEADERBOARD_VERSION));
      return bots;
    }
    return JSON.parse(raw);
  },
  saveLeaderboard(arr){ localStorage.setItem(this.KEYS.LEADERBOARD, JSON.stringify(arr)); },

  // Предшественник в ветке: тот же класс+нация, ближайший тир СНИЗУ (не премиум — премиумы вне веток).
  getPredecessor(ship){
    const db = this.getShipsDB();
    const candidates = db.filter(s=> s.nation===ship.nation && s.class===ship.class && !s.isPremium && s.tier<ship.tier);
    if(!candidates.length) return null;
    return candidates.reduce((best,c)=> c.tier>best.tier ? c : best, candidates[0]);
  },

  // Исследован ли корабль (открыт к покупке): премиум/первый в ветке — всегда да;
  // иначе нужен накопленный опыт на предшественнике >= xpCost этого корабля.
  isResearched(ship, profile){
    if(ship.isPremium) return true;
    if(!ship.xpCost || ship.xpCost<=0) return true;
    const pred = this.getPredecessor(ship);
    if(!pred) return true; // оборванная ветка (например, кастомный корабль без предка) — не блокируем
    return (profile.shipXp[pred.id]||0) >= ship.xpCost;
  },
};
