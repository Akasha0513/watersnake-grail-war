import ArchmageRolls from "../rolls/ArchmageRolls.mjs";
import { MacroUtils } from '../setup/utility-classes.js';
import preCreateChatMessageHandler from "../hooks/preCreateChatMessageHandler.mjs";

const RETAIN_FOCUS_REGEX = /retain focus.+(\d+)[^\d]+(\d+)/i;
const INLINE_ROLL_REGEX = /(\[\[.+?\]\])/;

/**
 * Override and extend the basic :class:`Item` implementation
 */
export class ItemArchmage extends Item {

  get itemActor() {
    return this.actor ?? game.user.character;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    if (!this.img || this.img == CONFIG.DEFAULT_TOKEN) {
      if (CONFIG.HOLYGRAILWAR.defaultTokens[this.type]) {
        this.img = CONFIG.HOLYGRAILWAR.defaultTokens[this.type];
      }
      else {
        this.img = CONST.DEFAULT_TOKEN;
      }
    }

    if (this.type == 'loot' || this.type == 'tool') {
      let model = game.data.model.Item[this.type];
      if (!this.system.quantity) this.system.quantity = model.quantity;
    }
  }

  /**
   * Roll the item to Chat, creating a chat card.
   * @return {Promise}
   */
  async roll() {
    let itemUpdateData = {};
    let actorUpdateData = {};

    const usageMode = "";

    // Check remaining uses.
    let early_exit = await this._rollUsesCheck(itemUpdateData, usageMode, true);
    if (early_exit) return;

    // Make an ephemeral clone of the item which we can dirty during processing.
    let itemToRender = this.clone({}, {"save": false, "keepId": true});

    // Then check resources.
    early_exit = await this._rollResourceCheck(itemUpdateData, actorUpdateData, itemToRender, undefined, true);
    if (early_exit) return;

    // Handle crit modifier
    const crit_mod = await this._rollCritMod(itemToRender);

    // Check targets.
    let targets = await this._rollMultiTargets(itemToRender);

    // Prepare roll data now.
    let rollData = this.itemActor?.getRollData(this);

    // Handle roll table.
    await this._rollHandleRollTable(itemToRender, rollData);

    // Get token.
    let token = this._rollGetToken(itemToRender);

    // Render the chat card.
    let chatData = await this._rollRender(itemUpdateData, actorUpdateData, itemToRender, rollData, token, {});

    // Evaluate outcomes and prepare animations.
    let [ sequencerAnim, hitEvalRes ] = preCreateChatMessageHandler.handle(chatData, {
      targets: targets,
      type: itemToRender.type,
      actor: this.itemActor ?? null,
      item: itemToRender,
      token: token,
      sequencer: itemToRender.system.sequencer,
      usageMode: usageMode,
      critMod: crit_mod
    }, null);

    // Run embedded macro.
    let macro = await this._rollExecuteMacro(itemToRender, itemUpdateData, actorUpdateData, chatData, hitEvalRes, sequencerAnim, token, usageMode);
    // Unpack macro data in case a sloppy macro replaces instead of modifying variables
    itemToRender = macro.item;
    itemUpdateData = macro.itemUpdates;
    actorUpdateData = macro.actorUpdates;
    chatData = macro.chat;
    hitEvalRes = macro.hitEvalRes;
    sequencerAnim = macro.seqAnim;
    let suppressMessage = macro.suppressMessage;

    // Perform animations.
    await this._rollAnimate(chatData, sequencerAnim);

    // Perform updates.
    if (!foundry.utils.isEmpty(itemUpdateData)) this.update(itemUpdateData, {});
    // Only update the actor for owned items.
    if (!foundry.utils.isEmpty(actorUpdateData)) this.actor?.update(actorUpdateData);

    if (suppressMessage) {
      return undefined;
    }

    // Handle flags for rerolls.
    chatData.flags = chatData.flags ?? {};
    chatData.flags['watersnake-grail-war'] = {
      // Add flags for IDs and targets.
      actor: this.itemActor?.uuid ?? false,
      item: itemToRender.uuid,
      targets: [...game.user.targets.map(t => t.document.uuid)],
      numTargets: targets,
    };

    return await game.holygrailwar.ArchmageUtility.createChatMessage(chatData);
  }

