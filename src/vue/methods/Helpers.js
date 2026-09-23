export function localize(key) {
  return game.i18n.localize(key);
}

export function tooltip(...keys) {
  return game.holygrailwar.ArchmageUtility.tooltip(...keys);
}

export function numberFormat(value, dec = 0, sign = false) {
  const parsedValue = parseFloat(value).toFixed(dec);
  if (isNaN(parsedValue)) return value
  if (sign ) return ( parsedValue >= 0 ) ? `+${parsedValue}` : parsedValue;
  return parsedValue;
}

export function concat(...args) {
  return args.reduce((acc, cur) => {
    return acc + cur;
  }, '');
}

export async function getActor(actorData) {
  // If no drag data is available, we can't retrieve the actor.
  if (!actorData?.dragData?.uuid) return false;

  // Async load the actor/token from the UUID.
  const document = await fromUuid(actorData.dragData.uuid);

  // If it's a token, retrieve the actor prop. Otherwise, retrieve the document.
  return document?.actor ?? document;
}
