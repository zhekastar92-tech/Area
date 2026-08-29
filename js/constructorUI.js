const ConstructorUI = {
  mode:'create', // 'create' | 'database'
  editingId:null,

  render(){
    const wrap = document.getElementById('panel-constructor');
    wrap.innerHTML = `
      <div class="constructor-tabs">
        <button class="ctor-mode-btn ${this.mode==='create'?'active':''}" id="ctor-mode-create">Создать</button>
        <button class="ctor-mode-btn ${this.mode==='database'?'active':''}" id="ctor-mode-db">База кораблей (баланс)</button>
      </div>
      <div id="ctor-content"></div>
    `;
    document.getElementById('ctor-mode-create').onclick = ()=>{ this.mode='create'; this.editingId=null; this.render(); };
    document.getElementById('ctor-mode-db').onclick = ()=>{ this.mode='database'; this.render(); };

    if(this.mode==='create') this.renderForm(null);
    else this.renderDatabase();
  },

  renderDatabase(){
    const db = Storage.getShipsDB();
    const content = document.getElementById('ctor-content');
    const rows = db.map(s=>`
      <tr data-id="${s.id}">
        <td>${s.name}</td><td>${NATIONS.find(n=>n.id===s.nation)?.name||s.nation}</td>
        <td>${UIBattle.clsIcon(s.class)}</td><td>T${s.tier}</td>
        <td>${Math.round(s.hp)}</td><td>${s.armor}</td><td>${s.speed}</td>
      </tr>`).join('');
    content.innerHTML = `
      <table class="ctor-db-table">
        <thead><tr><th>Название</th><th>Нация</th><th>Класс</th><th>Тир</th><th>HP</th><th>Броня</th><th>Скор.</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    content.querySelectorAll('tbody tr').forEach(tr=>{
      tr.onclick = ()=>{
        const ship = Storage.getShipsDB().find(s=>s.id===tr.dataset.id);
        this.editingId = ship.id;
        this.renderForm(ship);
      };
    });
  },

  renderForm(ship){
    const isEdit = !!ship;
    const content = document.getElementById('ctor-content');
    const s = ship || { id:'', name:'', nation:'germany', class:'destroyer', tier:1, isPremium:false, silverCost:0,
      hp:5000, armor:0, speed:3, concealment:6, gk:{damage:600,penetration:10,range:7,reloadTurns:1}, torp:null, diveCharges:null };

    content.innerHTML = `
      <div class="ctor-form">
        <div class="ctor-fields-row">
          <div class="ctor-field"><label>ID (уникальный)</label><input id="f-id" value="${s.id}" ${isEdit?'readonly':''}></div>
          <div class="ctor-field"><label>Название</label><input id="f-name" value="${s.name}"></div>
          <div class="ctor-field"><label>Нация</label>
            <select id="f-nation">${NATIONS.map(n=>`<option value="${n.id}" ${n.id===s.nation?'selected':''}>${n.name}</option>`).join('')}</select>
          </div>
          <div class="ctor-field"><label>Класс</label>
            <select id="f-class">
              ${['destroyer','cruiser','battleship','submarine'].map(c=>`<option value="${c}" ${c===s.class?'selected':''}>${UIBattle.clsIcon(c)}</option>`).join('')}
            </select>
          </div>
          <div class="ctor-field"><label>Тир (1-10, 11=супер)</label><input id="f-tier" type="number" min="1" max="11" value="${s.tier}"></div>
          <div class="ctor-field"><label>Тип</label>
            <select id="f-premium"><option value="0" ${!s.isPremium?'selected':''}>Ветка</option><option value="1" ${s.isPremium?'selected':''}>Премиум</option></select>
          </div>
          <div class="ctor-field"><label>Стоимость (серебро)</label><input id="f-cost" type="number" value="${s.silverCost}"></div>
        </div>

        <h4 style="margin:14px 0 8px; font-size:12px; color:var(--p-text-sub); text-transform:uppercase;">Основные характеристики</h4>
        <div class="ctor-fields-row">
          <div class="ctor-field"><label>HP</label><input id="f-hp" type="number" step="1" value="${Math.round(s.hp)}"></div>
          <div class="ctor-field"><label>Броня</label><input id="f-armor" type="number" step="0.1" value="${s.armor}"></div>
          <div class="ctor-field"><label>Скорость (км/ход)</label><input id="f-speed" type="number" step="0.01" value="${s.speed}"></div>
          <div class="ctor-field"><label>Засвет (км)</label><input id="f-conceal" type="number" step="0.01" value="${s.concealment}"></div>
        </div>

        <h4 style="margin:14px 0 8px; font-size:12px; color:var(--p-text-sub); text-transform:uppercase;">Главный калибр (пусто — нет ГК)</h4>
        <div class="ctor-fields-row">
          <div class="ctor-field"><label>Урон</label><input id="f-gkdmg" type="number" value="${s.gk?.damage||''}"></div>
          <div class="ctor-field"><label>Пробитие</label><input id="f-gkpen" type="number" step="0.1" value="${s.gk?.penetration||''}"></div>
          <div class="ctor-field"><label>Дальность (км)</label><input id="f-gkrange" type="number" step="0.1" value="${s.gk?.range||''}"></div>
          <div class="ctor-field"><label>Перезарядка (ход)</label><input id="f-gkreload" type="number" value="${s.gk?.reloadTurns || (s.class==='battleship'?2:1)}"></div>
        </div>

        <h4 style="margin:14px 0 8px; font-size:12px; color:var(--p-text-sub); text-transform:uppercase;">Торпеды (пусто — нет торпед)</h4>
        <div class="ctor-fields-row">
          <div class="ctor-field"><label>Урон</label><input id="f-torpdmg" type="number" value="${s.torp?.damage||''}"></div>
          <div class="ctor-field"><label>Дальность (км)</label><input id="f-torprange" type="number" step="0.1" value="${s.torp?.range||''}"></div>
          <div class="ctor-field"><label>Перезарядка (ход)</label><input id="f-torpreload" type="number" value="${s.torp?.reloadTurns||1}"></div>
        </div>

        <h4 style="margin:14px 0 8px; font-size:12px; color:var(--p-text-sub); text-transform:uppercase;">Подлодка (заряды погружения, если применимо)</h4>
        <div class="ctor-fields-row">
          <div class="ctor-field"><label>Заряды погружения</label><input id="f-dive" type="number" value="${s.diveCharges||''}"></div>
        </div>

        <div id="balance-warning" class="warn-note"></div>

        <div style="margin-top:16px; display:flex; gap:10px;">
          <button class="btn" id="ctor-save-btn">${isEdit?'Сохранить изменения':'Создать и добавить в ветку'}</button>
          ${isEdit?'<button class="btn btn-outline" id="ctor-delete-btn">Удалить корабль</button>':''}
        </div>
        <div class="locked-note" style="margin-top:8px;">Сохранённый корабль сразу появляется в ветке/магазине и доступен ботам при следующем формировании состава боя.</div>
      </div>
    `;

    document.getElementById('ctor-save-btn').onclick = ()=> this.saveForm(isEdit);
    if(isEdit) document.getElementById('ctor-delete-btn').onclick = ()=>{
      if(confirm('Удалить корабль из базы безвозвратно?')){
        Storage.deleteShip(s.id);
        this.editingId=null;
        this.renderDatabase();
      }
    };

    this.checkBalanceWarning();
    ['f-hp','f-armor','f-speed','f-conceal','f-gkdmg','f-gkpen','f-gkrange','f-torpdmg','f-torprange','f-class','f-tier'].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.oninput = ()=> this.checkBalanceWarning();
    });
  },

  checkBalanceWarning(){
    const cls = document.getElementById('f-class').value;
    const tier = parseInt(document.getElementById('f-tier').value)||1;
    const armor = parseFloat(document.getElementById('f-armor').value)||0;
    const pen = parseFloat(document.getElementById('f-gkpen').value)||0;
    const db = Storage.getShipsDB();
    const warnEl = document.getElementById('balance-warning');
    let warnings=[];

    if(cls==='cruiser' || cls==='destroyer'){
      const bbAtTier = db.filter(s=>s.class==='battleship' && s.tier===tier);
      if(bbAtTier.length && pen > 0){
        const avgArmor = bbAtTier.reduce((a,b)=>a+b.armor,0)/bbAtTier.length;
        if(pen >= avgArmor) warnings.push(`Пробитие (${pen}) ≥ средней брони линкоров этого тира (${avgArmor.toFixed(1)}) — линкор будет пробиваться штатно, обычно это не задумывалось.`);
      }
    }
    warnEl.textContent = warnings.join(' ');
  },

  saveForm(isEdit){
    const val = id=>{ const v=document.getElementById(id).value; return v===''?null:v; };
    const num = id=>{ const v=val(id); return v===null?null:parseFloat(v); };

    const id = isEdit ? this.editingId : (val('f-id') || (val('f-nation')+'_'+val('f-class')+'_custom_'+Date.now()));
    const gkDmg = num('f-gkdmg');
    const torpDmg = num('f-torpdmg');
    const diveVal = num('f-dive');

    const ship = {
      id, name: val('f-name')||'Без названия', nation: val('f-nation'), class: val('f-class'),
      tier: parseInt(val('f-tier'))||1, isPremium: val('f-premium')==='1',
      silverCost: num('f-cost')||0,
      hp: num('f-hp')||1000, armor: num('f-armor')||0, speed: num('f-speed')||1, concealment: num('f-conceal')||5,
      gk: gkDmg ? { damage:gkDmg, penetration:num('f-gkpen')||0, range:num('f-gkrange')||5, reloadTurns:num('f-gkreload')|| (val('f-class')==='battleship'?2:1) } : null,
      torp: torpDmg ? { damage:torpDmg, range:num('f-torprange')||5, reloadTurns:num('f-torpreload')||1 } : null,
      diveCharges: diveVal || null,
      future_features:{ consumables:[], upgrades:[], ammoTypes:["AP","HE"] },
    };

    Storage.upsertShip(ship);
    alert(isEdit ? 'Изменения сохранены и уже применились в игре.' : 'Корабль создан и добавлен в ветку/магазин.');
    this.mode='database';
    this.editingId=ship.id;
    this.render();
  },
};
