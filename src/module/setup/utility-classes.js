

// CONFIG.debug.hooks = true;

/**
 * Class that defines utility methods for the Archmage system.
 * IMPORTANT: May be used by modules/macros. Handle changes with care!
 * (For example, the formatting methods are used in translation modules.)
 * Available at runtime as game.holygrailwar.ArchmageUtility.
 */
export class ArchmageUtility {
  /**
   * Helper utility function to create chat messages, handling roll mode and 3d dice.
   *
   * @param {object} chatData
   *   The chat data, as given to ChatMessage.create().
   * @param {object} context
   *   (Optional) Chat message context/options, as given to ChatMessage.create().
   * @param {boolean} waitForDice
   *   (Optional) Whether to wait for 3d dice rolls to finish before returning.
   *
   * @return {Promise<Document>} The created ChatMessage document instance.
   */
  static async createChatMessage(chatData, context = {}, waitForDice = true) {
    if (!chatData.flags) {
      chatData.flags = {};
    }
    if (!chatData.flags.core) {
      chatData.flags.core = {};
    }
    if (!foundry.utils.hasProperty(chatData.flags.core, "canPopout")) {
      chatData.flags.core.canPopout = true;
    }

    if (!context) {
      context = {};
    }

    if (!foundry.utils.hasProperty(context, "rollMode")) {
      // Default roll mode set via chat box.
      context.rollMode = game.settings.get("core", "rollMode");
    }
    chatData = ChatMessage.applyRollMode(chatData, context.rollMode);

    // Return early if we don't need to wait for the 3d dice animation.
    if (!waitForDice || !game.dice3d) {
      return ChatMessage.create(chatData, context);
    }

    // Return early if there is nothing to wait on.
    // Our own inline rolls are handled separately,
    // so we only wait for roll messages or if default DSN inline rolls are used.
    if ((!chatData.rolls || chatData.rolls.length == 0) &&
        !game.settings.get("dice-so-nice", "animateInlineRoll")) {
      return await ChatMessage.create(chatData, context);
    }

    // Try to wait for the 3d dice animation to finish.
    const msg = await ChatMessage.create(chatData, context);
    if (msg?.id) {
      await game.dice3d.waitFor3DAnimationByMessageID(msg.id);
    }
    return msg;
  }

