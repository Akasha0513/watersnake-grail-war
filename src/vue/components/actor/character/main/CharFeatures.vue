<template>
  <section class="section section--features flexcol">
    <section v-for="cat in categories" :key="cat.key" class="feature-group">
      <div class="feature-group-header flexrow">
        <h2 class="unit-title">{{cat.label}}</h2>
        <a class="item-control item-create" data-item-type="feature" :data-category="cat.key">
          <i class="fas fa-plus"></i> 추가
        </a>
      </div>
      <ul class="list list--features flexcol">
        <li v-for="item in featuresByCategory(cat.key)" :key="item._id"
            class="list-item feature-item flexrow" :data-item-id="item._id">
          <span class="feature-name">
            <span v-if="item.system.ruby && item.system.ruby.value" class="feature-ruby">{{item.system.ruby.value}}</span>
            {{item.name}}
            <span v-if="item.system.rank && item.system.rank.value" class="feature-rank">[{{item.system.rank.value}}]</span>
          </span>
          <span class="item-controls flexrow flexshrink">
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
  props: ['actor'],
  setup() {
    return { localize };
  },
  data() {
    return {
      // 카테고리는 한 종류씩 추가 (1차: 체계)
      categories: [
        { key: 'system', label: '체계' }
      ]
    };
  },
  methods: {
    featuresByCategory(catKey) {
      const items = this.actor.items || [];
      return items.filter(i => i.type === 'feature' && (i.system.category?.value || '') === catKey);
    }
  }
}
</script>
