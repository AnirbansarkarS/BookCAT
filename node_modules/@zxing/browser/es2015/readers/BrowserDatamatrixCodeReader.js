import { DataMatrixReader } from '@zxing/library';
import { BrowserCodeReader } from './BrowserCodeReader';
/**
 * QR Code reader to use from browser.
 */
export class BrowserDatamatrixCodeReader extends BrowserCodeReader {
    /**
     * Creates an instance of BrowserQRCodeReader.
     */
    constructor(hints, options) {
        super(new DataMatrixReader(), hints, options);
    }
}
//# sourceMappingURL=BrowserDatamatrixCodeReader.js.map