  /**
   * 성배전쟁: feature 아이템 굴림을 채팅에 출력 (능력치 판정/피해/기타).
   * 시트의 🎲가 아니라 채팅 카드 버튼/재굴림에서 호출된다.
   *
   * @param {object} actor   굴리는 액터
   * @param {object} item    feature 아이템
   * @param {string} rollType 'trait' | 'damage' | 'misc'
   */
  static async rollFeature(actor, item, rollType) {
    if (!actor || !item) return;
    const sys = item.system;

    // 능력치 판정
    if (rollType === 'trait') {
      // 직접 입력(숫자/변수)이 있으면 일반 능력치 판정과 동일한 대화상자로
      // (능력치=없음 기본, 입력값은 고정 보정으로 합산. 유리/불리·상황보정·롤모드 적용 가능)
      const custom = sys.rollCustom?.value?.trim();
      if (custom) {
        return game.holygrailwar.DiceArchmage.BackgroundRoll(actor, {
          fixedBonus: custom,
          title: `${item.name} — 판정`
        });
      }
      // 아니면 능력치 선택 → 시트와 동일한 배경 판정 대화상자(해당 능력치 프리셋)
      if (!sys.rollAbility?.value) return;
      return game.holygrailwar.DiceArchmage.BackgroundRoll(actor, { defaultAbility: sys.rollAbility.value });
    }

    // 기타 굴림: 보정치(주사위/고정)를 대화상자로 입력
    if (rollType === 'misc') {
      if (!sys.misc?.value) return;
      return new foundry.applications.api.DialogV2({
        window: { title: `${item.name} — 기타 굴림` },
        content: `<div class="form-group" style="display:flex;flex-direction:column;gap:4px;">
            <label>추가 보정치 (선택 · 주사위/고정 가능, 예: 1d4, +2)</label>
            <input name="extra" type="text" placeholder="예: 1d4, +2" autofocus>
          </div>`,
        buttons: [
          { action: 'roll', label: '굴림', default: true,
            callback: (e, b) => ArchmageUtility._completeFeatureRoll(actor, item, 'misc', { extra: b.form.extra.value }) },
          { action: 'cancel', label: '취소' }
        ],
        rejectClose: false
      }).render({ force: true });
    }

    // 피해 굴림: 면수 강화(단계당 +2)·주사위 개수 추가·추가 보정을 대화상자로 입력
    if (rollType === 'damage') {
      if (!sys.damage?.value) return;
      // 강화 단계 / 개수 추가: 0~10 드롭다운
      const dmgOptions = Array.from({ length: 11 }, (_, i) => `<option value="${i}">${i}</option>`).join('');
      return new foundry.applications.api.DialogV2({
        window: { title: `${item.name} — 피해 굴림` },
        content: `<div style="display:flex;flex-direction:column;gap:6px;">
            <div class="form-group"><label>강화 단계</label><select name="steps">${dmgOptions}</select></div>
            <div class="form-group"><label>개수 추가</label><select name="addDice">${dmgOptions}</select></div>
            <div class="form-group"><label>추가 보정</label><input name="extra" type="text" placeholder="예: 1d6, +3"></div>
            <div class="form-group"><label>피해 최대화 (모든 주사위 최대)</label><input name="maximize" type="checkbox"></div>
          </div>`,
        buttons: [
          { action: 'roll', label: '굴림', default: true,
            callback: (e, b) => ArchmageUtility._completeFeatureRoll(actor, item, 'damage', {
              steps: Number(b.form.steps.value) || 0,
              addDice: Number(b.form.addDice.value) || 0,
              extra: b.form.extra.value,
              critical: false,
              maximize: b.form.maximize.checked
            }) },
          { action: 'raise', label: '대성공',
            callback: (e, b) => ArchmageUtility._completeFeatureRoll(actor, item, 'damage', {
              steps: Number(b.form.steps.value) || 0,
              addDice: Number(b.form.addDice.value) || 0,
              extra: b.form.extra.value,
              critical: true,
              maximize: b.form.maximize.checked
            }) },
          { action: 'cancel', label: '취소' }
        ],
        rejectClose: false
      }).render({ force: true });
    }
  }

  /** 굴림 결과를 feature-roll-card로 출력 (공통) */
  static async _postFeatureRollResult(actor, item, label, rollType, formula) {
    const roll = await new Roll(formula, actor.getRollData()).roll();
    const formulaParts = ArchmageUtility.rollFormulaParts(roll);
    const tokenId = actor.token?.id ?? actor.getActiveTokens?.()?.[0]?.id ?? '';
    const content = await foundry.applications.handlebars.renderTemplate(
      'systems/watersnake-grail-war/templates/chat/feature-roll-card.html',
      { actor, item, formulaParts, total: roll.total, label, rollType, actorId: actor.id, tokenId, ruby: item.system.ruby?.value }
    );
    return ArchmageUtility.createChatMessage({
      speaker: ArchmageUtility.getSpeaker(actor),
      content: content,
      rolls: [roll]
    });
  }

  /**
   * 수정치 배열 → 공식. 활성 수정치(active !== false)만 baseFormula 뒤에 부호 정규화하여 합성.
   * (통합 RollDialog 설계 §3 — modifier 모델 합성기. RollModifier: {label, value, active?, source?})
   * @param {string} baseFormula 예: '1d20' / '2d20kh'
   * @param {Array<{label?:string,value:string|number,active?:boolean}>} modifiers
   * @return {string} 합성된 굴림 공식
   */
  static reduceModifiers(baseFormula, modifiers, { flavor = false } = {}) {
    return (modifiers || []).filter(m => m && m.active !== false).reduce((f, m) => {
      let v = String(m.value ?? '').trim();
      if (!v) return f;
      // flavor=true면 각 항에 [라벨] 부착 → 네이티브 굴림 툴팁이 SWADE처럼 항목명을 표시.
      const fl = (flavor && m.label) ? `[${m.label}]` : '';
      if (v[0] === '+' || v[0] === '-') return `${f} ${v[0]} ${v.slice(1).trim()}${fl}`;
      return `${f} + ${v}${fl}`;
    }, baseFormula);
  }

