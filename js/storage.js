const Storage = {
  KEYS: { SHIPS:'wgn_ships_db', PROFILE:'wgn_profile', LEADERBOARD:'wgn_leaderboard' },

  getShipsDB(){
    let raw = localStorage.getItem(this.KEYS.SHIPS);
    if(!raw){
      const base = generateBaseShips();
      localStorage.setItem(this.KEYS.SHIPS, JSON.stringify(base));
      return base;
    }
    return JSON.parse(raw);
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
      const p = { silver:5000000, xp:0, freeXp:0, elo:0, battles:0, wins:0, ownedShipIds:[], selectedShipId:null };
      // на старте открыты все ЭМ 1 тира каждой нации
      Storage.getShipsDB().filter(s=>s.tier===1).forEach(s=>p.ownedShipIds.push(s.id));
      localStorage.setItem(this.KEYS.PROFILE, JSON.stringify(p));
      return p;
    }
    return JSON.parse(raw);
  },
  saveProfile(p){ localStorage.setItem(this.KEYS.PROFILE, JSON.stringify(p)); },

  getLeaderboard(){
    let raw = localStorage.getItem(this.KEYS.LEADERBOARD);
    if(!raw){
      const bots = [];
      const NICK_POOL = ["VeqX","Dasti","Ferru","Manta","Cmdr_Blake","IronHull","Nordwind","Kestrel","Vantage","Obsidian","Roric","Halcyon","Straken","Vireo","Ashgrave","Tundro","Meridian","Corsix","Blackfin","Talvera"];
      // Топ-300 сервера — элитный глобальный ладдер, а не общая масса игроков.
      // Место 300 (нижняя граница) — не менее 9000 (высший обычный ранг), место 1 — около 13000.
      // Топ-50 получает дополнительный отрыв (звание "Адмирал Флота" должно выглядеть престижно).
      for(let i=0;i<300;i++){
        const place = i+1; // 1..300
        const t = (300 - place) / 299; // 1 у 1-го места, 0 у 300-го
        let base = 9000 + t*4000;
        if(place<=50){
          const t50 = (50-place)/49; // доп. отрыв внутри топ-50
          base += t50*1200;
        }
        const jitter = (Math.random()-0.5)*200;
        const nick = NICK_POOL[i%NICK_POOL.length] + (i>=NICK_POOL.length ? '_'+Math.floor(i/NICK_POOL.length):'');
        bots.push({ id:'bot_'+i, name:nick, elo: Math.round(base+jitter), isPlayer:false });
      }
      bots.sort((a,b)=>b.elo-a.elo);
      localStorage.setItem(this.KEYS.LEADERBOARD, JSON.stringify(bots));
      return bots;
    }
    return JSON.parse(raw);
  },
  saveLeaderboard(arr){ localStorage.setItem(this.KEYS.LEADERBOARD, JSON.stringify(arr)); },
};