  async _rollUsesCheck(updateData, usageMode, consumeUsage = true) {
    // If we have a special usage mode skip this check
    if (!["", "openingEffect"].includes(usageMode)) return false;
    // Only check uses on owned items.
    if (!this.actor) return false;
    // Respect the consume-usage choice from the power roll dialog.
    if (!consumeUsage) return false;
    // Update uses left
    let uses = this.system.quantity?.value;
    if (uses == null) return false;
    updateData["system.quantity.value"] = Math.max(uses - 1, 0);
    if (uses == 0 && !event.shiftKey && ["loot", "tool"].includes(this.type)) {
      let use = false;
      await Dialog.confirm({
        title: game.i18n.localize("ARCHMAGE.CHAT.NoUses"),
        content: game.i18n.localize("ARCHMAGE.CHAT.NoUsesMsg"),
        yes: () => {use = true;},
        no: () => {},
        defaultYes: false
      });
      return !use;
    }
    return false;
  }

  async _rollResourceCheck(itemUpdateData, actorUpdateData, itemToRender, usageMode, consumeResources = true) {
    // Updates resources if field is set
    let resStr = this.system.resources?.value;
    if (!resStr) return false;

    // Exit early with no actor.
    if (!this.actor) return false;

    // Respect the consume-resources choice from the power roll dialog.
    if (!consumeResources) return false;

    let resources = resStr.split(",").map(item => item.trim());
    let res = this.actor.system.resources;
    let filter = /^([\+-]*)([0-9]*)\s*(.+)$/;
    let newResStr = [];
    for (let resource of resources) {

      // Handle inline rolls
      let ir = INLINE_ROLL_REGEX.exec(resource);
      let rolls;
      let origResource = resource;
      if (ir) {
        rolls = ArchmageRolls.getInlineRolls(resource, this.actor?.getRollData(itemToRender))
        await ArchmageRolls.rollAll(rolls, this.actor);
        resource = resource.replace(ir[1], rolls[0].total);
      }

      // Then process the item
      let parsed = filter.exec(resource);
      if (parsed) {
        let sign = parsed[1]
        let num = parsed[2] ? Number(parsed[2]) : null;
        if (num) num = (sign == "-") ? num * -1 : num;
        let str = parsed[3].toLowerCase();

        // Command points
        if (res.perCombat.commandPoints.enabled && num &&
            (str == game.i18n.localize("ARCHMAGE.CHARACTER.RESOURCES.commandPoints").toLowerCase()
            || str == game.i18n.localize("ARCHMAGE.CHARACTER.RESOURCES.commandPoint").toLowerCase()
            )) {
          let path = 'system.resources.perCombat.commandPoints.current';
          let msg = game.i18n.localize("ARCHMAGE.UI.errNotEnoughCP");
          let resObj = res.perCombat.commandPoints;
          let stop = await this._rollProcessResource(actorUpdateData, itemUpdateData, path, sign, num, resObj, msg);
          if (stop) return true;
        }

        // Ki
        else if (res.spendable.ki.enabled && num &&
            str == game.i18n.localize("ARCHMAGE.CHARACTER.RESOURCES.ki").toLowerCase()) {
          let path = 'system.resources.spendable.ki.current';
          let msg = game.i18n.localize("ARCHMAGE.UI.errNotEnoughKi");
          let resObj = res.spendable.ki;
          let stop = await this._rollProcessResource(actorUpdateData, itemUpdateData, path, sign, num, resObj, msg);
          if (stop) return true;
        }

        // Momentum
        else if (res.perCombat.momentum.enabled &&
            str == game.i18n.localize("ARCHMAGE.CHARACTER.RESOURCES.momentum").toLowerCase()) {
          let path = 'system.resources.perCombat.momentum.current';
          let msg = game.i18n.localize("ARCHMAGE.UI.errNoMomentum");
          let resObj = res.perCombat.momentum;
          let stop = await this._rollProcessResource(actorUpdateData, itemUpdateData, path, sign, null, resObj, msg);
          if (stop) return true;
        }

        // Focus
        else if (res.perCombat.focus.enabled &&
            str == (game.i18n.localize("ARCHMAGE.CHARACTER.RESOURCES.focus").toLowerCase())) {
          let path = 'system.resources.perCombat.focus.current';
          let msg = game.i18n.localize("ARCHMAGE.UI.errNoFocus");
          let resObj =  res.perCombat.focus;
          let stop = await this._rollProcessResource(actorUpdateData, itemUpdateData, path, sign, null, resObj, msg);
          if (stop) return true;
        }

        // Recoveries
        else if ((str == game.i18n.localize("ARCHMAGE.CHARACTER.RESOURCES.recoveries").toLowerCase()
            || str == game.i18n.localize("ARCHMAGE.CHARACTER.RESOURCES.recovery").toLowerCase()) && num) {
          let path = 'system.attributes.recoveries.value';
          let msg = game.i18n.localize("ARCHMAGE.UI.errNoRecoveries");
          let resObj =  this.actor.system.attributes.recoveries;
          let stop = await this._rollProcessResource(actorUpdateData, itemUpdateData, path, sign, num, resObj, msg);
          if (stop) return true;
        }

        // Custom resources
        else {
          for (let idx of ["1", "2", "3", "4", "5", "6", "7", "8", "9"]) {
            let resourcePathName = "custom"+idx;
            let resourceName = res.spendable[resourcePathName].label;
            if (!resourceName) continue; // Skip unnamed resources
            let resNm = resourceName.toLowerCase();
            if (res.spendable[resourcePathName].enabled && (str.includes(resNm) || resNm.includes(str))) {
              let path = `system.resources.spendable.${resourcePathName}.current`;
              let msg = game.i18n.format("ARCHMAGE.UI.errNoCustomResource", {res: resourceName});
              let resObj =  res.spendable[resourcePathName];
              let stop = await this._rollProcessResource(actorUpdateData, itemUpdateData, path, sign, num, resObj, msg);
              if (stop) return true;
            }
          }
        }
      }

      // If there were inline rolls, replace formula with rolled value
      if (ir) resource = origResource.replace(ir[1], rolls[0].inlineRoll.outerHTML);
      newResStr.push(resource);
    }

    // Reconstruct the processed value
    itemToRender.system.resources.value = newResStr.join(", ");

    return false;
  }

