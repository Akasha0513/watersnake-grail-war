import { ArchmageUtility } from '../setup/utility-classes.js';
import { MacroUtils } from '../setup/utility-classes.js';
import { DiceArchmage } from './dice.js';

/**
 * Extend the base Actor class to implement additional logic specialized for the system.
 */
export class ActorArchmage extends Actor {

  /** @override */
  constructor(data, context={}) {
    // If this is a compendium actor, check to see if we can use module art.
    // Note: in addition to this, we have a step during the actor's preCreate
    // event to use fallback token art.
    if (context.pack && data._id) {
      // Retrieve this token's module art from the art map, if any .
      const art = game.holygrailwar.system.moduleArt.map.get(`Compendium.${context.pack}.${data._id}`);
      if (art) {
        // Module art was found. Replace the actor image.
        data.img = art.actor;
        // Replace the token art as well.
        const tokenData = {
          texture: {
            src: typeof art.token === "string" ? art.token : art.token.img,
            scaleX: art.token.scale,
            scaleY: art.token.scale
          }
        };
        data.prototypeToken = foundry.utils.mergeObject(data.prototypeToken ?? {}, tokenData);
      }
    }

    // Run the parent constructor.
    super(data, context);
  }

  /** @override */
  async rollInitiative({createCombatants=false, rerollInitiative=false, initiativeOptions={}}={}) {
    // Obtain (or create) a combat encounter
    let combat = game.combat;
    if ( !combat ) {
      if ( game.user.isGM && canvas.scene ) {
        combat = await game.combats.object.create({scene: canvas.scene.id, active: true});
      }
      else {
        ui.notifications.warn(game.i18n.localize("COMBAT.NoneActive"));
        return null;
      }
    }

    // Create new combatants
    if ( createCombatants ) {
      const tokens = this.isToken ? [this.token] : this.getActiveTokens();
      const createData = tokens.reduce((arr, t) => {
        if ( t.inCombat ) return arr;
        arr.push({tokenId: t.id, hidden: t.hidden});
        return arr;
      }, []);
      await combat.createEmbeddedDocuments("Combatant", createData);
    }

    // Iterate over combatants to roll for
    const combatantIds = combat.combatants.reduce((arr, c) => {
      if ( !c.actor ) return arr;
      if ( (c.actor.id !== this.id) || (this.isToken && (c.tokenId !== this.token.id)) ) return arr;
      if ( c.initiative && !rerollInitiative ) return arr;
      arr.push(c.id);
      return arr;
    }, []);
    return combatantIds.length ? combat.rollInitiative(combatantIds, initiativeOptions) : combat;
  }

  /**
   * Augment the basic actor data with additional dynamic data.
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  prepareData() {
    // Reset all derived and effects data.
    //this.reset();
    this.overrides = {};

    // Apply active effects in group 0 (ability scores, base attributes).
    this.applyActiveEffects('pre');

    // Prepare data, items, derived data, and effects.
    this.prepareBaseData();
    // this.prepareEmbeddedEntities();

    // Apply activeEffects in group 1 (most properties).
    this.applyActiveEffects('default');
    this.prepareDerivedData();

    // Apply activeEffects to group 2 (standardBonuses).
    this.applyActiveEffects('post');
  }

  /** @inheritdoc */
  prepareBaseData() {
    // Get the Actor's data object
    const actorData = this;
    if (!actorData.img) actorData.img = CONST.DEFAULT_TOKEN;
    if (!actorData.name) actorData.name = actorData.type;

    const data = actorData.system;
    const flags = actorData.flags;

    // Initialize the model for data calculations.
    let model = game.data.model.Actor[actorData.type];

    // Level, experience, and proficiency
    data.attributes.level.value = parseInt(data.attributes.level.value);
    // Set a copy of level in details in order to mimic 5e's data structure.
    data.details.level = data.attributes.level;

    // Fallback for attack modifier and defenses
    if (data.attributes.attackMod === undefined) data.attributes.attackMod = model.attributes.attackMod;

    // Tier multiplier (used by both PCs and monsters)
    data.tierMult = CONFIG.HOLYGRAILWAR.tierMultPerLevel[data.attributes.level.value];

    // Prepare Character data
    if (actorData.type === 'character' || actorData.type === 'master') {
      this._prepareCharacterData(data, model, flags);
    }
    else if (actorData.type === 'npc') {
      this._prepareNPCData(data, model, flags);
    }

    // Get the escalation die value.
    data.attributes.escalation = {
      value: (game.combats != undefined && game.combat != null) ? ArchmageUtility.getEscalation(game.combat) : 0,
    };

  }

  /**
   * Override applyActiveEffects() to allow staggered updates.
   *
   * @param {string} weight Determines which set of effects to apply.
   */
  applyActiveEffects(weight = 'default') {
    const overrides = foundry.utils.flattenObject(this.overrides ?? {});

    // Extract non-disabled and relevant changes
    let relevant = (c => {return c.value.disabled !== true;});
    switch (weight) {
      // Handle ability scores and base attributes.
      case 'pre':
        relevant = (c => {return c.key.match(/system\.(abilities\..*\.value|attributes\..*\.base|attributes\.grade\.value|attributes.recoveries.dice|attributes\.hp\.extra)/g);});
        break;
      // Handle the non-special active effects.
      case 'default':
        relevant = (c => {return !c.key.includes('standardBonuses') && !c.key.includes('escalation');});
        break;
      // Handle escalation die.
      case 'ed':
        relevant = (c => {return c.key == 'system.attributes.escalation.value';});
        break;
      // Handle standard bonuses.
      case 'std':
        relevant = (c => {return c.key == 'system.attributes.standardBonuses.value';});
        break;
      // Handle remaining active effects.
      case 'post':
        // Use the default filter function defined prior to the switch statement.
        break;
    }
    const changes = this.effects.reduce((changes, e) => {
      if ( e.disabled ) return changes;
      return changes.concat(e.changes.map(c => {
        c = foundry.utils.duplicate(c);
        c.effect = e;
        c.name = e?.name;
        c.priority = c.priority ?? (c.mode * 10);
        return c;
      })).filter(relevant);
    }, []);

    // Apply stacking rules:
    // - Only worst penalty applies
    // - Bonuses stack so long as their source is different
    // - Item bonuses don't stack, but they aren't AEs anyway
    let uniqueChanges = [];
    let uniquePenalties = {};
    let uniqueBonuses = {};
    let stackingPenalties = {};
    let stackingBonuses = {};
    let uniqueBonusLabels = {};
    let stackedChange;
    for ( let change of changes ) {
      // First save numeric value if we have it
      if (!isNaN(change.value)) {
        change.numeric = Number(change.value);
        change.value = "";
      } else {
        change.numeric = 0;
      }

      // For non-stacking bonuses, let the users sort it out
      if (change.mode != CONST.ACTIVE_EFFECT_MODES.ADD) {
        uniqueChanges.push(change);
        continue;
      }

      // Penalties do not stack (use the worst) unless flagged to
      if (change.numeric < 0) {
        // If it's meant to stack save it and handle it later
        if (change.effect.flags['watersnake-grail-war']?.stacksAlways) {
          if (!stackingPenalties[change.key]) stackingPenalties[change.key] = [];
          stackingPenalties[change.key].push(change);
        }
        // Else if it's new save it
        else if (!uniquePenalties[change.key]) uniquePenalties[change.key] = change;
        // And if it isn't check if the new penalty is worse
        else { // Check if the new penalty is worse than the earlier one
          if (change.numeric < uniquePenalties[change.key].numeric) {
            uniquePenalties[change.key].numeric = change.numeric;
          }
        }
      }
      // Bonuses stack if the name is different or if flagged to
      else {
        // If it's meant to stack save it and handle it later
        if (change.effect.flags['watersnake-grail-war']?.stacksAlways) {
          if (!stackingBonuses[change.key]) stackingBonuses[change.key] = [];
          stackingBonuses[change.key].push(change);
        }
        // Else if it's new save it
        else if (!uniqueBonuses[change.key]) {
          uniqueBonuses[change.key] = change;
          uniqueBonusLabels[change.key] = {};
          uniqueBonusLabels[change.key][change.name] = change;
        }
        // And if it isn't check if the new bonus has a new name
        else { // Check if we have other bonuses with the same name
          if (uniqueBonusLabels[change.key][change.name]) {
            // An effect with the same name already exists, use better one
            if (change.numeric > uniqueBonusLabels[change.key][change.name].numeric) {
              uniqueBonuses[change.key] = change;
              uniqueBonusLabels[change.key][change.name] = change;
            }
          } else {
            // No other effect with this name exists, stack
            uniqueBonusLabels[change.key][change.name] = change;
            if (change.value) uniqueBonuses[change.key].value = (Object.values(uniqueBonusLabels[change.key]).reduce((a, b) => a.value + b.value)).toString();
            if (change.numeric) uniqueBonuses[change.key].numeric += change.numeric;
          }
        }
      }
    }
    // Merge stacking bonuses and penalties into unique bonuses
    for (let [k, v] of Object.entries(stackingPenalties)) {
      //TODO: is this correct, or should we stack by name and still keep the worst?
      // Compute stacked change
      stackedChange = v[0];
      for (let change of Object.values(v.slice(1))) {
        stackedChange.value += change.value; // Concatenation
        stackedChange.numeric += change.numeric;
      }
      // Set or adjust unique penalty
      if (!uniquePenalties[stackedChange.key]) uniquePenalties[stackedChange.key] = stackedChange;
      else {
        uniquePenalties[stackedChange.key].value += stackedChange.value; // Concatenation
        uniquePenalties[stackedChange.key].numeric += stackedChange.numeric;
      }
    }
    for (let [k, v] of Object.entries(stackingBonuses)) {
      // Compute stacked change
      stackedChange = v[0];
      for (let change of Object.values(v.slice(1))) {
        stackedChange.value += change.value; // Concatenation
        stackedChange.numeric += change.numeric;
      }
      // Set or adjust unique bonus
      if (!uniqueBonuses[stackedChange.key]) uniqueBonuses[stackedChange.key] = stackedChange;
      else {
        uniqueBonuses[stackedChange.key].value += stackedChange.value; // Concatenation
        uniqueBonuses[stackedChange.key].numeric += stackedChange.numeric;
      }
    }
    // Merge stacked bonuses into penalties to get overall change
    for (let change of Object.values(uniqueBonuses)) {
      if (!uniquePenalties[change.key]) uniquePenalties[change.key] = change;
      else {
        uniquePenalties[change.key].value = (uniquePenalties[change.key].value + change.value).toString();
        uniquePenalties[change.key].numeric += change.numeric;
      }
    }
    // Finally merge value and numeric
    for (let change of Object.values(uniquePenalties)) {
      if (change.numeric) uniquePenalties[change.key].value += (change.numeric < 0 ? "" : "+") + change.numeric;
    }
    // Put everything together into an array of changes, once per target value
    uniqueChanges = uniqueChanges.concat(Object.values(uniquePenalties));

    // Organize changes by their application priority
    uniqueChanges.sort((a, b) => a.priority - b.priority);

    // Apply all changes of this phase
    for ( let change of uniqueChanges ) {
      // Skip anything we already applied
      if (overrides[change.key]) continue;

      // Apply effect
      const result = change.effect.apply(this, change);
      // Remember we already applied change for everything but @ed and @std
      if ( result !== null && !change.key.includes('standardBonuses') && !change.key.includes('escalation')) {
        overrides[change.key] = result[change.key];
      }
    }

    // Expand the set of final overrides
    this.overrides = foundry.utils.expandObject(overrides);
  }

  /** @inheritdoc */
  prepareEmbeddedEntities() {
    // @todo is this still needed? Causes issues in v10.
    const embeddedTypes = this.constructor.metadata.embedded || {};
    for ( let cls of Object.values(embeddedTypes) ) {
      const collection = cls.metadata.collection;
      for ( let e of this[collection] ) {
        e.prepareData();
      }
    }
  }

  /** @inheritdoc */
  prepareDerivedData() {
    // Get the Actor's data object
    const actorData = this;
    const data = actorData.system;

    // Initiative
    if (actorData.type === 'character' || actorData.type === 'master') {
      let incrInit = 0;
      let statInit = data.abilities?.agi?.nonKey?.mod || 0;
      if (game.settings.get("watersnake-grail-war", "secondEdition")) {
        // In 2e the skills incremental also increases initiative
        if (this.system.incrementals?.skillInitiative) incrInit = 1;
        // In 2e wizards have a talent to use Int instead of Dex
        if (this.getFlag("watersnake-grail-war", "dexToInt")) statInit = data.abilities?.mgi?.nonKey?.mod || 0;
        // In 2e beta the bonus to disengage also applies to initiative
        incrInit += data.attributes.saves.disengageBonus;
      }
      // 성배전쟁 이니셔티브: 1d20 + 민첩 수정치 + 영령의 급(서번트만, 마스터 0)
      let gradeInit = (actorData.type !== 'master') ? (Number(data.attributes.grade?.value) || 0) : 0;
      data.attributes.init.mod = statInit + data.attributes.init.value + gradeInit + incrInit;
    }
    else if (actorData.type === 'npc') {
      data.attributes.init.mod = data.attributes.init.value;
    }

    // Get the escalation die value.
    if (game.combats !== undefined && game.combat !== null) {
      data.attributes.escalation = {
        value: ArchmageUtility.getEscalation(game.combat)
      };
    }
    else {
      data.attributes.escalation = { value: 0 };
    }

    this.applyActiveEffects('ed');

    // Must recompute this here because the e.d. might have changed.
    data.attributes.standardBonuses = {
      value: data.attributes.level.value + data.attributes.escalation.value
    };

    this.applyActiveEffects('std')
  }

