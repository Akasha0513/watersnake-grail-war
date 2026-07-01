<template>
  <div class="archmage-appv2-vue flexcol effects">
    <!-- Header -->
    <header class="sheet-header">
      <img class="profile-img" :src="effect.img" data-edit="img" data-action="onEditImage" :title="effect.name"
        height="100" width="100" />
      <div class="header-fields flexrow">
        <input type="text" name="name" v-model="effect.name" />
      </div>
    </header>

    <fieldset class="section--preview" :class="$style.preview">
      <legend>{{ localize('Preview') }}</legend>
      <div class="archmage-v2 sheet">
        <section class="section--effects">
          <ul class="effects-group-content flexcol">
            <li
              :class="concat('item effect effects-item ', concat('effect-', context.document._id), (context.document.disabled ? ' effects-disabled' : ''))"
              :data-effect-id="effect._id" data-document-class="ActiveEffect" data-drag="true" data-draggable="true"
              draggable="true">
              <div class="effects-summary grid effects-grid effects">
                <div class="effects-icon">
                  <img :src="effect.img ?? 'icons/svg/cowled.svg'" class="effects-image" />
                </div>
                <a class="effects-name" v-on:click="toggleEffect" :data-effects-id="effect._id">
                  <h3 class="effects-title unit-subtitle">{{ effect?.name ?? effect?.label }}</h3>
                </a>
                <div class="effects-bonus flexrow">
                  <div class="bonus" v-for="(bonus, bonusKey) in changes" :key="bonusKey">
                    <span class="bonus-label"><i :class="bonus.icon"></i> {{ bonus.name }} </span>
                    <span class="bonus-mode"><i :class="concat('fas fa-', bonus.mode)"></i> </span>
                    <span class="bonus-value">{{ numberFormat(bonus.value, 0, false) }}</span>
                  </div>
                  <div class="bonus" v-if="effect.flags['watersnake-grail-war']?.ongoingDamage">
                    <span class="bonus-label"><i class="fas fa-flask-round-poison"></i>
                      {{ ongoingDamage }}</span>
                  </div>
                  <div class="bonus" v-if="effect.flags['watersnake-grail-war']?.duration">
                    <span class="bonus-label"><i class="fas fa-timer"></i> {{ duration }}</span>
                  </div>
                </div>
              </div>
              <div v-if="effect.description" class="effect-detail effect-detail--description">
                <Transition name="slide-fade">
                  <div v-if="activeEffects[context.document._id]" class="effect-detail-value"
                    v-html="effect.description"></div>
                </Transition>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </fieldset>

    <div class="section--main">
      <section class="section--fields">
        <!-- Tab links -->
        <Tabs :tabs="tabs.primary" no-span="true" style="margin-bottom: 0.5rem;" />

        <Tab group="primary" :tab="tabs.primary.general">
          <EffectDetails :effect="effect" :context="context" />
        </Tab>

        <Tab group="primary" :tab="tabs.primary.abilities">
          <EffectAbilities :viewModel="viewModel" />
        </Tab>

        <Tab group="primary" :tab="tabs.primary.abilitybonus">
          <EffectAbilityBonus :viewModel="viewModel" />
        </Tab>

        <Tab group="primary" :tab="tabs.primary.defenses">
          <EffectDefenses :viewModel="viewModel" />
        </Tab>

        <Tab group="primary" :tab="tabs.primary.resources">
          <EffectResources :viewModel="viewModel" />
        </Tab>

        <Tab group="primary" :tab="tabs.primary.checkbonus">
          <EffectCheckBonus :viewModel="viewModel" :effect="effect" />
        </Tab>
      </section>
    </div>

  </div>
</template>

<script setup>
import {
  Tabs,
  Tab,
  EffectDetails,
  EffectAbilities,
  EffectAbilityBonus,
  EffectDefenses,
  EffectResources,
  EffectCheckBonus,
} from '@/components';
import { computed, inject, reactive, toRaw, watch } from 'vue';
import { concat, localize, numberFormat } from '@/methods/Helpers';

const props = defineProps(['context']);
const foundryEffect = inject('itemDocument')
// Convert the tabs into a new reactive variable so that they
// don't change every time the item is updated.
const rawTabs = toRaw(props.context.tabs);
const tabs = reactive({ ...rawTabs });
// Retrieve a copy of the full item document instance provided by
// the VueApplicationMixin.

const effect = computed(() => props.context.document);

const modes = [
  'question',
  'times',
  'plus',
  "minus",
  'angle-double-down',
  'angle-double-up',
  'undo'
]

const changes = computed(() => {
  const changesArray = [];
  effect.value.changes.forEach(c => {
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
      changesArray.push(change);
    }
  });
  return changesArray;
});

const duration = computed(() => {
  const rawDuration = effect.value.flags['watersnake-grail-war'].duration
  return game.i18n.localize(CONFIG.HOLYGRAILWAR.effectDurationTypes[rawDuration])
});

const ongoingDamage = computed(() => {
  const dmg = effect.value.flags['watersnake-grail-war'].ongoingDamage || 0
  const type = effect.value.flags['watersnake-grail-war'].ongoingDamageType || ''
  return `${dmg} ongoing ${type} damage`;
});

