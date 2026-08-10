// Import Vue dependencies.
import { createApp } from "../../scripts/lib/vue.esm-browser.js";
import { ArchmageCharacterSheet } from "../../vue/components.vue.es.js";
import { ActorHelpersV2 } from './helpers/actor-helpers-v2.js';
import { DiceArchmage } from './dice.js';

export class ActorArchmageSheetV2 extends foundry.appv1.sheets.ActorSheet {
  /** @override */
  constructor(...args) {
    super(...args);

    // Properties that we'll use for the Vue app.
    this.vueApp = null;
    this.vueRoot = null;
    this.vueListenersActive = false;
    this._renderKey = 0;
    this.vueComponents = {
      'character-sheet': ArchmageCharacterSheet
    };
  }

  /** @override */
  static get defaultOptions() {
    const options = super.defaultOptions;
    const compactMode = game.settings.get('watersnake-grail-war', 'compactMode');
    const nightMode = game.settings.get("watersnake-grail-war", "nightmode");
    foundry.utils.mergeObject(options, {
      classes: options.classes.concat(['archmage-v2', 'actor', 'character-sheet']).filter(c => c !== 'archmage'),
      width: compactMode ? 826 : 960,
      height: compactMode ? 750 : 960,
      submitOnClose: true,
      submitOnChange: true,
      dragDrop: [{dragSelector: '.item-list .item', dropSelector: null}]
    });

    if (compactMode) {
      options.classes.push('compact-mode');
    }

    if (nightMode) {
      options.classes.push('nightmode');
    }

    return options;
  }

  /** @override */
  get template() {
    // npc(일반인·마술사)도 마스터처럼 캐릭터 시트를 사용.
    const type = (this.actor.type === 'master' || this.actor.type === 'npc') ? 'character' : this.actor.type;
    return `systems/watersnake-grail-war/templates/actors/actor-${type}-sheet-vue.html`;
  }

