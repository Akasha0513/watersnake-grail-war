<template>
  <section class="section section--backgrounds flexcol">
    <h2 class="unit-title">{{localize('ARCHMAGE.backgrounds')}}</h2>
    <ul class="list list--backgrounds backgrounds">
      <li v-for="(item, index) in backgrounds" :key="concat('system.backgrounds.', index)" class="list-item list-item--backgrounds background flexrow" :data-key="index"
          :data-tooltip="tooltip('pcBackground', {desc:item.name.value})">
        <span class="rollable rollable--background flexshrink" data-roll-type="background" :data-roll-opt="item.name.value"></span>
        <span class="background-sign">+</span>
        <input type="number" v-bind:name="concat('system.backgrounds.', index, '.bonus.value')" class="background-bonus" v-model="item.bonus.value"/>
        <TextareaGrow :name="`system.backgrounds.${index}.name.value`" :value="item.name.value" classes="background-name" :disable-paste-parsing="true"/>
        <a class="background-die" :data-key="index" data-tooltip="1d(배경 수치) 굴림"><i class="fas fa-dice-d6"></i></a>
        <a class="background-delete" :data-key="index" data-tooltip="배경 삭제"><i class="fas fa-times"></i></a>
      </li>
    </ul>
    <a class="background-add"><i class="fas fa-plus"></i> 배경 추가</a>
  </section>
</template>

<script>
import { localize, concat, tooltip } from '@/methods/Helpers';
import TextareaGrow from '@/components/parts/TextareaGrow.vue';
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
  components: {
    TextareaGrow
  },
  computed: {
    // 활성화된 배경만 표시 (추가/삭제는 시트 리스너가 처리)
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
