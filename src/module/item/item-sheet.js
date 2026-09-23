/**
 * Override and extend the basic :class:`ItemSheet` implementation
 */
export class ItemArchmageSheet extends foundry.appv1.sheets.ItemSheet {

  /**
   * Extend and override the default options used by the Actor Sheet
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      scrollY: ['.sheet-tabs-content'],
      classes: super.defaultOptions.classes.concat(['archmage', 'item', 'item-sheet']),
      template: 'systems/watersnake-grail-war/templates/items/item-feature-sheet.html',
      height: 550,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-tabs-content", initial: "details" }]
    });
  }

  /**
   * Use a type-specific template for each different item type
   */
  get template() {
    // V1 시트는 feature/tool/loot 전용.
    return `systems/watersnake-grail-war/templates/items/item-${this.item.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /**
   * Prepare item sheet data
   * Start with the base item data and extending with additional properties for
   * rendering.
   *
   * @return {undefined}
   */
  async getData(options) {
    const context = super.getData(options);

    // Effects.
    function getChanges(effect) {
      let changes = [];
      let modes = [
        'question',
        'times',
        'plus',
        "minus",
        'angle-double-down',
        'angle-double-up',
        'undo'
      ]
      effect.changes.forEach(c => {
        if (c.key && c.value) {
          const label = game.holygrailwar.ArchmageUtility.cleanActiveEffectLabel(c.key);
          let change = {
            name: label,
            img: game.holygrailwar.ArchmageUtility.getActiveEffectLabelIcon(label),
            mode: modes[c.mode],
            value: c.value
          };
          if (change.mode === "plus" && change.value < 0) {
            change.mode = "minus";
            change.value = Math.abs(change.value);
          }
          changes.push(change);
        }
      })
      return changes;
    }
    context.effects = this.item.effects.toObject();
    context.effects.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    for (let [index, effect] of context.effects.entries()) {
      context.effects[index].duration = effect.flags?.['watersnake-grail-war']?.duration
        ? game.i18n.localize(CONFIG.HOLYGRAILWAR.effectDurationTypes[effect.flags['watersnake-grail-war'].duration])
        : false;
      context.effects[index].ongoingDamage = effect.flags?.['watersnake-grail-war']?.ongoingDamage
        ? `${effect.flags['watersnake-grail-war'].ongoingDamage} ongoing ${effect.flags['watersnake-grail-war'].ongoingDamageType} damage`
        : false;
      context.effects[index].bonuses = getChanges(effect);
      context.effects[index].img = effect?.img ?? effect?.icon;
    }

    context.system = context.data.system;
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Activate listeners for interactive item sheet events.
   *
   * @param {HTML} html The prepared HTML object ready to be rendered into
   *
   * @return {undefined}
   */
  activateListeners(html) {
    super.activateListeners(html);

    if (!this.options.editable) return;

    // Effects.
    html.on('click', '.effect-control', (event) => this._onManageEffect(event));
  }

  /* ------------------------------------------------------------------------ */
  /*  Handle effects -------------------------------------------------------- */
  /* ------------------------------------------------------------------------ */
  _onManageEffect(event) {
    let target = event.currentTarget;
    let dataset = target.dataset;
    const effect = dataset.itemId ? this.document.effects.get(dataset.itemId) : null;

    switch (dataset.action) {
      case 'create':
        return this.document.createEmbeddedDocuments('ActiveEffect', [{
          name: game.i18n.localize("ARCHMAGE.EFFECT.AE.new"),
          img: this.document.img || 'icons/svg/aura.svg',
          origin: this.document.uuid,
          disabled: false
        }]);

      case 'edit':
        return effect.sheet.render(true);

      case 'delete':
        let del = false;
        new Dialog({
          title: game.i18n.localize("ARCHMAGE.CHAT.DeleteConfirmTitle"),
          content: game.i18n.localize("ARCHMAGE.CHAT.DeleteConfirm"),
          buttons: {
            del: {
              label: game.i18n.localize("ARCHMAGE.CHAT.Delete"),
              callback: () => {del = true;}
            },
            cancel: {
              label: game.i18n.localize("ARCHMAGE.CHAT.Cancel"),
              callback: () => {}
            }
          },
          default: 'cancel',
          close: html => { if (del) return effect.delete(); }
        }).render(true);
        break;

      case 'toggle':
        return effect.update({disabled: !effect.disabled});
    }

  }
}
