import { PDF417Reader } from '@zxing/library';
import { BrowserCodeReader } from './BrowserCodeReader';
/**
 * QR Code reader to use from browser.
 */
export class BrowserPDF417Reader extends BrowserCodeReader {
    /**
     * Creates an instance of BrowserPDF417Reader.
     */
    constructor(hints, options) {
        super(new PDF417Reader(), hints, options);
    }
}
//# sourceMappingURL=BrowserPDF417Reader.js.map