  async _rollCritMod(itemToRender) {
    let res = 0;
    let mod = itemToRender.system.critMod?.value;
    if (!mod) res;

    // Handle inline rolls
    let ir = INLINE_ROLL_REGEX.exec(mod);
    if (ir) {
      const rolls = ArchmageRolls.getInlineRolls(mod, this.actor?.getRollData(itemToRender))
      await ArchmageRolls.rollAll(rolls, this.actor);
      res = rolls[0].total;
      itemToRender.system.critMod.value = rolls[0].inlineRoll.outerHTML;
    } else {
      res = parseInt(mod, 10);
    }
    return res;
  }

  async _rollProcessResource(actorUpdateData, itemUpdateData, path, sign, num, resObj, msg, opt=null) {
    let stop = false;
    let curr = resObj.current;
    // Recoveries are stored as 'value'
    if (curr == undefined) curr = resObj.value;

    // Number resource case
    if (num != null) {
      // No sign means override
      actorUpdateData[path] = sign ? curr + num : num;
      if (actorUpdateData[path] < 0) {
        await Dialog.confirm({
         title: game.i18n.localize("ARCHMAGE.CHAT.NoResources"),
         content: msg,
         yes: () => {},
         no: () => {stop = true;},
         defaultYes: false
        });
        if (path != 'system.attributes.recoveries.value') actorUpdateData[path] = 0;
      }
    }

    // Binary case
    else {
      if (sign) {
        // Resource update case
        if (sign == "+") {
          let val = (typeof curr == 'number') ? 1 : true;
          actorUpdateData[path] = opt ? opt : val;
        }
        else {
          if (!curr) {
            await Dialog.confirm({
             title: game.i18n.localize("ARCHMAGE.CHAT.NoResources"),
             content: msg,
             yes: () => {},
             no: () => {stop = true;},
             defaultYes: false
            });
          }
          let val = (typeof curr == 'number') ? 0 : false;
          actorUpdateData[path] = opt ? "none" : val;
        }
      } else {
        // Resource test case
        if (!curr || curr == "none" || curr == 0) {
          await Dialog.confirm({
           title: game.i18n.localize("ARCHMAGE.CHAT.NoResources"),
           content: msg,
           yes: () => {},
           no: () => {stop = true;},
           defaultYes: false
          });
        }
      }
    }

    // Handle maximum
    let resMax = resObj.max;
    if (resMax && actorUpdateData[path] > resMax) actorUpdateData[path] = resMax;

    return stop;
  }

  async _rollMultiTargets(itemToRender) {
    // Replicate attack rolls as needed for attacks
    let numTargets = {targets: 1, rolls: []};
  if (["action"].includes(itemToRender.type)) {
      let atk = ArchmageRolls.addAttackMod(itemToRender);
      itemToRender.system.attack.value = atk.attackLine;
      if (game.settings.get("watersnake-grail-war", "multiTargetAttackRolls")){
        numTargets = await ArchmageRolls.rollItemTargets(itemToRender);
        let adj = ArchmageRolls.rollItemAdjustAttacks(itemToRender, atk.attackLine, numTargets, atk.numManualAttacks);
        itemToRender.system.attack.value = adj.line;
        numTargets.targets = adj.atks;
        if (numTargets.targetLine) itemToRender.system.target.value = numTargets.targetLine;
      }
    }
    return numTargets.targets;
  }

