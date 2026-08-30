export const ARCHMAGE = {};
export const FLAGS = {};

ARCHMAGE.statusEffects = [
  { id: "dead", name: "ARCHMAGE.EFFECT.StatusDead", icon: "icons/svg/skull.svg" },
  // 능력치 수치를 E(3)으로 취급: value OVERRIDE(=mode 5) 3. 'pre' 단계 적용이라 수정치·HP·방어까지 반영.
  { id: "weak_str", name: "빈약", icon: "icons/svg/downgrade.svg", description: "대상의 근력 수치를 E(3)으로 취급한다.", changes: [{ key: "system.abilities.str.value", mode: 5, value: "3" }] },
  { id: "weak_end", name: "허약", icon: "icons/svg/downgrade.svg", description: "대상의 내구 수치를 E(3)으로 취급한다.", changes: [{ key: "system.abilities.end.value", mode: 5, value: "3" }] },
  { id: "weak_agi", name: "둔화", icon: "icons/svg/downgrade.svg", description: "대상의 민첩 수치를 E(3)으로 취급한다.", changes: [{ key: "system.abilities.agi.value", mode: 5, value: "3" }] },
  { id: "weak_mgi", name: "단선", icon: "icons/svg/downgrade.svg", description: "대상의 마력 수치를 E(3)으로 취급한다.", changes: [{ key: "system.abilities.mgi.value", mode: 5, value: "3" }] },
  { id: "weak_lck", name: "저조", icon: "icons/svg/downgrade.svg", description: "대상의 행운 수치를 E(3)으로 취급한다.", changes: [{ key: "system.abilities.lck.value", mode: 5, value: "3" }] },
  { id: "weak_ins", name: "백치", icon: "icons/svg/downgrade.svg", description: "대상의 통찰 수치를 E(3)으로 취급한다.", changes: [{ key: "system.abilities.ins.value", mode: 5, value: "3" }] },
  { id: "charm", name: "매혹", icon: "icons/svg/heal.svg", description: "정신 방어 대상. 성공 시 즉각 자유 행동으로 저항 무시 마력 공격. 매혹 시전자 대상 공격에 -4." },
  { id: "incite", name: "선동", icon: "icons/svg/sound.svg", description: "정신 방어 대상. 선동가의 제안에 따른 한 가지 행동을 금지당한다." },
  { id: "grit", name: "근성", icon: "icons/svg/regen.svg", description: "HP -(최대 체력)까지 전투 가능. 피격 시 데미지 기회공격 취급. 매 턴 해주 판정 강제. 진명개방 피격 시 해주." },
  { id: "snipe", name: "저격", icon: "icons/svg/target.svg", description: "이동 불가. 피격 시 데미지 기회공격 취급. 사격 시 씬 제한·사거리 초과 역보정 무시(거리=은신값 취급)." },
  { id: "down", name: "다운", icon: "icons/svg/falling.svg", description: "기승·쌍수 불가, 다리 사용 불가. 신체 방어 한정 수정치를 E(3) 취급." },
  // 모든 배경을 0점 취급: bg1~bg10 bonus.value를 각각 OVERRIDE 0.
  { id: "powerless", name: "무력", icon: "icons/svg/downgrade.svg", description: "자신의 모든 배경을 0점 취급한다.", changes: [
    { key: "system.backgrounds.bg1.bonus.value", mode: 5, value: "0" },
    { key: "system.backgrounds.bg2.bonus.value", mode: 5, value: "0" },
    { key: "system.backgrounds.bg3.bonus.value", mode: 5, value: "0" },
    { key: "system.backgrounds.bg4.bonus.value", mode: 5, value: "0" },
    { key: "system.backgrounds.bg5.bonus.value", mode: 5, value: "0" },
    { key: "system.backgrounds.bg6.bonus.value", mode: 5, value: "0" },
    { key: "system.backgrounds.bg7.bonus.value", mode: 5, value: "0" },
    { key: "system.backgrounds.bg8.bonus.value", mode: 5, value: "0" },
    { key: "system.backgrounds.bg9.bonus.value", mode: 5, value: "0" },
    { key: "system.backgrounds.bg10.bonus.value", mode: 5, value: "0" }
  ] },
  { id: "enfeeble", name: "쇠약", icon: "icons/svg/degen.svg", description: "매혹 및 연관 판정 시 보정치를 받을 수 없다. 두 개 이상의 행동을 요구하는 기능을 사용할 수 없다." },
  { id: "silence", name: "침묵", icon: "icons/svg/sound.svg", description: "영창·진명개방을 포함한 어떠한 대사도 할 수 없다." },
  { id: "bind", name: "구속", icon: "icons/svg/net.svg", description: "이동 불가. 접전/물러서기/가로막기/물리적 행동 불리함." },
  { id: "confuse", name: "혼란", icon: "icons/svg/stoned.svg", description: "일반 행동을 무조건 해당 상태이상 해주에 소비해야 한다." },
  { id: "stigmata", name: "성흔", icon: "icons/svg/blood.svg", description: "회복을 시전하거나 회복의 대상이 될 시 결과값을 한 단계 저하시킨다. 중첩 가능." },
  { id: "burn", name: "화상", icon: "icons/svg/fire.svg", description: "불꽃 속성. 매 턴 신체방어·SP 포함 화염 특방 제외 모든 삭감을 무시하는 2+(지속 턴) 데미지." },
  { id: "weather", name: "풍화", icon: "icons/svg/hazard.svg", description: "바람 속성. 기능 중 하나를 사용 불가로 한다. 무장 선택 시 조잡한 무기 취급." },
  { id: "bury", name: "매장", icon: "icons/svg/trap.svg", description: "흙 속성. 턴 개시와 동시에 짧은 행동 소비. 행동 전환으로 인한 짧은 행동도 사용 불가." },
  { id: "erosion", name: "조례", icon: "icons/svg/hazard.svg", description: "자신이 데미지를 입을 때마다 2의 추가 데미지." },
  { id: "frostbite", name: "동상", icon: "icons/svg/frozen.svg", description: "얼음 속성. 피격 시 얼음 속성 공격 대성공 범위 +1, 행동 시 얼음 관련 대실패 범위 +1. 중첩 가능." },
  { id: "bleed", name: "출혈", icon: "icons/svg/blood.svg", description: "속성 없음. 매 턴 신체방어·SP를 무시하는 2 데미지. 중첩 시 중첩 횟수만큼 +1." },
  { id: "poison", name: "중독", icon: "icons/svg/poison.svg", description: "맹독 속성. 매 턴 신체방어·SP를 무시하는 2 데미지. 해주 난이도 11+(지속 턴)." },
  { id: "shock", name: "감전", icon: "icons/svg/lightning.svg", description: "번개 속성. 행동을 시도할 때마다 신체방어·SP를 무시하는 1 데미지." },
  { id: "blind", name: "실명", icon: "icons/svg/blind.svg", description: "시력 관련 기능 사용 불가. 공격 시 50% 확정 빗나감, 피격 시 50% 확정 명중." },
  { id: "frenzy", name: "광분", icon: "icons/svg/terror.svg", description: "전력 공격밖에 할 수 없다. 아군을 제외하고 공격 가능한 대상이 있다면 반드시 공격해야 한다." },
  { id: "fear", name: "공포", icon: "icons/svg/terror.svg", description: "이탈 행동밖에 할 수 없다. 아군을 제외하고 자신을 공격할 수 있는 대상이 있다면 반드시 도주하려 해야 한다." },
  { id: "stench", name: "악취", icon: "icons/svg/hazard.svg", description: "은신할 수 없다. 아군을 제외하고 실명/광분이 부여된 이에게 최우선 공격 대상이 된다." },
  { id: "petrify", name: "석화", icon: "icons/svg/stoned.svg", description: "물리적 행동 불리함. 판정 없을 시 시도 불가. 위험돌파 시 -4 취급." },
  { id: "subdue", name: "조복", icon: "icons/svg/aura.svg", description: "마술적 행동 불리함. 대상이 부여한, 혹은 대상에게 부여된 모든 마술적 가호를 파기한다." },
  { id: "mark", name: "표적", icon: "icons/svg/target.svg", description: "대상에 대한 공격의 대성공 범위를 2 확장한다. 대상 이탈 시 이탈한 위치를 즉각 포착한다." },
  { id: "loss", name: "결손", icon: "icons/svg/bones.svg", description: "특정 신체 부위에 개별로 적용. 해당 부위 판정에 -4, 해당 부위 행동 시도 불가." },
  { id: "wander", name: "방황", icon: "icons/svg/daze.svg", description: "이동 시 랜덤한 방향으로 이동한다." },
  { id: "imbalance", name: "불균형", icon: "icons/svg/hazard.svg", description: "전력/교란 공격 선언 시 그 패널티를 대상의 다음 (불균형 미적용) 공격으로 옮긴다." },
  { id: "disarm", name: "무장해제", icon: "icons/svg/padlock.svg", description: "각 무장마다 개별로 적용. 해당 무장을 사용할 수 없다." },
];
// Extended (optional) status effects
ARCHMAGE.extendedStatusEffects = [
  // Empowered.
  {
    id: "empowered",
    name: "ARCHMAGE.EFFECT.StatusEmpowered",
    icon: "icons/svg/upgrade.svg",
    flags: {
      archmage: {
        duration: "Unknown",
      }
    }
  },
  // Ongoing Damage.
  {
    id: "ongoingDamage",
    name: "ARCHMAGE.EFFECT.StatusOngoingDamage",
    icon: "icons/svg/degen.svg",
    flags: {
      archmage: {
        duration: "Unknown",
      }
    }
  },
  // Regen.
  {
    id: "regen",
    name: "ARCHMAGE.EFFECT.StatusRegen",
    icon: "icons/svg/regen.svg",
    flags: {
      archmage: {
        duration: "Unknown",
      }
    }
  },
  // Bonus defenses.
  {
    id: "bonusDefenses",
    name: "ARCHMAGE.EFFECT.StatusBonusDefenses",
    icon: "icons/svg/shield.svg",
    flags: {
      archmage: {
        duration: "Unknown",
      }
    }
  },
  // Reduced defenses.
  {
    id: "reducedDefenses",
    name: "ARCHMAGE.EFFECT.StatusReducedDefenses",
    icon: "icons/svg/acid.svg", //ruins
    flags: {
      archmage: {
        duration: "Unknown",
      }
    }
  },
  // Blessed.
  {
    id: "blessed",
    name: "ARCHMAGE.EFFECT.StatusBlessed",
    icon: "icons/svg/angel.svg",
    flags: {
      archmage: {
        duration: "Unknown",
      }
    }
  },
  // Cursed.
  {
    id: "cursed",
    name: "ARCHMAGE.EFFECT.StatusCursed",
    icon: "icons/svg/dice-target.svg",
    flags: {
      archmage: {
        duration: "Unknown",
      }
    }
  },
  // Flying.
  {
    id: "flying",
    name: "ARCHMAGE.EFFECT.StatusFlying",
    icon: "icons/svg/wing.svg",
    flags: {
      archmage: {
        duration: "Unknown",
      }
    }
  },
  // Hidden.
  {
    id: "invisible", //hidden - renamed to play nice with v11 statuses
    name: "ARCHMAGE.EFFECT.StatusHidden",
    icon: "icons/svg/mystery-man.svg",
    flags: {
      archmage: {
        duration: "Unknown",
      }
    }
  },
  // Last Gasps.
  {
    id: "lastgasps",
    name: "ARCHMAGE.EFFECT.StatusLastGasps",
    icon: "icons/svg/clockwork.svg",
    flags: {
      archmage: {
        duration: "Unknown",
      }
    }
  },
  // Asleep.
  {
    id: "sleep", //asleep - renamed to play nice with v11 statuses
    name: "ARCHMAGE.EFFECT.StatusAsleep",
    icon: "icons/svg/sleep.svg",
  },
  // Blind.
  {
    id: "blind",
    name: "ARCHMAGE.EFFECT.StatusBlind",
    icon: "icons/svg/blind.svg",
  },
  // Silenced.
  {
    id: "silenced",
    name: "ARCHMAGE.EFFECT.StatusSilenced",
    icon: "icons/svg/silenced.svg",
  },
  // Holy Shield.
  {
    id: "holyshield",
    name: "ARCHMAGE.EFFECT.StatusHolyShield",
    icon: "icons/svg/holy-shield.svg"
  },
  // Fire Shield.
  {
    id: "fireshield",
    name: "ARCHMAGE.EFFECT.StatusFireShield",
    icon: "icons/svg/fire-shield.svg"
  },
  // Ice Shield.
  {
    id: "iceshield",
    name: "ARCHMAGE.EFFECT.StatusIceShield",
    icon: "icons/svg/ice-shield.svg"
  },
  // Mage Shield.
  {
    id: "mageshield",
    name: "ARCHMAGE.EFFECT.StatusMageShield",
    icon: "icons/svg/mage-shield.svg"
  },
  // Buffed.
  // {
    // id: "buffed",
    // name: "ARCHMAGE.EFFECT.StatusBuffed",
    // icon: "icons/svg/up.svg"
  // },
  // Debuffed.
  // {
    // id: "debuffed",
    // name: "ARCHMAGE.EFFECT.StatusDebuffed",
    // icon: "icons/svg/direction.svg"
  // },
];

