import { ArchmageUtility } from '../setup/utility-classes.js';
import { MacroUtils } from '../setup/utility-classes.js';
import { DiceArchmage } from './dice.js';

/**
 * Extend the base Actor class to implement additional logic specialized for the system.
 */
export class ActorArchmage extends Actor {

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

    // AE formula 해석용 롤데이터 캐시 — prepare 구간 동안만 활성.
    // (formula AE마다 getRollData 풀 클론을 반복하던 비용 절감. 구간 밖 호출은 매번 신선한 값.)
    this._formulaRollDataCache = null;
    this._formulaCacheActive = true;

    // 능력치 상시보정(flatBonus: 서번트 클래스 보정·마스터 패러미터 등)을 _source 수치에 먼저 합산.
    // → 이후 능력치 AE가 그 위에 적용됨: ADD(강화)는 가산, OVERRIDE(빈약 등)는 덮어써서 보정 무시(E(3) 고정).
    if (this.type === 'character' || this.type === 'master' || this.type === 'npc') {
      for (const [k, abl] of Object.entries(this.system.abilities ?? {})) {
        // 상시보정(flatBonus): AE로 대체(override) 또는 기존값 + 증감(add). 18 상한 대상.
        const fbOver = this._effectOverride(`abilities.${k}.flatBonus`);
        abl.flatBonus = (fbOver !== null ? fbOver : (Number(abl.flatBonus) || 0)) + this._effectAdd(`abilities.${k}.flatBonus`);
        // ±개수(rerollPlus): AE로 대체 또는 기존값 + 증감. (표기용)
        const rpOver = this._effectOverride(`abilities.${k}.rerollPlus`);
        abl.rerollPlus = (rpOver !== null ? rpOver : (Number(abl.rerollPlus) || 0)) + this._effectAdd(`abilities.${k}.rerollPlus`);
        // 기반수치 대체(AE override): 있으면 _source 대신 그 값을 기반으로. 이후 강화(flatBonus·ADD AE)는 누적.
        const baseOv = this._effectOverride(`abilities.${k}.base`);
        const base = baseOv !== null ? baseOv : (Number(abl.value) || 0);
        let v = base + abl.flatBonus;
        // 상시보정(+)으로는 능력치 수치 18을 초과할 수 없음(AE 상시보정 포함). 기본값 자체는 안 깎음.
        if (abl.flatBonus > 0) v = Math.max(base, Math.min(v, 18));
        abl.value = v;
      }
    }

    // Apply active effects in group 0 (ability scores, base attributes).
    this.applyActiveEffects('pre');

    // Prepare data, items, derived data, and effects.
    this.prepareBaseData();
    // this.prepareEmbeddedEntities();

    // Apply activeEffects in group 1 (most properties).
    this.applyActiveEffects('default');
    // 기본 준비로 상태가 바뀌었으므로 캐시 무효화 후 파생 계산.
    this._formulaRollDataCache = null;
    this.prepareDerivedData();

    // Apply activeEffects to group 2 (standardBonuses).
    this.applyActiveEffects('post');

