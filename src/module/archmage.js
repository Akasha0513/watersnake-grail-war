import { ARCHMAGE } from './setup/config.js';
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

  CONFIG.statusEffects = foundry.utils.duplicate(ARCHMAGE.statusEffects);

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

  game.settings.register('watersnake-grail-war', 'gradeCheckDefault', {
    name: "ARCHMAGE.SETTINGS.gradeCheckDefaultName",
    hint: "ARCHMAGE.SETTINGS.gradeCheckDefaultHint",
    scope: 'world',
    config: true,
    default: true,
    type: Boolean
  });

  game.settings.register('watersnake-grail-war', 'roundNotice', {
    name: "ARCHMAGE.SETTINGS.roundNoticeName",
    hint: "ARCHMAGE.SETTINGS.roundNoticeHint",
    scope: 'world',
    config: true,
    default: true,
    type: Boolean
  });

  game.settings.register('watersnake-grail-war', 'concealAnimation', {
    name: "ARCHMAGE.SETTINGS.concealAnimationName",
    hint: "ARCHMAGE.SETTINGS.concealAnimationHint",
    scope: 'client',
    config: true,
    default: true,
    type: Boolean
  });

  game.settings.register('watersnake-grail-war', 'rollBreakdownExpanded', {
    name: "ARCHMAGE.SETTINGS.rollBreakdownExpandedName",
    hint: "ARCHMAGE.SETTINGS.rollBreakdownExpandedHint",
    scope: 'client',
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
}

/* -------------------------------------------- */

Hooks.once('ready', async () => {
  $(`<div class="archmage-hotbar faded-ui flexcol"></div>`).insertBefore('#players');
  await addEscalationDie();

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

  // Wait to register the hotbar macros until ready.
  Hooks.on("hotbarDrop", (bar, data, slot) => {
    if (['Item'].includes(data.type)) {
      createArchmageMacro(data, slot);
      return false;
    }
  });

});

/* ---------------------------------------------- */

Hooks.on('diceSoNiceReady', (dice3d) => {
  dice3d.addSystem({ id: "archmage", name: "Archmage" }, false);

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

/* -------------------------------------------- */

Hooks.on('dropActorSheetData', (actor, sheet, data) => {
  const types = ['effect', 'ActiveEffect', 'condition'];
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

/* ---------------------------------------------- */

// 롤이 포함된 메시지(코어 /r 등)를 독립 블록으로 출력
Hooks.on('preCreateChatMessage', (doc) => {
  if (doc.rolls?.length && !doc.getFlag('mrkb-chat-enhancements', 'standalone')) {
    doc.updateSource({ 'flags.mrkb-chat-enhancements.standalone': true });
  }
});

// 정보 은폐(정보말소/영등롱) 연출: 텍스트 노드를 같은 길이의 무작위 글리프로 치환.
// 실제 텍스트는 되살릴 필요가 없으므로 원본을 보관하지 않는다.
// 글자의 폭 등급(전각/반각)을 보존해 치환해야 줄바꿈이 흔들리지 않는다 — 폭 불확정 글리프(▓▒░, 그리스 문자 등)는 쓰지 않음.
const CONCEAL_WIDE_RE = /[가-힣ᄀ-ᇿ㄰-㆏㐀-鿿豈-﫿぀-ヿ　-〿＀-｠￠-￦]/;
const CONCEAL_NARROW = '0123456789ABCDEFXYZ#*+=';
const CONCEAL_HANJA = '無明滅影闇秘封印虛空幻夢魔靈眞名消去隱蔽';
function _concealGlyph(ch) {
  if (!CONCEAL_WIDE_RE.test(ch)) return CONCEAL_NARROW[Math.floor(Math.random() * CONCEAL_NARROW.length)];
  const r = Math.random();
  if (r < 0.6) return String.fromCharCode(0xAC00 + Math.floor(Math.random() * 11172));
  if (r < 0.85) return String.fromCharCode(0x30A2 + Math.floor(Math.random() * (0x30F3 - 0x30A2 + 1)));
  return CONCEAL_HANJA[Math.floor(Math.random() * CONCEAL_HANJA.length)];
}
function _scrambleText(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const src = node.nodeValue;
    if (!src || !src.trim()) continue;
    let out = '';
    for (const ch of src) out += /\s/.test(ch) ? ch : _concealGlyph(ch);
    node.nodeValue = out;
  }
}
// 블록 요소는 DOM에 붙은 뒤 첫 측정 높이로 고정해 드문 줄 수 변동에도 카드 높이가 불변하게 한다.
function _lockConcealedHeight(el) {
  if (el.dataset.grailLocked || !el.isConnected) return;
  if (getComputedStyle(el).display === 'inline') { el.dataset.grailLocked = '1'; return; }
  const h = el.getBoundingClientRect().height;
  if (!h) return;
  el.style.height = `${h}px`;
  el.style.overflow = 'hidden';
  el.dataset.grailLocked = '1';
}
Hooks.once('ready', () => {
  setInterval(() => {
    document.querySelectorAll('.grail-concealed').forEach(el => { _lockConcealedHeight(el); _scrambleText(el); });
  }, 120);
});

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
  // 정보 은폐: 소유자·GM·작성자 외 뷰어에게는 이름/루비/랭크/설명/종류를 스크램블
  if (chatMessage.getFlag('watersnake-grail-war', 'concealed')) {
    const actor = fromUuidSync(chatMessage.getFlag('watersnake-grail-war', 'actorUuid') ?? '');
    const canSee = game.user.isGM || chatMessage.isAuthor || !!actor?.isOwner;
    if (!canSee) {
      const animate = game.settings.get('watersnake-grail-war', 'concealAnimation');
      rawhtml.querySelectorAll(
        '.feature-card .item-name, .feature-card .card-content .container, .feature-card .card-footer span, ' +
        '.feature-roll-card .feature-name, .grail-feature-call .gfc-feature-name'
      ).forEach(el => {
        if (animate) el.classList.add('grail-concealed');   // 티커 대상 + 글리치 애니메이션
        _scrambleText(el);
      });
    }
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


  // Override the inline roll click behavior.
  html.find('a.inline-roll').addClass('inline-roll--archmage').removeClass('inline-roll');
  html.find('.dice-roll').addClass('dice-roll--archmage');

  // 비표준 면수 주사위(d16 등)는 코어 아이콘이 없어 밋밋하게 나옴 →
  // 가장 가까운 다면체 아이콘 클래스를 추가 (1~4=d4 … 13+=d20). 표준 면수는 무변경.
  const STD_DIE_FACES = [4, 6, 8, 10, 12, 20, 100];
  const mapDieIcons = (rootEl) => {
    for (const el of rootEl.querySelectorAll('.dice-rolls .roll.die')) {
      for (const c of el.classList) {
        const m = /^d(\d+)$/.exec(c);
        if (!m) continue;
        const faces = Number(m[1]);
        if (!STD_DIE_FACES.includes(faces)) el.classList.add(ArchmageUtility._nearestDieCls(faces));
        break;
      }
    }
  };

  // /r 등 코어 굴림 블록을 시트 굴림 카드와 동일한 SWADE식 서식으로 재렌더.
  // SWADE 방식 그대로: 코어 툴팁(항별 브레이크다운)을 공식과 총합 사이에 이식하고,
  // 펼침/접힘은 코어의 .dice-roll 클릭 토글(expanded + collapser 애니메이션)에 맡긴다.
  // 렌더 시 변환만 — 저장된 content는 불변. 우리 카드(.swade-roll) 내부 블록은 제외.
  const rolls = chatMessage.rolls ?? [];
  if (rolls.length) {
    const esc = Handlebars.escapeExpression;
    html.find('.dice-roll:has(.dice-tooltip)').each(function(i) {
      if (this.closest('.swade-roll')) return;
      const roll = rolls[i];
      if (!roll) return;
      const parts = ArchmageUtility.rollFormulaParts(roll);
      const boxes = parts.map(p => p.die
        ? `<li class="die ${p.cls}" data-tooltip="${esc(p.hint ?? '')}"><span>${esc(String(p.result))}</span></li>`
        : `<li${p.hint ? ` data-tooltip="${esc(p.hint)}"` : ''}>${esc(String(p.result))}</li>`
      ).join('');
      const card = document.createElement('div');
      card.className = 'archmage chat-card swade-card swade-roll-message ability-card';
      card.innerHTML = `<div class="card-content">`
        + `<div class="roll-flavor">${esc(chatMessage.flavor || '굴림')}</div>`
        + `<div class="swade-roll">`
        + `<div class="dice-roll dice-roll--archmage"><div class="dice-result">`
        + `<div class="dice-formula"><ol class="formula-list">${boxes}</ol></div>`
        + `<div class="dice-flavor">굴림 결과</div>`
        + `<div class="dice-total">${esc(String(roll.total))}</div>`
        + `</div></div></div>`
        + `</div>`;
      // 코어 툴팁 이식 — collapser 포함(없으면 감싸서) 공식 바로 뒤에.
      const collapser = this.querySelector('.dice-tooltip-collapser');
      let tooltipWrap = collapser;
      if (!tooltipWrap) {
        const tooltip = this.querySelector('.dice-tooltip');
        if (tooltip) {
          tooltipWrap = document.createElement('div');
          tooltipWrap.className = 'dice-tooltip-collapser';
          tooltipWrap.append(tooltip);
        }
      }
      if (tooltipWrap) card.querySelector('.dice-formula').after(tooltipWrap);
      this.replaceWith(card);
    });

    // 시트 판정 카드(ability-card — 능력치/배경/순수값)에도 코어 툴팁을 생성해 동일 이식.
    html.find('.ability-card .swade-roll .dice-formula').each(function(i) {
      const formulaEl = this;
      const result = formulaEl.closest('.dice-result');
      if (!result || result.querySelector('.dice-tooltip')) return;  // 중복 가드
      const roll = rolls[i] ?? rolls[0];
      if (!roll) return;
      roll.getTooltip().then(tt => {
        if (result.querySelector('.dice-tooltip')) return;
        const wrap = document.createElement('div');
        wrap.className = 'dice-tooltip-collapser';
        wrap.innerHTML = tt;
        formulaEl.after(wrap);
        mapDieIcons(wrap);  // 비동기 삽입분에도 면수 매핑 적용
        _bindRollExpand(formulaEl.closest('.dice-roll'));
      });
    });
  }

  // SWADE식 펼침: collapser를 가진 우리 카드의 .dice-roll 클릭 → expanded 토글.
  // (코어 v13 리스너는 코어 템플릿의 액션 속성 기준이라 재조립한 요소엔 반응하지 않음 → 자체 바인딩)
  function _bindRollExpand(el) {
    if (!el || el.dataset.grailExpandBound) return;
    el.dataset.grailExpandBound = '1';
    if (game.settings.get('watersnake-grail-war', 'rollBreakdownExpanded')) el.classList.add('expanded');
    el.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;   // 링크/버튼 클릭은 통과
      el.classList.toggle('expanded');
    });
  }
  html.find('.swade-roll .dice-roll:has(.dice-tooltip-collapser)').each(function() {
    _bindRollExpand(this);
  });

  mapDieIcons(rawhtml);
  // 적용 메뉴 대상 표시만 하고, 메뉴 자체는 body 위임 인스턴스 1개가 처리한다.
  html.find('.inline-roll--archmage, .dice-roll--archmage').each(function() {
    const $el = $(this);
    // 성배전쟁: feature 피해/기타 카드의 굴림 총합엔 적용 메뉴 부착(v0.3.24).
    // 그 외 전체 주사위 카드(판정/세이브 등)는 미부착 (인라인 롤만 유지).
    const isGrailDamageCard = $el.hasClass('dice-roll--archmage')
      && ['damage', 'misc'].includes($el.closest('.feature-roll-card')[0]?.dataset?.rollType);
    if ($el.hasClass('dice-roll--archmage') && !isGrailDamageCard) return;
    this.dataset.grailMenu = 'full';
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
});

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

Hooks.on('deleteCombat', (combat) => {
  if (!game.user.isGM) return;

  // Clear temp HP.
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