ARCHMAGE.numDicePerLevel = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Goes to 15th to support monsters
ARCHMAGE.tierMultPerLevel = [0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 4, 4];

// Animal companion data
ARCHMAGE.animalCompanion = {
  attack: [5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19, 20],
  damage: ["2d8", "3d8", "4d6", " 4d8", "4d10", "6d10", "40", "50", "66", "80", "100", "130", "160"]
};

ARCHMAGE.effectDurationTypes = {
  'Unknown': 'ARCHMAGE.DURATION.Unknown',
  'Infinite': 'ARCHMAGE.DURATION.Infinite',
  'StartOfNextTurn': "ARCHMAGE.DURATION.StartOfNextTurn",
  'EndOfNextTurn': "ARCHMAGE.DURATION.EndOfNextTurn",
  'StartOfNextSourceTurn': 'ARCHMAGE.DURATION.StartOfNextSourceTurn',
  'EndOfNextSourceTurn': 'ARCHMAGE.DURATION.EndOfNextSourceTurn',
  'EasySaveEnds': 'ARCHMAGE.DURATION.EasySaveEnds',
  'NormalSaveEnds': 'ARCHMAGE.DURATION.NormalSaveEnds',
  'HardSaveEnds': 'ARCHMAGE.DURATION.HardSaveEnds',
  'EndOfCombat': 'ARCHMAGE.DURATION.EndOfCombat',
  'EndOfArc': 'ARCHMAGE.DURATION.EndOfArc',
  'EndOfRound': "ARCHMAGE.DURATION.EndOfRound",
  'StartOfEachTurn': 'ARCHMAGE.DURATION.StartOfEachTurn'
};