  /**
   * 평가된 Roll을 SWADE식 formula-list 박스 배열로 분해.
   * 각 항(주사위 결과/숫자/연산자)을 박스로 — 주사위는 SVG배경+min/max마커, hover=flavor 라벨.
   * @return {Array} formulaParts [{op|die|num, result, hint, cls, img}]
   */
  static rollFormulaParts(roll) {
    const T = foundry.dice.terms;
    const haveSvg = [4, 6, 8, 10, 12, 20];
    const parts = [];
    for (const term of (roll?.terms || [])) {
      if (term instanceof T.OperatorTerm) {
        parts.push({ op: true, result: term.operator });
      } else if (term instanceof T.NumericTerm) {
        parts.push({ result: term.number, hint: term.flavor || '' });
      } else if (term instanceof T.DiceTerm) {
        for (const r of (term.results || [])) {
          const cls = [];
          if (r.discarded) cls.push('discarded');
          if (r.result === 1) cls.push('min');
          if (r.result === term.faces) cls.push('max');
          parts.push({
            die: true,
            result: r.result,
            hint: term.flavor ? `${term.flavor} (d${term.faces})` : `d${term.faces}`,
            cls: cls.join(' '),
            img: haveSvg.includes(term.faces) ? `systems/watersnake-grail-war/assets/dice/d${term.faces}-grey.svg` : ''
          });
        }
      } else {
        parts.push({ result: term.total ?? '' });
      }
    }
    return parts;
  }

  /** 보정치를 공식에 안전하게 덧붙임 (+/- 부호 정규화, 주사위/고정 모두 허용) */
  static _appendBonus(formula, extra) {
    if (!extra) return formula;
    let e = String(extra).trim();
    if (!e) return formula;
    if (e.startsWith('+')) return `${formula} + ${e.slice(1).trim()}`;
    if (e.startsWith('-')) return `${formula} - ${e.slice(1).trim()}`;
    return `${formula} + ${e}`;
  }

  /** 기타/피해 굴림 실제 처리 (대화상자 입력값 반영) */
  static async _completeFeatureRoll(actor, item, rollType, opts = {}) {
    const sys = item.system;
    const rollData = actor.getRollData();
    let formula = '';
    let label = '';
    let labelSuffix = '';

    if (rollType === 'misc') {
      formula = sys.misc?.value || '';
      formula = ArchmageUtility._appendBonus(formula, opts.extra);
      label = '기타';
    }
    else if (rollType === 'damage') {
      formula = sys.damage?.value || '';
      let steps = Number(opts.steps) || 0;
      let addDice = Number(opts.addDice) || 0;
      // 대성공: 공격 다이스 1개만 추가(단계/면수는 안 올림)
      if (opts.critical) { addDice += 1; }
      // 첫 주사위 항(NdF)에 개수 추가 / 면수 강화(단계당 +2) 적용
      if (steps !== 0 || addDice !== 0) {
        formula = formula.replace(/(\d+)\s*[dD]\s*(\d+)/, (m, n, f) => {
          const count = Math.max(1, Number(n) + addDice);
          const faces = Math.max(2, Number(f) + 2 * steps);
          return `${count}d${faces}`;
        });
      }
      formula = ArchmageUtility._appendBonus(formula, opts.extra);
      label = '피해';
      const sfx = [];
      if (opts.critical) sfx.push('(대성공)');
      if (opts.maximize) sfx.push('· 최대화');
      labelSuffix = sfx.join(' ');
    }
    else return;

    // 피해 최대화 시 모든 주사위를 최댓값으로 강제 평가
    const roll = new Roll(formula, rollData);
    await roll.evaluate({ maximize: !!opts.maximize });
    const formulaParts = ArchmageUtility.rollFormulaParts(roll);
    const tokenId = actor.token?.id ?? actor.getActiveTokens?.()?.[0]?.id ?? '';
    const content = await foundry.applications.handlebars.renderTemplate(
      'systems/watersnake-grail-war/templates/chat/feature-roll-card.html',
      { actor, item, formulaParts, total: roll.total, label, labelSuffix, rollType, actorId: actor.id, tokenId, ruby: sys.ruby?.value }
    );
    return ArchmageUtility.createChatMessage({
      speaker: ArchmageUtility.getSpeaker(actor),
      content: content,
      rolls: [roll]
    });
  }

