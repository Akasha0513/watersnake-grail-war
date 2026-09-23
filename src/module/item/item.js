import preCreateChatMessageHandler from "../hooks/preCreateChatMessageHandler.mjs";

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

  }

  /**
   * Roll the item to Chat, creating a chat card.
   * @return {Promise}
   */
  async roll() {
    // Make an ephemeral clone of the item which we can dirty during processing.
    const itemToRender = this.clone({}, {"save": false, "keepId": true});
    const rollData = this.itemActor?.getRollData(this);
    const token = this._rollGetToken();

    // Render the chat card, then mark ActiveEffect links as draggable.
    const chatData = await this._rollRender(itemToRender, rollData);
    preCreateChatMessageHandler.handle(chatData);

    // Run embedded macro.
    const macro = await this._rollExecuteMacro(itemToRender, chatData, token);

    // Perform updates.
    if (!foundry.utils.isEmpty(macro.itemUpdates)) this.update(macro.itemUpdates, {});
    // Only update the actor for owned items.
    if (!foundry.utils.isEmpty(macro.actorUpdates)) this.actor?.update(macro.actorUpdates);

    if (macro.suppressMessage) return undefined;

    // Unpack in case a sloppy macro replaces instead of modifying variables.
    const finalChat = macro.chat;
    finalChat.flags = finalChat.flags ?? {};
    finalChat.flags['watersnake-grail-war'] = {
      actor: this.itemActor?.uuid ?? false,
      item: macro.item.uuid,
    };

    return await game.holygrailwar.ArchmageUtility.createChatMessage(finalChat);
  }

  _rollGetToken() {
    let tokens = canvas?.tokens?.controlled;
    let token = tokens ? tokens[0] : null;
    if (!token || token.actor != this.itemActor) {
      tokens = this.itemActor?.getActiveTokens(true);
      token = tokens && tokens.length > 0 ? tokens[0] : null;
    }
    return token;
  }

  async _rollRender(itemToRender, rollData) {
    // Basic template rendering data
    const template = `systems/watersnake-grail-war/templates/chat/${this.type.toLowerCase()}-card.html`

    const templateData = {
      actor: this.itemActor,
      tokenId: null,
      item: itemToRender,
      data: await itemToRender.getChatData({ rollData: rollData }, true),
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

  async _rollExecuteMacro(itemToRender, chatData, token) {
    // Extra data accessible as "archmage" in embedded macros
    let macro_data = {
      item: itemToRender,
      itemUpdates: {},
      actorUpdates: {},
      chat: chatData,
      suppressMessage: false,
    };
    // If there is an embedded macro attempt to execute it
    if (itemToRender.system.embeddedMacro?.value.length > 0) {

      if (!game.user.hasPermission("MACRO_SCRIPT")) {
        ui.notifications.warn(game.i18n.localize("ARCHMAGE.CHAT.embeddedMacroPermissionError"));
        return macro_data;
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

}

