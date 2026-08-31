const RANKS = [
  {min:0,max:500,name:'Рядовой'},
  {min:501,max:1000,name:'Сержант'},
  {min:1001,max:1500,name:'Старшина'},
  {min:1501,max:2500,name:'Лейтенант'},
  {min:2501,max:3500,name:'Капитан'},
  {min:3501,max:4500,name:'Майор'},
  {min:4501,max:6000,name:'Подполковник'},
  {min:6001,max:7500,name:'Полковник'},
  {min:7501,max:9000,name:'Генерал'},
  {min:9001,max:Infinity,name:'Контр-Адмирал'},
];

const ProgressionSystem = {
  getRankName(elo, isTop50){
    if(isTop50) return 'Адмирал Флота';
    const r = RANKS.find(r=>elo>=r.min && elo<=r.max);
    return r ? r.name : RANKS[0].name;
  },

  // Место игрока в элитном топ-300, либо null, если он ещё не обошёл 300-го бота (не входит в топ).
  getPlayerStanding(profile, board){
    const sortedBots = [...board].sort((a,b)=>b.elo-a.elo);
    const cutoff = sortedBots[sortedBots.length-1]; // 300-й бот — нижняя граница элитного топа
    if(!cutoff || profile.elo <= cutoff.elo) return { inTop:false, place:null, cutoffElo: cutoff?cutoff.elo:0 };
    const place = sortedBots.filter(b=>b.elo > profile.elo).length + 1;
    return { inTop:true, place, cutoffElo: cutoff.elo };
  },

  applyBattleResult(playerWon){
    const profile = Storage.getProfile();
    profile.battles++;
    if(playerWon) profile.wins++;
    profile.silver += playerWon ? 40000 : 12000;
    profile.xp += playerWon ? 1800 : 600;

    // Эло игрока — только от реального исхода его боя, никогда не смешивается с ботами при симуляции.
    profile.elo = Math.max(0, profile.elo + (playerWon?25:-25));

    // --- фоновая симуляция ладдера (rubber-banding), полностью независимая от игрока ---
    let board = Storage.getLeaderboard();
    board.sort((a,b)=>b.elo-a.elo);
    board.forEach((entry, idx)=>{
      const place = idx+1; // 1-based, только среди 300 ботов
      let winChance;
      if(place>=201) winChance=0.75;
      else if(place>=101) winChance=0.60;
      else winChance=0.50;
      const win = Math.random() < winChance;
      entry.elo = Math.max(0, entry.elo + (win?25:-25));
    });
    board.sort((a,b)=>b.elo-a.elo);

    Storage.saveLeaderboard(board);
    Storage.saveProfile(profile);
    return board;
  },
};
