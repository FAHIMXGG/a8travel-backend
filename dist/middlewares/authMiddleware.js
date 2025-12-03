"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authGuard = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const apiResponse_1 = require("../utils/apiResponse");
const authGuard = (roles) => {
    return (req, res, next) => {
        try {
            const token = req.cookies[env_1.env.COOKIE_NAME] ||
                (req.headers.authorization?.startsWith("Bearer ")
                    ? req.headers.authorization.split(" ")[1]
                    : null);
            if (!token) {
                return res.status(401).json((0, apiResponse_1.fail)("Unauthorized"));
            }
            const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
            if (!decoded) {
                return res.status(401).json((0, apiResponse_1.fail)("Invalid token"));
            }
            if (roles && !roles.includes(decoded.role)) {
                return res.status(403).json((0, apiResponse_1.fail)("Forbidden"));
            }
            req.user = { id: decoded.id, role: decoded.role };
            next();
        }
        catch (error) {
            return res.status(401).json((0, apiResponse_1.fail)("Unauthorized"));
        }
    };
};
exports.authGuard = authGuard;
