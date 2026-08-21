const params =
    new URLSearchParams(window.location.search);

const level =
    params.get("level");

const retryLink =
    document.getElementById("retryLink");

retryLink.href =
    "question.html?level=" + level;