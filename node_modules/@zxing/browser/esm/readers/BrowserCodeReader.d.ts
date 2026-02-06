import { BarcodeFormat, BinaryBitmap, DecodeHintType, Reader, Result } from '@zxing/library';
import { DecodeContinuouslyCallback } from '../common/DecodeContinuouslyCallback';
import { HTMLVisualMediaElement } from '../common/HTMLVisualMediaElement';
import { IScannerControls } from '../common/IScannerControls';
import { IBrowserCodeReaderOptions } from './IBrowserCodeReaderOptions';
/**
 * Base class for browser code reader.
 */
export declare class BrowserCodeReader {
    protected readonly reader: Reader;
    hints: Map<DecodeHintType, any>;
    /**
     * Allows to change the possible formats the decoder should
     * search for while scanning some image. Useful for changing
     * the possible formats during BrowserCodeReader::scan.
     */
    set possibleFormats(formats: BarcodeFormat[]);
    /**
     * Defines what the videoElement src will be.
     *
     * @param videoElement
     * @param stream The stream to be added as a source.
     */
    static addVideoSource(videoElement: HTMLVideoElement, stream: MediaStream): void;
    /**
     * Enables or disables the torch in a media stream.
     *
     * @experimental This doesn't work across all browsers and is still a Draft.
     */
    static mediaStreamSetTorch(track: MediaStreamTrack, onOff: boolean): Promise<void>;
    /**
     * Checks if the stream has torch support.
     */
    static mediaStreamIsTorchCompatible(params: MediaStream): boolean;
    /**
     *
     * @param track The media stream track that will be checked for compatibility.
     */
    static mediaStreamIsTorchCompatibleTrack(track: MediaStreamTrack): boolean;
    /**
     * Checks if the given video element is currently playing.
     */
    static isVideoPlaying(video: HTMLVideoElement): boolean;
    /**
     * Searches and validates a media element.
     */
    static getMediaElement(mediaElementId: string, type: string): HTMLVisualMediaElement;
    /**
     * Receives a source and makes sure to return a Video Element from it or fail.
     */
    static createVideoElement(videoThingy?: HTMLVideoElement | string): HTMLVideoElement;
    /**
     * Receives a source and makes sure to return an Image Element from it or fail.
     */
    static prepareImageElement(imageSource?: HTMLImageElement | string): HTMLImageElement;
    /**
     * Sets a HTMLVideoElement for scanning or creates a new one.
     *
     * @param videoElem The HTMLVideoElement to be set.
     */
    static prepareVideoElement(videoElem?: HTMLVideoElement | string): HTMLVideoElement;
    /**
     * Checks if and HTML image is loaded.
     */
    static isImageLoaded(img: HTMLImageElement): boolean;
    /**
     * Creates a binaryBitmap based in a canvas.
     *
     * @param canvas HTML canvas element containing the image source draw.
     */
    static createBinaryBitmapFromCanvas(canvas: HTMLCanvasElement): BinaryBitmap;
    /**
     * Overwriting this allows you to manipulate the snapshot image in anyway you want before decode.
     */
    static drawImageOnCanvas(canvasElementContext: CanvasRenderingContext2D, srcElement: HTMLVisualMediaElement): void;
    static getMediaElementDimensions(mediaElement: HTMLVisualMediaElement): {
        height: number;
        width: number;
    };
    /**
     * 🖌 Prepares the canvas for capture and scan frames.
     */
    static createCaptureCanvas(mediaElement: HTMLVisualMediaElement): HTMLCanvasElement;
    /**
     * Just tries to play the video and logs any errors.
     * The play call is only made is the video is not already playing.
     */
    static tryPlayVideo(videoElement: HTMLVideoElement): Promise<boolean>;
    /**
     * Creates a canvas and draws the current image frame from the media element on it.
     *
     * @param mediaElement HTML media element to extract an image frame from.
     */
    static createCanvasFromMediaElement(mediaElement: HTMLVisualMediaElement): HTMLCanvasElement;
    /**
     * Creates a binaryBitmap based in some image source.
     *
     * @param mediaElement HTML element containing drawable image source.
     */
    static createBinaryBitmapFromMediaElem(mediaElement: HTMLVisualMediaElement): BinaryBitmap;
    static destroyImageElement(imageElement: HTMLImageElement): void;
    /**
     * Lists all the available video input devices.
     */
    static listVideoInputDevices(): Promise<MediaDeviceInfo[]>;
    /**
     * Let's you find a device using it's Id.
     */
    static findDeviceById(deviceId: string): Promise<MediaDeviceInfo | undefined>;
    /**
     * Unbinds a HTML video src property.
     */
    static cleanVideoSource(videoElement: HTMLVideoElement): void;
    /**
     * Stops all media streams that are created.
     */
    static releaseAllStreams(): void;
    /**
     * Waits for a video to load and then hits play on it.
     * To accomplish that, it binds listeners and callbacks to the video element.
     *
     * @param element The video element.
     * @param callbackFn Callback invoked when the video is played.
     */
    protected static playVideoOnLoadAsync(element: HTMLVideoElement, timeout: number): Promise<boolean>;
    /**
     * Sets the new stream and request a new decoding-with-delay.
     *
     * @param stream The stream to be shown in the video element.
     * @param decodeFn A callback for the decode method.
     */
    protected static attachStreamToVideo(stream: MediaStream, preview?: string | HTMLVideoElement, previewPlayTimeout?: number): Promise<HTMLVideoElement>;
    /**
     * Keeps track to created media streams.
     * @private there is no need this array to be accessible from outside.
     */
    private static streamTracker;
    /**
     * Returns a Promise that resolves when the given image element loads.
     */
    private static _waitImageLoad;
    /**
     * Checks if the `callbackFn` is defined, otherwise throws.
     */
    private static checkCallbackFnOrThrow;
    /**
     * Standard method to dispose a media stream object.
     */
    private static disposeMediaStream;
    /**
     * BrowserCodeReader specific configuration options.
     */
    protected readonly options: IBrowserCodeReaderOptions;
    /**
     * Creates an instance of BrowserCodeReader.
     * @param {Reader} reader The reader instance to decode the barcode
     * @param hints Holds the hints the user sets for the Reader.
     */
    constructor(reader: Reader, hints?: Map<DecodeHintType, any>, options?: IBrowserCodeReaderOptions);
    /**
     * Gets the BinaryBitmap for ya! (and decodes it)
     */
    decode(element: HTMLVisualMediaElement): Result;
    /**
     * Call the encapsulated readers decode
     */
    decodeBitmap(binaryBitmap: BinaryBitmap): Result;
    /**
     * Decodes some barcode from a canvas!
     */
    decodeFromCanvas(canvas: HTMLCanvasElement): Result;
    /**
     * Decodes something from an image HTML element.
     */
    decodeFromImageElement(source: string | HTMLImageElement): Promise<Result>;
    /**
     * Decodes an image from a URL.
     */
    decodeFromImageUrl(url?: string): Promise<Result>;
    /**
     * Continuously tries to decode the barcode from a stream obtained from the given constraints
     * while showing the video in the specified video element.
     *
     * @param {MediaStream} [constraints] the media stream constraints to get s valid media stream to decode from
     * @param {string|HTMLVideoElement} [previewElem] the video element in page where to show the video while
     *  decoding. Can be either an element id or directly an HTMLVideoElement. Can be undefined, in
     *  which case no video will be shown.
     */
    decodeFromConstraints(constraints: MediaStreamConstraints, previewElem: string | HTMLVideoElement | undefined, callbackFn: DecodeContinuouslyCallback): Promise<IScannerControls>;
    /**
     * In one attempt, tries to decode the barcode from a stream obtained from the given constraints
     * while showing the video in the specified video element.
     *
     * @param {MediaStream} [constraints] the media stream constraints to get s valid media stream to decode from
     * @param {string|HTMLVideoElement} [preview] the video element in page where to show the video
     *  while decoding. Can be either an element id or directly an HTMLVideoElement. Can be undefined,
     *  in which case no video will be shown.
     */
    decodeFromStream(stream: MediaStream, preview: string | HTMLVideoElement | undefined, callbackFn: DecodeContinuouslyCallback): Promise<IScannerControls>;
    /**
     * Continuously tries to decode the barcode from the device specified by device while showing
     * the video in the specified video element.
     *
     * @param {string|null} [deviceId] the id of one of the devices obtained after calling
     *  getVideoInputDevices. Can be undefined, in this case it will decode from one of the
     *  available devices, preferring the main camera (environment facing) if available.
     * @param {string|HTMLVideoElement|null} [video] the video element in page where to show the video
     *  while decoding. Can be either an element id or directly an HTMLVideoElement. Can be undefined,
     *  in which case no video will be shown.
     */
    decodeFromVideoDevice(deviceId: string | undefined, previewElem: string | HTMLVideoElement | undefined, callbackFn: DecodeContinuouslyCallback): Promise<IScannerControls>;
    /**
     * Decodes something from an image HTML element.
     */
    decodeFromVideoElement(source: string | HTMLVideoElement, callbackFn: DecodeContinuouslyCallback): Promise<IScannerControls>;
    /**
     * Decodes a video from a URL until it ends.
     */
    decodeFromVideoUrl(url: string, callbackFn: DecodeContinuouslyCallback): Promise<IScannerControls>;
    /**
     * In one attempt, tries to decode the barcode from a stream obtained from the given
     * constraints while showing the video in the specified video element.
     *
     * @param constraints the media stream constraints to get s valid media stream to decode from
     * @param videoSource the video element in page where to show the video while decoding.
     *  Can be either an element id or directly an HTMLVideoElement. Can be undefined,
     *  in which case no video will be shown.
     *  The decoding result.
     */
    decodeOnceFromConstraints(constraints: MediaStreamConstraints, videoSource?: string | HTMLVideoElement): Promise<Result>;
    /**
     * In one attempt, tries to decode the barcode from a stream obtained from the given
     * constraints while showing the video in the specified video element.
     *
     * @param {MediaStream} [constraints] the media stream constraints to get s valid media stream to decode from
     * @param {string|HTMLVideoElement} [video] the video element in page where to show the video while decoding.
     *  Can be either an element id or directly an HTMLVideoElement. Can be undefined,
     *  in which case no video will be shown.
     */
    decodeOnceFromStream(stream: MediaStream, preview?: string | HTMLVideoElement): Promise<Result>;
    /**
     * In one attempt, tries to decode the barcode from the device specified by deviceId
     * while showing the video in the specified video element.
     *
     * @param deviceId the id of one of the devices obtained after calling getVideoInputDevices.
     *  Can be undefined, in this case it will decode from one of the available devices,
     *  preferring the main camera (environment facing) if available.
     * @param videoSource the video element in page where to show the video while decoding.
     *  Can be either an element id or directly an HTMLVideoElement. Can be undefined,
     *  in which case no video will be shown.
     */
    decodeOnceFromVideoDevice(deviceId?: string, videoSource?: string | HTMLVideoElement): Promise<Result>;
    /**
     * Decodes something from an image HTML element.
     */
    decodeOnceFromVideoElement(source: string | HTMLVideoElement): Promise<Result>;
    /**
     * Decodes a video from a URL.
     */
    decodeOnceFromVideoUrl(url: string): Promise<Result>;
    /**
     * Tries to decode from the video input until it finds some value.
     */
    scanOneResult(element: HTMLVisualMediaElement, retryIfNotFound?: boolean, retryIfChecksumError?: boolean, retryIfFormatError?: boolean): Promise<Result>;
    /**
     * Continuously decodes from video input.
     *
     * @param element HTML element to scan/decode from. It will not be disposed or destroyed.
     * @param callbackFn Called after every scan attempt, being it successful or errored.
     * @param finalizeCallback Called after scan process reaches the end or stop is called.
     */
    scan(element: HTMLVisualMediaElement, callbackFn: DecodeContinuouslyCallback, finalizeCallback?: (error?: Error) => void): IScannerControls;
    /**
     * Waits for the image to load and then tries to decode it.
     */
    private _decodeOnLoadImage;
    /**
     * Get MediaStream from browser to be used.
     * @param constraints constraints the media stream constraints to get s valid media stream to decode from.
     * @private For private use.
     */
    private getUserMedia;
}
