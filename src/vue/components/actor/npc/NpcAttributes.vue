<template>
  <section :class="'section section--attributes flexrow' + (headerCollapsed ? ' collapsed' : '')">
    <div class="unit unit--attributes grid grid-4col border-both">
      <!-- HP -->
      <div class="unit unit--has-max unit--hp">
        <h2 class="unit-title">{{localize('ARCHMAGE.hitPoints')}}</h2>
        <Progress name="hp" :current="actor.system.attributes.hp.value" :temp="actor.system.attributes.hp.temp" :max="actor.system.attributes.hp.max"/>
        <div class="resource flexrow">
          <Input type="number" name="system.attributes.hp.value" class="resource-current" :actor="actor" reactive="true"/>
          <span class="resource-separator">/</span>
          <Input type="number" name="system.attributes.hp.max" class="resource-max" :actor="actor"/>
        </div>
        <div class="labeled-input flexrow">
          <label for="system.attributes.hp.temp" class="unit-subtitle">{{localize('ARCHMAGE.tempHp')}}</label>
          <Input type="number" name="system.attributes.hp.temp" class="temp-hp" :actor="actor"/>
        </div>
      </div>
      <!-- MP -->
      <div class="unit unit--has-max unit--mp">
        <h2 class="unit-title">MP</h2>
        <Progress name="mp" :current="actor.system.attributes.mp.value" :temp="actor.system.attributes.mp.temp" :max="actor.system.attributes.mp.max"/>
        <div class="resource flexrow">
          <Input type="number" name="system.attributes.mp.value" class="resource-current" :actor="actor" reactive="true"/>
          <span class="resource-separator">/</span>
          <Input type="number" name="system.attributes.mp.max" class="resource-max" :actor="actor"/>
        </div>
      </div>
      <!-- SP -->
      <div class="unit unit--has-max unit--sp">
        <h2 class="unit-title">SP</h2>
        <Progress name="sp" :current="actor.system.attributes.sp.value" :temp="actor.system.attributes.sp.temp" :max="actor.system.attributes.sp.max"/>
        <div class="resource flexrow">
          <Input type="number" name="system.attributes.sp.value" class="resource-current" :actor="actor" reactive="true"/>
          <span class="resource-separator">/</span>
          <Input type="number" name="system.attributes.sp.max" class="resource-max" :actor="actor"/>
        </div>
      </div>
      <!-- Defenses -->
      <div class="unit unit--defenses">
        <h2 class="unit-title">{{localize('ARCHMAGE.defenses')}}</h2>
        <div class="defenses grid grid-2col">
          <div class="defense defense--pd flexcol">
            <Input type="number" name="system.attributes.pd.value" class="defense-value" :actor="actor"/>
            <h3 class="unit-subtitle">{{localize('ARCHMAGE.pd.key')}}</h3>
          </div>
          <div class="defense defense--md flexcol">
            <Input type="number" name="system.attributes.md.value" class="defense-value" :actor="actor"/>
            <h3 class="unit-subtitle">{{localize('ARCHMAGE.md.key')}}</h3>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { concat, localize } from '@/methods/Helpers';
import Progress from '@/components/parts/Progress.vue';
import Input from '@/components/parts/Input.vue';
export default {
  name: 'NpcAttributes',
  props: ['actor'],
  setup() {
    return {
      concat,
      localize
    }
  },
  data() {
    return {}
  },
  components: {
    Progress,
    Input
  },
  computed: {
    headerCollapsed() {
      return this.actor.flags?.['watersnake-grail-war']?.sheetDisplay?.header?.collapsed ?? false;
    }
  },
  methods: {},
  async mounted() {}
}
</script>

<style lang="scss">
.archmage-v2.npc-sheet {
  .section--attributes {
    padding-top: 0;
    padding-bottom: 0;
    margin: 2px 0 16px 0;

    .unit--attributes {
      padding: 6px 0;
      margin-top: 0;
      margin-bottom: 0;
    }

    &.collapsed {
      .unit--attributes {
        &::before {
          top: -4px;
          height: 3px;
          background-size: cover;
          background-position: 0;
        }

        &::after {
          bottom: -3px;
          height: 4px;
          background-size: cover;
          background-position: 0;
        }

        .unit-title {
          height: auto;
          margin-bottom: 0;
        }

        .grid {
          margin: auto;
        }

        .flexrow {
          margin: auto;
        }

        .progress-bar {
          margin: 2px 0;
        }

        .rollable {
          line-height: 1.4;
        }
      }
    }
  }
}
</style>
