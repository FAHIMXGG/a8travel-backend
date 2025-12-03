"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fail = exports.ok = void 0;
const ok = (data, message = "OK") => ({
    success: true,
    message,
    data
});
exports.ok = ok;
const fail = (message = "Something went wrong", errors) => ({
    success: false,
    message,
    errors
});
exports.fail = fail;
