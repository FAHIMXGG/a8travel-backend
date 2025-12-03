"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const apiResponse_1 = require("../utils/apiResponse");
const errorHandler = (err, _req, res, _next) => {
    console.error(err);
    const status = err.statusCode || 500;
    return res.status(status).json((0, apiResponse_1.fail)(err.message || "Internal server error", err.errors));
};
exports.errorHandler = errorHandler;