ARCHMAGE.defaultTokens = {
  'character': 'icons/svg/mystery-man.svg',
  'npc': 'icons/svg/eye.svg',
  'item': 'icons/svg/item-bag.svg',
  'feature': 'icons/svg/book.svg',
  'trait': 'icons/svg/regen.svg',
  'action': 'icons/svg/target.svg',
  'nastierSpecial': 'icons/svg/poison.svg',
  'tool': 'icons/svg/anchor.svg',
  'loot': 'icons/svg/daze.svg'
};

// Explicit multipliers from 13TW
ARCHMAGE.npcLevelupMultipliers = {
  '1': 1.25,
  '2': 1.6,
  '3': 2.0,
  '4': 2.5,
  '5': 3.2,
  '6': 4.0,
  '-1': 1/1.25,
  '-2': 1/1.6,
  '-3': 1/2.0,
  '-4': 1/2.5,
  '-5': 1/3.2,
  '-6': 1/4.0,
};

// Colors used to display HP in token health bars
ARCHMAGE.tokenHPColors = {
  damage: 0xFF0000,
  healing: 0x00FF00,
  temp: 0x66CCFF,
  tempmax: 0x440066,
  negmax: 0x550000
};

ARCHMAGE.REGEXP = {
  ONGOING_DAMAGE: /(<a (?:(?!<a ).)*?><i class="fas fa-dice-d20"><\/i>)*(-?\d+)(<\/a>)* ongoing ([a-zA-Z]*) ?damage(?:\s*\((\w*) ?save ends(?:, \d*\+)?\))?/ig,
  CONDITIONS: new Map(), // Actually populated in ready hook, after localization has been loaded
}

