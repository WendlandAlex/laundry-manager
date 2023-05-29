const express      = require("express");
const eventsRoutes = express.Router();


const eventsHandlers                = require("./events.controllers");
const { readUserTokensNonBlocking } = require("../../middleware/auth");

eventsRoutes.post("/insertOneEvent", readUserTokensNonBlocking, (req, res, next) => {
    eventsHandlers.insertOneEvent(req, res, next);
});
eventsRoutes.get("/all", readUserTokensNonBlocking, eventsHandlers.getAllEvents);

// get submit generic event
eventsRoutes.get("/submit", readUserTokensNonBlocking, eventsHandlers.renderForm);

// catchall get one event
eventsRoutes.get("/:dryer_id", readUserTokensNonBlocking, eventsHandlers.getEventsByDryerId);

module.exports = eventsRoutes;