  async _rollHandleRollTable(itemToRender, rollData) {
    // Handle rollTable
    if (this.system.rollTable?.value) {
      let table;
      // Try to interpret input as UUID
      let uuid = this.system.rollTable.value.match(/^@UUID\[([^\s]+)\]/);
      if (uuid) table = await fromUuid(uuid[1]);
      if (table && table.documentName != "RollTable") {
        table = undefined;
        ui.notifications.warn(game.i18n.localize("ARCHMAGE.UI.errNotTable"));
      }
      if (!table) {
        // Treat as plain text, and load table from world first
        table = game.tables.find(t => t.name === this.system.rollTable.value);
      }
      if (!table) {
        // If not present in world, load system's from compendium
        let pack = await game.packs.get("watersnake-grail-war.system-rolltables")?.getDocuments();
        table = pack?.find(t => t.name === this.system.rollTable.value);
      }
      if (table) {
        // If we do have a table, roll on it
        let roll = new Roll(table.formula, rollData);
        let res = await table.draw({roll: roll, displayChat: false});
        // Now override system.rollTable with rolled result
        try {
          itemToRender.system.rollTable.label = itemToRender.system.rollTable.value;
          itemToRender.system.rollTable.value = res.results[0].text;
        } catch(ex) {
          ui.notifications.error(game.i18n.localize("ARCHMAGE.UI.errOnlyTextRolltables"));
        }
      }
    }
  }

  _rollGetToken(itemToRender) {
    let tokens = canvas?.tokens?.controlled;
    let token = tokens ? tokens[0] : null;
    if (!token || token.actor != this.itemActor) {
      tokens = this.itemActor?.getActiveTokens(true);
      token = tokens && tokens.length > 0 ? tokens[0] : null;
    }
    return token;
  }

  async _rollRender(itemUpdateData, actorUpdateData, itemToRender, rollData, token, rollContext = {}) {
    // Basic template rendering data
    const template = `systems/watersnake-grail-war/templates/chat/${this.type.toLowerCase()}-card.html`

    const templateData = {
      actor: this.itemActor,
      tokenId: null, //token ? `${token.scene.id}.${token.id}` : null,
      item: itemToRender,
      data: await itemToRender.getChatData({ rollData: rollData }, true),
      usageClass: 'other',
      modifiedTooltip: null
    };

    // Basic chat message data
    let chatData = {
      user: game.user.id,
      speaker: game.holygrailwar.ArchmageUtility.getSpeaker(this.itemActor)
    };

    // Toggle default roll mode
    let rollMode = game.settings.get("core", "rollMode");
    chatData = ChatMessage.applyRollMode(chatData, rollMode);

    // Render the template
    chatData["content"] = await foundry.applications.handlebars.renderTemplate(template, templateData);

    // Enrich the message to parse inline rolls.
    chatData.content = await foundry.applications.ux.TextEditor.implementation.enrichHTML(chatData.content, { rolls: true, rollData: rollData });

    return chatData;
  }

  async _rollAnimate(chatData, sequencerAnim) {
    // If 3d dice are enabled, handle them first.
    if (game.dice3d && !game.settings.get("dice-so-nice", "animateInlineRoll")) {
      let contentHtml = $(chatData.content);
      let rolls = [];
      let damageRolls = [];

      if (contentHtml.length > 0) {
        // Find all property rows.
        let $rows = contentHtml.find('.card-prop');
        if ($rows.length > 0) {
          // Iterate over properties.
          $rows.each(function(index) {
            let $row_self = $(this);
            let row_text = $row_self.html();
            // Attack or Target rows - keep all, in right order
            const triggerAttack = game.i18n.localize("ARCHMAGE.CHAT.attack") + ':';
            const triggerTarget = game.i18n.localize("ARCHMAGE.CHAT.target") + ':';
            const triggerHit = game.i18n.localize("ARCHMAGE.CHAT.hit") + ':';
            const triggerLevelSpell = game.i18n.localize("ARCHMAGE.CHAT.spellLevelTrigger") + ':';
            const triggerResources = game.i18n.localize("ARCHMAGE.CHAT.resources") + ':';
            const triggerEffect = game.i18n.localize("ARCHMAGE.CHAT.effect") + ':';
            if (row_text.includes(triggerAttack) ||
                row_text.includes(triggerTarget) ||
                row_text.includes(triggerResources) ||
                row_text.includes(triggerEffect)) {
              let $roll_html = $row_self.find('.inline-result');
              if ($roll_html.length > 0) {
                $roll_html.each(function(i, e){
                  let roll = Roll.fromJSON(unescape(e.dataset.roll));
                  if (row_text.includes(triggerAttack) && roll.terms[0].faces != 20) {
                    // Not an attack roll, usually a target roll, roll first
                    rolls.unshift(roll);
                  } else rolls.push(roll);
                });
              }
            }
            // Hit or Spell level rows - keep only the last
            else if (row_text.includes(triggerHit) || row_text.includes(triggerLevelSpell)) {
              let newDamageRolls = [];
              let $roll_html = $row_self.find('.inline-result');
              if ($roll_html.length > 0) {
                $roll_html.each(function(i, e){
                  let roll = Roll.fromJSON(unescape(e.dataset.roll));
                  newDamageRolls.push(roll);
                });
              }
              if (newDamageRolls.length > 0) damageRolls = newDamageRolls; // Animate only relevant rolls
            }
          });
        }

        // If we have roll data, handle a 3d roll.
        rolls = rolls.concat(damageRolls);
        if (rolls.length > 0) {
          for (let roll of rolls) {
            await game.holygrailwar.ArchmageUtility.show3DDiceForRoll(roll, chatData);
          }
        }
      }
    }

    // Play sequencer animation after the dice, if we got any
    if(sequencerAnim) sequencerAnim.play();
  }



