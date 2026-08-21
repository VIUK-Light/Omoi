const params =
    new URLSearchParams(window.location.search);

const count =
    params.get("count");

const continueLink =
    document.getElementById("continueLink");

continueLink.href =
    "question.html?level=4&count=" + count;