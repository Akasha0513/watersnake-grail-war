<template>
  <section class="section section--resources flexrow flexshrink" :data-custom-count="customResourceCount">
    <!-- 령주 (마스터 전용, npc 제외) -->
    <section v-if="actor.type === 'master'" class="unit unit--command-seals">
      <h2 class="unit-title">령주</h2>
      <div class="resource flexrow command-seals">
        <a class="command-seal-step command-seal-minus" title="령주 −1"><i class="fas fa-minus"></i></a>
        <a v-for="n in 3" :key="n" class="command-seal" :data-seal="n">{{ n <= commandSeals ? '●' : '○' }}</a>
        <a class="command-seal-step command-seal-plus" title="령주 +1"><i class="fas fa-plus"></i></a>
      </div>
    </section>
    <div class="resource-divider" v-if="customResourceCount > 1"></div>
    <!-- Custom Resouces -->
    <section v-for="(resource, index) in customResources" :key="index" class="unit unit--custom">
      <input type="text" :name="concat('system.resources.spendable.', index, '.label')" class="resource-title-input" v-model="resource.label"/>
      <Progress :name="index" :current="resource.current" :max="resource.max"/>
      <div class="resource flexrow">
        <input type="number" :name="concat('system.resources.spendable.', index, '.current')" class="resource-current" v-model="resource.current">
        <span class="resource-separator">/</span>
        <input type="number" :name="concat('system.resources.spendable.', index, '.max')" class="resource-max" v-model="resource.max">
      </div>
    </section>
  </section>
</template>

<script>
import { concat, localize, tooltip } from '@/methods/Helpers';
import Progress from '@/components/parts/Progress.vue';
export default {
  name: 'CharResources',
  props: ['actor'],
  setup() {
    return {
      concat,
      localize,
      tooltip,
      CONFIG,
    }
  },
  components: {
    Progress
  },
  computed: {
    customResources() {
      let resources = {};
      for (let [k,v] of Object.entries(this.actor.system.resources.spendable)) {
        if (k.includes('custom') && v.enabled) resources[k] = v;
      }
      return resources;
    },
    customResourceCount() {
      let arr = Object.keys(this.customResources);
      return arr && arr.length ? arr.length : 0;
    },
    commandSeals() {
      return Number(this.actor.system.details?.commandSeals?.value) || 0;
    }
  }
}
</script>
