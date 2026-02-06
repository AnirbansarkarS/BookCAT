import { AztecCodeReader } from '@zxing/library';
import { BrowserCodeReader } from './BrowserCodeReader';
/**
 * Aztec Code reader to use from browser.
 *
 * @class BrowserAztecCodeReader
 * @extends {BrowserCodeReader}
 */
export class BrowserAztecCodeReader extends BrowserCodeReader {
    /**
     * Creates an instance of BrowserAztecCodeReader.
     */
    constructor(hints, options) {
        super(new AztecCodeReader(), hints, options);
    }
}
//# sourceMappingURL=BrowserAztecCodeReader.js.map