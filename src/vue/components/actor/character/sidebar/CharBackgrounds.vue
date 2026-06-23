<template>
  <section class="section section--backgrounds flexcol">
    <div class="backgrounds-header flexrow">
      <h2 class="unit-title">{{localize('ARCHMAGE.backgrounds')}}</h2>
      <a class="background-config" title="배경 설정"><i class="fas fa-gear"></i></a>
    </div>
    <ul class="list list--backgrounds backgrounds">
      <li v-for="(item, index) in backgrounds" :key="concat('system.backgrounds.', index)" class="list-item list-item--backgrounds background flexrow" :data-key="index"
          :data-tooltip="tooltip('pcBackground', {desc:item.name.value})">
        <span class="background-name">{{item.name.value}}</span>
        <span class="background-sign">+</span>
        <span class="background-bonus">{{item.bonus.value}}</span>
      </li>
    </ul>
  </section>
</template>

<script>
import { localize, concat, tooltip } from '@/methods/Helpers';
export default {
  name: 'CharBackgrounds',
  props: ['actor'],
  setup() {
    return {
      localize,
      concat,
      tooltip
    }
  },
  data() {
    return {}
  },
  computed: {
    // 활성화된 배경만 표시 (이름/수치/활성 편집은 배경 설정 대화상자에서)
    backgrounds() {
      let filteredBackgrounds = {};
      for (let [k,v] of Object.entries(this.actor.system.backgrounds)) {
        if (v.isActive.value === true) filteredBackgrounds[k] = v;
      }
      return filteredBackgrounds;
    }
  },
  methods: {},
  async mounted() {}
}
</script>

<style>
/* 배경 설정 기어 버튼(헤더 오른쪽) */
.section--backgrounds .backgrounds-header {
  align-items: center;
  justify-content: space-between;
}
.section--backgrounds .backgrounds-header .background-config {
  flex: 0 0 auto;
  cursor: pointer;
}
.section--backgrounds .background-bonus {
  font-weight: bold;
}
</style>