  static async show3DDiceForRoll(roll, chatData = null,
                                 chatMsgID = null, user = null, sync = true) {
    if (!roll || !game.dice3d) {
      return;
    }
    if (user == null) {
      user = game.user;
    }
    var hide = chatData?.whisper?.length ? chatData.whisper : null;
    if (hide && game.user.isGM &&
        game.settings.get("watersnake-grail-war", "showPrivateGMAttackRolls") &&
        game.settings.get("core", "rollMode") === "gmroll") {
      hide = null;
    } else if (hide && game.user.isGM && game.settings.get("dice-so-nice", "showGhostDice")) {
      hide = null;
      roll.ghost = true;
    }
    return game.dice3d.showForRoll(
              roll, game.user, sync, hide,
              chatData?.blind && !game.user.isGM,
              chatMsgID, chatData?.speaker);
  }

  /**
   * Get Escalation Die value.
   *
   * @param {object} combat
   *   (Optional) Combat to check the escalation for.
   *
   * @return {int} The escalation die value.
   */
  static getEscalation(combat = null) {
    // Get the current combat if one wasn't provided.
    if (!combat) {
      combat = game.combat;
    }

    // Assume the escalation die is 0 by default.
    let result = 0;

    // Get the escalation value.
    if (combat !== null) {
      // Get the current round.
      let round = combat.current.round;
      if (round == null) {
        round = combat.round;
      }
      // 자작룰: 고조 주사위에 상한 없음. 하한만 0으로 유지.
      // 1라운드(=3턴=Foundry 라운드 3) 경과마다 고조 1 상승.
      if (round < 1) {
        result = 0;
      }
      else {
        result = Math.floor((round - 1) / 3);
      }

      // Get the manual offset for this combat..
      let edOffset = combat.getFlag('watersnake-grail-war', 'edOffset') ?? 0;
      if (edOffset) {
        result = result + edOffset;
        // 상한 없음. 음수만 방지.
        if (result < 0) result = 0;
      }
    }

    // Otherwise, return 0.
    return result;
  }

  /**
   * 자작룰 라운드를 반환. (1라운드 = 3턴 = Foundry 3라운드)
   * 예: Foundry 1~3라운드 → 1, 4~6라운드 → 2. 전투 전이면 0.
   *
   * @param {object} combat
   *   (Optional) 대상 전투. 없으면 현재 전투.
   * @return {number}
   */
  static getGameRound(combat = null) {
    if (!combat) combat = game.combat;
    if (!combat) return 0;
    let round = combat.current?.round ?? combat.round ?? 0;
    if (round < 1) return 0;
    return Math.floor((round - 1) / 3) + 1;
  }

  /**
   * Set the Escalation Die offset for this combat.
   *
   * @param {object} combat
   *   (Optional) Combat to set the escalation die offset for.
   * @param {Boolean} isIncrease
   *   (Optional) If true, increase the esc. die, otherwise decrease it.
   */
  static async setEscalationOffset(combat = null, isIncrease = true) {
    // Get the current combat if one wasn't provided.
    if (!combat) {
      combat = game.combat;
    }

    // Get the escalation value.
    if (combat !== null) {
      // Get the current round.
      let round = combat.current.round;
      if (round == null) {
        round = combat.round;
      }

      // 하한만 유지 (음수 라운드 방지).
      if (round < 0) round = 0;
      // getEscalation과 동일 주기: 3라운드마다 고조 1.
      const base = Math.max(0, Math.floor((round - 1) / 3));

      // Retrieve the escalation die offset for this combat.
      let edOffset = combat.getFlag('watersnake-grail-war', 'edOffset') ?? 0;

      // 자작룰: 고조 상한 없음. 증가는 무제한, 감소는 합계 0까지만.
      if (isIncrease) {
        edOffset++;
      }
      else {
        if (base + edOffset > 0) edOffset--;
      }

      // Update the escalation die offset flag.
      await combat.setFlag('watersnake-grail-war', 'edOffset', edOffset);
    }
  }

  static formatNewItemName(itemType) {
    return game.i18n.format("ARCHMAGE.newItem",
      { item: game.i18n.localize(`ARCHMAGE.${itemType}`) });
  }

  static formatLevel(number) {
    return game.i18n.format("ARCHMAGE.levelFormat",
      { level: ArchmageUtility.ordinalSuffix(number) });
  }

