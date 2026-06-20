import { ActorArchmageSheetV2 } from './actor-sheet-v2.js';

/**
 * 마스터(master) 액터 시트.
 * 현재는 서번트(character) 시트를 그대로 상속해 동일하게 동작.
 * (npc 시트처럼 타입 전용 서브클래스로 등록해야 새 타입에 기본 시트가 잡힘.)
 * 이후 마스터 전용 레이아웃(레벨·예장·령주 등)으로 커스텀 예정.
 */
export class ActorArchmageMasterSheetV2 extends ActorArchmageSheetV2 {}
