import { ActorArchmageSheetV2 } from './actor-sheet-v2.js';

/**
 * npc(일반인·마술사) 시트.
 * 캐릭터/마스터 시트 UI를 그대로 사용하되(npc=마스터 취급), 창 크기만 작게 한다.
 * vueComponents/template/_createItem 등은 모두 베이스(ActorArchmageSheetV2)를 상속.
 */
export class ActorArchmageNpcSheetV2 extends ActorArchmageSheetV2 {
  /** @override */
  static get defaultOptions() {
    const options = super.defaultOptions;
    const compactMode = game.settings.get('watersnake-grail-war', 'compactMode');
    foundry.utils.mergeObject(options, {
      classes: options.classes.concat(['npc-sheet']),
      width: compactMode ? 550 : 640,
      height: compactMode ? 688 : 800,
    });
    return options;
  }
}
