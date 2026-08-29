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

  applyBattleResult(playerWon){
    const profile = Storage.getProfile();
    profile.battles++;
    if(playerWon) profile.wins++;
    profile.silver += playerWon ? 40000 : 12000;
    profile.xp += playerWon ? 1800 : 600;

    // --- фоновая симуляция ладдера (rubber-banding) ---
    let board = Storage.getLeaderboard();
    board = board.filter(b=>!b.isPlayer);
    board.push({ id:'player', name:'Вы', elo:profile.elo, isPlayer:true });
    board.sort((a,b)=>b.elo-a.elo);

    board.forEach((entry, idx)=>{
      const place = idx+1; // 1-based
      let winChance;
      if(place>=201) winChance=0.75;
      else if(place>=101) winChance=0.60;
      else winChance=0.50;
      const win = Math.random() < winChance;
      const delta = (Math.random()<0.5?25:25) * (win?1:-1);
      if(entry.isPlayer){
        // результат игрока определяется реальным исходом боя, не симуляцией
        entry.elo = Math.max(0, entry.elo + (playerWon?25:-25));
      } else {
        entry.elo = Math.max(0, entry.elo + delta);
      }
    });

    board.sort((a,b)=>b.elo-a.elo);
    const playerEntry = board.find(b=>b.isPlayer);
    profile.elo = playerEntry.elo;

    Storage.saveLeaderboard(board.filter(b=>!b.isPlayer));
    Storage.saveProfile(profile);
    return board; // с игроком внутри, для немедленной отрисовки
  },
};
