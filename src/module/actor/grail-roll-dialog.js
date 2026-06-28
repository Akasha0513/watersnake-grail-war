import { DiceArchmage } from './dice.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * 통합 판정 대화상자 (Phase 2). 능력치/배경/feature 판정 공용.
 * UI/상호작용만 담당하고, 실제 굴림·카드 출력은 DiceArchmage._completeBackgroundRoll 재사용.
 * 수정치 리스트(토글) + 실시간 공식 + 커스텀/프리셋 추가 (SWADE RollDialog 패턴 차용).
 */
export class GrailRollDialog extends HandlebarsApplicationMixin(ApplicationV2) {

  constructor({ ctx, resolve, ...options } = {}) {
    super(options);
    this.ctx = ctx;
    this._resolve = resolve;
    this._resolved = false;
    // 상호작용 상태(재렌더 사이 보존)
    this.selectedAbility = ctx.defaultAbility || '';
    this.checkedBg = {};
    this.situational = '';
    this.critExpand = Number(ctx.critExpand) || 0;
    this.rollMode = game.settings.get('core', 'rollMode');
    this.modifiers = Array.isArray(ctx.modifiers) ? foundry.utils.duplicate(ctx.modifiers) : [];
    // 영령의 급(@grade)을 토글 가능한 수정치로 추가. 기본 ON. 커스텀 판정(fixedBonus)은 제외.
    // 서번트는 항상 표시(급 0이어도), 마스터는 급>0일 때만.
    const isServant = ctx.actor?.type !== 'master';
    const gradeVal = Number(ctx.actor?.system?.attributes?.grade?.value) || 0;
    if (!ctx.fixedBonus && (isServant || gradeVal > 0)) {
      this.modifiers.unshift({ label: '영령의 급', value: '@grade', active: true, source: 'grade' });
    }
  }

  static asPromise(ctx) {
    return new Promise(resolve => new this({ ctx, resolve }).render({ force: true }));
  }

  static DEFAULT_OPTIONS = {
    classes: ['archmage', 'grail-roll-dialog', 'standard-form'],
    position: { width: 480, height: 'auto' },
    window: { title: '판정', resizable: true },
    tag: 'form',
    form: {
      handler: GrailRollDialog._onSubmit,
      submitOnChange: false,
      closeOnSubmit: false
    },
    actions: {
      addMod: GrailRollDialog._onAddMod,
      removeMod: GrailRollDialog._onRemoveMod,
      addPreset: GrailRollDialog._onAddPreset
    }
  };

  static PARTS = {
    form: { template: 'systems/watersnake-grail-war/templates/dialog/grail-roll-dialog.html' }
  };

  get title() { return this.ctx.title || '판정'; }

  static PRESETS = [
    { id: 'm4', label: '-4', value: '-4' },
    { id: 'm2', label: '-2', value: '-2' },
    { id: 'p2', label: '+2', value: '+2' },
    { id: 'p4', label: '+4', value: '+4' }
  ];

  /** 현재 폼 상태를 인스턴스 변수로 캡처(재렌더 전 보존용) */
  _captureForm() {
    const root = this.element;
    if (!root) return;
    const ab = root.querySelector('[name="ability"]:checked');
    if (ab) this.selectedAbility = ab.value;
    const sit = root.querySelector('[name="situational"]');
    if (sit) this.situational = sit.value;
    const ce = root.querySelector('[name="critExpand"]');
    if (ce) this.critExpand = Number(ce.value) || 0;
    const rm = root.querySelector('[name="rollMode"]');
    if (rm) this.rollMode = rm.value;
    for (const bg of (this.ctx.backgrounds || [])) {
      const c = root.querySelector(`[name="bg-${bg.key}"]`);
      const r = root.querySelector(`[name="bgrand-${bg.key}"]`);
      this.checkedBg[bg.key] = { checked: !!(c && c.checked), random: !!(r && r.checked) };
    }
    this.modifiers.forEach((m, i) => {
      const c = root.querySelector(`[name="mod-${i}"]`);
      if (c) m.active = c.checked;
    });
  }

