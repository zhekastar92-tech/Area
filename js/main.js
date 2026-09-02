window.currentEngine = null;

function goToBattle(){
  const profile = Storage.getProfile();
  const shipDef = Storage.getShipsDB().find(s=>s.id===profile.selectedShipId);
  if(!shipDef){ alert('Сначала выберите корабль во вкладке "Ветки".'); return; }

  document.getElementById('port-screen').classList.remove('active');
  document.getElementById('battle-screen').classList.add('active');
  document.getElementById('result-banner').style.display='none';
  document.getElementById('dead-panel').style.display='none';
  document.getElementById('action-panel').style.display='block';
  document.getElementById('result-stats-wrap').innerHTML='';
  UIBattle.activeLogTab='mine';
  document.getElementById('tab-mine').classList.add('active');
  document.getElementById('tab-global').classList.remove('active');

  window.currentEngine = new BattleEngine(shipDef);
}

function returnToPort(){
  document.getElementById('battle-screen').classList.remove('active');
  document.getElementById('port-screen').classList.add('active');
  window.currentEngine = null;
  UIPort.renderHeader();
  UIPort.switchTab('hangar');
}

document.addEventListener('DOMContentLoaded', ()=>{
  UIPort.init();

  document.getElementById('launch-btn').onclick = goToBattle;
  document.getElementById('return-port-btn').onclick = returnToPort;
  document.getElementById('skip-battle-btn').onclick = ()=>{
    if(window.currentEngine) window.currentEngine.activateFastForward();
  };

  document.getElementById('move-target-select').onchange = (e)=>{
    if(!window.currentEngine) return;
    const o = window.currentEngine.playerOrder;
    if(o.action==='approach' || o.action==='retreat') o.targetId = e.target.value;
  };
  document.getElementById('attack-target-select').onchange = (e)=>{
    if(!window.currentEngine) return;
    const o = window.currentEngine.playerOrder;
    if(o.action==='gk' || o.action==='torp') o.targetId = e.target.value;
  };

  document.getElementById('tab-mine').onclick = ()=>{
    UIBattle.activeLogTab='mine';
    document.getElementById('tab-mine').classList.add('active');
    document.getElementById('tab-global').classList.remove('active');
    if(window.currentEngine) UIBattle.renderLogs(window.currentEngine);
  };
  document.getElementById('tab-global').onclick = ()=>{
    UIBattle.activeLogTab='global';
    document.getElementById('tab-global').classList.add('active');
    document.getElementById('tab-mine').classList.remove('active');
    if(window.currentEngine) UIBattle.renderLogs(window.currentEngine);
  };
});
