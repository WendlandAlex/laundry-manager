const camelCaseToSnakeCase = (string) => {
    return string.replace(/[A-Z]/g, capitalLetter => `_${capitalLetter.toLowerCase()}`);
};
const snakeCaseToCamelCase = (str) => {
    let res = [];
    str = str.split("_");
    str.map((i, idx) => {
        if (idx == 0) {
            res.push(i);
        } else {
            res.push(i.charAt(0).toUpperCase() + i.slice(1));
        }
    });

    return res.join("");
};

const splitOnDelimiter = (str, delimiter, takeIndex = null) => {
    _split = str.split(delimiter);
    return (takeIndex != null) ? _split[takeIndex] : _split.join(" ");
};

const toLowerCase = (str) => {
    return str.toLowerCase();
};

const toUpperCase = (str) => {
    return str.toUpperCase();
};

const toTitleCase = (str) => {
    str = str.split();
    for (let i = 0; i < str.length; i++) {
        str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
    }
    return str.join(" ");
};

module.exports = {
    camelCaseToSnakeCase,
    snakeCaseToCamelCase,
    splitOnDelimiter,
    toLowerCase,
    toUpperCase,
    toTitleCase
};