  async _rollExecuteMacro(itemToRender, itemUpdateData, actorUpdateData, chatData, hitEvalRes, sequencerAnim, token, usageMode) {
    // Extra data accessible as "archmage" in embedded macros
    let macro_data = {
      item: itemToRender,
      itemUpdates: itemUpdateData,
      actorUpdates: actorUpdateData,
      chat: chatData,
      hitEval: hitEvalRes,
      seqAnim: sequencerAnim,
      suppressMessage: false,
      usageMode: usageMode
    };
    // If there is an embedded macro attempt to execute it
    if (itemToRender.system.embeddedMacro?.value.length > 0) {

      if (!game.user.hasPermission("MACRO_SCRIPT")) {
        ui.notifications.warn(game.i18n.localize("ARCHMAGE.CHAT.embeddedMacroPermissionError"));
        return false;
      }

      // Add variables to the evaluation scope
      const speaker = ChatMessage.implementation.getSpeaker();
      const character = game.user.character;
      const actor = this.itemActor;

      // Run our own function to bypass macro parameters limitations - based on Foundry's _executeScript
      const AsyncFunction = (async function(){}).constructor;
      try {
        const fn = new AsyncFunction("speaker", "actor", "token", "character", "archmage", itemToRender.system.embeddedMacro.value);
        // Attempt script execution
        await fn.call(this, speaker, actor, token, character, macro_data);
      } catch(ex) {
        ui.notifications.error(game.i18n.localize("ARCHMAGE.UI.errMacroSyntax"));
        console.error(`Embedded macro for '${this.name}' failed with: ${ex}`, ex);
      }
    }

    return macro_data;
  }



  /* -------------------------------------------- */
  /*  Chat Card Data
  /* -------------------------------------------- */

  async getChatData(htmlOptions, skipInlineRolls) {
    const data = this[`_${this.type}ChatData`]();
    if (!skipInlineRolls) {
      htmlOptions = foundry.utils.mergeObject(htmlOptions ?? {}, { async: false});
      data.description.value = data.description.value !== undefined
        ? (await foundry.applications.ux.TextEditor.implementation.enrichHTML(data.description.value, htmlOptions))
        : '';
    }
    return data;
  }

  _prepareActiveEffectsData(data) {
    data.activeEffects = [...this.effects.values()].map((effect) => {
      return {
        uuid: effect.uuid,
        img: effect.img,
        name: effect.name,
        id: effect.id,
        flags: effect.flags,
        description: effect?.description,
      }
    });
  }


  _actionChatData() {
    const data = foundry.utils.duplicate(this.system);
    this._prepareActiveEffectsData(data);
    return data;
  }

  _traitChatData() {
    const data = foundry.utils.duplicate(this.system);
    this._prepareActiveEffectsData(data);
    return data;
  }

  _nastierSpecialChatData() {
    const data = foundry.utils.duplicate(this.system);
    this._prepareActiveEffectsData(data);
    return data;
  }

  _toolChatData() {
    const data = foundry.utils.duplicate(this.system);
    this._prepareActiveEffectsData(data);
    return data;
  }

  _lootChatData() {
    const data = foundry.utils.duplicate(this.system);
    this._prepareActiveEffectsData(data);
    return data;
  }

}

