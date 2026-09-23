export class ActorHelpersV2 {
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
