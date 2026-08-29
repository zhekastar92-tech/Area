class ShipInstance{
  constructor(def, team, pos){
    this.def = def;
    this.team = team; // 'player' | 'enemy'
    this.isPlayer = false;
    this.id = def.id + '_' + team + '_' + Math.random().toString(36).slice(2,8);
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.pos = {...pos};
    this.alive = true;
    this.gkCooldown = 0;
    this.torpCooldown = 0;
    this.order = null; // {action:'approach'|'retreat'|'gk'|'torp', targetId}
    this.plannedOrder = null;
    this.botStatus = 'idle';
    this.skillTier = 'average'; // 'newbie' | 'average' | 'statist' — назначается при создании боя

    // подлодки
    this.submerged = false;
    this.diveChargesLeft = def.diveCharges || 0;
    this.turnsSubmerged = 0;
    this.justSurfaced = false;

    this.cruiserArchetype = null; // вычисляется движком при старте боя
  }

  get detectionRadius(){
    // TODO: консьюмабли (радар и т.п.) — future_features, пока не влияют
    return this.def.concealment;
  }
}
