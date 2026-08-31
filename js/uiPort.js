const UIPort = {
  activeTab:'branches',
  activeNation:'germany',
  viewedShip:null,

  init(){
    document.querySelectorAll('.port-tab-btn').forEach(btn=>{
      btn.onclick = ()=> UIPort.switchTab(btn.dataset.tab);
    });
    this.renderHeader();
    this.renderBranches();
  },

  switchTab(tab){
    this.activeTab = tab;
    document.querySelectorAll('.port-tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
    document.querySelectorAll('.port-panel').forEach(p=>p.classList.toggle('active', p.id==='panel-'+tab));
    if(tab==='branches') this.renderBranches();
    if(tab==='shop') this.renderShop();
    if(tab==='profile') this.renderProfile();
    if(tab==='ranked') this.renderRanked();
    if(tab==='constructor') ConstructorUI.render();
  },

  renderHeader(){
    const p = Storage.getProfile();
    document.getElementById('cur-silver').textContent = p.silver.toLocaleString('ru-RU');
    document.getElementById('cur-xp').textContent = p.xp.toLocaleString('ru-RU');
    document.getElementById('launch-btn').disabled = !p.selectedShipId;
  },

  renderBranches(){
    const db = Storage.getShipsDB();
    const profile = Storage.getProfile();
    const nations = [...new Set(db.map(s=>s.nation))];

    const chipsWrap = document.getElementById('nation-chips');
    chipsWrap.innerHTML='';
    nations.forEach(nid=>{
      const nation = NATIONS.find(n=>n.id===nid);
      const chip = document.createElement('button');
      chip.className='nation-chip'+(nid===this.activeNation?' active':'');
      chip.textContent = nation ? nation.name : nid;
      chip.onclick = ()=>{ this.activeNation=nid; this.renderBranches(); };
      chipsWrap.appendChild(chip);
    });

    const wrap = document.getElementById('branches-content');
    wrap.innerHTML='';
    const classes = [['destroyer','Эсминцы'],['cruiser','Крейсеры'],['battleship','Линкоры'],['submarine','Подлодки']];
    classes.forEach(([cls,label])=>{
      const ships = db.filter(s=>s.nation===this.activeNation && s.class===cls).sort((a,b)=>a.tier-b.tier);
      if(ships.length===0) return;
      const section = document.createElement('div');
      section.className='class-branch';
      section.innerHTML = `<h4>${label}</h4>`;
      const row = document.createElement('div'); row.className='branch-row';
      ships.forEach((s,i)=>{
        const owned = profile.ownedShipIds.includes(s.id);
        const node = document.createElement('div');
        node.className='branch-node'+(owned?' owned':'')+(profile.selectedShipId===s.id?' selected':'');
        node.innerHTML = `<div class="tname">${s.name}</div><div class="ttier">T${s.tier}${s.isPremium?' ★':''}</div>`;
        node.onclick = ()=> this.showShipDetail(s);
        row.appendChild(node);
        if(i<ships.length-1){
          const conn = document.createElement('div'); conn.className='branch-connector'; conn.textContent='→';
          row.appendChild(conn);
        }
      });
      section.appendChild(row);
      wrap.appendChild(section);
    });

    document.getElementById('ship-detail-wrap').innerHTML='';
  },

  showShipDetail(s){
    const profile = Storage.getProfile();
    const owned = profile.ownedShipIds.includes(s.id);
    const wrap = document.getElementById('ship-detail-wrap');
    let statHtml = `
      <div>HP<b>${Math.round(s.hp)}</b></div>
      <div>Броня<b>${s.armor}</b></div>
      <div>Скорость<b>${s.speed} км/х</b></div>
      <div>Засвет<b>${s.concealment} км</b></div>
    `;
    if(s.gk) statHtml += `<div>ГК урон<b>${s.gk.damage}</b></div><div>ГК пробитие<b>${s.gk.penetration}</b></div><div>ГК дальность<b>${s.gk.range} км</b></div><div>ГК перезарядка<b>${s.gk.reloadTurns} х.</b></div>`;
    if(s.torp) statHtml += `<div>Торп. урон<b>${s.torp.damage}</b></div><div>Торп. дальность<b>${s.torp.range} км</b></div><div>Торп. перезарядка<b>${s.torp.reloadTurns} х.</b></div>`;
    if(s.diveCharges) statHtml += `<div>Заряды погружения<b>${s.diveCharges}</b></div>`;

    wrap.innerHTML = `
      <div class="ship-detail-card">
        <h3>${s.name} <span style="color:var(--p-text-sub); font-size:13px;">— ${NATIONS.find(n=>n.id===s.nation).name}, T${s.tier}</span></h3>
        <div class="stat-grid">${statHtml}</div>
        ${owned
          ? `<button class="btn" id="select-ship-btn">Выбрать для боя</button>`
          : `<button class="btn" id="buy-ship-btn">Купить за ${s.silverCost.toLocaleString('ru-RU')} серебра</button>`
        }
      </div>
    `;
    if(owned){
      document.getElementById('select-ship-btn').onclick = ()=>{
        const p = Storage.getProfile(); p.selectedShipId = s.id; Storage.saveProfile(p);
        this.renderHeader(); this.renderBranches();
      };
    } else {
      document.getElementById('buy-ship-btn').onclick = ()=>{
        const p = Storage.getProfile();
        if(p.silver < s.silverCost) return alert('Недостаточно серебра.');
        p.silver -= s.silverCost; p.ownedShipIds.push(s.id); p.selectedShipId = s.id;
        Storage.saveProfile(p);
        this.renderHeader(); this.renderBranches();
      };
    }
  },

  renderShop(){
    const db = Storage.getShipsDB();
    const profile = Storage.getProfile();
    const grid = document.getElementById('shop-grid');
    grid.innerHTML='';
    db.filter(s=>!profile.ownedShipIds.includes(s.id)).sort((a,b)=>a.silverCost-b.silverCost).forEach(s=>{
      const card = document.createElement('div'); card.className='shop-card';
      card.innerHTML = `
        <h5>${s.name}</h5>
        <div class="meta">${NATIONS.find(n=>n.id===s.nation).name} · ${UIBattle.clsIcon(s.class)} · T${s.tier}</div>
        <div class="cost">${s.silverCost.toLocaleString('ru-RU')} серебра</div>
        <button class="btn btn-outline" data-id="${s.id}">Купить</button>
      `;
      card.querySelector('button').onclick = ()=>{
        const p = Storage.getProfile();
        if(p.silver < s.silverCost) return alert('Недостаточно серебра.');
        p.silver -= s.silverCost; p.ownedShipIds.push(s.id);
        Storage.saveProfile(p);
        this.renderHeader(); this.renderShop();
      };
      grid.appendChild(card);
    });
  },

  renderProfile(){
    const p = Storage.getProfile();
    const board = Storage.getLeaderboard();
    const standing = ProgressionSystem.getPlayerStanding(p, board);
    const isTop50 = standing.inTop && standing.place<=50;
    const rankName = ProgressionSystem.getRankName(p.elo, isTop50);

    const standingLine = standing.inTop
      ? `Место в глобальном топ-300: #${standing.place}`
      : `Вне топ-300 · до входа в рейтинг не хватает ${(standing.cutoffElo - p.elo + 1).toLocaleString('ru-RU')} ELO (300-е место сервера: ${standing.cutoffElo})`;

    document.getElementById('rank-banner').innerHTML = `
      <div class="rank-name ${isTop50?'admiral':''}" ${isTop50?'style="background:linear-gradient(90deg,#2fe0c7,#a8fff2,#2fe0c7); -webkit-background-clip:text; background-clip:text; color:transparent;"':''}>${rankName}</div>
      <div style="color:var(--p-text-sub); margin-top:6px; font-family:Consolas,monospace;">ELO: ${p.elo} · ${standingLine}</div>
    `;

    document.getElementById('profile-grid').innerHTML = `
      <div class="profile-stat"><div class="num">${p.battles}</div><div class="lbl">Боёв</div></div>
      <div class="profile-stat"><div class="num">${p.wins}</div><div class="lbl">Побед</div></div>
      <div class="profile-stat"><div class="num">${p.battles? Math.round(p.wins/p.battles*100):0}%</div><div class="lbl">Винрейт</div></div>
      <div class="profile-stat"><div class="num">${p.ownedShipIds.length}</div><div class="lbl">Кораблей</div></div>
    `;
  },

  renderRanked(){
    const p = Storage.getProfile();
    const board = Storage.getLeaderboard();
    const standing = ProgressionSystem.getPlayerStanding(p, board);
    const combined = [...board];
    if(standing.inTop) combined.push({ id:'player', name:'Вы', elo:p.elo, isPlayer:true });
    combined.sort((a,b)=>b.elo-a.elo);

    const list = document.getElementById('leaderboard-list');
    list.innerHTML='';
    if(!standing.inTop){
      const note = document.createElement('div');
      note.style.cssText='padding:12px 16px; color:var(--p-text-sub); font-size:12px; border-bottom:1px solid var(--p-border);';
      note.textContent = `Вы вне глобального топ-300 (ваш ELO: ${p.elo}, порог входа: ${standing.cutoffElo}+).`;
      list.appendChild(note);
    }
    combined.slice(0,100).forEach((entry, idx)=>{
      const place = idx+1;
      const row = document.createElement('div');
      row.className = 'lb-row'+(entry.isPlayer?' is-player':'');
      row.innerHTML = `
        <div class="lb-place">#${place}</div>
        <div class="lb-name ${place<=50?'top50':''}">${entry.name || entry.id}</div>
        <div class="lb-elo">${entry.elo} ELO</div>
      `;
      list.appendChild(row);
    });
  },
};

document.addEventListener('DOMContentLoaded', ()=>{ /* инициализация в main.js */ });