  static ordinalSuffix(number) {
    if (game.i18n.lang !== "en") {
      return number;
    }
    var last = number % 10,
        teens = number % 100;
    if (last == 1 && teens != 11) {
        return number + "st";
    }
    if (last == 2 && teens != 12) {
        return number + "nd";
    }
    if (last == 3 && teens != 13) {
        return number + "rd";
    }
    return number + "th";
  }

  static cleanActiveEffectLabel(label) {
    return label
      .replace("data.attributes", "")
      .replace("system.attributes", "")
      .replace("attack", game.i18n.localize("ARCHMAGE.attack"))
      .replace("AttackMod", game.i18n.localize("ARCHMAGE.attack"))
      .replace("arcane", game.i18n.localize("ARCHMAGE.EFFECT.AE.arcane"))
      .replace("divine", game.i18n.localize("ARCHMAGE.EFFECT.AE.divine"))
      .replace("ranged", game.i18n.localize("ARCHMAGE.ranged"))
      .replace("melee", game.i18n.localize("ARCHMAGE.melee"))
      .replace("bonus", game.i18n.localize("ARCHMAGE.bonus"))
      .replace("md", game.i18n.localize("ARCHMAGE.md.label"))
      .replace("pd", game.i18n.localize("ARCHMAGE.pd.label"))
      .replace("hp", game.i18n.localize("ARCHMAGE.health"))
      .replace("save", game.i18n.localize("ARCHMAGE.save"))
      .replace("disengage", game.i18n.localize("ARCHMAGE.ITEM.disengageBonus"))
      .replace("recoveries", game.i18n.localize("ARCHMAGE.recoveries"))
      .replace("critMod.atk", game.i18n.localize("ARCHMAGE.EFFECT.AE.critHitBonus"))
      .replace("critMod.def", game.i18n.localize("ARCHMAGE.EFFECT.AE.critHitDefense"))
      .replace("value", "")
      .replaceAll(".", " ")
      .replace("ac ", game.i18n.localize("ARCHMAGE.ac.label"));
  }

  static getActiveEffectLabelIcon(label) {

    if (label.includes(game.i18n.localize("ARCHMAGE.EFFECT.AE.arcane"))) {
      return "fas fa-magic";
    }
    if (label.includes(game.i18n.localize("ARCHMAGE.EFFECT.AE.divine"))) {
      return "fas fa-praying-hands";
    }
    if (label.includes(game.i18n.localize("ARCHMAGE.ranged"))) {
      return "fas fa-bullseye";
    }
    if (label.includes(game.i18n.localize("ARCHMAGE.melee"))) {
      return "fas fa-fist-raised";
    }
    if (label.includes(game.i18n.localize("ARCHMAGE.health"))) {
      return "fas fa-heart";
    }
    if (label.includes(game.i18n.localize("ARCHMAGE.save"))) {
      return "fas fa-dice-d20";
    }
    if (label.includes(game.i18n.localize("ARCHMAGE.ITEM.disengageBonus"))) {
      return "fas fa-running";
    }
    if (label.includes(game.i18n.localize("ARCHMAGE.recoveries"))) {
      return "fas fa-medkit";
    }
    if (label.includes(game.i18n.localize("ARCHMAGE.EFFECT.AE.critHitBonus"))) {
      return "fas fa-crosshairs";
    }
    if (label.includes(game.i18n.localize("ARCHMAGE.ac.label"))) {
      return "fas fa-shield-alt";
    }
    if (label.includes(game.i18n.localize("ARCHMAGE.md.label"))) {
      return "fas fa-shield-alt";
    }
    if (label.includes(game.i18n.localize("ARCHMAGE.pd.label"))) {
      return "fas fa-shield-alt";
    }
    if (label.includes(game.i18n.localize("ARCHMAGE.EFFECT.AE.critHitDefense"))) {
      return "fas fa-shield-alt";
    }

    // Last because they are generic and might match other labels
    if (label.includes(game.i18n.localize("ARCHMAGE.attack"))) {
      return "fas fa-sword";
    }
    if (label.includes(game.i18n.localize("ARCHMAGE.bonus"))) {
      return "fas fa-sparkles";
    }

    return "fas fa-question";
  }

  static localizeEquipmentBonus(bonusProp) {
    const keys = [
      "ARCHMAGE." + bonusProp.toLowerCase() + "Short",
      "ARCHMAGE." + bonusProp.toLowerCase(),
      "ARCHMAGE." + bonusProp.toLowerCase() + ".key"
    ];
    for (const key of keys) {
      if (game.i18n.localize(key) !== key) {
        return game.i18n.localize(key);
      }
    }
    return bonusProp;
  }

