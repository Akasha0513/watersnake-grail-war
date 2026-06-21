<template>
  <section class="section section--abilities flexcol">
    <div class="list-item-header grid grid-4col">
      <h2 class="unit-title grid-start-3">{{localize('ARCHMAGE.abilities')}}</h2>
    </div>
    <ul class="list list--abilities abilities">
      <li v-for="[index, item] in orderedAbilities" :key="concat('system.abilities.', index, '.value')" class="list-item list-item--abilities ability grid grid-4col" :data-key="index" :data-tooltip="tooltip('pcAbility', 'pcAbility'+index, 'pcAbilitySuffix')">
        <div class="ability-lvl" :style="concat('color:', modColor(item))">{{rank(item.value)}}</div>
        <input type="number" v-bind:name="concat('system.abilities.', index, '.value')" class="ability-score" v-model="item.value"/>
        <a class="ability-name rollable rollable--ability" data-roll-type="ability" :data-roll-opt="index">{{localize(concat('ARCHMAGE.', index, '.label'))}}<sup v-if="item.rerollPlus" class="reroll-plus">{{ '+'.repeat(item.rerollPlus) }}</sup></a>
        <div class="ability-mod" :style="concat('color:', modColor(item))" :title="modTitle(item, actor)">{{numberFormat(item.nonKey.mod, 0, true)}}</div>
      </li>
      <!-- 보구(서번트) / 예장(마스터) -->
      <li class="list-item list-item--abilities ability grid grid-4col">
        <div class="ability-lvl">{{rank(npValue)}}</div>
        <input type="number" name="system.attributes.np.value" class="ability-score" v-model="actor.system.attributes.np.value"/>
        <span class="ability-name">{{actor.type === 'master' ? '예장' : '보구'}}</span>
        <div class="ability-mod">{{numberFormat(npMod, 0, true)}}</div>
      </li>
    </ul>
  </section>
</template>

<script>
import { numberFormat, localize, concat, tooltip } from '@/methods/Helpers';
export default {
  name: 'CharAbilities',
  props: ['actor'],
  setup() {
    return {
      numberFormat,
      localize,
      concat,
      tooltip
    }
  },
  data() {
    return {}
  },
  computed: {
    // 능력치 표시 순서: 근력·내구·민첩·마력·행운·통찰
    orderedAbilities() {
      const order = ['str', 'con', 'dex', 'int', 'cha', 'wis'];
      const ab = this.actor.system.abilities || {};
      const out = [];
      for (const k of order) if (ab[k]) out.push([k, ab[k]]);
      for (const k of Object.keys(ab)) if (!order.includes(k)) out.push([k, ab[k]]);
      return out;
    },
    npValue() {
      return Number(this.actor.system.attributes.np?.value) || 0;
    },
    npMod() {
      return Math.floor(this.npValue / 3);
    }
  },
  methods: {
    modColor(abil) {
      if (!isNaN(abil.mod) && !isNaN(abil.nonKey.mod)) {
        if (abil.mod < abil.nonKey.mod) {
          return '#E01616';
        }
      }
      return 'inherit';
    },
    modTitle(abil, actor) {
      if (!isNaN(abil.mod) && !isNaN(abil.nonKey.mod)) {
        if (abil.mod < abil.nonKey.mod) {
          return game.i18n.format('ARCHMAGE.keyReduced', {
            mod: numberFormat(abil.mod, 0, true),
            kmod1: actor.system.attributes.keyModifier.mod1,
            kmod2: actor.system.attributes.keyModifier.mod2
          });
        }
      }
      return '';
    },
    rank(value) {
      const v = Number(value) || 0;
      if (v >= 21) return 'EX';
      if (v >= 15) return 'A';
      if (v >= 12) return 'B';
      if (v >= 9) return 'C';
      if (v >= 6) return 'D';
      if (v >= 3) return 'E';
      return '-';
    }
  },
  watch: {},
  async mounted() {}
}
</script>
