const UIBattle = {
  activeLogTab: 'mine',

  renderAll(engine){
    this.renderFleets(engine);
    this.renderActionPanel(engine);
    this.renderLogs(engine);
    this.updateTimer(engine);
    document.getElementById('turn-num').textContent = 'Ход ' + engine.turn;
    document.getElementById('points-num').textContent = `${engine.points.player} : ${engine.points.enemy}`;
  },

  clsIcon(cls){ return {destroyer:'ЭМ', cruiser:'КР', battleship:'БЛ', submarine:'ПЛ'}[cls] || ''; },

  renderFleets(engine){
    const player = engine.player;
    // собственный статус
    const detected = engine.isDetectedBy(player, 'enemy');
    const statusRow = document.getElementById('own-status');
    let html = `<span class="badge ${detected?'danger':'ok'}">${detected?'Обнаружены':'Скрытны'}</span>`;
    html += `<span class="badge">Засвет: ${player.def.concealment.toFixed(2)} км</span>`;
    if(player.def.gk) html += `<span class="badge">ГК: ${player.gkCooldown>0?('перезарядка '+player.gkCooldown+' х.'):'готов'} · дальн. ${player.def.gk.range.toFixed(1)} км</span>`;
    if(player.def.torp) html += `<span class="badge">Торпеды: ${player.torpCooldown>0?('перезарядка '+player.torpCooldown+' х.'):'готовы'} · дальн. ${player.def.torp.range.toFixed(1)} км</span>`;
    if(player.def.class==='submarine') html += `<span class="badge ${player.submerged?'danger':''}">${player.submerged?'Под водой ('+(3-player.turnsSubmerged)+' х. до всплытия)':'На поверхности'} · зарядов ${player.diveChargesLeft}</span>`;
    statusRow.innerHTML = html;

    const renderList = (containerId, ships)=>{
      const div = document.getElementById(containerId);
      div.innerHTML='';
      ships.forEach(s=>{
        const row = document.createElement('div');
        row.className = 'unit-row' + (!s.alive?' dead':'') + (s.isPlayer?' is-player':'');
        const hpPct = Math.max(0,(s.hp/s.maxHp)*100);
        const hpColor = hpPct>50?'var(--b-green)':hpPct>20?'var(--b-amber)':'var(--b-red)';
        const d = s.alive ? dist(player.pos, s.pos) : null;

        let flags = '';
        if(s.alive && s.id!==player.id){
          const spottedByPlayerTeam = engine.isDetectedBy(s, player.team);
          const spottedByOtherTeam = engine.isDetectedBy(s, s.team==='player'?'enemy':'player');
          if(s.team!==player.team){
            flags += `<span class="flag ${spottedByPlayerTeam?'spotted':'hidden'}">${spottedByPlayerTeam?'Обнаружен':'Не обнаружен'}</span>`;
            if(spottedByPlayerTeam && player.def.gk) flags += `<span class="flag ${d<=player.def.gk.range?'in-range':''}">ГК ${d<=player.def.gk.range?'в радиусе':'вне радиуса'}</span>`;
            if(spottedByPlayerTeam && player.def.torp) flags += `<span class="flag ${d<=player.def.torp.range?'in-range':''}">Торп. ${d<=player.def.torp.range?'в радиусе':'вне радиуса'}</span>`;
          }
          if(s.def.class==='submarine' && s.submerged) flags += `<span class="flag submerged">Под водой</span>`;
        }

        let statusHtml='';
        if(!s.isPlayer && s.alive){
          if(s.botStatus==='thinking') statusHtml = '<div class="unit-status status-thinking">Думает...</div>';
          else if(s.botStatus==='ready') statusHtml = '<div class="unit-status status-ready">✓ Готов</div>';
        }

        row.innerHTML = `
          <div class="unit-row-top">
            <span class="unit-name">${s.def.name}<span class="cls-tag">${UIBattle.clsIcon(s.def.class)}${s.isPlayer?' · ВЫ':''}</span></span>
            <span class="unit-dist">${s.alive ? (d!==null && s.id!==player.id ? d.toFixed(2)+' км':'') : 'потоплен'}</span>
          </div>
          <div class="hp-bar-bg"><div class="hp-bar-fill" style="width:${hpPct}%; background:${hpColor}"></div></div>
          <div class="unit-flags">${flags}</div>
          ${statusHtml}
        `;
        div.appendChild(row);
      });
    };

    renderList('player-fleet', engine.playerTeam);
    renderList('enemy-fleet', engine.enemyTeam);
  },

  renderActionPanel(engine){
    const player = engine.player;
    const order = engine.playerOrder;
    const targetSel = document.getElementById('move-target-select');
    const attackSel = document.getElementById('attack-target-select');
    targetSel.innerHTML=''; attackSel.innerHTML='';

    [['POINT_A','Точка А'],['POINT_B','Точка Б']].forEach(([v,l])=>{
      const o=document.createElement('option'); o.value=v; o.textContent=l; targetSel.appendChild(o);
    });
    engine.enemyTeam.filter(e=>e.alive).forEach(e=>{
      const o=document.createElement('option'); o.value=e.id; o.textContent=e.def.name; targetSel.appendChild(o);
      const o2=document.createElement('option'); o2.value=e.id; o2.textContent=e.def.name; attackSel.appendChild(o2);
    });
    if(order.targetId) targetSel.value = order.targetId;
    if(order.targetId) attackSel.value = order.targetId;

    document.querySelectorAll('.action-btn[data-action]').forEach(b=>{
      b.classList.toggle('active', order.action===b.dataset.action);
    });

    const gkBtn = document.getElementById('btn-gk');
    const torpBtn = document.getElementById('btn-torp');
    const diveBtn = document.getElementById('btn-dive');
    gkBtn.style.display = player.def.gk ? 'inline-block':'none';
    torpBtn.style.display = player.def.torp ? 'inline-block':'none';
    diveBtn.style.display = player.def.class==='submarine' ? 'inline-block':'none';

    if(player.def.gk) gkBtn.disabled = player.gkCooldown>0;
    if(player.def.torp) torpBtn.disabled = player.torpCooldown>0;
    if(player.def.class==='submarine'){
      diveBtn.disabled = player.submerged || player.diveChargesLeft<=0 || player.justSurfaced;
      diveBtn.textContent = player.submerged ? 'Вы под водой' : `Погружение (${player.diveChargesLeft})`;
    }

    const note = document.getElementById('action-note');
    note.textContent = 'Действие за ход одно: либо движение, либо атака.';

    const panel = document.getElementById('action-panel');
    panel.style.opacity = engine.phase==='planning' ? '1':'0.4';
    panel.style.pointerEvents = engine.phase==='planning' ? 'auto':'none';
  },

  renderLogs(engine){
    const body = document.getElementById('log-body');
    const src = this.activeLogTab==='mine' ? engine.logMine : engine.logGlobal;
    body.innerHTML='';
    src.slice(-80).forEach(entry=>{
      const div = document.createElement('div');
      div.className = 'log-entry ' + (entry.cls||'');
      div.textContent = entry.text;
      body.appendChild(div);
    });
    body.scrollTop = body.scrollHeight;
  },

  updateTimer(engine, forceZero){
    const sec = forceZero ? 0 : engine.timerSec;
    document.getElementById('timer-num').textContent = engine.phase==='planning' ? sec : (engine.phase==='execution'?'РАСЧЁТ':'ОТЧЁТ');
    document.getElementById('timer-bar').style.width = Math.max(0,(sec/15*100))+'%';
    document.getElementById('phase-label').textContent =
      engine.phase==='planning' ? 'Планирование' : engine.phase==='execution' ? 'Выполнение' : 'Отчёт';
  },

  showResult(engine, winner){
    const banner = document.getElementById('result-banner');
    banner.style.display='block';
    banner.className = winner==='player' ? 'win':'lose';
    document.getElementById('result-text').textContent = winner==='player' ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ';
  },
};

function setPlayerOrder(engine, action){
  const order = engine.playerOrder;
  if(action==='approach' || action==='retreat'){
    order.action = action;
    if(!order.targetId) order.targetId = document.getElementById('move-target-select').value;
  } else if(action==='gk' || action==='torp'){
    order.action = action;
    order.targetId = document.getElementById('attack-target-select').value;
  } else if(action==='dive'){
    order.action = 'dive';
    order.targetId = null;
  }
  UIBattle.renderActionPanel(engine);
}
