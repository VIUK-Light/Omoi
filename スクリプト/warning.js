const continueLink =
    document.getElementById("continueLink");

const warningParameters = new URLSearchParams(window.location.search);
const isPickup = warningParameters.get("pickup") === "1";

continueLink.href = isPickup
    ? "question.html?mode=all&pickup=1"
    : "question.html?level=4";

if (isPickup) {
    const description = document.getElementById("warningDescription");
    if (description) {
        description.textContent =
            "この中には、学校・人間関係から社会や人生観まで、答えるのが難しい質問や重いテーマが含まれます。無理に答える必要はありません。";
    }
}
