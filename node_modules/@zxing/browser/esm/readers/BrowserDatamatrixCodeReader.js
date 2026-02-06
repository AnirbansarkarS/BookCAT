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
import { DataMatrixReader } from '@zxing/library';
import { BrowserCodeReader } from './BrowserCodeReader';
/**
 * QR Code reader to use from browser.
 */
var BrowserDatamatrixCodeReader = /** @class */ (function (_super) {
    __extends(BrowserDatamatrixCodeReader, _super);
    /**
     * Creates an instance of BrowserQRCodeReader.
     */
    function BrowserDatamatrixCodeReader(hints, options) {
        return _super.call(this, new DataMatrixReader(), hints, options) || this;
    }
    return BrowserDatamatrixCodeReader;
}(BrowserCodeReader));
export { BrowserDatamatrixCodeReader };
//# sourceMappingURL=BrowserDatamatrixCodeReader.js.map