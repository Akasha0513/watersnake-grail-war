<template>
  <!-- NPC 간소 시트 (상단: 이름+메모+HP/MP/SP/방어 / 하단: 액션·예장·기타 기능) -->
  <div v-if="actor.type === 'npc'" :class="concat('archmage-v2-vue npc flexcol ', nightmode)">
    <section class="container container--top flexcol">
      <header class="header npc-header">
        <div class="unit unit--abs-label unit--name">
          <label for="name">이름</label>
          <input type="text" name="name" class="input-secondary" v-model="actor.name">
        </div>
      </header>
      <section class="section section--npc-memo flexcol">
        <h2 class="unit-title">메모</h2>
        <textarea name="system.details.flavor.value" v-model="actor.system.details.flavor.value" class="npc-memo" rows="3"></textarea>
      </section>
      <section class="section section--npc-stats">
        <div class="npc-stat">
          <span class="npc-stat-label">HP</span>
          <span class="npc-stat-value"><input type="number" name="system.attributes.hp.value" v-model="actor.system.attributes.hp.value"/><span class="sep">/</span><input type="number" name="system.attributes.hp.max" v-model="actor.system.attributes.hp.max"/></span>
        </div>
        <div class="npc-stat">
          <span class="npc-stat-label">MP</span>
          <span class="npc-stat-value"><input type="number" name="system.attributes.mp.value" v-model="actor.system.attributes.mp.value"/><span class="sep">/</span><input type="number" name="system.attributes.mp.max" v-model="actor.system.attributes.mp.max"/></span>
        </div>
        <div class="npc-stat">
          <span class="npc-stat-label">SP</span>
          <span class="npc-stat-value"><input type="number" name="system.attributes.sp.value" v-model="actor.system.attributes.sp.value"/><span class="sep">/</span><input type="number" name="system.attributes.sp.max" v-model="actor.system.attributes.sp.max"/></span>
        </div>
        <div class="npc-stat">
          <span class="npc-stat-label">신방</span>
          <span class="npc-stat-value"><input type="number" name="system.attributes.pd.value" v-model="actor.system.attributes.pd.value"/></span>
        </div>
        <div class="npc-stat">
          <span class="npc-stat-label">정방</span>
          <span class="npc-stat-value"><input type="number" name="system.attributes.md.value" v-model="actor.system.attributes.md.value"/></span>
        </div>
      </section>
    </section>
    <section class="container container--bottom flexcol">
      <CharFeatures :actor="actor"/>
      <CharFeatures :actor="actor" group="inventory"/>
    </section>
  </div>

  <!-- 캐릭터/마스터 시트 -->
  <div v-else :class="concat('archmage-v2-vue character flexcol ', nightmode)">

    <!-- Top group -->
    <section class="container container--top flexcol">
      <!-- Header -->
      <CharHeader :actor="actor"/>
      <Tabs :actor="actor" group="mobile" :tabs="tabs.mobile" :flags="flags" hamburger="true" />
      <Tab group="mobile" :tab="tabs.mobile.attributes">
        <!-- Attributes section -->
        <CharAttributes :actor="actor"/>
      </Tab>
    </section>
    <!-- /Top group -->

    <!-- Bottom group -->
    <section class="container container--bottom flexrow">

      <!-- Left sidebar -->
      <Tab group="mobile" :tab="tabs.mobile.abilities">
        <section class="section section--sidebar flexcol">
          <CharInitiative :actor="actor"/>
          <CharAbilities :actor="actor"/>
          <CharBackgrounds :actor="actor"/>
          <!-- 성배전쟁: 13th Age 잔재 숨김 -->
          <!-- <CharIconRelationships :actor="actor"/> -->
          <!-- <CharOut :actor="actor" :owner="context.owner"/> -->
          <!-- <CharIncrementals :actor="actor"/> -->
        </section>
      </Tab>
      <!-- /Left sidebar -->

      <!-- Main content -->
      <Tab group="mobile" :tab="tabs.mobile.combat">
        <section class="section section--main flexcol">

          <!-- Class resources -->
          <CharResources :actor="actor"/>
          <!-- Tabs -->
          <Tabs :actor="actor" group="primary" :tabs="tabs.primary" :flags="flags"/>

          <!-- Tabs content -->
          <section class="section section--tabs-content flexcol">
            <!-- Details tab -->
            <Tab group="primary" :tab="tabs.primary.details">
              <CharDetails :actor="actor" :owner="context.owner" :tab="tabs.primary.details" :flags="flags"/>
            </Tab>
            <!-- Powers tab -->
            <Tab group="primary" :tab="tabs.primary.powers">
              <CharFeatures :actor="actor"/>
            </Tab>
            <!-- Triggers tab -->
            <Tab group="primary" :tab="tabs.primary.triggers">
              <CharTriggers :actor="actor" :context="context" :tab="tabs.primary.powers" :flags="flags"/>
            </Tab>
            <!-- Inventory tab -->
            <Tab group="primary" :tab="tabs.primary.inventory">
              <CharFeatures :actor="actor" group="inventory"/>
            </Tab>
            <!-- Effects tab -->
            <Tab group="primary" :tab="tabs.primary.effects">
              <CharEffects :actor="actor" :tab="tabs.primary.effects" :flags="flags" :key="context._renderKey"/>
            </Tab>
            <!-- Settings tab -->
            <Tab group="primary" :tab="tabs.primary.settings" v-if="shouldDisplaySettingsTab(actor)">
              <CharSettings :actor="actor" :tab="tabs.primary.settings"/>
            </Tab>
          </section>
          <!-- /Tabs content -->

        </section>
      </Tab>
      <!-- /Main content -->

    </section>
    <!-- /Bottom group -->

  </div>
