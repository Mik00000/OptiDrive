"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var jwt_1 = require("../src/utils/jwt");
var prisma = new client_1.PrismaClient();
var BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
var filesToTest = [
    {
        url: 'https://picsum.photos/800/600',
        filename: 'test-image.jpg',
        options: {
            format: 'avif',
            quality: '50',
            fit: 'cover',
            width: '400',
        }
    },
    {
        url: 'https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png',
        filename: 'test-image.png',
        options: {
            format: 'webp',
            lossless: 'true',
        }
    },
    {
        url: 'https://upload.wikimedia.org/wikipedia/commons/f/fd/Ghostscript_Tiger.svg',
        filename: 'test-image.svg',
        options: {
            multipass: 'true',
            floatPrecision: '2',
            removeViewBox: 'true',
        }
    },
    {
        url: 'https://media.giphy.com/media/3o7aD2saalEvTEtuGk/giphy.gif',
        filename: 'test-image.gif',
        options: {
            format: 'webp', // Convert GIF to animated WebP
            colors: '128',
        }
    },
    {
        url: 'https://www.gstatic.com/webp/gallery/1.sm.webp',
        filename: 'test-image.webp',
        options: {
            format: 'jpeg',
            quality: '80',
        }
    }
];
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var user, token, _i, filesToTest_1, fileObj, response, buffer, formData, _a, _b, _c, key, value, uploadRes, result, error_1;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    console.log('Starting compression test script...');
                    return [4 /*yield*/, prisma.user.findFirst()];
                case 1:
                    user = _d.sent();
                    if (!user) {
                        console.error('No users found in database. Please register a user first.');
                        process.exit(1);
                    }
                    token = (0, jwt_1.generateToken)(user.id, user.workspaceId);
                    console.log("Using user ".concat(user.email, " (Workspace: ").concat(user.workspaceId, ")"));
                    _i = 0, filesToTest_1 = filesToTest;
                    _d.label = 2;
                case 2:
                    if (!(_i < filesToTest_1.length)) return [3 /*break*/, 10];
                    fileObj = filesToTest_1[_i];
                    console.log("\n--- Testing ".concat(fileObj.filename, " ---"));
                    console.log("Downloading from ".concat(fileObj.url, "..."));
                    _d.label = 3;
                case 3:
                    _d.trys.push([3, 8, , 9]);
                    return [4 /*yield*/, fetch(fileObj.url)];
                case 4:
                    response = _d.sent();
                    if (!response.ok)
                        throw new Error("Failed to download: ".concat(response.statusText));
                    return [4 /*yield*/, response.arrayBuffer()];
                case 5:
                    buffer = _d.sent();
                    formData = new FormData();
                    formData.append('image', new Blob([buffer], { type: response.headers.get('content-type') || 'application/octet-stream' }), fileObj.filename);
                    for (_a = 0, _b = Object.entries(fileObj.options); _a < _b.length; _a++) {
                        _c = _b[_a], key = _c[0], value = _c[1];
                        formData.append(key, value);
                    }
                    console.log("Uploading to ".concat(BACKEND_URL, "/api/internal/media/compress with options:"), fileObj.options);
                    return [4 /*yield*/, fetch("".concat(BACKEND_URL, "/api/internal/media/compress"), {
                            method: 'POST',
                            headers: {
                                'Authorization': "Bearer ".concat(token)
                            },
                            // We don't set Content-Type header, fetch will set it with boundary
                            body: formData,
                        })];
                case 6:
                    uploadRes = _d.sent();
                    return [4 /*yield*/, uploadRes.json()];
                case 7:
                    result = _d.sent();
                    if (uploadRes.ok) {
                        console.log("\u2705 Success! ID: ".concat(result.data.id));
                        console.log("Original: ".concat((result.data.originalSize / 1024).toFixed(2), " KB"));
                        console.log("Optimized: ".concat((result.data.optimizedSize / 1024).toFixed(2), " KB"));
                        console.log("Savings: ".concat(result.data.savingsPercent, "%"));
                        console.log("Format: ".concat(result.data.format));
                        console.log("URL: ".concat(result.data.cdnUrl));
                    }
                    else {
                        console.error("\u274C Failed:", result);
                    }
                    return [3 /*break*/, 9];
                case 8:
                    error_1 = _d.sent();
                    console.error("Error processing ".concat(fileObj.filename, ":"), error_1);
                    return [3 /*break*/, 9];
                case 9:
                    _i++;
                    return [3 /*break*/, 2];
                case 10:
                    console.log('\nAll tests finished.');
                    process.exit(0);
                    return [2 /*return*/];
            }
        });
    });
}
run();
