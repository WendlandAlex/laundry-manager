const { buildDashboard } = require("../../services/dashboard");
const { getAllDryers } = require("../../services/dryers");
const {
    organization
} = require("../../../config");
const { injectCommonViewAttributes } = require("../../utils/viewRendering");

const getDashboard = async (req, res, next) => {
    let data = buildDashboard(await getAllDryers(), 10);

    res.render("dashboard/dashboard", {
        ...injectCommonViewAttributes(req, res),
        pageTitle: `${organization.shortName} - dashboard`,
        layout: "main", ...data
    });
};

module.exports = {
    getDashboard
};
