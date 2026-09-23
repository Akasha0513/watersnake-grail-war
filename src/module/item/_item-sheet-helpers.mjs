// @todo this file is a temporary holding place for methods that
// need further abstraction.

/* ---------------------------------------------------- */

export async function wrapRolls(text, replacements = [], enrichmentOptions = {}) {
  // Build a map of string replacements.
  let replaceMap = replacements.concat([
    // Put these at the top for higher replacement priority
    ['[[/r', '<span class="expression">'],
    ['(@lvl)d(@wpn.m.dieNum-2)', '(WPN-2)'],
    ['(@lvl)d(@wpn.r.dieNum-2)', '(WPN-2)'],
    // Common replacements
    ['[[', '<span class="expression">'],
    [']]', '</span>'],
    ['@ed', 'ED'],
    ['@lvl', 'LVL'],
    ['@std', 'LVL+ED'], //STD
    ['@tier', 'TIER'],
    ['@str.mod', 'STR'],
    ['@str.dmg', 'STR×TIER'],
    ['@end.mod', 'END'],
    ['@end.dmg', 'END×TIER'],
    ['@agi.mod', 'AGI'],
    ['@agi.dmg', 'AGI×TIER'],
    ['@mgi.mod', 'MGI'],
    ['@mgi.dmg', 'MGI×TIER'],
    ['@ins.mod', 'INS'],
    ['@ins.dmg', 'INS×TIER'],
    ['@lck.mod', 'LCK'],
    ['@lck.dmg', 'LCK×TIER'],
    ['@atk.mod', 'ATK'],
    ['@wpn.m.dice', 'WPN'],
    ['@wpn.r.dice', 'WPN'],
    ['@atk.m.bonus', 'ITM'], //ITM_MLE
    ['@atk.r.bonus', 'ITM'], //ITM_RNG
    ['@atk.a.bonus', 'ITM'], //ITM_ARC
    ['@atk.d.bonus', 'ITM'], //ITM_DIV    // Do this last to remove stray multiplication symbols
    ['*', '×']
  ]);

  // Remove whitespace from inline rolls.
  let clean = text ? text?.toString() ?? '' : '';  // cast to string, could be e.g. number

  clean = replaceActiveEffectLinkReferences(clean);

  // Short syntax replacements. Ex: WPN+DEX+LVL
  // Remove additional whitespace inside inline rolls.
  clean.toString().replace(/(\[\[)([^\[]*)(\]\])/g, (match) => {
    clean = clean.replace(match, match.replaceAll(' ', ''));
  });
  for (let [needle, replacement] of replaceMap) {
    clean = clean.replaceAll(needle, replacement);
  }

  // Call TextEditor.enrichHTML to process remaining object links
  clean = await foundry.applications.ux.TextEditor.implementation.enrichHTML(clean, enrichmentOptions);

  // Return the revised text and convert markdown to HTML.
  return parseMarkdown(clean);
}

function replaceActiveEffectLinkReferences(text) {
  return text.replaceAll(/@UUID\[(.*ActiveEffect.*)\]({.*})*/g, (all, uuid, name) => {
    const effect = fromUuidSync(uuid);
    const parent = effect?.parent?.uuid ? effect.parent : {};
    return `<a class="effect-link" data-uuid="${uuid}" data-source="${parent?.uuid}" data-actor-id="${parent?.id}"
            draggable="true" data-type="ActiveEffect" data-tooltip="Base Active Effect">
      <img class="effects-icon" src="${effect.img}"/>
      ${effect.name}
    </a>`;
  });
}
