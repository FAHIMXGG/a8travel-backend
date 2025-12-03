"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
app_1.default.listen(env_1.env.PORT, () => {
    console.log(`Server running on http://localhost:${env_1.env.PORT}`);
});
// Vercel Node function that forwards everything to your Express app
function handler(req, res) {
    // Express expects (req, res)
    // Type cast to any to avoid TS complaints
    return app_1.default(req, res);
}
