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
    { defaultBackground = null, defaultAbility = null, fixedBonus = null, title = null }
  ) {
    const formatBonus = bonus => {
      return bonus >= 0 ? `+${bonus}` : `${bonus}`
    }

    const content = await foundry.applications.handlebars.renderTemplate(
      'systems/watersnake-grail-war/templates/dialog/background-check-dialog.html',
      {
        abilities: Object.entries(actor.system.abilities).map(
          ([key, ability]) => ({
            key: key,
            label: game.i18n.localize(`ARCHMAGE.${key}.label`),
            bonus: formatBonus(ability.mod),
            checked: key === defaultAbility
          })
        ),
        backgrounds: Object.entries(actor.system.backgrounds)
          .filter(([_, bg]) => bg.bonus.value || bg.name.value)
          .map(([key, background]) => ({
            key: key,
            label: background.name.value,
            bonus: formatBonus(background.bonus.value),
            checked: background.name.value === defaultBackground
          })),
        rollModes: CONFIG.Dice.rollModes,
        defaultRollMode: game.settings.get('core', 'rollMode')
      }
    )

    const extractFormData = form => {
      const backgrounds = [];
      for (const el of form.elements) {
        if (el.name && el.name.startsWith('bg-') && el.checked) {
          const key = el.value;
          const randEl = form.elements[`bgrand-${key}`];
          backgrounds.push({ key, random: !!(randEl && randEl.checked) });
        }
      }
      return {
        situationalBonus: form.bonus.value,
        abilityKey: form.ability.value,
        backgrounds: backgrounds,
        rollMode: form.rollMode.value,
        critExpand: Number(form.critExpand?.value) || 0
      };
    }

    return new foundry.applications.api.DialogV2({
      window: {
        title: title ?? game.i18n.localize('ARCHMAGE.checkBackground'),
        resizeable: true
      },
      content: content,
      buttons: [
        // 불리 n = (n+1)d20 중 가장 낮은 1개(kl) / 유리 n = (n+1)d20 중 가장 높은 1개(kh)
        {
          action: 'dis2',
          label: '불리 2',
          callback: (event, button, dialog) =>
            this._completeBackgroundRoll({ actor, fixedBonus, selection: 'dis2', ...extractFormData(button.form) })
        },
        {
          action: 'dis1',
          label: '불리 1',
          callback: (event, button, dialog) =>
            this._completeBackgroundRoll({ actor, fixedBonus, selection: 'dis1', ...extractFormData(button.form) })
        },
        {
          action: 'normal',
          label: '굴림',
          callback: (event, button, dialog) =>
            this._completeBackgroundRoll({ actor, fixedBonus, selection: 0, ...extractFormData(button.form) })
        },
        {
          action: 'adv1',
          label: '유리 1',
          callback: (event, button, dialog) =>
            this._completeBackgroundRoll({ actor, fixedBonus, selection: 'adv1', ...extractFormData(button.form) })
        },
        {
          action: 'adv2',
          label: '유리 2',
          callback: (event, button, dialog) =>
            this._completeBackgroundRoll({ actor, fixedBonus, selection: 'adv2', ...extractFormData(button.form) })
        }
      ]
    }).render({ force: true })
  }

  static async _completeBackgroundRoll ({
    actor,
    selection,
    situationalBonus,
    abilityKey,
    backgrounds = [],
    rollMode,
    fixedBonus = null,
    critExpand = 0
  }) {
    // Construct the terms for the roll
    // First: the d20 (유리/불리 단계: (n+1)d20 중 kh/kl)
    const terms = []
    if (selection === 'adv2') {
      terms.push('3d20kh')        // 유리 2
    } else if (selection === 'adv1' || selection === 'advantage') {
      terms.push('2d20kh')        // 유리 1
    } else if (selection === 'dis2') {
      terms.push('3d20kl')        // 불리 2
    } else if (selection === 'dis1' || selection === 'disadvantage') {
      terms.push('2d20kl')        // 불리 1
    } else {
      terms.push('1d20')          // 일반
    }

    // feature '판정 직접'(rollCustom) 값을 고정 보정으로 합산
    if (fixedBonus) {
      terms.push(`${fixedBonus}`)
    }

    // Next: the ability modifier
    const ability = actor.system.abilities[abilityKey]
    if (ability) {
      terms.push(`@${abilityKey}.mod`)
    }

    // 서번트만 영령의 급(@grade)을 더함 (마스터는 레벨/급 미가산)
    if (actor.type !== 'master') terms.push("@grade")

    // 고조(@ed) 자동 가산 — 일반 능력치 판정 포함 모든 판정에. (고조>0일 때만 항 추가)
    if (Number(actor.system.attributes?.escalation?.value) > 0) terms.push("@ed")

    // Next: the background bonuses (여러 개 합산, 난수 선택 가능)
    const bgLabels = [];
    for (const bg of (backgrounds || [])) {
      const b = actor.system.backgrounds?.[bg.key];
      if (!b) continue;
      const val = Number(b.bonus?.value) || 0;
      if (val < 1) continue;
      if (bg.random) {
        terms.push(`1d${val}`);
        bgLabels.push(`${b.name?.value || '배경'}(1d${val})`);
      } else {
        terms.push(`${val}`);
        bgLabels.push(`${b.name?.value || '배경'} +${val}`);
      }
    }
    const backgroundLabel = bgLabels.join(', ');

    // Next: the item bonus
    if (ability && ability.bonus) {
      terms.push(`@${abilityKey}.bonus`)
    }

    // Next: the situational bonus
    if (situationalBonus) {
      terms.push(`${situationalBonus}`)
    }

    // Finally: the button selection if it was a flat bonus/penalty
    if (typeof selection === 'number' && selection !== 0) {
      terms.push(`${selection}`)
    }

    // Roll the dice
    const roll = new Roll(terms.join(' + '), actor.getRollData())
    await roll.roll()

    // 대성공 범위 확장: 자연 d20(유리/불리 시 채택된 주사위)이 (20-확장) 이상이면 대성공.
    const natD20 = roll.dice?.[0]?.total ?? null
    const expand = Math.max(0, Number(critExpand) || 0)
    const isCrit = natD20 != null && natD20 >= (20 - expand)
    const isFumble = natD20 === 1

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
        crit: isCrit,
        fumble: isFumble,
        rollHTML: await roll.render(),
        data: chatData
      }
    )

    // Send it to chat
    game.holygrailwar.ArchmageUtility.createChatMessage(chatData, { rollMode })
  }
}
