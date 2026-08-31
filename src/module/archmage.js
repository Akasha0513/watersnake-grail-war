import { ARCHMAGE, FLAGS } from './setup/config.js';
import { ActorArchmage } from './actor/actor.js';
import { ActorArchmageNpcSheetV2 } from './actor/actor-npc-sheet-v2.js';
import { ActorTabFocusSheet } from './actor/actor-tab-focus-sheet.js';
import { ActorArchmageSheetV2 } from './actor/actor-sheet-v2.js';
import { ActorArchmageMasterSheetV2 } from './actor/actor-master-sheet-v2.js';
import { ItemArchmage } from './item/item.js';
import { ItemArchmageSheet } from './item/item-sheet.js';
import { ArchmageActionSheetV2 } from './item/action-sheet-v2.js';
import { wrapRolls } from './item/_item-sheet-helpers.mjs';
import { ArchmageUtility } from './setup/utility-classes.js';
import { MacroUtils } from './setup/utility-classes.js';
import { ContextMenu2 } from './setup/contextMenu2.js';
import { DamageApplicator } from './setup/damageApplicator.js';
import { DiceArchmage } from './actor/dice.js';
import { preloadHandlebarsTemplates } from "./setup/templates.js";
import { ActorHelpersV2 } from './actor/helpers/actor-helpers-v2.js';
import { TokenArchmage } from './actor/token.js';
import {combatRound, combatStart, combatTurn, preDeleteCombat} from "./hooks/combat.mjs";
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

  Handlebars.registerHelper('concatenate', function() {
    var outStr = '';
    for (var arg in arguments) {
      if (typeof arguments[arg] != 'object') {
        outStr += arguments[arg];
      }
    }
    return outStr;
  });

  // Preload template partials.
  preloadHandlebarsTemplates();

  game.holygrailwar = {
    ActorArchmage,
    ActorArchmageSheetV2,
    ActorArchmageNpcSheetV2,
    DiceArchmage,
    ItemArchmage,
    ItemArchmageSheet,
    wrapRolls,
    ArchmageActiveEffectSheetV2,
    ArchmageUtility,
    MacroUtils,
    rollItemMacro,
    ActorHelpersV2,
    isSocketGM: () => game.users.activeGM.id === game.user.id,
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
  // V1 시트는 V2 시트가 없는 타입 전용 (V2 보유 타입에서 폴백 선택지로 노출하지 않음).
  foundry.documents.collections.Items.registerSheet("watersnake-grail-war", ItemArchmageSheet, {
    label: 'ARCHMAGE.sheetItem',
    types: ["feature"],
    makeDefault: true,
  });
  // AppV2 + Vue based sheets. These will eventually become the default.
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

  // 2e 제거 이후 1e 경로 고정: 2e 전용 플래그·피트 티어·상태이상 정리.
  // Remove Mental Phenomenon flag
  delete FLAGS.characterFlags.dexToInt;
  // Remove Grim Determination flag
  delete FLAGS.characterFlags.grimDetermination;
  // Remove Blessing of Heaven flag
  delete FLAGS.characterFlags.dexToCha;

  // Remove 2e hindered from context menu status effects
  let id = CONFIG.statusEffects.findIndex(e => e.id == "hindered");
  if (id >= 0) CONFIG.statusEffects.splice(id, 1);

  // Remove 2e charmed from context menu status effects
  id = CONFIG.statusEffects.findIndex(e => e.id == "charmed");
  if (id >= 0) CONFIG.statusEffects.splice(id, 1);

  // Assign the actor class to the CONFIG
  CONFIG.Actor.documentClass = ActorArchmage;
  CONFIG.Token.objectClass = TokenArchmage;

  // Assign ItemArchmage class to CONFIG
  CONFIG.Item.documentClass = ItemArchmage;

  // Override CONFIG
  CONFIG.Item.sheetClass = ItemArchmageSheet;

  foundry.documents.collections.Actors.unregisterSheet('core', foundry.appv1.sheets.ActorSheet);

  // npc(일반인·마술사)는 작은 크기의 전용 시트 클래스를 쓰되, 내부는 캐릭터 UI를 렌더(npc=마스터 취급).
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
        // conditions 팩은 13th Age 콘텐츠 정리 때 삭제됨 → 없으면 크래시 대신 무시(옵셔널 체이닝).
        doc = journalId ? await game.packs.get("watersnake-grail-war.conditions")?.getDocument(journalId) : false;
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
  // 범용 이펙트가 코어 기본 시트로 열리는 문제 수정.
  // registerSheet의 makeDefault:true는 월드에 이미 저장된 core.sheetClasses 기본값을
  // 덮어쓰지 못함 → ActiveEffect 기본이 코어(또는 미설정)면 우리 시트로 마이그레이션.
  // (의도적으로 다른 시트를 고른 경우는 건드리지 않음.)
  if (game.user.isGM) {
    const aeSheetId = "watersnake-grail-war.ArchmageActiveEffectSheetV2";
    const sheetClasses = foundry.utils.deepClone(game.settings.get("core", "sheetClasses") ?? {});
    const current = foundry.utils.getProperty(sheetClasses, "ActiveEffect.base");
    if (!current || current === "core.ActiveEffectConfig") {
      foundry.utils.setProperty(sheetClasses, "ActiveEffect.base", aeSheetId);
      await game.settings.set("core", "sheetClasses", sheetClasses);
    }
  }

  $(`<div class="archmage-hotbar faded-ui flexcol"></div>`).insertBefore('#players');
  await addEscalationDie();
  $('body').append('<div class="archmage-preload"></div>');
  renderSceneTerrains();

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

  // Handle click events for the baseline monster generator.
  document.addEventListener("click", (event) => {
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

});

/* ---------------------------------------------- */

Hooks.on("renderDocumentDirectory", (app, html, options) => {
  const htmlElement = $(html)[0];
  if (options.documentCls === 'actor') {
    htmlElement.querySelector(".directory-footer").insertAdjacentHTML("beforeend", `
      <div class="flexrow">
        <button type="button" class="create-baseline-monster" style="flex-grow: 0;"
          data-tooltip="${game.i18n.localize('ARCHMAGE.COMPENDIUMBROWSER.buttons.baselineMonster')}"
          data-tooltip-direction="UP">
          <i class="fas fa-spaghetti-monster-flying"></i>
        </button>
      </div>
    `);
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
      label: 'ARCHMAGE.SETTINGS.groups.automation',
      settings: [
        'multiTargetAttackRolls',
        'hideExtraRolls',
        'showDefensesInChat',
        'showVulnsInChat',
        'roundUpDamageApplication',
        'allowTargetDamageApplication',
        'allowRerolls',
        'optionalBaseCritRange',
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
        'extendedStatusEffects',
        'initiativeDexTiebreaker',
        'initiativeStaticNpc',
        'unboundEscDie',
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
        // 읽는 쪽(effect-sheet.js·renderChatMessageHTML 등)은 전부 'watersnake-grail-war' 네임스페이스 —
        // 'archmage'로 쓰면 드래그 생성 지속피해 값이 안 읽히던 버그 수정(v0.3.24).
        'watersnake-grail-war': {
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


// 성배전쟁: feature 카드(능력치 판정/피해/기타) 버튼 굴림 + 재굴림 처리
Hooks.on('renderChatMessageHTML', (chatMessage, rawhtml) => {
  const html = $(rawhtml);
  // 라운드 시작 알림: 헤더/포트레이트 숨기고 배너만 표시 (CSS에서 처리).
  if (chatMessage.getFlag('watersnake-grail-war', 'roundNotice')) {
    rawhtml.classList?.add('grail-round-notice-message');
  }
  // feature 선언 배너: 헤더/포트레이트 숨기고 배너만 표시 (CSS에서 처리).
  if (chatMessage.getFlag('watersnake-grail-war', 'featureCall')) {
    rawhtml.classList?.add('grail-feature-call-message');
  }
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
  // 이름 클릭 → 설명 접기/펼치기 (SWADE식)
  html.find('.feature-card .feature-card-toggle').on('click', (ev) => {
    ev.preventDefault();
    $(ev.currentTarget).closest('.feature-card').find('.feature-card-desc').slideToggle(120);
  });
  html.find('.feature-roll-card .feature-reroll').on('click', async (ev) => {
    ev.preventDefault();
    const card = ev.currentTarget.closest('.feature-roll-card');
    await handle(card, card?.dataset.rollType);
  });
});

/**
 * 채팅 적용 메뉴 — 메시지×인라인롤마다 ContextMenu2 인스턴스를 만들던 것을
 * body 위임 인스턴스 1개로 단일화. 대상 자격은 렌더 훅에서 data-grail-menu로 표시하고,
 * 항목별 노출은 condition(target)으로 판정한다.
 */
function _bindGrailChatContextMenu() {
  const labels = {
    targeted: game.i18n.localize('ARCHMAGE.UI.targeted'),
    selected: game.i18n.localize('ARCHMAGE.UI.selected'),
    applyDamage: game.i18n.localize("ARCHMAGE.contextApplyDamage"),
    applyHealing: game.i18n.localize("ARCHMAGE.contextApplyHealing"),
    applyTempHealth: game.i18n.localize("ARCHMAGE.contextApplyTempHealth"),
    reroll: game.i18n.localize("ARCHMAGE.contextReroll")
  };

  const isGrailDamageCard = (t) => t.hasClass('dice-roll--archmage')
    && ['damage', 'misc'].includes(t.closest('.feature-roll-card')[0]?.dataset?.rollType);
  const isFull = (t) => t.attr('data-grail-menu') === 'full';
  const canReroll = (t) => {
    if (isGrailDamageCard(t)) return false;
    if (game.user.isGM) return true;
    if (!(game.settings.get('watersnake-grail-war', 'allowRerolls') ?? false)) return false;
    const msgId = t.closest('.chat-message')[0]?.dataset?.messageId;
    const msg = msgId ? game.messages.get(msgId) : null;
    return (msg?.author?.id ?? msg?.user?.id) === game.user.id;
  };
  const getRollFromElement = (element) => element.hasClass('inline-roll--archmage')
    ? element
    : element.find('.dice-total');
  const applyAs = (kind) => (inlineRoll) => {
    const menu = inlineRoll.find('#context-menu2')?.[0];
    const targetType = menu?.dataset?.target ?? 'selected';
    const mod = menu?.dataset?.mod ? Number(menu.dataset.mod) : 1;
    new DamageApplicator()[kind](getRollFromElement(inlineRoll), mod, targetType);
  };

  const menuItems = [
    {
      name: `
        <div class="damage-target flex flexrow">
          <button type="button" data-target="targeted"><i class="fa-solid fa-bullseye"></i> ${labels.targeted}</button>
          <button type="button" data-target="selected"><i class="fa-solid fa-expand"></i> ${labels.selected}</button>
        </div>`,
      id: 'targets',
      icon: '',
      preventClose: true,
      condition: (t) => isFull(t) && game.settings.get('watersnake-grail-war', 'allowTargetDamageApplication'),
      callback: (inlineRoll, event) => {
        const button = event?.target ?? event?.currentTarget;
        if (button?.dataset?.target) {
          inlineRoll.find('button[data-target].active').removeClass('active');
          const menu = inlineRoll.find('#context-menu2')[0];
          if (menu) menu.dataset.target = button.dataset.target;
          button.classList.add('active');
          game.settings.set('watersnake-grail-war', 'userTargetDamageApplicationType', button.dataset.target);
        }
      }
    },
    {
      name: `
        <div class="damage-modifiers flex flexrow">
          <button class="damage-modifier" type="button" data-mod="0.25">&frac14;x</button>
          <button class="damage-modifier" type="button" data-mod="0.5">&frac12;x</button>
          <button class="damage-modifier active" type="button" data-mod="1">1x</button>
          <button class="damage-modifier" type="button" data-mod="1.5">1.5x</button>
          <button class="damage-modifier" type="button" data-mod="2">2x</button>
        </div>`,
      id: 'modifiers',
      icon: '',
      preventClose: true,
      condition: isFull,
      callback: (inlineRoll, event) => {
        const button = event?.target ?? event?.currentTarget;
        if (button?.dataset?.mod) {
          inlineRoll.find('button[data-mod].active').removeClass('active');
          const menu = inlineRoll.find('#context-menu2')[0];
          if (menu) menu.dataset.mod = button.dataset.mod;
          button.classList.add('active');
        }
      }
    },
    { name: labels.applyDamage, id: 'damage', icon: '<i class="fas fa-tint"></i>', condition: isFull, callback: applyAs('asDamage') },
    { name: labels.applyHealing, id: 'healing', icon: '<i class="fas fa-medkit"></i>', condition: isFull, callback: applyAs('asHealing') },
    { name: labels.applyTempHealth, id: 'temp-healing', icon: '<i class="fas fa-heart"></i>', condition: isFull, callback: applyAs('asTempHealth') },
    {
      name: labels.reroll,
      id: 'reroll',
      icon: '<i class="fas fa-rotate-left"></i>',
      condition: canReroll,
      callback: (html) => DamageApplicator.rerollDice(html)
    }
  ];

  new ContextMenu2($(document.body), '[data-grail-menu]', menuItems);
}
Hooks.once('ready', _bindGrailChatContextMenu);

Hooks.on('renderChatMessageHTML', (chatMessage, rawhtml, options) => {
  const html = $(rawhtml);

  const triggerTarget = game.i18n.localize("ARCHMAGE.CHAT.target") + ":";
  const triggerAttack = game.i18n.localize("ARCHMAGE.attack") + ":";

  // Override the inline roll click behavior.
  html.find('a.inline-roll').addClass('inline-roll--archmage').removeClass('inline-roll');
  html.find('.dice-roll').addClass('dice-roll--archmage');

  // /r 굴림 카드: 주사위 내역(dice-tooltip)을 기본 펼침 상태로.
  // (코어 버전에 따라 expanded 클래스가 .dice-roll 또는 .dice-tooltip에 붙으므로 양쪽 모두 —
  //  클릭 접기 토글은 코어 동작 그대로 유지된다.)
  html.find('.dice-roll:has(.dice-tooltip)').addClass('expanded')
    .find('.dice-tooltip').addClass('expanded');

  // 비표준 면수 주사위(d16 등)는 코어 아이콘이 없어 밋밋하게 나옴 →
  // 가장 가까운 다면체 아이콘 클래스를 추가 (1~4=d4 … 13+=d20). 표준 면수는 무변경.
  const STD_DIE_FACES = [4, 6, 8, 10, 12, 20, 100];
  html.find('.dice-rolls .roll.die').each(function() {
    for (const c of this.classList) {
      const m = /^d(\d+)$/.exec(c);
      if (!m) continue;
      const faces = Number(m[1]);
      if (!STD_DIE_FACES.includes(faces)) {
        this.classList.add(ArchmageUtility._nearestDieCls(faces));
      }
      break;
    }
  });
  // 적용 메뉴 대상 표시만 하고, 메뉴 자체는 body 위임 인스턴스 1개가 처리한다.
  html.find('.inline-roll--archmage, .dice-roll--archmage').each(function() {
    const $el = $(this);
    // 성배전쟁: feature 피해/기타 카드의 굴림 총합엔 적용 메뉴 부착(v0.3.24).
    // 그 외 전체 주사위 카드(판정/세이브 등)는 미부착 (인라인 롤만 유지).
    const isGrailDamageCard = $el.hasClass('dice-roll--archmage')
      && ['damage', 'misc'].includes($el.closest('.feature-roll-card')[0]?.dataset?.rollType);
    if ($el.hasClass('dice-roll--archmage') && !isGrailDamageCard) return;

    const lineText = $el.parent()[0]?.innerText ?? '';
    if (lineText.includes(triggerTarget)) return;  // "Target:" 행 제외

    // attack 행은 재굴림만, 그 외는 전체 항목.
    this.dataset.grailMenu = lineText.includes(triggerAttack) ? 'attack' : 'full';
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
        // 상태이상 저항(순수 11+) 단일화 — 구 13th Age 난이도 구분 제거.
        await actor.rollSave();
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
  if (!actor || game.user.character?.id !== actor.id) return;

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


/* ---------------------------------------------- */

// Update the escalation die tracker. Character values for the escalation die
// are updated in their prepareData() and getRollData() functions.
// 트래커는 HP 변경·이니셔티브·턴마다 재렌더되므로, 열린 시트 전체 재렌더는 디바운스로 묶는다.
const _refreshOpenActorSheets = foundry.utils.debounce(() => {
  for (let app of Object.values(ui.windows)) {
    const appType = app?.object?.type ?? null;
    if (appType == 'character' || appType == 'npc' || appType == 'master') {
      app.render();
    }
  }
}, 100);

Hooks.on('renderCombatTracker', async (_combatTracker, _html, {combat}) => {
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

  // Update open sheets (debounced).
  _refreshOpenActorSheets();
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
