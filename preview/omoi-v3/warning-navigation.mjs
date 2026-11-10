import { readPreviewState, assertSampleLevel, previewHref } from "./preview-state.mjs";

export function configureWarning(level) {
    const continueLink = document.getElementById("continueLink");
    try {
        const state = readPreviewState(window.location.search);
        assertSampleLevel(state, level);
        continueLink.href = previewHref("question.html", state, {
            baseUrl: window.location.href,
            level,
            sampleId: state.sampleId
        });
    } catch (error) {
        continueLink.removeAttribute("href");
        continueLink.setAttribute("aria-disabled", "true");
        const message = document.createElement("p");
        message.className = "preview-error";
        message.setAttribute("role", "alert");
        message.textContent = error.message;
        document.querySelector(".warning-content").appendChild(message);
    }
}
