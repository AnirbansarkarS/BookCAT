import { DecodeHintType, MultiFormatReader, } from '@zxing/library';
import { BrowserCodeReader } from './BrowserCodeReader';
export class BrowserMultiFormatReader extends BrowserCodeReader {
    constructor(hints, options) {
        const reader = new MultiFormatReader();
        reader.setHints(hints);
        super(reader, hints, options);
        this.reader = reader;
    }
    set possibleFormats(formats) {
        this.hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
        this.reader.setHints(this.hints);
    }
    /**
     * Overwrite decodeBitmap to call decodeWithState, which will pay
     * attention to the hints set in the constructor function
     */
    decodeBitmap(binaryBitmap) {
        return this.reader.decodeWithState(binaryBitmap);
    }
    /**
     * Allows to change hints in runtime.
     */
    setHints(hints) {
        this.hints = hints;
        this.reader.setHints(this.hints);
    }
}
//# sourceMappingURL=BrowserMultiFormatReader.js.map