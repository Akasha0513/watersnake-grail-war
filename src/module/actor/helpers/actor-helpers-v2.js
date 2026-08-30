export class ActorHelpersV2 {
  /**
   * Compute derived data for an actor.
   *
   * @param {object} actorData
   *   `actor.data` object to compute derived data for.
   */
  static prepareData(actorData) {
    ActorHelpersV2._prepareCharacterData(actorData);
    ActorHelpersV2._prepareNpcData(actorData);
    return actorData;
  }

  static _prepareCharacterData(actorData) {
    ActorHelpersV2._prepareAbilityScores(actorData);
    ActorHelpersV2._prepareDefenses(actorData);
  }

  static _prepareNpcData(actorData) {
    // Pass.
  }

  static _prepareAbilityScores(actorData) {
    let levelMultiplier = 1;
    if (actorData.system.attributes.level.value >= 5) {
      levelMultiplier = 2;
    }
    if (actorData.system.attributes.level.value >= 8) {
      levelMultiplier = 3;
    }

    for (let abl of Object.values(actorData.system.abilities)) {
      abl.mod = Math.floor(abl.value / 3); // 홈브루 수정치 = floor(능력치/3): 3~5 E+1, 6~8 D+2, ... 21+ EX+7
      abl.lvl = abl.mod + actorData.system.attributes.level.value;
      abl.dmg = abl.mod * levelMultiplier;
    }
  }

  static _prepareDefenses(actorData) {
    let data = actorData.system;
    let missingRecPenalty = Math.min(data.attributes.recoveries.value, 0);

    let acBonus = missingRecPenalty;
    let mdBonus = missingRecPenalty;
    let pdBonus = missingRecPenalty;

    // Use array.sort()[1] to grab the middle of the three ability mods.
    data.attributes.ac.value = data.attributes.ac.base + [data.abilities.agi.mod, data.abilities.end.mod, data.abilities.ins.mod].sort()[1] + data.attributes.level.value + acBonus;
    data.attributes.pd.value = data.attributes.pd.base + [data.abilities.agi.mod, data.abilities.end.mod, data.abilities.str.mod].sort()[1] + data.attributes.level.value + pdBonus;
    data.attributes.md.value = data.attributes.md.base + [data.abilities.mgi.mod, data.abilities.lck.mod, data.abilities.ins.mod].sort()[1] + data.attributes.level.value + mdBonus;
  }

  static _activatePortraitArtContextMenu(app, element) {
    foundry.applications.ux.ContextMenu.implementation.create(app, element[0], '.profile-img', [
      {
        name: game.i18n.localize('ARCHMAGE.CHARACTER.showPortrait'),
        icon: '<i class="fa fa-image-portrait"></i>',
        callback: () => {
          new foundry.applications.apps.ImagePopout({
            src: app.actor.img,
            window: {title: game.i18n.format('ARCHMAGE.CHARACTER.showPortraitTitle', {name: app.actor.name})},
            shareable: true,
            uuid: app.actor.uuid,
          }).render(true);
        }
      },
      {
        name: game.i18n.localize('ARCHMAGE.CHARACTER.showToken'),
        icon: '<i class="fas fa-circle-user"></i>',
        callback: () => {
          new foundry.applications.apps.ImagePopout({
            src: app.actor.prototypeToken.texture.src,
            window: {title: game.i18n.format('ARCHMAGE.CHARACTER.showTokenTitle', {name: app.actor.name})},
            shareable: true,
            uuid: app.actor.uuid,
          }).render(true);
        }
      }
    ], {jQuery: false})
  }
}
