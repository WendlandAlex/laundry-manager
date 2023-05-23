const arrayToCSV = (arr, delimiter = ",", headerRowIndex = 0) => {
    let result = arr
        .map(v => v.map(x => (isNaN(x) ? `${x.replace(/"/g, "\"\"")}` : x)).join(delimiter))
        .join("\n");

    return result;
};

const arrayElementsComparison = (arr1, arr2) => {
    return (arr1.length === arr2.length && arr1.every((element, atIndex) => element === arr2[atIndex]));
};

const sortObjectByKeys = obj => Object.keys(obj).sort().reduce((res, key) => (res[key] = obj[key], res), {});


const findLastNonZeroKeyOf = (obj) => {
    lastIndex = Object.values(obj).findLastIndex((i) => i > 0);
    return Object.keys(obj)[lastIndex];
};

const getRandomStepBetween = (min, max, stepSize) => {
    range = [];
    for (let i = min; i <= max; i += stepSize) {
        range.push(i);
    }

    return range[Math.floor(Math.random() * range.length)];
};

module.exports = {
    arrayToCSV,
    arrayElementsComparison,
    sortObjectByKeys,
    findLastNonZeroKeyOf,
    getRandomStepBetween
};
