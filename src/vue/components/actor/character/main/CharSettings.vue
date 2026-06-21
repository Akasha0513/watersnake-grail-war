<template>
  <section :class="classes">
    <h2 class="unit-title">{{localize('ARCHMAGE.CHARACTERSETTINGS.settings')}}</h2>
    <section class="sheet-settings grid grid-6col">
      <!-- Main Settings -->
      <div class="unit unit--base-settings">
        <div class="sub-unit sub-unit--calculate-max-hp flexrow">
          <strong class="unit-subtitle">HP 자동 계산</strong>
          <input type="checkbox" name="system.attributes.hp.automatic" v-model="actor.system.attributes.hp.automatic"/>
        </div>
        <div v-if="actor.type === 'master'" class="sub-unit sub-unit--calculate-max-xp flexrow">
          <strong class="unit-subtitle">경험치 자동 계산</strong>
          <input type="checkbox" name="system.attributes.xp.automatic" v-model="actor.system.attributes.xp.automatic"/>
        </div>
        <!-- 성배전쟁: 클래스 / 방어 / 자원 자동계산 -->
        <div v-if="actor.type !== 'master'" class="sub-unit sub-unit--servant-class flexrow">
          <strong class="unit-subtitle">서번트 클래스</strong>
          <select name="system.details.servantClass.value" v-model="actor.system.details.servantClass.value">
            <option v-for="(opt, i) in servantClasses" :key="i" :value="opt.value">{{opt.label}}</option>
          </select>
        </div>
        <div v-if="actor.type !== 'master'" class="sub-unit sub-unit--defense-type flexrow">
          <strong class="unit-subtitle">방어 분류</strong>
          <select name="system.details.defenseType.value" v-model="actor.system.details.defenseType.value">
            <option v-for="(opt, i) in defenseTypes" :key="i" :value="opt.value">{{opt.label}}</option>
          </select>
        </div>
        <div class="sub-unit sub-unit--pd-ability flexrow">
          <strong class="unit-subtitle">신방 능력치</strong>
          <select name="system.attributes.pd.defenseAbility" v-model="actor.system.attributes.pd.defenseAbility">
            <option v-for="(opt, i) in defenseAbilities" :key="i" :value="opt.value">{{opt.label}}</option>
          </select>
        </div>
        <div class="sub-unit sub-unit--calculate-pd flexrow">
          <strong class="unit-subtitle">신방 자동 계산</strong>
          <input type="checkbox" name="system.attributes.pd.automatic" v-model="actor.system.attributes.pd.automatic"/>
        </div>
        <div class="sub-unit sub-unit--calculate-md flexrow">
          <strong class="unit-subtitle">정방 자동 계산</strong>
          <input type="checkbox" name="system.attributes.md.automatic" v-model="actor.system.attributes.md.automatic"/>
        </div>
        <div class="sub-unit sub-unit--calculate-mp flexrow">
          <strong class="unit-subtitle">MP 자동 계산</strong>
          <input type="checkbox" name="system.attributes.mp.automatic" v-model="actor.system.attributes.mp.automatic"/>
        </div>
        <div v-if="actor.type !== 'master'" class="sub-unit sub-unit--calculate-sp flexrow">
          <strong class="unit-subtitle">SP 자동 계산</strong>
          <input type="checkbox" name="system.attributes.sp.automatic" v-model="actor.system.attributes.sp.automatic"/>
        </div>
        <div v-if="actor.type !== 'master'" class="sub-unit sub-unit--sp-formula flexrow">
          <strong class="unit-subtitle">SP 공식</strong>
          <select name="system.attributes.sp.formula" v-model="actor.system.attributes.sp.formula">
            <option v-for="(opt, i) in spFormulas" :key="i" :value="opt.value">{{opt.label}}</option>
          </select>
        </div>
        <div class="sub-unit sub-unit--hp-adjustment flexrow">
          <strong class="unit-subtitle">HP 보정</strong>
          <input type="number" name="system.attributes.hp.extra" v-model="actor.system.attributes.hp.extra" :disabled="overrides.includes('system.attributes.hp.extra')" placeholder="0"/>
        </div>
        <div class="sub-unit sub-unit--initiative-adjustment flexrow">
          <strong class="unit-subtitle">이니셔티브 보정</strong>
          <input type="number" name="system.attributes.init.value" v-model="actor.system.attributes.init.value" :disabled="overrides.includes('system.attributes.init.value')" placeholder="0"/>
        </div>
        <div class="sub-unit sub-unit--disengage-adjustment flexrow">
          <strong class="unit-subtitle">물러서기 보정</strong>
          <input type="number" name="system.attributes.disengageBonus" v-model="actor.system.attributes.disengageBonus" :disabled="overrides.includes('system.attributes.disengageBonus')" placeholder="0"/>
        </div>
        <div class="sub-unit sub-unit--attackMod flexrow">
          <strong class="unit-subtitle">공격 보정</strong>
          <input type="number" name="system.attributes.attackMod.value" v-model="actor.system.attributes.attackMod.value" :disabled="overrides.includes('system.attributes.attackMod.value')"/>
        </div>
        <div class="sub-unit sub-unit--melee">
          <div class="sub-unit sub-unit--melee-dice flexrow">
            <strong class="unit-subtitle">근접 무기 다이스</strong>
            <input type="text" name="system.attributes.weapon.melee.dice" v-model="actor.system.attributes.weapon.melee.dice" :disabled="overrides.includes('system.attributes.weapon.melee.dice')" placeholder="d8"/>
          </div>
          <div class="sub-unit sub-unit--ranged-dice flexrow">
            <strong class="unit-subtitle">사격 무기 다이스</strong>
            <input type="text" name="system.attributes.weapon.ranged.dice" v-model="actor.system.attributes.weapon.ranged.dice" :disabled="overrides.includes('system.attributes.weapon.ranged.dice')" placeholder="d8"/>
          </div>
        </div>
      </div>
      <!-- Flag Settings -->
      <div class="unit unit--flags">
        <div v-for="(flag, f) in flags" :key="f" :data-key="f" class="settings-flags">
          <label :for="concat('flags.watersnake-grail-war.', f)" class="unit-subtitle flexrow">
            <input v-if="!flag.options" type="checkbox" :name="concat('flags.watersnake-grail-war.', f, )" v-model="flag.value"> {{flag.name}}
          </label>
          <select v-if="flag.options" :name="concat('flags.watersnake-grail-war.', f, )" v-model="flag.value">
            <option v-for="(option, o) in flag.options" :key="o" :value="o">{{localize(option)}}</option>
          </select>
          <p class="notes">{{flag.hint}}</p>
        </div>
      </div>
      <!-- Background Settings -->
      <div class="unit unit--backgrounds">
        <div v-for="(background, b) in actor.system.backgrounds" :key="b" class="settings-background" :data-key="b">
          <input type="checkbox" :name="concat('system.backgrounds.', b, '.isActive.value')" v-model="background.isActive.value">
          <strong class="unit-subtitle">{{localize(concat('ARCHMAGE.CHARACTERSETTINGS.', b))}}</strong>
        </div>
      </div>
      <!-- Resource Settings -->
      <div class="unit unit--resources">
        <!-- Custom -->
        <div v-for="(resource, r) in resourcesCustom" :key="r" class="settings-resource" :data-key="r">
          <input type="checkbox" :name="concat('system.resources.spendable.', r, '.enabled')" v-model="resource.enabled">
          <strong class="unit-subtitle">{{localize(concat('ARCHMAGE.CHARACTER.RESOURCES.', r))}}</strong>
          <br/>
          {{localize(concat('ARCHMAGE.RESTS.header'))}}:&nbsp;
          <select :name="concat('system.resources.spendable.', r, '.rest')" v-model="resource.rest">
            <option v-for="(option, index) in resourceRestTypes" :key="index" :value="option.value">
            {{localize(concat('ARCHMAGE.RESTS.',option.value))}}</option>
          </select>
        </div>
      </div>

      <div class="flexcol unit unit--hooks" style="grid-column-end: span 6">
        <h3>
          {{localize('ARCHMAGE.SETTINGS.lifecycleHooks.title')}}
          <InfoBubble :tooltip="localize('ARCHMAGE.SETTINGS.lifecycleHooks.hint')"/>
        </h3>
        <div class="flexrow form-group stacked">
          <div class="flexcol field">
            <label style="flex-grow: 0;">{{localize('ARCHMAGE.SETTINGS.lifecycleHooks.startOfTurn')}}</label>
            <CodemirrorWrapper class="attribute-value"
              name="system.lifecycleHooks.startOfTurn"
              :value="actor.system.lifecycleHooks.startOfTurn"
              :disable-paste-parsing="true" />
          </div>
          <div class="flexcol field">
            <label style="flex-grow: 0;">{{localize('ARCHMAGE.SETTINGS.lifecycleHooks.endOfTurn')}}</label>
            <CodemirrorWrapper class="attribute-value"
              name="system.lifecycleHooks.endOfTurn"
              :value="actor.system.lifecycleHooks.endOfTurn"
              :disable-paste-parsing="true" />
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<script>
import { concat, localize } from '@/methods/Helpers';
import { CodemirrorWrapper, InfoBubble } from '@/components';

