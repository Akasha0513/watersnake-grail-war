<template>
  <div :class="concat('archmage-v2-vue character flexcol ', nightmode)">

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
            <!-- Powers tab (마스터/서번트) -->
            <Tab group="primary" :tab="tabs.primary.powers">
              <CharFeatures :actor="actor"/>
            </Tab>
            <!-- 상대 타입 powers 탭 (설정 토글 시 표시) -->
            <Tab group="primary" :tab="tabs.primary.oppositePowers">
              <CharFeatures :actor="actor" :forType="oppositeType"/>
            </Tab>
            <!-- Inventory tab (소지품) -->
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
            label: '상세',
            active: false,
            componentClass: markRaw(CharDetails)
          },
          powers: {
            key: 'powers',
            label: this.actor.type === 'master' ? '체계' : '스킬',
            active: true,
            componentClass: markRaw(CharPowers)
          },
          oppositePowers: {
            key: 'oppositePowers',
            label: this.actor.type === 'master' ? '스킬' : '체계',
            active: false,
            componentClass: markRaw(CharPowers),
            hidden: !this.actor.flags?.['watersnake-grail-war']?.showOppositeTab
          },
          inventory: {
            key: 'inventory',
            label: '소지품',
            active: false,
            componentClass: markRaw(CharInventory)
          },
          effects: {
            key: 'effects',
            label: '효과',
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
    // 상대 powers 탭에 렌더할 타입(마스터↔서번트)
    oppositeType() {
      return this.actor.type === 'master' ? 'character' : 'master';
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
