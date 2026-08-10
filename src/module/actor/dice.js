export class DiceArchmage {

  /**
   * A standardized helper function for managing core "d20 rolls"
   *
   * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
   * This chooses the default options of a normal attack with no bonus,
   * Advantage, or Disadvantage respectively
   *
   * @param {Event} event The triggering event which initiated the roll
   * @param {Array} terms The dice roll component terms, excluding the initial
   *    d20
   * @param {Object} data Actor or item data against which to parse the roll
   * @param {String} template       The HTML template used to render the roll
   *    dialog
   * @param {String} title          The dice roll UI window title
   * @param {String} alias          The alias with which to post to chat
   * @param {Function} flavor       A callable function for determining the chat
   *    message flavor given terms and data
   * @param {Boolean} advantage     Allow rolling with advantage (and therefore
   *    also with disadvantage)
   * @param {Boolean} situational   Allow for an arbitrary situational bonus
   *    field
   * @param {Boolean} highlight     Highlight critical successes and failures
   * @param {Boolean} fastForward   Allow fast-forward advantage selection
   * @param {Function} onClose      Callback for actions to take when the dialog
   *    form is closed
   * @param {Object} dialogOptions  Modal dialog options
   *
   * @return {undefined}
   */
  static d20Roll({
    event,
    terms,
    data,
    template,
    abilities,
    backgrounds,
    title,
    alias,
    actor,
    ability,
    background,
    flavor,
    advantage = true,
    situational = 0,
    highlight = true,
    fastForward = true,
    onClose,
    dialogOptions
  }) {

    if (!dialogOptions) {
      dialogOptions = {
        width: 420
      };
    }

    // Inner roll function
    let rollMode = game.settings.get("core", "rollMode");
    let rolled = false;
    let roll = async (html = null, data = {}) => {
      let flav = (flavor instanceof Function) ? flavor(terms, data) : title;

      // Don't include situational bonus unless it is defined
      if (!data.bonus && terms.indexOf('@bonus') !== -1) {
        terms.pop();
      }

      // Handle combat advantage.
      if (adv === 1) {
        terms[0] = ['2d20kh'];
        flav = `${title} (Advantage)`;
      }
      else if (adv === -1) {
        terms[0] = ['2d20kl'];;
        flav = `${title} (Disadvantage)`;
      }

      if (situational != 0) {
        terms.push(situational);
        flav = `${title} (${situational > 0 ? '+' + situational : situational})`;
      }

      let form = html ? html.find('form')[0] : null;
      rollMode = form ? form.rollMode.value : rollMode;

      // Execute the roll
      let roll = new Roll(terms.join('+'), data);
      await roll.evaluate();

      // Grab the template.
      const template = `systems/watersnake-grail-war/templates/chat/skill-check-card.html`;
      const token = actor.token;

      // Prepare chat data for the template.
      const chatData = {
        user: game.user.id,
        roll: roll,  // TODO: fix template to use rolls prop
        rolls: [roll],
        speaker: game.holygrailwar.ArchmageUtility.getSpeaker(actor)
      };

      // Foundry 기본 굴림 렌더링 (주사위 아이콘 + 접이식 툴팁)
      const rollHTML = await roll.render();

      // Prepare template data.
      const templateData = {
        actor: actor,
        tokenId: token ? `${token.id}` : null,
        ability: {
          name: data.abilityName ?? null,
          bonus: data.abil ?? 0,
          rank: ((m) => m >= 7 ? 'EX' : m >= 5 ? 'A' : m >= 4 ? 'B' : m >= 3 ? 'C' : m >= 2 ? 'D' : m >= 1 ? 'E' : '-')(Number(data.abil) || 0)
        },
        background: {
          name: data.backgroundName ?? null,
          bonus: data.bg ?? 0
        },
        rollHTML: rollHTML,
        data: chatData
      };

      // Render the template.
      foundry.applications.handlebars.renderTemplate(template, templateData).then(content => {
        chatData.content = content;
        game.holygrailwar.ArchmageUtility.createChatMessage(chatData, { rollMode: rollMode });
      });
    };

    // Modify the roll and handle fast-forwarding
    let adv = 0;
    terms = ['1d20'].concat(terms);
    if (event?.shiftKey) {
      return roll(null, data);
    }
    else if (event?.altKey) {
      adv = 1;
      return roll(null, data);
    }
    else if (event?.ctrlKey || event?.metaKey) {
      adv = -1;
      return roll(null, data);
    }
    else {
      terms = terms.concat(['@bonus']);
    }

    // Render modal dialog
    template = template ||
      'systems/watersnake-grail-war/templates/chat/roll-dialog.html';
    let dialogData = {
      formula: terms.join(' + '),
      data: data,
      abilityCheck: data.abilityCheck ?? true,
      backgroundCheck: data.backgroundCheck ?? false,
      defaultAbility: false,
      defaultRollMode: rollMode,
      abilities: abilities ?? {},
      backgrounds: backgrounds ?? {},
      rollModes: CONFIG.Dice.rollModes
    };

    // If this is a background check, default to the highest ability score.
    if (data.backgroundCheck) {
      let highestAbility = -5;
      for (let ability of Object.values(abilities)) {
        if (Number(ability.mod) > highestAbility) {
          highestAbility = Number(ability.mod);
        }
      }
      dialogData.defaultAbility = highestAbility;
    }

    foundry.applications.handlebars.renderTemplate(template, dialogData).then(dlg => {
      new Dialog({
        title: title,
        content: dlg,
        buttons: {
          disadvantage: {
            label: game.i18n.localize("ARCHMAGE.rollDisadvantageShort"),
            callback: () => {
              adv = -1;
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
          pen2: {
            label: '-2',
            callback: () => {
              situational = -2;
              rolled = true;
            }
          },
          normal: {
            label: game.i18n.localize("ARCHMAGE.rollNormal"),
            callback: () => {
              rolled = true;
            }
          },
          bon2: {
            label: '+2',
            callback: () => {
              situational = 2;
              rolled = true;
            }
          },
          bon4: {
            label: '+4',
            callback: () => {
              situational = 4;
              rolled = true;
            }
          },
          advantage: {
            label: game.i18n.localize("ARCHMAGE.rollAdvantageShort"),
            callback: () => {
              adv = 1;
              rolled = true;
            }
          }
        },
        default: 'normal',
        close: html => {
          if (onClose) {
            onClose(html, terms, data);
          }
          if (rolled) {
            rollMode = html.find('[name="rollMode"]').val();
            data['bonus'] = html.find('[name="bonus"]').val();
            if (data.abilityCheck) {
              data['bg'] = html.find('[name="background"]').val();
              data['backgroundName'] = Number(data['bg']) > 0 ? html.find('[name="background"] option:selected').text() : null;
            }
            if (data.backgroundCheck) {
              data['abil'] = html.find('[name="ability"]').val();
              data['abilityName'] = !isNaN(Number(data['abil'])) ? html.find('[name="ability"] option:selected').data('label') : null;
            }
            roll(html, data);
          }
        }
      }, dialogOptions).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * A standardized helper function for managing core "d20 rolls"
   *
   * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
   * This chooses the default options of a normal attack with no bonus,
   * Critical, or no bonus respectively
   *
   * @param {Event} event The triggering event which initiated the roll
   * @param {Array} terms The dice roll component terms, excluding the initial
   *    d20
   * @param {Object} data Actor or item data against which to parse the roll
   * @param {String} template The HTML template used to render the roll dialog
   * @param {String} title The dice roll UI window title
   * @param {String} alias The alias with which to post to chat
   * @param {Function} flavor A callable function for determining the chat
   *    message flavor given terms and data
   * @param {Boolean} critical Allow critical hits to be chosen
   * @param {Boolean} situational Allow for an arbitrary situational bonus field
   * @param {Boolean} fastForward Allow fast-forward advantage selection
   * @param {Function} onClose Callback for actions to take when the dialog form
   *    is closed
   * @param {Object} dialogOptions Modal dialog options
   *
   * @return {undefined}
   */
  static damageRoll({
    event,
    terms,
    data,
    template,
    title,
    alias,
    flavor,
    critical = true,
    situational = true,
    fastForward = true,
    onClose,
    dialogOptions
  }) {

    // Inner roll function
    let rollMode = 'roll';
    let roll = () => {
      let roll = new Roll(terms.join('+'), data);
      let flav = (flavor instanceof Function) ? flavor(terms, data) : title;
      if (crit) {
        roll.alter(0, 2);
        flav = `${title} (Critical)`;
      }

      // Execute the roll and send it to chat
      roll.toMessage({
        alias: alias,
        flavor: flav,
        rollMode: rollMode
      });

      // Return the Roll object
      return roll;
    };

    // Modify the roll and handle fast-forwarding
    let crit = 0;
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      return roll();
    }
    else if (event.altKey) {
      crit = 1;
      return roll();
    }
    else {
      terms = terms.concat(['@bonus']);
    }

    // Construct dialog data
    template = template ||
      'systems/watersnake-grail-war/templates/chat/roll-dialog.html';
    let dialogData = {
      formula: terms.join(' + '),
      data: data,
      rollModes: CONFIG.Dice.rollModes
    };

    // Render modal dialog
    return new Promise(resolve => {
      foundry.applications.handlebars.renderTemplate(template, dialogData).then(dlg => {
        new Dialog({
          title: title,
          content: dlg,
          buttons: {
            critical: {
              condition: critical,
              label: 'Critical Hit',
              callback: () => crit = 1
            },
            normal: {
              label: critical ? 'Normal' : 'Roll',
            },
          },
          default: 'normal',
          close: html => {
            if (onClose) {
              onClose(html, terms, data);
            }
            rollMode = html.find('[name="rollMode"]').val();
            data['bonus'] = html.find('[name="bonus"]').val();
            data['background'] = html.find('[name="background"]').val();
            resolve(roll());
          }
        }, dialogOptions).render(true);
      });
    });
  }

  static async BackgroundRoll (
    actor,
    { defaultBackground = null, defaultAbility = null, fixedBonus = null, title = null, extraTags = [], abilitySelect = true }
  ) {
    const formatBonus = bonus => (bonus >= 0 ? `+${bonus}` : `${bonus}`)
    const abilities = Object.entries(actor.system.abilities).map(([key, ability]) => ({
      key,
      label: game.i18n.localize(`ARCHMAGE.${key}.label`),
      bonus: formatBonus(ability.mod)
    }))
    const backgrounds = Object.entries(actor.system.backgrounds)
      .filter(([_, bg]) => bg.bonus.value || bg.name.value)
      .map(([key, bg]) => ({ key, label: bg.name.value, bonus: formatBonus(bg.bonus.value) }))

    // 통합 RollDialog(Phase 2)로 위임. 실제 굴림·카드는 _completeBackgroundRoll 재사용.
    const { GrailRollDialog } = await import('./grail-roll-dialog.js')
    return GrailRollDialog.asPromise({
      actor,
      abilities,
      backgrounds,
      defaultAbility,
      fixedBonus,
      extraTags,
      abilitySelect,
      title: title ?? game.i18n.localize('ARCHMAGE.checkBackground')
    })
  }

  static async _completeBackgroundRoll ({
    actor,
    selection,
    situationalBonus,
    abilityKey,
    backgrounds = [],
    rollMode,
    fixedBonus = null,
    critExpand = 0,
    fumbleExpand = 0,
    critExpandBonus = 0,
    fumbleExpandBonus = 0,
    extraMods = []
  }) {
    // 수정치 배열로 조립 (통합 RollDialog 모델 §3). base = d20(유리/불리 단계), 나머지는 modifier.
    let base
    if (selection === 'adv2') base = '3d20kh'                                       // 유리 2
    else if (selection === 'adv1' || selection === 'advantage') base = '2d20kh'     // 유리 1
    else if (selection === 'dis2') base = '3d20kl'                                  // 불리 2
    else if (selection === 'dis1' || selection === 'disadvantage') base = '2d20kl'  // 불리 1
    else base = '1d20'                                                              // 일반

    const mods = []
    // feature '판정 직접'(rollCustom) 고정 보정
    if (fixedBonus) mods.push({ label: '직접', value: String(fixedBonus), source: 'custom' })
    // 능력치 수정치
    const ability = actor.system.abilities[abilityKey]
    if (ability) mods.push({ label: game.i18n.localize(`ARCHMAGE.${abilityKey}.label`), value: `@${abilityKey}.mod`, source: 'ability' })
    // 영령의 급(@grade)은 대화상자의 토글 수정치로 이동 → extraMods로 들어옴(아래).
    // 고조(유효치≠0일 때 — 음수 보정·반전도 행 표시). 라벨에 전장 원값 병기, 실제 굴림 값은 @ed(굴림 시점 해석).
    // 커스텀 판정(fixedBonus)은 미가산(필요 시 판정 직접 칸에 @ed 직접 입력).
    const edEff = Number(actor.system.attributes?.escalation?.effective ?? 0)
    if (!fixedBonus && edEff !== 0) mods.push({ label: `고조 (전장 ${Number(actor.system.attributes?.escalation?.value) || 0})`, value: '@ed', source: 'ed' })
    // 배경(여러 개 합산, 배경마다 난수 가능)
    const bgLabels = []
    for (const bg of (backgrounds || [])) {
      const b = actor.system.backgrounds?.[bg.key]
      if (!b) continue
      const val = Number(b.bonus?.value) || 0
      if (val < 1) continue
      if (bg.random) {
        mods.push({ label: b.name?.value || '배경', value: `1d${val}`, source: 'background' })
        bgLabels.push(`${b.name?.value || '배경'}(1d${val})`)
      } else {
        mods.push({ label: b.name?.value || '배경', value: `${val}`, source: 'background' })
        bgLabels.push(`${b.name?.value || '배경'} +${val}`)
      }
    }
    const backgroundLabel = bgLabels.join(', ')
    // 아이템 능력치 보너스
    if (ability && ability.bonus) mods.push({ label: '아이템', value: `@${abilityKey}.bonus`, source: 'item' })
    // 추가 수정치(통합 대화상자의 커스텀/프리셋/자동주입)
    for (const m of (extraMods || [])) {
      if (m && m.active !== false && m.value !== undefined && String(m.value) !== '') {
        mods.push({ label: m.label || '보정', value: String(m.value), source: m.source || 'custom' })
      }
    }
    // 상황 보정
    if (situationalBonus) mods.push({ label: '상황 보정', value: String(situationalBonus), source: 'situational' })

    // 수정치 접기 표시용(라벨 + 표시값). @-참조는 rollData로 해석.
    const rd = actor.getRollData()
    const signed = n => (Number(n) >= 0 ? `+${Number(n)}` : `${Number(n)}`)
    const dispOf = (val) => {
      const s = String(val).trim()
      if (/^[+-]?\d+(\.\d+)?$/.test(s)) return signed(s)
      if (s.startsWith('@')) {
        const v = foundry.utils.getProperty(rd, s.slice(1))
        return (v !== undefined && v !== null && !isNaN(Number(v))) ? signed(v) : s
      }
      return s
    }
    const modList = mods.map(m => ({ label: m.label, disp: dispOf(m.value) }))

    // 공식 합성(항목별 flavor 라벨 → SWADE식 네이티브 툴팁) → 굴림
    const formula = game.holygrailwar.ArchmageUtility.reduceModifiers(base, mods, { flavor: true })
    const roll = new Roll(formula, rd)
    await roll.roll()

    // 대성공/대실패 범위 확장: 자연 d20(유리/불리 시 채택된 주사위) 기준.
    // 유효 확장 = 대화상자 입력값 + AE 확장 합산(스코프 일치분 — v0.3.25). 음수 AE로 축소도 가능, 하한 0.
    const natD20 = roll.dice?.[0]?.total ?? null
    const expand = Math.max(0, (Number(critExpand) || 0) + (Number(critExpandBonus) || 0))
    const fExpand = Math.max(0, (Number(fumbleExpand) || 0) + (Number(fumbleExpandBonus) || 0))
    const isCrit = natD20 != null && natD20 >= (20 - expand)
    const isFumble = natD20 != null && natD20 <= (1 + fExpand)

    // SWADE식 항목 박스(formula-list)로 분해
    const formulaParts = game.holygrailwar.ArchmageUtility.rollFormulaParts(roll)

    // 플레이버(판정명): 커스텀=순수값 판정 / 능력치=「{능력치} 판정」 / 그 외=판정
    const flavorText = fixedBonus
      ? '특수 판정'
      : (abilityKey && ability ? `${game.i18n.localize(`ARCHMAGE.${abilityKey}.label`)} 판정` : '판정')

    // Render the chat content template
    const chatData = {
      user: game.user.id,
      roll: roll, // this is here for the content template, but deprecated
      rolls: [roll],
      speaker: game.holygrailwar.ArchmageUtility.getSpeaker(actor)
    }

    chatData.content = await foundry.applications.handlebars.renderTemplate(
      'systems/watersnake-grail-war/templates/chat/skill-check-card.html',
      {
        actor: actor,
        tokenId: actor.token?.id ?? null,
        ability: {
          name: abilityKey ? game.i18n.localize(`ARCHMAGE.${abilityKey}.label`) : null,
          bonus: ability?.mod ?? 0,
          rank: (() => {
            const m = Number(ability?.mod) || 0;
            const base = m >= 7 ? 'EX' : m >= 5 ? 'A' : m >= 4 ? 'B' : m >= 3 ? 'C' : m >= 2 ? 'D' : m >= 1 ? 'E' : '-';
            const rp = Number(ability?.rerollPlus) || 0;  // 시트에서 정한 ＋/－ 표기
            return base + (rp > 0 ? '＋'.repeat(rp) : rp < 0 ? '－'.repeat(-rp) : '');
          })()
        },
        background: {
          name: backgroundLabel
        },
        modifiers: modList,
        flavor: flavorText,
        crit: isCrit,
        fumble: isFumble,
        formulaParts: formulaParts,
        total: roll.total,
        data: chatData
      }
    )

    // Send it to chat
    game.holygrailwar.ArchmageUtility.createChatMessage(chatData, { rollMode })
  }
}