export default {
  name: 'CharSettings',
  props: ['actor', 'owner', 'tab'],
  components: { CodemirrorWrapper, InfoBubble },
  setup() {
    return {
      concat,
      localize
    }
  },
  data() {
    return {
      resourceRestTypes: [
        { value: 'none', label: game.i18n.localize("ARCHMAGE.RESTS.none") },
        { value: 'quickreset', label: game.i18n.localize("ARCHMAGE.RESTS.quickreset") },
        { value: 'fullreset', label: game.i18n.localize("ARCHMAGE.RESTS.fullreset") },
        { value: 'quick', label: game.i18n.localize("ARCHMAGE.RESTS.quick") },
        { value: 'full', label: game.i18n.localize("ARCHMAGE.RESTS.full") },
      ],
      servantClasses: [
        { value: '', label: '— 선택 —' },
        { value: 'saber', label: '세이버 (삼기사)' },
        { value: 'lancer', label: '랜서 (삼기사)' },
        { value: 'archer', label: '아처 (삼기사)' },
        { value: 'rider', label: '라이더 (사술사)' },
        { value: 'caster', label: '캐스터 (사술사)' },
        { value: 'assassin', label: '어새신 (사술사)' },
        { value: 'berserker', label: '버서커 (사술사)' },
        { value: 'extra', label: '엑스트라' },
      ],
      defenseTypes: [
        { value: 'auto', label: '자동 (클래스 따름)' },
        { value: 'three', label: '삼기사 (14/10)' },
        { value: 'sorcery', label: '사술사 (12/12)' },
      ],
      defenseAbilities: [
        { value: 'auto', label: '자동 (큰 값)' },
        { value: 'con', label: '내구' },
        { value: 'dex', label: '민첩' },
      ],
      spFormulas: [
        { value: 'strdex', label: '(근력+민첩)÷2' },
        { value: 'con', label: '내구' },
        { value: 'magdex', label: '마술: (마력+민첩)÷2' },
        { value: 'strmag', label: '마술: (근력+마력)÷2' },
        { value: 'magcon', label: '마술: (마력+내구)÷2' },
      ]
    }
  },
  computed: {
    flags() {
      let flags = CONFIG.Actor.characterFlags;
      let charFlags = this.actor.flags && this.actor.flags['watersnake-grail-war'] ? this.actor.flags['watersnake-grail-war'] : {};
      for (let [k, v] of Object.entries(flags)) {
        v.value = charFlags && charFlags[k] ? charFlags[k] : null;
        flags[k] = v;
      }
      return flags;
    },
    classes() {
      return `section section--settings flexcol`;
    },
    resourcesCustom() {
      let resources = {};
      for (let [k,v] of Object.entries(this.actor.system.resources.spendable)) {
        if ( v.secondEdition && !game.settings.get('watersnake-grail-war', 'secondEdition') ) continue;
        if (k.includes('custom')) resources[k] = v;
      }
      return resources;
    },
    overrides() {
      return Object.keys(this.actor.overrides);
    }
  },
  methods: { /* See created. */},
  async mounted() {}
}
</script>
