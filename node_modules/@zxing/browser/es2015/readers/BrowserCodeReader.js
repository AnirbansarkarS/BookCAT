var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ArgumentException, BinaryBitmap, ChecksumException, DecodeHintType, FormatException, HybridBinarizer, NotFoundException, } from '@zxing/library';
import { HTMLCanvasElementLuminanceSource } from '../common/HTMLCanvasElementLuminanceSource';
import { canEnumerateDevices, hasNavigator } from '../common/navigator-utils';
const defaultOptions = {
    delayBetweenScanAttempts: 500,
    delayBetweenScanSuccess: 500,
    tryPlayVideoTimeout: 5000,
};
/**
 * Base class for browser code reader.
 */
export class BrowserCodeReader {
    /**
     * Creates an instance of BrowserCodeReader.
     * @param {Reader} reader The reader instance to decode the barcode
     * @param hints Holds the hints the user sets for the Reader.
     */
    constructor(reader, hints = new Map(), options = {}) {
        this.reader = reader;
        this.hints = hints;
        this.options = Object.assign(Object.assign({}, defaultOptions), options);
    }
    /**
     * Allows to change the possible formats the decoder should
     * search for while scanning some image. Useful for changing
     * the possible formats during BrowserCodeReader::scan.
     */
    set possibleFormats(formats) {
        this.hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    }
    /**
     * Defines what the videoElement src will be.
     *
     * @param videoElement
     * @param stream The stream to be added as a source.
     */
    static addVideoSource(videoElement, stream) {
        // Older browsers may not have `srcObject`
        try {
            // @note Throws Exception if interrupted by a new loaded request
            videoElement.srcObject = stream;
        }
        catch (err) {
            console.error("got interrupted by new loading request");
        }
    }
    /**
     * Enables or disables the torch in a media stream.
     *
     * @experimental This doesn't work across all browsers and is still a Draft.
     */
    static mediaStreamSetTorch(track, onOff) {
        return __awaiter(this, void 0, void 0, function* () {
            yield track.applyConstraints({
                advanced: [{
                        fillLightMode: onOff ? 'flash' : 'off',
                        torch: onOff ? true : false,
                    }],
            });
        });
    }
    /**
     * Checks if the stream has torch support.
     */
    static mediaStreamIsTorchCompatible(params) {
        const tracks = params.getVideoTracks();
        for (const track of tracks) {
            if (BrowserCodeReader.mediaStreamIsTorchCompatibleTrack(track)) {
                return true;
            }
        }
        return false;
    }
    /**
     *
     * @param track The media stream track that will be checked for compatibility.
     */
    static mediaStreamIsTorchCompatibleTrack(track) {
        try {
            const capabilities = track.getCapabilities();
            return 'torch' in capabilities;
        }
        catch (err) {
            // some browsers may not be compatible with ImageCapture
            // so we are ignoring this for now.
            // tslint:disable-next-line:no-console
            console.error(err);
            // tslint:disable-next-line:no-console
            console.warn('Your browser may be not fully compatible with WebRTC and/or ImageCapture specs. Torch will not be available.');
            return false;
        }
    }
    /**
     * Checks if the given video element is currently playing.
     */
    static isVideoPlaying(video) {
        return video.currentTime > 0 && !video.paused && video.readyState > 2;
    }
    /**
     * Searches and validates a media element.
     */
    static getMediaElement(mediaElementId, type) {
        const mediaElement = document.getElementById(mediaElementId);
        if (!mediaElement) {
            throw new ArgumentException(`element with id '${mediaElementId}' not found`);
        }
        if (mediaElement.nodeName.toLowerCase() !== type.toLowerCase()) {
            throw new ArgumentException(`element with id '${mediaElementId}' must be an ${type} element`);
        }
        return mediaElement;
    }
    /**
     * Receives a source and makes sure to return a Video Element from it or fail.
     */
    static createVideoElement(videoThingy) {
        if (videoThingy instanceof HTMLVideoElement) {
            return videoThingy;
        }
        if (typeof videoThingy === 'string') {
            return BrowserCodeReader.getMediaElement(videoThingy, 'video');
        }
        if (!videoThingy && typeof document !== 'undefined') {
            const videoElement = document.createElement('video');
            videoElement.width = 200;
            videoElement.height = 200;
            return videoElement;
        }
        throw new Error('Couldn\'t get videoElement from videoSource!');
    }
    /**
     * Receives a source and makes sure to return an Image Element from it or fail.
     */
    static prepareImageElement(imageSource) {
        if (imageSource instanceof HTMLImageElement) {
            return imageSource;
        }
        if (typeof imageSource === 'string') {
            return BrowserCodeReader.getMediaElement(imageSource, 'img');
        }
        if (typeof imageSource === 'undefined') {
            const imageElement = document.createElement('img');
            imageElement.width = 200;
            imageElement.height = 200;
            return imageElement;
        }
        throw new Error('Couldn\'t get imageElement from imageSource!');
    }
    /**
     * Sets a HTMLVideoElement for scanning or creates a new one.
     *
     * @param videoElem The HTMLVideoElement to be set.
     */
    static prepareVideoElement(videoElem) {
        const videoElement = BrowserCodeReader.createVideoElement(videoElem);
        // @todo the following lines should not always be done this way, should conditionally
        // change according were we created the element or not
        // Needed for iOS 11
        videoElement.setAttribute('autoplay', 'true');
        videoElement.setAttribute('muted', 'true');
        videoElement.setAttribute('playsinline', 'true');
        return videoElement;
    }
    /**
     * Checks if and HTML image is loaded.
     */
    static isImageLoaded(img) {
        // During the onload event, IE correctly identifies any images that
        // weren't downloaded as not complete. Others should too. Gecko-based
        // browsers act like NS4 in that they report this incorrectly.
        if (!img.complete) {
            return false;
        }
        // However, they do have two very useful properties: naturalWidth and
        // naturalHeight. These give the true size of the image. If it failed
        // to load, either of these should be zero.
        if (img.naturalWidth === 0) {
            return false;
        }
        // No other way of checking: assume it’s ok.
        return true;
    }
    /**
     * Creates a binaryBitmap based in a canvas.
     *
     * @param canvas HTML canvas element containing the image source draw.
     */
    static createBinaryBitmapFromCanvas(canvas) {
        const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
        const hybridBinarizer = new HybridBinarizer(luminanceSource);
        return new BinaryBitmap(hybridBinarizer);
    }
    /**
     * Overwriting this allows you to manipulate the snapshot image in anyway you want before decode.
     */
    static drawImageOnCanvas(canvasElementContext, srcElement) {
        canvasElementContext.drawImage(srcElement, 0, 0);
    }
    static getMediaElementDimensions(mediaElement) {
        if (mediaElement instanceof HTMLVideoElement) {
            return {
                height: mediaElement.videoHeight,
                width: mediaElement.videoWidth,
            };
        }
        if (mediaElement instanceof HTMLImageElement) {
            return {
                height: mediaElement.naturalHeight || mediaElement.height,
                width: mediaElement.naturalWidth || mediaElement.width,
            };
        }
        throw new Error('Couldn\'t find the Source\'s dimensions!');
    }
    /**
     * 🖌 Prepares the canvas for capture and scan frames.
     */
    static createCaptureCanvas(mediaElement) {
        if (!mediaElement) {
            throw new ArgumentException('Cannot create a capture canvas without a media element.');
        }
        if (typeof document === 'undefined') {
            throw new Error('The page "Document" is undefined, make sure you\'re running in a browser.');
        }
        const canvasElement = document.createElement('canvas');
        const { width, height } = BrowserCodeReader.getMediaElementDimensions(mediaElement);
        canvasElement.style.width = width + 'px';
        canvasElement.style.height = height + 'px';
        canvasElement.width = width;
        canvasElement.height = height;
        return canvasElement;
    }
    /**
     * Just tries to play the video and logs any errors.
     * The play call is only made is the video is not already playing.
     */
    static tryPlayVideo(videoElement) {
        return __awaiter(this, void 0, void 0, function* () {
            if (videoElement === null || videoElement === void 0 ? void 0 : videoElement.ended) {
                // tslint:disable-next-line:no-console
                console.error('Trying to play video that has ended.');
                return false;
            }
            if (BrowserCodeReader.isVideoPlaying(videoElement)) {
                // tslint:disable-next-line:no-console
                console.warn('Trying to play video that is already playing.');
                return true;
            }
            try {
                yield videoElement.play();
                return true;
            }
            catch (error) {
                // tslint:disable-next-line:no-console
                console.warn('It was not possible to play the video.', error);
                return false;
            }
        });
    }
    /**
     * Creates a canvas and draws the current image frame from the media element on it.
     *
     * @param mediaElement HTML media element to extract an image frame from.
     */
    static createCanvasFromMediaElement(mediaElement) {
        const canvas = BrowserCodeReader.createCaptureCanvas(mediaElement);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Couldn\'t find Canvas 2D Context.');
        }
        BrowserCodeReader.drawImageOnCanvas(ctx, mediaElement);
        return canvas;
    }
    /**
     * Creates a binaryBitmap based in some image source.
     *
     * @param mediaElement HTML element containing drawable image source.
     */
    static createBinaryBitmapFromMediaElem(mediaElement) {
        const canvas = BrowserCodeReader.createCanvasFromMediaElement(mediaElement);
        return BrowserCodeReader.createBinaryBitmapFromCanvas(canvas);
    }
    static destroyImageElement(imageElement) {
        imageElement.src = '';
        imageElement.removeAttribute('src');
        imageElement = undefined;
    }
    /**
     * Lists all the available video input devices.
     */
    static listVideoInputDevices() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!hasNavigator()) {
                throw new Error('Can\'t enumerate devices, navigator is not present.');
            }
            if (!canEnumerateDevices()) {
                throw new Error('Can\'t enumerate devices, method not supported.');
            }
            const devices = yield navigator.mediaDevices.enumerateDevices();
            const videoDevices = [];
            for (const device of devices) {
                const kind = device.kind === 'video' ? 'videoinput' : device.kind;
                if (kind !== 'videoinput') {
                    continue;
                }
                const deviceId = device.deviceId || device.id;
                const label = device.label || `Video device ${videoDevices.length + 1}`;
                const groupId = device.groupId;
                const videoDevice = { deviceId, label, kind, groupId };
                videoDevices.push(videoDevice);
            }
            return videoDevices;
        });
    }
    /**
     * Let's you find a device using it's Id.
     */
    static findDeviceById(deviceId) {
        return __awaiter(this, void 0, void 0, function* () {
            const devices = yield BrowserCodeReader.listVideoInputDevices();
            if (!devices) {
                return;
            }
            return devices.find((x) => x.deviceId === deviceId);
        });
    }
    /**
     * Unbinds a HTML video src property.
     */
    static cleanVideoSource(videoElement) {
        if (!videoElement) {
            return;
        }
        // forgets about that element 😢
        try {
            videoElement.srcObject = null;
        }
        catch (err) {
            videoElement.src = '';
        }
        if (videoElement) {
            videoElement.removeAttribute('src');
        }
    }
    /**
     * Stops all media streams that are created.
     */
    static releaseAllStreams() {
        if (BrowserCodeReader.streamTracker.length !== 0) {
            // tslint:disable-next-line:no-console
            BrowserCodeReader.streamTracker.forEach((mediaStream) => {
                mediaStream.getTracks().forEach((track) => track.stop());
            });
        }
        BrowserCodeReader.streamTracker = [];
    }
    /**
     * Waits for a video to load and then hits play on it.
     * To accomplish that, it binds listeners and callbacks to the video element.
     *
     * @param element The video element.
     * @param callbackFn Callback invoked when the video is played.
     */
    static playVideoOnLoadAsync(element, timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            // if canplay was already fired, we won't know when to play, so just give it a try
            const isPlaying = yield BrowserCodeReader.tryPlayVideo(element);
            if (isPlaying) {
                return true;
            }
            return new Promise((resolve, reject) => {
                // waits 3 seconds or rejects.
                const timeoutId = setTimeout(() => {
                    if (BrowserCodeReader.isVideoPlaying(element)) {
                        // if video is playing then we had success, just ignore
                        return;
                    }
                    reject(false);
                    element.removeEventListener('canplay', videoCanPlayListener);
                }, timeout);
                /**
                 * Should contain the current registered listener for video loaded-metadata,
                 * used to unregister that listener when needed.
                 */
                const videoCanPlayListener = () => {
                    BrowserCodeReader.tryPlayVideo(element).then((hasPlayed) => {
                        clearTimeout(timeoutId);
                        element.removeEventListener('canplay', videoCanPlayListener);
                        resolve(hasPlayed);
                    });
                };
                // both should be unregistered after called
                element.addEventListener('canplay', videoCanPlayListener);
            });
        });
    }
    /**
     * Sets the new stream and request a new decoding-with-delay.
     *
     * @param stream The stream to be shown in the video element.
     * @param decodeFn A callback for the decode method.
     */
    static attachStreamToVideo(stream, preview, previewPlayTimeout = 5000) {
        return __awaiter(this, void 0, void 0, function* () {
            const videoElement = BrowserCodeReader.prepareVideoElement(preview);
            BrowserCodeReader.addVideoSource(videoElement, stream);
            yield BrowserCodeReader.playVideoOnLoadAsync(videoElement, previewPlayTimeout);
            return videoElement;
        });
    }
    /**
     * Returns a Promise that resolves when the given image element loads.
     */
    static _waitImageLoad(element) {
        return new Promise((resolve, reject) => {
            const timeout = 10000;
            // waits 10 seconds or rejects.
            const timeoutId = setTimeout(() => {
                if (BrowserCodeReader.isImageLoaded(element)) {
                    // if video is playing then we had success, just ignore
                    return;
                }
                // removes the listener
                element.removeEventListener('load', imageLoadedListener);
                // rejects the load
                reject();
            }, timeout);
            const imageLoadedListener = () => {
                clearTimeout(timeoutId);
                // removes the listener
                element.removeEventListener('load', imageLoadedListener);
                // resolves the load
                resolve();
            };
            element.addEventListener('load', imageLoadedListener);
        });
    }
    /**
     * Checks if the `callbackFn` is defined, otherwise throws.
     */
    static checkCallbackFnOrThrow(callbackFn) {
        if (!callbackFn) {
            throw new ArgumentException('`callbackFn` is a required parameter, you cannot capture results without it.');
        }
    }
    /**
     * Standard method to dispose a media stream object.
     */
    static disposeMediaStream(stream) {
        stream.getVideoTracks().forEach((x) => x.stop());
        stream = undefined;
    }
    /**
     * Gets the BinaryBitmap for ya! (and decodes it)
     */
    decode(element) {
        // get binary bitmap for decode function
        const canvas = BrowserCodeReader.createCanvasFromMediaElement(element);
        return this.decodeFromCanvas(canvas);
    }
    /**
     * Call the encapsulated readers decode
     */
    decodeBitmap(binaryBitmap) {
        return this.reader.decode(binaryBitmap, this.hints);
    }
    /**
     * Decodes some barcode from a canvas!
     */
    decodeFromCanvas(canvas) {
        const binaryBitmap = BrowserCodeReader.createBinaryBitmapFromCanvas(canvas);
        return this.decodeBitmap(binaryBitmap);
    }
    /**
     * Decodes something from an image HTML element.
     */
    decodeFromImageElement(source) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!source) {
                throw new ArgumentException('An image element must be provided.');
            }
            const element = BrowserCodeReader.prepareImageElement(source);
            // onLoad will remove it's callback once done
            // we do not need to dispose or destroy the image
            // since it came from the user
            return yield this._decodeOnLoadImage(element);
        });
    }
    /**
     * Decodes an image from a URL.
     */
    decodeFromImageUrl(url) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!url) {
                throw new ArgumentException('An URL must be provided.');
            }
            const element = BrowserCodeReader.prepareImageElement();
            // loads the image.
            element.src = url;
            try {
                // it waits the task so we can destroy the created image after
                return yield this.decodeFromImageElement(element);
            }
            finally {
                // we created this element, so we destroy it
                BrowserCodeReader.destroyImageElement(element);
            }
        });
    }
    /**
     * Continuously tries to decode the barcode from a stream obtained from the given constraints
     * while showing the video in the specified video element.
     *
     * @param {MediaStream} [constraints] the media stream constraints to get s valid media stream to decode from
     * @param {string|HTMLVideoElement} [previewElem] the video element in page where to show the video while
     *  decoding. Can be either an element id or directly an HTMLVideoElement. Can be undefined, in
     *  which case no video will be shown.
     */
    decodeFromConstraints(constraints, previewElem, callbackFn) {
        return __awaiter(this, void 0, void 0, function* () {
            BrowserCodeReader.checkCallbackFnOrThrow(callbackFn);
            const stream = yield this.getUserMedia(constraints);
            try {
                return yield this.decodeFromStream(stream, previewElem, callbackFn);
            }
            catch (error) {
                BrowserCodeReader.disposeMediaStream(stream);
                throw error;
            }
        });
    }
    /**
     * In one attempt, tries to decode the barcode from a stream obtained from the given constraints
     * while showing the video in the specified video element.
     *
     * @param {MediaStream} [constraints] the media stream constraints to get s valid media stream to decode from
     * @param {string|HTMLVideoElement} [preview] the video element in page where to show the video
     *  while decoding. Can be either an element id or directly an HTMLVideoElement. Can be undefined,
     *  in which case no video will be shown.
     */
    decodeFromStream(stream, preview, callbackFn) {
        return __awaiter(this, void 0, void 0, function* () {
            BrowserCodeReader.checkCallbackFnOrThrow(callbackFn);
            const timeout = this.options.tryPlayVideoTimeout;
            const video = yield BrowserCodeReader.attachStreamToVideo(stream, preview, timeout);
            // IF we receive a stream from the user, it's not our job to dispose it
            const finalizeCallback = () => {
                // stops video tracks and releases the stream reference
                BrowserCodeReader.disposeMediaStream(stream);
                // this video was just a preview, so in order
                // to release the stream we gotta stop showing
                // it (the stream) in the video element
                BrowserCodeReader.cleanVideoSource(video);
            };
            const originalControls = this.scan(video, callbackFn, finalizeCallback);
            const videoTracks = stream.getVideoTracks();
            const controls = Object.assign(Object.assign({}, originalControls), { stop() {
                    originalControls.stop();
                },
                streamVideoConstraintsApply(constraints, trackFilter) {
                    return __awaiter(this, void 0, void 0, function* () {
                        const tracks = trackFilter ? videoTracks.filter(trackFilter) : videoTracks;
                        for (const track of tracks) {
                            yield track.applyConstraints(constraints);
                        }
                    });
                },
                streamVideoConstraintsGet(trackFilter) {
                    return videoTracks.find(trackFilter).getConstraints();
                },
                streamVideoSettingsGet(trackFilter) {
                    return videoTracks.find(trackFilter).getSettings();
                },
                streamVideoCapabilitiesGet(trackFilter) {
                    return videoTracks.find(trackFilter).getCapabilities();
                } });
            const isTorchAvailable = BrowserCodeReader.mediaStreamIsTorchCompatible(stream);
            if (isTorchAvailable) {
                const torchTrack = videoTracks === null || videoTracks === void 0 ? void 0 : videoTracks.find((t) => BrowserCodeReader.mediaStreamIsTorchCompatibleTrack(t));
                const switchTorch = (onOff) => __awaiter(this, void 0, void 0, function* () {
                    yield BrowserCodeReader.mediaStreamSetTorch(torchTrack, onOff);
                });
                controls.switchTorch = switchTorch;
                controls.stop = () => __awaiter(this, void 0, void 0, function* () {
                    originalControls.stop();
                    yield switchTorch(false);
                });
            }
            return controls;
        });
    }
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
    decodeFromVideoDevice(deviceId, previewElem, callbackFn) {
        return __awaiter(this, void 0, void 0, function* () {
            BrowserCodeReader.checkCallbackFnOrThrow(callbackFn);
            let videoConstraints;
            if (!deviceId) {
                videoConstraints = { facingMode: 'environment' };
            }
            else {
                videoConstraints = { deviceId: { exact: deviceId } };
            }
            const constraints = { video: videoConstraints };
            return yield this.decodeFromConstraints(constraints, previewElem, callbackFn);
        });
    }
    /**
     * Decodes something from an image HTML element.
     */
    decodeFromVideoElement(source, callbackFn) {
        return __awaiter(this, void 0, void 0, function* () {
            BrowserCodeReader.checkCallbackFnOrThrow(callbackFn);
            if (!source) {
                throw new ArgumentException('A video element must be provided.');
            }
            // we do not create a video element
            const element = BrowserCodeReader.prepareVideoElement(source);
            const timeout = this.options.tryPlayVideoTimeout;
            // plays the video
            yield BrowserCodeReader.playVideoOnLoadAsync(element, timeout);
            // starts decoding after played the video
            return this.scan(element, callbackFn);
        });
    }
    /**
     * Decodes a video from a URL until it ends.
     */
    decodeFromVideoUrl(url, callbackFn) {
        return __awaiter(this, void 0, void 0, function* () {
            BrowserCodeReader.checkCallbackFnOrThrow(callbackFn);
            if (!url) {
                throw new ArgumentException('An URL must be provided.');
            }
            // creates a new element
            const element = BrowserCodeReader.prepareVideoElement();
            // starts loading the video
            element.src = url;
            const finalizeCallback = () => {
                // dispose created video element
                BrowserCodeReader.cleanVideoSource(element);
            };
            const timeout = this.options.tryPlayVideoTimeout;
            // plays the video
            yield BrowserCodeReader.playVideoOnLoadAsync(element, timeout);
            // starts decoding after played the video
            const controls = this.scan(element, callbackFn, finalizeCallback);
            return controls;
        });
    }
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
    decodeOnceFromConstraints(constraints, videoSource) {
        return __awaiter(this, void 0, void 0, function* () {
            const stream = yield this.getUserMedia(constraints);
            return yield this.decodeOnceFromStream(stream, videoSource);
        });
    }
    /**
     * In one attempt, tries to decode the barcode from a stream obtained from the given
     * constraints while showing the video in the specified video element.
     *
     * @param {MediaStream} [constraints] the media stream constraints to get s valid media stream to decode from
     * @param {string|HTMLVideoElement} [video] the video element in page where to show the video while decoding.
     *  Can be either an element id or directly an HTMLVideoElement. Can be undefined,
     *  in which case no video will be shown.
     */
    decodeOnceFromStream(stream, preview) {
        return __awaiter(this, void 0, void 0, function* () {
            const receivedPreview = Boolean(preview);
            const video = yield BrowserCodeReader.attachStreamToVideo(stream, preview);
            try {
                const result = yield this.scanOneResult(video);
                return result;
            }
            finally {
                if (!receivedPreview) {
                    BrowserCodeReader.cleanVideoSource(video);
                }
            }
        });
    }
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
    decodeOnceFromVideoDevice(deviceId, videoSource) {
        return __awaiter(this, void 0, void 0, function* () {
            let videoConstraints;
            if (!deviceId) {
                videoConstraints = { facingMode: 'environment' };
            }
            else {
                videoConstraints = { deviceId: { exact: deviceId } };
            }
            const constraints = { video: videoConstraints };
            return yield this.decodeOnceFromConstraints(constraints, videoSource);
        });
    }
    /**
     * Decodes something from an image HTML element.
     */
    decodeOnceFromVideoElement(source) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!source) {
                throw new ArgumentException('A video element must be provided.');
            }
            // we do not create a video element
            const element = BrowserCodeReader.prepareVideoElement(source);
            const timeout = this.options.tryPlayVideoTimeout;
            // plays the video
            yield BrowserCodeReader.playVideoOnLoadAsync(element, timeout);
            // starts decoding after played the video
            return yield this.scanOneResult(element);
        });
    }
    /**
     * Decodes a video from a URL.
     */
    decodeOnceFromVideoUrl(url) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!url) {
                throw new ArgumentException('An URL must be provided.');
            }
            // creates a new element
            const element = BrowserCodeReader.prepareVideoElement();
            // starts loading the video
            element.src = url;
            const task = this.decodeOnceFromVideoElement(element);
            try {
                // it waits the task so we can destroy the created image after
                return yield task;
            }
            finally {
                // we created this element, so we destroy it
                BrowserCodeReader.cleanVideoSource(element);
            }
        });
    }
    /**
     * Tries to decode from the video input until it finds some value.
     */
    scanOneResult(element, retryIfNotFound = true, retryIfChecksumError = true, retryIfFormatError = true) {
        return new Promise((resolve, reject) => {
            // reuses the scan API, but returns at the first successful result
            this.scan(element, (result, error, controls) => {
                if (result) {
                    // good result, returning
                    resolve(result);
                    controls.stop();
                    return;
                }
                if (error) {
                    // checks if it should retry
                    if (error instanceof NotFoundException && retryIfNotFound) {
                        return;
                    }
                    if (error instanceof ChecksumException && retryIfChecksumError) {
                        return;
                    }
                    if (error instanceof FormatException && retryIfFormatError) {
                        return;
                    }
                    // not re-trying
                    controls.stop(); // stops scan loop
                    reject(error); // returns the error
                }
            });
        });
    }
    /**
     * Continuously decodes from video input.
     *
     * @param element HTML element to scan/decode from. It will not be disposed or destroyed.
     * @param callbackFn Called after every scan attempt, being it successful or errored.
     * @param finalizeCallback Called after scan process reaches the end or stop is called.
     */
    scan(element, callbackFn, finalizeCallback) {
        BrowserCodeReader.checkCallbackFnOrThrow(callbackFn);
        /**
         * The HTML canvas element, used to draw the video or image's frame for decoding.
         */
        let captureCanvas = BrowserCodeReader.createCaptureCanvas(element);
        /**
         * The HTML canvas element context.
         */
        let captureCanvasContext;
        try {
            captureCanvasContext = captureCanvas.getContext('2d', { willReadFrequently: true });
        }
        catch (e) {
            captureCanvasContext = captureCanvas.getContext('2d');
        }
        // cannot proceed w/o this
        if (!captureCanvasContext) {
            throw new Error('Couldn\'t create canvas for visual element scan.');
        }
        const disposeCanvas = () => {
            captureCanvasContext = undefined;
            captureCanvas = undefined;
        };
        let stopScan = false;
        let lastTimeoutId;
        // can be called to break the scan loop
        const stop = () => {
            stopScan = true;
            clearTimeout(lastTimeoutId);
            disposeCanvas();
            if (finalizeCallback) {
                finalizeCallback();
            }
        };
        // created for extensibility
        const controls = { stop };
        // this async loop allows infinite (or almost? maybe) scans
        const loop = () => {
            if (stopScan) {
                // no need to clear timeouts as none was create yet in this scope.
                return;
            }
            try {
                BrowserCodeReader.drawImageOnCanvas(captureCanvasContext, element);
                const result = this.decodeFromCanvas(captureCanvas);
                callbackFn(result, undefined, controls);
                lastTimeoutId = setTimeout(loop, this.options.delayBetweenScanSuccess);
            }
            catch (error) {
                callbackFn(undefined, error, controls);
                const isChecksumError = error instanceof ChecksumException;
                const isFormatError = error instanceof FormatException;
                const isNotFound = error instanceof NotFoundException;
                if (isChecksumError || isFormatError || isNotFound) {
                    // trying again
                    lastTimeoutId = setTimeout(loop, this.options.delayBetweenScanAttempts);
                    return;
                }
                // not trying again
                disposeCanvas();
                if (finalizeCallback) {
                    finalizeCallback(error);
                }
            }
        };
        // starts the async loop
        loop();
        return controls;
    }
    /**
     * Waits for the image to load and then tries to decode it.
     */
    _decodeOnLoadImage(element) {
        return __awaiter(this, void 0, void 0, function* () {
            const isImageLoaded = BrowserCodeReader.isImageLoaded(element);
            if (!isImageLoaded) {
                yield BrowserCodeReader._waitImageLoad(element);
            }
            return this.decode(element);
        });
    }
    /**
     * Get MediaStream from browser to be used.
     * @param constraints constraints the media stream constraints to get s valid media stream to decode from.
     * @private For private use.
     */
    getUserMedia(constraints) {
        return __awaiter(this, void 0, void 0, function* () {
            const stream = yield navigator.mediaDevices.getUserMedia(constraints);
            BrowserCodeReader.streamTracker.push(stream);
            return stream;
        });
    }
}
/**
 * Keeps track to created media streams.
 * @private there is no need this array to be accessible from outside.
 */
BrowserCodeReader.streamTracker = [];
//# sourceMappingURL=BrowserCodeReader.js.map