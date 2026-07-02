/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function() {

  // Define template paths to load
  const templatePaths = [
    "systems/watersnake-grail-war/templates/active-effects/effect.html",

    "systems/watersnake-grail-war/templates/actors/actor-character-sheet-vue.html",
    "systems/watersnake-grail-war/templates/actors/actor-npc-sheet-vue.html",

    "systems/watersnake-grail-war/templates/chat/_chat-effect-part.html",
    "systems/watersnake-grail-war/templates/chat/action-card.html",
    "systems/watersnake-grail-war/templates/chat/command-card.html",
    "systems/watersnake-grail-war/templates/chat/consumable-card.html",
    "systems/watersnake-grail-war/templates/chat/equipment-card.html",
    "systems/watersnake-grail-war/templates/chat/feat-card.html",
    "systems/watersnake-grail-war/templates/chat/icon-relationship-card.html",
    "systems/watersnake-grail-war/templates/chat/loot-card.html",
    "systems/watersnake-grail-war/templates/chat/nastierspecial-card.html",
    "systems/watersnake-grail-war/templates/chat/power-card.html",
    "systems/watersnake-grail-war/templates/chat/recharge-card.html",
    "systems/watersnake-grail-war/templates/chat/recovery-card.html",
    "systems/watersnake-grail-war/templates/chat/recovery-dialog.html",
    "systems/watersnake-grail-war/templates/chat/rest-full-card.html",
    "systems/watersnake-grail-war/templates/chat/rest-short-card.html",
    "systems/watersnake-grail-war/templates/chat/roll-dialog.html",
    "systems/watersnake-grail-war/templates/chat/save-card.html",
    "systems/watersnake-grail-war/templates/chat/skill-check-card.html",
    "systems/watersnake-grail-war/templates/chat/tool-card.html",
    "systems/watersnake-grail-war/templates/chat/tool-roll-dialog.html",
    "systems/watersnake-grail-war/templates/chat/trait-card.html",

    "systems/watersnake-grail-war/templates/items/_item-effect-part.html",
    "systems/watersnake-grail-war/templates/items/item-action-sheet.html",
    "systems/watersnake-grail-war/templates/items/item-equipment-sheet.html",
    "systems/watersnake-grail-war/templates/items/item-loot-sheet.html",
    "systems/watersnake-grail-war/templates/items/item-nastier-special-sheet.html",
    "systems/watersnake-grail-war/templates/items/item-power-sheet.html",
    "systems/watersnake-grail-war/templates/items/item-tool-sheet.html",
    "systems/watersnake-grail-war/templates/items/item-trait-sheet.html",

    "systems/watersnake-grail-war/templates/prepopulate/powers--list.html",
    "systems/watersnake-grail-war/templates/prepopulate/tabs-content.html",

    "systems/watersnake-grail-war/templates/chat/round-notice-card.html",

    "systems/watersnake-grail-war/templates/sidebar/apps/a11y-preview.html"
  ];

  // Load the template parts
  return foundry.applications.handlebars.loadTemplates(templatePaths);
};