</template>


<script>
import { markRaw } from 'vue';
import { concat, localize } from '@/methods/Helpers';
import CharDetails from '@/components/actor/character/main/CharDetails.vue';
import CharFeatures from '@/components/actor/character/main/CharFeatures.vue';
import {
  Tabs,
  Tab,
  CharHeader,
  CharAttributes,
  CharInitiative,
  CharAbilities,
  CharBackgrounds,
  CharIconRelationships,
  CharOut,
  CharIncrementals,
  CharResources,
  // CharDetails,
  CharPowers,
  CharTriggers,
  CharInventory,
  CharEffects,
  CharSettings
} from '@/components';

export default {
  name: 'ArchmageCharacterSheet',
  props: ['context', 'actor', 'owner'],
  components: {
    Tabs,
    Tab,
    CharHeader,
    CharAttributes,
    CharInitiative,
    CharAbilities,
    CharBackgrounds,
    CharIconRelationships,
    CharOut,
    CharIncrementals,
    CharResources,
    CharDetails,
    CharFeatures,
    CharPowers,
    CharTriggers,
    CharInventory,
    CharEffects,
    CharSettings,
  },
  setup() {
    return {
      concat
    }
  },
  data() {
    return {
      actorData: {},
      tabs: {
        primary: {
          details: {
            key: 'details',
            label: localize('ARCHMAGE.details'),
            active: false,
            componentClass: markRaw(CharDetails)
          },
          powers: {
            key: 'powers',
            label: localize('ARCHMAGE.powers'),
            active: true,
            componentClass: markRaw(CharPowers)
          },
          triggers: {
            key: 'triggers',
            label: localize('ARCHMAGE.triggers'),
            active: false,
            componentClass: markRaw(CharTriggers),
            icon: 'fa-caret-right',
            hideLabel: true,
            hidden: !this.actor.flags?.['watersnake-grail-war']?.showTriggersTab
          },
          inventory: {
            key: 'inventory',
            label: localize('ARCHMAGE.inventory'),
            active: false,
            componentClass: markRaw(CharInventory)
          },
          effects: {
            key: 'effects',
            label: localize('ARCHMAGE.effects'),
            active: false,
            componentClass: markRaw(CharEffects)
          },
          settings: {
            key: 'settings',
            label: localize('ARCHMAGE.CHARACTERSETTINGS.settings'),
            active: false,
            icon: 'fa-cogs',
            hideLabel: true,
            hidden: (this.actor.flags?.['watersnake-grail-war']?.hideSettingsTab === true && !game.user.isGM),
            componentClass: markRaw(CharSettings)
          }
        },
        mobile: {
          attributes: {
            key: 'attributes',
            label: localize('ARCHMAGE.attributes'),
            active: false,
          },
          abilities: {
            key: 'abilities',
            label: localize('ARCHMAGE.abilities'),
            active: false,
          },
          combat: {
            key: 'combat',
            label: localize('ARCHMAGE.combat'),
            active: false,
          }
        }
      }
    }
  },
  methods: {
    shouldDisplaySettingsTab(actor) {
      if (actor?.flags?.['watersnake-grail-war']?.hideSettingsTab === true && !game.user.isGM) {
        return false;
      }
      return true;
    },
  },
  computed: {
    nightmode() {
      return game.settings.get("watersnake-grail-war", "nightmode") ? 'nightmode' : '';
    },
    flags() {
      let flags = this.actor.flags ? this.actor.flags['watersnake-grail-war'] : {};
      let baseFlags = {
        'sheetDisplay': {
          'powers': {
            'groupBy': {'value': 'powerType'},
            'sortBy': {'value': 'custom'}
          },
          'inventory': {
            'sortBy': {'value': 'custom'}
          },
          'tabs': {
            'primary': {'value': 'powers'},
            'mobile': {'value': 'attributes'},
          },
        }
      }
      return foundry.utils.mergeObject(baseFlags, flags);
    }
  },
  watch: {},
  async created() {
    console.log("Creating Sheet");
  },
  async mounted() {
    console.log("Sheet Mounted");
  },
};
</script>
