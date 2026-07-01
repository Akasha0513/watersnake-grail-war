export async function combatStart(updateData) {
    // 라운드 시작 알림을 먼저 출력 — combatStart는 combatTurnChange(모듈 턴 알림)보다 먼저 발생하므로
    // 여기서 메시지를 먼저 만들면 턴 알림보다 앞선다. 이 시점엔 combat.current.round가 아직 1로
    // 갱신되기 전이라 라운드1/전투고조0을 명시적으로 전달한다.
    await handleRoundNotice(updateData, { round: 1, escalation: 0 });

    // Ensure the start-of-turn hook fires for the first combatant, combatTurn doesn't fire here
    const firstCombatant = updateData.turns[0];
    if (firstCombatant) {
        await executeLifecycleMacro(firstCombatant, "startOfTurn");
    }
}

/**
 * 자작룰 라운드(=Foundry 3라운드)가 시작될 때 "라운드 N / 전투고조 N" 배너를 채팅에 출력.
 * 활성 GM만 생성(중복 방지). 같은 자작룰 라운드는 전투 플래그로 1회만 알림.
 * @param {Combat} combat
 * @param {?{round:number, escalation:number}} override  값을 직접 지정(전투 시작 시 combat.current가 아직 갱신 전).
 */
export async function handleRoundNotice(combat, override = null) {
    if (!combat || !game.user?.isActiveGM) return;
    const Util = game.holygrailwar?.ArchmageUtility;
    if (!Util) return;

    const round = override ? override.round : Util.getGameRound(combat);
    if (round < 1) return;

    // 이미 알린 라운드(또는 되감기)면 건너뜀 — 증가할 때만 알림.
    const last = combat.getFlag('watersnake-grail-war', 'lastRoundNotice');
    if (last != null && round <= last) return;

    const escalation = override ? override.escalation : Util.getEscalation(combat);
    const content = await foundry.applications.handlebars.renderTemplate(
        'systems/watersnake-grail-war/templates/chat/round-notice-card.html',
        { round, escalation }
    );
    // 메시지를 먼저 생성(턴 알림보다 앞서도록), 그 다음 플래그 저장.
    // roundNotice 플래그 → 렌더 훅에서 헤더/포트레이트 숨김.
    await ChatMessage.create({
        content,
        flags: { 'watersnake-grail-war': { roundNotice: true } }
    });
    await combat.setFlag('watersnake-grail-war', 'lastRoundNotice', round);
}

export async function combatTurn(combat, context, options) {
    const endCombatant = combat.combatant;
    const startCombatant = combat.nextCombatant;

    // Execute start/end of turn macros
    await executeLifecycleMacro(endCombatant, "endOfTurn");
    await _add2eFighterMomentum(endCombatant);
    await executeLifecycleMacro(startCombatant, "startOfTurn");

    // 13th Age의 "지속효과 턴 알림" 카드(handleTurnEffects/handleRoundEffects)는 제거됨.
    // 성배전쟁 상태이상 AE는 duration/save-ends 플래그를 쓰지 않아, 매 턴 "unknown duration"
    // 카드가 반복 출력되던 노이즈를 없애기 위함.
    if (options.direction < 0) return;
    if (CONFIG.HOLYGRAILWAR.is2e) {
        await handleStoke(combat, context, options);
    }
}

