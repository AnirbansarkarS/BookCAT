import { LuminanceSource } from '@zxing/library';
export declare class HTMLCanvasElementLuminanceSource extends LuminanceSource {
    private canvas;
    private static DEGREE_TO_RADIANS;
    private static makeBufferFromCanvasImageData;
    private static toGrayscaleBuffer;
    private buffer;
    private tempCanvasElement?;
    constructor(canvas: HTMLCanvasElement);
    getRow(y: number, row: Uint8ClampedArray): Uint8ClampedArray;
    getMatrix(): Uint8ClampedArray;
    isCropSupported(): boolean;
    crop(left: number, top: number, width: number, height: number): LuminanceSource;
    /**
     * This is always true, since the image is a gray-scale image.
     *
     * @return true
     */
    isRotateSupported(): boolean;
    rotateCounterClockwise(): LuminanceSource;
    rotateCounterClockwise45(): LuminanceSource;
    invert(): LuminanceSource;
    private getTempCanvasElement;
    private rotate;
}
