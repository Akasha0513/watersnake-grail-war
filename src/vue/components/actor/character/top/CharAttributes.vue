<template>
  <section class="section section--attributes flexrow">
    <!-- Actor image -->
    <div class="unit unit--img profile-img" :data-tooltip="tooltip('portrait')">
      <img :src="actor.img" ref="avatar" :alt="localize('ARCHMAGE.avatarAlt')" :width="avatarWidth" :height="avatarHeight" :class="avatarClass" data-edit="img"/>
    </div>
    <!-- npc는 급/레벨 유닛이 없어 4열, 그 외 5열 -->
    <div class="unit unit--attributes grid border-both" :class="actor.type === 'npc' ? 'grid-4col' : 'grid-5col'">
      <!-- HP -->
      <div class="unit unit--has-max unit--hp" :data-tooltip="tooltip('pcHitpoints')">
        <h2 class="unit-title">{{localize('ARCHMAGE.hitPoints')}}</h2>
        <Progress name="hp" :current="actor.system.attributes.hp.value" :temp="actor.system.attributes.hp.temp" :max="actor.system.attributes.hp.max"/>
        <div class="resource flexrow">
          <input type="number" name="system.attributes.hp.value" class="resource-current" v-model="actor.system.attributes.hp.value">
          <span class="resource-separator">/</span>
          <div v-if="actor.system.attributes.hp.automatic" class="resource-max">{{actor.system.attributes.hp.max}}</div>
          <input v-else type="number" name="system.attributes.hp.max" class="resource-max" v-model="actor.system.attributes.hp.max">
        </div>
        <div v-if="showTempHp" class="labeled-input flexrow">
          <label for="system.attributes.hp.temp" class="unit-subtitle">{{localize('ARCHMAGE.tempHp')}}</label>
          <input type="number" name="system.attributes.hp.temp" class="temp-hp" v-model="actor.system.attributes.hp.temp">
        </div>
      </div>
      <!-- MP -->
      <div class="unit unit--has-max unit--mp">
        <h2 class="unit-title">MP</h2>
        <Progress name="mp" :current="actor.system.attributes.mp.value" :temp="actor.system.attributes.mp.temp" :max="actor.system.attributes.mp.max"/>
        <div class="resource flexrow">
          <input type="number" name="system.attributes.mp.value" class="resource-current" v-model="actor.system.attributes.mp.value">
          <span class="resource-separator">/</span>
          <div v-if="actor.system.attributes.mp.automatic" class="resource-max">{{actor.system.attributes.mp.max}}</div>
          <input v-else type="number" name="system.attributes.mp.max" class="resource-max" v-model="actor.system.attributes.mp.max">
        </div>
        <div v-if="showTempMp" class="labeled-input flexrow">
          <label for="system.attributes.mp.temp" class="unit-subtitle">임시 MP</label>
          <input type="number" name="system.attributes.mp.temp" class="temp-hp" v-model="actor.system.attributes.mp.temp">
        </div>
      </div>
      <!-- SP (서번트·마스터 공통) -->
      <div class="unit unit--has-max unit--sp">
        <h2 class="unit-title">SP</h2>
        <Progress name="sp" :current="actor.system.attributes.sp.value" :max="actor.system.attributes.sp.max"/>
        <div class="resource flexrow">
          <input type="number" name="system.attributes.sp.value" class="resource-current" v-model="actor.system.attributes.sp.value">
          <span class="resource-separator">/</span>
          <div v-if="actor.type === 'character' && actor.system.attributes.sp.automatic" class="resource-max">{{actor.system.attributes.sp.max}}</div>
          <input v-else type="number" name="system.attributes.sp.max" class="resource-max" v-model="actor.system.attributes.sp.max">
        </div>
        <!-- 마스터 급(영령 취급 시 신방·이니·판정에 반영). 설정 토글로 표시. -->
        <div v-if="actor.type !== 'character' && showGrade" class="labeled-input flexrow">
          <label for="system.attributes.grade.value" class="unit-subtitle">급</label>
          <input type="number" name="system.attributes.grade.value" class="temp-hp" v-model="actor.system.attributes.grade.value">
        </div>
      </div>
      <!-- Defenses -->
      <div class="unit unit--defenses">
        <h2 class="unit-title">{{localize('ARCHMAGE.defenses')}}</h2>
        <div class="defenses grid grid-2col">
          <div class="defense defense--pd flexcol">
            <span v-if="actor.system.attributes.pd.automatic" class="defense-value">{{actor.system.attributes.pd.value}}</span>
            <input v-else type="number" name="system.attributes.pd.value" class="defense-value" v-model="actor.system.attributes.pd.value"/>
            <h3 class="unit-subtitle">{{localize('ARCHMAGE.pd.key')}}</h3>
          </div>
          <div class="defense defense--md flexcol">
            <span v-if="actor.system.attributes.md.automatic" class="defense-value">{{actor.system.attributes.md.value}}</span>
            <input v-else type="number" name="system.attributes.md.value" class="defense-value" v-model="actor.system.attributes.md.value"/>
            <h3 class="unit-subtitle">{{localize('ARCHMAGE.md.key')}}</h3>
          </div>
        </div>
        <div class="resource flexcol">
          <a class="rollable rollable--disengage disengage-value" data-roll-type="disengage" data-roll-opt="disengage">6+&nbsp;{{localize('ARCHMAGE.SAVE.disengage')}}</a>
        </div>
      </div>
      <!-- 영령의 급(서번트) / 레벨+경험치(마스터) -->
      <div v-if="actor.type === 'character'" class="unit unit--grade flexcol">
        <h2 class="unit-title">영령의 급</h2>
        <div class="resource flexrow">
          <input type="text" name="system.details.gradeName.value" class="resource-current grade-name" style="flex: 2; text-align: center;" v-model="actor.system.details.gradeName.value" placeholder="대영웅">
          <input type="number" name="system.attributes.grade.value" class="resource-current grade-num" style="flex: 1; max-width: 3.2em; text-align: center;" v-model="actor.system.attributes.grade.value">
        </div>
        <div class="labeled-input flexcol" style="align-items: center;">
          <label class="unit-subtitle">속성</label>
          <div class="resource flexrow">
            <input type="text" name="system.details.element.value" class="resource-current" style="text-align: center;" v-model="actor.system.details.element.value">
          </div>
        </div>
      </div>
      <!-- 레벨+경험치: 마스터 전용 (npc 제외) -->
      <div v-else-if="actor.type === 'master'" class="unit unit--grade flexcol">
        <h2 class="unit-title">레벨</h2>
        <div class="resource flexrow">
          <input type="number" name="system.attributes.level.value" class="resource-current" v-model="actor.system.attributes.level.value">
        </div>
        <div class="labeled-input flexcol">
          <label class="unit-subtitle">경험치</label>
          <div class="resource flexrow">
            <input type="number" name="system.attributes.xp.value" class="resource-current" v-model="actor.system.attributes.xp.value">
            <span class="resource-separator">/</span>
            <div v-if="actor.system.attributes.xp.automatic" class="resource-max">{{actor.system.attributes.xp.max}}</div>
            <input v-else type="number" name="system.attributes.xp.max" class="resource-max" v-model="actor.system.attributes.xp.max">
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { concat, localize, tooltip } from '@/methods/Helpers';
import Progress from '@/components/parts/Progress.vue';
export default {
  name: 'CharAttributes',
  props: ['actor'],
  setup() {
    return {
      concat,
      localize,
      tooltip
    }
  },
  data() {
    return {
      avatarClass: 'avatar',
      avatarWidth: 105,
      avatarHeight: 105,
      disengage: {
        value: 6,
        bonus: 0
      },
    }
  },
  components: {
    Progress
  },
  computed: {
    secondEdition() {
      return game.settings.get('watersnake-grail-war', 'secondEdition') === true;
    },
    // 설정 토글(플래그) — 임시 HP/MP 표시, 마스터 급 표시
    showTempHp() { return this.actor.flags?.['watersnake-grail-war']?.showTempHp ?? false; },
    showTempMp() { return this.actor.flags?.['watersnake-grail-war']?.showTempMp ?? false; },
    showGrade() { return this.actor.flags?.['watersnake-grail-war']?.showGrade ?? false; },
    deathSaves() {
      const deathFails = this.actor.system.attributes.saves.deathFails;
      const max = parseInt(deathFails.max) || 4;
      const ret = Array.from(Array(max)).fill(false);
      for (let i = 0; i < Math.min(deathFails.steps.length, max); i++) {
        if (deathFails.steps[i]) {
          ret[i] = true;
        }
      }
      return ret;
    },
  },
  methods: {
    getAvatarDimensions() {
      let img = this.$refs['avatar'];
      let width = img.naturalWidth;
      let height = img.naturalHeight;

      let ratio = width / height;
      let ratioClass = 'square';
      let squareSize = width;

      if (ratio < 0.9) {
        ratioClass = 'portrait';
        squareSize = width;
      }
      else if (ratio > 1.1) {
        // TODO: Figure out a good layout for landscape.
        // ratioClass = 'landscape';
        ratioClass = 'square';
        squareSize = height;
      }

      this.avatarWidth = ratioClass != 'square' ? width : squareSize;
      this.avatarHeight = ratioClass != 'square' ? height : squareSize;
      let classes = ['avatar', `avatar--${ratioClass}`];
      let flags = this.actor.flags && this.actor.flags['watersnake-grail-war'] ? this.actor.flags['watersnake-grail-war'] : {};
      if (flags.portraitRound) classes.push('avatar--round');
      if (flags.portraitFrame) classes.push('avatar--frame');
      this.avatarClass = classes.join(' ');
    },
    checkLoaded() {
      if (this.$refs.avatar.complete) {
        this.getAvatarDimensions();
      }
      else {
        this.$refs.avatar.addEventListener('load', () => {
          this.getAvatarDimensions();
        });
      }
    },
    updateResourceProps() {
      this.disengage = {
        value: 6,
        bonus: this.actor.system.attributes.disengageBonus
      };
    }
  },
  watch: {
    'actor.img': {
      deep: false,
      handler() {
        this.$nextTick(() => {
          this.checkLoaded();
        });
      }
    },
    'actor.flags.watersnake-grail-war': {
      deep: true,
      handler() {
        this.getAvatarDimensions();
      }
    },
    'actor.system.attributes': {
      deep: true,
      handler() {
        this.updateResourceProps();
      }
    }
  },
  async mounted() {
    this.$nextTick(() => {
      this.checkLoaded();
    });
  }
}
</script>
