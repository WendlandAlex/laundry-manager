const express     = require("express");
const adminRoutes = express.Router();

const adminControllers           = require("./admin.controllers");
const { authenticateAdminToken } = require("../../middleware/auth");

adminRoutes.route("/login")
           .get(adminControllers.renderAdminLoginForm)
           .post((req, res, next) => {
               adminControllers.submitAdminLoginForm(req, res, next);
           });

adminRoutes.route("/lol")
           .post(authenticateAdminToken, (req, res, next) => {
               adminControllers.rebootSystem(req, res, next);
           });

adminRoutes.route("/washdays/:createdAt")
           .get(authenticateAdminToken, adminControllers.renderWashdayAdminPanel)
           .post(authenticateAdminToken, (req, res, next) => {
               adminControllers.modifyAllPeople(req, res, next);
           });

adminRoutes.route("/")
           .get(authenticateAdminToken, adminControllers.renderApproveWashdayUsersForm)
           .post(authenticateAdminToken, (req, res, next) => {
               adminControllers.submitApproveWashdayUsersForm(req, res, next);
           });

module.exports = adminRoutes;
