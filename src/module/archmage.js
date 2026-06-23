import { ARCHMAGE, FLAGS } from './setup/config.js';
import { ActorArchmage } from './actor/actor.js';
import { ActorArchmageNpcSheetV2 } from './actor/actor-npc-sheet-v2.js';
import { ActorTabFocusSheet } from './actor/actor-tab-focus-sheet.js';
import { ActorArchmageSheetV2 } from './actor/actor-sheet-v2.js';
import { ActorArchmageMasterSheetV2 } from './actor/actor-master-sheet-v2.js';
import { ItemArchmage } from './item/item.js';
import { ItemArchmageSheet } from './item/item-sheet.js';
import { ArchmagePowerSheetV2 } from './item/power-sheet-v2.js';
import { ArchmageEquipmentSheetV2 } from './item/equipment-sheet-v2.js';
import { ArchmageActionSheetV2 } from './item/action-sheet-v2.js';
import { wrapRolls } from './item/_item-sheet-helpers.mjs';
import { ArchmageMacros } from './setup/macros.js';
import { ArchmageUtility } from './setup/utility-classes.js';
import { MacroUtils } from './setup/utility-classes.js';
import { ArchmageReference } from './setup/utility-classes.js';
import { ContextMenu2 } from './setup/contextMenu2.js';
import { DamageApplicator } from './setup/damageApplicator.js';
import { DiceArchmage } from './actor/dice.js';
import { preloadHandlebarsTemplates } from "./setup/templates.js";
import { TourGuide } from './tours/tourguide.js';
import { ActorHelpersV2 } from './actor/helpers/actor-helpers-v2.js';
import { EffectArchmageSheet } from "./active-effects/effect-sheet.js";
import { registerModuleArt } from './setup/register-module-art.js';
import { TokenArchmage } from './actor/token.js';
import {combatRound, combatStart, combatTurn, preDeleteCombat} from "./hooks/combat.mjs";
import { ArchmageCompendiumBrowserApplication } from './applications/compendium-browser.js';
import { ArchmageActiveEffectSheetV2 } from './active-effects/effect-sheet-v2.js';
import { baselineMonsterDialog } from './actor/baseline-monster.js';