ARCHMAGE.baselineMonsterStats = {
  // arrays indexed by level, 0 to 14
  attackBonuses: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
  ac: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  pd: [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28],
  md: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  init: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],

  byStrength: {
    normal: {
      damage: [4, 5, 7, 10, 14, 18, 21, 28, 38, 50, 58, 70, 90, 110, 135],
      hp: [20, 27, 36, 45, 54, 72, 90, 108, 144, 180, 216, 288, 360, 432, 576]
    },
    mook: {
      damage: [3, 4, 5, 6, 7, 9, 12, 18, 23, 31, 37, 46, 60, 74, 90],
      hp: [5, 7, 9, 11, 14, 18, 23, 27, 36, 45, 54, 72, 90, 108, 144]
    },
    weakling: {
      damage: [2, 3, 4, 5, 7, 9, 11, 14, 19, 25, 29, 35, 45, 55, 68],
      hp: [10, 14, 18, 22, 27, 36, 45, 54, 72, 90, 108, 144, 180, 216, 288]
    },
    elite: {
      damage: [6, 8, 11, 15, 21, 27, 32, 42, 57, 75, 87, 105, 135, 175, 203],
      hp: [30, 41, 54, 68, 81, 108, 135, 162, 216, 270, 324, 432, 540, 648, 864]
    },
    double: {
      damage: [9, 10, 14, 21, 28, 36, 42, 56, 76, 100, 116, 140, 180, 220, 270],
      hp: [41, 54, 72, 90, 108, 144, 180, 216, 288, 360, 432, 576, 720, 864, 1152]
    },
    triple: {
      damage: [12, 15, 21, 30, 42, 54, 63, 84, 114, 150, 174, 210, 270, 330, 405],
      hp: [60, 81, 108, 135, 162, 216, 270, 324, 432, 540, 648, 864, 1080, 1296, 1728]
    }
  }
}