    this._formulaCacheActive = false;
    this._formulaRollDataCache = null;
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
    // npc(일반인·마술사)는 마스터와 동일하게 취급 → 마스터/캐릭터 파생계산 경로 사용.
    if (actorData.type === 'character' || actorData.type === 'master' || actorData.type === 'npc') {
      this._prepareCharacterData(data, model, flags);
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
      return changes.concat(e.changes.map(src => ({
        // 원본 change 보호용 사본 — 이후 단계에서 value/numeric을 변이하므로.
        // (JSON 왕복 duplicate는 패스×이펙트×체인지마다 돌기엔 비싸 얕은 복사로 대체)
        key: src.key,
        value: src.value,
        mode: src.mode,
        priority: src.priority ?? (src.mode * 10),
        effect: e,
        name: e?.name
      }))).filter(c => relevant(c) && !String(c.key).startsWith('system.overrides.'));
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

    // formula 지원: AE 값에 @참조/산술식이 있으면 롤데이터로 해석해 숫자화.
    // (순환 방지 위해 prepare 재실행 없이 현재 상태의 롤데이터 사용 — 'default'/'post' 단계에선
    //  능력치·수정치가 이미 계산돼 @str.mod 등 참조 가능. 'pre' 단계에선 능력치 참조는 제한적.)
    let _effRollData = null;
    const _resolveVal = (raw) => {
      const s = String(raw ?? '').trim();
      if (s === '' || !isNaN(s)) return s;              // 빈값/숫자는 그대로
      try {
        if (!_effRollData) _effRollData = this.getRollData(null, { skipPrepare: true });
        const replaced = Roll.replaceFormulaData(s, _effRollData, { missing: 0, warn: false });
        const val = Roll.safeEval(replaced);
        if (typeof val === 'number' && isFinite(val)) return String(val);
      } catch (e) { /* 해석 실패 → 원본 유지(숫자 아니면 0으로 처리됨) */ }
      return s;
    };

    for ( let change of changes ) {
      // formula 해석 (숫자/빈값이면 그대로).
      change.value = _resolveVal(change.value);

      // First save numeric value if we have it
      if (!isNaN(change.value)) {
        change.numeric = Number(change.value);
        change.value = "";
      } else {
        change.numeric = 0;
      }

      // For non-stacking bonuses, let the users sort it out
      if (change.mode != CONST.ACTIVE_EFFECT_MODES.ADD) {
        // OVERRIDE 등 비가산 모드는 위에서 비워둔 숫자값을 복원해서 apply.
        // (복원 없이 value=""로 apply하면 0으로 캐스팅돼 '급 대체 4'가 0이 되던 버그.
        //  ADD 경로는 아래 uniquePenalties 병합에서 복원되지만 이 경로는 그냥 통과라 여기서 복원.)
        if (change.value === "") change.value = String(change.numeric);
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

  /**
   * AE 값(숫자 또는 @참조/산술식)을 숫자로 해석. 해석 불가/빈값이면 null.
   * (기반수치·수정치 대체 등 파생계산이 직접 읽는 override 값 처리용.)
   */
  _resolveEffectFormula(raw) {
    const s = String(raw ?? '').trim();
    if (s === '') return null;
    if (!isNaN(s)) return Number(s);
    try {
      const rd = this._formulaCacheActive
        ? (this._formulaRollDataCache ??= this.getRollData(null, { skipPrepare: true }))
        : this.getRollData(null, { skipPrepare: true });
      const replaced = Roll.replaceFormulaData(s, rd, { missing: 0, warn: false });
      const val = Roll.safeEval(replaced);
      if (typeof val === 'number' && isFinite(val)) return val;
    } catch (e) { /* 무시 */ }
    return null;
  }

  /**
   * 활성 이펙트에서 `system.overrides.<subkey>` 키의 값을 읽어 반환(마지막 활성값). 없으면 null.
   * 이 키들은 applyActiveEffects에서 제외되고, 파생계산이 계산 순서에 맞춰 직접 읽는다.
   * 예: 'pd.base'(신방 기반 대체), 'pd.mod'(신방 수정치 대체), 'abilities.str.base'(근력 기반 대체).
   */
  _effectOverride(subkey) {
    const fullKey = `system.overrides.${subkey}`;
    const OVERRIDE = CONST.ACTIVE_EFFECT_MODES.OVERRIDE;
    let result = null;
    for (const e of this.effects) {
      if (e.disabled) continue;
      for (const c of e.changes) {
        if (c.key === fullKey && Number(c.mode) === OVERRIDE) {
          const v = this._resolveEffectFormula(c.value);
          if (v !== null) result = v;
        }
      }
    }
    return result;
  }

  /** `system.overrides.<subkey>` 키의 ADD change들을 합산해 반환(없으면 0). formula 지원. */
  _effectAdd(subkey) {
    const fullKey = `system.overrides.${subkey}`;
    const ADD = CONST.ACTIVE_EFFECT_MODES.ADD;
    let sum = 0;
    for (const e of this.effects) {
      if (e.disabled) continue;
      for (const c of e.changes) {
        if (c.key === fullKey && Number(c.mode) === ADD) {
          const v = this._resolveEffectFormula(c.value);
          if (v !== null) sum += v;
        }
      }
    }
    return sum;
  }

  /**
   * 역할별 유효 전투고조(판정 가산치) 계산.
   * 룰: 서번트(및 영령 취급 마스터/npc) = min(고조, 영령의 급) / 마스터·npc = floor(고조/3).
   * raw(escalation.value)는 위젯·AE·standardBonuses용으로 그대로 두고, 굴림 경로만 이 값을 쓴다.
   */
  _effectiveEscalation(raw) {
    const ed = Math.max(0, Number(raw) || 0);
    const isMasterLike = this.type === 'master' || this.type === 'npc';
    const asServant = isMasterLike && ['three', 'sorcery'].includes(this.system.details?.masterAsServant?.value);
    if (!isMasterLike || asServant) return Math.min(ed, Math.max(0, Number(this.system.attributes?.grade?.value) || 0));
    return Math.floor(ed / 3);
  }

  /**
   * 전투고조 유효치 파이프라인(캐릭터별 AE 보정). prepareDerivedData에서만 호출.
   * ① 인식 증감/대체: applyActiveEffects('ed')가 escalation.value에 이미 적용(호출 전).
   * ② 기준 대체(ed.mode: 1=서번트, 2=마스터) + 상한 대체(ed.cap: formula, 서번트형 전용, 빈값/해석불가→급)
   * ③ 최종 증감(ed.bonus, ADD 합산, 제한 무시) ④ 최종 대체(ed.value, 0도 유효=차단) ⑤ 반전(ed.invert=1 → 부호 반전)
   * formula(@end.mod 등) 해석 중 @ed 재진입은 getRollData 폴백(_effectiveEscalation 기본 변환)으로 종료 — 무한재귀 없음.
   */
  _escalationPipeline(raw) {
    const ed = Math.max(0, Number(raw) || 0);
    const isMasterLike = this.type === 'master' || this.type === 'npc';
    const asServant = isMasterLike && ['three', 'sorcery'].includes(this.system.details?.masterAsServant?.value);
    let servantLike = !isMasterLike || asServant;            // 기본: 역할대로(masterAsServant 동작 유지)
    const mode = this._effectOverride('ed.mode');            // ②
    if (mode === 1) servantLike = true;
    else if (mode === 2) servantLike = false;
    let eff;
    if (servantLike) {
      let cap = Math.max(0, Number(this.system.attributes?.grade?.value) || 0);
      const capOver = this._effectOverride('ed.cap');        // ②' null이면 급 유지
      if (capOver !== null) cap = Math.max(0, capOver);
      eff = Math.min(ed, cap);
    } else {
      eff = Math.floor(ed / 3);
    }
    eff += this._effectAdd('ed.bonus');                      // ③
    const finalOver = this._effectOverride('ed.value');      // ④
    if (finalOver !== null) eff = finalOver;
    if (this._effectOverride('ed.invert') === 1) eff = -eff; // ⑤
    return eff;
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
    // npc(일반인·마술사)는 마스터와 동일 취급.
    if (actorData.type === 'character' || actorData.type === 'master' || actorData.type === 'npc') {
      // 성배전쟁 이니셔티브: 1d20 + 민첩 수정치 + 영령의 급(서번트, 또는 영령 취급 마스터/npc)
      // 각 항을 숫자로 강제 캐스팅 — 문자열이 섞이면 연결("3"+4="34")로 오염되고,
      // NaN이면 formula 무효로 이니셔티브가 조용히 실패한다.
      const statInit = Number(data.abilities?.agi?.nonKey?.mod) || 0;
      const miscInit = Number(data.attributes.init.value) || 0;
      // 급은 유형·영령 취급과 무관하게 항상 이니셔티브에 가산 (룰 확정 — 마스터·npc 포함)
      const gradeInit = Number(data.attributes.grade?.value) || 0;
      data.attributes.init.mod = statInit + miscInit + gradeInit;
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

    // 역할별 유효 고조(굴림 가산치). AE가 escalation.value를 덮어쓸 수 있어 'ed' 적용 후 계산.
    // 캐릭터별 보정 파이프라인(기준/상한 대체·최종 증감/대체·반전)은 _escalationPipeline 참조.
    data.attributes.escalation.effective = this._escalationPipeline(data.attributes.escalation.value);

    // Must recompute this here because the e.d. might have changed.
    data.attributes.standardBonuses = {
      value: data.attributes.level.value + data.attributes.escalation.value
    };

    // AE의 판정 보정 항목(이름+값+적용 조건) 집계 → 굴림 대화상자에서 항목별 토글로 노출.
    // 값은 formula 가능(굴림 시점에 대화상자가 해석). 비활성 효과는 제외.
    // apply = 적용 조건('all'/능력치 키/'custom'/'melee'/'ranged') — 판정 태그와 매칭(v0.3.25).
    const checkBonusList = [];
    const critModList = [];
    const fumbleModList = [];
    for (const e of this.effects) {
      if (e.disabled) continue;
      const flags = e.flags?.['watersnake-grail-war'] ?? {};
      if (Array.isArray(flags.checkBonuses)) {
        for (const cb of flags.checkBonuses) {
          const val = String(cb?.value ?? '').trim();
          if (val === '') continue;
          checkBonusList.push({ label: (cb.label || e.name || '판정 보정'), value: val, apply: cb.apply || 'all' });
        }
      }
      // 대성공/대실패 범위 확장 (다중, 조건부)
      if (Array.isArray(flags.critMods)) {
        for (const cm of flags.critMods) {
          const val = String(cm?.value ?? '').trim();
          if (val === '') continue;
          critModList.push({ label: e.name, value: val, apply: cm.apply || 'all' });
        }
      }
      if (Array.isArray(flags.fumbleMods)) {
        for (const fm of flags.fumbleMods) {
          const val = String(fm?.value ?? '').trim();
          if (val === '') continue;
          fumbleModList.push({ label: e.name, value: val, apply: fm.apply || 'all' });
        }
      }
    }
    data.attributes.checkBonusList = checkBonusList;
    data.attributes.critModList = critModList;
    data.attributes.fumbleModList = fumbleModList;

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
    // 경험치 최대치(마스터용): 레벨<8 = 레벨, 레벨≥8 = 단리 배화 = 레벨×(레벨-6)
    // (8레벨 8×2=16, 9레벨 9×3=27, 10레벨 10×4=40 …)
    if (data.attributes.xp) {
      const _lvl = Number(data.attributes.level?.value) || 0;
      if (data.attributes.xp.automatic) data.attributes.xp.max = _lvl < 8 ? _lvl : _lvl * (_lvl - 6);
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
    if (!data.resources.spendable) data.resources.spendable = model.resources.spendable;
    if (!data.resources.spendable.ki) data.resources.spendable.ki = model.resources.spendable.ki;
    for (let idx of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]) {
      if (!(data.resources.spendable["custom"+idx])) data.resources.spendable["custom"+idx] = model.resources.spendable["custom"+idx];
      if (!data.resources.spendable["custom"+idx].rest) data.resources.spendable["custom"+idx].rest = model.resources.spendable["custom"+idx].rest;
    }
    // Saves
    if (!data.attributes.saves) data.attributes.saves = model.attributes.saves;
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

    // Ability modifiers
    // (실효 수치 = base + 상시보정 + AE는 이미 prepareData 'pre' 이전/이후에 반영됨. 여기선 수정치만 산출.)
    for (let abl of Object.values(data.abilities)) {
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

    // Bonuses — 장비(equipment) 타입 제거로 아이템발 보정은 소멸. 하위 계산이 읽는 구조만 유지.
    data.attributes.attack = {
      melee: { bonus: data.attributes.attack?.melee?.bonus ?? 0 },
      ranged: { bonus: data.attributes.attack?.ranged?.bonus ?? 0 },
      divine: { bonus: data.attributes.attack?.divine?.bonus ?? 0 },
      arcane: { bonus: data.attributes.attack?.arcane?.bonus ?? 0 }
    };
    data.attributes.saves.bonus = 0;
    data.attributes.saves.disengageBonus = 0;
    for (const k of ['str', 'agi', 'end', 'mgi', 'ins', 'lck']) data.abilities[k].bonus = 0;

    // 성배전쟁 방어 (신방=pd, 정방=md). 능력치 매핑: 근력str/내구con/민첩dex/마력int/행운cha/통찰wis
    const isMaster = this.type === 'master' || this.type === 'npc';
    // 마스터 영령 취급 옵션: 'none'(기본 마스터식) / 'three'(삼기사) / 'sorcery'(사술사)
    // → HP·MP·신방·정방을 서번트식(해당 클래스)으로 계산.
    const masterServant = isMaster ? (data.details.masterAsServant?.value || 'none') : 'none';
    const masterAsServant = masterServant === 'three' || masterServant === 'sorcery';
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

    // 신방 (자동 시): 서번트/마스터영령취급 = (삼기사14/사술사12) + 급 + (내구·민첩) / 일반 마스터 = 10 + (내구·민첩)
    if (data.attributes.pd.automatic ?? true) {
      let pdBase;
      let pdGrade = 0;   // 급은 기반과 별개 — pd.base override 시에도 유지·가산돼야 함(기반 대체 후 강화 누적)
      if (masterAsServant) { pdBase = (masterServant === 'three' ? 14 : 12); pdGrade = grade; }
      else if (isMaster) pdBase = 10;
      else { pdBase = (defCategory === 'three' ? 14 : 12); pdGrade = grade; }
      const pdBaseOv = this._effectOverride('pd.base'); if (pdBaseOv !== null) pdBase = pdBaseOv;   // 순수 기반(10/12/14)만 대체
      let pdMod = pdAblMod;
      const pdModOv = this._effectOverride('pd.mod'); if (pdModOv !== null) pdMod = pdModOv;          // 수정치 대체
      data.attributes.pd.value = pdBase + pdGrade + pdMod;
    }
    // 정방 (자동 시): 서번트/마스터영령취급 = (삼기사10/사술사12) + 통찰 / 일반 마스터 = 8 + 통찰
    if (data.attributes.md.automatic ?? true) {
      let mdBase;
      if (masterAsServant) mdBase = (masterServant === 'three' ? 10 : 12);
      else if (isMaster) mdBase = 8;
      else mdBase = (defCategory === 'three' ? 10 : 12);
      const mdBaseOv = this._effectOverride('md.base'); if (mdBaseOv !== null) mdBase = mdBaseOv;   // 기반 대체(후 강화 누적)
      let mdMod = sm('ins');
      const mdModOv = this._effectOverride('md.mod'); if (mdModOv !== null) mdMod = mdModOv;          // 수정치 대체
      data.attributes.md.value = mdBase + mdMod;
    }
    // AC는 성배전쟁에서 미사용 (호환용으로 base 유지)
    data.attributes.ac.value = Number(data.attributes.ac.base);

    // Damage Modifiers
    data.tier = 1;
    if (data.attributes.level.value >= 5) data.tier = 2;
    if (data.attributes.level.value >= 8) data.tier = 3;
    for (let prop in data.abilities) {
      data.abilities[prop].dmg = data.tierMult * data.abilities[prop].mod;
      data.abilities[prop].nonKey.dmg = data.tierMult * data.abilities[prop].nonKey.mod;
    }

    // HP (성배전쟁): 서번트/마스터영령취급 = 근력 + 내구×3 / 일반 마스터 = (근력 + 내구×3) ÷ 2
    if (data.attributes.hp.automatic) {
      let hpBaseVal = sv('str') + sv('end') * 3;
      if (isMaster && !masterAsServant) hpBaseVal = Math.floor(hpBaseVal / 2);
      const hpBaseOv = this._effectOverride('hp.base'); if (hpBaseOv !== null) hpBaseVal = hpBaseOv;  // 기반 대체(후 강화 누적)
      data.attributes.hp.max = hpBaseVal + Number(data.attributes.hp.extra);
    }

    // MP (성배전쟁): 마력<12 = 12+마력(서)/6+마력(마) / 마력≥12 = 마력×2(서)/마력×1.5(마)
    // (마스터 영령 취급 시 서번트식 적용)
    if (data.attributes.mp.automatic ?? true) {
      const mag = sv('mgi');
      const servantMp = !isMaster || masterAsServant;
      let mpMax;
      if (mag < 12) mpMax = servantMp ? 12 + mag : 6 + mag;
      else mpMax = servantMp ? mag * 2 : Math.floor(mag * 1.5);
      const mpBaseOv = this._effectOverride('mp.base'); if (mpBaseOv !== null) mpMax = mpBaseOv;  // 기반 대체(후 강화 누적)
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
      const spBaseOv = this._effectOverride('sp.base'); if (spBaseOv !== null) spVal = spBaseOv;  // 기반 대체(후 강화 누적)
      data.attributes.sp.max = Math.floor(spVal);
    }

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
          // 역할별 유효 고조: 서번트(및 영령 취급 마스터/npc) = min(고조, 급) / 마스터·npc = 고조÷3(내림).
          // effective는 prepareDerivedData에서 계산됨. skipPrepare 경로 대비 fallback 유지.
          data.ed = v.effective ?? actor._effectiveEscalation(v.value);
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
          if (!(k in data)) data[k] = v;
          break;

        default:
          if (!(k in data)) data[k] = v;
          break;
      }
    }

    // Animal companion data
    let anLvl = actor.system.attributes.level.value;
    data.animalCompanion = {
      'atk': CONFIG.HOLYGRAILWAR.animalCompanion.attack[anLvl],
      'dmg': CONFIG.HOLYGRAILWAR.animalCompanion.damage[anLvl]
    }

    // Old syntax shorthand.
    data.attr = data.attributes;
    data.abil = data.abilities;

    // Process resource shorthands and custom resource names (npc도 마스터와 동일 취급)
    if (this.type === "character" || this.type === "master" || this.type === "npc"){
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

    return data;
  }

  getInitiativeFormula() {
    // 비유한값(NaN/undefined)이 섞이면 Roll이 formula를 거부해 이니셔티브가 통째로 실패하므로 정규화.
    let init = Number(this.system.attributes.init.mod);
    if (!Number.isFinite(init)) init = 0;
    // Init mod includes dex + misc bonuses + grade.
    const parts = ["1d20", init];
    if (this.getFlag("watersnake-grail-war", "initiativeAdv")) parts[0] = "2d20kh";
    if (game.settings.get("watersnake-grail-war", "initiativeStaticNpc") &&  this.type == 'npc') parts[0] = "10";
    if (CONFIG.Combat.initiative.tiebreaker) parts.push(init / 100);
    else parts.push((this.type === 'npc' ? 0.01 : 0));
    return parts.filter(p => p !== null).join(" + ");
  }

  async rollSave() {
    // 룰: 차례 종료 시 1d20 순수값 11+ → 보유 상태이상 1개 해제(어느 것을 풀지는 수동 선택).
    // (구 13th Age easy/hard/death/lastGasp 분기 제거 — 인자는 하위호환 위해 무시.)
    const target = 11;
    const roll = new Roll('1d20');
    await roll.evaluate();
    const success = roll.total >= target;

    const template = `systems/watersnake-grail-war/templates/chat/save-card.html`;
    const token = this.token;
    const chatData = {
      user: game.user.id,
      roll: roll, // TODO: fix template to use rolls prop
      rolls: [roll],
      speaker: game.holygrailwar.ArchmageUtility.getSpeaker(this)
    };
    const templateData = {
      actor: this,
      tokenId: token ? `${token.id}` : null,
      saveType: '상태이상 저항',
      success: success,
      data: chatData,
      target,
      formulaParts: game.holygrailwar.ArchmageUtility.rollFormulaParts(roll),
      total: roll.total
    };
    chatData.content = await foundry.applications.handlebars.renderTemplate(template, templateData);
    await game.holygrailwar.ArchmageUtility.createChatMessage(chatData);
  }

  async rollDisengage() {
    // 룰: 보정 없이 1d20 순수값이 (6 + 추가 접전 인원) 이상이면 성공.
    const defaultRollMode = game.settings.get('core', 'rollMode');
    const rollModeOptions = Object.entries(CONFIG.Dice.rollModes).map(([k, m]) =>
      `<option value="${k}"${k === defaultRollMode ? ' selected' : ''}>${game.i18n.localize(m.label ?? m)}</option>`).join('');
    const content = `
      <form>
        <div class="form-group">
          <label>추가 접전 인원</label>
          <input type="number" name="extra" value="0" min="0" step="1" autofocus/>
        </div>
        <div class="form-group">
          <label>롤 모드</label>
          <select name="rollMode">${rollModeOptions}</select>
        </div>
      </form>`;

    const choice = await foundry.applications.api.DialogV2.wait({
      window: { title: '물러서기' },
      content,
      buttons: [
        {
          action: 'roll',
          label: '굴림',
          default: true,
          callback: (event, button) => ({
            extra: Math.max(0, Math.floor(Number(button.form.elements.extra?.value) || 0)),
            rollMode: button.form.elements.rollMode?.value || defaultRollMode
          })
        },
        { action: 'cancel', label: '취소' }
      ],
      rejectClose: false
    });
    if (!choice || choice === 'cancel') return;

    // 난이도 = 6 + 추가 접전 인원. 보정 없는 순수 1d20.
    const target = 6 + choice.extra;
    const roll = new Roll('1d20');
    await roll.evaluate();
    const success = roll.total >= target;

    const template = `systems/watersnake-grail-war/templates/chat/save-card.html`;
    const token = this.token;
    const chatData = {
      user: game.user.id,
      roll: roll, // TODO: fix template to use rolls prop
      rolls: [roll],
      speaker: game.holygrailwar.ArchmageUtility.getSpeaker(this)
    };
    const templateData = {
      actor: this,
      tokenId: token ? `${token.id}` : null,
      saveType: '물러서기',
      success: success,
      data: chatData,
      target,
      formulaParts: game.holygrailwar.ArchmageUtility.rollFormulaParts(roll),
      total: roll.total
    };
    chatData.content = await foundry.applications.handlebars.renderTemplate(template, templateData);
    await game.holygrailwar.ArchmageUtility.createChatMessage(chatData, { rollMode: choice.rollMode });
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
          (this.system.incrementals?.skills ? 1 : 0),
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
    // 업데이트 페이로드(부분)만 순회해 현재값과 비교 — 문서 전체 flatten(아이템·효과 포함)은
    // 매 업데이트마다 돌기엔 비싸다. 객체/배열 값은 보수적으로 '변경'으로 취급(무해).
    const newData = foundry.utils.flattenObject(data);
    const diffData = {};
    for (const [k, v] of Object.entries(newData)) {
      if (foundry.utils.getProperty(this, k) !== v) diffData[k] = v;
    }
    changes = foundry.utils.expandObject(diffData);

    // Propagate name update to prototype token and active tokens.
    if (changes.name && this.name == this.prototypeToken.name) {
      data.prototypeToken = {name: data.name};
      let tokens = this.getActiveTokens();
      tokens.forEach(token => {
        if (this.name == token.name) {
          token.document.update({name: data.name});
        }
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


    return data;
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