  static fixVuePopoutBug() {
    // Workaround for upstream Vue bug:
    // https://gitlab.com/asacolips-projects/foundry-mods/archmage/-/issues/177
    // Remove once Vue fixed event handling in iframes/windows.
    Hooks.on("PopOut:popout", async function (app, popout) {
      const handler = (e) => {
        Object.defineProperty(e, "timeStamp", { get: () => performance.now() })
      }
      const events = Object.keys(window).filter(name => name.substring(0, 2) == 'on').map(name => name.substring(2));
      events.forEach((name) => popout.addEventListener(name, handler, true));
    });
  }

  /**
   * Formats localized tooltip text, taking one or more localization keys,
   * similar to game.i18n.localize(). 'ARCHMAGE.TOOLTIP.' is prepended to
   * each key.
   * If 2nd edition support is enabled, first the key with 'V2' appended is
   * looked up, if that doesn't exist, the normal key is used.
   * If multiple keys are given, the localization texts are
   * appended as separate paragraphs.
   * The last argument can be a format dict, as given to game.i18n.format(),
   * in which case that formatting data is provided for all single keys.
   * Examples:
   *
   * tooltip('charisma')
   *   "ARCHMAGE.TOOLTIP.charisma" is looked up.
   *   If 2nd edition is enabled, "ARCHMAGE.TOOLTIP.charismaV2" is used if found,
   *   falling back to the above if it doesn't exist.
   * tooltip('attributes', 'charisma')
   *   As above, but both keys are looked up and appended as paragraphs.
   * tooltip('attributes', 'charisma', {itemData: data})
   *   As above, but the given format data is inserted for each separate key.
   */
  static tooltip(...keys) {
    if (!game.settings.get("watersnake-grail-war", "sheetTooltips")) {
      return undefined;
    }

    const keyPrefix = "ARCHMAGE.TOOLTIP.";

    var format = {};
    var out = "";

    if (!keys || !Array.isArray(keys) || keys.length < 1) {
      return out;
    }

    // Last element may be format dict, check and handle accordingly
    if (keys.length > 1 && keys[keys.length -1].constructor == Object) {
      format = keys.pop();
    }

    for (const key of keys) {
      var val = game.i18n.format(keyPrefix + key, format);

      out += "\n" + val.trim();
    }

    // Some formatting for Foundry's tooltips
    out = out.trim().replaceAll("\r\n", "<br><br>").replaceAll("\n", "<br><br>");
    out = "<p style=\"text-align: left; margin: 0;\">" + out + "</p>";

    return out;
  }

  static getSpeaker(actor) {
    const speaker = ChatMessage.getSpeaker({actor});
    if (!actor) return speaker;
    let token = actor.token;
    if (!token) token = actor.getActiveTokens()[0];
    if (token) {
      speaker.alias = token.name;
    } else {
      if (actor.prototypeToken) {
        speaker.alias = actor.prototypeToken.name;
      }
    }
    return speaker
  }

}

/**
 * Class that defines utility methods for macros.
 * IMPORTANT: this class is used in (possibly user-defined) macros, handle any changes with care.
 */
