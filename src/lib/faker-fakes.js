const { faker } = require("@faker-js/faker");

const makeFirstName = (firstNameOpts = {}) => {
    return faker.name.firstName(firstNameOpts);
};

const makeFullName = (opts = {}) => {
    let firstNameOpts = opts.firstName || {};
    let lastNameOpts  = opts.lastName || {};
    return faker.name.firstName(firstNameOpts) + " " + faker.name.lastName(lastNameOpts);
};

module.exports = {
    makeFirstName,
    makeFullName
};