  /* -------------------------------------------- */

  /**
   * Prepare Character type specific data
   * @param data
   *
   * @return {undefined}
   */
  _prepareCharacterData(data, model, flags) {
    // 경험치 최대치: 레벨(8 미만)=레벨, 레벨 8 이상=레벨×2 (마스터용)
    if (data.attributes.xp) {
      const _lvl = Number(data.attributes.level?.value) || 0;
      if (data.attributes.xp.automatic) data.attributes.xp.max = _lvl < 8 ? _lvl : _lvl * 2;
    }

    // Find known classes if not already detected - fixes older characters
    if (!data.details.detectedClasses && data.details.class?.value) {
      let matchedClasses = ArchmageUtility.detectClasses(data.details.class.value);
      data.details.detectedClasses = matchedClasses;
    }

    // Build out the icon results structure if it hasn't been
    // previously initialized.
    if (data?.icons) {
      for (let [k,v] of Object.entries(data.icons)) {
        if (v.results && v.results.length != v.bonus.value) {
          let results = [];
          for (let i = 0; i < v.bonus.value; i++) {
            results[i] = v.results[i] ?? 0
          }
          v.results = results;
        }
      }
    }

    // Handle one unique thing.
    if (!data.details.out.value && data?.out?.value) {
      if (data.out.value.length > 0) data.details.out.value = data.out.value;

      delete data.out;
    }

    // Fallbacks for potentially missing data
    // Coins
    if (!data.coins) data.coins = model.coins;
    // Weapons
    if (!data.attributes.weapon) data.attributes.weapon = model.attributes.weapon;
    if (!data.attributes.weapon.jab) data.attributes.weapon.jab = model.attributes.weapon.jab;
    if (!data.attributes.weapon.punch) data.attributes.weapon.punch = model.attributes.weapon.punch;
    if (!data.attributes.weapon.kick) data.attributes.weapon.kick = model.attributes.weapon.kick;
    // Weapon options
    if (data.attributes.weapon.melee.shield === undefined) data.attributes.weapon.melee.shield = model.attributes.weapon.melee.shield;
    if (data.attributes.weapon.melee.dualwield === undefined) data.attributes.weapon.melee.dualwield = model.attributes.weapon.melee.dualwield;
    if (data.attributes.weapon.melee.twohanded === undefined) data.attributes.weapon.melee.twohanded = model.attributes.weapon.melee.twohanded;
    // Resources
    if (!data.resources) data.resources = model.resources;
    if (!data.resources.perCombat) data.resources.perCombat = model.resources.perCombat;
    if (!data.resources.perCombat.momentum) data.resources.perCombat.momentum = model.resources.perCombat.momentum;
    if (!data.resources.perCombat.commandPoints) data.resources.perCombat.commandPoints = model.resources.perCombat.commandPoints;
    if (!data.resources.perCombat.focus) data.resources.perCombat.focus = model.resources.perCombat.focus;
    if (!data.resources.perCombat.bravado) data.resources.perCombat.bravado = model.resources.perCombat.bravado;
    if (!data.resources.spendable) data.resources.spendable = model.resources.spendable;
    if (!data.resources.spendable.ki) data.resources.spendable.ki = model.resources.spendable.ki;
    for (let idx of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]) {
      if (!(data.resources.spendable["custom"+idx])) data.resources.spendable["custom"+idx] = model.resources.spendable["custom"+idx];
      if (!data.resources.spendable["custom"+idx].rest) data.resources.spendable["custom"+idx].rest = model.resources.spendable["custom"+idx].rest;
    }
    // Saves
    if (!data.attributes.saves) data.attributes.saves = model.attributes.saves;
    if (!data.attributes.saves.deathFails) data.attributes.saves.deathFails = model.attributes.saves.deathFails;
    if (!data.attributes.saves.lastGaspFails) data.attributes.saves.lastGaspFails = model.attributes.saves.lastGaspFails;
    // Key Modifiers
    if (!data.attributes.keyModifier) data.attributes.keyModifier = model.attributes.keyModifier;
    if (!data.attributes.saves.bonus) data.attributes.saves.bonus = model.attributes.saves.bonus;
    if (!data.attributes.saves.disengageBonus) data.attributes.saves.disengageBonus = model.attributes.saves.disengageBonus;
    // Incrementals
    if (!('talent' in data.incrementals)) data.incrementals.talent = model.incrementals.talent;
    if ('feature' in data.incrementals) {
      data.incrementals.talent = foundry.utils.duplicate(data.incrementals.feature);
      delete data.incrementals.feature;
    }

    // Fix max death saves based on 2e.
    data.attributes.saves.deathFails.max = parseInt(data.attributes.saves.deathFails.maxOverride)
      || (game.settings.get('watersnake-grail-war', 'secondEdition') ? 5 : 4);
    // Update death save count.
    let deathCount = data.attributes.saves.deathFails.value;
    data.attributes.saves.deathFails.steps = game.settings.get('watersnake-grail-war', 'secondEdition') ? [false, false, false, false, false] : [false, false, false, false];
    for (let i = 0; i < deathCount; i++) {
      data.attributes.saves.deathFails.steps[i] = true;
    }

    // Update last gasp save count.
    let lastGaspsCount = data.attributes.saves.lastGaspFails.value;
    data.attributes.saves.lastGaspFails.steps = [false, false, false, false];
    for (let i = 0; i < lastGaspsCount; i++) {
      data.attributes.saves.lastGaspFails.steps[i] = true;
    }

    // Ability modifiers
    for (let abl of Object.values(data.abilities)) {
      // 상시 보정치(예장·마스터 패러미터 등)를 능력치 수치에 합산 → 실효 수치.
      // value는 매 prepare마다 _source(기본 숫자)로 초기화되므로 누적되지 않음.
      // (Effect의 ability AE는 'pre' 단계에서 이미 value에 반영돼 함께 합산됨)
      abl.flatBonus = Number(abl.flatBonus) || 0;
      abl.value = (Number(abl.value) || 0) + abl.flatBonus;
      abl.mod = Math.floor(abl.value / 3); // 홈브루 수정치 = floor(능력치/3): 3~5 E+1, 6~8 D+2, ... 21+ EX+7
      abl.lvl = abl.mod + data.attributes.level.value;
      abl.nonKey = {mod: foundry.utils.duplicate(abl.mod), lvlmod: foundry.utils.duplicate(abl.lvl)};
    }
    // Non nonKey modifiers are affected by the Key Modifier
    let keyMod = data.attributes.keyModifier;
    if (keyMod.mod1 && keyMod.mod2) {
      data.abilities[keyMod.mod1].mod = Math.min(data.abilities[keyMod.mod1].mod, data.abilities[keyMod.mod2].mod);
      data.abilities[keyMod.mod2].mod = Math.min(data.abilities[keyMod.mod1].mod, data.abilities[keyMod.mod2].mod);
      data.abilities[keyMod.mod1].lvl = Math.min(data.abilities[keyMod.mod1].lvl, data.abilities[keyMod.mod2].lvl);
      data.abilities[keyMod.mod2].lvl = Math.min(data.abilities[keyMod.mod1].lvl, data.abilities[keyMod.mod2].lvl);
    }

    // Bonuses
    var meleeAttackBonus = data.attributes.attack?.melee?.bonus ?? 0;
    var rangedAttackBonus = data.attributes.attack?.ranged?.bonus ?? 0;
    var divineAttackBonus = data.attributes.attack?.divine?.bonus ?? 0;
    var arcaneAttackBonus = data.attributes.attack?.arcane?.bonus ?? 0;

    var acBonus = 0;
    var mdBonus = 0;
    var pdBonus = 0;

    var hpBonus = 0;
    var recoveriesBonus = 0;

    var saveBonus = 0;
    var disengageBonus = 0;

    var rerollAcCurr = 0;
    var rerollAcMax = 0;
    var rerollSaveCurr = 0;
    var rerollSaveMax = 0;

    var strBonus = 0;
    var dexBonus = 0;
    var conBonus = 0;
    var intBonus = 0;
    var wisBonus = 0;
    var chaBonus = 0;

    function getBonusOr0(type) {
      if (type && type.bonus) return type.bonus;
      return 0;
    }

    if (this.items) {
      this.items.forEach(function(item) {
        if (item.type === 'equipment' && item.system.isActive) {
          meleeAttackBonus += getBonusOr0(item.system.attributes.attack.melee);
          rangedAttackBonus += getBonusOr0(item.system.attributes.attack.ranged);
          divineAttackBonus += getBonusOr0(item.system.attributes.attack.divine);
          arcaneAttackBonus += getBonusOr0(item.system.attributes.attack.arcane);

          acBonus += getBonusOr0(item.system.attributes.ac);
          mdBonus += getBonusOr0(item.system.attributes.md);
          pdBonus += getBonusOr0(item.system.attributes.pd);

          hpBonus += getBonusOr0(item.system.attributes.hp);
          recoveriesBonus += getBonusOr0(item.system.attributes.recoveries);

          // Enforce only one of this group
          if (rerollAcMax == 0) {
            rerollAcCurr += item.system.attributes.rerollAc.current ? item.system.attributes.rerollAc.current : 0;
            rerollAcMax += getBonusOr0(item.system.attributes.rerollAc);
          }
          if (rerollSaveMax == 0) {
            rerollSaveCurr += item.system.attributes.rerollSave.current ? item.system.attributes.rerollSave.current : 0;
            rerollSaveMax += getBonusOr0(item.system.attributes.rerollSave);
          }

          strBonus += getBonusOr0(item.system.attributes.str);
          dexBonus += getBonusOr0(item.system.attributes.agi);
          conBonus += getBonusOr0(item.system.attributes.end);
          intBonus += getBonusOr0(item.system.attributes.mgi);
          wisBonus += getBonusOr0(item.system.attributes.ins);
          chaBonus += getBonusOr0(item.system.attributes.lck);

          if (!item.system.attributes.save.threshold
            || data.attributes.hp.value <= item.system.attributes.save.threshold) {
            saveBonus += getBonusOr0(item.system.attributes.save);
          }
          disengageBonus += getBonusOr0(item.system.attributes.disengage);
        }
      });
    }

    data.attributes.attack = {
      melee: { bonus: meleeAttackBonus },
      ranged: { bonus: rangedAttackBonus },
      divine: { bonus: divineAttackBonus },
      arcane: { bonus: arcaneAttackBonus }
    };

    // Saves
    data.attributes.saves.bonus = saveBonus;
    data.attributes.saves.disengageBonus = disengageBonus;

    // 2e rerolls
    data.resources.spendable.rerolls.AC.current = rerollAcCurr;
    data.resources.spendable.rerolls.AC.max = rerollAcMax;
    data.resources.spendable.rerolls.save.current = rerollSaveCurr;
    data.resources.spendable.rerolls.save.max = rerollSaveMax;
    data.resources.spendable.rerolls.enabled = (rerollAcMax + rerollSaveMax) > 0 ? true : false;

    // Ability score bonuses from items
    data.abilities.str.bonus = strBonus;
    data.abilities.agi.bonus = dexBonus;
    data.abilities.end.bonus = conBonus;
    data.abilities.mgi.bonus = intBonus;
    data.abilities.ins.bonus = wisBonus;
    data.abilities.lck.bonus = chaBonus;

    // 성배전쟁 방어 (신방=pd, 정방=md). 능력치 매핑: 근력str/내구con/민첩dex/마력int/행운cha/통찰wis
    const isMaster = this.type === 'master';
    const sv = (a) => Number(data.abilities[a]?.value) || 0;   // 능력치 수치
    const sm = (a) => Math.floor(sv(a) / 3);                   // 수정치 = floor(수치/3)
    const grade = Number(data.attributes.grade?.value) || 0;   // 영령의 급

    // 클래스 분류: 삼기사(three) / 사술사(sorcery)
    const threeKnights = ['saber', 'lancer', 'archer'];
    const sorceryClasses = ['rider', 'caster', 'assassin', 'berserker'];
    const classKey = data.details.servantClass?.value || '';
    const defOverride = data.details.defenseType?.value || 'auto';
    let defCategory;
    if (defOverride === 'three') defCategory = 'three';
    else if (defOverride === 'sorcery') defCategory = 'sorcery';
    else if (threeKnights.includes(classKey)) defCategory = 'three';
    else if (sorceryClasses.includes(classKey)) defCategory = 'sorcery';
    else defCategory = 'sorcery'; // 엑스트라 등 미지정 시 기본값 (방어분류 override로 조정)

    // 신방 능력치: 자동(내구·민첩 중 큰 값) 또는 선택
    const pdAblPref = data.attributes.pd.defenseAbility || 'auto';
    let pdAblMod;
    if (pdAblPref === 'end') pdAblMod = sm('end');
    else if (pdAblPref === 'agi') pdAblMod = sm('agi');
    else pdAblMod = Math.max(sm('end'), sm('agi'));
    // 다운 상태: 신체방어 한정 능력치 수정치를 E(3)=+1로 취급(능력치 자체는 안 깎음).
    // pd가 능력치 mod에서 동적 계산돼 static AE로 표현 불가 → 코드 특수처리.
    if (this.effects?.some?.(e => !e.disabled && e.statuses?.has?.('down'))) {
      pdAblMod = Math.min(pdAblMod, 1);
    }