export async function handleTurnEffects(prefix, combat, combatant, context, options) {
    // Pseudo combatants may not have an actor.
    if (!combatant?.actor) return;

    const saveEndsEffects = ["EasySaveEnds", "NormalSaveEnds", "HardSaveEnds"];
    const hasImplacable = combatant?.actor?.flags['watersnake-grail-war']?.implacable ?? false;
    const currentCombatantEffectData = {
        selfEnded: [],
        savesEnds: [],
        selfTriggered: [],
        otherEnded: [],
        unknown: [],
    };
    let effectsToDelete = [];
    let isDead = false;

    for (const effect of combatant.actor.effects) {
        if (!effect.active) continue;
        // Handle ongoing.
        const isOngoing = effect.flags['watersnake-grail-war']?.ongoingDamage ? true: false;
        effect.isOngoing = isOngoing;
        const isCrit = isOngoing && effect.flags['watersnake-grail-war']?.ongoingDamageCrit === true;
        effect.isCrit = isCrit;
        effect.ongoingDamage = isOngoing ? Number(effect.flags['watersnake-grail-war']?.ongoingDamage) : 0;
        effect.ongoingTooltip = game.i18n.format('ARCHMAGE.CHAT.ongoingDamageTooltip', {
            damage: effect.ongoingDamage,
            type: effect.flags['watersnake-grail-war']?.ongoingDamageType ?? '',
        });
        if (isCrit) {
            effect.ongoingDamage = effect.ongoingDamage * 2;
        }
        // Handle durations.
        if (effect.name === game.i18n.localize("ARCHMAGE.EFFECT.StatusDead")) isDead = true;
        const duration = effect.flags['watersnake-grail-war']?.duration || "Unknown";
        if (duration === `${prefix}OfNextTurn`) {
            // Ensure it's the *next* turn
            if (combat.round  > effect.duration.startRound
            || (combat.round == effect.duration.startRound && combat.turn > effect.duration.startTurn)) {
                currentCombatantEffectData.selfEnded.push(effect);
                effectsToDelete.push(effect.id);
            }
        } else if (saveEndsEffects.includes(duration) && (prefix == "End" || (prefix == "Start" && hasImplacable))) {
            currentCombatantEffectData.savesEnds.push(effect);
        } else if (duration === `${prefix}OfEachTurn`) {
            currentCombatantEffectData.selfTriggered.push(effect);
        } else if (duration === "Unknown") {
            currentCombatantEffectData.unknown.push(effect);
        }
    }
    // Auto-delete AEs
    await combatant.actor.deleteEmbeddedDocuments("ActiveEffect", effectsToDelete);

    // For each other combatant, check if their EndOfNextSourceTurn effects reference this combatant's actor as the source
    for (const otherCombatant of combat.combatants) {
        effectsToDelete = [];
        if (otherCombatant?.actor?.effects) {
            for (const effect of otherCombatant.actor.effects) {
                const isOngoing = effect.flags['watersnake-grail-war']?.ongoingDamage ? true: false;;
                effect.isOngoing = isOngoing;
                const isCrit = isOngoing && effect.flags['watersnake-grail-war']?.ongoingDamageCrit === true;
                effect.isCrit = isCrit;
                effect.ongoingDamage = isOngoing ? Number(effect.flags['watersnake-grail-war']?.ongoingDamage) : 0;
                effect.ongoingTooltip = game.i18n.format('ARCHMAGE.CHAT.ongoingDamageTooltip', {
                    damage: effect.ongoingDamage,
                    type: effect.flags['watersnake-grail-war']?.ongoingDamageType ?? '',
                });
                if (isCrit) {
                    effect.ongoingDamage = effect.ongoingDamage * 2;
                }
                const duration = effect.flags['watersnake-grail-war']?.duration || "Unknown";
                if (duration === `${prefix}OfNextSourceTurn` && effect.origin === combatant.actor.uuid) {
                    // Ensure it's the *next* turn
                    if (combat.round  > effect.duration.startRound
                    || (combat.round == effect.duration.startRound && combat.turn > effect.duration.startTurn)) {
                        effect.otherName = otherCombatant.actor.name;
                        currentCombatantEffectData.otherEnded.push(effect);
                        effectsToDelete.push(effect.id);
                    }
                }
            }
            // Auto-delete AEs
            await otherCombatant.actor.deleteEmbeddedDocuments("ActiveEffect", effectsToDelete);
        }
    }

    if (!isDead) {
        await renderOngoingEffectsCard(`${prefix} of Turn Effects`, combatant, currentCombatantEffectData);
    }
}

export async function handleRoundEffects(combat, context, options) {
    // If we have not just started a new round, skip
    if (context.turn != 0) return;
    // For each other combatant, check if any of their effects has an EndOfRound lower than the current round
    const currentCombatantEffectData = {
        selfEnded: [],
        savesEnds: [],
        selfTriggered: [],
        otherEnded: [],
        unknown: [],
    };
    let effectsToDelete = [];
    for (const combatant of combat.combatants) {
        if (!combatant?.actor?.effects) continue;
        effectsToDelete = [];
        for (const effect of combatant.actor.effects) {
            const duration = effect.flags['watersnake-grail-war']?.duration || "Unknown";
            if (duration === 'EndOfRound' && effect.flags['watersnake-grail-war']?.endRound < context.round) {
                effect.otherName = combatant.actor.name;
                currentCombatantEffectData.otherEnded.push(effect);
                effectsToDelete.push(effect.id);
            }
        }
        // Auto-delete AEs
        await combatant.actor.deleteEmbeddedDocuments("ActiveEffect", effectsToDelete);
    }
    await renderOngoingEffectsCard(`End of Round ${context.round - 1} Effects`, null, currentCombatantEffectData);
}

export async function combatRound(combat, context, options) {
    await combatTurn(combat, context, options);
    // context.round = 새 Foundry 라운드. (combat.current.round는 이 훅 시점에 아직 이전 값이라 사용 금지 —
    //  그대로 쓰면 자작룰 라운드가 한 사이클씩 밀림.) getGameRound/getEscalation과 동일 공식으로 계산.
    const fr = Number(context?.round) || 0;
    if (fr < 1) return;
    const base = Math.floor((fr - 1) / 3);
    const edOffset = combat.getFlag('watersnake-grail-war', 'edOffset') ?? 0;
    await handleRoundNotice(combat, { round: base + 1, escalation: Math.max(0, base + edOffset) });
}

