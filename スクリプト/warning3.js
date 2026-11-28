const continueLink =
    document.getElementById("continueLink");

continueLink.href =
    "question.html?level=3";

// 対話モード: 続けるを押したら問いデータをルームに投入してOmoi Liveへ遷移する
const isLive = new URLSearchParams(window.location.search).get("live") === "1";
if (isLive) {
    continueLink.addEventListener("click", function (event) {
        event.preventDefault();
        window.OmoiLive.startLiveMode(continueLink, window.OmoiLive.cardsForLevel("3"));
    });
}
