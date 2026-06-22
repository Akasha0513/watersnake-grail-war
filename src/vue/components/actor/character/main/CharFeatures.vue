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
            class="list-item feature-item flexcol" :data-item-id="item._id">
          <div class="feature-header flexrow">
            <a class="feature-chat feature-chat-icon" :data-item-id="item._id" title="채팅에 전송"><i class="far fa-comment-alt"></i></a>
            <a class="feature-name feature-expand" @click="toggle(item._id)">
              <ruby v-if="item.system.ruby && item.system.ruby.value">{{item.name}}<rt>{{item.system.ruby.value}}</rt></ruby><template v-else>{{item.name}}</template>
              <span v-if="item.system.rank && item.system.rank.value" class="feature-rank">{{item.system.rank.value}}</span>
            </a>
            <span v-if="item.system.kind && item.system.kind.value" class="feature-kind-mid">{{item.system.kind.value}}</span>
            <span class="item-controls flexrow flexshrink">
              <a class="item-control item-edit" :data-item-id="item._id"><i class="fas fa-edit"></i></a>
              <a class="item-control item-delete" :data-item-id="item._id"><i class="fas fa-trash"></i></a>
            </span>
          </div>
          <div v-if="expanded[item._id] && item.system.description && item.system.description.value"
               class="feature-summary" v-html="item.system.description.value"></div>
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
      expanded: {},
      categories: [
        { key: 'system', label: '체계', types: ['master'], group: 'powers' },
        { key: 'action', label: '액션', types: ['master'], group: 'powers' },
        { key: 'equip', label: '예장', types: ['master', 'character'], group: 'inventory' },
        { key: 'skill', label: '스킬', types: ['character'], group: 'powers' },
        { key: 'variable', label: '가변 기능', types: ['character'], group: 'powers' },
        { key: 'np', label: '보구', types: ['master', 'character'], group: 'inventory' },
        { key: 'etc', label: '기타 기능', types: ['master', 'character'], group: 'powers' }
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
    toggle(id) {
      this.expanded[id] = !this.expanded[id];
    },
    featuresByCategory(catKey) {
      const items = this.actor.items || [];
      return items.filter(i => i.type === 'feature' && (i.system.category?.value || '') === catKey);
    }
  }
}
</script>
