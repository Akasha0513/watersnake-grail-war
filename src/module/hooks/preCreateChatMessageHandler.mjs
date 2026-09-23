export default class preCreateChatMessageHandler {

    /** 카드 본문의 ActiveEffect 링크에 드래그 적용용 effect-link 표식을 붙인다. */
    static replaceActiveEffectLinkReferences($content) {
        const elements = $content[0].querySelectorAll('.content-link[data-type="ActiveEffect"]');
        elements.forEach((element) => {
            const effect = fromUuidSync(element.dataset.uuid);
            element.classList.add('effect-link');
            element.dataset.source = effect.parent.uuid;
            const hasImg = element.querySelector('img');
            if (!hasImg) {
                element.innerHTML = `<img class="effects-icon" src="${effect.img}"/>${element.innerText}`;
            }
        });
    }

    static handle(data) {
        const $content = $(`<div class="wrapper">${data.content}</div>`);
        preCreateChatMessageHandler.replaceActiveEffectLinkReferences($content);
        data.content = $content.html();
    }
}
