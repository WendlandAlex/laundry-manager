const parseWorking = (working) => {
    switch (working) {
        case 1:
        case "1":
        case "yes":
        case "Yes":
        case "working":
        case "Working":
        case true:
        case "true":
        case "True":
            working = 1;
            break;
        default:
            working = 0;
    }

    return working;
};

const parseRestarted = (restarted) => {
    switch (restarted) {
        case 1:
        case "1":
        case "yes":
        case "Yes":
        case "restarted":
        case "restarted":
        case true:
        case "true":
        case "True":
            restarted = 1;
            break;
        default:
            restarted = 0;
    }

    return restarted;
};

module.exports = {
    parseWorking,
    parseRestarted
};
