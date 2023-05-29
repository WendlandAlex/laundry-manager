const express                       = require("express");
const { readUserTokensNonBlocking } = require("../../middleware/auth");

const dryersRoutes      = express.Router();
const dryersControllers = require("./dryers.controllers");

// get all dryers explicitly
dryersRoutes.get("/all", readUserTokensNonBlocking, dryersControllers.getDryers);

// get one dryer
dryersRoutes.get("/:dryer_id", readUserTokensNonBlocking, dryersControllers.getDryer);

// catchall get all dryers implicitly
dryersRoutes.get("/", readUserTokensNonBlocking, dryersControllers.getDryers);

module.exports = dryersRoutes;
