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
        <a class="background-delete" @click="removeBackground(index)" data-tooltip="배경 삭제"><i class="fas fa-times"></i></a>
      </li>
    </ul>
    <a class="background-add" @click="addBackground"><i class="fas fa-plus"></i> 배경 추가</a>
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
    backgrounds() {
      let filteredBackgrounds = {};
      for (let [k,v] of Object.entries(this.actor.system.backgrounds)) {
        if (v.isActive.value === true) filteredBackgrounds[k] = v;
      }
      return filteredBackgrounds;
    }
  },
  methods: {
    // 첫 번째 비활성 배경 슬롯을 활성화 (최대 8개)
    async addBackground() {
      for (let [k, v] of Object.entries(this.actor.system.backgrounds)) {
        if (!v.isActive?.value) {
          await this.actor.update({ [`system.backgrounds.${k}.isActive.value`]: true });
          return;
        }
      }
      ui.notifications?.warn('배경 슬롯을 모두 사용했습니다 (최대 8개).');
    },
    // 해당 슬롯을 비활성화하고 값 초기화
    async removeBackground(key) {
      await this.actor.update({
        [`system.backgrounds.${key}.isActive.value`]: false,
        [`system.backgrounds.${key}.name.value`]: '',
        [`system.backgrounds.${key}.bonus.value`]: 0
      });
    }
  },
  async mounted() {}
}
</script>
