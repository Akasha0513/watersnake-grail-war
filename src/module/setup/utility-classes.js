

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

    // 능력치 판정: 시트 능력치 굴림과 동일한 배경 판정 대화상자(해당 능력치 프리셋)
    if (rollType === 'trait') {
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
      return new foundry.applications.api.DialogV2({
        window: { title: `${item.name} — 피해 굴림` },
        content: `<div style="display:flex;flex-direction:column;gap:6px;">
            <div class="form-group"><label>강화 단계</label><input name="steps" type="number" value="0"></div>
            <div class="form-group"><label>개수 추가</label><input name="addDice" type="number" value="0"></div>
            <div class="form-group"><label>추가 보정</label><input name="extra" type="text" placeholder="예: 1d6, +3"></div>
          </div>`,
        buttons: [
          { action: 'roll', label: '피해 굴림', default: true,
            callback: (e, b) => ArchmageUtility._completeFeatureRoll(actor, item, 'damage', {
              steps: Number(b.form.steps.value) || 0,
              addDice: Number(b.form.addDice.value) || 0,
              extra: b.form.extra.value
            }) },
          { action: 'cancel', label: '취소' }
        ],
        rejectClose: false
      }).render({ force: true });
    }
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

    if (rollType === 'misc') {
      formula = sys.misc?.value || '';
      formula = ArchmageUtility._appendBonus(formula, opts.extra);
      label = '기타';
    }
    else if (rollType === 'damage') {
      formula = sys.damage?.value || '';
      const steps = Number(opts.steps) || 0;
      const addDice = Number(opts.addDice) || 0;
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
    }
    else return;

    const roll = await new Roll(formula, rollData).roll();
    const rollHtml = await roll.render();
    const tokenId = actor.token?.id ?? actor.getActiveTokens?.()?.[0]?.id ?? '';
    const content = await foundry.applications.handlebars.renderTemplate(
      'systems/watersnake-grail-war/templates/chat/feature-roll-card.html',
      { actor, item, rollHtml, label, rollType, actorId: actor.id, tokenId, ruby: sys.ruby?.value }
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

  static async updateCompendiums() {
    let pack = game.packs.get('watersnake-grail-war.monsters-core');
    let monsters = pack ? await pack.getContent() : null;

    if (monsters) {
      for (let actor of monsters) {
        let name = actor.name.toLowerCase();
        let update = {};

        // Handle size.
        let size = '';
        for (let [key, value] of Object.entries(CONFIG.HOLYGRAILWAR.creatureSizes)) {
          size += size == '' ? key : `|${key}`;
        }
        let sizeRegex = new RegExp(size);
        let sizeMatch = name.match(sizeRegex);
        if (sizeMatch && sizeMatch[0]) {
          update['system.details.size.value'] = sizeMatch[0];
          if (sizeMatch[0] == 'large') {
            update['prototypeToken.width'] = 2;
            update['prototypeToken.height'] = 2;
          }
          else if (sizeMatch[0] == 'huge') {
            update['prototypeToken.width'] = 3;
            update['prototypeToken.height'] = 3;
          }
        }
        else {
          update['system.details.size.value'] = 'normal';
        }
        // Handle role.
        let role = '';
        for (let [key, value] of Object.entries(CONFIG.HOLYGRAILWAR.creatureRoles)) {
          role += role == '' ? key : `|${key}`;
        }
        let roleRegex = new RegExp(role);
        let roleMatch = name.match(roleRegex);
        if (roleMatch && roleMatch[0]) {
          update['system.details.role.value'] = roleMatch && roleMatch[0];
        }
        // Handle type.
        let type = '';
        for (let [key, value] of Object.entries(CONFIG.HOLYGRAILWAR.creatureTypes)) {
          type += type == '' ? key : `|${key}`;
        }
        let typeRegex = new RegExp(type);
        let typeMatch = name.match(typeRegex);
        if (typeMatch && typeMatch[0]) {
          update['system.details.type.value'] = typeMatch[0];
        }
        if (Object.keys(update).length > 0) {
          update['_id'] = actor._id;
          update['name'] = actor.name.replace(/( |)\[.*\]/g, '');
          await pack.updateEntity(update);
        }
      };
    }
  }

  // Formats a list of matched classes like ['wizard', 'chaosmage'] for display,
  // returning a string like "Wizard, Chaos Mage"
  static formatClassList(classes) {
    if (!classes || classes.length < 1) {
      return "";
    }
    var out = [];
    for (let i = 0; i < classes.length; ++i) {
      const readable = CONFIG.HOLYGRAILWAR.classList[classes[i]];
      if (readable) {
        out.push(readable);
      }
    }
    return out.join(", ");
  }

  // Inverts a given object/map (switching keys and values) and sorts it by key length
  static invertMapAndSortByKeyLength(map) {
    var newMap = new Map();
    // Swap keys with values
    for (const key in map) {
      const value = map[key];
      newMap.set(value, key);
    }
    // Sort by key length
    newMap = new Map([...newMap.entries()].sort((a, b) => {
      return b[0].length - a[0].length;
    }));
    return newMap;
  }

  static prepareClassInputForDetection(input) {
    if (game.i18n.lang === "en") {
      return input;
    }

    const classNames = ArchmageUtility.invertMapAndSortByKeyLength(CONFIG.HOLYGRAILWAR.classList);
    var output = input.toLowerCase();
    for (const [key, value] of classNames) {
      output = output.replaceAll(key.toLowerCase(), value);
    }

    return output;
  }

  // Find known classes
  static detectClasses(className) {
    className = ArchmageUtility.prepareClassInputForDetection(className);
    let classList = Object.keys(CONFIG.HOLYGRAILWAR.classList);
    let classRegex = new RegExp(classList.join('|'), 'g');
    className = className ? className.toLowerCase().replace(/[^a-zA-z\d]/g, '') : '';
    let matchedClasses = className.match(classRegex);
    if (matchedClasses !== null) matchedClasses = [...new Set(matchedClasses)].sort();
    return matchedClasses;
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

    const isSecondEdition = game.settings.get('watersnake-grail-war', 'secondEdition');
    const keyPrefix = "ARCHMAGE.TOOLTIP.";
    const secondEditionSuffix = "V2";

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
      var val = "";

      val = game.i18n.format(keyPrefix + key + secondEditionSuffix, format);
      if (!isSecondEdition || val.startsWith(keyPrefix)) {
        val = game.i18n.format(keyPrefix + key, format);
      }

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

  /**
   * Parses a given string and conver to an inline roll if possible.
   *
   * @param {string} pastedText String that can potentially include inline rolls,
   *   such as "+7 vs AC".
   * @param {object} options Additional options to modify the logic, such as
   *   specifying options.attack to denote this is an attack roll.
   * @returns {string} Parsed text with inline rolls, such as "[[d20+7]] vs AC"
   */
  static parseClipboardText(pastedText, options={}) {
    // Exit early for rolls that already include inline rolls.
    if (pastedText.includes('[[') || pastedText.includes(']]')) return pastedText;
    // Handle options.
    if (options.field?.includes('attack')) {
      options.attack = true;
    }
    if (options.field?.includes('hit')) {
      options.damage = true;
    }
    // Remove unnecessary newlines common to PDFs.
    let parsedText = pastedText.replace(/-[\r\n]+([^.])/g, '-$1'); // Hyphens get collapsed
    parsedText = pastedText.replace(/[\r\n]+([^.])/g, ' $1'); // Other newlines get replaced with spaces
    // Do a pass to turn rolls like "Natural 16+" or "Easy Save, 6+" into
    // "Natural __16__" and "Easy Save, __6__". It's messy, but it
    // prevents false positives in later steps.
    parsedText = parsedText.replace(/([^\dd\+\-])(\d+)(\+)/g, (match, prefix, number, suffix) => {
      // We can ignore the suffix, as we just want to make sure it exists and can
      // reconstruct it later since we know it's a "+" sign.
      return `${prefix}__${number}__`;
    });
    // Handle weapons and attributes.
    const attrs = [
      'strength','str(?![a-z\\d])',
      'dexterity','dex(?![a-z\\d])',
      'constitution','con(?![a-z\\d])',
      'intelligence','int(?![a-z\\d])',
      'wisdom','wis(?![a-z\\d])',
      'charisma','cha(?![a-z\\d])',
      'level(?!s)',
      'weapon',
      'escalation die',
    ];
    // Matches the above list, but also checks for "nth" and so on as a prefix to
    // avoid turning "4th level" and so on into "4th @lvl".
    const attrsRegex = new RegExp(`((?:(?:\\d+th)|(?:breath)|(?:triple-|double-))*\\s*)(${attrs.join('|')})`, 'gi');
    parsedText = parsedText.replace(attrsRegex, (match, prefix, attr) => {
      const cleaned = attr.trim().toLocaleLowerCase();
      if (cleaned === 'weapon') {
        return !prefix.match(/breath/gi) ? '@wpn.m.dice' : match;
      }
      if (cleaned === 'level') {
        return !prefix.match(/\d+th|\d+nd|\d+rd|\d+st/gi)
          ? (options.attack ? '@std' : '@lvl')
          : match;
      }
      if (cleaned === 'escalation die') {
        return '@ed';
      }
      if (cleaned === 'strength') {
        if (prefix.match(/triple-|double-/gi)) return match;
      }
      return options.damage
        ? `@${cleaned.slice(0,3)}.dmg`
        : `@${cleaned.slice(0,3)}.mod`;
    });
    /**
     * Do a pass to turn likely dice rolls into inline rolls.
     *
     * This pattern basically tries to do (save rolls)* (Natural n+)* (+)* (dice formula) ( vs)*
     *
     * The reason that works is that if we detect either a save roll or no dice roll, we
     * just exit early and return the match. If we detect a natural trigger, we place it in its
     * own group so that the dice formula doesn't pick it up. If we detected a preceding + sign,
     * we note it so that we can avoid "++" when preprending a d20 later. If we detect a dice
     * formula, we wrap the whole thing in [[diceFormula]]. If we detect " vs", this is an attack
     * roll and we need to prepend a "d20" to the front.
     *
     * This will still have some funky aspects to it, like outputing "[[d20+9]] vs AC ( [[3]] attacks)".
     * To get around that, we'll have another pass later that tries to clean up unexpected spaces.
     */
    parsedText = parsedText.replace(/((?:Natural\s*\d+\+*)*)([\+\-]*)((?:\s*(?:(?:d*\d+(?!\d*_))|@[a-z\.]+)[x\s\+\-]*)+(?!\d*th|\d*nd|\d*rd|\d*st))((?:\s*vs)*)/gi, (
      match,
      naturalTrigger,
      startingOperator,
      diceFormula,
      vs
    ) => {
      if (!diceFormula) return match;
      let d20 = startingOperator ? 'd20' : 'd20+';
      return `${naturalTrigger} [[${vs ? d20 : ''}${startingOperator}${diceFormula.trim()}]] ${vs}`;
    });
    // Fix multiplication.
    parsedText = parsedText.replace(/(\[\[)([^\[\]]*)(\]\])/gi, (match, prefix, formula, suffix) => {
      return `${prefix}${formula.replace(/x(?:(?![a-z\.]))/gi, ' * ')}${suffix}`;
    });
    // Do a pass to restore save numbers from the "__{n}__" format.
    parsedText = parsedText.replace(/(__)(\d+)(__)/g, (match, prefix, number, suffix) => {
      return `${number}+`;
    });
    // Handle conditions.
    const conditionRegex = new RegExp(`(\\s)(${CONFIG.HOLYGRAILWAR.statusEffects.map(c => c.id).join('|')})([^a-z\\d])`, 'gi');
    parsedText = parsedText.replace(conditionRegex, (match, prefix, condition, suffix) => {
      return `${prefix}*${condition}*${suffix}`;
    });
    // Return the trimmed and cleaned string.
    return parsedText.replace('( ', '(')
      .replace(' )', ')')
      .replace('.]]', ']].')
      .replace(/ +/g, ' ')
      .replace(/\s*\++\s*/g, '+')
      .trim();
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

/**
 * Keyboard Controls Reference Sheet
 * @type {Application}
 */
export class ArchmageReference extends Application {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.title = "능력치 및 인라인 굴림 참조"
    options.id = "archmage-help";
    options.template = "systems/watersnake-grail-war/templates/sidebar/apps/archmage-help.html";
    options.width = 820;
    return options;
  }
}