FLAGS.characterFlags = {
  "portraitRound": {
    name: "ARCHMAGE.CHARACTERFLAGS.portraitRoundName",
    hint: "ARCHMAGE.CHARACTERFLAGS.portraitRoundHint",
    section: "Sheet",
    type: Boolean
  },
  "portraitFrame": {
    name: "ARCHMAGE.CHARACTERFLAGS.portraitFrameName",
    hint: "ARCHMAGE.CHARACTERFLAGS.portraitFrameHint",
    section: "Sheet",
    type: Boolean
  },
  "hideCurrency": {
    name: "ARCHMAGE.CHARACTERFLAGS.hideCurrencyName",
    hint: "ARCHMAGE.CHARACTERFLAGS.hideCurrencyHint",
    section: "Sheet",
    type: Boolean
  },
  "showTriggersTab": {
    name: "ARCHMAGE.CHARACTERFLAGS.showTriggersTabName",
    hint: "ARCHMAGE.CHARACTERFLAGS.showTriggersTabHint",
    section: "Sheet",
    type: Boolean
  },
  "hideSettingsTab": {
    name: "ARCHMAGE.CHARACTERFLAGS.hideSettingsTabName",
    hint: "ARCHMAGE.CHARACTERFLAGS.hideSettingsTabHint",
    section: "Sheet",
    type: Boolean
  },
  "diceFormulaMode": {
    name: "ARCHMAGE.CHARACTERFLAGS.diceFormulaModeName",
    hint: "ARCHMAGE.CHARACTERFLAGS.diceFormulaModeHint",
    section: "Sheet",
    type: String,
    options: {
      'short': 'ARCHMAGE.CHARACTERFLAGS.diceFormulaModeOptshort',
      'long': 'ARCHMAGE.CHARACTERFLAGS.diceFormulaModeOptlong',
      'numeric': 'ARCHMAGE.CHARACTERFLAGS.diceFormulaModeOptnumeric'
    }
  }
};

FLAGS.npcFlags = {
  "portraitRound": {
    name: "ARCHMAGE.CHARACTERFLAGS.portraitRoundName",
    hint: "ARCHMAGE.CHARACTERFLAGS.portraitRoundHint",
    section: "Sheet",
    type: Boolean
  },
  "portraitFrame": {
    name: "ARCHMAGE.CHARACTERFLAGS.portraitFrameName",
    hint: "ARCHMAGE.CHARACTERFLAGS.portraitFrameHint",
    section: "Sheet",
    type: Boolean
  }
};