  /** 실시간 공식용 — 현재 선택을 모두 반영한 수정치 배열(표시용; 실제 굴림은 _completeBackgroundRoll) */
  _previewModifiers() {
    const actor = this.ctx.actor;
    const mods = [];
    if (this.ctx.fixedBonus) mods.push({ label: '직접', value: String(this.ctx.fixedBonus) });
    const ab = actor.system.abilities?.[this.selectedAbility];
    if (ab) mods.push({ label: game.i18n.localize(`ARCHMAGE.${this.selectedAbility}.label`), value: `@${this.selectedAbility}.mod` });
    // 영령의 급은 this.modifiers(체크박스)로 이동 → 아래 modifiers 루프에서 합산
    if (!this.ctx.fixedBonus && Number(actor.system.attributes?.escalation?.value) > 0) mods.push({ label: '고조', value: '@ed' });
    for (const bg of (this.ctx.backgrounds || [])) {
      const st = this.checkedBg[bg.key];
      if (!st || !st.checked) continue;
      const b = actor.system.backgrounds?.[bg.key];
      const val = Number(b?.bonus?.value) || 0;
      if (val < 1) continue;
      mods.push({ label: b.name?.value || '배경', value: st.random ? `1d${val}` : `${val}` });
    }
    if (ab && ab.bonus) mods.push({ label: '아이템', value: `@${this.selectedAbility}.bonus` });
    for (const m of this.modifiers) if (m.active !== false) mods.push({ label: m.label, value: m.value });
    if (this.situational) mods.push({ label: '상황', value: String(this.situational) });
    return mods;
  }

  async _prepareContext() {
    const formula = game.holygrailwar.ArchmageUtility.reduceModifiers('1d20', this._previewModifiers());
    return {
      abilitySelect: this.ctx.abilitySelect !== false,
      selectedAbility: this.selectedAbility,
      abilities: (this.ctx.abilities || []).map(a => ({ ...a, checked: a.key === this.selectedAbility })),
      hasBackgrounds: (this.ctx.backgrounds || []).length > 0,
      backgrounds: (this.ctx.backgrounds || []).map(b => ({
        ...b,
        checked: !!this.checkedBg[b.key]?.checked,
        random: !!this.checkedBg[b.key]?.random
      })),
      modifiers: this.modifiers,
      presets: GrailRollDialog.PRESETS,
      situational: this.situational,
      critExpand: this.critExpand,
      rollMode: this.rollMode,
      rollModes: CONFIG.Dice.rollModes,
      formula
    };
  }

  _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);
    const t = event.target;
    if (!t || !t.name) return; // 커스텀 입력칸(name 없음)은 무시 → 입력 중 클리어 방지
    // 토글류만 재렌더(리스트/공식 갱신). 텍스트류는 값만 보관.
    if (t.name === 'ability' || t.name.startsWith('bg-') || t.name.startsWith('bgrand-') || t.name.startsWith('mod-')) {
      this._captureForm();
      this.render();
    } else {
      this._captureForm();
    }
  }

  static _onAddMod(event, target) {
    this._captureForm();
    const label = this.element.querySelector('.new-mod-label')?.value?.trim();
    const value = this.element.querySelector('.new-mod-value')?.value?.trim();
    if (value) this.modifiers.push({ label: label || '보정', value, active: true, source: 'custom' });
    this.render();
  }

  static _onRemoveMod(event, target) {
    this._captureForm();
    const i = Number(target.dataset.index);
    if (!Number.isNaN(i)) this.modifiers.splice(i, 1);
    this.render();
  }

  static _onAddPreset(event, target) {
    this._captureForm();
    const p = GrailRollDialog.PRESETS.find(x => x.id === target.dataset.preset);
    if (p) this.modifiers.push({ label: p.label, value: p.value, active: true, source: 'preset' });
    this.render();
  }

  static async _onSubmit(event, form, formData) {
    this._captureForm();
    const selection = formData?.object?.selection ?? event.submitter?.value ?? 'normal';
    const actor = this.ctx.actor;
    const backgrounds = (this.ctx.backgrounds || [])
      .filter(bg => this.checkedBg[bg.key]?.checked)
      .map(bg => ({ key: bg.key, random: !!this.checkedBg[bg.key]?.random }));
    const extraMods = this.modifiers.filter(m => m.active !== false);

    this._resolved = true;
    await DiceArchmage._completeBackgroundRoll({
      actor,
      selection,
      situationalBonus: this.situational,
      abilityKey: this.selectedAbility,
      backgrounds,
      rollMode: this.rollMode,
      fixedBonus: this.ctx.fixedBonus || null,
      critExpand: this.critExpand,
      extraMods
    });
    this._resolve?.(true);
    this.close();
  }

  _onClose(options) {
    super._onClose(options);
    if (!this._resolved) this._resolve?.(null);
  }
}
