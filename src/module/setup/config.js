export const ARCHMAGE = {};
export const FLAGS = {};

ARCHMAGE.statusEffects = [
  { id: "dead", name: "ARCHMAGE.EFFECT.StatusDead", icon: "icons/svg/skull.svg" },
  { id: "weak_str", name: "빈약", icon: "icons/svg/downgrade.svg", description: "대상의 근력 수치를 E(3)으로 취급한다." },
  { id: "weak_end", name: "허약", icon: "icons/svg/downgrade.svg", description: "대상의 내구 수치를 E(3)으로 취급한다." },
  { id: "weak_agi", name: "둔화", icon: "icons/svg/downgrade.svg", description: "대상의 민첩 수치를 E(3)으로 취급한다." },
  { id: "weak_mgi", name: "단선", icon: "icons/svg/downgrade.svg", description: "대상의 마력 수치를 E(3)으로 취급한다." },
  { id: "weak_lck", name: "저조", icon: "icons/svg/downgrade.svg", description: "대상의 행운 수치를 E(3)으로 취급한다." },
  { id: "weak_ins", name: "백치", icon: "icons/svg/downgrade.svg", description: "대상의 통찰 수치를 E(3)으로 취급한다." },
  { id: "charm", name: "매혹", icon: "icons/svg/heal.svg", description: "정신 방어 대상. 성공 시 즉각 자유 행동으로 저항 무시 마력 공격. 매혹 시전자 대상 공격에 -4." },
  { id: "incite", name: "선동", icon: "icons/svg/sound.svg", description: "정신 방어 대상. 선동가의 제안에 따른 한 가지 행동을 금지당한다." },
  { id: "grit", name: "근성", icon: "icons/svg/regen.svg", description: "HP -(최대 체력)까지 전투 가능. 피격 시 데미지 기회공격 취급. 매 턴 해주 판정 강제. 진명개방 피격 시 해주." },
  { id: "snipe", name: "저격", icon: "icons/svg/target.svg", description: "이동 불가. 피격 시 데미지 기회공격 취급. 사격 시 씬 제한·사거리 초과 역보정 무시(거리=은신값 취급)." },
  { id: "down", name: "다운", icon: "icons/svg/falling.svg", description: "기승·쌍수 불가, 다리 사용 불가. 신체 방어 한정 수정치를 E(3) 취급." },
  { id: "powerless", name: "무력", icon: "icons/svg/downgrade.svg", description: "자신의 모든 배경을 0점 취급한다." },
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

ARCHMAGE.featTiers = {
  'adventurer': 'ARCHMAGE.adventurer',
  'champion': 'ARCHMAGE.champion',
  'epic': 'ARCHMAGE.epic',
  'iconic': 'ARCHMAGE.iconic'
}

ARCHMAGE.numDicePerLevel = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
// ARCHMAGE.numDicePerLevel2e = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20];
// TODO: keep this handy for now until we know where the rules settle
ARCHMAGE.numDicePerLevel2e = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

// Goes to 15th to support monsters
ARCHMAGE.tierMultPerLevel = [0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 4, 4];
ARCHMAGE.tierMultPerLevel2e = [0, 1, 1, 1, 1, 2, 2, 2, 4, 4, 4, 8, 8, 8, 8, 8];

// Animal companion data
ARCHMAGE.animalCompanion = {
  attack: [5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19, 20],
  damage: ["2d8", "3d8", "4d6", " 4d8", "4d10", "6d10", "40", "50", "66", "80", "100", "130", "160"]
};

// Power Settings
ARCHMAGE.powerSources = {
  'class': 'ARCHMAGE.class',
  'race': 'ARCHMAGE.race',
  'item': 'ARCHMAGE.item',
  'other': 'ARCHMAGE.other'
};

ARCHMAGE.powerTypes = {
  'power': 'ARCHMAGE.power',
  'feature': 'ARCHMAGE.feature',
  'talent': 'ARCHMAGE.talent',
  'flexible': 'ARCHMAGE.flexible',
  'spell': 'ARCHMAGE.spell',
  'other': 'ARCHMAGE.other'
};

ARCHMAGE.powerUsages = {
  'at-will': 'ARCHMAGE.at-will',
  'once-per-battle': 'ARCHMAGE.once-per-battle',
  'recharge': 'ARCHMAGE.recharge',
  'daily': 'ARCHMAGE.daily',
  'cyclic': 'ARCHMAGE.cyclic',
  'recharge-desperate': 'ARCHMAGE.recharge-desperate',
  'daily-desperate': 'ARCHMAGE.daily-desperate',
  'other': 'ARCHMAGE.other'
};

ARCHMAGE.equipUsages = {
  'once-per-battle': 'ARCHMAGE.once-per-battle',
  'recharge': 'ARCHMAGE.recharge',
  'daily': 'ARCHMAGE.daily',
  'recharge-desperate': 'ARCHMAGE.recharge-desperate',
  'daily-desperate': 'ARCHMAGE.daily-desperate',
  'other': 'ARCHMAGE.other'
};

ARCHMAGE.featUsages = {
  'daily': 'ARCHMAGE.daily',
  'once-per-battle': 'ARCHMAGE.once-per-battle',
  'other': 'ARCHMAGE.other'
};

ARCHMAGE.actionTypes = {
  'standard': 'ARCHMAGE.standard-short',
  'move': 'ARCHMAGE.move-short',
  'quick': 'ARCHMAGE.quick-short',
  'free': 'ARCHMAGE.free-short',
  'interrupt': 'ARCHMAGE.interrupt-short'
};

ARCHMAGE.actionTypesShort = {
  'standard': 'ARCHMAGE.STD',
  'move': 'ARCHMAGE.MOV',
  'quick': 'ARCHMAGE.QCK',
  'free': 'ARCHMAGE.FREE',
  'interrupt': 'ARCHMAGE.INT'
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

ARCHMAGE.creatureTypes = {
  'aberration': 'ARCHMAGE.CREATURETYPES.aberration',
  'beast': 'ARCHMAGE.CREATURETYPES.beast',
  'celestial': 'ARCHMAGE.CREATURETYPES.celestial',
  'construct': 'ARCHMAGE.CREATURETYPES.construct',
  'demon': 'ARCHMAGE.CREATURETYPES.demon',
  'devil': 'ARCHMAGE.CREATURETYPES.devil',
  'dragon': 'ARCHMAGE.CREATURETYPES.dragon',
  'elemental': 'ARCHMAGE.CREATURETYPES.elemental',
  'fey': 'ARCHMAGE.CREATURETYPES.fey',
  'giant': 'ARCHMAGE.CREATURETYPES.giant',
  'humanoid': 'ARCHMAGE.CREATURETYPES.humanoid',
  'monstrosity': 'ARCHMAGE.CREATURETYPES.monstrosity',
  'ooze': 'ARCHMAGE.CREATURETYPES.ooze',
  'plant': 'ARCHMAGE.CREATURETYPES.plant',
  'spirit': 'ARCHMAGE.CREATURETYPES.spirit',
  'undead': 'ARCHMAGE.CREATURETYPES.undead'
};

ARCHMAGE.creatureSizes = {
  'normal': 'ARCHMAGE.CREATURESIZES.normal',
  'large': 'ARCHMAGE.CREATURESIZES.large',
  'huge': 'ARCHMAGE.CREATURESIZES.huge',
  'gargantuan': 'ARCHMAGE.CREATURESIZES.gargantuan',
  'small': 'ARCHMAGE.CREATURESIZES.small',
  'tiny': 'ARCHMAGE.CREATURESIZES.tiny',
};

ARCHMAGE.creatureStrengths = {
  'normal': 'ARCHMAGE.CREATURESTRENGTHS.normal',
  'double': 'ARCHMAGE.CREATURESTRENGTHS.double-strength',
  'triple': 'ARCHMAGE.CREATURESTRENGTHS.triple-strength',
  'weakling': 'ARCHMAGE.CREATURESTRENGTHS.weakling',
  'elite': 'ARCHMAGE.CREATURESTRENGTHS.elite',
};

ARCHMAGE.creatureRoles = {
  'archer': 'ARCHMAGE.CREATUREROLES.archer',
  'blocker': 'ARCHMAGE.CREATUREROLES.blocker',
  'caster': 'ARCHMAGE.CREATUREROLES.caster',
  'leader': 'ARCHMAGE.CREATUREROLES.leader',
  'mook': 'ARCHMAGE.CREATUREROLES.mook',
  'spoiler': 'ARCHMAGE.CREATUREROLES.spoiler',
  'troop': 'ARCHMAGE.CREATUREROLES.troop',
  'wrecker': 'ARCHMAGE.CREATUREROLES.wrecker'
};

ARCHMAGE.chakraSlots = {
  'armor': 'ARCHMAGE.CHAKRA.armor',
  'arrow': 'ARCHMAGE.CHAKRA.arrow',
  'belt': 'ARCHMAGE.CHAKRA.belt',
  'book': 'ARCHMAGE.CHAKRA.book',
  'boots': 'ARCHMAGE.CHAKRA.boots',
  'cloak': 'ARCHMAGE.CHAKRA.cloak',
  'glove': 'ARCHMAGE.CHAKRA.glove',
  'helmet': 'ARCHMAGE.CHAKRA.helmet',
  'necklace': 'ARCHMAGE.CHAKRA.necklace',
  'ring': 'ARCHMAGE.CHAKRA.ring',
  'shield': 'ARCHMAGE.CHAKRA.shield',
  'staff': 'ARCHMAGE.CHAKRA.staff',
  'symbol': 'ARCHMAGE.CHAKRA.symbol',
  'wand': 'ARCHMAGE.CHAKRA.wand',
  'melee': 'ARCHMAGE.CHAKRA.melee',
  'ranged': 'ARCHMAGE.CHAKRA.ranged',
  'wondrous': 'ARCHMAGE.CHAKRA.wondrous',
};

ARCHMAGE.defaultTokens = {
  'character': 'icons/svg/mystery-man.svg',
  'npc': 'icons/svg/eye.svg',
  'item': 'systems/watersnake-grail-war/assets/icons/items/backpack.jpg',
  'power': 'systems/watersnake-grail-war/assets/icons/skills/weapon_27.jpg',
  'trait': 'icons/svg/regen.svg',
  'action': 'icons/svg/target.svg',
  'nastierSpecial': 'icons/svg/poison.svg',
  'tool': 'icons/svg/anchor.svg',
  'loot': 'icons/svg/daze.svg',
  'equipment': 'systems/watersnake-grail-war/assets/icons/items/inventory/backpack.jpg'
};

ARCHMAGE.defaultMonsterTokens = {
  'default': 'icons/svg/mystery-man.svg',
  'default-toolkit': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/token-neutral.webp',
  'aberration': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/aberration.webp',
  'beast': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/beast.webp',
  'construct': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/construct.webp',
  'demon': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/demon.webp',
  'devil': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/devil.webp',
  'dragon': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/dragon.webp',
  'dragon-black': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/dragon-black.webp',
  'dragon-blue': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/dragon-blue.webp',
  'dragon-brass': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/dragon-brass.webp',
  'dragon-bronze': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/dragon-bronze.webp',
  'dragon-copper': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/dragon-copper.webp',
  'dragon-gold': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/dragon-gold.webp',
  'dragon-green': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/dragon-green.webp',
  'dragon-red': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/dragon-red.webp',
  'dragon-silver': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/dragon-silver.webp',
  'dragon-white': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/dragon-white.webp',
  'elemental': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/elemental.webp',
  'elemental-air': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/elemental-air.webp',
  'elemental-earth': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/elemental-earth.webp',
  'elemental-fire': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/elemental-fire.webp',
  'elemental-water': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/elemental-water.webp',
  'giant': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/giant.webp',
  'humanoid': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/humanoid.webp',
  'ooze': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/ooze.webp',
  'plant': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/plant.webp',
  'spirit': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/spirit.webp',
  'undead': 'systems/watersnake-grail-war/assets/icons/tokens/monsters/undead.webp',
};

ARCHMAGE.raceList = {
  'aasimar': "ARCHMAGE.RACES.aasimar",
  'darkelf': "ARCHMAGE.RACES.darkelf",
  'demontouched': "ARCHMAGE.RACES.demontouched",
  'dragonic': "ARCHMAGE.RACES.dragonic",
  'dragonspawn': "ARCHMAGE.RACES.dragonspawn",
  'drow': "ARCHMAGE.RACES.drow",
  'dwarf': "ARCHMAGE.RACES.dwarf",
  'dwarfforged': "ARCHMAGE.RACES.dwarfforged",
  'forgeborn': "ARCHMAGE.RACES.forgeborn",
  'gnome': "ARCHMAGE.RACES.gnome",
  'halfelf': "ARCHMAGE.RACES.halfelf",
  'halfling': "ARCHMAGE.RACES.halfling",
  'halforc': "ARCHMAGE.RACES.halforc",
  'highelf': "ARCHMAGE.RACES.highelf",
  'holyone': "ARCHMAGE.RACES.holyone",
  'human': "ARCHMAGE.RACES.human",
  'tiefling': "ARCHMAGE.RACES.tiefling",
  'trollkin': "ARCHMAGE.RACES.trollkin",
  'silverelf': "ARCHMAGE.RACES.silverelf",
  'woodelf': "ARCHMAGE.RACES.woodelf"
};

ARCHMAGE.classPacks = [
  'classes',
  'classes-kin-2e'
];

ARCHMAGE.classList = {
  'barbarian': 'ARCHMAGE.CLASSES.barbarian',
  'bard': 'ARCHMAGE.CLASSES.bard',
  'cleric': 'ARCHMAGE.CLASSES.cleric',
  'fighter': 'ARCHMAGE.CLASSES.fighter',
  'paladin': 'ARCHMAGE.CLASSES.paladin',
  'ranger': 'ARCHMAGE.CLASSES.ranger',
  'rogue': 'ARCHMAGE.CLASSES.rogue',
  'sorcerer': 'ARCHMAGE.CLASSES.sorcerer',
  'wizard': 'ARCHMAGE.CLASSES.wizard',
  'chaosmage': 'ARCHMAGE.CLASSES.chaosmage',
  'commander': 'ARCHMAGE.CLASSES.commander',
  'druid': 'ARCHMAGE.CLASSES.druid',
  'monk': 'ARCHMAGE.CLASSES.monk',
  'necromancer': 'ARCHMAGE.CLASSES.necromancer',
  'occultist': 'ARCHMAGE.CLASSES.occultist'
};

ARCHMAGE.classes = {
  barbarian: {
    hp: 7,
    ac_lgt: 12,
    ac_hvy: 13,
    ac_hvy_pen: -2,
    shld_pen: 0,
    pd: 11,
    md: 10,
    rec_die: 10,
    wpn_1h: 8,
    wpn_2h: 10,
    wpn_2h_pen: 0,
    wpn_rngd: 8,
    skilled_warrior: true
  },
  bard: {
    hp: 7,
    ac_lgt: 12,
    ac_hvy: 13,
    ac_hvy_pen: -2,
    shld_pen: -1,
    pd: 10,
    md: 11,
    rec_die: 8,
    wpn_1h: 8,
    wpn_2h: 8,
    wpn_2h_pen: 0,
    wpn_rngd: 6,
    skilled_warrior: true
  },
  chaosmage: {
    hp: 6,
    ac_lgt: 10,
    ac_hvy: 11,
    ac_hvy_pen: -2,
    shld_pen: -2,
    pd: 10,
    md: 11,
    rec_die: 6,
    wpn_1h: 4,
    wpn_2h: 6,
    wpn_2h_pen: 0,
    wpn_rngd: 4,
    skilled_warrior: false
  },
  cleric: {
    hp: 7,
    ac_lgt: 12,
    ac_hvy: 14,
    ac_hvy_pen: 0,
    shld_pen: 0,
    pd: 11,
    md: 11,
    rec_die: 8,
    wpn_1h: 6,
    wpn_2h: 8,
    wpn_2h_pen: 0,
    wpn_rngd: 6,
    skilled_warrior: false
  },
  commander: {
    hp: 7,
    ac_lgt: 12,
    ac_hvy: 14,
    ac_hvy_pen: -2,
    shld_pen: 0,
    pd: 10,
    md: 12,
    rec_die: 8,
    wpn_1h: 6,
    wpn_2h: 8,
    wpn_2h_pen: 0,
    wpn_rngd: 6,
    skilled_warrior: true
  },
  druid: {
    hp: 6,
    ac_lgt: 10,
    ac_hvy: 14,
    ac_hvy_pen: -2,
    shld_pen: -2,
    pd: 11,
    md: 11,
    rec_die: 6,
    wpn_1h: 6,
    wpn_2h: 8,
    wpn_2h_pen: 0,
    wpn_rngd: 6,
    skilled_warrior: false
  },
  fighter: {
    hp: 8,
    ac_lgt: 13,
    ac_hvy: 15,
    ac_hvy_pen: 0,
    shld_pen: 0,
    pd: 10,
    md: 10,
    rec_die: 10,
    wpn_1h: 8,
    wpn_2h: 10,
    wpn_2h_pen: 0,
    wpn_rngd: 8,
    skilled_warrior: true
  },
  monk: {
    hp: 7,
    ac_lgt: 11,
    ac_hvy: 12,
    ac_hvy_pen: -4,
    shld_pen: -2,
    pd: 11,
    md: 11,
    rec_die: 8,
    wpn_1h: 8,
    wpn_2h: 10,
    wpn_2h_pen: -2,
    wpn_rngd: 6,
    skilled_warrior: false
  },
  necromancer: {
    hp: 6,
    ac_lgt: 10,
    ac_hvy: 11,
    ac_hvy_pen: -2,
    shld_pen: -2,
    pd: 10,
    md: 11,
    rec_die: 6,
    wpn_1h: 4,
    wpn_2h: 6,
    wpn_2h_pen: 0,
    wpn_rngd: 4,
    skilled_warrior: false
  },
  occultist: {
    ac_lgt: 11,
    hp: 6,
    ac_hvy: 13,
    ac_hvy_pen: -2,
    shld_pen: -2,
    pd: 10,
    md: 11,
    rec_die: 6,
    wpn_1h: 4,
    wpn_2h: 6,
    wpn_2h_pen: 0,
    wpn_rngd: 4,
    skilled_warrior: false
  },
  paladin: {
    hp: 8,
    ac_lgt: 12,
    ac_hvy: 16,
    ac_hvy_pen: 0,
    shld_pen: 0,
    pd: 10,
    md: 12,
    rec_die: 10,
    wpn_1h: 8,
    wpn_2h: 10,
    wpn_2h_pen: 0,
    wpn_rngd: 8,
    skilled_warrior: true
  },
  ranger: {
    hp: 7,
    ac_lgt: 14,
    ac_hvy: 15,
    ac_hvy_pen: -2,
    shld_pen: -2,
    pd: 11,
    md: 10,
    rec_die: 8,
    wpn_1h: 8,
    wpn_2h: 10,
    wpn_2h_pen: 0,
    wpn_rngd: 8,
    skilled_warrior: true
  },
  rogue: {
    hp: 6,
    ac_lgt: 12,
    ac_hvy: 13,
    ac_hvy_pen: -2,
    shld_pen: -2,
    pd: 12,
    md: 10,
    rec_die: 8,
    wpn_1h: 8,
    wpn_2h: 8,
    wpn_2h_pen: 0,
    wpn_rngd: 6,
    skilled_warrior: true
  },
  sorcerer: {
    hp: 6,
    ac_lgt: 10,
    ac_hvy: 11,
    ac_hvy_pen: -2,
    shld_pen: -2,
    pd: 11,
    md: 10,
    rec_die: 6,
    wpn_1h: 6,
    wpn_2h: 8,
    wpn_2h_pen: 0,
    wpn_rngd: 6,
    skilled_warrior: false
  },
  wizard: {
    hp: 6,
    ac_lgt: 10,
    ac_hvy: 11,
    ac_hvy_pen: -2,
    shld_pen: -2,
    pd: 10,
    md: 12,
    rec_die: 6,
    wpn_1h: 4,
    wpn_2h: 6,
    wpn_2h_pen: 0,
    wpn_rngd: 4,
    skilled_warrior: false
  }
};

ARCHMAGE.classes2e = {
  barbarian: {
    rec_die: 12,
  },
  bard: {
    rec_die: 6,
  },
  chaosmage: {},
  cleric: {
    ac_hvy_pen: -2,
    ac_lgt: 11,
  },
  commander: {},
  druid: {},
  fighter: {},
  monk: {},
  necromancer: {},
  occultist: {},
  paladin: {},
  ranger: {
    ac_lgt: 13,
    rec_die: 6,
  },
  rogue: {},
  sorcerer: {
    wpn_2h: 8,
  },
  wizard: {}
}

ARCHMAGE.classResources = {
  // List custom resources to configure for classes that use them
  // Stored as an array of two-element arrays with label and reset
  'chaosmage': [["CM Daily Spells", "full", 2, 2], ["CM Per-Battle Spells", "quick", 1, 1]],
  'druid' : [["TC Daily Spells", "full", 1, 1]]
}

ARCHMAGE.classResources2e = {
  // List custom resources to configure for classes that use them - added if 2e enabled
  // Stored as an array of two-element arrays with label and reset
  // 'barbarian': [["Frenzy", "quickreset"]], // optional, manually setup via instructions
  // These were part of the 2e playtest but didn't make the cut
  // 'bard' : [["Combat Riffs", "quick", 2, 2], ["Healing Magics", "quick", 2, 2], ["Miss Me Effects", "quick", 2, 2]]
}

ARCHMAGE.keyModifiers = {
  // Symmetrical dense matrix, store only lower triangle
  // Assumption: classes are stored in actors sorted in alphabetical order
  'barbarian': {
    'bard': ['str', 'cha'],
    'chaosmage': ['str', 'cha'],
    'cleric': ['str', 'wis'],
    'commander': ['str', 'cha'],
    'druid': ['str', 'wis'],
    'fighter': ['str', 'con'],
    'monk': ['str', 'dex'],
    'necromancer': ['str', 'int'],
    'occultist': ['str', 'int'],
    'paladin': ['str', 'cha'],
    'ranger': ['str', 'dex'],
    'rogue': ['str', 'dex'],
    'sorcerer': ['str', 'cha'],
    'wizard': ['str', 'int'],
  },
  'bard': {
    'chaosmage': ['dex', 'cha'],
    'cleric': ['wis', 'cha'],
    'commander': ['str', 'cha'],
    'druid': ['wis', 'cha'],
    'fighter': ['str', 'cha'],
    'monk': ['dex', 'cha'],
    'necromancer': ['int', 'cha'],
    'occultist': ['int', 'cha'],
    'paladin': ['str', 'cha'],
    'ranger': ['dex', 'cha'],
    'rogue': ['dex', 'cha'],
    'sorcerer': ['dex', 'cha'],
    'wizard': ['int', 'cha'],
  },
  'chaosmage': {
    'cleric': ['wis', 'cha'],
    'commander': ['str', 'cha'],
    'druid': ['wis', 'cha'],
    'fighter': ['str', 'cha'],
    'monk': ['dex', 'cha'],
    'necromancer': ['int', 'cha'],
    'occultist': ['int', 'cha'],
    'paladin': ['str', 'cha'],
    'ranger': ['dex', 'cha'],
    'rogue': ['dex', 'cha'],
    'sorcerer': ['con', 'cha'],
    'wizard': ['int', 'cha'],
  },
  'cleric': {
    'commander': ['wis', 'cha'],
    'druid': ['str', 'wis'],
    'fighter': ['str', 'wis'],
    'monk': ['dex', 'wis'],
    'necromancer': ['int', 'wis'],
    'occultist': ['int', 'wis'],
    'paladin': ['str', 'wis'],
    'ranger': ['str', 'wis'],
    'rogue': ['dex', 'wis'],
    'sorcerer': ['wis', 'cha'],
    'wizard': ['int', 'wis'],
  },
  'commander': {
    'druid': ['wis', 'cha'],
    'fighter': ['str', 'cha'],
    'monk': ['str', 'dex'],
    'necromancer': ['int', 'cha'],
    'occultist': ['int', 'cha'],
    'paladin': ['str', 'cha'],
    'ranger': ['str', 'cha'],
    'rogue': ['dex', 'cha'],
    'sorcerer': ['str', 'cha'],
    'wizard': ['int', 'cha'],
  },
  'druid': {
    'fighter': ['str', 'wis'],
    'monk': ['dex', 'wis'],
    'necromancer': ['int', 'wis'],
    'occultist': ['int', 'wis'],
    'paladin': ['str', 'wis'],
    'ranger': ['dex', 'wis'],
    'rogue': ['dex', 'wis'],
    'sorcerer': ['wis', 'cha'],
    'wizard': ['int', 'wis'],
  },
  'fighter': {
    'monk': ['str', 'dex'],
    'necromancer': ['str', 'int'],
    'occultist': ['str', 'int'],
    'paladin': ['str', 'cha'],
    'ranger': ['str', 'dex'],
    'rogue': ['str', 'dex'],
    'sorcerer': ['str', 'cha'],
    'wizard': ['str', 'int'],
  },
  'monk': {
    'necromancer': ['dex', 'int'],
    'occultist': ['dex', 'int'],
    'paladin': ['str', 'dex'],
    'ranger': ['str', 'dex'],
    'rogue': ['str', 'dex'],
    'sorcerer': ['dex', 'cha'],
    'wizard': ['dex', 'int'],
  },
  'necromancer': {
    'occultist': ['int', 'cha'],
    'paladin': ['str', 'int'],
    'ranger': ['dex', 'int'],
    'rogue': ['dex', 'int'],
    'sorcerer': ['int', 'cha'],
    'wizard': ['int', 'cha'],
  },
  'occultist': {
    'paladin': ['str', 'int'],
    'ranger': ['dex', 'int'],
    'rogue': ['dex', 'int'],
    'sorcerer': ['int', 'cha'],
    'wizard': ['int', 'wis'],
  },
  'paladin': {
    'ranger': ['str', 'dex'],
    'rogue': ['str', 'dex'],
    'sorcerer': ['str', 'cha'],
    'wizard': ['str', 'int'],
  },
  'ranger': {
    'rogue': ['str', 'dex'],
    'sorcerer': ['dex', 'cha'],
    'wizard': ['dex', 'int'],
  },
  'rogue': {
    'sorcerer': ['dex', 'cha'],
    'wizard': ['dex', 'int'],
  },
  'sorcerer': {
    'wizard': ['int', 'cha'],
  },
  // 'wizard': ,
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

ARCHMAGE.baselineMonsterStats2e = {
  // arrays indexed by level, 0 to 14
  attackBonuses: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
  ac: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  pd: [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28],
  md: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  init: [3, 3, 6, 6, 6, 9, 9, 9, 12, 12, 12, 15, 15, 15, 18],

  byStrength: {
    normal: {
      damage: [6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100, 120, 160],
      hp: [25, 30, 40, 50, 60, 80, 100, 120, 160, 200, 240, 320, 400, 480, 640]
    },
    mook: {
      damage: [3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 30, 40, 50, 60, 80],
      hp: [6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100, 120, 160]
    },
    weakling: {
      damage: [3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 30, 40, 50, 60, 80],
      hp: [13, 15, 20, 25, 30, 40, 50, 60, 80, 100, 120, 160, 200, 240, 320]
    },
    elite: {
      damage: [9, 12, 15, 18, 22, 30, 38, 45, 60, 75, 90, 120, 150, 180, 240],
      hp: [38, 45, 60, 75, 90, 120, 150, 180, 240, 300, 360, 480, 600, 720, 960]
    },
    double: {
      damage: [9, 12, 15, 18, 22, 30, 35, 45, 60, 75, 90, 120, 150, 180, 240],
      damageSecondary: [3, 4, 5, 6, 8, 10, 15, 15, 20, 25, 30, 40, 50, 60, 80],
      hp: [50, 60, 80, 100, 120, 160, 200, 240, 320, 400, 480, 640, 800, 960, 1280]
    },
    triple: {
      damage: [9, 12, 15, 18, 22, 30, 35, 45, 60, 75, 90, 120, 150, 180, 240],
      damageSecondary: [9, 12, 15, 18, 22, 30, 35, 45, 60, 75, 90, 120, 150, 180, 240],
      hp: [75, 90, 120, 150, 180, 240, 300, 360, 480, 600, 720, 960, 1200, 1440, 1920]
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
  "hideImportPowers": {
    name: "ARCHMAGE.CHARACTERFLAGS.hideImportPowersName",
    hint: "ARCHMAGE.CHARACTERFLAGS.hideImportPowersHint",
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
