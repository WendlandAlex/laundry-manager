const express = require("express");
const { readUserTokensNonBlocking } = require("../../middleware/auth");

const dashboardRoutes = express.Router();
const dashboardControllers = require("./dashboard.controllers");

dashboardRoutes.get("/dashboard", readUserTokensNonBlocking, dashboardControllers.getDashboard);
dashboardRoutes.get("/", readUserTokensNonBlocking, dashboardControllers.getDashboard);

module.exports = dashboardRoutes;