Hooks.once('init', async function() {

  // Disable legacy transferral on v11 so that it's consistent with v12.
  // @see https://foundryvtt.com/article/v11-active-effects/
  CONFIG.ActiveEffect.legacyTransferral = false;

  if (game.modules.get('_CodeMirror')?.active && typeof CodeMirror != undefined) {
    var cssId = 'archmage-codemirror';
    if (!document.getElementById(cssId))
    {
        var head  = document.getElementsByTagName('head')[0];
        var link  = document.createElement('link');
        link.id   = cssId;
        link.rel  = 'stylesheet';
        link.type = 'text/css';
        link.href = '/modules/_CodeMirror/theme/monokai.css';
        link.media = 'all';
        head.appendChild(link);
    }
  }

  String.prototype.safeCSSId = function() {
    return encodeURIComponent(
      this.toLowerCase()
    ).replace(/%[0-9A-F]{2}/gi, '-');
  }

  Handlebars.registerHelper('safeCSSId', (arg) => {
    return `${arg}`.safeCSSId();
  });

  Handlebars.registerHelper('getPowerClass', (inputString) => {
    // Get the appropriate usage. TODO: likely needs to be localized?
    let usage = 'other';
    let usageString = inputString !== null ? inputString.toLowerCase() : '';
    if (usageString.includes('will')) {
      usage = 'at-will';
    }
    else if (usageString.includes('recharge')) {
      usage = 'recharge';
    }
    else if (usageString.includes('battle')) {
      usage = 'once-per-battle';
    }
    else if (usageString.includes('daily')) {
      usage = 'daily';
    }

    return usage;
  });

  Handlebars.registerHelper('concatenate', function() {
    var outStr = '';
    for (var arg in arguments) {
      if (typeof arguments[arg] != 'object') {
        outStr += arguments[arg];
      }
    }
    return outStr;
  });

  Handlebars.registerHelper('iconSymbol', (iconKey) => {
      let symbols = {
        'Positive': '+',
        'Negative': '-',
        'Conflicted': '~'
      };
      return symbols[iconKey];
  });

  // Preload template partials.
  preloadHandlebarsTemplates();

  game.settings.register("watersnake-grail-war", "secondEdition", {
    name: "ARCHMAGE.SETTINGS.secondEditionName",
    hint: "ARCHMAGE.SETTINGS.secondEditionHint",
    scope: "world",
    type: Boolean,
    default: false,
    config: true,
    requiresReload: true
  });

  game.settings.register("watersnake-grail-war", "alternateIconRollingMethod", {
    name: "ARCHMAGE.SETTINGS.alternateIconRollingMethodName",
    hint: "ARCHMAGE.SETTINGS.alternateIconRollingMethodHint",
    scope: "world",
    type: Boolean,
    default: false,
    config: true,
    requiresReload: false
  });

  game.settings.register("watersnake-grail-war", "resetIconsOnRest", {
    name: "ARCHMAGE.SETTINGS.resetIconsOnRestName",
    hint: "ARCHMAGE.SETTINGS.resetIconsOnRestHint",
    scope: "world",
    type: Boolean,
    default: false,
    config: true,
    requiresReload: false
  });

  game.holygrailwar = {
    ActorArchmage,
    ActorArchmageSheetV2,
    ActorArchmageNpcSheetV2,
    DiceArchmage,
    ItemArchmage,
    ItemArchmageSheet,
    EffectArchmageSheet,
    wrapRolls,
    ArchmageActiveEffectSheetV2,
    ArchmageMacros,
    ArchmageUtility,
    MacroUtils,
    rollItemMacro,
    ActorHelpersV2,
    ArchmageCompendiumBrowserApplication,
    isSocketGM: () => game.users.activeGM.id === game.user.id,
    system: {
      moduleArt: {
        map: new Map(),
        refresh: registerModuleArt
      }
    },
    terrains: [
      {
        id: "none",
        name: "ARCHMAGE.TERRAINS.none",
        icon: "fa-solid fa-circle-xmark"
      },
      {
        id: "caveDungeonUnderworld",
        name: "ARCHMAGE.TERRAINS.caveDungeonUnderworld",
        icon: "fa-solid fa-dungeon"
      },
      {
        id: "forestWoods",
        name: "ARCHMAGE.TERRAINS.forestWoods",
        icon: "fa-solid fa-trees"
      },
      {
        id: "iceTundraDeepSnow",
        name: "ARCHMAGE.TERRAINS.iceTundraDeepSnow",
        icon: "fa-solid fa-icicles"
      },
      {
        id: "migration",
        name: "ARCHMAGE.TERRAINS.migration",
        icon: "fa-solid fa-paw-claws"
      },
      {
        id: "mountains",
        name: "ARCHMAGE.TERRAINS.mountains",
        icon: "fa-solid fa-mountains"
      },
      {
        id: "plainsOverworld",
        name: "ARCHMAGE.TERRAINS.plainsOverworld",
        icon: "fa-solid fa-staff"
      },
      {
        id: "ruins",
        name: "ARCHMAGE.TERRAINS.ruins",
        icon: "fa-solid fa-scroll-old"
      },
      {
        id: "swampLakeRiver",
        name: "ARCHMAGE.TERRAINS.swampLakeRiver",
        icon: "fa-solid fa-water"
      }
    ]
  };

  // Replace sheets.
  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet("watersnake-grail-war", ItemArchmageSheet, {
    label: 'ARCHMAGE.sheetItem',
    makeDefault: true,
  });
  // AppV2 + Vue based sheets. These will eventually become the default.
  foundry.documents.collections.Items.registerSheet("watersnake-grail-war", ArchmagePowerSheetV2, {
    label: 'ARCHMAGE.sheetItemV2',
    types: ["power"],
    makeDefault: true,
  });
  foundry.documents.collections.Items.registerSheet("watersnake-grail-war", ArchmageEquipmentSheetV2, {
    label: 'ARCHMAGE.sheetItemV2',
    types: ["equipment"],
    makeDefault: true,
  });
  foundry.documents.collections.Items.registerSheet("watersnake-grail-war", ArchmageActionSheetV2, {
    label: 'ARCHMAGE.sheetItemV2',
    types: ["action", "trait", "nastierSpecial"],
    makeDefault: true,
  })

  foundry.applications.apps.DocumentSheetConfig.registerSheet(ActiveEffect, "watersnake-grail-war", ArchmageActiveEffectSheetV2, {
    label: 'ARCHMAGE.sheetActiveEffect',
    makeDefault: true
  });

  CONFIG.HOLYGRAILWAR = ARCHMAGE;
  // Default the 2e constant to false, but the setting will be checked later in the 'ready' hook.
  CONFIG.HOLYGRAILWAR.is2e = false;

  // Override 2e conditions journals before copying them to CONFIG
  // We do it here because we want to keep a copy of *all* conditions in ARCHMAGE.statusEffects
  // in order to be able to e.g. recognize both hindered and hampered
  if (game.settings.get("watersnake-grail-war", "secondEdition")) {

    // Remove AE from and update vulnerable
    let id = ARCHMAGE.statusEffects.findIndex(e => e.id == "vulnerable");
    delete ARCHMAGE.statusEffects[id].changes;
    ARCHMAGE.statusEffects[id].journal = "uHqgXlfj0rkf0XRE";

    // Update grabbed.
    id = ARCHMAGE.statusEffects.findIndex(e => e.id == "grabbed");
    ARCHMAGE.statusEffects[id].journal = "e74tdY4XILWFW9VB";

    // Update stunned
    id = ARCHMAGE.statusEffects.findIndex(e => e.id == "stunned");
    ARCHMAGE.statusEffects[id].journal = "2rxwthymp5rl1dqf";

    // Update confused
    id = ARCHMAGE.statusEffects.findIndex(e => e.id == "confused");
    ARCHMAGE.statusEffects[id].journal = "21cEqzk92tflpW7O";

  }

  // Update status effects.
  function _setArchmageStatusEffects(extended) {
    if (extended) CONFIG.statusEffects = ARCHMAGE.statusEffects.concat(ARCHMAGE.extendedStatusEffects)
    else CONFIG.statusEffects = foundry.utils.duplicate(ARCHMAGE.statusEffects);
  }
  game.settings.register('watersnake-grail-war', 'extendedStatusEffects', {
    name: "ARCHMAGE.SETTINGS.extendedStatusEffectsName",
    hint: "ARCHMAGE.SETTINGS.extendedStatusEffectsHint",
    scope: 'world',
    config: true,
    default: false,
    type: Boolean,
    requiresReload: true,
    onChange: enable => _setArchmageStatusEffects(enable)
  });
  _setArchmageStatusEffects(game.settings.get('watersnake-grail-war', 'extendedStatusEffects'));

  // Update 2e constants
  if (game.settings.get("watersnake-grail-war", "secondEdition")) {
    // Update dice number at higher level
    CONFIG.HOLYGRAILWAR.numDicePerLevel = CONFIG.HOLYGRAILWAR.numDicePerLevel2e;

    // Update tier multiplier Array
    CONFIG.HOLYGRAILWAR.tierMultPerLevel = CONFIG.HOLYGRAILWAR.tierMultPerLevel2e;

    // Update monster baseline stats
    CONFIG.HOLYGRAILWAR.baselineMonsterStats = CONFIG.HOLYGRAILWAR.baselineMonsterStats2e;

    // Remove 1e hampered from context menu status effects
    let id = CONFIG.statusEffects.findIndex(e => e.id == "hampered");
    if (id >= 0) CONFIG.statusEffects.splice(id, 1);

    // Update class base stats
    for (let cl of Object.keys(CONFIG.HOLYGRAILWAR.classes2e)) {
      for (let k of Object.keys(CONFIG.HOLYGRAILWAR.classes2e[cl])) {
        CONFIG.HOLYGRAILWAR.classes[cl][k] = CONFIG.HOLYGRAILWAR.classes2e[cl][k];
      }
    }

    // Update daily -> arc
    CONFIG.HOLYGRAILWAR.powerUsages['daily'] = 'ARCHMAGE.arc';
    CONFIG.HOLYGRAILWAR.powerUsages['daily-desperate'] = 'ARCHMAGE.arc-desperate';
    CONFIG.HOLYGRAILWAR.equipUsages['daily'] = 'ARCHMAGE.arc';
    CONFIG.HOLYGRAILWAR.equipUsages['daily-desperate'] = 'ARCHMAGE.arc-desperate';
    CONFIG.HOLYGRAILWAR.featUsages['daily'] = 'ARCHMAGE.arc';

    // Add additional classResources
    CONFIG.HOLYGRAILWAR.classResources = foundry.utils.mergeObject(
      CONFIG.HOLYGRAILWAR.classResources,
      CONFIG.HOLYGRAILWAR.classResources2e
    );
  } else {
    // Remove Mental Phenomenon flag
    delete FLAGS.characterFlags.dexToInt;
    // Remove Grim Determination flag
    delete FLAGS.characterFlags.grimDetermination;
    // Remove Blessing of Heaven flag
    delete FLAGS.characterFlags.dexToCha;

    // Remove 11th level feat tier
    delete CONFIG.HOLYGRAILWAR.featTiers.iconic;

    // Remove 2e hindered from context menu status effects
    let id = CONFIG.statusEffects.findIndex(e => e.id == "hindered");
    if (id >= 0) CONFIG.statusEffects.splice(id, 1);

    // Remove 2e charmed from context menu status effects
    id = CONFIG.statusEffects.findIndex(e => e.id == "charmed");
    if (id >= 0) CONFIG.statusEffects.splice(id, 1);
  }

  // Assign the actor class to the CONFIG
  CONFIG.Actor.documentClass = ActorArchmage;
  CONFIG.Token.objectClass = TokenArchmage;

  // Assign ItemArchmage class to CONFIG
  CONFIG.Item.documentClass = ItemArchmage;

  // Override CONFIG
  CONFIG.Item.sheetClass = ItemArchmageSheet;

  foundry.documents.collections.Actors.unregisterSheet('core', foundry.appv1.sheets.ActorSheet);

  foundry.documents.collections.Actors.registerSheet("watersnake-grail-war", ActorArchmageNpcSheetV2, {
    label: 'ARCHMAGE.sheetNPC',
    types: ["npc"],
    makeDefault: true
  });

  // V2 actor sheet (See issue #118).
  foundry.documents.collections.Actors.registerSheet("watersnake-grail-war", ActorArchmageSheetV2, {
    label: 'ARCHMAGE.sheetCharacter',
    types: ["character"],
    makeDefault: true
  });

  // 마스터 시트: v13 정식 API(DocumentSheetConfig)로 등록.
  // 새로 추가한 타입은 init 시점엔 등록에서 누락되므로, 타입이 완전히 로드된 setup 훅에서 등록한다.
  Hooks.once('setup', () => {
    foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, "watersnake-grail-war", ActorArchmageMasterSheetV2, {
      label: 'ARCHMAGE.sheetMaster',
      types: ["master"],
      makeDefault: true
    });
  });

  /* -------------------------------------------- */
  CONFIG.Actor.characterFlags = FLAGS.characterFlags;
  CONFIG.Actor.npcFlags = FLAGS.npcFlags;
  // Store flags in global config for later manipulation
  CONFIG.HOLYGRAILWAR.FLAGS = FLAGS;

  /**
   * Register Initiative formula setting
   */
  function _setArchmageInitiative(tiebreaker) {
    CONFIG.Combat.initiative.tiebreaker = tiebreaker;
    CONFIG.Combat.initiative.decimals = 0;
    if (ui.combat && ui.combat._rendered) ui.combat.render();
  }
  game.settings.register('watersnake-grail-war', 'initiativeDexTiebreaker', {
    name: "ARCHMAGE.SETTINGS.initiativeDexTiebreakerName",
    hint: "ARCHMAGE.SETTINGS.initiativeDexTiebreakerHint",
    scope: 'world',
    config: true,
    default: true,
    type: Boolean,
    onChange: enable => _setArchmageInitiative(enable)
  });
  _setArchmageInitiative(game.settings.get('watersnake-grail-war', 'initiativeDexTiebreaker'));

  game.settings.register("watersnake-grail-war", "initiativeStaticNpc", {
    name: "ARCHMAGE.SETTINGS.initiativeStaticNpcName",
    hint: "ARCHMAGE.SETTINGS.initiativeStaticNpcHint",
    scope: "world",
    type: Boolean,
    default: false,
    config: true
  });

  game.settings.register("watersnake-grail-war", "automateHPConditions", {
    name: "ARCHMAGE.SETTINGS.automateHPConditionsName",
    hint: "ARCHMAGE.SETTINGS.automateHPConditionsHint",
    scope: "world",
    type: Boolean,
    default: true,
    config: true
  });

  game.settings.register("watersnake-grail-war", "staggeredOverlay", {
    name: "ARCHMAGE.SETTINGS.staggeredOverlayName",
    hint: "ARCHMAGE.SETTINGS.staggeredOverlayHint",
    scope: "world",
    type: Boolean,
    default: true,
    config: true
  });

  game.settings.register("watersnake-grail-war", "multiTargetAttackRolls", {
    name: "ARCHMAGE.SETTINGS.multiTargetAttackRollsName",
    hint: "ARCHMAGE.SETTINGS.multiTargetAttackRollsHint",
    scope: "world",
    type: Boolean,
    default: true,
    config: true
  });

  game.settings.register("watersnake-grail-war", "hideExtraRolls", {
    name: "ARCHMAGE.SETTINGS.hideExtraRollsName",
    hint: "ARCHMAGE.SETTINGS.hideExtraRollsHint",
    scope: "world",
    type: Boolean,
    default: true,
    config: true
  });

  game.settings.register("watersnake-grail-war", "showDefensesInChat", {
    name: "ARCHMAGE.SETTINGS.showDefensesInChatName",
    hint: "ARCHMAGE.SETTINGS.showDefensesInChatHint",
    scope: "world",
    type: Boolean,
    default: false,
    config: true
  });

  game.settings.register("watersnake-grail-war", "showVulnsInChat", {
    name: "ARCHMAGE.SETTINGS.showVulnsInChatName",
    hint: "ARCHMAGE.SETTINGS.showVulnsInChatHint",
    scope: "world",
    type: Boolean,
    default: false,
    config: true
  });

  game.settings.register("watersnake-grail-war", "hideInsteadOfOpaque", {
    name: "ARCHMAGE.SETTINGS.hideInsteadOfOpaqueName",
    hint: "ARCHMAGE.SETTINGS.hideInsteadOfOpaqueHint",
    scope: "world",
    type: Boolean,
    default: false,
    config: true
  });

  game.settings.register("watersnake-grail-war", "enableOngoingEffectsMessages", {
    name: "ARCHMAGE.SETTINGS.enableOngoingEffectsMessagesName",
    hint: "ARCHMAGE.SETTINGS.enableOngoingEffectsMessagesHint",
    scope: "world",
    type: Boolean,
    default: true,
    config: true
  });

  game.settings.register('watersnake-grail-war', 'roundUpDamageApplication', {
    name: "ARCHMAGE.SETTINGS.RoundUpDamageApplicationName",
    hint: "ARCHMAGE.SETTINGS.RoundUpDamageApplicationHint",
    scope: 'world',
    config: true,
    default: true,
    type: Boolean
  });

  game.settings.register('watersnake-grail-war', 'allowTargetDamageApplication', {
    name: 'ARCHMAGE.SETTINGS.allowTargetDamageApplicationName',
    hint: 'ARCHMAGE.SETTINGS.allowTargetDamageApplicationHint',
    scope: 'world',
    config: true,
    default: false,
    type: Boolean,
    requiresReload: true
  });

  game.settings.register('watersnake-grail-war', 'userTargetDamageApplicationType', {
    scope: 'client',
    config: false,
    default: 'selected',
    type: String,
  });

  game.settings.register('watersnake-grail-war', 'allowRerolls', {
    name: 'ARCHMAGE.SETTINGS.allowRerollsName',
    hint: 'ARCHMAGE.SETTINGS.allowRerollsHint',
    scope: 'world',
    config: true,
    default: false,
    type: Boolean,
    requiresReload: true
  });

  game.settings.register('watersnake-grail-war', 'rechargeOncePerDay', {
    name: "ARCHMAGE.SETTINGS.rechargeOncePerDayName",
    hint: "ARCHMAGE.SETTINGS.rechargeOncePerDayHint",
    scope: 'world',
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register('watersnake-grail-war', 'optionalBaseCritRange', {
    name: "ARCHMAGE.SETTINGS.optionalBaseCritRangeName",
    hint: "ARCHMAGE.SETTINGS.optionalBaseCritRangeHint",
    scope: 'world',
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register('watersnake-grail-war', 'unboundEscDie', {
    name: "ARCHMAGE.SETTINGS.UnboundEscDieName",
    hint: "ARCHMAGE.SETTINGS.UnboundEscDieHint",
    scope: 'world',
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register('watersnake-grail-war', 'automateBaseStatsFromClass', {
    name: "ARCHMAGE.SETTINGS.automateBaseStatsFromClassName",
    hint: "ARCHMAGE.SETTINGS.automateBaseStatsFromClassHint",
    scope: 'client',
    config: true,
    default: true,
    type: Boolean
  });

  game.settings.register('watersnake-grail-war', 'lastTourVersion', {
    scope: 'client',
    config: false,
    default: "1.6.0",
    type: String,
  });

  game.settings.register('watersnake-grail-war', 'tourVisibility', {
    name: "ARCHMAGE.SETTINGS.tourVisibilityName",
    hint: "ARCHMAGE.SETTINGS.tourVisibilityHint",
    scope: 'world',
    config: true,
    default: 'all',
    type: String,
    choices: {
      all: 'ARCHMAGE.SETTINGS.tourVisibilityAll',
      gm: 'ARCHMAGE.SETTINGS.tourVisibilityGM',
      off: 'ARCHMAGE.SETTINGS.tourVisibilityOff',
    }
  });

  game.settings.register('watersnake-grail-war', 'sheetTooltips', {
    name: "ARCHMAGE.SETTINGS.sheetTooltipsName",
    hint: "ARCHMAGE.SETTINGS.sheetTooltipsHint",
    scope: 'client',
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register('watersnake-grail-war', 'showPrivateGMAttackRolls', {
    name: "ARCHMAGE.SETTINGS.showPrivateGMAttackRollsName",
    hint: "ARCHMAGE.SETTINGS.showPrivateGMAttackRollsHint",
    scope: 'world',
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register('watersnake-grail-war', 'nightmode', {
    name: "ARCHMAGE.SETTINGS.nightmodeName",
    hint: "ARCHMAGE.SETTINGS.nightmodeHint",
    scope: 'client',
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register('watersnake-grail-war', 'compactMode', {
    name: "ARCHMAGE.SETTINGS.compactModeName",
    hint: "ARCHMAGE.SETTINGS.compactModeHint",
    scope: 'client',
    config: true,
    default: false,
    type: Boolean,
    requiresReload: true
  });

  game.settings.register('watersnake-grail-war', 'allowPasteParsing', {
    name: "ARCHMAGE.SETTINGS.allowPasteParsingName",
    hint: "ARCHMAGE.SETTINGS.allowPasteParsingHint",
    scope: 'client',
    config: true,
    default: false,
    type: Boolean,
    requiresReload: false,
  });

  game.settings.register('watersnake-grail-war', 'showNaturalRolls', {
    name: "ARCHMAGE.SETTINGS.showNaturalRollsName",
    hint: "ARCHMAGE.SETTINGS.showNaturalRollsHint",
    scope: 'client',
    config: true,
    default: true,
    type: Boolean,
    requiresReload: false,
    onChange: newValue => {
      $('#chat').toggleClass('show-natural-rolls', newValue)
      $('#chat-notifications').toggleClass('show-natural-rolls', newValue);}
  });

  game.settings.register('watersnake-grail-war', 'colorBlindMode', {
    name: "ARCHMAGE.SETTINGS.ColorblindName",
    hint: "ARCHMAGE.SETTINGS.ColorblindHint",
    scope: 'client',
    config: true,
    default: 'default',
    type: String,
    choices: {
      default: "ARCHMAGE.SETTINGS.ColorblindOptionDefault",
      colorBlindRG: "ARCHMAGE.SETTINGS.ColorblindOptioncolorBlindRG",
      colorBlindBY: "ARCHMAGE.SETTINGS.ColorblindOptioncolorBlindBY",
      // custom: "ARCHMAGE.SETTINGS.Custom",
    },
    onChange: () => {
      $('body').removeClass(['default', 'colorBlindRG', 'colorBlindBY', 'custom']).addClass(game.settings.get('watersnake-grail-war', 'colorBlindMode'));
    }
  });
  //Adding the colorblind mode class at startup
  $('body').addClass(game.settings.get('watersnake-grail-war', 'colorBlindMode'));

  // Track whether we overrode DsN's default inline roll parsing
  game.settings.register("watersnake-grail-war", "DsNInlineOverride", {
    name: "DsN Override",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  /**
   * Override the default Initiative formula to customize special behaviors of the system.
   * Apply advantage, proficiency, or bonuses where appropriate
   * Apply the dexterity score as a decimal tiebreaker if requested
   * See Combat._getInitiativeFormula for more detail.
   * @private
   */
  Combatant.prototype._getInitiativeFormula = function() {
    return this.actor?.getInitiativeFormula() ?? "1d20";
  };

  ArchmageUtility.fixVuePopoutBug();
});

Hooks.on('ready', () => {
  // Precompile regexps
  // Do it after ready to wait for localization to load
  CONFIG.HOLYGRAILWAR.REGEXP.ONGOING_DAMAGE = new RegExp(`(<a (?:(?!<a ).)*?><i class="fas fa-dice-d20"><\\/i>)*(-?\\d+)(<\\/a>)* ${game.i18n.localize("ARCHMAGE.ongoing")} ([a-zA-Z]*) ?${game.i18n.localize("ARCHMAGE.damage")}(?:\\s*\\((\\w*) ?${game.i18n.localize("ARCHMAGE.DURATION.SaveEnds")}(?:, \\d*\\+)?\\))?`, "ig");
  // /(<a (?:(?!<a ).)*?><i class="fas fa-dice-d20"><\/i>)*(-?\d+)(<\/a>)* ongoing ([a-zA-Z]*) ?damage(?:\s*\((\w*) ?save ends(?:, \d*\+)?\))?/ig
  CONFIG.HOLYGRAILWAR.REGEXP.CONDITIONS = new Map(
      CONFIG.HOLYGRAILWAR.statusEffects.filter(x => x.journal).map( x => {
          const localizedName = game.i18n.localize(x.name);
          return [
              localizedName,
              [
                x,
                new RegExp(`\\*?\\b(${localizedName})\\b\\*?(?:\\s*\\(?(\\w*\\s?${game.i18n.localize("ARCHMAGE.DURATION.SaveEnds")}|${game.i18n.localize("ARCHMAGE.DURATION.NextTurnFilter")})(?:,\\s\\d*\\+)?\\)?)?`, "ig")
              ]
          ]
      })
  );
});

Hooks.on('setup', (data, options, id) => {
  // Configure autocomplete inline properties module.
  const aip = game.modules.get("autocomplete-inline-properties")?.API;
  if (aip?.PACKAGE_CONFIG) {
    // Autocomplete Inline Rolls
    const aipKeys = [
      'str',
      'agi',
      'end',
      'mgi',
      'ins',
      'lck',
      'ac',
      'pd',
      'md',
      'hp',
      'recoveries',
      'wpn.m',
      'wpn.r',
      'wpn.p',
      'wpn.k',
      'wpn.j'
    ];
    let filteredKeys = [
      'standardBonuses',
      'out',
      'incrementals',
      'icons',
      'details',
      'coins',
      'backgrounds',
      'attr',
      'attributes',
      'abilities',
      'abil',
      'tier',
      'sheetGrouping',
      'disengage',
    ];
    aipKeys.forEach(k => {
      filteredKeys.push(`${k}.type`);
      filteredKeys.push(`${k}.label`);
    });
    const AIP = {
      packageName: 'watersnake-grail-war',
      sheetClasses: [
        {
          name: "ItemArchmageSheet",
          fieldConfigs: [
            {
              selector: '.archmage-aip input[type="text"]',
              showButton: true,
              allowHotkey: true,
              dataMode: aip.CONST.DATA_MODE.OWNING_ACTOR_ROLL_DATA,
              filteredKeys: filteredKeys
            }
          ]
        },
        {
          name: "ActiveEffectConfig",
          fieldConfigs: [
            {
              selector: '.tab[data-tab="effects"] .key input[type="text"]',
              showButton: true,
              allowHotkey: true,
              dataMode: 'owning-actor',
              defaultPath: 'data'
            }
          ]
        }
      ]
    };
    aip.PACKAGE_CONFIG.push(AIP);
  }
});

/* ---------------------------------------------- */

async function addEscalationDie() {
  const render = () => {
    const escalation = ArchmageUtility.getEscalation();
    const gameRound = ArchmageUtility.getGameRound();
    const hide = game.combats.contents.length < 1 ? ' hide' : '';
    const hideIfNotGM = !game.user.isGM ? ' hide' : '';
    const subtitle = game.i18n.localize("ARCHMAGE.escalationDieLabel");
    return foundry.applications.handlebars.renderTemplate(
      "systems/watersnake-grail-war/templates/sidebar/ed-display.html",
      {
        escalation,
        gameRound,
        hide,
        hideIfNotGM,
        subtitle,
      }
    );
  };
  const htmlContent = await render();
  $('.archmage-hotbar').prepend(htmlContent);

  // Add click events for ed.
  $('body').on('click', '.ed-control', async (event) => {
    let $self = $(event.currentTarget);
    let isIncrease = $self.hasClass('ed-plus');
    await ArchmageUtility.setEscalationOffset(game.combat, isIncrease);
    const htmlContent = await render();
    $('.archmage-hotbar').find('.archmage-escalation-display').replaceWith(htmlContent);
  });

  // Add click events for effect links
  $('body').on("click", "a.effect-link", async (event) => {
    event.preventDefault();
    const a = event.currentTarget;
    let doc = null;
    let id = a.dataset.id;

    switch (a.dataset.type) {
      case "condition":
        const journalId = CONFIG.HOLYGRAILWAR.statusEffects.find(x => x.id === id)?.journal;
        doc = journalId ? await game.packs.get("watersnake-grail-war.conditions").getDocument(journalId) : false;
        break;
      case "effect":
        console.warn("Effects not currently supported");
        break;
    }
    if (!doc) return;

    return doc.sheet.render(true);
  });

  $('#chat').toggleClass('show-natural-rolls', game.settings.get('watersnake-grail-war', 'showNaturalRolls'));
  $('#chat-notifications').toggleClass('show-natural-rolls', game.settings.get('watersnake-grail-war', 'showNaturalRolls'));
}

/* -------------------------------------------- */

Hooks.once('ready', async () => {
  $(`<div class="archmage-hotbar faded-ui flexcol"></div>`).insertBefore('#players');
  await addEscalationDie();
  $('body').append('<div class="archmage-preload"></div>');
  renderSceneTerrains();

  // Apply localization to CONFIG.HOLYGRAILWAR leaf props
  // TODO: the following are currently localized on each usage, may need to be hunted down
  // one by one and moved here
  // ARCHMAGE.statusEffects
  // ARCHMAGE.extendedStatusEffects
  // ARCHMAGE.effectDurationTypes
  // ARCHMAGE.chakraSlots
  [
    "featTiers",
    "powerSources",
    "powerTypes",
    "powerUsages",
    "equipUsages",
    "featUsages",
    "actionTypes",
    "actionTypesShort",
    "creatureTypes",
    "creatureSizes",
    "creatureStrengths",
    "creatureRoles",
    "raceList",
    "classList"
  ].forEach(s => {
    for (const [k, v] of Object.entries(CONFIG.HOLYGRAILWAR[s])) {
      CONFIG.HOLYGRAILWAR[s][k] = game.i18n.localize(v);
    }
  })

  // Localize actor flags
  console.log(CONFIG.HOLYGRAILWAR.FLAGS);  // Throws an error is object isn't accessed before loop
  [
    "characterFlags",
    "npcFlags"
  ].forEach(s => {
    for (const k of Object.keys(CONFIG.HOLYGRAILWAR.FLAGS[s])) {
      CONFIG.HOLYGRAILWAR.FLAGS[s][k].name = game.i18n.localize(CONFIG.HOLYGRAILWAR.FLAGS[s][k].name);
      CONFIG.HOLYGRAILWAR.FLAGS[s][k].hint = game.i18n.localize(CONFIG.HOLYGRAILWAR.FLAGS[s][k].hint);
      if (CONFIG.HOLYGRAILWAR.FLAGS[s][k].options) {
        for (const k_opt of Object.keys(CONFIG.HOLYGRAILWAR.FLAGS[s][k].options)) {
          CONFIG.HOLYGRAILWAR.FLAGS[s][k].options[k_opt] = game.i18n.localize(CONFIG.HOLYGRAILWAR.FLAGS[s][k].options[k_opt]);
        }
      }
    }
  });
  // Override character flags now that we have them translated
  CONFIG.Actor.characterFlags = CONFIG.HOLYGRAILWAR.FLAGS.characterFlags;
  CONFIG.Actor.npcFlags = CONFIG.HOLYGRAILWAR.FLAGS.npcFlags;

  CONFIG.HOLYGRAILWAR.ActorTabFocusSheet = ActorTabFocusSheet

  // Add a constant for whether or not we're on 2e.
  CONFIG.HOLYGRAILWAR.is2e = game.settings.get('watersnake-grail-war', 'secondEdition');

  // Add effect link drag data
  document.addEventListener("dragstart", event => {
    if ( !event.target.classList.contains("effect-link") ) return;
    const dataset = event.target.dataset;
    let data = {
      type: dataset.type,
      id: dataset.id
    };
    if ( dataset.actorId ) data.actorId = dataset.actorId;
    if ( dataset.damageType ) data.damageType = dataset.damageType;
    if ( dataset.value ) data.value = dataset.value;
    if ( dataset.ends ) data.ends = dataset.ends;
    if ( dataset.source ) data.source = dataset.source;
    if ( dataset.tooltip ) data.tooltip = dataset.tooltip;
    if (dataset.name ) data.name = dataset.name;
    data.text = event.target.innerText;
    event.dataTransfer.setData("text/plain", JSON.stringify(data));
  });

  // Handle click events for the compendium browser.
  document.addEventListener("click", (event) => {
    if (event?.target?.classList?.contains("open-archmage-browser")) {
      // Retrieve the existing compendium browser, if any.
      let compendiumBrowser = Object.values(ui.windows).find(app => app.constructor.name == 'ArchmageCompendiumBrowserApplication');
      // Otherwise, build a new one.
      if (!compendiumBrowser) {
        compendiumBrowser = new ArchmageCompendiumBrowserApplication({defaultTab: event.target.dataset.tab ?? 'creatures'});
      }
      // Render the browser.
      compendiumBrowser.render(true);
    }

    if (event?.target?.classList?.contains('archmage-rolls-reference')) {
      event.preventDefault();
      new ArchmageReference().render(true);
    }

    if (event?.target?.classList?.contains('create-baseline-monster')) {
      event.preventDefault();
      baselineMonsterDialog();
    }
  });

  // Wait to register the hotbar macros until ready.
  Hooks.on("hotbarDrop", (bar, data, slot) => {
    if (['Item'].includes(data.type)) {
      createArchmageMacro(data, slot);
      return false;
    }
  });

  $('.message').off("contextmenu");

  // Build the module art map. See module/setup/register-module-art.js for more details.
  registerModuleArt();
});

/* ---------------------------------------------- */

Hooks.on("renderDocumentDirectory", (app, html, options) => {
  const htmlElement = $(html)[0];
  if (options.documentCls === 'actor') {
    htmlElement.querySelector(".directory-footer").insertAdjacentHTML("beforeend", `
      <div class="flexrow">
        <button type="button" class="open-archmage-browser" data-tab="creatures">
          <i class="fas fa-face-smile-horns open-archmage-browser"></i>
        ${game.i18n.localize('ARCHMAGE.COMPENDIUMBROWSER.buttons.browseCreatures')}
        </button>
        <button type="button" class="create-baseline-monster" style="flex-grow: 0;"
          data-tooltip="${game.i18n.localize('ARCHMAGE.COMPENDIUMBROWSER.buttons.baselineMonster')}"
          data-tooltip-direction="UP">
          <i class="fas fa-spaghetti-monster-flying"></i>
        </button>
      </div>
    `);
  }
  if (options.documentCls === 'item') {
    htmlElement.querySelector(".directory-footer").insertAdjacentHTML("beforeend", `
      <div class="flexrow">
        <button type="button" class="open-archmage-browser" data-tab="powers"><i class="fas fa-swords open-archmage-browser"></i>${game.i18n.localize('ARCHMAGE.COMPENDIUMBROWSER.buttons.browsePowers')}</button>
        <button type="button" class="open-archmage-browser" data-tab="items"><i class="fas fa-wand-magic-sparkles open-archmage-browser"></i>${game.i18n.localize('ARCHMAGE.COMPENDIUMBROWSER.buttons.browseItems')}</button>
      </div>`);
  }
});

/* -------------------------------------------- */

function renderSceneTerrains() {

  // Remove any existing element
  $('.archmage-terrains').remove();

  let scene = game.scenes.viewed;
  if ( !scene) return;
  let flag = scene.getFlag('watersnake-grail-war', 'terrains');
  if ( !flag) return;
  let terrains = flag.filter(x => x !== 'none');
  if ( !terrains || (terrains.length === 0) ) return;

  const label = game.i18n.localize('ARCHMAGE.terrains');
  const isGM = game.user.isGM ? 'gm' : '';
  const aside = $(`
    <aside class="archmage-terrains flexcol ${isGM}">
      <h4 class="archmage-terrains-header">${label}</h4>
    </aside>
  `);
  if ( terrains ) {
      terrains.forEach(t => {
        const terrain = game.holygrailwar.terrains.find(x => x.id === t);
        aside.append(`<div><i class="${terrain.icon}"></i> ${game.i18n.localize(terrain.name)}</div>`);
      });
  }
  // Set height based on number of terrains
  $('.archmage-hotbar').append(aside);
}

/* -------------------------------------------- */

Hooks.on('canvasReady', (canvas) => {
  renderSceneTerrains();
});

Hooks.on('renderSettingsConfig', (app, html, data) => {
  html = $(html);
  // Define groups for organization.
  const groups = [
    {
      label: 'ARCHMAGE.SETTINGS.groups.edition',
      settings: ['secondEdition', 'alternateIconRollingMethod'],
      highlights: [
        'alternateIconRollingMethod',
      ],
    },
    {
      label: 'ARCHMAGE.SETTINGS.groups.automation',
      settings: [
        'enableOngoingEffectsMessages',
        'resetIconsOnRest',
        'automateHPConditions',
        'staggeredOverlay',
        'multiTargetAttackRolls',
        'hideExtraRolls',
        'showDefensesInChat',
        'showVulnsInChat',
        'hideInsteadOfOpaque',
        'roundUpDamageApplication',
        'allowTargetDamageApplication',
        'allowRerolls',
        'rechargeOncePerDay',
        'optionalBaseCritRange',
        'automateBaseStatsFromClass',
        'showPrivateGMAttackRolls',
      ],
      highlights: [
      ],
    },
    {
      label: 'ARCHMAGE.SETTINGS.groups.appearance',
      settings: [
        'nightmode',
        'compactMode',
        'showNaturalRolls',
        'sheetTooltips',
      ],
      highlights: [
      ],
    },
    {
      label: 'ARCHMAGE.SETTINGS.groups.accessibility',
      settings: [
        'colorBlindMode'
      ],
      highlights: [],
    },
    {
      label: 'ARCHMAGE.SETTINGS.groups.general',
      settings: [
        'allowPasteParsing',
        'extendedStatusEffects',
        'initiativeDexTiebreaker',
        'initiativeStaticNpc',
        'unboundEscDie',
        'tourVisibility',
      ],
      highlights: [
      ],
    }
  ];

  // Find the parent category element.
  const settingsElements = html.find('section[data-category="system"] .form-group');
  const parent = settingsElements.closest('section');
  parent.addClass('archmage-settings');

  // Iterate through our groups and move all of their settings into the matching element.
  for (let group of groups) {
    const details = $(`<details><summary>${game.i18n.localize(group.label)}</summary><span class="slot"></span></details>`);
    let settingsCount = 0;

    for (let setting of group.settings) {
      const element = html.find(`label[for="settings-config-archmage.${setting}"]`).parent();
      if (element.length < 1) continue;

      // Add a highlight if necessary.
      if (group.highlights.includes(setting)) {
        element.addClass('highlight');
        element.find('label').append(`<span class="new-setting"> (${game.i18n.localize('ARCHMAGE.SETTINGS.newSetting')})</span>`);
      }

      // Move the element.
      element.detach();
      details.append(element);
      settingsCount++;

      // Add listener for the colorblind selector.
      if (setting === 'colorBlindMode') {
        element.find('select').on('change', changeColorBlindPreview);
      }
    }

    // Add special template for the a11y section.
    if (settingsCount > 0) {
      if (group.label.includes('accessibility')) {
        foundry.applications.handlebars.renderTemplate("systems/watersnake-grail-war/templates/sidebar/apps/a11y-preview.html", {}).then(tpl => {
          details.append(tpl);
        });
      }
      parent.append(details);
    }
  }

  // Event listener for the color blind selector.
  function changeColorBlindPreview(event) {
    const element = event.currentTarget;
    const parent = element.closest('details');
    const preview = parent?.querySelector('.archmage-settings-preview');
    const value = element.value;

    if (!preview) return;

    switch (value) {
      case 'colorBlindRG':
        preview.classList.remove('colorBlindBY');
        preview.classList.add('colorBlindRG');
        break;

      case 'colorBlindBY':
        preview.classList.remove('colorBlindRG');
        preview.classList.add('colorBlindBY');
        break;

      default:
        preview.classList.remove('colorBlindBY');
        preview.classList.remove('colorBlindRG');
        break;
    }
  };
});

/* -------------------------------------------- */

Hooks.on('renderSceneConfig', (app, html, data) => {

  // Attach a list of Terrains to the scene config as a multi-select
  const terrainOptions = game.holygrailwar.terrains.map(t => {
      return {
          value: t.id,
          label: game.i18n.localize(t.name)
      };
  });
  const currentTerrains = data.document.getFlag('watersnake-grail-war', 'terrains') || [];

  // Create multiple select dom element
  const htmlSelect = $(`<select style="height:125px;" multiple="multiple" name="flags.watersnake-grail-war.terrains" data-dtype="String"></select>`);
  terrainOptions.forEach(o => {
      const attrs = ["value='"+o.value+"'", currentTerrains.includes(o.value) ? "selected=" : ""];
      const option = $(`<option ${attrs.join(" ")}>${o.label}</option>`);
      htmlSelect.append(option);
  });

  // Wrap the select in a form-group
  const htmlFormGroup = $(`<div class="form-group"></div>`);
  htmlFormGroup.append(`<label>${game.i18n.localize("ARCHMAGE.TERRAINS.label")}</label>`);
  htmlFormGroup.append(htmlSelect);

  // Attach the select after .initial-position
  html = $(html);
  const lastControl = html.find('div[data-tab=basics] .form-group').last();
  lastControl.after(htmlFormGroup);

  // Update the height of the scene config by setting to auto
  $(app.element).css('height', 'auto');
});

/* -------------------------------------------- */

Hooks.on("updateScene", (scene, data, options, userId) => {
  renderSceneTerrains();
});

/* ---------------------------------------------- */

Hooks.on("renderSettings", async (app, html) => {
  html = $(html);
  let button = $(`<button id="archmage-reference-btn" class="archmage-rolls-reference" type="button" data-action="archmage-help"><i class="fas fa-dice-d20"></i> 능력치 및 인라인 굴림 참조</button>`);
  html.find('button[data-app="controls"]').after(button);

  // Event trigger has been moved to the ready hook using the archmage-rolls-reference class.
  // button.on('click', ev => {
  //   ev.preventDefault();
  //   new ArchmageReference().render(true);
  // });

  let helpButton = $(`<button id="archmage-help-btn" type="button" data-action="archmage-help"><i class="fas fa-question-circle"></i> System Documentation</button>`);
  html.find('button[data-app="controls"]').after(helpButton);

  helpButton.on('click', ev => {
    ev.preventDefault();
    window.open('https://asacolips.gitbook.io/toolkit13-system/', 'archmageHelp', 'width=1032,height=720');
  });

  let licenseButton = $(`<button id="archmage-license-btn" type="button" data-action="archmage-help"><i class="fas fa-book"></i> ${game.i18n.localize('ARCHMAGE.DIALOG.CUP.title')}</button>`);
  html.find('button[data-app="controls"]').after(licenseButton);

  licenseButton.on('click', ev => {
    ev.preventDefault();
    new Dialog({
      title: game.i18n.localize('ARCHMAGE.DIALOG.CUP.title'),
      content: game.i18n.localize('ARCHMAGE.DIALOG.CUP.content'),
      buttons: {},
    }).render(true);
  });


  // This is intentionally in renderSettings, as it is one of the last bits of HTML to get rendered, which is required for the Tour to hook in
  let tourVisibility = game.settings.get('watersnake-grail-war', 'tourVisibility');
  let showTours = tourVisibility !== 'off' ? true : false;

  if (tourVisibility == 'gm' && !game.user.isGM) {
    showTours = false;
  }

  if (showTours) {
    let tourGuide = new TourGuide();
    await tourGuide.registerTours();
    // @todo fix tours for v10
    // tourGuide.startNewFeatureTours();
  }
});

Hooks.on('diceSoNiceReady', (dice3d) => {
  dice3d.addSystem({ id: "archmage", name: "Archmage" }, false);

  // Disable DsN's automatic parsing of inline rolls - let users enable it
  if (foundry.utils.isNewerVersion(game.modules.get('dice-so-nice')?.version, "4.1.1")
    && !game.settings.get("watersnake-grail-war", "DsNInlineOverride")) {
    game.settings.set("dice-so-nice", "animateInlineRoll", false);
    game.settings.set("watersnake-grail-war", "DsNInlineOverride", true);
  }

  dice3d.addTexture("archmagered", {
    name: "Archmage Red",
    composite: "source-over",
    source: "systems/watersnake-grail-war/images/redTexture.png"
  })
    .then(() => {
      dice3d.addColorset({
        name: 'archmage',
        description: "Archmage Red/Gold",
        category: "Archmage",
        background: ["#9F8"],
        texture: 'archmagered',
        edge: '#9F8003',
        foreground: '#9F8003',
        default: true
      });
    });
});

/* ---------------------------------------------- */
Hooks.on('preCreateToken', async (scene, data, options, id) => {
  let actorId = data.actorId;
  // Attempt to get the actor.
  let actor = game.actors.get(actorId);

  // If there's an actor, set the token size.
  if (actor) {
    let size = actor.system.details.size?.value;
    if (size == 'large' && data.height == 1 && data.width == 1) {
      data.height = 2;
      data.width = 2;
    }
    if (size == 'huge' && data.height == 1 && data.width == 1) {
      data.height = 3;
      data.width = 3;
    }
  }
});

/* -------------------------------------------- */

Hooks.on('dropActorSheetData', (actor, sheet, data) => {
  const types = ['effect', 'ActiveEffect', 'condition', 'ongoing-damage'];
  if (types.includes(data.type)) {
    // Render the condition dialog and apply the effect.
    _applyAE(actor, data);
    // Return false to prevent Foundry from adding a duplicate effect.
    return false;
  }
});

/* ---------------------------------------------- */

Hooks.on('dropCanvasData', async (canvas, data) => {

  function findToken() {
    // Get the token at the drop point, if any
    const x = data.x;
    const y = data.y;
    const gridSize = canvas.scene.grid.size;
    // Get the set of targeted tokens
    const targets = Array.from(canvas.scene.tokens.values()).filter(t => {
      if (!t.visible) return false;
      return (t.x <= x
          && (t.x + t.width * gridSize) >= x
          && t.y <= y
          && (t.y + t.height * gridSize) >= y);
    });
    if (targets.length == 0) return null;

    let token = targets[0];
    if (targets.length > 1) {
      // Select closest to center
      token = targets.reduce((a, b) => {
        const cntr_x_a = a.x + a.width * gridSize / 2;
        const cntr_y_a = a.y + a.height * gridSize / 2;
        const dist_a = Math.sqrt(Math.pow(x - cntr_x_a, 2) + Math.pow(y - cntr_y_a, 2));
        const cntr_x_b = b.x + b.width * gridSize / 2;
        const cntr_y_b = b.y + b.height * gridSize / 2;
        const dist_b = Math.sqrt(Math.pow(x - cntr_x_b, 2) + Math.pow(y - cntr_y_b, 2));
        return (dist_a < dist_b ? a : b);
      });
    }
    return token;
  }
  const token = findToken();
  if (!token) return;
  return await _applyAE(token.actor, data);
});

async function _applyAE(actor, data) {
  if ( data.type === "condition" ) {
    // Handle hampered in 2e.
    if (CONFIG.HOLYGRAILWAR.is2e && data.id === 'hampered') {
      data.id = 'hindered';
    }
    // Check for existing statuses.
    let statusEffect = CONFIG.statusEffects.find(x => x.id === data.id || x.id === data.name?.toLowerCase());
    const ends = data.ends ?? "Unknown";
    if ( statusEffect ) {
      statusEffect = foundry.utils.duplicate(statusEffect);
      statusEffect.label = game.i18n.localize(statusEffect.name);
      statusEffect.name = statusEffect.label;
      statusEffect.origin = data.source;
      // Add it as a status so that it can be toggled on the token.
      statusEffect.statuses = [statusEffect.id];
      statusEffect.duration = ends;

      return await _applyAEDurationDialog(actor, statusEffect, ends, data.source, data.type);
    }
    else {
      // Just a generic condition, transfer the name
      let effectData = {
        name: data.name,
        img: 'icons/svg/aura.svg',
        origin: data.source,
        duration: ends
      };
      return await _applyAEDurationDialog(actor, effectData, ends, data.source, data.type);
    }
  }
  else if ( data.type === "effect" || data.type === 'ActiveEffect' ) {
    let effect = null;
    let sourceDocument = null;
    if (data.uuid) {
      effect = fromUuidSync(data.uuid);
      sourceDocument = effect.parent?.parent ?? effect.parent;
    }
    else {
      const actorId = data.actorId;
      const sourceActor = game.actors.get(actorId);
      if (sourceActor) {
        effect = sourceActor.effects.get(data.id);
        sourceDocument = sourceActor;
      }
      else {
        effect = {
          name: data.name,
          img: 'icons/svg/aura.svg',
          origin: data?.source ?? null,
        }
      }
    }
    let effectData = foundry.utils.duplicate(effect);
    const ends = effectData.flags?.['watersnake-grail-war']?.duration ?? "Unknown";
    return await _applyAEDurationDialog(actor, effectData, ends, sourceDocument?.uuid, data.type);
  }
  else if ( data.type == "ongoing-damage" ) {

    // Load the source actor and grab its image if possible
    let sourceActor = await fromUuid(data.source);
    // let img = sourceActor?.img ?? "icons/skills/toxins/symbol-poison-drop-skull-green.webp";
    const img = data.value >= 0 ? "icons/svg/degen.svg" : "icons/svg/regen.svg";

    let effectData = {
      name: data.name,
      img: img,
      origin: data.source,
      flags: {
        archmage: {
          ongoingDamage: data.value,
          ongoingDamageType: data.damageType,
          ongoingDamageCrit: false,
          duration: data.ends,
          tooltip: data.tooltip
        }
      }
    }
    return await _applyAEDurationDialog(actor, effectData, data.ends, data.source, data.type);
  }
}

async function _applyAEDurationDialog(actor, effectData, duration, source, type = null) {
  // If no effectData something went wrong, stop gracefully
  if ( effectData == undefined ) {
    ui.notifications.warn(game.i18n.localize("ARCHMAGE.UI.warnStatusEffect"));
    return;
  }

  // Shift bypass
  if (event?.shiftKey) {
    if ( !duration ) duration = "Unknown";
    let options = {};
    if (['StartOfNextSourceTurn', 'EndOfNextSourceTurn'].includes(duration)) {
      options = {sourceTurnUuid: source};
    }
    game.holygrailwar.MacroUtils.setDuration(effectData, duration, options);
    return actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
  }

  // Render modal dialog
  const sourceActor = await fromUuid(source);
  let durations = foundry.utils.duplicate(CONFIG.HOLYGRAILWAR.effectDurationTypes);
  delete durations['Unknown'];
  const template = 'systems/watersnake-grail-war/templates/chat/apply-AE.html';
  let dialogData = {
    effectName: effectData.name,
    sourceName: sourceActor?.name ?? "",
    ongoing: effectData?.flags?.['watersnake-grail-war']?.ongoingDamage ?? false,
    defaultDuration: duration != 'Unknown' ? duration : "",
    durations: durations
  };

  foundry.applications.handlebars.renderTemplate(template, dialogData).then(dlg => {
    new Dialog({
      title: game.i18n.localize("ARCHMAGE.CHAT.applyAETitle"),
      content: dlg,
      buttons: {
        apply: {
          label: game.i18n.localize("ARCHMAGE.CHAT.Apply"),
          callback: (html) => {
            duration = html.find('[name="duration"]:checked').val();
            const ongoing = {
              half: html.find('[name="ongoingHalf"]')?.is(":checked") ?? false,
              crit: html.find('[name="ongoingCrit"]')?.is(":checked") ?? false,
            };
            if ( !duration ) duration = "Unknown";
            let options = {};
            if (['StartOfNextSourceTurn', 'EndOfNextSourceTurn'].includes(duration)) {
              options = {sourceTurnUuid: source};
            } else if (duration == 'EndOfRound') {
              if (!game.combat) ui.notifications.warn(game.i18n.localize("ARCHMAGE.DURATION.EndOfRoundWarning"));
              options = {round: game.combat?.round || 1};
            }
            if (ongoing.half) {
              effectData.flags['watersnake-grail-war'].ongoingDamage = Math.floor(Number(effectData.flags['watersnake-grail-war'].ongoingDamage) / 2);
            }
            if (ongoing.crit) {
              effectData.flags['watersnake-grail-war'].ongoingDamageCrit = true;
            }
            game.holygrailwar.MacroUtils.setDuration(effectData, duration, options);
            return actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
          }
        },
        cancel: {
          label: game.i18n.localize("ARCHMAGE.CHAT.Cancel"),
          callback: () => {}
        },
      },
      default: 'apply'
    }).render(true);
  });
}

Hooks.on("renderJournalSheet", async (app, html, data) => {
  app._element[0].classList.add("archmage-v2");
});

/* ---------------------------------------------- */

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}


// 성배전쟁: feature 카드(능력치 판정/피해/기타) 버튼 굴림 + 재굴림 처리
Hooks.on('renderChatMessageHTML', (chatMessage, rawhtml) => {
  const html = $(rawhtml);
  const resolveActor = (card) => {
    const tokenId = card.dataset.tokenId;
    return (tokenId && game.actors.tokens[tokenId]) || game.actors.get(card.dataset.actorId);
  };
  const handle = async (card, rollType) => {
    if (!card) return;
    const actor = resolveActor(card);
    if (!actor) return;
    const item = actor.items.get(card.dataset.itemId);
    if (!item) return;
    await game.holygrailwar.ArchmageUtility.rollFeature(actor, item, rollType);
  };
  html.find('.feature-card .feature-action').on('click', async (ev) => {
    ev.preventDefault();
    await handle(ev.currentTarget.closest('.feature-card'), ev.currentTarget.dataset.rollType);
  });
  html.find('.feature-roll-card .feature-reroll').on('click', async (ev) => {
    ev.preventDefault();
    const card = ev.currentTarget.closest('.feature-roll-card');
    await handle(card, card?.dataset.rollType);
  });
});

Hooks.on('renderChatMessageHTML', (chatMessage, rawhtml, options) => {
  const html = $(rawhtml);

  // Override the inline roll click behavior.
  html.find('a.inline-roll').addClass('inline-roll--archmage').removeClass('inline-roll');
  html.find('.dice-roll').addClass('dice-roll--archmage');
  html.find('.inline-roll--archmage, .dice-roll--archmage').each(function() {
    var uuid = uuidv4();
    // Add a way to uniquely identify this roll
    $(this)[0].dataset.uuid = uuid;
    $(this).off("contextmenu");

    // 성배전쟁: 전체 주사위 카드(판정/세이브 등)엔 'Apply Changes' 우클릭 메뉴 미부착 (인라인 롤만 유지)
    if ($(this).hasClass('dice-roll--archmage')) return;

    const triggerTarget = game.i18n.localize("ARCHMAGE.CHAT.target") + ":";
    const triggerCastPower = game.i18n.localize("ARCHMAGE.CHAT.castPower") + ":";
    if ($(this).parent()[0].innerText.includes(triggerTarget) &&
        !$(this).parent()[0].innerText.includes(triggerCastPower)) {
      // Ignore if this is a "Target:" line (but not if its "Cast for Power:",
      // which in some localizations contains "Target:").
      return;
    }

    const triggerAttack = game.i18n.localize("ARCHMAGE.attack") + ":";
    let isAttack = false;
    if ($(this).parent()[0].innerText.includes(triggerAttack)) {
      // Ignore if this is a "Attack:" line.
      // return;
      isAttack = true;
    }

    // Determine if applying damage to targets is allowed.
    const allowTargeting = game.settings.get('watersnake-grail-war', 'allowTargetDamageApplication');
    let targetType = game.settings.get('watersnake-grail-war', 'userTargetDamageApplicationType');
    if (!allowTargeting && targetType !== 'selected') {
      game.settings.set('watersnake-grail-war', 'userTargetDamageApplicationType', 'selected');
      targetType = 'selected';
    }

    // Build the list of menu items, starting with the target buttons
    // if allowed.
    let menuItems = [];
    if (allowTargeting && !isAttack) {
      menuItems.push({
        name: `
          <div class="damage-target flex flexrow">
            <button type="button" data-target="targeted"><i class="fa-solid fa-bullseye"></i> ${game.i18n.localize('ARCHMAGE.UI.targeted')}</button>
            <button type="button" data-target="selected"><i class="fa-solid fa-expand"></i> ${game.i18n.localize('ARCHMAGE.UI.selected')}</button>
          </div>`,
        id: 'targets',
        icon: '',
        preventClose: true,
        callback: (inlineRoll, event) => {
          const button = event?.target ?? event?.currentTarget;
          if (button?.dataset?.target) {
            // Deactivate the other target type.
            const activeButtons = inlineRoll.find('button[data-target].active');
            activeButtons.removeClass('active');
            // Set the target type on the menu for later reference.
            const menu = inlineRoll.find('#context-menu2')[0];
            if (menu) {
              menu.dataset.target = button.dataset.target;
            }
            // Toggle the active button and update the user setting.
            button.classList.add('active');
            game.settings.set('watersnake-grail-war', 'userTargetDamageApplicationType', button.dataset.target);
          }
        }
      });
    }

    // Add all of the damage/healing options.
    if (!isAttack) {
      function getRollFromElement(element) {
        return element.hasClass('inline-roll--archmage')
          ? element
          : element.find('.dice-total');
      }

      // Add damage multipliers.
      menuItems.push({
        name: `
          <div class="damage-modifiers flex flexrow">
            <button class="damage-modifier" type="button" data-mod="0.25">&frac14;x</button>
            <button class="damage-modifier" type="button" data-mod="0.5">&frac12;x</button>
            <button class="damage-modifier active" type="button" data-mod="1" class="active">1x</button>
            <button class="damage-modifier" type="button" data-mod="1.5">1.5x</button>
            <button class="damage-modifier" type="button" data-mod="2">2x</button>
            <button class="damage-modifier" type="button" data-mod="3">3x</button>
            <button class="damage-modifier" type="button" data-mod="4">4x</button>
          </div>`,
        id: 'modifiers',
        icon: '',
        preventClose: true,
        callback: (inlineRoll, event) => {
          const button = event?.target ?? event?.currentTarget;
          if (button?.dataset?.mod) {
            // Deactivate the other target type.
            const activeButtons = inlineRoll.find('button[data-mod].active');
            activeButtons.removeClass('active');
            // Set the target type on the menu for later reference.
            const menu = inlineRoll.find('#context-menu2')[0];
            if (menu) {
              menu.dataset.mod = button.dataset.mod;
            }
            // Toggle the active button and update the user setting.
            button.classList.add('active');
            // game.settings.set('watersnake-grail-war', 'userTargetDamageApplicationType', button.dataset.target);
          }
        }
      });

      // Add damage application links.
      menuItems.push(
        {
          name: game.i18n.localize("ARCHMAGE.contextApplyDamage"),
          id: 'damage',
          icon: '<i class="fas fa-tint"></i>',
          callback: (inlineRoll, event) => {
            const menu = inlineRoll.find('#context-menu2')?.[0];
            const targetType = menu?.dataset?.target ?? 'selected';
            const mod = menu?.dataset?.mod ? Number(menu.dataset.mod) : 1;
            new DamageApplicator().asDamage(getRollFromElement(inlineRoll), mod, targetType);
          }
        },
        {
          name: game.i18n.localize("ARCHMAGE.contextApplyHealing"),
          id: 'healing',
          icon: '<i class="fas fa-medkit"></i>',
          callback: (inlineRoll, event) => {
            const menu = inlineRoll.find('#context-menu2')?.[0];
            const targetType = menu?.dataset?.target ?? 'selected';
            const mod = menu?.dataset?.mod ? Number(menu.dataset.mod) : 1;
            new DamageApplicator().asHealing(getRollFromElement(inlineRoll), mod, targetType);
          }
        },
        {
          name: game.i18n.localize("ARCHMAGE.contextApplyTempHealth"),
          id: 'temp-healing',
          icon: '<i class="fas fa-heart"></i>',
          callback: (inlineRoll, event) => {
            const menu = inlineRoll.find('#context-menu2')?.[0];
            const targetType = menu?.dataset?.target ?? 'selected';
            const mod = menu?.dataset?.mod ? Number(menu.dataset.mod) : 1;
            new DamageApplicator().asTempHealth(getRollFromElement(inlineRoll), mod, targetType);
          }
        }
      );
    }

    // Add the reroll action regardless of whether or not this is an attack.
    const allowRerolls = game.settings.get('watersnake-grail-war', 'allowRerolls') ?? false;
    const messageAuthor = options.message?.author ?? options.message?.user;
    if (game.user.isGM || (allowRerolls && messageAuthor === game.user.id)) {
      menuItems.push({
        name: game.i18n.localize("ARCHMAGE.contextReroll"),
        id: 'reroll',
        icon: '<i class="fas fa-rotate-left"></i>',
        callback: (html, event) => {
          DamageApplicator.rerollDice(html);
        }
      });
    }

    // Bind the context menu to the event.
    new ContextMenu2($(this).parent(), `[data-uuid=${uuid}]`, menuItems);
  });
  html.find('a.inline-roll--archmage').on('click', async event => {
    event.preventDefault();
    const a = event.currentTarget;

    // For inline results expand or collapse the roll details
    if (a.classList.contains("inline-result")) {
      const roll = Roll.fromJSON(unescape(a.dataset.roll));
      // Build a die string of the die parts, including whether they're discarded.
      const dieTotal = roll.terms.reduce((string, r) => {
        if (typeof string == 'object') {
          string = '';
        }

        if (r.results) {
          string = `${string}${r.results.map(d => `<span class="${d.discarded || d.rerolled ? 'die die--discarded' : 'die'}">${d.result}</span>`).join('+')}`;
        }
        else {
          string = `${string}<span class="mod">${r.number ?? r.operator}</span>`;
        }

        return string;
      }, {});

      // Replace the html.
      const tooltip = a.classList.contains("expanded") ? roll.total : `${dieTotal} = ${roll._total}`;
      a.innerHTML = `<i class="fas fa-dice-d20"></i> ${tooltip}`;
      a.classList.toggle("expanded");
    }

    // Otherwise execute the deferred roll
    else {
      const cls = CONFIG.ChatMessage.documentClass;

      // Get the "speaker" for the inline roll
      const actor = cls.getSpeakerActor(cls.getSpeaker());
      const rollData = actor ? actor.getRollData() : {};

      // Execute the roll
      const roll = await new Roll(a.dataset.formula, rollData).roll();
      var message = roll.toMessage({ flavor: a.dataset.flavor }, { rollMode: a.dataset.mode });
      $('.message').off("contextmenu");
      return message;
    }

  });

  // Hook up Effect buttons
  html.find(".effect-control").on("click", async (event) => {
    const action = event.currentTarget.dataset.action;
    event.currentTarget.classList.add("grayed-out");
    // Get parent
    const parent = event.currentTarget.closest(".effect");
    const uuid = parent.dataset.uuid;
    const actor = await fromUuid(uuid);
    const effectId = parent.dataset.effectId;
    const effect = actor.effects.get(effectId);
    switch (action) {
      case "apply":
        const value = parent.dataset.value;
        // Healing always starts from 0 HP
        const base = value >= 0 ? actor.system.attributes.hp.value : Math.max(actor.system.attributes.hp.value, 0);
        await actor.update({ "system.attributes.hp.value": base - value });
        if (chatMessage.isAuthor || game.user.isGM) await chatMessage.setFlag('watersnake-grail-war', `effectApplied.${effectId}`, true);
        else game.socket.emit('system.archmage', {type: 'condButton', msg: chatMessage.id, flg: `effectApplied.${effectId}`});
        // Unset crit flag on ongoing damage if needed.
        if (effect?.flags?.['watersnake-grail-war']?.ongoingDamageCrit === true) {
          await effect.update({'flags.watersnake-grail-war.ongoingDamageCrit': false});
        }
        break;
      case "save":
        const duration = parent.dataset.save;
        const durationToDifficulty = {
          "EasySaveEnds": "easy",
          "NormalSaveEnds": "normal",
          "HardSaveEnds": "hard",
        }
        await actor.rollSave(durationToDifficulty[duration] ?? "normal");
        if (chatMessage.isAuthor || game.user.isGM) await chatMessage.setFlag('watersnake-grail-war', `effectSaved.${effectId}`, true);
        else game.socket.emit('system.archmage', {type: 'condButton', msg: chatMessage.id, flg: `effectSaved.${effectId}`});
        break;
      case "d20":
        new Roll("d20").toMessage()
        if (chatMessage.isAuthor || game.user.isGM) await chatMessage.setFlag('watersnake-grail-war', `effectRolled.${effectId}`, true);
        else game.socket.emit('system.archmage', {type: 'condButton', msg: chatMessage.id, flg: `effectRolled.${effectId}`});
        break;
      case "remove":
        await actor.deleteEmbeddedDocuments("ActiveEffect", [effectId]);
        if (chatMessage.isAuthor || game.user.isGM) {
          await chatMessage.setFlag('watersnake-grail-war', `effectRemoved.${effectId}`, true);
          // Replace grayed-out with disabled
          event.currentTarget.classList.remove("grayed-out");
          event.currentTarget.classList.add("disabled");
          event.currentTarget.setAttribute('disabled', true);
        } else {
          game.socket.emit('system.archmage', {
            type: 'condButton',
            msg: chatMessage.id,
            flg: `effectRolled.${effectId}`,
            disable: event.currentTarget});
        }
        break;
    }
    chatMessage.render();
  });

  // Gray out and disable the effect buttons if the effect has already been applied, saved, or removed
  html.find(".effect-control").each((i, el) => {
    if (!chatMessage?.flags?.['watersnake-grail-war']) return;
    const flags = chatMessage.flags['watersnake-grail-war'];
    const parent = el.closest('.effect');
    const effectId = parent.dataset.effectId;

    if (el.dataset.action === "apply" && flags?.effectApplied?.[effectId] == true) {
      el.classList.add("grayed-out");
    } else if (el.dataset.action === "save" && flags?.effectSaved?.[effectId] == true) {
      el.classList.add("grayed-out");
    } else if (el.dataset.action === "d20" && flags?.effectRolled?.[effectId] == true) {
      el.classList.add("grayed-out");
    } else if (el.dataset.action === "remove" && flags?.effectRemoved?.[effectId] == true) {
      el.classList.add("disabled");
      el.setAttribute('disabled', true);
    }
  });
});

function _handleCondButtonMsg(msg) {
  if (!game.holygrailwar.isSocketGM) return;
  const chatMessage = game.messages.get(msg.msg);
  if (chatMessage) {
    if (msg.disable) {
      // Replace grayed-out with disabled
      msg.disable.classList.remove("grayed-out");
      msg.disable.classList.add("disabled");
      msg.disable.setAttribute('disabled', true);
    } else {
      chatMessage.setFlag('watersnake-grail-war', msg.flg, true);
    }
  }
}

function _handlecreateAEsMsg(msg) {
  if (!game.holygrailwar.isSocketGM()) return;
  msg.actorIds.forEach(id => {
    const actor = game.actors.get(id);
    actor.createEmbeddedDocuments("ActiveEffect", msg.effects);
  });
}

/**
 * Handle damage/healing application emitted via sockets.
 *
 * The DamageApplicator class supports applying damage to targeted
 * tokens as an optional feature, and if doing so, it needs to be
 * handled via a socket due to user permissions for unowned targets.
 *
 * @param {object} data Operation data from the emitted socket.
 * @returns {void}
 */
function _handleApplyDamageHealing(data) {
  if (!game.holygrailwar.isSocketGM()) return;
  data.uuids.forEach(uuid => {
    // Retrieve a copy of the actor.
    const token = fromUuidSync(uuid);
    const actor = token?.actor ?? false;
    if (actor) {
      const updates = {};
      // Handle update operations.
      if (data.operation === 'damage') {
        updates[data.attr] = foundry.utils.getProperty(actor, data.attr) - data.value;
      }
      else if (data.operation === 'healing') {
        updates[data.attr] = Math.max(0, foundry.utils.getProperty(actor, data.attr)) + data.value;
      }
      else if (data.operation === 'tempHealing') {
        const hp = {...actor.system.attributes.hp};
        if (isNaN(hp.temp) || hp.temp === undefined) hp.temp = 0;
        hp.temp = Math.max(hp.temp, data.value);
        updates[data.attr] = hp.temp;
      }
      // Apply the update, if any.
      if (updates?.[data.attr]) {
        actor.update(updates);
      }
    }
  });
}

function _handleActorLifecycleHook({actorId, hookName}) {
  const actor = game.actors.get(actorId);
  if (!actor || game.user.character.id !== actor.id) return;

  // Can't run if you can't run
  if (!game.user.hasPermission("MACRO_SCRIPT")) return;

  const speaker = ChatMessage.implementation.getSpeaker();
  const macroData = {
      // TODO: ???
  };

  const hookBody = actor.system.lifecycleHooks?.[hookName]?.trim();
  if (!hookBody) return;

  const AsyncFunction = async function () {}.constructor;
  try {
      const fn = new AsyncFunction("speaker", "actor", "archmage", hookBody);
      return fn.call(this, speaker, actor, macroData);
  } catch (ex) {
      ui.notifications.error(game.i18n.localize('ARCHMAGE.UI.errMacroSyntax'));
      console.error(`Lifecycle hook '${actor.name}' / ${hookName} failed with: ${ex}`, ex);
  }
}

Hooks.once('ready', async function () {
  game.socket.on("system.archmage", (data) => {
    switch (data.type) {
      case 'shareItem':
        ItemArchmageSheet.handleShareItem(data);
        break;
      case 'condButton':
        _handleCondButtonMsg(data);
        break;
      case 'createAEs':
        _handlecreateAEsMsg(data);
        break;
      case 'applyDamageHealing':
        _handleApplyDamageHealing(data);
        break;
      case 'actorLifecycleHook':
        _handleActorLifecycleHook(data);
        break
      default:
        console.log(data);
    }
  });
})


// @todo likely deprecated by the revised ContextMenu2 in the render chat message hook.
// Hooks.on("getChatLogEntryContext", (html, options) => {
//   let canApply = li => {
//     const message = game.messages.get(li.data("messageId"));
//     return message?.isRoll && message?.isContentVisible;
//   };
//   let getRoll = li => {
//     const message = game.messages.get(li.data("messageId"));
//     const roll = message?.rolls[0];
//     return roll;
//   }

//   // @todo figure out a good solution to allow the target application
//   // to show up here. Maybe render to the chat card directly?

//   options.push(
//     {
//       name: game.i18n.localize("ARCHMAGE.contextApplyDamage"),
//       icon: '<i class="fas fa-tint"></i>',
//       condition: canApply,
//       callback: li => {
//         new DamageApplicator().asDamage(getRoll(li), 1);
//       }
//     },
//     {
//       name: game.i18n.localize("ARCHMAGE.contextApplyDamageHalf"),
//       icon: '<i class="fas fa-tint"></i>',
//       condition: canApply,
//       callback: li => {
//         new DamageApplicator().asDamage(getRoll(li), .5);
//       }
//     },
//     {
//       name: game.i18n.localize("ARCHMAGE.contextApplyDamageDouble"),
//       icon: '<i class="fas fa-tint"></i>',
//       condition: canApply,
//       callback: li => {
//         new DamageApplicator().asDamage(getRoll(li), 2);
//       }
//     },
//     {
//       name: game.i18n.localize("ARCHMAGE.contextApplyDamageTriple"),
//       icon: '<i class="fas fa-tint"></i>',
//       condition: canApply,
//       callback: li => {
//         new DamageApplicator().asDamage(getRoll(li), 3);
//       }
//     },
//     {
//       name: game.i18n.localize("ARCHMAGE.contextApplyHealing"),
//       icon: '<i class="fas fa-medkit"></i>',
//       condition: canApply,
//       callback: li => {
//         new DamageApplicator().asHealing(getRoll(li), 1);
//       }
//     },
//     {
//       name: game.i18n.localize("ARCHMAGE.contextApplyHealingHalf"),
//       icon: '<i class="fas fa-medkit"></i>',
//       condition: canApply,
//       callback: li => {
//         new DamageApplicator().asHealing(getRoll(li), .5);
//       }
//     },
//     {
//       name: game.i18n.localize("ARCHMAGE.contextApplyTempHealth"),
//       icon: '<i class="fas fa-heart"></i>',
//       condition: canApply,
//       callback: li => {
//         new DamageApplicator().asTempHealth(getRoll(li));
//       }
//     }
//   );
//   return options;
// });

/* ---------------------------------------------- */

// Update the escalation die tracker. Character values for the escalation die
// are updated in their prepareData() and getRollData() functions.
Hooks.on('renderCombatTracker', async (_combatTracker, _html, {combat}) => {
  // await new Promise(r => setTimeout(r, 250));
  // Handle non-gm users.
  if (combat?.current === undefined) {
    combat = game.combat;
  }

  const escalation = ArchmageUtility.getEscalation(combat);
  const gameRound = ArchmageUtility.getGameRound(combat);
  const $escalationDiv = $('.archmage-escalation-display');
  $escalationDiv.attr('data-value', escalation);
  $escalationDiv.toggleClass('hide', combat === null);
  $escalationDiv.find('.ed-number h1').text(escalation);
  $escalationDiv.find('.ed-round').text(`${gameRound} 라운드`);

  // Update open sheets.
  for (let app of Object.values(ui.windows)) {
    const appType = app?.object?.type ?? null;
    if (appType == 'character' || appType == 'npc') {
      app.render();
    }

    if (app.constructor.name === 'ArchmageCompendiumBrowserApplication') {
      app.render();
    }
  }
});

/* -------------------------------------------- */

Hooks.on('combatStart', combatStart);

/* -------------------------------------------- */

Hooks.on('combatTurn', combatTurn);

/* -------------------------------------------- */

Hooks.on('combatRound', combatRound);

/* -------------------------------------------- */

Hooks.on('preDeleteCombat', preDeleteCombat);

/* ---------------------------------------------- */

// Update escalation die values on scene change.
Hooks.on('renderCombatTracker', (async () => {
  // Handle non-gm users.
  let combat = game.combat;
  let escalation = 0;
  let $escalationDiv = $('.archmage-escalation');

  // Restore the escalation die.
  if (combat !== null) {
    escalation = ArchmageUtility.getEscalation(combat);
    $escalationDiv.removeClass('hide');
  }
  // Hide the escalation die.
  else {
    $escalationDiv.addClass('hide');
  }
  // Update the value of the tracker.
  $escalationDiv.attr('data-value', escalation);
  $escalationDiv.find('.ed-number').text(escalation);
}));

/* ---------------------------------------------- */

Hooks.on('deleteCombat', (combat) => {
  // Clear the escalation die.
  $('.archmage-escalation').addClass('hide');

  if (!game.user.isGM) return;

  // Clear out death saves, per combat resources and temp HP.
  let combatants = combat.combatants;
  if (combatants) {
    // Retrieve the character actors.
    let actors = combatants.filter(c => c?.actor?.type == 'character');
    let updatedActors = {};
    // Iterate over the actors for updates.
    actors.forEach(async (a) => {
      // Only proceed if this combatant has an actor and hasn't been updated.
      if (a.actor && !updatedActors[a.actor._id]) {
        // Retrieve the actor.
        let actor = a.actor;
        // Perform the update.
        if (actor) {
          let updates = {};
          updates['system.attributes.hp.temp'] = 0;
          await actor.update(updates);
          updatedActors[actor._id];
        }
      }
    });
  }
});

Hooks.on('createCombatant', (document, data, options, id) => {
  if (!game.user.isGM) return;
  let actor = document.actor;
  // Add command points at start of combat.
  if (actor && actor.type == 'character') {
    let updates = {};
    let hasStrategist = actor.items.find(i => i.system.name.label.safeCSSId().includes('strategist'));
    let basePoints = hasStrategist ? 2 : 1;
    // TODO: Add support for Forceful Command.
    updates['system.resources.perCombat.commandPoints.current'] = basePoints;
    actor.update(updates);
  }
});

/* ---------------------------------------------- */

Hooks.on('dcCalcWhitelist', (whitelist, actor) => {
  // Add whitelist support for the calculator.
  whitelist.archmage = {
    flags: {
      adv: true
    },
    abilities: [
      'str',
      'agi',
      'end',
      'mgi',
      'ins',
      'lck'
    ],
    attributes: [
      'init',
      'level',
      'standardBonuses'
    ],
    custom: {
      abilities: {},
      attributes: {
        levelHalf: {
          label: 'level_half',
          name: '1/2 Level',
          formula: actor.system.attributes.level !== undefined ? Math.floor(actor.system.attributes.level.value / 2) : 0
        },
        escalation: {
          label: 'escalation',
          name: 'Esc. Die',
          formula: '@attr.escalation.value'
        },
        melee: {
          label: 'melee',
          name: 'W [Melee]',
          formula: '@attr.weapon.melee.value'
        },
        ranged: {
          label: 'ranged',
          name: 'W [Ranged]',
          formula: '@attr.weapon.ranged.value'
        },
        standardBonus: {
          label: 'standard_bonuses',
          name: 'Standard Bonuses',
          formula: '@attr.standardBonuses.value'
        }
      },
      custom: {}
    }
  };

  // Replace the ability attributes in the calculator with custom formulas.
  let levelMultiplier = 1;
  if (actor.system.attributes.level.value >= 5) {
    levelMultiplier = 2;
  }
  if (actor.system.attributes.level.value >= 8) {
    levelMultiplier = 3;
  }

  if (levelMultiplier > 1) {
    for (let prop of whitelist.archmage.abilities) {
      whitelist.archmage.custom.custom[prop] = {
        label: prop,
        name: `${levelMultiplier}${prop}`,
        formula: `@abil.${prop}.dmg`
      };
    }
  }
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createArchmageMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== "Item") return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn(game.i18n.localize("ARCHMAGE.UI.warnMacroOnlyOwnedItems"));
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);
  // Create the macro command
  const command = `game.holygrailwar.rollItemMacro("${item.uuid}");`;
  // Some compendium entries may have incorrect images for their type.
  const img = item.img !== CONFIG.HOLYGRAILWAR.defaultTokens.character
    ? item.img
    : CONFIG.HOLYGRAILWAR.defaultTokens[item.type];
  // Create the macro document.
  const macro = await Macro.create({
    name: item.name,
    type: "script",
    img: img,
    command: command,
    flags: {
      "watersnake-grail-war.itemMacro": true,
      "watersnake-grail-war.itemUuid": data.uuid
    }
  });
  // Assign it to the hotbar.
  game.user.assignHotbarMacro(macro, slot);
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemData
 * @return {Promise}
 */
function rollItemMacro(itemData) {
  // Reconstruct the drop data so that we can load the item.
  if (itemData.includes('Item.')) {
    const dropData = {
      type: 'Item',
      uuid: itemData
    };
    Item.fromDropData(dropData).then(item => {
      // Determine if the item loaded and if it's an owned item.
      if (!item || !item.parent) {
        const itemName = item?.name ?? itemData;
        return ui.notifications.warn(game.i18n.format("ARCHMAGE.UI.warnMacroItemNotFound", { item: itemName}));
      }

      // Trigger the item roll
      item.roll();
    });
  }
  // Load item by name from the actor.
  else {
    const speaker = ChatMessage.getSpeaker();
    const itemName = itemData;
    let actor;
    if (speaker.token) actor = game.actors.tokens[speaker.token];
    if (!actor) actor = game.actors.get(speaker.actor);
    const item = actor ? actor.items.find(i => i.name === itemName) : null;
    if (!item) return ui.notifications.warn(game.i18n.format("ARCHMAGE.UI.warnMacroItemNotOnActor", { item: itemName}));

    // Trigger the item roll
    return item.roll();
  }
}