export async function preDeleteCombat(combat, context, options) {
    await cleanupStoke(combat, context, options);
    $('.archmage-escalation-display').addClass('hide');
    // 전투 종료 시 상태이상(AE) 자동삭제 및 "End of Battle Effects" 카드는 제거됨.
    // (사용자 요청: 전투가 끝나도 상태이상을 유지한다.)
}

async function handleStoke(combat, context, options) {
    const endCombatant = combat.combatant;
    const {enabled, current, breathUsed} = endCombatant?.actor?.system?.resources?.spendable?.stoke ?? {};
    if (endCombatant?.actor?.type === 'npc' && enabled) {
        const stokeDelta = breathUsed ? -1 : 1;
        const newCurrent = Math.max(0, (current ?? 0) + stokeDelta);
        await endCombatant.actor.update({
            'system.resources.spendable.stoke.current': newCurrent,
            'system.resources.spendable.stoke.breathUsed': false
        });
        // Show scrolling text for the update.
        endCombatant.actor._showScrollingText(stokeDelta, game.i18n.localize('ARCHMAGE.CHARACTER.RESOURCES.stoke'), {}, '#1776D5');
    }
}

async function cleanupStoke(combat, context, options) {
    for (const c of combat.combatants) {
        // If the combatant has a stoke resource, reset it
        if (c?.actor?.system?.resources?.spendable?.stoke?.enabled) {
            await c.actor.update({
                'system.resources.spendable.stoke.current': 0,
                'system.resources.spendable.stoke.breathUsed': false
            });
        }
    }
}

/* -------------------------------------------- */

function saveEndsNameToTarget(saveEnds) {
    let target = 11;
    if (saveEnds === "EasySaveEnds") {
        target = 6;
    } else if (saveEnds === "NormalSaveEnds") {
        target = 11;
    } else if (saveEnds === "HardSaveEnds") {
        target = 16;
    }
    return target;
}

/* -------------------------------------------- */

async function renderOngoingEffectsCard(title, combatant, effectData) {
    // If no effects, return
    if (effectData.selfEnded.length === 0
        && effectData.savesEnds.length === 0
        && effectData.selfTriggered.length === 0
        && effectData.otherEnded.length === 0
        && effectData.unknown.length === 0) return;

    const template = "systems/watersnake-grail-war/templates/chat/ongoing-effects-card.html";
    const renderData = {
        title: title,
        combatant: combatant,  // Not used?
        selfEnded: effectData.selfEnded,
        hasSelfEnded: effectData.selfEnded.length > 0,
        saveEnds: effectData.savesEnds,
        hasSaveEnds: effectData.savesEnds.length > 0,
        selfTriggered: effectData.selfTriggered,
        hasSelfTriggered: effectData.selfTriggered.length > 0,
        otherEnded: effectData.otherEnded,
        hasOtherEnded: effectData.otherEnded.length > 0,
        unknown: effectData.unknown,
        hasUnknown: effectData.unknown.length > 0,
    };
    const html = await foundry.applications.handlebars.renderTemplate(template, renderData);

    // Create a chat card
    const chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({actor: combatant?.actor}),
        content: html
    };
    ChatMessage.create(chatData, {});
}

async function executeLifecycleMacro(combatant, hookName) {
    // If this isn't the actor's player, emit a socket request for that player to execute the hook
    if (game.user?.character?.id !== combatant.actor.id) {
        return game.socket.emit('system.archmage', {
            type: 'actorLifecycleHook',
            actorId: combatant.actor.id,
            hookName
        });
    }

    const speaker = ChatMessage.implementation.getSpeaker();
    const actor = game.user.character;
    const macroData = {
        // TODO: ???
    };

    const hookBody = combatant?.actor?.system?.lifecycleHooks?.[hookName]?.trim();
    if (!hookBody) return;

    // Can't run if you can't run
    if (!game.user.hasPermission("MACRO_SCRIPT")) return;

    // Run our own function to bypass macro parameters limitations - based on Foundry's _executeScript
    const AsyncFunction = async function () {}.constructor;
    try {
        const fn = new AsyncFunction("speaker", "actor", "archmage", hookBody);
        await fn.call(this, speaker, actor, macroData);
    } catch (ex) {
        ui.notifications.error(game.i18n.localize('ARCHMAGE.UI.errMacroSyntax'));
        console.error(`Lifecycle hook '${combatant.actor.name}' / ${hookName} failed with: ${ex}`, ex);
    }
}

async function _add2eFighterMomentum(combatant) {
    // Pseudo combatants may not have an actor.
    if (!combatant?.actor) return;

    // Only woks in 2e and for fighters
    if (!(game.settings.get("watersnake-grail-war", "secondEdition") && combatant.actor?.system?.details?.detectedClasses?.includes("fighter"))) return;

    // Update actor's resource
    let updateData = {}
    if (combatant.actor?.system.resources?.perCombat?.momentum?.enabled) {
      updateData['system.resources.perCombat.momentum.current'] = true;
    }
    await combatant.actor.update(updateData);
}
