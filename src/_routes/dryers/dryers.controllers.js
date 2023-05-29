const {
          formatDryerEntry,
          getAllDryers
      }                              = require("../../services/dryers");
const {
          laundromat,
      }                              = require("../../../config");
const { getEvent }                   = require("../../lib/db");
const { injectCommonViewAttributes } = require("../../utils/viewRendering");

// get array of all dryers
const getDryers = async (req, res, next) => {
    let data = await getAllDryers();

    res.render("dryers/dryersTable", {
        ...injectCommonViewAttributes(req, res),
        pageTitle: "Dryers",
        layout: "main",
        dryers: data,
        numDryers: laundromat.dryers.numDryers
    });
};

// get one dryer obejct
const getDryer = async (req, res, next) => {

    let data = await getEvent("events", {
        dryer_id: req.params.dryer_id
    }, undefined, "desc");

    res.render("dryers/dryerCard", {
        ...injectCommonViewAttributes(req, res),
        pageTitle: `Dryer ${data.column} ${data.row}`,
        layout: "main",
        dryer: formatDryerEntry(data),
        errorCodes: data.error_codes,
        eventFormRedirectUrl: "/events/submit"
    });
};

module.exports = {
    getDryers,
    getDryer,
};