// 필드 정의: viewModel 키 ↔ (Foundry change 키, 모드).
// ADD=증감, OVERRIDE=덮어쓰기. 같은 키가 모드별로 두 항목 존재 가능(보정치/덮어쓰기).
const ADD = CONST.ACTIVE_EFFECT_MODES.ADD;
const OVERRIDE = CONST.ACTIVE_EFFECT_MODES.OVERRIDE;
const ABILS = ['str', 'end', 'agi', 'mgi', 'lck', 'ins'];
const fieldDefs = [
	// 최대 HP/MP/SP: 증감(ADD)·덮어쓰기(OVERRIDE)·기반 대체(override 엔진이 직접 읽음)
	{ vm: 'hpMax', key: 'system.attributes.hp.max', mode: ADD },
	{ vm: 'mpMax', key: 'system.attributes.mp.max', mode: ADD },
	{ vm: 'spMax', key: 'system.attributes.sp.max', mode: ADD },
	{ vm: 'hpMaxOver', key: 'system.attributes.hp.max', mode: OVERRIDE },
	{ vm: 'mpMaxOver', key: 'system.attributes.mp.max', mode: OVERRIDE },
	{ vm: 'spMaxOver', key: 'system.attributes.sp.max', mode: OVERRIDE },
	{ vm: 'hpBaseOver', key: 'system.overrides.hp.base', mode: OVERRIDE },
	{ vm: 'mpBaseOver', key: 'system.overrides.mp.base', mode: OVERRIDE },
	{ vm: 'spBaseOver', key: 'system.overrides.sp.base', mode: OVERRIDE },
	// 신/정방: 보정치(ADD)·덮어쓰기(OVERRIDE)·기반 대체·수정치 대체
	{ vm: 'pdAdd', key: 'system.attributes.pd.value', mode: ADD },
	{ vm: 'pdOver', key: 'system.attributes.pd.value', mode: OVERRIDE },
	{ vm: 'mdAdd', key: 'system.attributes.md.value', mode: ADD },
	{ vm: 'mdOver', key: 'system.attributes.md.value', mode: OVERRIDE },
	{ vm: 'pdBaseOver', key: 'system.overrides.pd.base', mode: OVERRIDE },
	{ vm: 'pdModOver', key: 'system.overrides.pd.mod', mode: OVERRIDE },
	{ vm: 'mdBaseOver', key: 'system.overrides.md.base', mode: OVERRIDE },
	{ vm: 'mdModOver', key: 'system.overrides.md.mod', mode: OVERRIDE },
	// 이니셔티브 보정(init.value ADD) / 모든 판정 보정(checkBonus.value ADD → 판정 대화상자 토글)
	{ vm: 'initAdd', key: 'system.attributes.init.value', mode: ADD },
	{ vm: 'checkBonusAdd', key: 'system.attributes.checkBonus.value', mode: ADD },
	// 급: 증감(ADD)·대체(OVERRIDE) — 'pre' 단계 적용 → 신방·이니에 반영
	{ vm: 'gradeAdd', key: 'system.attributes.grade.value', mode: ADD },
	{ vm: 'gradeOver', key: 'system.attributes.grade.value', mode: OVERRIDE },
	// 능력치: 기반수치 증감(value ADD)/기반수치 대체(override, 후 강화 누적)/보정 증감(mod ADD)/보정 덮어쓰기(mod OVERRIDE)
	...ABILS.flatMap(a => [
		{ vm: `${a}_valAdd`, key: `system.abilities.${a}.value`, mode: ADD },
		{ vm: `${a}_baseOver`, key: `system.overrides.abilities.${a}.base`, mode: OVERRIDE },
		{ vm: `${a}_modAdd`, key: `system.abilities.${a}.mod`, mode: ADD },
		{ vm: `${a}_modOver`, key: `system.abilities.${a}.mod`, mode: OVERRIDE },
	]),
	// 능력치 상시보정(flatBonus, 18상한 대상)·±개수(rerollPlus): 증감(ADD)/대체(OVERRIDE)
	...ABILS.flatMap(a => [
		{ vm: `${a}_flatAdd`, key: `system.overrides.abilities.${a}.flatBonus`, mode: ADD },
		{ vm: `${a}_flatOver`, key: `system.overrides.abilities.${a}.flatBonus`, mode: OVERRIDE },
		{ vm: `${a}_rerollAdd`, key: `system.overrides.abilities.${a}.rerollPlus`, mode: ADD },
		{ vm: `${a}_rerollOver`, key: `system.overrides.abilities.${a}.rerollPlus`, mode: OVERRIDE },
	]),
];
const viewModel = reactive({});

// 효과 변경 → 뷰모델 (키 + 모드로 매칭)
watch(effect, async (newEffect) => {
	for (const def of fieldDefs) {
		const change = newEffect.changes.find(c => c.key === def.key && Number(c.mode) === def.mode);
		viewModel[def.vm] = change ? change.value : undefined;
	}
}, { immediate: true, deep: true })

// 뷰모델 → 효과 변경
watch(viewModel, async () => {
	const ae = foundry.utils.duplicate(effect.value)
	const newChanges = []
	for (const def of fieldDefs) {
		const value = viewModel[def.vm];
		if (value === undefined || value === null || value === '') continue;
		// ADD 0은 무의미 → 생략. OVERRIDE는 0도 유효(0으로 덮어쓰기).
		if (def.mode === ADD && Number(value) === 0) continue;
		newChanges.push({ key: def.key, value: String(value), mode: def.mode });
	}
	ae.changes = newChanges
	effect.changes = ae.changes
	return foundryEffect.update(ae)
}, { deep: true });

</script>

<style module>
.preview {
  margin-bottom: 1rem;
}
</style>
