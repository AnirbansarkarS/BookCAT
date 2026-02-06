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
import { DecodeHintType, MultiFormatReader, } from '@zxing/library';
import { BrowserCodeReader } from './BrowserCodeReader';
var BrowserMultiFormatReader = /** @class */ (function (_super) {
    __extends(BrowserMultiFormatReader, _super);
    function BrowserMultiFormatReader(hints, options) {
        var _this = this;
        var reader = new MultiFormatReader();
        reader.setHints(hints);
        _this = _super.call(this, reader, hints, options) || this;
        _this.reader = reader;
        return _this;
    }
    Object.defineProperty(BrowserMultiFormatReader.prototype, "possibleFormats", {
        set: function (formats) {
            this.hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
            this.reader.setHints(this.hints);
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Overwrite decodeBitmap to call decodeWithState, which will pay
     * attention to the hints set in the constructor function
     */
    BrowserMultiFormatReader.prototype.decodeBitmap = function (binaryBitmap) {
        return this.reader.decodeWithState(binaryBitmap);
    };
    /**
     * Allows to change hints in runtime.
     */
    BrowserMultiFormatReader.prototype.setHints = function (hints) {
        this.hints = hints;
        this.reader.setHints(this.hints);
    };
    return BrowserMultiFormatReader;
}(BrowserCodeReader));
export { BrowserMultiFormatReader };
//# sourceMappingURL=BrowserMultiFormatReader.js.map