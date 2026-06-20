export class FeatureTour extends foundry.nue.Tour {

  exit() {
    super.exit();
    game.settings.set("watersnake-grail-war", "lastTourVersion", this.version);
  }

  get version() {
    return this.config.version;
  }
}
