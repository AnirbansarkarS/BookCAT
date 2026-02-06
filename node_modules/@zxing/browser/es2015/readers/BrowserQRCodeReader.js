import { QRCodeReader } from '@zxing/library';
import { BrowserCodeReader } from './BrowserCodeReader';
/**
 * QR Code reader to use from browser.
 */
export class BrowserQRCodeReader extends BrowserCodeReader {
    /**
     * Creates an instance of BrowserQRCodeReader.
     */
    constructor(hints, options) {
        super(new QRCodeReader(), hints, options);
    }
}
//# sourceMappingURL=BrowserQRCodeReader.js.map