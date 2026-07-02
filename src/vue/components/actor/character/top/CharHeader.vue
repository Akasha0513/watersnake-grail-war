<template>
  <!-- HEADER -->
  <header class="header character-header grid" :class="actor.type === 'npc' ? 'grid-1col' : 'grid-4col'">
    <!-- 이명 (공통, 시트/토큰 이름) — npc는 이 이름 하나만 -->
    <div class="unit unit--abs-label unit--name" :data-tooltip="tooltip('pcName')">
      <label for="name">{{actor.type === 'npc' ? '이름' : '이명'}}</label>
      <input type="text" name="name" class="input-secondary" v-model="actor.name">
    </div>
    <!-- 진명(서번트) / 이름(마스터) — npc 제외 -->
    <div v-if="actor.type !== 'npc'" class="unit unit--abs-label unit--race">
      <label for="system.details.trueName.value">{{actor.type !== 'character' ? '이름' : '진명'}}</label>
      <input type="text" name="system.details.trueName.value" class="input-secondary" v-model="actor.system.details.trueName.value">
    </div>
    <!-- 클래스(서번트) / 종족(마스터) — npc 제외 -->
    <div v-if="actor.type !== 'npc'" class="unit unit--abs-label unit--class">
      <label>{{actor.type !== 'character' ? '종족' : '클래스'}}</label>
      <input v-if="actor.type !== 'character'" type="text" name="system.details.race.value" class="input-secondary" v-model="actor.system.details.race.value">
      <input v-else type="text" name="system.details.class.value" class="input-secondary" v-model="actor.system.details.class.value">
    </div>
    <!-- 계약자 (공통) — npc 제외 -->
    <div v-if="actor.type !== 'npc'" class="unit unit--abs-label unit--level">
      <label for="system.details.contractor.value">계약자</label>
      <input type="text" name="system.details.contractor.value" class="input-secondary" v-model="actor.system.details.contractor.value">
    </div>
  </header>
</template>

<script>
import { localize, tooltip } from '@/methods/Helpers';
export default {
  name: 'CharacterHeader',
  props: ['actor'],
  setup() {
    return {
      localize,
      tooltip
    }
  },
  data() {
    return {
      level: {}
    }
  },
  computed: {},
  methods: { /* See created. */},
  async mounted() {
    this.level = this.actor.system.attributes.level;
  }
}
</script>