export class MacroUtils {
  /**
   * Generate durations for active effects
   */
  static setDuration(data, duration, options={}) {
    // Assign by level to avoid weird issues with str path accessor
    if (!data.flags?.['watersnake-grail-war']?.duration) data.flags = {archmage: {duration: "Unknown"}};
    switch(duration) {
      case CONFIG.HOLYGRAILWAR.effectDurationTypes.StartOfNextTurn:
      case "StartOfNextTurn":
        data.flags['watersnake-grail-war'].duration = "StartOfNextTurn";
        break;
      case CONFIG.HOLYGRAILWAR.effectDurationTypes.EndOfNextTurn:
      case "EndOfNextTurn":
        data.flags['watersnake-grail-war'].duration = "EndOfNextTurn";
        break;
      case CONFIG.HOLYGRAILWAR.effectDurationTypes.StartOfNextSourceTurn:
      case "StartOfNextSourceTurn":
        data.flags['watersnake-grail-war'].duration = "StartOfNextSourceTurn";
        data.origin = options.sourceTurnUuid;
        break;
      case CONFIG.HOLYGRAILWAR.effectDurationTypes.EndOfNextSourceTurn:
      case "EndOfNextSourceTurn":
        data.flags['watersnake-grail-war'].duration = "EndOfNextSourceTurn";
        data.origin = options.sourceTurnUuid;
        break;
      case CONFIG.HOLYGRAILWAR.effectDurationTypes.EasySaveEnds:
      case "EasySaveEnds":
        data.flags['watersnake-grail-war'].duration = "EasySaveEnds";
        break;
      case CONFIG.HOLYGRAILWAR.effectDurationTypes.NormalSaveEnds:
      case "NormalSaveEnds":
        data.flags['watersnake-grail-war'].duration = "NormalSaveEnds";
        break;
      case CONFIG.HOLYGRAILWAR.effectDurationTypes.HardSaveEnds:
      case "HardSaveEnds":
        data.flags['watersnake-grail-war'].duration = "HardSaveEnds";
        break;
      case CONFIG.HOLYGRAILWAR.effectDurationTypes.EndOfCombat:
      case "EndOfCombat":
        data.flags['watersnake-grail-war'].duration = "EndOfCombat";
        break;
      case CONFIG.HOLYGRAILWAR.effectDurationTypes.Infinite:
      case "Infinite":
        data.flags['watersnake-grail-war'].duration = "Infinite";
        break;
      case CONFIG.HOLYGRAILWAR.effectDurationTypes.Unknown:
      case "Unknown":
        data.flags['watersnake-grail-war'].duration = "Unknown";
        break;
      case CONFIG.HOLYGRAILWAR.effectDurationTypes.StartOfEachTurn:
      case "StartOfEachTurn":
        data.flags['watersnake-grail-war'].duration = "StartOfEachTurn";
        break;
      case CONFIG.HOLYGRAILWAR.effectDurationTypes.EndOfArc:
      case "EndOfArc":
        data.flags['watersnake-grail-war'].duration = "EndOfArc";
        break;
      case CONFIG.HOLYGRAILWAR.effectDurationTypes.EndOfRound:
      case "EndOfRound":
        data.flags['watersnake-grail-war'].duration = "EndOfRound";
        data.flags['watersnake-grail-war'].endRound = options.round;
        break;
      default:
        console.warn("Unknown duration ", duration);
    }
    // Set Foundry core duration to make the thing appear on tokens
    if (data.flags['watersnake-grail-war'].duration != "Infinite") {
        data['duration'] = {
          rounds: 999,
          turns: 999
        }
    }

    return data;
  }

  /**
   * Select all feats of a specific tier
   */
  static getFeatsByTier(item, tier) {
    let res = [];
    if (!item.system.feats) return res;
    for (let feat of Object.values(item.system.feats)) {
      if (feat.tier.value == tier) res.push(feat);
    }
    return res;
  }

  /**
   * Select all allies - approximated by all linked actors in combat
   * If selfUuid is set it excludes the specified actor, otherwise it includes all linked tokens
   */
  static getAllies(selfUuid="") {
    let res = [];
    if (!game.combat) return res;
    const combatants = [...game.combat.combatants.values()];
    combatants.forEach(c => {
      if ((c.token.isLinked || c.token.disposition == CONST.TOKEN_DISPOSITIONS.FRIENDLY) && c.token.actor.uuid != selfUuid) {
        res.push(c.token);
      }
    });
    return res;
  }

  /**
   * Create one or more AEs on a set of tokens - via a message to the GM's account to bypass
   * persmissions if needed.
   */
  static applyActiveEffectsToTokens(tokens, effects) {
    if (!game.user.isGM) {
      game.socket.emit('system.archmage', {
        type: 'createAEs',
        actorIds: tokens.map(t => t.actorId),
        effects: effects
      });
    } else {
      tokens.forEach(t => {
        t.actor.createEmbeddedDocuments("ActiveEffect", effects);
      });
    }
  }

  /**
   * Scale dice up one size
   */
  static scaleDiceUp(expr) {
    switch(expr) {
      case "d4": return "d6";
      case "d6": return "d8";
      case "d8": return "d10";
      case "d10": return "d12";
      case "d12": return "2d6";
      case "2d6": return "2d8";
      case "2d8": return "2d10";
      default: return expr;
    }
  }
}

