import { ArchmageBaseItemSheetV2 } from "./base-item-sheet-v2.js";
import { wrapRolls } from "./_item-sheet-helpers.mjs";

import VueRenderingMixin from "./_vue-application-mixin.mjs";
import { ArchmageActionSheetVue } from "../../vue/components.vue.es.js";

const { DOCUMENT_OWNERSHIP_LEVELS } = CONST;

export class ArchmageActionSheetV2 extends VueRenderingMixin(ArchmageBaseItemSheetV2) {
  vueParts = {
    'archmage-action-sheet-vue': {
      component: ArchmageActionSheetVue,
      template: `<archmage-action-sheet-vue :context="context">Vue rendering for sheet failed.</archmage-action-sheet-vue>`
    }
  }
  
  constructor(options = {}) {
    super(options);
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["archmage-appv2", "item", "dialog-form", "standard-form"],
    position: {
      width: 640,
      height: 800,
    },
    window: {
      resizable: true,
      controls: [
        {
          action: "showItemArtwork",
          icon: "fa-solid fa-image",
          label: "ITEM.ViewArt",
          ownership: "OWNER"
        }
      ]
    },
    actions: {},
    tag: 'form',
    form: {
      submitOnChange: true,
      submitOnClose: true,
    },
    // Custom property that's merged into `this.options`
    dragDrop: [{ dragSelector: "[data-drag]", dropSelector: null }]
  };

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = {
      // Validates both permissions and compendium status
      editable: this.isEditable,
      // Add the item document.
      item: this.item.toObject(),
      system: this.item.system,
      // Sequencer (module) support.
      sequencerEnabled: game.modules.get("sequencer")?.active && this.item.type === 'action',
      // Force re-renders. Defined in the vue mixin.
      _renderKey: this._renderKey ?? 0,
      // @todo add this after switching to DataModel
      // fields: this.document.schema.fields,
      // systemFields: this.document.system.schema.fields
    };

    // Handle tabs.
    this._prepareTabs(context);

    // Handle enriched fields.
    const enrichmentOptions = {
      // Whether to show secret blocks in the finished html
      secrets: this.document.isOwner,
      // Data to fill in for inline rolls
      rollData: this.item?.getRollData() ?? {},
      // Relative UUID resolution
      relativeTo: this.item
    };

    const editorOptions = {
      toggled: true,
      collaborate: true,
      documentUUID: this.document.uuid,
      height: 300,
    };

    // Enrich the description.
    context.editors = {
      'system.description.value': {
        enriched: await wrapRolls(this.item.system.description.value ?? '', [], enrichmentOptions),
        element: foundry.applications.elements.HTMLProseMirrorElement.create({
          ...editorOptions,
          name: 'system.description.value',
          value: context.system.description?.value ?? '',
        }),
      },
    };

    // Make another pass through the editors to fix the element contents.
    for (let [field, editor] of Object.entries(context.editors)) {
      if (context.editors[field].element) {
        context.editors[field].element.innerHTML = context.editors[field].enriched;
      }
    }

    return context;
  }

  _prepareTabs(context) {
    // Initialize tabs.
    context.tabs = {
      primary: {},
    };

    // Tabs available to all items.
    context.tabs.primary.details = {
      key: 'details',
      label: game.i18n.localize('ARCHMAGE.details'),
      active: false,
    };

    // Tabs limited to NPCs.
    if (this.item.type === 'action') {
      context.tabs.primary.attack = {
        key: 'attack',
        label: 'Attack',
        active: true,
      };
    }

    // More tabs available to all items.
    context.tabs.primary.effects = {
      key: 'effects',
      label: 'Effects',
      active: false,
    };

    // Ensure we have a default tab.
    if (this.item.type !== 'action') {
      context.tabs.primary.details.active = true;
    }
  }
}
