const {
    laundromat,
    organization,
    bags
} = require("../../config");

const injectCommonViewAttributes = (req, res) => {
    let {
        baseUrl,
        path,
        query,
        params
    } = req;
    return {
        laundromat,
        organization,
        req: {
            baseUrl,
            path,
            query,
            params
        },
        userHasAdminToken: (res.locals.adminUsername !== undefined),
    };
};

const getEventTypeByColumnName = (columnName) => {
    let eventObject = Object.values(bags.eventTypes).filter(i => {
        // snake_case
        if (columnName.includes("_")) {
            return i.columnName === columnName;
        }

        // camelCase
        return i.eventTypeName === columnName;
    });

    return eventObject[0];
};

module.exports = {
    injectCommonViewAttributes,
    getEventTypeByColumnName
};