  /** @override */
  getData(options) {

    // Basic data
    let isOwner = this.actor.isOwner;
    const context = {
      appId: this.appId,
      owner: isOwner,
      limited: this.actor.limited,
      options: this.options,
      editable: this.isEditable,
      cssClass: isOwner ? "editable" : "locked",
      isCharacter: this.actor.type === "character",
      isNPC: this.actor.type === "npc",
      config: CONFIG.HOLYGRAILWAR,
      rollData: this.actor.getRollData(this.actor, { skipPrepare: true }),
      _renderKey: this._renderKey,
    };

    // Convert the actor data into a more usable version.
    let actorData = this.actor.toObject(false);

    // Get drag data for later retrieval.
    const dragData = this.actor.toDragData();
    if (dragData.uuid.includes('Token.') && dragData.type !== 'Token') {
      dragData.type = 'Token';
    }

    context.dragData = dragData;

    // Add to our data object that the sheet will use.
    context.actor = actorData;
    context.data = actorData.system;
    context.actor.owner = context.owner;
    context.actor._source = foundry.utils.deepClone(this.actor._source);
    context.actor.overrides = foundry.utils.flattenObject(this.actor.overrides);
    context.actor.dragData = context.dragData;

    // Add token info if needed.
    if (this.actor?.token?.id) {
      if (!this.actor.token.actorLink && this.actor?.token?.id) {
        context.actor.prototypeToken.id = this.actor.prototypeToken.id;
        context.actor.prototypeToken.sceneId = this.actor.prototypeToken?.parent?.id;
      }
    }

    // Add pack info if needed.
    if (this.actor?.pack) {
      context.actor.pack = this.actor.pack;
    }

    // Sort items.
    context.actor.items = actorData.items;
    context.actor.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));

    // Sort effects.
    context.actor.effects = actorData.effects;
    context.actor.effects.sort((a, b) => (a.sort || 0) - (b.sort || 0));

    // Retrieve a list of locked fields due to AEs.
    context.actor.lockedFields = [];
    this.actor.effects.forEach(ae => {
      const changes = ae.changes.map(c => c.key);
      context.actor.lockedFields = context.actor.lockedFields.concat(changes);
    });

    return context;
  }

  /* ------------------------------------------------------------------------ */
  /*  Vue Rendering --------------------------------------------------------- */
  /* ------------------------------------------------------------------------ */

  /** @override */
  render(force=false, options={}) {
    this._renderKey++;
    const context = this.getData();

    // Render the vue application after loading. We'll need to destroy this
    // later in the this.close() method for the sheet.
    if (!this.vueApp || !this.vueRoot) {
      this.vueRoot = null;
      this.vueApp = createApp({
        // Initialize data.
        data() {
          return {
            context: context,
          }
        },
        // Define our character sheet component.
        components: this.vueComponents,
        // Create a method to the update the data while retaining reactivity.
        methods: {
          updateContext(newContext) {
            for (let key of Object.keys(this.context)) {
              this.context[key] = newContext[key];
            }
          }
        }
      });
    }
    // Otherwise, perform update routines on the app.
    else {
      // Pass new values from this.getData() into the app.
      this.vueRoot.updateContext(context);
      // Reactivate the listeners if we need to.
      if (!this.vueListenersActive) {
        setTimeout(() => {
          this.activateVueListeners($(this.form), true);
        }, 200);
      }
      return;
    }

    // If we don't have an active vueRoot, run Foundry's render and then mount
    // the Vue application to the form.
    this._render(force, options).catch(err => {
      err.message = `An error occurred while rendering ${this.constructor.name} ${this.appId}: ${err.message}`;
      console.error(err);
      this._state = Application.RENDER_STATES.ERROR;
    })
    // Run Vue's render, assign it to our prop for tracking.
    .then(rendered => {
      // @todo Determine why this is necessary to avoid warnings during
      // actor/token migrations.
      let $selector = $(`[data-appid="${this.appId}"] .archmage-vue`);
      if ($selector.length > 0) {
        this.vueRoot = this.vueApp.mount(`[data-appid="${this.appId}"] .archmage-vue`);
        // @todo Find a better solution than a timeout.
        setTimeout(() => {
          this.activateVueListeners($(this.form), false);
        }, 200);
      }
    });

    // Store our app for later.
    this.object.apps[this.appId] = this;
    return this;
  }

  /** @override */
  async close(options={}) {
    // Run the upstream close method.
    const result = await super.close(options);
    // Unmount and clean up the vue app on close.
    this.vueApp.unmount();
    this.vueApp = null;
    this.vueRoot = null;
    // Return the close response from earlier.
    return result;
  }

  // Update initial content throughout all editors.
  _updateEditors(html) {
    for (let [name, editor] of Object.entries(this.editors)) {
      // const data = this.object instanceof Document ? this.object.data : this.object;
      const data = this.object;
      const initialContent = getProperty(data, name);
      const div = $(this.form).find(`.editor-content[data-edit="${name}"]`)[0];
      this.editors[name].initial = initialContent;
      this.editors[name].options.target = div;
    }
  }

  /* ------------------------------------------------------------------------ */
  /*  Event Listeners ------------------------------------------------------- */
  /* ------------------------------------------------------------------------ */

  /**
   * @override 동시 열람 롤백 방지: 이 클라이언트가 폼을 만지지 않았으면 닫기 제출(submitOnClose) 생략.
   * (A·B가 같은 시트를 열고 B가 수정한 뒤, A가 조작 없이 닫으면 A의 오래된 폼 전체가 제출돼
   *  B의 변경을 되돌리던 문제. submitOnChange가 실시간 저장하므로 닫기 제출은 만진 경우만 필요.)
   */
  async close(options = {}) {
    if (!this._grailDirty && options.submit === undefined) options = { ...options, submit: false };
    return super.close(options);
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    ActorHelpersV2._activatePortraitArtContextMenu(this, html)

    // 더티 추적: 폼 입력을 만지면 표시. 재렌더(외부 변경 반영 포함) 시 리스너 재부착으로 리셋.
    this._grailDirty = false;
    html.on('input change', 'input, select, textarea', () => { this._grailDirty = true; });

    // Close the mobile menu if open.
    html.on('click', (event) => {
      const button = event?.target?.closest('.sheet-tabs-toggle') ?? event.target;
      // Exit early if is the mobile menu button itself, that's handled in the component.
      if (button?.classList?.contains('sheet-tabs-toggle')) return;
      // Otherwise close the menu.
      const parent = event?.target?.classList?.contains('archmage-v2-vue')
        ? event.target
        : event?.target?.closest('.archmage-v2-vue');
      const mobileMenu = parent.querySelector('.tabs--mobile.active');
      if (mobileMenu) {
        mobileMenu.classList.remove('active');
      }
    })

    if (!this.options.editable) return;

    // CRUD listeners.
    html.on('click', '.item-create', (event) => this._createItem(event));
    html.on('click', '.item-delete', (event) => this._deleteItem(event));
    html.on('click', '.item-edit', (event) => this._editItem(event));
    html.on('click', '.feature-chat', (event) => this._postFeature(event));
    html.on('click', '.feature-chat-private', (event) => this._announceFeature(event));

    // Effects.
    html.on('click', '.effect-control', (event) => this._onManageEffect(event));

    // 순수값 판정 (1d20+직접값 — 능력치 라디오 없음, 커스텀/상황 보정으로 값 구성)
    html.on('click', '.pure-check-roll', () =>
      game.holygrailwar.DiceArchmage.BackgroundRoll(this.actor, { fixedBonus: '0', title: '순수값 판정', abilitySelect: false }));

    // 능력치 설정 대화상자.
    html.on('click', '.ability-config', (event) => this._onAbilityConfig(event));

    // Support Image updates
    if ( this.options.editable ) {
      html.on('click', 'img[data-edit]', (event) => {
        // Handle Tokenizer integration since the delayed Vue render prevents it.
        const tokenizer = game.modules.get('vtta-tokenizer')?.active ?? false;
        let bypass = event.shiftKey ? true : false;
        if (tokenizer && !bypass) {
          const doc = this.token ? this : this.document;
          event.stopPropagation();
          Tokenizer.tokenizeDoc(doc);
          event.preventDefault();
        }
        // Otherwise, use the file picker.
        else {
          this._onEditImage(event)
        }
      });
    }

    // Roll listeners.
    html.on('click', '.rollable', (event) => this._onRollable(event));

    // Other listeners.
    html.on('click', '.death-save-attempts input[type="checkbox"]', (event) => this._updateFails(event, "deathFails"));
    html.on('click', '.lastgasp-save-attempts input[type="checkbox"]', (event) => this._updateFails(event, "lastGaspFails"));
    html.on('click', '.rest', (event) => this._onRest(event));

    // Item listeners.
    html.on('click', '.power-uses, .equipment-quantity', (event) => this._updateQuantity(event, true));
    html.on('contextmenu', '.power-uses, .equipment-quantity', (event) => this._updateQuantity(event, false));
    html.on('click', '.feat-uses-rollable', (event) => this._updateFeatQuantity(event, true));
    html.on('contextmenu', '.feat-uses-rollable', (event) => this._updateFeatQuantity(event, false));
    html.on('click', '.feat-pip', (event) => this._updatePips(event));

    // 성배전쟁: 령주(점/±버튼), 배경 추가/삭제
    html.on('click', '.command-seal', (event) => this._updateCommandSeals(event));
    html.on('click', '.command-seal-minus', () => this._stepCommandSeals(-1));
    html.on('click', '.command-seal-plus', () => this._stepCommandSeals(1));
    html.on('click', '.background-add', (event) => this._addBackground(event));
    html.on('click', '.background-delete', (event) => this._removeBackground(event));
    html.on('click', '.background-die', (event) => this._rollBackgroundDie(event));
    html.on('click', '.background-config', (event) => this._onBackgroundConfig(event));
  }

  /** 배경: 1d(배경 수치) 난수 굴림 */
  async _rollBackgroundDie(event) {
    event.preventDefault();
    const key = event.currentTarget.dataset.key;
    const bg = this.actor.system.backgrounds?.[key];
    if (!bg) return;
    const val = Number(bg.bonus?.value) || 0;
    if (val < 1) { ui.notifications?.warn('배경 수치가 1 이상이어야 합니다.'); return; }
    const roll = await new Roll(`1d${val}`).roll();
    await roll.toMessage({
      speaker: game.holygrailwar.ArchmageUtility.getSpeaker(this.actor),
      flavor: `${bg.name?.value || '배경'} — 1d${val}`
    });
  }

  /** 령주: 클릭한 점까지 소진/회복 토글 + 채팅 메시지 */
  async _updateCommandSeals(event) {
    event.preventDefault();
    const n = Number(event.currentTarget.dataset.seal);
    const cur = Number(this.actor.system.details?.commandSeals?.value) || 0;
    const next = (n <= cur) ? n - 1 : n;
    await this.actor.update({ 'system.details.commandSeals.value': next });

    // 령주 변동 시 채팅 메시지 (소멸/회복)
    const delta = next - cur;
    if (delta !== 0) {
      const verb = delta < 0 ? `${Math.abs(delta)}획 소모됩니다` : `${Math.abs(delta)}획 회복됩니다`;
      const content = `<div class="archmage chat-card command-seal-card">${this.actor.name} 의 령주가 ${verb}.</div>`;
      await game.holygrailwar.ArchmageUtility.createChatMessage({
        speaker: game.holygrailwar.ArchmageUtility.getSpeaker(this.actor),
        content: content
      });
    }
  }

  /** 령주 ±버튼: 1씩 증감 (0~3 범위), 소멸/회복 채팅 메시지 */
  async _stepCommandSeals(delta) {
    const cur = Number(this.actor.system.details?.commandSeals?.value) || 0;
    const next = Math.max(0, Math.min(3, cur + delta));
    if (next === cur) return;
    await this.actor.update({ 'system.details.commandSeals.value': next });

    const verb = (next < cur) ? `${Math.abs(next - cur)}획 소모됩니다` : `${Math.abs(next - cur)}획 회복됩니다`;
    const content = `<div class="archmage chat-card command-seal-card">${this.actor.name} 의 령주가 ${verb}.</div>`;
    await game.holygrailwar.ArchmageUtility.createChatMessage({
      speaker: game.holygrailwar.ArchmageUtility.getSpeaker(this.actor),
      content: content
    });
  }

  /** 배경 추가: 첫 비활성 슬롯 활성화 (여러 번 클릭으로 여러 개 추가) */
  async _addBackground(event) {
    event.preventDefault();
    for (let [k, v] of Object.entries(this.actor.system.backgrounds)) {
      if (!v.isActive?.value) {
        await this.actor.update({ [`system.backgrounds.${k}.isActive.value`]: true });
        return;
      }
    }
    ui.notifications?.warn('배경 슬롯을 모두 사용했습니다.');
  }

  /** 배경 삭제: 해당 슬롯 비활성화 + 값 초기화 */
  async _removeBackground(event) {
    event.preventDefault();
    const key = event.currentTarget.dataset.key;
    if (!key) return;
    await this.actor.update({
      [`system.backgrounds.${key}.isActive.value`]: false,
      [`system.backgrounds.${key}.name.value`]: '',
      [`system.backgrounds.${key}.bonus.value`]: 0
    });
  }

  /**
   * Handle changing a Document's image.
   * @param {MouseEvent} event  The click event.
   * @returns {Promise}
   * @override
   */
  _onEditImage(event) {
    if (!this.isEditable) return false;
    const attr = event.currentTarget.dataset.edit;
    const current = foundry.utils.getProperty(this.object, attr);
    const { img } = this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ?? {};
    const fp = new FilePicker({
      current,
      type: "image",
      redirectToRoot: img ? [img] : [],
      callback: path => {
        event.currentTarget.src = path;
        if ( this.options.submitOnChange ) return this.document.update({[attr]: path});
      },
      top: this.position.top + 40,
      left: this.position.left + 10
    });
    return fp.browse();
  }

  /**
   * Activate additional listeners on the rendered Vue app.
   * @param {jQuery} html
   */
  activateVueListeners(html, repeat = false) {
    if (!this.options.editable) {
      html.find('input,select,textarea').attr('disabled', true);
      return;
    }

    if (html.find('.archmage-v2-vue').length > 0) {
      this.vueListenersActive = true;
    }

    this._dragHandler(html);
    this._lockEffectsFields(html);

    // Place one-time executions after this line.
    if (repeat) return;

    html.find('.editor-content[data-edit]').each((i, div) => this._activateEditor(div));

    // Input listeners.
    let inputs = '.section input[type="text"], .section input[type="number"]';
    html.on('focus', inputs, (event) => this._onFocus(event));
  }

  /*
   * Prevent Effects Editing
   */
  _lockEffectsFields(html) {
    // const context = this.getData();
    // html.find('input[name]').each((i, el) => {
    //   const name = el.name;
    //   // @todo improve this
    //   if (context.actor.lockedFields.includes(name)) {
    //     el.readOnly = true;
    //   }
    //   else {
    //     el.readonly = false;
    //   }
    // })
  }

  /* ------------------------------------------------------------------------ */
  /*  Create, Update, Delete------------------------------------------------- */
  /* ------------------------------------------------------------------------ */

  /**
   * Create items on the actor, such as powers or magic items.
   *
   * @param {Event} event
   *   Html event that triggered the method.
   */
  async _createItem(event) {
    let target = event.currentTarget;
    let dataset = foundry.utils.duplicate(target.dataset);

    // Grab the item type from the dataset and then remove it.
    let itemType = dataset.itemType ?? 'power';
    delete dataset.itemType;

    // Handle the power group.
    if (dataset?.groupType && dataset?.powerType) {
      let groupType = dataset.groupType;
      let model = game.data.model.Item[itemType];
      if (model[groupType] && groupType !== 'powerType') {
        dataset[groupType] = foundry.utils.duplicate(dataset.powerType);
        delete dataset.powerType;
      }
      delete dataset.groupType;
    }

    // Default image.
    let img = CONFIG.HOLYGRAILWAR.defaultTokens[itemType] ?? CONFIG.DEFAULT_TOKEN;

    // Initialize data.
    let data = {};
    if (typeof dataset == 'object') {
      for (let [k,v] of Object.entries(dataset)) {
        data[k] = { value: v };
      }
    }
    else {
      data = dataset;
    }

    // Create the item.
    let itemData = {
      name: game.holygrailwar.ArchmageUtility.formatNewItemName(itemType),
      type: itemType,
      img: img,
      system: data
    };
    await this.actor.createEmbeddedDocuments('Item', [itemData]);
  }

  /** feature 아이템을 채팅에 버튼 카드로 출력 (굴림은 채팅 카드에서 수행) */
  async _postFeature(event, isPrivate = false) {
    event.preventDefault();
    const id = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(id);
    if (!item) return;
    const sys = item.system;
    const abilityNames = { str: '근력', end: '내구', agi: '민첩', mgi: '마력', lck: '행운', ins: '통찰' };
    const tokenId = this.actor.token?.id ?? this.actor.getActiveTokens?.()?.[0]?.id ?? '';
    const content = await foundry.applications.handlebars.renderTemplate(
      'systems/watersnake-grail-war/templates/chat/feature-card.html',
      {
        actor: this.actor, item: item, system: sys,
        actorId: this.actor.id, tokenId: tokenId,
        hasTrait: !!(sys.rollCustom?.value) || !!(sys.rollAbility?.value && this.actor.system.abilities?.[sys.rollAbility.value]),
        traitLabel: sys.rollCustom?.value || abilityNames[sys.rollAbility?.value] || sys.rollAbility?.value || '',
        hasDamage: !!sys.damage?.value,
        hasMisc: !!sys.misc?.value
      }
    );
    await game.holygrailwar.ArchmageUtility.createChatMessage({
      speaker: game.holygrailwar.ArchmageUtility.getSpeaker(this.actor),
      content: content
    }, isPrivate ? { rollMode: 'gmroll' } : {});
  }

  /** feature를 roll20식 선언 배너로 전체 공개 출력 ("{이름}의 『{feature}』‼"). desc 카드와 구별되는 자체 서식. */
  async _announceFeature(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(id);
    if (!item) return;
    const speaker = game.holygrailwar.ArchmageUtility.getSpeaker(this.actor);
    const speakerName = speaker.alias || this.actor.name;
    const token = this.actor.token ?? this.actor.getActiveTokens?.()?.[0]?.document;
    const portrait = token?.texture?.src || this.actor.img;
    const content = await foundry.applications.handlebars.renderTemplate(
      'systems/watersnake-grail-war/templates/chat/feature-call-card.html',
      { speakerName, featureName: item.name, rank: item.system.rank?.value, portrait }
    );
    await game.holygrailwar.ArchmageUtility.createChatMessage({
      // 병합 차단: fvtt-chat-enhancements의 동일 화자 병합(isFamily: alias+액터+유저 일치 시 .added)이
      // 배너를 앞뒤 채팅과 이어붙이지 않도록 액터 없는 화자(alias만)로 전송 → 앞뒤가 별개 블록으로 분리(턴처럼).
      speaker: { alias: speakerName },
      content: content,
      flags: { 'watersnake-grail-war': { featureCall: true } }
    });
  }

  /**
   * Delete items from the actor.
   *
   * @param {Event} event
   *   Html event that triggered the method.
   */
  async _deleteItem(event) {
    let target = event.currentTarget;
    let dataset = target.dataset;

    // Get the item ID, exit if not set.
    let itemId = dataset.itemId;
    if (!itemId) return;

    let bypass = event.shiftKey ? true : false;
    if (bypass) {
      let item = this.actor.items.get(itemId);
      item.delete();
      return;
    }

    // Delete the item from the actor object.
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
      close: html => {
        if (del) {
          let item = this.actor.items.get(itemId);
          item.delete();
        }
      }
    }).render(true);
  }

  _editItem(event) {
    let target = event.currentTarget;
    let dataset = target.dataset;

    // Get the item ID, exit if not set.
    let itemId = dataset.itemId;
    if (!itemId) return;

    // Render the edit form.
    const item = this.actor.items.get(itemId);
    if (item) item.sheet.render(true);
  }

  /* ------------------------------------------------------------------------ */
  /*  Handle effects -------------------------------------------------------- */
  /* ------------------------------------------------------------------------ */
  _onManageEffect(event) {
    let target = event.currentTarget;
    let dataset = target.dataset;
    const effect = dataset.itemId ? this.actor.effects.get(dataset.itemId) : null;

    switch (dataset.action) {
      case 'create':
        return this.actor.createEmbeddedDocuments('ActiveEffect', [{
          name: game.i18n.localize("ARCHMAGE.EFFECT.AE.new"),
          img: 'icons/svg/aura.svg',
          origin: this.actor.uuid,
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

  /* ------------------------------------------------------------------------ */
  /*  Handle ability config ------------------------------------------------- */
  /* ------------------------------------------------------------------------ */

  /**
   * 능력치 설정 대화상자: 숫자(기본 수치) / ＋·－(rerollPlus) / 상시 보정치(flatBonus)를
   * 한 곳에서 편집. 숫자는 _source 기준이라 상시 보정·AE와 섞이지 않음.
   */
  async _onAbilityConfig(event) {
    event.preventDefault();
    const order = ['str', 'end', 'agi', 'mgi', 'lck', 'ins'];
    const labels = { str: '근력', end: '내구', agi: '민첩', mgi: '마력', lck: '행운', ins: '통찰' };
    const src = this.actor._source.system.abilities || {};
    // ＋/－ 드롭다운 선택지: 없음(0) / －(-1) / ＋(1) / ＋＋(2)
    const rerollChoices = [
      { value: 0, label: '없음' },
      { value: -1, label: '－' },
      { value: 1, label: '＋' },
      { value: 2, label: '＋＋' }
    ];
    const abilities = order.filter(k => src[k]).map(k => {
      const cur = Number(src[k].rerollPlus) || 0;
      return {
        key: k,
        label: labels[k] ?? k,
        value: src[k].value ?? 0,
        flatBonus: src[k].flatBonus ?? 0,
        rerollOptions: rerollChoices.map(c => ({ value: c.value, label: c.label, selected: c.value === cur }))
      };
    });
    const isMaster = this.actor.type === 'master';
    const npLabel = isMaster ? '예장' : '보구';
    const npValue = this.actor._source.system.attributes?.np?.value ?? 0;
    const npFlat = this.actor._source.system.attributes?.np?.flatBonus ?? 0;

    const template = 'systems/watersnake-grail-war/templates/dialog/ability-config-dialog.html';
    const content = await foundry.applications.handlebars.renderTemplate(template, { abilities, npLabel, npValue, npFlat });

    let saved = false;
    new Dialog({
      title: '능력치 설정',
      content,
      buttons: {
        save: { label: '저장', callback: () => { saved = true; } },
        cancel: { label: '취소', callback: () => {} }
      },
      default: 'save',
      close: html => {
        if (!saved) return;
        const root = html[0] ?? html;
        const num = (sel) => {
          const el = root.querySelector(sel);
          return el ? (Number(el.value) || 0) : null;
        };
        const updateData = {};
        for (const k of order) {
          if (!src[k]) continue;
          const v = num(`[name="value_${k}"]`);
          const r = num(`[name="reroll_${k}"]`);
          const f = num(`[name="flat_${k}"]`);
          if (v !== null) updateData[`system.abilities.${k}.value`] = v;
          if (r !== null) updateData[`system.abilities.${k}.rerollPlus`] = Math.max(-1, Math.min(2, r));
          if (f !== null) updateData[`system.abilities.${k}.flatBonus`] = f;
        }
        const np = num('[name="np_value"]');
        if (np !== null) updateData['system.attributes.np.value'] = np;
        const npFlatVal = num('[name="np_flat"]');
        if (npFlatVal !== null) updateData['system.attributes.np.flatBonus'] = npFlatVal;
        return this.actor.update(updateData);
      }
    }, { width: 420 }).render(true);
  }

  /**
   * 배경 설정 대화상자: 8개 배경의 활성/이름/수치를 한 곳에서 편집.
   * (활성 체크가 곧 추가/삭제 역할 — 기존 add/remove 버튼 대체)
   */
  async _onBackgroundConfig(event) {
    event.preventDefault();
    const src = this.actor._source.system.backgrounds || {};
    const keys = Object.keys(src);
    const backgrounds = keys.map(k => ({
      key: k,
      isActive: src[k].isActive?.value ?? false,
      name: src[k].name?.value ?? '',
      bonus: src[k].bonus?.value ?? 0
    }));

    const template = 'systems/watersnake-grail-war/templates/dialog/background-config-dialog.html';
    const content = await foundry.applications.handlebars.renderTemplate(template, { backgrounds });

    let saved = false;
    new Dialog({
      title: '배경 설정',
      content,
      buttons: {
        save: { label: '저장', callback: () => { saved = true; } },
        cancel: { label: '취소', callback: () => {} }
      },
      default: 'save',
      close: html => {
        if (!saved) return;
        const root = html[0] ?? html;
        const updateData = {};
        for (const k of keys) {
          const active = root.querySelector(`[name="active_${k}"]`);
          const name = root.querySelector(`[name="name_${k}"]`);
          const bonus = root.querySelector(`[name="bonus_${k}"]`);
          if (active) updateData[`system.backgrounds.${k}.isActive.value`] = active.checked;
          if (name) updateData[`system.backgrounds.${k}.name.value`] = name.value;
          if (bonus) updateData[`system.backgrounds.${k}.bonus.value`] = Number(bonus.value) || 0;
        }
        return this.actor.update(updateData);
      }
    }, { width: 420 }).render(true);
  }

  /* ------------------------------------------------------------------------ */
  /*  Handle rolls ---------------------------------------------------------- */
  /* ------------------------------------------------------------------------ */

  /**
   * Handle rollable clicks.
   */
  async _onRollable(event) {
    event.preventDefault;
    let target = event.currentTarget;
    let dataset = target.dataset;

    // Get the roll type and roll options.
    let type = dataset.rollType ?? null;
    let opt = dataset.rollOpt ?? null;
    let opt2 = dataset.rollOpt2 ?? null;

    if (type == 'item' && opt) this._onItemRoll(opt);
    else if (type == 'recovery') this._onRecoveryRoll(event);
    else if (type == 'save') this._onSaveRoll();
    else if (type == 'disengage') this._onDisengageRoll(opt);
    else if (type == 'init') this._onInitRoll();
    else if (type == 'ability') this._onAbilityRoll(opt);
    else if (type == 'background') this._onBackgroundRoll(opt);
    else if (type == 'command') this._onCommandRoll(opt);
    else if (type == 'recharge') this._onRechargeRoll(opt);
    else if (type == 'feat') this._onFeatRoll(opt, opt2);
    else if (type == 'reroll') this._onRerollRoll(opt);

    // Fallback to a plain formula roll.
    else if (opt) await this._onFormulaRoll(opt);
  }

  /**
   * Perform a basic roll and send it to chat.
   *
   * @param {string} formula
   */
  async _onFormulaRoll(formula) {
    let roll = new Roll(formula, this.actor.getRollData());
    await roll.roll();
    roll.toMessage();
  }

  /**
   * Perform an owned item's roll.
   *
   * @param {string} id
   */
  _onItemRoll(id) {
    let item = this.actor.items.get(id);
    if (item) item.roll();
  }

  /**
   * Roll a recovery for the actor.
   */
  async _onRecoveryRoll(event) {
    this.actor.rollRecoveryDialog(event);
  }


  /**
   * 상태이상 저항 굴림 (1d20 순수 11+).
   */
  async _onSaveRoll() {
    this.actor.rollSave();
  }


  /**
   * Roll a disengage check for the actor.
   *
   * @param {string} difficulty
   *   The save type, such as 'easy', 'normal', 'hard', 'death', or 'disengage'.
   */
  async _onDisengageRoll() {
    this.actor.rollDisengage();
  }

  /**
   * Roll initiative for the actor.
   */
  async _onInitRoll() {
    try {
      const combat = game.combat;
      // 전투(인카운터)가 없으면 굴릴 수 없음.
      if (!combat) {
        ui.notifications.error(game.i18n.localize("ARCHMAGE.UI.errNoInitiativeOutsideCombat"));
        return;
      }

      // ⚠️ 여기서 this는 '시트'다. 액터 메서드는 반드시 this.actor 로 호출.
      const actor = this.actor;
      const formula = actor.getInitiativeFormula();

      // 토큰 확보: 선택된 토큰 > 씬의 활성 토큰 > (토큰 액터면) 자신.
      let tokenDoc = null;
      if (actor.isToken) {
        tokenDoc = actor.token;
      } else {
        const controlled = canvas.tokens?.controlled?.find(t => t.actor?.id === actor.id);
        const placeable = controlled ?? actor.getActiveTokens()[0];
        tokenDoc = placeable?.document ?? null;
      }

      let combatant = combat.combatants.find(c =>
        c.actorId === actor.id || (tokenDoc && c.tokenId === tokenDoc.id)
      );

      // 전투에 아직 없으면 추가.
      if (!combatant) {
        if (!tokenDoc) {
          ui.notifications.warn("이 캐릭터의 토큰을 씬에 두거나 선택한 뒤 다시 시도하세요.");
          return;
        }
        const data = { tokenId: tokenDoc.id, actorId: actor.id, hidden: !!tokenDoc.hidden };
        if (tokenDoc.parent?.id) data.sceneId = tokenDoc.parent.id;
        const created = await combat.createEmbeddedDocuments("Combatant", [data]);
        combatant = created?.[0] ?? combat.combatants.find(c => c.tokenId === tokenDoc.id);
      }
      if (!combatant) {
        ui.notifications.warn("전투원을 만들지 못했습니다.");
        return;
      }

      // 이미 이니셔티브 값이 굴려져 있으면 재굴림 여부를 확인.
      if (combatant.initiative !== null && combatant.initiative !== undefined) {
        const reroll = await foundry.applications.api.DialogV2.confirm({
          window: { title: game.i18n.localize("ARCHMAGE.initiative") },
          content: `<p>${actor.name} 의 이니셔티브가 이미 굴려져 있습니다. 재굴림할까요?</p>`,
          rejectClose: false
        });
        if (!reroll) return;
      }

      // 직접 굴림.
      await combat.rollInitiative([combatant.id], { formula });
    } catch (err) {
      console.error("성배전쟁 이니셔티브 오류:", err);
      ui.notifications.error("이니셔티브 오류: " + (err?.message ?? err));
    }
  }

  /**
   * Roll ability check for the actor.
   */
  _onAbilityRoll(ability) {
    DiceArchmage.BackgroundRoll(this.actor, {defaultAbility: ability});
  }

  /**
   * Roll background check for the actor.
   */
   _onBackgroundRoll(background) {
    DiceArchmage.BackgroundRoll(this.actor, {defaultBackground: background});
  }

  /**
   * Roll command points for an actor, and apply them.
   *
   * @param {string} dice
   *   Dice formula to roll.
   */
  async _onCommandRoll(dice) {
    let actor = this.actor;
    let roll = new Roll(dice, this.actor.getRollData());
    await roll.roll();

    let pointsOld = actor.system.resources.perCombat.commandPoints.current;
    let pointsNew = roll.total;

    // Basic template rendering data
    const template = `systems/watersnake-grail-war/templates/chat/command-card.html`
    const token = actor.token;

    // Basic chat message data
    const chatData = {
      user: game.user.id,
      roll: roll,  // TODO: fix template to use rolls prop
      rolls: [roll],
      speaker: game.holygrailwar.ArchmageUtility.getSpeaker(actor)
    };

    const templateData = {
      actor: actor,
      tokenId: token ? `${token.id}` : null,
      data: chatData
    };

    // Render the template
    chatData["content"] = await foundry.applications.handlebars.renderTemplate(template, templateData);

    await game.holygrailwar.ArchmageUtility.createChatMessage(chatData);

    await actor.update({'system.resources.perCombat.commandPoints.current': Number(pointsOld) + Number(pointsNew)});
  }

  async _onRechargeRoll(itemId) {
    let item = this.actor.items.get(itemId);
    if (item) await item.recharge();
  }

  async _onFeatRoll(itemId, featId) {
    let item = this.actor.items.get(itemId);
    if (item) item.rollFeat(featId);
  }

  async _onRerollRoll(kind) {
    let res = this.actor.system.resources.spendable.rerolls[kind];
    if (res.current <= 0) return;

    // We have uses to spend, find source item
    let prop = "";
    switch (kind) {
      case "AC":
        prop = "rerollAc";
        break
      case "save":
        prop = "rerollSave";
        break
    }
    this.actor.items.forEach(item => {
      if (item.type === 'equipment' && item.system.isActive && item.system.attributes[prop].current > 0) {
        // Found source of the bonus, update it
        let itemOverrideData = {'_id': item.id};
        itemOverrideData[`system.attributes.${prop}.current`] = res.current - 1;
        this.actor.updateEmbeddedDocuments('Item', [itemOverrideData]);
      }
    });

    // Basic template rendering data
    const template = `systems/watersnake-grail-war/templates/chat/reroll-card.html`
    const token = this.actor.token;

    // Basic chat message data
    const chatData = {
      user: game.user.id,
      speaker: game.holygrailwar.ArchmageUtility.getSpeaker(this.actor),
      title: game.i18n.localize(`ARCHMAGE.CHARACTER.RESOURCES.${prop}`),
      desc: game.i18n.localize(`ARCHMAGE.CHARACTER.RESOURCES.${prop}Desc`)
    };

    const templateData = {
      actor: this.actor,
      tokenId: token ? `${token.id}` : null,
      data: chatData
    };

    // Render the template
    chatData["content"] = await foundry.applications.handlebars.renderTemplate(template, templateData);

    await game.holygrailwar.ArchmageUtility.createChatMessage(chatData);

  }

  /* ------------------------------------------------------------------------ */
  /*  Special Listeners ----------------------------------------------------- */
  /* ------------------------------------------------------------------------ */
  async _updateFails(event, saveType) {
    event.preventDefault();
    let target = event.currentTarget;
    let dataset = target.dataset;

    if (dataset.opt) {
      let count = Number(dataset.opt);
      if (count == this.actor.system.attributes.saves[saveType].value) {
        count = Math.max(0, count - 1);
      }
      let updateData = {};
      let path = `system.attributes.saves.${saveType}.value`;
      updateData[path] = count;
      let update = await this.actor.update(updateData);
    }
  }

  async _updateQuantity(event, increase = true) {
    event.preventDefault();
    let target = event.currentTarget;
    let dataset = target.dataset;
    let itemId = dataset.itemId;

    if (!itemId) return;

    let item = this.actor.items.get(itemId);
    if (item) {
      if (item.system?.quantity?.value == null) return;
      // Update the quantity.
      let newQuantity = Number(item.system.quantity.value) ?? 0;
      newQuantity = increase ? newQuantity + 1 : newQuantity - 1;

      // TODO: Refactor the fallback to not be absurdly high after maxQuantity has become regularly used.
      let maxQuantity = item.system?.maxQuantity?.value ?? 99;

      await item.update({'system.quantity.value': increase ? Math.min(maxQuantity, newQuantity) : Math.max(0, newQuantity)}, {});
    }
  }

  async _updateFeatQuantity(event, increase = true) {
    event.preventDefault();
    let target = event.currentTarget;
    let dataset = target.dataset;

    let itemId = dataset.itemId;
    if (!itemId) return;

    let item = this.actor.items.get(itemId);
    if (!item) return;

    let featIndex = dataset.itemFeatkey;
    let feat = item.system.feats[featIndex];
    if (!feat) return;

    // Update the quantity.
    let newQuantity = Number(feat.quantity.value) ?? 0;
    newQuantity = increase ? newQuantity + 1 : newQuantity - 1;

    // TODO: Refactor the fallback to not be absurdly high after maxQuantity has become regularly used.
    let maxQuantity = feat.maxQuantity.value ?? 99;

    let updateData = {};
    updateData[`system.feats.${featIndex}.quantity.value`] = increase ? Math.min(maxQuantity, newQuantity) : Math.max(0, newQuantity);

    await item.update(updateData, {});
  }

  async _updatePips(event) {
    event.preventDefault();
    let target = event.currentTarget;
    let dataset = target.dataset;
    let itemId = dataset.itemId;

    if (!itemId) return;

    let item = this.actor.items.get(itemId);
    if (item) {
      let updateData = {};

      if (item.type == "power") {
        let tier = dataset.tier ?? null;
        if (!tier) return;
        let isActive = item.system.feats[tier].isActive.value;
        updateData[`system.feats.${tier}.isActive.value`] = !isActive;
      }
      else if (item.type == "equipment") {
        let isActive = item.system.isActive;
        updateData["system.isActive"] = !isActive;
      }

      await item.update(updateData, {});
    }
  }

  /**
   * Handle rests.
   */
   _onRest(event) {
    event.preventDefault;
    let target = event.currentTarget;
    let dataset = target.dataset;

    // Get the roll type and roll options.
    let type = dataset.restType ?? null;

    // Exit if type is invalid;
    if (type !== 'quick' && type !== 'full') return;

    // Determine if we need to skip confirmation.
    let bypass = event.shiftKey ? true : false;
    if (bypass) {
      if (type == 'quick') this.actor.restQuick();
      else if (type == 'full') this.actor.restFull();
    }
    // Otherwise, we need to make a dialog.
    else {
      let options = {
        title: null,
        confirmLabel: 'ARCHMAGE.CHAT.Rest',
        cancelLabel: 'ARCHMAGE.CHAT.Cancel',
        default: 'rest',
      };

      if (type == 'quick') {
        options.title = 'ARCHMAGE.CHAT.QuickRest';
        options.content = 'ARCHMAGE.CHAT.QuickRestBody';
      }
      else if (type == 'full') {
        options.title = 'ARCHMAGE.CHAT.FullHeal';
        options.content = 'ARCHMAGE.CHAT.FullHealBody';
      }

      // Render the rest dialog.
      let doRest = false;
      new Dialog({
        title: game.i18n.localize(options.title),
        content: game.i18n.localize(options.content),
        buttons: {
          rest: {
            label: game.i18n.localize(options.confirmLabel),
            callback: () => {doRest = true;}
          },
          cancel: {
            label: game.i18n.localize(options.cancelLabel),
            callback: () => {}
          }
        },
        default: 'rest',
        close: html => {
          if (doRest) {
            if (type == 'quick') this.actor.restQuick();
            else if (type == 'full') this.actor.restFull();
          }
        }
      }).render(true);
    }
  }

  /**
   * Apply drag events to items (powers and equipment).
   * @param {jQuery} html
   */
  _dragHandler(html) {
    let dragHandler = event => this._onDragStart(event);
    html.find('.item[data-draggable="true"]').each((i, li) => {
      li.setAttribute('draggable', true);
      li.addEventListener('dragstart', dragHandler, false);
    });
  }

  /**
   * Callback actions which occur at the beginning of a drag start workflow.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragStart(event) {
    const li = event.currentTarget;
    if ("link" in event.target.dataset) return;

    let dragData = null;

    // Active Effect
    if (li.dataset.documentClass === 'ActiveEffect') {
      if (li.dataset.effectId) {
        const effect = this.actor.effects.get(li.dataset.effectId);
        dragData = effect.toDragData();
      }
    }
    else if (li.dataset.documentClass === 'Item') {
      if (li.dataset.itemId) {
        const item = this.actor.items.get(li.dataset.itemId);
        dragData = item.toDragData();
      }
    }

    if (!dragData) return;

    // Set data transfer
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  /** @override */
  async _onDropActiveEffect(event, data) {
    // Run core's effect operations.
    await super._onDropActiveEffect(event, data);

    // Handle item sorting within the same Actor
    const effect = await ActiveEffect.implementation.fromDropData(data);
    const effectData = effect.toObject();
    if ( this.actor.uuid === effect.parent?.uuid ) return this._onSortEffect(event, effectData);
  }

  /**
   * Sort effects on drop. Adapted from ActorSheet._onSortItem().
   * @param {Event} event
   * @param {Object} effectData
   * @private
   */
  _onSortEffect(event, effectData) {

    // Get the drag source and drop target
    const effects = this.actor.effects;
    const source = effects.get(effectData._id);
    const dropTarget = event.target.closest("[data-effect-id]");
    if ( !dropTarget ) return;
    const target = effects.get(dropTarget.dataset.effectId);

    // Don't sort on yourself
    if ( source.id === target.id ) return;

    // Identify sibling effects based on adjacent HTML elements
    const siblings = [];
    for ( let el of dropTarget.parentElement.children ) {
      const siblingId = el.dataset.effectId;
      if ( siblingId && (siblingId !== source.id) ) siblings.push(effects.get(el.dataset.effectId));
    }

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(source, {target, siblings});
    const updateData = sortUpdates.map(u => {
      const update = u.update;
      update._id = u.target._id;
      return update;
    });

    // Perform the update
    return this.actor.updateEmbeddedDocuments("ActiveEffect", updateData);
  }

  _onFocus(event) {
    let target = event.currentTarget;
    setTimeout(function() {
      if (target == document.activeElement) {
        $(target).trigger('select');
      }
    }, 100);
  }

}
