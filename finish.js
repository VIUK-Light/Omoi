const params =
    new URLSearchParams(window.location.search);

const level =
    params.get("level");

const count =
    params.get("count");

const retryLink =
    document.getElementById("retryLink");

retryLink.href =
    "question.html?level=" +
    level +
    "&count=" +
    count;