    // 신방 (자동 시): 서번트 = (삼기사14/사술사12) + 급 + (내구·민첩 수정치) / 마스터 = 10 + (내구·민첩 수정치)
    if (data.attributes.pd.automatic ?? true) {
      const pdBase = isMaster ? 10 : ((defCategory === 'three' ? 14 : 12) + grade);
      data.attributes.pd.value = pdBase + pdAblMod + Number(pdBonus);
    }
    // 정방 (자동 시): 서번트 = (삼기사10/사술사12) + 통찰 수정치 / 마스터 = 8 + 통찰 수정치
    if (data.attributes.md.automatic ?? true) {
      const mdBase = isMaster ? 8 : (defCategory === 'three' ? 10 : 12);
      data.attributes.md.value = mdBase + sm('ins') + Number(mdBonus);
    }
    // AC는 성배전쟁에서 미사용 (호환용으로 base 유지)
    data.attributes.ac.value = Number(data.attributes.ac.base) + Number(acBonus);

    // Damage Modifiers
    data.tier = 1;
    if (data.attributes.level.value >= 5) data.tier = 2;
    if (data.attributes.level.value >= 8) data.tier = 3;
    if (data.incrementals?.abilMultiplier && game.settings.get("watersnake-grail-war", "secondEdition")) {
      data.tierMult = CONFIG.HOLYGRAILWAR.tierMultPerLevel[data.attributes.level.value+1];
    }

    for (let prop in data.abilities) {
      data.abilities[prop].dmg = data.tierMult * data.abilities[prop].mod;
      data.abilities[prop].nonKey.dmg = data.tierMult * data.abilities[prop].nonKey.mod;
    }

    // HP (성배전쟁): 서번트 = 근력 + 내구×3 / 마스터 = (근력 + 내구×3) ÷ 2
    if (data.attributes.hp.automatic) {
      let hpBaseVal = sv('str') + sv('end') * 3;
      if (isMaster) hpBaseVal = Math.floor(hpBaseVal / 2);
      data.attributes.hp.max = hpBaseVal + Number(hpBonus) + Number(data.attributes.hp.extra);
    }

    // MP (성배전쟁): 마력<12 = 12+마력(서)/6+마력(마) / 마력≥12 = 마력×2(서)/마력×1.5(마)
    if (data.attributes.mp.automatic ?? true) {
      const mag = sv('mgi');
      let mpMax;
      if (mag < 12) mpMax = isMaster ? 6 + mag : 12 + mag;
      else mpMax = isMaster ? Math.floor(mag * 1.5) : mag * 2;
      data.attributes.mp.max = mpMax;
    }

    // SP (성배전쟁): 서번트 전용 자동. 마스터는 수동(기본 0).
    if (!isMaster && (data.attributes.sp.automatic ?? true)) {
      const spStr = sv('str'), spDex = sv('agi'), spCon = sv('end'), spMag = sv('mgi');
      let spVal;
      switch (data.attributes.sp.formula) {
        case 'con': spVal = spCon; break;            // 내구 (=(내구+내구)÷2)
        case 'magdex': spVal = (spMag + spDex) / 2; break; // 마술: (마력+민첩)÷2
        case 'strmag': spVal = (spStr + spMag) / 2; break; // 마술: (근력+마력)÷2
        case 'magcon': spVal = (spMag + spCon) / 2; break; // 마술: (마력+내구)÷2 (내구 한쪽 대체)
        default: spVal = (spStr + spDex) / 2;        // strdex: (근력+민첩)÷2
      }
      data.attributes.sp.max = Math.floor(spVal);
    }

    // Recoveries
    if (data.attributes.recoveries.automatic) {
      data.attributes.recoveries.max = data.attributes.recoveries.base;
      if (!game.settings.get("watersnake-grail-war", "secondEdition")) data.attributes.recoveries.max += recoveriesBonus;
    }
    // Calculate recovery formula and average.
    let recLevel = Number(data.attributes.level?.value);
    // This was a 2e playtest option that didn't make the cut
    // if (data.incrementals?.recovery && game.settings.get("watersnake-grail-war", "secondEdition")) recLevel += 1;
    let recoveryDice = CONFIG.HOLYGRAILWAR.numDicePerLevel[recLevel];
    let recoveryDie = ["d8", "", "8"]; // Fall back
    let recoveryAvg = 4.5; // Fall back
    if (typeof data.attributes?.recoveries?.dice == 'string') {
      let recDieRegExp = /^([0-9]*)d([0-9]+)/g;
      let parsed = recDieRegExp.exec(data.attributes.recoveries.dice);
      if (parsed) {
        recoveryDie = parsed;
        recoveryAvg = ((Number(recoveryDie[2]) + 1) / 2) * (Number(recoveryDie[1]) || 1);
      }
    }
    let formulaDice = (recoveryDice * (Number(recoveryDie[1]) || 1)).toString() + "d" + recoveryDie[2];
    let formulaConst = data.abilities.end.nonKey.dmg;
    recoveryAvg = Math.round(recoveryDice * recoveryAvg);

    if (flags.archmage?.strongRecovery) {
      // Handle Strong Recovery special case
      if (game.settings.get("watersnake-grail-war", "secondEdition")) {
        formulaConst += CONFIG.HOLYGRAILWAR.tierMultPerLevel[data.attributes.level.value] * 3;
      } else {
        formulaDice = ((recoveryDice + data.tier) * (Number(recoveryDie[1]) || 1)).toString() + "d" + recoveryDie[2];
        formulaDice += "k" + (recoveryDice * (Number(recoveryDie[1]) || 1)).toString();
        // E[2dxkh] = (x + 1) (4x - 1) / 6x ~= 2x/3
        recoveryAvg = (data.tier * (Number(recoveryDie[1]) || 1)) * (Number(recoveryDie[2]) + 1)
          * (4 * Number(recoveryDie[2]) - 1) / (6 * Number(recoveryDie[2])) + (recoveryDice - data.tier) * recoveryAvg;
      }
    }

