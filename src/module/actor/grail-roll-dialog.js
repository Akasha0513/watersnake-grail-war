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
    this.fumbleExpand = Number(ctx.fumbleExpand) || 0;
    this.rollMode = game.settings.get('core', 'rollMode');
    this.modifiers = Array.isArray(ctx.modifiers) ? foundry.utils.duplicate(ctx.modifiers) : [];
    // 영령의 급(@grade)을 토글 가능한 수정치로 추가. 기본 ON. 커스텀 판정(fixedBonus)은 제외.
    // 서번트는 항상 표시(급 0이어도), 마스터는 급>0일 때만.
    const isServant = ctx.actor?.type !== 'master';
    const gradeVal = Number(ctx.actor?.system?.attributes?.grade?.value) || 0;
    if (!ctx.fixedBonus && (isServant || gradeVal > 0)) {
      this.modifiers.unshift({ label: '영령의 급', value: '@grade', active: true, source: 'grade' });
    }
    // 판정 보정 → 영령의 급 아래로(push) 토글 추가. 커스텀 판정(fixedBonus)은 제외.
    if (!ctx.fixedBonus) {
      // ① 단일 "모든 판정 보정"(checkBonus.value)
      const checkBonusVal = Number(ctx.actor?.system?.attributes?.checkBonus?.value) || 0;
      if (checkBonusVal !== 0) {
        this.modifiers.push({ label: '판정 보정', value: String(checkBonusVal), active: true, source: 'checkBonus' });
      }
      // ② AE 판정 보정 항목(이름별, 다중). 값은 formula 가능(굴림 시 해석).
      // scope = 적용 조건('all'/능력치/'custom'/'melee'/'ranged') — 현재 판정 태그와 일치할 때만 표시·합산(v0.3.25).
      const cbList = ctx.actor?.system?.attributes?.checkBonusList;
      if (Array.isArray(cbList)) {
        for (const cb of cbList) {
          this.modifiers.push({ label: cb.label || '판정 보정', value: String(cb.value), active: true, source: 'checkBonus', scope: cb.apply || 'all' });
        }
      }
    }
  }

  /** 현재 판정의 태그 집합 — 명중 판정은 능력치 판정을 겸함(태그 복수). */
  get currentTags() {
    const tags = [];
    if (this.ctx.fixedBonus) tags.push('custom');
    if (this.selectedAbility) tags.push(this.selectedAbility);
    for (const t of (this.ctx.extraTags || [])) tags.push(t);
    return tags;
  }

  /** 수정치/확장 항목의 적용 조건이 현재 태그와 일치하는가 ('all'·미지정은 항상). */
  _scopeMatch(scope) {
    if (!scope || scope === 'all') return true;
    return this.currentTags.includes(scope);
  }

  /** AE 대성공/대실패 범위 확장 합산(조건 일치분만, 값 formula 해석). */
  _aeExpandSum(list) {
    let sum = 0;
    for (const m of (list || [])) {
      if (!this._scopeMatch(m.apply)) continue;
      const v = this.ctx.actor?._resolveEffectFormula?.(m.value);
      if (typeof v === 'number') sum += v;
    }
    return sum;
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
    const fe = root.querySelector('[name="fumbleExpand"]');
    if (fe) this.fumbleExpand = Number(fe.value) || 0;
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
    // 고조: 유효치(캐릭터별 보정 반영)를 숫자로 표시 — 공식 미리보기에도 숫자 반영. 라벨에 전장 원값 병기. 음수도 표시.
    const edEff = Number(actor.system.attributes?.escalation?.effective ?? 0);
    if (!this.ctx.fixedBonus && edEff !== 0) mods.push({ label: `고조 (전장 ${Number(actor.system.attributes?.escalation?.value) || 0})`, value: String(edEff) });
    for (const bg of (this.ctx.backgrounds || [])) {
      const st = this.checkedBg[bg.key];
      if (!st || !st.checked) continue;
      const b = actor.system.backgrounds?.[bg.key];
      const val = Number(b?.bonus?.value) || 0;
      if (val < 1) continue;
      mods.push({ label: b.name?.value || '배경', value: st.random ? `1d${val}` : `${val}` });
    }
    if (ab && ab.bonus) mods.push({ label: '아이템', value: `@${this.selectedAbility}.bonus` });
    for (const m of this.modifiers) if (m.active !== false && this._scopeMatch(m.scope)) mods.push({ label: m.label, value: m.value });
    if (this.situational) mods.push({ label: '상황', value: String(this.situational) });
    return mods;
  }

  async _prepareContext() {
    const formula = game.holygrailwar.ArchmageUtility.reduceModifiers('1d20', this._previewModifiers());
    // 스코프 불일치 수정치는 숨김(원본 인덱스 idx 보존 — 폼 name/삭제 버튼용).
    const visibleModifiers = this.modifiers
      .map((m, idx) => ({ ...m, idx }))
      .filter(m => this._scopeMatch(m.scope));
    const attrs = this.ctx.actor?.system?.attributes ?? {};
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
      modifiers: visibleModifiers,
      presets: GrailRollDialog.PRESETS,
      situational: this.situational,
      critExpand: this.critExpand,
      fumbleExpand: this.fumbleExpand,
      critAeBonus: this._aeExpandSum(attrs.critModList),
      fumbleAeBonus: this._aeExpandSum(attrs.fumbleModList),
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
    const extraMods = this.modifiers.filter(m => m.active !== false && this._scopeMatch(m.scope));
    // + 버튼을 안 누른 입력 중 커스텀 수정치도 굴림에 포함 (_onAddMod와 동일 규칙)
    const pendLabel = this.element.querySelector('.new-mod-label')?.value?.trim();
    const pendValue = this.element.querySelector('.new-mod-value')?.value?.trim();
    if (pendValue) extraMods.push({ label: pendLabel || '보정', value: pendValue, active: true, source: 'custom' });
    // AE 대성공/대실패 범위 확장(조건 일치분) — 입력값에 굴림 시점 가산
    const attrs = actor?.system?.attributes ?? {};
    const critExpandBonus = this._aeExpandSum(attrs.critModList);
    const fumbleExpandBonus = this._aeExpandSum(attrs.fumbleModList);

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
      fumbleExpand: this.fumbleExpand,
      critExpandBonus,
      fumbleExpandBonus,
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
