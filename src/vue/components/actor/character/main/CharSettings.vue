<template>
  <section :class="classes">
    <h2 class="unit-title">{{localize('ARCHMAGE.CHARACTERSETTINGS.settings')}}</h2>
    <section class="sheet-settings grid grid-6col">
      <!-- 성배전쟁 설정 (지정 순서) -->
      <div class="unit unit--base-settings">
        <!-- 1. 서번트 클래스 (서번트 전용) -->
        <div v-if="actor.type !== 'master'" class="sub-unit sub-unit--servant-class flexrow">
          <strong class="unit-subtitle">서번트 클래스</strong>
          <select name="system.details.servantClass.value" v-model="actor.system.details.servantClass.value">
            <option v-for="(opt, i) in servantClasses" :key="i" :value="opt.value">{{opt.label}}</option>
          </select>
        </div>
        <!-- 2. 방어 분류 (서번트 전용) -->
        <div v-if="actor.type !== 'master'" class="sub-unit sub-unit--defense-type flexrow">
          <strong class="unit-subtitle">방어 분류</strong>
          <select name="system.details.defenseType.value" v-model="actor.system.details.defenseType.value">
            <option v-for="(opt, i) in defenseTypes" :key="i" :value="opt.value">{{opt.label}}</option>
          </select>
        </div>
        <!-- 마스터 영령 취급 (마스터 전용): HP·MP·신방·정방을 서번트식으로 -->
        <div v-if="actor.type === 'master'" class="sub-unit sub-unit--master-as-servant flexrow">
          <strong class="unit-subtitle">영령 취급</strong>
          <select name="system.details.masterAsServant.value" v-model="actor.system.details.masterAsServant.value">
            <option v-for="(opt, i) in masterServantTypes" :key="i" :value="opt.value">{{opt.label}}</option>
          </select>
        </div>
        <!-- 3. HP 자동 계산 -->
        <div class="sub-unit sub-unit--calculate-max-hp flexrow">
          <strong class="unit-subtitle">HP 자동 계산</strong>
          <input type="checkbox" name="system.attributes.hp.automatic" v-model="actor.system.attributes.hp.automatic"/>
        </div>
        <!-- 4. MP 자동 계산 -->
        <div class="sub-unit sub-unit--calculate-mp flexrow">
          <strong class="unit-subtitle">MP 자동 계산</strong>
          <input type="checkbox" name="system.attributes.mp.automatic" v-model="actor.system.attributes.mp.automatic"/>
        </div>
        <!-- 5. SP 자동 계산 (서번트 전용) -->
        <div v-if="actor.type !== 'master'" class="sub-unit sub-unit--calculate-sp flexrow">
          <strong class="unit-subtitle">SP 자동 계산</strong>
          <input type="checkbox" name="system.attributes.sp.automatic" v-model="actor.system.attributes.sp.automatic"/>
        </div>
        <!-- 6. SP 공식 (서번트 전용) -->
        <div v-if="actor.type !== 'master'" class="sub-unit sub-unit--sp-formula flexrow">
          <strong class="unit-subtitle">SP 공식</strong>
          <select name="system.attributes.sp.formula" v-model="actor.system.attributes.sp.formula">
            <option v-for="(opt, i) in spFormulas" :key="i" :value="opt.value">{{opt.label}}</option>
          </select>
        </div>
        <!-- 7. 신방 자동 계산 -->
        <div class="sub-unit sub-unit--calculate-pd flexrow">
          <strong class="unit-subtitle">신방 자동 계산</strong>
          <input type="checkbox" name="system.attributes.pd.automatic" v-model="actor.system.attributes.pd.automatic"/>
        </div>
        <!-- 8. 신방 능력치 -->
        <div class="sub-unit sub-unit--pd-ability flexrow">
          <strong class="unit-subtitle">신방 능력치</strong>
          <select name="system.attributes.pd.defenseAbility" v-model="actor.system.attributes.pd.defenseAbility">
            <option v-for="(opt, i) in defenseAbilities" :key="i" :value="opt.value">{{opt.label}}</option>
          </select>
        </div>
        <!-- 9. 정방 자동 계산 -->
        <div class="sub-unit sub-unit--calculate-md flexrow">
          <strong class="unit-subtitle">정방 자동 계산</strong>
          <input type="checkbox" name="system.attributes.md.automatic" v-model="actor.system.attributes.md.automatic"/>
        </div>
        <!-- 상대 타입 탭 표시 (마스터=스킬 / 서번트=체계). 켜면 상대 powers 탭이 추가됨 -->
        <div class="sub-unit sub-unit--opposite-tab flexrow">
          <strong class="unit-subtitle">{{ actor.type === 'master' ? '스킬 탭 표시' : '체계 탭 표시' }}</strong>
          <input type="checkbox" name="flags.watersnake-grail-war.showOppositeTab" v-model="oppositeTabFlag.value"/>
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
      masterServantTypes: [
        { value: 'none', label: '없음 (기본 마스터)' },
        { value: 'three', label: '삼기사' },
        { value: 'sorcery', label: '사술사' },
      ],
      defenseAbilities: [
        { value: 'auto', label: '자동 (큰 값)' },
        { value: 'end', label: '내구' },
        { value: 'agi', label: '민첩' },
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
    classes() {
      return `section section--settings flexcol`;
    },
    // 상대 타입 탭 표시 플래그(표시는 computed, 저장은 name 기반 submitOnChange).
    oppositeTabFlag() {
      return { value: this.actor.flags?.['watersnake-grail-war']?.showOppositeTab ?? false };
    },
    resourcesCustom() {
      let resources = {};
      for (let [k,v] of Object.entries(this.actor.system.resources.spendable)) {
        if ( v.secondEdition && !game.settings.get('watersnake-grail-war', 'secondEdition') ) continue;
        if (k.includes('custom')) resources[k] = v;
      }
      return resources;
    }
  },
  methods: { /* See created. */},
  async mounted() {}
}
</script>