    if (game.settings.get("watersnake-grail-war", "secondEdition")) {
      // Item recovery bonus is applied here, per level
      formulaConst += recoveriesBonus * Number(data.attributes.level?.value);
      // If we are high level, also add static extra as per the beta rules
      formulaConst += Math.max(0, 5 * (recLevel - 7));
    }
    data.attributes.recoveries.avg = Math.round(recoveryAvg + formulaConst);
    data.attributes.recoveries.formula = formulaDice + "+" + formulaConst.toString();
  }

  /* -------------------------------------------- */

  /**
   * Prepare NPC type specific data
   * @param data
   *
   * @return {undefined}
   */
  _prepareNPCData(data, model, flags) {
    // init.mod is used for rolls, while value is used on the sheet.
    data.attributes.init.mod = data.attributes.init.value;
  }

  /** @inheritdoc */
  getRollData(item, { skipPrepare = false } = {}) {
    // Use the actor by default.
    let actor = this;

    // Use the current token if possible.
    let token = canvas.tokens?.controlled?.find(t => t.actor._id == this._id);
    if (token) actor = token.actor;

    // Reapply post active effects.
    // (시트 렌더 경로에서는 직전에 prepareData가 끝나 있어 생략 — 입력 반영 지연 개선)
    if (!skipPrepare) this.prepareDerivedData();

    // Retrieve the actor data.
    const origData = super.getRollData();
    const data = foundry.utils.deepClone(origData);

    // Prepare a copy of the weapon model for old chat messages with undefined weapon attacks.
    const model = (game?.system?.model || game?.data?.model).Actor.character.attributes.weapon;

    // Re-map all attributes onto the base roll data
    let newData = foundry.utils.mergeObject(data.attributes, data.abilities);
    delete data.init;
    for (let [k, v] of Object.entries(newData)) {
      switch (k) {
        case 'escalation': {
          // 고조 주사위 상한: 서번트 ≤ 영령의 급 / 마스터 = 고조÷3(내림)
          const edRaw = Number(v.value) || 0;
          if (actor.type === 'master') data.ed = Math.floor(edRaw / 3);
          else data.ed = Math.min(edRaw, Number(data.attributes?.grade?.value) || 0);
          break;
        }

        case 'init':
          data.init = v.mod;
          break;

        case 'level':
          data.lvl = v.value;
          data.lvldice = CONFIG.HOLYGRAILWAR.numDicePerLevel[v.value];
          break;

        case 'grade':
          data.grade = v.value;
          break;

        case 'weapon':
          if (actor.type != 'character' && actor.type != 'master') continue;
          // Weapon dice
          for (let wpn of ["melee", "ranged", "jab", "punch", "kick"]) {
            data.attributes.weapon[wpn].value = `${CONFIG.HOLYGRAILWAR.numDicePerLevel[data.attributes.level.value]}${data.attributes.weapon[wpn].dice}`;
          }
          data.wpn = {
            m: v?.melee ?? model.melee,
            r: v?.ranged ?? model.ranged,
            j: v?.jab ?? model.jab,
            p: v?.punch ?? model.punch,
            k: v?.kick ?? model.kick
          };

          // Clean up weapon properties.
          let wpnTypes = ['m', 'r', 'j', 'p', 'k'];
          wpnTypes.forEach(wpn => {
            if (data.wpn[wpn].dice) {
              data.wpn[wpn].die = data.wpn[wpn].dice;
              data.wpn[wpn].dieNum = Number(data.wpn[wpn].dice.match(/d(\d+).*/)[1]);
            }
            data.wpn[wpn].dice = data.wpn[wpn].value;
            data.wpn[wpn].diceSml = data.wpn[wpn].dice.replace(/d\d+/, `d${Math.max(data.wpn[wpn].dieNum - 2, 3)}`);  // Min dice d3
            data.wpn[wpn].diceLrg = data.wpn[wpn].dice.replace(/d\d+/, `d${data.wpn[wpn].dieNum + 2}`); // TODO: handle d12->2d6? (Nothing needs it in core)
            // data.wpn[wpn].atk = data.wpn[wpn].attack;
            // data.wpn[wpn].dmg = data.wpn[wpn].dmg;
            delete data.wpn[wpn].value;
            delete data.wpn[wpn].attack;
          });

          // In 2e add extra at epic tier
          if (game.settings.get("watersnake-grail-war", "secondEdition")) {
            data.wpn.epicBonus = Math.max(0, 5 * (actor.system.attributes.level.value - 7));
            if (data.wpn.epicBonus) {
              wpnTypes.forEach(wpn => {
                data.wpn[wpn].dice += `+${data.wpn.epicBonus}`;
                data.wpn[wpn].diceSml += `+${data.wpn.epicBonus}`;
                data.wpn[wpn].diceLrg += `+${data.wpn.epicBonus}`;
              });
            }
          }

          break;

        case 'attack':
          data.atk = foundry.utils.mergeObject((data.atk || {}), {
            m: v.melee,
            r: v.ranged,
            a: v.arcane,
            d: v.divine,
          });
          break;

        case 'attackMod':
          data.atk = foundry.utils.mergeObject((data.atk || {}), {
            mod: v.value
          });
          break;

        case 'standardBonuses':
          data.std = v.value;
          break;

        case 'saves':
          if (this.type === "character" || this.type === "master") data.skulls = v.deathFails.value || 0;
          if (!(k in data)) data[k] = v;
          break;

        default:
          if (!(k in data)) data[k] = v;
          break;
      }
    }

    // Animal companion data
    let anLvl = actor.system.attributes.level.value;
    if (item?.system.powerLevel?.value !== undefined) anLvl = item.system.powerLevel.value;
    data.animalCompanion = {
      'atk': CONFIG.HOLYGRAILWAR.animalCompanion.attack[anLvl],
      'dmg': CONFIG.HOLYGRAILWAR.animalCompanion.damage[anLvl]
    }

    // Old syntax shorthand.
    data.attr = data.attributes;
    data.abil = data.abilities;

    // Process resource shorthands and custom resource names
    if (this.type === "character" || this.type === "master"){
      data.rsc = {
        cps: data.resources.perCombat.commandPoints.current,
        focus: data.resources.perCombat.focus.current,
        momentum: data.resources.perCombat.momentum.current,
        ki: data.resources.spendable.ki.current,
        kimax: data.resources.spendable.ki.max
      };
      for (let [k, v] of Object.entries(data.resources.spendable)) {
        if (k == "ki") continue;
        if (v.enabled && v.label) {
          let label = v.label.toLowerCase().replace(/[^a-zA-z\d]/g, '');
          data.rsc[label] = v.current;
          data.rsc[label+"max"] = v.max;
        }
      }
    }

    // Handle stoke.
    if (this.type === "npc") {
      data.rsc = {
        stoke: data.resources?.spendable?.stoke?.enabled
          ? (data.resources?.spendable?.stoke?.current || 0)
          : 0,
      };
    }

    if (item?.system.powerLevel?.value) {
      data.pwrlvl = item.system.powerLevel.value;
    }

    return data;
  }

  getInitiativeFormula() {
    const init = this.system.attributes.init.mod;
    // Init mod includes dex + level + misc bonuses.
    const parts = ["1d20", init];
    if (this.getFlag("watersnake-grail-war", "initiativeAdv")) parts[0] = "2d20kh";
    if (game.settings.get("watersnake-grail-war", "initiativeStaticNpc") &&  this.type == 'npc') parts[0] = "10";
    if (CONFIG.Combat.initiative.tiebreaker) parts.push(init / 100);
    else parts.push((this.type === 'npc' ? 0.01 : 0));
    return parts.filter(p => p !== null).join(" + ");
  }

  async rollSave(difficulty, target=11) {
    // Determine target dc
    if (difficulty == 'easy') target = 6;
    else if (['hard', 'death', 'lastGasp'].includes(difficulty)) target = 16;

    let formula = 'd20';
    // Add bonuses, if any
    let bonus = this.system.attributes.saves.bonus;
    if (bonus != 0) formula = formula + "+" + bonus.toString();
    let roll = new Roll(formula);
    let result = await roll.roll();

    // Create the chat message title.
    let label = game.i18n.localize(`ARCHMAGE.SAVE.${difficulty}`);

    // Determine the roll result.
    let rollResult = result.total;
    let success = rollResult >= target;

    // Basic template rendering data
    const template = `systems/watersnake-grail-war/templates/chat/save-card.html`;
    const token = this.token;

    // Basic chat message data
    const chatData = {
      user: game.user.id,
      roll: roll, // TODO: fix template to use rolls prop
      rolls: [roll],
      speaker: game.holygrailwar.ArchmageUtility.getSpeaker(this)
    };

    const templateData = {
      actor: this,
      tokenId: token ? `${token.id}` : null,
      saveType: label,
      success: success,
      data: chatData,
      target
    };

    // Render the template
    chatData["content"] = await foundry.applications.handlebars.renderTemplate(template, templateData);
    await game.holygrailwar.ArchmageUtility.createChatMessage(chatData);

    // Handle recoveries or failures on death saves.
    if (difficulty == 'death') {
      if (success) {
        if (this.system.attributes.hp.value <= 0) this.rollRecovery({}, true);
      } else {
        await this.update({'system.attributes.saves.deathFails.value': Math.min(Number(this.system.attributes.saves.deathFails.max), Number(this.system.attributes.saves.deathFails.value) + 1)});
        // Handle desperate recharge
        await this.rechargeDesperate();
      }
    }

    // Handle failures of last gasp saves.
    if (difficulty == 'lastGasp' && !success) {
      await this.update({
        'system.attributes.saves.lastGaspFails.value': Math.min(4, Number(this.system.attributes.saves.lastGaspFails.value) + 1)
      });
      // If this is the first failed last gasps save, add helpless
      let filtered = this.effects.filter(x => x.name === game.i18n.localize("ARCHMAGE.EFFECT.StatusHelpless"));
      if (filtered.length == 0 && this.system.attributes.saves.lastGaspFails.value == 1) {
        let effectData = CONFIG.statusEffects.find(x => x.id == "helpless");
        let createData = foundry.utils.deepClone(effectData);
        createData.name = game.i18n.localize(effectData.name);
        createData["flags.core.statusId"] = effectData.id;
        delete createData.id;
        const cls = getDocumentClass("ActiveEffect");
        await cls.create(createData, {parent: this});
      }
    } else if (difficulty == 'lastGasp' && success) {
      // Condition shaken off, clear all last gasp saves
      await this.update({ 'system.attributes.saves.lastGaspFails.value': 0 });
    }
  }

  async rollDisengage() {
    const target = 6;

    let terms = ['d20'];
    // Add bonuses, if any
    let bonus = this.system.attributes.saves.disengageBonus; // From items
    bonus += (this.system.attributes?.disengageBonus || 0); // From sheet
    if (bonus != 0) terms.push(bonus.toString());

    const dialogOptions = {width: 520};
    let situational = 0;
    let data = {};

    // Create the chat message title.
    let title = game.i18n.localize('ARCHMAGE.CHAT.disengage');

    // Inner roll function
    let rollMode = game.settings.get("core", "rollMode");
    let rolled = false;
    let roll = async (html = null, data = {}) => {
      // Don't include situational bonus unless it is defined
      if (!data.bonus && terms.indexOf('@bonus') !== -1) {
        terms.pop();
      }

      if (situational != 0) {
        terms.push(situational);
      }

      let form = html ? html.find('form')[0] : null;
      rollMode = form ? form.rollMode.value : rollMode;

      // Execute the roll
      let roll = new Roll(terms.join('+'), data);
      await roll.evaluate();

      // Determine the roll result.
      let rollResult = roll.total;
      let success = rollResult >= target;

      // Grab the template.
      const template = `systems/watersnake-grail-war/templates/chat/save-card.html`;
      const token = this.token;

      // Prepare chat data for the template.
      const chatData = {
        user: game.user.id,
        roll: roll, // TODO: fix template to use rolls prop
        rolls: [roll],
        speaker: game.holygrailwar.ArchmageUtility.getSpeaker(this)
      };

      // Prepare template data.
      const templateData = {
        actor: this,
        tokenId: token ? `${token.id}` : null,
        saveType: title,
        success: success,
        data: chatData,
        target
      };

      // Render the template.
      foundry.applications.handlebars.renderTemplate(template, templateData).then(content => {
        chatData.content = content;
        game.holygrailwar.ArchmageUtility.createChatMessage(chatData, { rollMode: rollMode });
      });
    };

    // Modify the roll and handle fast-forwarding
    if (event?.shiftKey) return roll(null, data);
    else terms = terms.concat(['@bonus']);

    // Render modal dialog
    const template = 'systems/watersnake-grail-war/templates/chat/roll-dialog.html';
    let dialogData = {
      formula: terms.join(' + '),
      data: data,
      defaultRollMode: rollMode,
      rollModes: CONFIG.Dice.rollModes
    };

    foundry.applications.handlebars.renderTemplate(template, dialogData).then(dlg => {
      new Dialog({
        title: title,
        content: dlg,
        buttons: {
          bon2: {
            label: '+2',
            callback: () => {
              situational = 2;
              rolled = true;
            }
          },
          bon1: {
            label: '+1',
            callback: () => {
              situational = 1;
              rolled = true;
            }
          },
          normal: {
            label: game.i18n.localize("ARCHMAGE.rollNormal"),
            callback: () => {
              rolled = true;
            }
          },
          pen1: {
            label: '-1',
            callback: () => {
              situational = -1;
              rolled = true;
            }
          },
          pen2: {
            label: '-2',
            callback: () => {
              situational = -2;
              rolled = true;
            }
          },
          pen3: {
            label: '-3',
            callback: () => {
              situational = -3;
              rolled = true;
            }
          },
          pen4: {
            label: '-4',
            callback: () => {
              situational = -4;
              rolled = true;
            }
          },
          pen5: {
            label: '-5',
            callback: () => {
              situational = -5;
              rolled = true;
            }
          },
          pen6: {
            label: '-6',
            callback: () => {
              situational = -6;
              rolled = true;
            }
          },
          pen7: {
            label: '-7',
            callback: () => {
              situational = -7;
              rolled = true;
            }
          },
          pen8: {
            label: '-8',
            callback: () => {
              situational = -8;
              rolled = true;
            }
          },
          pen9: {
            label: '-9',
            callback: () => {
              situational = -9;
              rolled = true;
            }
          },
        },
        default: 'normal',
        close: html => {
          if (rolled) {
            rollMode = html.find('[name="rollMode"]').val();
            data['bonus'] = html.find('[name="bonus"]').val();
            roll(html, data);
          }
        }
      }, dialogOptions).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * Recovery roll dialog.
   *
   * @return {undefined}
   */
  rollRecoveryDialog(event) {
    let rolled = false;
    let avg = this.getFlag('watersnake-grail-war', 'averageRecoveries');
    let data = {bonus: "", average: avg, createMessage: true};

    if (event?.shiftKey) {
      this.rollRecovery(data);
      return;
    }

    // Render modal dialog
    let template = 'systems/watersnake-grail-war/templates/chat/recovery-dialog.html';
    let dialogData = {avg: avg ? "checked" : ""};
    let epicBonus = game.settings.get("watersnake-grail-war", "secondEdition") ? "+4d8" : "+3d8";
    let epicMax = game.settings.get("watersnake-grail-war", "secondEdition") ? 0 : 100;
    let dialogStruct = {
        title: game.i18n.localize("ARCHMAGE.recoveryRoll"),
        buttons: {
          normal: {
            label: game.i18n.localize("ARCHMAGE.recoveryNormal"),
            callback: () => {
              rolled = true;
            }
          },
          free: {
            label: game.i18n.localize("ARCHMAGE.recoveryFree"),
            callback: () => {
              data.label = game.i18n.localize("ARCHMAGE.recoveryFreeChat");
              data.free = true;
              rolled = true;
            }
          },
          pot1: {
            label: game.i18n.localize("ARCHMAGE.recoveryAdventurer"),
            callback: () => {
              data.label = game.i18n.localize("ARCHMAGE.recoveryAdventurerFull");
              data.bonus = "+1d8";
              data.max = 30;
              rolled = true;
            }
          },
          pot2: {
            label: game.i18n.localize("ARCHMAGE.recoveryChampion"),
            callback: () => {
              data.label = game.i18n.localize("ARCHMAGE.recoveryChampionFull");
              data.bonus = "+2d8";
              data.max = 60;
              rolled = true;
            }
          },
          pot3: {
            label: game.i18n.localize("ARCHMAGE.recoveryEpic"),
            callback: () => {
              data.label = game.i18n.localize("ARCHMAGE.recoveryEpicFull");
              data.bonus = epicBonus;
              data.max = epicMax;
              rolled = true;
            }
          },
        },
        default: 'normal',
        close: html => {
          if (rolled) {
            data.bonus += html.find('[name="bonus"]').val();
            data.apply = html.find('[name="apply"]').is(':checked');
            data.average = html.find('[name="average"]').is(':checked');
            this.setFlag('watersnake-grail-war', 'averageRecoveries', data.average);
            this.rollRecovery(data);
          }
        }
      };
    if (!game.settings.get("watersnake-grail-war", "secondEdition")) {
      dialogStruct.buttons.pot4 = {
        label: game.i18n.localize("ARCHMAGE.recoveryIconic"),
        callback: () => {
          data.label = game.i18n.localize("ARCHMAGE.recoveryIconicFull");
          data.bonus = "+4d8";
          data.max = 130;
          rolled = true;
        }
      }
    }
    foundry.applications.handlebars.renderTemplate(template, dialogData).then(dlg => {
      dialogStruct.content = dlg;
      new Dialog(dialogStruct).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * Recovery roll.
   * @param data object{bonus: "+X", max: 0, free: false, label: "", apply: true}
   * @param print boolean
   *
   * @return {Roll} The rolled roll for the recovery
   */
  async rollRecovery(data) {
    data.bonus = (data.bonus !== undefined) ? data.bonus : "";
    data.max = (data.max !== undefined) ? data.max : 0;
    data.free = (data.free !== undefined) ? data.free : false;
    if (data.label !== undefined) {
      data.label = game.i18n.format("ARCHMAGE.recoveryChatTitle",
        { recovery: data.label });
    } else {
      data.label = game.i18n.localize("ARCHMAGE.recovery");
    }
    data.apply = (data.apply !== undefined) ? data.apply : true;
    data.average = (data.average !== undefined) ? data.average : this.getFlag('watersnake-grail-war', 'averageRecoveries');
    data.createMessage = (data.createMessage !== undefined) ? data.createMessage : false;
    let totalRecoveries = this.system.attributes.recoveries.value;
    if (Number(totalRecoveries) <= 0 && !data.free) {
      data.label = game.i18n.format("ARCHMAGE.recoveryChatTitleHalf",
        { recovery: data.label });
    }

    let formula = this.system.attributes.recoveries.formula;
    if (data.average) {
      formula = this.system.attributes.recoveries.avg.toString();
    }

    // Add bonus if any
    if (data.bonus !== "") {
      if (isNaN(parseInt(data.bonus))) {
        ui.notifications.error('"'+data.bonus+'" '+game.i18n.localize("ARCHMAGE.UI.errNotInteger"));
        return;
      }
      formula = `${formula}+${data.bonus}`;
    }

    // Half healing for recoveries we do NOT have
    if (Number(totalRecoveries) <= 0 && !data.free) {
      formula = `floor((${formula})/2)`;
    }

    // If max is set, handle it
    if (data.max > 0) {
      formula = `min((${formula}), ${data.max})`;
    }

    let roll = new Roll(`${formula}`);
    let chatData = null;
    let msg = null;

    if (data.createMessage) {
      // Basic template rendering data
      const template = "systems/watersnake-grail-war/templates/chat/recovery-card.html"
      const templateData = {actor: this, label: data.label, formula: formula};
      // Basic chat message data
      chatData = {
        user: game.user.id,
        speaker: game.holygrailwar.ArchmageUtility.getSpeaker(this)
      };

      // Render the template
      chatData.content = await foundry.applications.handlebars.renderTemplate(template, templateData);
      chatData.content = await foundry.applications.ux.TextEditor.implementation.enrichHTML(chatData.content, { rollData: this.getRollData() });
      // Create the chat message
      msg = await game.holygrailwar.ArchmageUtility.createChatMessage(chatData);
      // Get the roll from the chat message
      let contentHtml = $(msg.content);
      let row = $(contentHtml.find('.card-prop')[0]);
      let roll_html = $(row.find('.inline-result'));
      roll = Roll.fromJSON(unescape(roll_html.data('roll')));
    } else {
      // Perform the roll ourselves
      await roll.roll();
    }

    // If 3d dice are enabled, handle them
    if (game.dice3d &&
        (!game.settings.get("dice-so-nice", "animateInlineRoll") || !data.createMessage)) {
      await game.holygrailwar.ArchmageUtility.show3DDiceForRoll(roll, chatData, msg?.id);
    }

    let newHp = this.system.attributes.hp.value;
    let newRec = this.system.attributes.recoveries.value;
    if (!data.free) {newRec -= 1;}
    if (data.apply) {
      // Starting from 0 if at negative hp is handled in the actor update hook
      newHp = Math.min(this.system.attributes.hp.max, Math.max(0, newHp) + roll.total);
    }

    // Handle desperate recharge
    if (newRec <= 0 && this.system.attributes.recoveries.value >= 1) this.rechargeDesperate();

    await this.update({
      'system.attributes.recoveries.value': newRec,
      'system.attributes.hp.value': newHp
    });

    return {roll: roll, total: roll.total};
  }

  async restQuick() {
    let templateData = {
      actor: this,
      gainedHp: 0,
      usedRecoveries: 0,
      resources: [],
      items: []
    };
    let updateData = {};
    let rollsToAnimate = [];

    // Recoveries & hp
    let baseHp = Math.max(this.system.attributes.hp.value, 0);
    while (baseHp + templateData.gainedHp < this.system.attributes.hp.max/2) {
      // Roll recoveries until we are above staggered
      let rec = await this.rollRecovery({apply: false});
      templateData.gainedHp += rec.total;
      templateData.usedRecoveries += 1;
    }
    updateData['system.attributes.hp.value'] = Math.min(this.system.attributes.hp.max, Math.max(this.system.attributes.hp.value, 0) + templateData.gainedHp);

    // Death saves.
    if (this.system.attributes.saves.deathFails.value > 0
      && this.system.attributes.saves.deathFails.value < this.system.attributes.saves.deathFails.max) {
      if (game.settings.get('watersnake-grail-war', 'secondEdition')
        && this.system.attributes.saves.deathFails.value >= 1) {
        updateData['system.attributes.saves.deathFails.value'] = 1;
      }
      else updateData['system.attributes.saves.deathFails.value'] = 0;
    }

    // Resources
    // Bravado, Focus, Momentum and Command Points
    for (let k of Object.keys(this.system.resources.perCombat)) {
      if ( this.system.resources.perCombat[k].default )
        updateData[`system.resources.perCombat.${k}.current`] = this.system.resources.perCombat[k].default;
      else
        updateData[`system.resources.perCombat.${k}.current`] = 0;
    }
    // Custom resources
    for (let idx of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]) {
      let resourcePathName = "custom"+idx;
      let resourceName = this.system.resources.spendable[resourcePathName].label;
      let curr = this.system.resources.spendable[resourcePathName].current;
      if (this.system.resources.spendable[resourcePathName].enabled
        && this.system.resources.spendable[resourcePathName].rest != "none") {
        let max = this.system.resources.spendable[resourcePathName].max;
        let path = `system.resources.spendable.${resourcePathName}.current`;
        if (this.system.resources.spendable[resourcePathName].rest == "quick"
          && max && curr < max) {
          updateData[path] = max;
        }
        else if (this.system.resources.spendable[resourcePathName].rest == "quickreset"
          && curr > 0) {
          updateData[path] = 0;
        }
        if (updateData[path] !== undefined) {
          templateData.resources.push({
            key: resourceName,
            message: `${game.i18n.localize("ARCHMAGE.CHAT.KiReset")} ${updateData[path]}`
          });
        }
      }
    }

    // Update actor at this point (items are updated separately)
    if ( !foundry.utils.isEmpty(updateData) ) {
      await this.update(updateData);
    }

    // Items
    let items = this.items.map(i => i);
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      let itemUpdateData = {};
      let maxQuantity = item.system?.maxQuantity?.value ?? 1;
      if ((item.type == "power" || item.type == "equipment") && maxQuantity) {
        // Recharge powers.
        let rechAttempts = maxQuantity - item.system.quantity.value;
        let rechValue = Number(item.system.recharge.value) || 16;
        if (game.settings.get('watersnake-grail-war', 'rechargeOncePerDay')) {
          rechAttempts = Math.max(rechAttempts - item.system.rechargeAttempts.value, 0)
        }
        // Per battle powers.
        if ((item.system.powerUsage?.value == 'once-per-battle'
          || item.system.powerUsage?.value == 'cyclic'
          || (item.system.powerUsage?.value == 'at-will'
          && item.system.quantity.value != null))
          && item.system.quantity.value < maxQuantity) {
          itemUpdateData['system.quantity'] = {value: maxQuantity}
          templateData.items.push({
            key: item.name,
            message: `${game.i18n.localize("ARCHMAGE.CHAT.ItemReset")} ${maxQuantity}`
          });
        }
        else if (['recharge', 'recharge-desperate'].includes(item.system.powerUsage?.value) && rechAttempts > 0) {
          // This captures other as well
          let successes = 0;
          for (let j = 0; j < rechAttempts; j++) {
            let roll = await this.items.get(item.id).recharge({createMessage: false});
            rollsToAnimate.push(roll.roll);
            if (roll.total >= rechValue) {
              successes++;
              templateData.items.push({
                key: item.name,
                message: `${game.i18n.localize("ARCHMAGE.CHAT.RechargeSucc")} (${roll.total} >= ${rechValue})`
              });
            } else {
              templateData.items.push({
                key: item.name,
                message: `${game.i18n.localize("ARCHMAGE.CHAT.RechargeFail")} (${roll.total} < ${rechValue})`
              });
            }
          }
        }
      }
      // Feats
      if (item.type == "power" && item.system.feats) {
        for (let index of Object.keys(item.system.feats)) {
          let feat = item.system.feats[index];
          if (!feat.isActive?.value) continue;
          let maxQuantity = feat.maxQuantity?.value;
          if (feat.powerUsage?.value == 'once-per-battle' && maxQuantity && feat.quantity?.value < maxQuantity) {
            itemUpdateData[`system.feats.${index}.quantity.value`] = maxQuantity;
            let tier = game.i18n.localize(`ARCHMAGE.CHAT.${feat.tier.value}`);
            templateData.items.push({
              key: `${item.name} - ${tier}`,
              message: `${game.i18n.localize("ARCHMAGE.CHAT.ItemReset")} ${maxQuantity}`
            });
          }
        }
      }
      // Update item
      if ( !foundry.utils.isEmpty(itemUpdateData) ) await item.update(itemUpdateData);
    };

    // Print outcomes to chat
    const template = `systems/watersnake-grail-war/templates/chat/rest-short-card.html`
    const chatData = {
      user: game.user.id,
      speaker: game.holygrailwar.ArchmageUtility.getSpeaker(this)
    };
    chatData["content"] = await foundry.applications.handlebars.renderTemplate(template, templateData);
    // If 3d dice are enabled, handle them
    if (game.dice3d) {
      for (let roll of rollsToAnimate) {
        await game.holygrailwar.ArchmageUtility.show3DDiceForRoll(roll, chatData);
      }
    }
    game.holygrailwar.ArchmageUtility.createChatMessage(chatData);
  }

  async restFull() {
    let templateData = {
      actor: this,
      resources: [],
      items: []
    };
    let updateData = {}

    // Recoveries & hp
    updateData['system.attributes.recoveries.value'] = this.system.attributes.recoveries.max;
    updateData['system.attributes.hp.value'] = this.system.attributes.hp.max;
    updateData['system.attributes.saves.deathFails.value'] = 0;
    updateData['system.attributes.saves.lastGaspFails.value'] = 0;

    // Resources
    // Ki
    if (this.system.resources.spendable.ki.enabled
      && this.system.resources.spendable.ki.current < this.system.resources.spendable.ki.max) {
      updateData['system.resources.spendable.ki.current'] = this.system.resources.spendable.ki.max;
      templateData.resources.push({
        key: game.i18n.localize("ARCHMAGE.CHARACTER.RESOURCES.ki"),
        message: `${game.i18n.localize("ARCHMAGE.CHAT.KiReset")} ${this.system.resources.spendable.ki.max}`
      });
    }
    // Bravado, Focus, Momentum and Command Points
    for (let k of Object.keys(this.system.resources.perCombat)) {
      if ( this.system.resources.perCombat[k].default )
        updateData[`system.resources.perCombat.${k}.current`] = this.system.resources.perCombat[k].default;
      else
        updateData[`system.resources.perCombat.${k}.current`] = 0;
    }
    // Custom Resources
    for (let idx of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]) {
      let resourcePathName = "custom"+idx;
      let resourceName = this.system.resources.spendable[resourcePathName].label;
      let curr = this.system.resources.spendable[resourcePathName].current;
      if (this.system.resources.spendable[resourcePathName].enabled
        && this.system.resources.spendable[resourcePathName].rest != "none") {
        let max = this.system.resources.spendable[resourcePathName].max;
        let path = `system.resources.spendable.${resourcePathName}.current`;
        if ((this.system.resources.spendable[resourcePathName].rest == "full"
          || this.system.resources.spendable[resourcePathName].rest == "quick")
          && max && curr < max) {
          updateData[path] = max;
        }
        else if ((this.system.resources.spendable[resourcePathName].rest == "fullreset"
          || this.system.resources.spendable[resourcePathName].rest == "quickreset")
          && curr > 0) {
          updateData[path] = 0;
        }
        if (updateData[path] !== undefined) {
          templateData.resources.push({
            key: resourceName,
            message: `${game.i18n.localize("ARCHMAGE.CHAT.KiReset")} ${updateData[path]}`
          });
        }
      }
    }

    // Reset desperate recharge flag
    updateData["system.attributes.saves.desperateTriggered"] = false;

    // Reset icons
    if (game.settings.get("watersnake-grail-war", "resetIconsOnRest")) {
      [1, 2, 3, 4, 5].forEach(i => {
        if (this.system.icons[`i${i}`].isActive.value) {
          updateData[`system.icons.i${i}.results`] = Array(this.system.icons[`i${i}`].bonus.value).fill(0)
        }
      });
    }

    // Update actor at this point (items are updated separately)
    if ( !foundry.utils.isEmpty(updateData) ) {
      await this.update(updateData);
    }

    // Items
    let items = this.items.map(i => i);
    for (let i = 0; i < items.length; i++) {
      let item = items[i];

      if (item.type != 'power' && item.type != 'equipment') continue;

      let itemUpdateData = {};
      let usageArray = ['once-per-battle','daily','recharge', 'cyclic', 'recharge-desperate', 'daily-desperate'];
      let fallbackQuantity = item.system.quantity.value !== null ? 1 : null;
      let maxQuantity = item.system?.maxQuantity?.value ?? fallbackQuantity;
      if (maxQuantity && usageArray.includes(item.system.powerUsage?.value)
        && (item.system.quantity.value < maxQuantity || item.system.rechargeAttempts.value > 0)) {
        itemUpdateData['system.quantity'] = {value: maxQuantity};
        itemUpdateData['system.rechargeAttempts'] = {value: 0};
        templateData.items.push({
          key: item.name,
          message: `${game.i18n.localize("ARCHMAGE.CHAT.ItemReset")} ${maxQuantity}`
        });
      }
      // Feats
      if (item.type == "power" && item.system.feats) {
        for (let index of Object.keys(item.system.feats)) {
          let feat = item.system.feats[index];
          if (!feat.isActive?.value) continue;
          let maxQuantity = feat.maxQuantity?.value;
          if (maxQuantity && feat.quantity?.value < maxQuantity && usageArray.includes(feat.powerUsage?.value)) {
            itemUpdateData[`system.feats.${index}.quantity.value`] = maxQuantity;
            let tier = game.i18n.localize(`ARCHMAGE.CHAT.${feat.tier.value}`);
            templateData.items.push({
              key: `${item.name} - ${tier}`,
              message: `${game.i18n.localize("ARCHMAGE.CHAT.ItemReset")} ${maxQuantity}`
            });
          }
        }
      }
      // 2e shields and necklaces
      if (item.type == 'equipment') {
        if (item.system.attributes.rerollAc.current != item.system.attributes.rerollAc.bonus) {
          itemUpdateData['system.attributes.rerollAc.current'] = item.system.attributes.rerollAc.bonus;
          templateData.items.push({
            key: game.i18n.localize("ARCHMAGE.CHARACTER.RESOURCES.rerollAc"),
            message: `${game.i18n.localize("ARCHMAGE.CHAT.ItemReset")} ${item.system.attributes.rerollAc.bonus}`
          });
        }
        if (item.system.attributes.rerollSave.current != item.system.attributes.rerollSave.bonus) {
          itemUpdateData['system.attributes.rerollSave.current'] = item.system.attributes.rerollSave.bonus;
          templateData.items.push({
            key: game.i18n.localize("ARCHMAGE.CHARACTER.RESOURCES.rerollSave"),
            message: `${game.i18n.localize("ARCHMAGE.CHAT.ItemReset")} ${item.system.attributes.rerollSave.bonus}`
          });
        }
      }
      // Update item
      if ( !foundry.utils.isEmpty(itemUpdateData) ) await item.update(itemUpdateData);
    }

    // Effects
    let effectsToDelete = [];
    for (const effect of this.effects) {
      if (!effect.active) continue;
      const duration = effect.flags['watersnake-grail-war']?.duration || "Unknown";
      if (duration === "EndOfArc") {
        effectsToDelete.push(effect.id);
        templateData.items.push({
          key: effect.name,
          message: game.i18n.localize("ARCHMAGE.CHAT.effectRemoved")
        });
      }
    }
    if (effectsToDelete.length > 0) await this.deleteEmbeddedDocuments("ActiveEffect", effectsToDelete);

    // Print outcomes to chat
    const template = `systems/watersnake-grail-war/templates/chat/rest-full-card.html`
    const chatData = {
      user: game.user.id,
      speaker: game.holygrailwar.ArchmageUtility.getSpeaker(this)
    };
    chatData["content"] = await foundry.applications.handlebars.renderTemplate(template, templateData);
    game.holygrailwar.ArchmageUtility.createChatMessage(chatData);
  }

  async rechargeDesperate() {
    // Only trigger once per full heal up
    if (this.system.attributes.saves.desperateTriggered) return;
    else await this.update({"system.attributes.saves.desperateTriggered": true})

    let templateData = {
      actor: this,
      items: []
    };

    // Recharge all desperate recharge items
    let items = this.items.map(i => i);
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      if (!['power', 'equipment'].includes(item.type)) continue;
      let fallbackQuantity = item.system.quantity.value !== null ? 1 : null;
      let maxQuantity = item.system?.maxQuantity?.value ?? fallbackQuantity;
      // Re-use rechargeAttempts to store whether we already desperately recharged before
      let rechAttempts = maxQuantity - item.system.quantity.value;
      rechAttempts = Math.max(rechAttempts - item.system.rechargeAttempts.value, 0)
      if (maxQuantity && item.system.quantity.value < maxQuantity
        && ['recharge-desperate', 'daily-desperate'].includes(item.system.powerUsage?.value)) {
        if (rechAttempts > 0) {
          await item.update({
            'system.quantity.value': item.system.quantity.value + rechAttempts,
            'system.rechargeAttempts.value': item.system.rechargeAttempts.value + rechAttempts
            });
          templateData.items.push({
            key: item.name,
            message: `${game.i18n.localize("ARCHMAGE.CHAT.ItemReset")} ${maxQuantity}`
          });
        }
      }
    }

    // Print outcomes to chat
    if (templateData.items.length > 0) {
      const template = `systems/watersnake-grail-war/templates/chat/rest-desperate-card.html`
      const chatData = {
        user: game.user.id, speaker: {actor: this.id, token: this.token,
        alias: this.name, scene: game.user.viewedScene},
      };
      let rollMode = game.settings.get("core", "rollMode");
      ChatMessage.applyRollMode(chatData, rollMode);
      chatData["content"] = await foundry.applications.handlebars.renderTemplate(template, templateData);
      await game.holygrailwar.ArchmageUtility.createChatMessage(chatData);
    } else {
      ui.notifications.info(game.i18n.localize("ARCHMAGE.UI.infoDesperateTriggeredEmpty"));
    }
  }

  /* -------------------------------------------- */

  /**
   * Roll a generic ability test or saving throw.
   * Prompt the user for input on which variety of roll they want to do.
   * @param abilityId {String}    The ability id (e.g. "str")
   *
   * @return {undefined}
   */
  rollAbility(abilityId = null, background = null) {
    DiceArchmage.BackgroundRoll(this, {
      defaultAbility: abilityId,
      defaultBackground: background
    });
  }

  /* -------------------------------------------- */

  /**
   * @deprecated Use DiceArchmage.BackgroundRoll() instead.
   * Roll an Ability Test
   * Prompt the user for input regarding Advantage/Disadvantage and any
   * Situational Bonus
   * @param abilityId {String}    The ability ID (e.g. "str")
   *
   * @return {undefined}
   */
  rollAbilityTest(abilityId, background = null) {
    console.warn('ActorArchmage.rollAbilityTest() is deprecated. Use game.holygrailwar.DiceArchmage.BackgroundRoll(actor, {defaultAbility, defaultBackground}) instead.');
    let abl = null;
    let bg = null;
    let terms = this.type === 'master' ? ['@abil', '@bg'] : ['@abil', '@grade', '@bg'];
    let flavor = '';
    let abilityName = '';
    let backgroundName = '';

    if (abilityId) {
      abl = this.system.abilities[abilityId] ?? null;
      abilityName = abl?.label ? game.i18n.localize(`ARCHMAGE.${abilityId}.label`) : '';
      if (abl) {
        flavor = game.i18n.format('ARCHMAGE.checkSkillFormat', { name: abilityName });
      } else {
        flavor = game.i18n.localize('ARCHMAGE.checkSkill');
      }
    }

    if (background !== null) {
      bg = Object.entries(this.system.backgrounds).find(([k,v]) => {
        return v.name.value && (v.name.value.safeCSSId() == background.safeCSSId());
      });
      if (bg) {
        flavor = game.i18n.format('ARCHMAGE.checkBackgroundFormat', {name: bg[1].name.value});
        backgroundName = Number(bg[1].bonus.value) >= 0 ? `+${bg[1].bonus.value} ${bg[1].name.value}` : `${bg[1].bonus.value} ${bg[1].name.value}`;
      }
      else {
        flavor = game.i18n.localize('ARCHMAGE.checkBackground');
      }
    }

    // Call the roll helper utility
    DiceArchmage.d20Roll({
      event: event,
      terms: terms,
      data: {
        abil: abl ? abl.nonKey.mod + abl.bonus : 0,
        lvl: this.system.attributes.level.value +
          ((this.system.incrementals?.skills && !game.settings.get("watersnake-grail-war", "secondEdition")
          || this.system.incrementals?.skillInitiative && game.settings.get("watersnake-grail-war", "secondEdition")) ? 1 : 0),
        grade: this.system.attributes.grade?.value || 0,
        bg: bg ? bg[1].bonus.value : 0,
        abilityName: abilityName,
        backgroundName: backgroundName,
        abilityCheck: Boolean(abl),
        backgroundCheck: Boolean(bg)
      },
      abilities: this.system.abilities,
      backgrounds: this.system.backgrounds,
      title: flavor,
      alias: this.name,
      actor: this,
      ability: abl,
      background: bg
    });
  }

  /**
   * Override default method to avoid clamping when isBar=true and not
   * using the .value property when not.
   */
  async modifyTokenAttribute(attribute, value, isDelta=false, isBar=true) {
    // Handle hps manually for compatibility with our setup
    if ( attribute === "attributes.hp" ) {
      if ( isDelta ) {
        const current = foundry.utils.getProperty(this.system, attribute);
        value = Number(current.value) + value;
        if ( current.value < 0 ) value -= current.value;
      }
      let updates = {[`system.${attribute}.value`]: value};
      const allowed = Hooks.call("modifyTokenAttribute", {attribute, value, isDelta, isBar}, updates);
      return allowed !== false ? this.update(updates) : this;
    } else {
      super.modifyTokenAttribute(attribute, value, isDelta, isBar);
    }
  }

  /**
   * HP conditions helper method
   *
   * @return {undefined}
   */
  async _updateHpCondition(data, id, thres, maxHp, label) {
    let filtered = this.effects.filter(x => x.name === label);
    filtered = filtered.map(e => e.id);
    if (filtered.length == 0 && data.system.attributes.hp.value/maxHp <= thres) {
        let effectData = CONFIG.statusEffects.find(x => x.id == id);
        let createData = foundry.utils.deepClone(effectData);
        createData.name = game.i18n.localize(effectData.name);
        createData["flags.core.overlay"] = true;
        createData.statuses = [createData.id];
        MacroUtils.setDuration(createData, CONFIG.HOLYGRAILWAR.effectDurationTypes.Infinite)
        delete createData.id;
        const cls = getDocumentClass("ActiveEffect");
        await cls.create(createData, {parent: this});
    } else if (filtered.length > 0 && data.system.attributes.hp.value/maxHp > thres) {
      // Clear effect from update data if it exists or it will be recreated
      if (data.effects != undefined) {
        for ( let effId of filtered ) {
          data.effects = data.effects.filter(e => e._id != effId);
        }
      }
      await this.deleteEmbeddedDocuments("ActiveEffect", filtered);
    }
  }

  /**
   * Scrolling text helper method
   *
   * @return {undefined}
   */
  _showScrollingText(delta, suffix="", overrideOptions={}, ringColor = null) {
    // Show scrolling text of hp update
    const tokens = this.isToken ? [this.token?.object] : this.getActiveTokens(true);
    if (delta != 0 && tokens.length > 0) {
      let color = delta < 0 ? 0xcc0000 : 0x00cc00;
      for ( let token of tokens ) {
        let textOptions = {
          anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
          direction: CONST.TEXT_ANCHOR_POINTS.TOP,
          fontSize: 32,
          fill: color,
          stroke: 0x000000,
          strokeThickness: 4,
          duration: 3000
        };
        canvas.interface.createScrollingText(
          token.center,
          delta.signedString()+" "+suffix,
          foundry.utils.mergeObject(textOptions, overrideOptions)
        );
        // Flash dynamic token rings.
        if (token?.ring) {
          let flashColor = delta < 0 ? Color.fromString('#ff0000') : Color.fromString('#00ff00');
          if (ringColor) flashColor = Color.fromString(ringColor);
          token.ring.flashColor(flashColor, {
            duration: 600,
            easing: foundry.canvas.tokens.TokenRing.easeTwoPeaks,
          });
        }
      }
    }
  }

  // TODO@cswendrowski: refactor this for v10
  // Override default configuration by updating actor after creation
  async _onCreate(data, options, user) {
    if (!game.user.isGM) {
      return;
    }

    // Set the default portrait and token image to the system's
    if (data.img == CONFIG.HOLYGRAILWAR.defaultMonsterTokens['default']) {
      // Note: in cunjunction with the hook this propagates to the prototype token too
      await this.update({img: CONFIG.HOLYGRAILWAR.defaultMonsterTokens['default-toolkit']});
    }

    // For characters only, set some defaults
    if (this.type == "character") {
      await this.update({prototypeToken: {
        actorLink: true,
        disposition: 1, // friendly
        sight: {enabled: true}
      }});
    }
  }

  /**
   * Actor update hook
   *
   * @return {undefined}
   */

  async _preUpdate(data, options, userId) {
    await super._preUpdate(data, options, userId);
    if (!options.diff || data === undefined) return; // Nothing to do
    let changes = {};

    // Foundry v12 no longer has diffed data during _preUpdate, so we need
    // to compute it ourselves.
    // Retrieve a copy of the existing actor data.
    let newData = foundry.utils.flattenObject(data);
    let oldData = foundry.utils.flattenObject(this);

    // Limit data to just the new data.
    const diffData = foundry.utils.diffObject(oldData, newData);
    changes = foundry.utils.expandObject(diffData);

    // Update default images on npc type change
    if (changes.system?.details?.type?.value
      && this.type == "npc"
      && Object.values(CONFIG.HOLYGRAILWAR.defaultMonsterTokens).includes(this.img)
      && CONFIG.HOLYGRAILWAR.defaultMonsterTokens[data.system.details.type.value]) {
      data.img = CONFIG.HOLYGRAILWAR.defaultMonsterTokens[data.system.details.type.value];
      changes.img = data.img;
    }
    // Update the prototype token.
    if (changes.img || changes.name) {
      let tokenData = {};
      // Propagate image update to token for default images
      if (changes.img && Object.values(CONFIG.HOLYGRAILWAR.defaultMonsterTokens).includes(this.img)) {
        tokenData.texture = {src: data.img};
        data.prototypeToken = {texture: {src: data.img}};
      }
      // Propagate name update to token if same as actor
      if (changes.name && this.name == this.prototypeToken.name) {
        data.prototypeToken = {name: data.name};
      }

      // Update tokens.
      let tokens = this.getActiveTokens();
      tokens.forEach(token => {
        let updateData = foundry.utils.duplicate(tokenData);
        // Propagate name update to token if same as actor
        if (data.name && this.name == token.name) {
          updateData.name = data.name;
        }
        token.document.update(updateData);
      });
    }
    // Update the prototype token size.
    if (changes.system?.details?.size?.value && this.type == "npc") {
      let h = 1;
      let w = 1;
      let s = 1;
      switch (data.system.details.size.value) {
        case "large":
          h = 2;
          w = 2;
          break
        case "huge":
          h = 3;
          w = 3;
          break
        case "gargantuan":
          h = 5;
          w = 5;
          break
        case "small":
          s = 0.8;
          break
        case "tiny":
          h = 0.5;
          w = 0.5;
          break
        default:
          break
      }
      const tokenData = {
        height: h,
        width: w,
        texture: {
          scaleX: s,
          scaleY: s,
        }};

      // Update tokens.
      let tokens = this.getActiveTokens();
      tokens.forEach(token => {
        const updateData = foundry.utils.duplicate(tokenData);
        token.document.update(updateData);
      });

      data.prototypeToken = tokenData;
    }

    if (changes.system === undefined) return; // Nothing more to do

    // Deltas, needed for scrolling text later
    let deltaActual = 0;
    let deltaTemp = 0;
    let deltaRec = 0;
    let maxHp = data.system.attributes?.hp?.max || this.system.attributes.hp.max;

    if (changes.system.attributes?.hp?.temp !== undefined) {
      // Store for later display
      deltaTemp = data.system.attributes.hp.temp - this.system.attributes.hp.temp;
    }

    if (changes.system.attributes?.hp?.max !== undefined) {
      // Here we received an update of the max hp
      // Check that the current value does not exceed it
      let deltaMax = maxHp - this.system.attributes.hp.max;
      let hp = data.system.attributes.hp.value || this.system.attributes.hp.value;
      data.system.attributes.hp.value = Math.min(hp + deltaMax, maxHp);
    }

    // If Extra hp have changed, reflect changes in actual hp
    let deltaExtra = 0;
    if (changes.system.attributes?.hp?.extra !== undefined) {
      deltaExtra = changes.system.attributes.hp.extra - this.system.attributes.hp.extra;
      if (deltaExtra > 0) {
        if (data.system.attributes.hp.value !== undefined) {
          data.system.attributes.hp.value += changes.system.attributes.hp.extra;
        } else {
          data.system.attributes.hp.value = this.system.attributes.hp.value + changes.system.attributes.hp.extra;
        }
      }
      maxHp += deltaExtra;
    }

    if (changes.system.attributes?.hp?.value !== undefined
      && changes.system.attributes?.hp?.temp == undefined) {
      // Here we received an update of the total hp but not the temp, check them
      let hp = foundry.utils.duplicate(this.system.attributes.hp);
      if (changes.system.attributes.hp.value === null
        || isNaN(changes.system.attributes.hp.value)) {
        //If the update is nonsensical ignore it
        data.system.attributes.hp.value = hp.value;
      }

      deltaActual = data.system.attributes.hp.value - hp.value;
      if (deltaActual < 0) {
        // Damage, check for temp hps first
        let temp = hp.temp || 0;
        if (isNaN(temp)) temp = 0; // Fallback for erroneous data
        deltaTemp = -1 * Math.min(temp, Math.abs(deltaActual));
        data.system.attributes.hp.temp = Math.max(0, temp + deltaActual);
        deltaActual = Math.min(deltaActual + temp, 0);
      }

      // healing from negative hp handled elsewhere to maintain direct sheet inputs

      // Do not exceed max hps
      deltaActual = Math.min(deltaActual, maxHp - hp.value);
      data.system.attributes.hp.value = hp.value + deltaActual;

      // Handle hp-related conditions
      if (game.settings.get('watersnake-grail-war', 'automateHPConditions') && !game.modules.get("combat-utility-belt")?.active) {
        // Staggered
        await this._updateHpCondition(data, "staggered", 0.5, maxHp,
          game.i18n.localize("ARCHMAGE.EFFECT.StatusStaggered"));
        // Dead / Unconscious
        if (this.type == 'npc'){
          await this._updateHpCondition(data, "dead", 0, maxHp,
            game.i18n.localize("ARCHMAGE.EFFECT.StatusDead"));
        } else {
          await this._updateHpCondition(data, "unconscious", 0, maxHp,
            game.i18n.localize("ARCHMAGE.EFFECT.StatusUnconscious"));
        }
      }

      // Handle first skull in 2e.
      if (game.settings.get('watersnake-grail-war', 'secondEdition')) {
        if (this.system.attributes.hp.value > 0 && changes.system.attributes.hp.value <= 0) {
          if (!changes.system.attributes?.saves?.deathFails?.value) {
            data.system.attributes.saves = this.system.attributes.saves;
          }
          data.system.attributes.saves.deathFails.value += 1;
          for (let i = 0; i < data.system.attributes.saves.deathFails.value; i++) {
            data.system.attributes.saves.deathFails.steps[i] = true;
          }
        }
      }
    }

    // Record deltas to show scrolling text in onUpdate
    // Done there since it fires on all clients, letting everyone see the text
    options.fromPreUpdate = { temp: deltaTemp, hp: deltaActual };

    if (this.type == 'npc'){

      if (changes.system.attributes?.level?.value) {
        // Clamp NPC level to [0, 15]
        data.system.attributes.level.value = Math.min(15, Math.max(0, data.system.attributes.level.value));
      }

      return; // Nothing else to do
    }

    // Character-specific processing

    // Remove commas from custom resource names
    if (changes.system.resources?.spendable) {
      for (let idx of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]) {
        if (changes.system.resources.spendable["custom"+idx]) {
          let label = data.system.resources.spendable["custom"+idx].label;
          if (label) data.system.resources.spendable["custom"+idx].label = label.replace(",", "");
        }
      }
    }

    // Clamp PC level to [1, 10]
    if (!isNaN(changes.system.attributes?.level?.value)) {
      data.system.attributes.level.value = Math.min(10, Math.max(1, data.system.attributes.level.value));
    }

    if (changes.system.attributes?.recoveries?.value) {
      // Here we received an update involving the number of remaining recoveries
      // Make sure we are not exceeding the maximum
      if (this.system.attributes.recoveries.max) {
        data.system.attributes.recoveries.value = Math.min(data.system.attributes.recoveries.value, this.system.attributes.recoveries.max);
      }

      // Record updated recoveries
      deltaRec = data.system.attributes.recoveries.value-this.system.attributes.recoveries.value;

      // Handle negative recoveries penalties, via AE
      // Clear previous effect, then recreate it if the at negative recoveries
      let effectsToDelete = [];
      const negRecoveryLabel = game.i18n.localize("ARCHMAGE.EFFECT.AE.negativeRecovery");
      this.effects.forEach(x => {
        if (x.name == negRecoveryLabel) effectsToDelete.push(x.id);
      });
      await this.deleteEmbeddedDocuments("ActiveEffect", effectsToDelete)

      let newRec = data.system.attributes.recoveries.value;
      if (newRec < 0) {
        const effectData = {
          label: negRecoveryLabel,
          icon: "icons/svg/down.svg",
          changes: [
            {key: "system.attributes.ac.value",value: newRec, mode: CONST.ACTIVE_EFFECT_MODES.ADD},
            {key: "system.attributes.pd.value", value: newRec, mode: CONST.ACTIVE_EFFECT_MODES.ADD},
            {key: "system.attributes.md.value", value: newRec, mode: CONST.ACTIVE_EFFECT_MODES.ADD},
            {key: "system.attributes.attackMod.value", value: newRec, mode: CONST.ACTIVE_EFFECT_MODES.ADD}
          ]
        };
        MacroUtils.setDuration(effectData, CONFIG.HOLYGRAILWAR.effectDurationTypes.Infinite)
        this.createEmbeddedDocuments("ActiveEffect", [effectData]);
      }
    }
    options.fromPreUpdate.rec = deltaRec;

    if (changes.system.attributes?.weapon?.melee?.shield !== undefined
      || changes.system.attributes?.weapon?.melee?.dualwield !== undefined
      || changes.system.attributes?.weapon?.melee?.twohanded !== undefined) {
      // Here we received an update of the melee weapon checkboxes

      // Fallback for sheet closure bug
      if (typeof this.system.attributes.weapon.melee.dice !== 'string') {
          this.system.attributes.weapon.melee.dice = "d8";
      }

      let mWpn = parseInt(this.system.attributes.weapon.melee.dice.substring(1));
      if (isNaN(mWpn)) mWpn = 8; // Fallback
      let lvl = this.system.attributes.level.value;
      data.system.attributes.attackMod = {value: this.system.attributes.attackMod.value};
      let wpn = {shieldPen: 0, twohandedPen: 0};
      if (this.system.attributes.weapon.melee.twohanded) {
        wpn.mWpn2h = mWpn;
        wpn.mWpn1h = Math.max(mWpn - 2, 4);
      } else {
        wpn.mWpn2h = Math.min(mWpn + 2, 12);
        wpn.mWpn1h = mWpn;
      }

      // Compute penalties due to equipment (if classes known)
      if (this.system.details.detectedClasses) {
        let shieldPen = new Array();
        let twohandedPen = new Array();
        let mWpn1h = new Array();
        let mWpn2h = new Array();
        let skilledWarrior = new Array();
        this.system.details.detectedClasses.forEach(function(item) {
          shieldPen.push(CONFIG.HOLYGRAILWAR.classes[item].shld_pen);
          mWpn1h.push(CONFIG.HOLYGRAILWAR.classes[item].wpn_1h);
          mWpn2h.push(CONFIG.HOLYGRAILWAR.classes[item].wpn_2h);
          if (CONFIG.HOLYGRAILWAR.classes[item].wpn_2h > CONFIG.HOLYGRAILWAR.classes[item].wpn_1h
            && CONFIG.HOLYGRAILWAR.classes[item].wpn_2h >= CONFIG.HOLYGRAILWAR.classes.monk.wpn_2h) {
            // Handles special case of monk MC with classes that don't benefit from 2h
            twohandedPen.push(CONFIG.HOLYGRAILWAR.classes[item].wpn_2h_pen);
          }
          skilledWarrior.push(CONFIG.HOLYGRAILWAR.classes[item].skilled_warrior)
        });
        wpn.shieldPen = Math.max.apply(null, shieldPen);
        if (twohandedPen.length > 0) wpn.twohandedPen = Math.max.apply(null, twohandedPen);
        mWpn1h = Math.max.apply(null, mWpn1h);
        mWpn2h = Math.max.apply(null, mWpn2h);
        if (skilledWarrior.length > 1 && !skilledWarrior.every(a => a)) {
          mWpn1h = Math.max(mWpn1h - 2, 4);
          mWpn2h = Math.max(mWpn2h - 2, 4);
        }
        // Only use class values if the current values haven't been tampered with
        if (this.system.attributes.weapon.melee.twohanded && wpn.mWpn2h == mWpn2h) {
          wpn.mWpn1h = mWpn1h;
        }
        else if (!this.system.attributes.weapon.melee.twohanded && wpn.mWpn1h == mWpn1h) {
          wpn.mWpn2h = mWpn2h;
        }
        else { // Values differ from rules, don't do anything
          wpn.shieldPen = 0;
          wpn.twohandedPen = 0;
        }
      }

      if (changes.system.attributes.weapon.melee.shield !== undefined) {
        // Here we received an update of the shield checkbox
        if (changes.system.attributes.weapon.melee.shield) {
          // Adding a shield
          data.system.attributes.ac = {base: this.system.attributes.ac.base + 1};
          data.system.attributes.attackMod.value += wpn.shieldPen;
          if (this.system.attributes.weapon.melee.twohanded) {
            // Can't wield both a two-handed weapon and a shield
            mWpn = wpn.mWpn1h;
            data.system.attributes.weapon.melee.twohanded = false;
            data.system.attributes.attackMod.value -= wpn.twohandedPen;
          }
          else if (this.system.attributes.weapon.melee.dualwield) {
            // Can't dual-wield with a shield
            data.system.attributes.weapon.melee.dualwield = false;
          }
        } else {
          data.system.attributes.ac = {base: this.system.attributes.ac.base - 1};
          data.system.attributes.attackMod.value -= wpn.shieldPen;
        }
      }

      else if (changes.system.attributes.weapon.melee.dualwield !== undefined) {
        // Here we received an update of the dual wield checkbox
        if (changes.system.attributes.weapon.melee.dualwield) {
          if (this.system.attributes.weapon.melee.twohanded) {
            // Can't wield two two-handed weapons
            mWpn = wpn.mWpn1h;
            data.system.attributes.weapon.melee.twohanded = false;
            data.system.attributes.attackMod.value -= wpn.twohandedPen;
          }
          else if (this.system.attributes.weapon.melee.shield) {
            // Can't dual-wield with a shield
            data.system.attributes.ac = {base: this.system.attributes.ac.base - 1};
            data.system.attributes.weapon.melee.shield = false;
            data.system.attributes.attackMod.value -= wpn.shieldPen;
          }
        }
      }

      else if (changes.system.attributes.weapon.melee.twohanded !== undefined) {
        // Here we received an update of the two-handed checkbox
        if (changes.system.attributes.weapon.melee.twohanded) {
          mWpn = wpn.mWpn2h;
          data.system.attributes.attackMod.value += wpn.twohandedPen;
          if (this.system.attributes.weapon.melee.shield) {
            // Can't wield both a two-handed weapon and a shield
            data.system.attributes.ac = {base: this.system.attributes.ac.base - 1};
            data.system.attributes.weapon.melee.shield = false;
            data.system.attributes.attackMod.value -= wpn.shieldPen;
          }
          else if (this.system.attributes.weapon.melee.dualwield) {
            // Can't wield two two-handed weapons
            data.system.attributes.weapon.melee.dualwield = false;
          }
        } else {
          mWpn = wpn.mWpn1h;
          data.system.attributes.attackMod.value -= wpn.twohandedPen;
        }
      }

      data.system.attributes.weapon.melee.dice = `d${mWpn}`;
    }

    else if (changes.system.details?.class !== undefined) {
      // Here we received an update of the class name for a character

      let matchedClasses = ArchmageUtility.detectClasses(data.system.details.class.value);
      if (matchedClasses !== null
        && game.settings.get('watersnake-grail-war', 'automateBaseStatsFromClass')) {
        // Remove duplicates and Sort to avoid problems with future matches
        matchedClasses = [...new Set(matchedClasses)].sort();

        // Check that the matched classes actually changed
        if (this.system.details.detectedClasses !== undefined
          && JSON.stringify(this.system.details.detectedClasses) == JSON.stringify(matchedClasses)
          ) {
          return;
        }

        // Class changed, alert the user we're about to muck with the base stats
        ui.notifications.info(game.i18n.format("ARCHMAGE.UI.classChange",
          { classes: ArchmageUtility.formatClassList(matchedClasses) }));

        // Collect base stats for detected classes
        let base = {
          hp: new Array(),
          ac: new Array(),
          ac_hvy: new Array(),
          shld_pen: new Array(),
          pd: new Array(),
          md: new Array(),
          rec: new Array(),
          rec_num: new Array(),
          mWpn_1h: new Array(),
          mWpn_2h: new Array(),
          rWpn: new Array(),
          skilledWarrior: new Array()
        }

        matchedClasses.forEach(function(item) {
          base.hp.push(CONFIG.HOLYGRAILWAR.classes[item].hp);
          base.ac.push(CONFIG.HOLYGRAILWAR.classes[item].ac_lgt);
          if (CONFIG.HOLYGRAILWAR.classes[item].ac_hvy_pen < 0) {base.ac_hvy.push(CONFIG.HOLYGRAILWAR.classes[item].ac_hvy_pen);}
          else {base.ac_hvy.push(CONFIG.HOLYGRAILWAR.classes[item].ac_hvy);}
          base.shld_pen.push(CONFIG.HOLYGRAILWAR.classes[item].shld_pen);
          base.pd.push(CONFIG.HOLYGRAILWAR.classes[item].pd);
          base.md.push(CONFIG.HOLYGRAILWAR.classes[item].md);
          base.rec.push(CONFIG.HOLYGRAILWAR.classes[item].rec_die);
          base.rec_num.push(CONFIG.HOLYGRAILWAR.classes[item].rec_num || 8); // 8 is the default for 1e classes
          base.mWpn_1h.push(CONFIG.HOLYGRAILWAR.classes[item].wpn_1h);
          if (CONFIG.HOLYGRAILWAR.classes[item].wpn_2h_pen < 0) {base.mWpn_2h.push(CONFIG.HOLYGRAILWAR.classes[item].wpn_2h_pen);}
          else {base.mWpn_2h.push(CONFIG.HOLYGRAILWAR.classes[item].wpn_2h);}
          base.rWpn.push(CONFIG.HOLYGRAILWAR.classes[item].wpn_rngd);
          base.skilledWarrior.push(CONFIG.HOLYGRAILWAR.classes[item].skilled_warrior);
        });

        // Combine base stats based on detected classes
        if (base.skilledWarrior.length == 1) base.skilledWarrior = true;
        else base.skilledWarrior = base.skilledWarrior.every(a => a);
        base.hp = (base.hp.reduce((a, b) => a + b, 0) / base.hp.length);
        base.ac = Math.max.apply(null, base.ac);
        if (Math.min.apply(null, base.ac_hvy) > 0) base.ac = Math.max.apply(null, base.ac_hvy);
        base.shld_pen = base.shld_pen.some(a => a < 0);
        base.pd = Math.max.apply(null, base.pd);
        base.md = Math.max.apply(null, base.md);
        if (base.rec.length == 1) base.rec = base.rec[0];
        else base.rec = (Math.ceil(base.rec.reduce((a, b) => a/2 + b/2) / base.rec.length) * 2);
        if (base.rec_num.length == 1) base.rec_num = base.rec_num[0];
        // TODO: placeholder, waiting for final design
        else base.rec_num = Math.round(base.rec_num.reduce((a, b) => a + b, 0) / base.rec_num.length)
        base.mWpn_1h = Math.max.apply(null, base.mWpn_1h);
        base.mWpn_2h_pen = base.mWpn_2h.every(a => a < 0);
        base.mWpn_2h = Math.max.apply(null, base.mWpn_2h);
        base.rWpn = Math.max.apply(null, base.rWpn);
        let jabWpn = 6;
        let punchWpn = 8;
        let kickWpn = 10;
        if (!base.skilledWarrior) {
          base.mWpn_1h = Math.max(base.mWpn_1h - 2, 4);
          base.mWpn_2h = Math.max(base.mWpn_2h - 2, 4);
          base.rWpn = Math.max(base.rWpn - 2, 4);
          jabWpn -= 2;
          punchWpn -= 2;
          kickWpn -= 2;
        }
        let lvl = this.system.attributes.level.value;
        let shield = false;
        let dualwield = false;
        let twohanded = false;
        // Pick best weapon (and possibly shield)
        base.mWpn = base.mWpn_1h;
        if (matchedClasses.includes("monk")) {
          dualwield = true;
        }
        else if (!base.shld_pen) {
          base.ac += 1;
          shield = true;
        }
        else if (!base.mWpn_2h_pen && base.mWpn_2h > base.mWpn_1h) {
          base.mWpn = base.mWpn_2h;
          twohanded = true;
        }

        // Assign computed values
        data.system.attributes = {
          hp: {base: base.hp},
          ac: {base: base.ac},
          pd: {base: base.pd},
          md: {base: base.md},
          recoveries: {
            dice: `d${base.rec}`,
            base: base.rec_num
            },
          weapon: {
            melee: {
              dice: `d${base.mWpn}`,
              shield: shield,
              dualwield: dualwield,
              twohanded: twohanded
            },
            ranged: {dice: `d${base.rWpn}`},
            jab: {dice: `d${jabWpn}`},
            punch: {dice: `d${punchWpn}`},
            kick: {dice: `d${kickWpn}`}
          }
        };

        // Handle extra recoveries for fighters
        if (matchedClasses.includes("fighter")) {
          data.system.attributes.recoveries.base += 1;
        }

        // Set Key Modifier for multiclasses
        if (matchedClasses.length == 2) {
          // Check that we have the data stored - just in case
          if (CONFIG.HOLYGRAILWAR.keyModifiers[matchedClasses[0]]
            && CONFIG.HOLYGRAILWAR.keyModifiers[matchedClasses[0]][matchedClasses[1]]) {
            let km = CONFIG.HOLYGRAILWAR.keyModifiers[matchedClasses[0]][matchedClasses[1]];
            data.system.attributes.keyModifier = { mod1: km[0], mod2: km[1] };
          } else console.log("Unknown Key Modifier for "+matchedClasses.toString());
        } else {
          // Just set Str/Str, equivalent to disabling the Key Modifier
          data.system.attributes.keyModifier = { mod1: 'str', mod2: 'str' };
        }

        // Enable resources based on detected classes
        data.system.resources = {
          perCombat: {
            momentum: {enabled: (matchedClasses.includes("rogue") && !game.settings.get("watersnake-grail-war", "secondEdition")) ||
                                (matchedClasses.includes("fighter") && game.settings.get("watersnake-grail-war", "secondEdition"))},
            commandPoints: {enabled: matchedClasses.includes("commander")},
            focus: {enabled: matchedClasses.includes("occultist")},
            bravado: {enabled: matchedClasses.includes("rogue") && game.settings.get("watersnake-grail-war", "secondEdition")},
          },
          spendable: {ki: {enabled: matchedClasses.includes("monk")}}
        };
        let busyResources = [];
        for (let cl of matchedClasses) {
          if (CONFIG.HOLYGRAILWAR.classResources[cl]) {
            this._setUpCustomResources(data, CONFIG.HOLYGRAILWAR.classResources[cl], busyResources);
          }
        }

        // Enable the triggers tab for certain classes
        data.flags ||= {}
        data.flags['watersnake-grail-war'] ||= {}
        data.flags['watersnake-grail-war'].showTriggersTab = matchedClasses.some(x => ["bard", "commander", "occultist"].includes(x));
      }
      // Store matched classes for future reference
      data.system.details.detectedClasses = matchedClasses;
    }

    return data;
  }

  // Set up custom resources
  _setUpCustomResources(data, resources, resourcesToAvoid) {
    for (let res of resources) {
      // Find a free custom resource
      let resId = undefined;
      let alreadyConfigured = false;
      for (let key of Object.keys(this.system.resources.spendable)) {
        if (key == "ki") continue;
        let candidate = this.system.resources.spendable[key];
        if (candidate.label == res[0] && candidate.enabled) {
          alreadyConfigured = true;
          break;
        } else if (resourcesToAvoid.includes(key)) {
          continue;
        } else if (!candidate.enabled) {
          resId = key;
          resourcesToAvoid.push(resId);
          break;
        }
      }
      if (alreadyConfigured) break;

      // Configure resource
      data.system.resources.spendable[resId] = {
        current: res.length > 2 ? res[2] : 0,
        enabled: true,
        label: res[0],
        max: res.length > 3 ? res[3] : 0,
        rest: res[1]
      };
    }
  }

  /** @override */
  async _onUpdate(data, options, userId) {
    await super._onUpdate(data, options, userId);

    // Scrolling text for temp hps
    if (options?.fromPreUpdate?.temp) {
      this._showScrollingText(
        options.fromPreUpdate.temp,
        game.i18n.localize("ARCHMAGE.tempHp"),
        {anchor: CONST.TEXT_ANCHOR_POINTS.TOP}
      );
    }
    // Scrolling text for hps
    if (options?.fromPreUpdate?.hp) {
      this._showScrollingText(
        options.fromPreUpdate.hp,
        game.i18n.localize("ARCHMAGE.hitPoints"),
        {anchor: CONST.TEXT_ANCHOR_POINTS.CENTER}
      );
    }
    // Scrolling text for recoveries
    if (options?.fromPreUpdate?.rec) {
      this._showScrollingText(
        options.fromPreUpdate.rec,
        game.i18n.localize("ARCHMAGE.recoveries"),
        {anchor: CONST.TEXT_ANCHOR_POINTS.BOTTOM}
      );
    }
  }

  /**
   * Auto levelup monsters
   * Creates a copy of an NPC actor with the requested delta in levels
   * @param delta {Integer}    The number of levels to add or remove
   *
   * @return mixed
   *   Actor object if actor was duplicated, false otherwise.
   */

  async autoLevelActor(delta) {
    if (!this.type == 'npc' || delta == 0) return false;
    // Convert delta back to a number, and handle + characters.
    delta = typeof delta == 'string' ? Number(delta.replace('+', '')) : delta;

    // Warning for out of bounds.
    if (Math.abs(delta) > 6) ui.notifications.warn(game.i18n.localize("ARCHMAGE.UI.tooManyLevels"));

    // Generate the prefix.
    let suffix = ` (+${delta})`;
    if (delta < 0) suffix = ` (${delta})`;

    // Set the level.
    let lvl = Number(this.system.attributes.level.value || 0) + delta;
    if (lvl < 0 || lvl > 15) {
      ui.notifications.warn(game.i18n.localize("ARCHMAGE.UI.levelLimits"));
      return false;
    }

    // Set other overrides.
    let mul = CONFIG.HOLYGRAILWAR.npcLevelupMultipliers[delta.toString()];
    if (!mul) mul = Math.pow(1.25, delta);
    let overrideData = {
      'name': this.name+suffix,
      'system.attributes.level.value': lvl,
      'system.attributes.ac.value': Number(this.system.attributes.ac.value || 0) + delta,
      'system.attributes.pd.value': Number(this.system.attributes.pd.value || 0) + delta,
      'system.attributes.md.value': Number(this.system.attributes.md.value || 0) + delta,
      'system.attributes.init.value': Number(this.system.attributes.init.value || 0) + delta,
      'system.attributes.hp.value': Math.round(this.system.attributes.hp.value * mul),
      'system.attributes.hp.max': Math.round(this.system.attributes.hp.max * mul),
    };

    // Create the new actor and save it.
    let actor = false;
    // Standalone actors.
    if (!this.parent && !this.pack) {
      actor = await this.clone(overrideData, {save: true, keepId: false});
    }
    // Unlinked tokens.
    else {
      actor = await Actor.create(foundry.utils.mergeObject(this.toObject(false), overrideData));
    }

    // Fix attack and damage
    let atkFilter = /\+\s*(\d+)([\S\s]*)/;
    // let inlineRollFilter = /(\d+)?d?\d+(?!\+)/g;
    let inlineRollFilter = /\[\[(\d+)?d?\d+(?!\+)\]\]/g;
    let itemUpdates = [];

    // Iterate over attacks and actions.
    for (let item of actor.items) {
      let itemOverrideData = {'_id': item.id};
      if (item.type == 'action') {
        // Add delta to attack
        let parsed = atkFilter.exec(item.system.attack.value);
        if (!parsed) continue;
        let newAtk = `[[d20+${parseInt(parsed[1])+delta}`;
        if (!parsed[2].includes("]]")) newAtk += "]]";
        itemOverrideData['system.attack.value'] = newAtk + parsed[2];
      }
      if (item.type == 'action' || item.type == 'trait' || item.type == 'nastierSpecial') {
        // Multiply damage
        for (let key of ["hit", "hit1", "hit2", "hit3", "miss", "description"]) {
          if (!item.system[key]?.value) continue;
          let rolls = [...(item.system[key].value.matchAll(inlineRollFilter))]
          let offset = 0;
          if (rolls.length > 0) {
            let newValue = item.system[key].value;
            rolls.forEach(r => {
              let orig = r[0].slice(2, -2); // Strip leading and trailing double square brackets
              let newDmg = orig;
              let index = r.index + offset;
              if (orig.includes("d")) newDmg = _scaleDice(orig, mul);
              else newDmg = Math.round(parseInt(orig)*mul).toString();
              // Replace first instance at or around index, might be imprecise but good enough
              newValue = newValue.slice(0, index)+newValue.slice(index).replace(`[[${orig}]]`, `[[${newDmg}]]`);
              offset -= (newDmg.length - orig.length);
            });
            itemOverrideData[`system.${key}.value`] = newValue;
          }
        }
      }

      // Append updates to the item update array for later.
      itemUpdates.push(itemOverrideData);
    }

    // Apply all item updates to the new actor.
    actor.updateEmbeddedDocuments('Item', itemUpdates);

    return actor;
  }

  /**
   * Helper method to determine if a character actor is multiclassed
   *
   * @return boolean
   */
  isMulticlass() {
    // If not a character can't be MC
    if (this.type != "character") return false;
    // If we know two or more classes, is MC
    if (this.system.details.detectedClasses?.length > 1) return true;
    // If the KM is configured, is MC - catches 3pp classes
    if (this.system.attributes.keyModifier.mod1 != this.system.attributes.keyModifier.mod2) return true;
    // Is not MC
    return false;
  }
}

function _scaleDice(exp, mul) {
  let y = parseInt(exp.split("d")[1])
  let diceAvg = (y + 1) / 2;
  let target = Math.max(Math.round(parseInt(exp.split("d")[0]) * diceAvg * mul * 2) / 2, 1);
  let diceCnt = 0;
  let correction = "";
  while (target > diceAvg) {
    diceCnt += 1;
    target -= diceAvg;
  }
  // Correct remainder with closest die, +/- 0.5 tolerance due to rounding
  if (target == 1) correction = "1";
  else if (!((target * 2) % 2) && target > 0) correction = `${target / 2}d3`;
  else if (target > 1){
    let corrDie = target * 2 - 1;
    if (corrDie % 2) corrDie -= 1;
    correction = `1d${corrDie}`;
  }
  if (!diceCnt) return correction;
  else if (!correction) return `${diceCnt}d${y}`;
  return `${diceCnt}d${y}+`+correction;
}
