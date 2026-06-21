<template>
  <section class="section section--features flexcol">
    <section v-for="cat in visibleCategories" :key="cat.key" class="feature-group">
      <div class="feature-group-header flexrow">
        <h2 class="unit-title">{{cat.label}}</h2>
        <a class="item-control item-create" data-item-type="feature" :data-category="cat.key">
          <i class="fas fa-plus"></i> 추가
        </a>
      </div>
      <ul class="list list--features flexcol">
        <li v-for="item in featuresByCategory(cat.key)" :key="item._id"
            class="list-item feature-item flexrow" :data-item-id="item._id">
          <a class="feature-name feature-chat" :data-item-id="item._id">
            <ruby v-if="item.system.ruby && item.system.ruby.value">{{item.name}}<rt>{{item.system.ruby.value}}</rt></ruby><template v-else>{{item.name}}</template>
          </a>
          <span class="item-controls flexrow flexshrink">
            <a v-if="hasRoll(item)" class="feature-roll" :data-item-id="item._id" data-tooltip="굴림"><i class="fas fa-dice-d20"></i></a>
            <a class="item-control item-edit" :data-item-id="item._id"><i class="fas fa-edit"></i></a>
            <a class="item-control item-delete" :data-item-id="item._id"><i class="fas fa-trash"></i></a>
          </span>
        </li>
      </ul>
    </section>
  </section>
</template>

<script>
import { localize } from '@/methods/Helpers';
export default {
  name: 'CharFeatures',
  props: ['actor', 'group'],
  setup() {
    return { localize };
  },
  data() {
    return {
      categories: [
        { key: 'system', label: '체계', types: ['master'], group: 'powers' },
        { key: 'action', label: '액션', types: ['master'], group: 'powers' },
        { key: 'equip', label: '예장', types: ['master'], group: 'inventory' },
        { key: 'skill', label: '스킬', types: ['character'], group: 'powers' },
        { key: 'variable', label: '가변 기능', types: ['character'], group: 'powers' },
        { key: 'np', label: '보구', types: ['character'], group: 'inventory' }
      ]
    };
  },
  computed: {
    visibleCategories() {
      const grp = this.group || 'powers';
      return this.categories.filter(c => c.types.includes(this.actor.type) && c.group === grp);
    }
  },
  methods: {
    featuresByCategory(catKey) {
      const items = this.actor.items || [];
      return items.filter(i => i.type === 'feature' && (i.system.category?.value || '') === catKey);
    },
    hasRoll(item) {
      return !!(item.system.rollAbility?.value || item.system.damage?.value);
    }
  }
}
</script>
