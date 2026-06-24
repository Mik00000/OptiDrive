"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = void 0;
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';
var generateToken = function (userId, workspaceId) {
    return jsonwebtoken_1.default.sign({ userId: userId, workspaceId: workspaceId }, JWT_SECRET, { expiresIn: '14d' });
};
exports.generateToken = generateToken;
var verifyToken = function (token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
};
exports.verifyToken = verifyToken;
