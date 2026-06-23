<template>
  <!-- HEADER -->
  <header :class="'header npc-header flexcol' + (headerCollapsed ? ' collapsed' : '')">
    <section class="section section--header-top">
      <!-- Name -->
      <div class="unit unit--hide-label unit--name">
        <label for="name">{{localize("ARCHMAGE.name")}}</label>
        <ToggleInput :closeInputs="closeInputs">
          <template v-slot:display><h1 class="actor-name">{{actor.name}}</h1></template>
          <template v-slot:edit><Input type="text" name="name" class="input-secondary" :actor="actor" reactive="false"/></template>
        </ToggleInput>
      </div>
    </section>
    <section class="section section--header-bottom flexrow">
      <section class="section section--details">
        <!-- Flavor text -->
        <div class="unit unit--hide-label unit--flavor">
          <label for="system.details.flavor.value">{{localize("ARCHMAGE.flavor")}}</label>
          <Suspense>
            <Editor :owner="actor.owner" target='system.details.flavor.value' button="true" editable="true" :title="localize('ARCHMAGE.flavor')" :content="actor.system.details.flavor.value"/>
          </Suspense>
        </div>
        <!-- 이니셔티브 표시(굴림). 보정값 편집은 설정 탭에서만(중복 input 제거 = init null 버그 수정) -->
        <div class="unit unit--roles">
          <a class="rollable rollable--init" data-roll-type="init">{{numberFormat(actor.system.attributes.init.value, 0, true)}} {{localize('ARCHMAGE.initiative')}}</a>
        </div>
      </section>
      <section class="section section--avatar">
        <!-- Actor image -->
        <div class="unit unit--img profile-img">
          <img :src="actor.img" ref="avatar" :alt="localize('ARCHMAGE.avatarAlt')" :width="avatarWidth" :height="avatarHeight" :class="avatarClass" data-edit="img"/>
        </div>
      </section>
    </section>
    <a class="toggle-header" @click="toggleHeader"><i class="fas fa-chevron-up"></i></a>
  </header>
</template>

<script>
  import { localize, numberFormat, getActor } from '@/methods/Helpers';
  import ToggleInput from '@/components/parts/ToggleInput.vue';
  import Input from '@/components/parts/Input.vue';
  import Editor from '@/components/parts/Editor.vue';
  export default {
    name: 'NpcHeader',
    props: ['actor', 'flags', 'closeInputs'],
    components: { ToggleInput, Input, Editor },
    setup() {
      return {
        localize,
        numberFormat,
        CONFIG,
        game
      }
    },
    data() {
      return {
        avatarClass: 'avatar',
        avatarWidth: 110,
        avatarHeight: 110,
        headerCollapsed: this.flags?.sheetDisplay?.header?.collapsed ?? false
      }
    },
    computed: {
      levelFormatted() {
        return game.holygrailwar.ArchmageUtility.formatLevel(this.actor.system.attributes.level.value ?? 0);
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
      toggleHeader(event) {
        // Update the state.
        this.headerCollapsed = !this.headerCollapsed;
        // Set a flag.
        if (!this.actor.pack) {
          getActor(this.actor).then(actor => {
            actor.setFlag('watersnake-grail-war', `sheetDisplay.header.collapsed`, this.headerCollapsed);
          });
        }
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
      }
    },
    async mounted() {
      this.$nextTick(() => {
        this.checkLoaded();
      });
    }
  }
</script>

<style lang="scss">
.archmage-v2.npc-sheet {
  .npc-header {
    position: relative;

    .unit {
      input,
      .rollable--init {
        font-family: $font-stack-base;
        font-size: $font-xs;
        font-weight: normal;
        border-color: transparent;
      }

      input:hover,
      input:focus,
      .edit-wrapper input {
        border-bottom: 2px solid;
      }
    }
  }

  .section--details,
  .section--header-top {
    input {
      text-align: left;
    }
  }

  .section--header-top {
    padding-right: $padding-lg;
  }

  .section--avatar {
    flex: 0 auto;

    #context-menu {
      left: auto;
      right: 0;
    }
  }

  .unit--hide-label {
    label {
      display: none;
    }
  }

  .unit--name {
    margin: $padding-sm 0;

    h1 {
      font-family: $font-stack-secondary;
      font-size: 24px;
      font-weight: bold;
      border: none;
      line-height: 0.8;
    }
  }

  .avatar {
    overflow: hidden;
    object-fit: cover;
    max-width: 100%;
    width: auto;
    height: auto;
    max-width: 110px;
    max-height: 110px;
    border: 0;

    &.avatar--square {
      width: auto;
      height: 110px;
    }

    &.avatar--frame {
      background: $c-white;
      box-shadow: 0 0 10px $ct-border;
      padding: 4px;
    }

    &.avatar--round {
      border-radius: 50%;
    }
  }

  .unit--img {
    flex: 0 auto;
    width: 110px;
    margin-left: $padding-sm;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .unit--roles {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;

    .rollable--init {
      flex: 0 auto;
      margin: 0;
    }

    .edit-wrapper {
      display: flex;
      flex: 1;
      width: 100%;

      ul {
        display: flex;
        justify-content: flex-start;
        align-items: flex-start;
        padding: 0;
        margin: 0;
        flex-wrap: wrap;
      }

      li {
        flex: 0 auto;
        list-style-type: none;
        margin-left: 14px;
        position: relative;

        &::before {
          display: block;
          content: '';
          position: absolute;
          top: -4px;
          bottom: 0;
          left: -9px;
          margin: auto;
          width: 5px;
          height: 5px;
          background: $c-black;
          border-radius: 100%;
        }
      }
    }
  }

  .unit--resistance,
  .unit--vulnerability {
    label {
      font-weight: bold;
      flex: 0 auto;
    }
  }

  .unit--input {
    display: flex;
    flex-direction: row;
  }

  .section--details {
    .editor-wrapper {
      min-height: 0;
    }
    :deep(.editor-content) {
      padding: 0;
      background: transparent;
    }

    .unit--flavor {
      font-style: italic;
      margin: 0 0 $padding-sm 0;
      line-height: 1.3;
    }

    .unit--flavor .editor-content {
      padding: 0 $padding-sm;
      min-height: 2.5em;
    }

    .unit--flavor .editor-content p {
      margin: 0.2em 0;
    }

  }

  .toggle-header {
    transition: all ease-in-out 0.25s;
    display: block;
    position: absolute;
    top: -$padding-sm;
    right: -$padding-md;
    padding: $padding-md;
  }

  .collapsed {
    .unit--flavor {
      display: none;
    }
    .section--header-top {
      padding-right: 85px;
    }
    .unit--img {
      width: 55px;
      margin: 0 $padding-lg 0 $padding-sm;

      .avatar {
        width: auto;
        height: 55px;
        margin-top: -35px;
        margin-right: 0px;
      }
    }
    .toggle-header {
      transform: rotate(180deg);
    }
  }

  & .nightmode {
    .unit--roles {
      .edit-wrapper {
        li {
          &::before {
            background-color: $c-white;
          }
        }
      }
    }
  }
}
</style>
