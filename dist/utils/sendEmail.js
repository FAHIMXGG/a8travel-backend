"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
const transporter = nodemailer_1.default.createTransport({
    host: env_1.env.SMTP_HOST,
    port: env_1.env.SMTP_PORT,
    secure: false,
    auth: {
        user: env_1.env.SMTP_USER,
        pass: env_1.env.SMTP_PASS
    }
});
const sendEmail = async (to, subject, html) => {
    await transporter.sendMail({
        from: env_1.env.SMTP_FROM,
        to,
        subject,
        html
    });
};
exports.sendEmail = sendEmail;
