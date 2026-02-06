"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserAztecCodeReader = void 0;
var library_1 = require("@zxing/library");
var BrowserCodeReader_1 = require("./BrowserCodeReader");
/**
 * Aztec Code reader to use from browser.
 *
 * @class BrowserAztecCodeReader
 * @extends {BrowserCodeReader}
 */
var BrowserAztecCodeReader = /** @class */ (function (_super) {
    __extends(BrowserAztecCodeReader, _super);
    /**
     * Creates an instance of BrowserAztecCodeReader.
     */
    function BrowserAztecCodeReader(hints, options) {
        return _super.call(this, new library_1.AztecCodeReader(), hints, options) || this;
    }
    return BrowserAztecCodeReader;
}(BrowserCodeReader_1.BrowserCodeReader));
exports.BrowserAztecCodeReader = BrowserAztecCodeReader;
//# sourceMappingURL=BrowserAztecCodeReader.js.map