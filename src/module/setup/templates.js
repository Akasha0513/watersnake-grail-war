/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function() {

  // Define template paths to load
  const templatePaths = [
    "systems/watersnake-grail-war/templates/actors/actor-character-sheet-vue.html",

    "systems/watersnake-grail-war/templates/chat/_chat-effect-part.html",
    "systems/watersnake-grail-war/templates/chat/action-card.html",
    "systems/watersnake-grail-war/templates/chat/command-card.html",
    "systems/watersnake-grail-war/templates/chat/loot-card.html",
    "systems/watersnake-grail-war/templates/chat/nastierspecial-card.html",
    "systems/watersnake-grail-war/templates/chat/roll-dialog.html",
    "systems/watersnake-grail-war/templates/chat/save-card.html",
    "systems/watersnake-grail-war/templates/chat/skill-check-card.html",
    "systems/watersnake-grail-war/templates/chat/tool-card.html",
    "systems/watersnake-grail-war/templates/chat/trait-card.html",

    "systems/watersnake-grail-war/templates/items/_item-effect-part.html",
    "systems/watersnake-grail-war/templates/items/item-feature-sheet.html",
    "systems/watersnake-grail-war/templates/items/item-loot-sheet.html",
    "systems/watersnake-grail-war/templates/items/item-tool-sheet.html",


    "systems/watersnake-grail-war/templates/chat/round-notice-card.html",

    "systems/watersnake-grail-war/templates/sidebar/apps/a11y-preview.html"
  ];

  // Load the template parts
  return foundry.applications.handlebars.loadTemplates(templatePaths);
};
