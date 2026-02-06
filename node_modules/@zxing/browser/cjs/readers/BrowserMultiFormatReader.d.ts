import { BarcodeFormat, BinaryBitmap, DecodeHintType, MultiFormatReader, Result } from '@zxing/library';
import { BrowserCodeReader } from './BrowserCodeReader';
import { IBrowserCodeReaderOptions } from './IBrowserCodeReaderOptions';
export declare class BrowserMultiFormatReader extends BrowserCodeReader {
    set possibleFormats(formats: BarcodeFormat[]);
    protected readonly reader: MultiFormatReader;
    constructor(hints?: Map<DecodeHintType, any>, options?: IBrowserCodeReaderOptions);
    /**
     * Overwrite decodeBitmap to call decodeWithState, which will pay
     * attention to the hints set in the constructor function
     */
    decodeBitmap(binaryBitmap: BinaryBitmap): Result;
    /**
     * Allows to change hints in runtime.
     */
    setHints(hints: Map<DecodeHintType, any>): void;
}
