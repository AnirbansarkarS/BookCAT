"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserCodeReader = void 0;
var library_1 = require("@zxing/library");
var HTMLCanvasElementLuminanceSource_1 = require("../common/HTMLCanvasElementLuminanceSource");
var navigator_utils_1 = require("../common/navigator-utils");
var defaultOptions = {
    delayBetweenScanAttempts: 500,
    delayBetweenScanSuccess: 500,
    tryPlayVideoTimeout: 5000,
};
/**
 * Base class for browser code reader.
 */
var BrowserCodeReader = /** @class */ (function () {
    /**
     * Creates an instance of BrowserCodeReader.
     * @param {Reader} reader The reader instance to decode the barcode
     * @param hints Holds the hints the user sets for the Reader.
     */
    function BrowserCodeReader(reader, hints, options) {
        if (hints === void 0) { hints = new Map(); }
        if (options === void 0) { options = {}; }
        this.reader = reader;
        this.hints = hints;
        this.options = __assign(__assign({}, defaultOptions), options);
    }
    Object.defineProperty(BrowserCodeReader.prototype, "possibleFormats", {
        /**
         * Allows to change the possible formats the decoder should
         * search for while scanning some image. Useful for changing
         * the possible formats during BrowserCodeReader::scan.
         */
        set: function (formats) {
            this.hints.set(library_1.DecodeHintType.POSSIBLE_FORMATS, formats);
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Defines what the videoElement src will be.
     *
     * @param videoElement
     * @param stream The stream to be added as a source.
     */
    BrowserCodeReader.addVideoSource = function (videoElement, stream) {
        // Older browsers may not have `srcObject`
        try {
            // @note Throws Exception if interrupted by a new loaded request
            videoElement.srcObject = stream;
        }
        catch (err) {
            console.error("got interrupted by new loading request");
        }
    };
    /**
     * Enables or disables the torch in a media stream.
     *
     * @experimental This doesn't work across all browsers and is still a Draft.
     */
    BrowserCodeReader.mediaStreamSetTorch = function (track, onOff) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, track.applyConstraints({
                            advanced: [{
                                    fillLightMode: onOff ? 'flash' : 'off',
                                    torch: onOff ? true : false,
                                }],
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Checks if the stream has torch support.
     */
    BrowserCodeReader.mediaStreamIsTorchCompatible = function (params) {
        var e_1, _a;
        var tracks = params.getVideoTracks();
        try {
            for (var tracks_1 = __values(tracks), tracks_1_1 = tracks_1.next(); !tracks_1_1.done; tracks_1_1 = tracks_1.next()) {
                var track = tracks_1_1.value;
                if (BrowserCodeReader.mediaStreamIsTorchCompatibleTrack(track)) {
                    return true;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (tracks_1_1 && !tracks_1_1.done && (_a = tracks_1.return)) _a.call(tracks_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return false;
    };
    /**
     *
     * @param track The media stream track that will be checked for compatibility.
     */
    BrowserCodeReader.mediaStreamIsTorchCompatibleTrack = function (track) {
        try {
            var capabilities = track.getCapabilities();
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
    };
    /**
     * Checks if the given video element is currently playing.
     */
    BrowserCodeReader.isVideoPlaying = function (video) {
        return video.currentTime > 0 && !video.paused && video.readyState > 2;
    };
    /**
     * Searches and validates a media element.
     */
    BrowserCodeReader.getMediaElement = function (mediaElementId, type) {
        var mediaElement = document.getElementById(mediaElementId);
        if (!mediaElement) {
            throw new library_1.ArgumentException("element with id '".concat(mediaElementId, "' not found"));
        }
        if (mediaElement.nodeName.toLowerCase() !== type.toLowerCase()) {
            throw new library_1.ArgumentException("element with id '".concat(mediaElementId, "' must be an ").concat(type, " element"));
        }
        return mediaElement;
    };
    /**
     * Receives a source and makes sure to return a Video Element from it or fail.
     */
    BrowserCodeReader.createVideoElement = function (videoThingy) {
        if (videoThingy instanceof HTMLVideoElement) {
            return videoThingy;
        }
        if (typeof videoThingy === 'string') {
            return BrowserCodeReader.getMediaElement(videoThingy, 'video');
        }
        if (!videoThingy && typeof document !== 'undefined') {
            var videoElement = document.createElement('video');
            videoElement.width = 200;
            videoElement.height = 200;
            return videoElement;
        }
        throw new Error('Couldn\'t get videoElement from videoSource!');
    };
    /**
     * Receives a source and makes sure to return an Image Element from it or fail.
     */
    BrowserCodeReader.prepareImageElement = function (imageSource) {
        if (imageSource instanceof HTMLImageElement) {
            return imageSource;
        }
        if (typeof imageSource === 'string') {
            return BrowserCodeReader.getMediaElement(imageSource, 'img');
        }
        if (typeof imageSource === 'undefined') {
            var imageElement = document.createElement('img');
            imageElement.width = 200;
            imageElement.height = 200;
            return imageElement;
        }
        throw new Error('Couldn\'t get imageElement from imageSource!');
    };
    /**
     * Sets a HTMLVideoElement for scanning or creates a new one.
     *
     * @param videoElem The HTMLVideoElement to be set.
     */
    BrowserCodeReader.prepareVideoElement = function (videoElem) {
        var videoElement = BrowserCodeReader.createVideoElement(videoElem);
        // @todo the following lines should not always be done this way, should conditionally
        // change according were we created the element or not
        // Needed for iOS 11
        videoElement.setAttribute('autoplay', 'true');
        videoElement.setAttribute('muted', 'true');
        videoElement.setAttribute('playsinline', 'true');
        return videoElement;
    };
    /**
     * Checks if and HTML image is loaded.
     */
    BrowserCodeReader.isImageLoaded = function (img) {
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
    };
    /**
     * Creates a binaryBitmap based in a canvas.
     *
     * @param canvas HTML canvas element containing the image source draw.
     */
    BrowserCodeReader.createBinaryBitmapFromCanvas = function (canvas) {
        var luminanceSource = new HTMLCanvasElementLuminanceSource_1.HTMLCanvasElementLuminanceSource(canvas);
        var hybridBinarizer = new library_1.HybridBinarizer(luminanceSource);
        return new library_1.BinaryBitmap(hybridBinarizer);
    };
    /**
     * Overwriting this allows you to manipulate the snapshot image in anyway you want before decode.
     */
    BrowserCodeReader.drawImageOnCanvas = function (canvasElementContext, srcElement) {
        canvasElementContext.drawImage(srcElement, 0, 0);
    };
    BrowserCodeReader.getMediaElementDimensions = function (mediaElement) {
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
    };
    /**
     * 🖌 Prepares the canvas for capture and scan frames.
     */
    BrowserCodeReader.createCaptureCanvas = function (mediaElement) {
        if (!mediaElement) {
            throw new library_1.ArgumentException('Cannot create a capture canvas without a media element.');
        }
        if (typeof document === 'undefined') {
            throw new Error('The page "Document" is undefined, make sure you\'re running in a browser.');
        }
        var canvasElement = document.createElement('canvas');
        var _a = BrowserCodeReader.getMediaElementDimensions(mediaElement), width = _a.width, height = _a.height;
        canvasElement.style.width = width + 'px';
        canvasElement.style.height = height + 'px';
        canvasElement.width = width;
        canvasElement.height = height;
        return canvasElement;
    };
    /**
     * Just tries to play the video and logs any errors.
     * The play call is only made is the video is not already playing.
     */
    BrowserCodeReader.tryPlayVideo = function (videoElement) {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (videoElement === null || videoElement === void 0 ? void 0 : videoElement.ended) {
                            // tslint:disable-next-line:no-console
                            console.error('Trying to play video that has ended.');
                            return [2 /*return*/, false];
                        }
                        if (BrowserCodeReader.isVideoPlaying(videoElement)) {
                            // tslint:disable-next-line:no-console
                            console.warn('Trying to play video that is already playing.');
                            return [2 /*return*/, true];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, videoElement.play()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 3:
                        error_1 = _a.sent();
                        // tslint:disable-next-line:no-console
                        console.warn('It was not possible to play the video.', error_1);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Creates a canvas and draws the current image frame from the media element on it.
     *
     * @param mediaElement HTML media element to extract an image frame from.
     */
    BrowserCodeReader.createCanvasFromMediaElement = function (mediaElement) {
        var canvas = BrowserCodeReader.createCaptureCanvas(mediaElement);
        var ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Couldn\'t find Canvas 2D Context.');
        }
        BrowserCodeReader.drawImageOnCanvas(ctx, mediaElement);
        return canvas;
    };
    /**
     * Creates a binaryBitmap based in some image source.
     *
     * @param mediaElement HTML element containing drawable image source.
     */
    BrowserCodeReader.createBinaryBitmapFromMediaElem = function (mediaElement) {
        var canvas = BrowserCodeReader.createCanvasFromMediaElement(mediaElement);
        return BrowserCodeReader.createBinaryBitmapFromCanvas(canvas);
    };
    BrowserCodeReader.destroyImageElement = function (imageElement) {
        imageElement.src = '';
        imageElement.removeAttribute('src');
        imageElement = undefined;
    };
    /**
     * Lists all the available video input devices.
     */
    BrowserCodeReader.listVideoInputDevices = function () {
        return __awaiter(this, void 0, void 0, function () {
            var devices, videoDevices, devices_1, devices_1_1, device, kind, deviceId, label, groupId, videoDevice;
            var e_2, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(0, navigator_utils_1.hasNavigator)()) {
                            throw new Error('Can\'t enumerate devices, navigator is not present.');
                        }
                        if (!(0, navigator_utils_1.canEnumerateDevices)()) {
                            throw new Error('Can\'t enumerate devices, method not supported.');
                        }
                        return [4 /*yield*/, navigator.mediaDevices.enumerateDevices()];
                    case 1:
                        devices = _b.sent();
                        videoDevices = [];
                        try {
                            for (devices_1 = __values(devices), devices_1_1 = devices_1.next(); !devices_1_1.done; devices_1_1 = devices_1.next()) {
                                device = devices_1_1.value;
                                kind = device.kind === 'video' ? 'videoinput' : device.kind;
                                if (kind !== 'videoinput') {
                                    continue;
                                }
                                deviceId = device.deviceId || device.id;
                                label = device.label || "Video device ".concat(videoDevices.length + 1);
                                groupId = device.groupId;
                                videoDevice = { deviceId: deviceId, label: label, kind: kind, groupId: groupId };
                                videoDevices.push(videoDevice);
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (devices_1_1 && !devices_1_1.done && (_a = devices_1.return)) _a.call(devices_1);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                        return [2 /*return*/, videoDevices];
                }
            });
        });
    };
    /**
     * Let's you find a device using it's Id.
     */
    BrowserCodeReader.findDeviceById = function (deviceId) {
        return __awaiter(this, void 0, void 0, function () {
            var devices;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, BrowserCodeReader.listVideoInputDevices()];
                    case 1:
                        devices = _a.sent();
                        if (!devices) {
                            return [2 /*return*/];
                        }
                        return [2 /*return*/, devices.find(function (x) { return x.deviceId === deviceId; })];
                }
            });
        });
    };
    /**
     * Unbinds a HTML video src property.
     */
    BrowserCodeReader.cleanVideoSource = function (videoElement) {
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
    };
    /**
     * Stops all media streams that are created.
     */
    BrowserCodeReader.releaseAllStreams = function () {
        if (BrowserCodeReader.streamTracker.length !== 0) {
            // tslint:disable-next-line:no-console
            BrowserCodeReader.streamTracker.forEach(function (mediaStream) {
                mediaStream.getTracks().forEach(function (track) { return track.stop(); });
            });
        }
        BrowserCodeReader.streamTracker = [];
    };
    /**
     * Waits for a video to load and then hits play on it.
     * To accomplish that, it binds listeners and callbacks to the video element.
     *
     * @param element The video element.
     * @param callbackFn Callback invoked when the video is played.
     */
    BrowserCodeReader.playVideoOnLoadAsync = function (element, timeout) {
        return __awaiter(this, void 0, void 0, function () {
            var isPlaying;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, BrowserCodeReader.tryPlayVideo(element)];
                    case 1:
                        isPlaying = _a.sent();
                        if (isPlaying) {
                            return [2 /*return*/, true];
                        }
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                // waits 3 seconds or rejects.
                                var timeoutId = setTimeout(function () {
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
                                var videoCanPlayListener = function () {
                                    BrowserCodeReader.tryPlayVideo(element).then(function (hasPlayed) {
                                        clearTimeout(timeoutId);
                                        element.removeEventListener('canplay', videoCanPlayListener);
                                        resolve(hasPlayed);
                                    });
                                };
                                // both should be unregistered after called
                                element.addEventListener('canplay', videoCanPlayListener);
                            })];
                }
            });
        });
    };
    /**
     * Sets the new stream and request a new decoding-with-delay.
     *
     * @param stream The stream to be shown in the video element.
     * @param decodeFn A callback for the decode method.
     */
    BrowserCodeReader.attachStreamToVideo = function (stream, preview, previewPlayTimeout) {
        if (previewPlayTimeout === void 0) { previewPlayTimeout = 5000; }
        return __awaiter(this, void 0, void 0, function () {
            var videoElement;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        videoElement = BrowserCodeReader.prepareVideoElement(preview);
                        BrowserCodeReader.addVideoSource(videoElement, stream);
                        return [4 /*yield*/, BrowserCodeReader.playVideoOnLoadAsync(videoElement, previewPlayTimeout)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, videoElement];
                }
            });
        });
    };
    /**
     * Returns a Promise that resolves when the given image element loads.
     */
    BrowserCodeReader._waitImageLoad = function (element) {
        return new Promise(function (resolve, reject) {
            var timeout = 10000;
            // waits 10 seconds or rejects.
            var timeoutId = setTimeout(function () {
                if (BrowserCodeReader.isImageLoaded(element)) {
                    // if video is playing then we had success, just ignore
                    return;
                }
                // removes the listener
                element.removeEventListener('load', imageLoadedListener);
                // rejects the load
                reject();
            }, timeout);
            var imageLoadedListener = function () {
                clearTimeout(timeoutId);
                // removes the listener
                element.removeEventListener('load', imageLoadedListener);
                // resolves the load
                resolve();
            };
            element.addEventListener('load', imageLoadedListener);
        });
    };
    /**
     * Checks if the `callbackFn` is defined, otherwise throws.
     */
    BrowserCodeReader.checkCallbackFnOrThrow = function (callbackFn) {
        if (!callbackFn) {
            throw new library_1.ArgumentException('`callbackFn` is a required parameter, you cannot capture results without it.');
        }
    };
    /**
     * Standard method to dispose a media stream object.
     */
    BrowserCodeReader.disposeMediaStream = function (stream) {
        stream.getVideoTracks().forEach(function (x) { return x.stop(); });
        stream = undefined;
    };
    /**
     * Gets the BinaryBitmap for ya! (and decodes it)
     */
    BrowserCodeReader.prototype.decode = function (element) {
        // get binary bitmap for decode function
        var canvas = BrowserCodeReader.createCanvasFromMediaElement(element);
        return this.decodeFromCanvas(canvas);
    };
    /**
     * Call the encapsulated readers decode
     */
    BrowserCodeReader.prototype.decodeBitmap = function (binaryBitmap) {
        return this.reader.decode(binaryBitmap, this.hints);
    };
    /**
     * Decodes some barcode from a canvas!
     */
    BrowserCodeReader.prototype.decodeFromCanvas = function (canvas) {
        var binaryBitmap = BrowserCodeReader.createBinaryBitmapFromCanvas(canvas);
        return this.decodeBitmap(binaryBitmap);
    };
    /**
     * Decodes something from an image HTML element.
     */
    BrowserCodeReader.prototype.decodeFromImageElement = function (source) {
        return __awaiter(this, void 0, void 0, function () {
            var element;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!source) {
                            throw new library_1.ArgumentException('An image element must be provided.');
                        }
                        element = BrowserCodeReader.prepareImageElement(source);
                        return [4 /*yield*/, this._decodeOnLoadImage(element)];
                    case 1: 
                    // onLoad will remove it's callback once done
                    // we do not need to dispose or destroy the image
                    // since it came from the user
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Decodes an image from a URL.
     */
    BrowserCodeReader.prototype.decodeFromImageUrl = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var element;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!url) {
                            throw new library_1.ArgumentException('An URL must be provided.');
                        }
                        element = BrowserCodeReader.prepareImageElement();
                        // loads the image.
                        element.src = url;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 3, 4]);
                        return [4 /*yield*/, this.decodeFromImageElement(element)];
                    case 2: 
                    // it waits the task so we can destroy the created image after
                    return [2 /*return*/, _a.sent()];
                    case 3:
                        // we created this element, so we destroy it
                        BrowserCodeReader.destroyImageElement(element);
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Continuously tries to decode the barcode from a stream obtained from the given constraints
     * while showing the video in the specified video element.
     *
     * @param {MediaStream} [constraints] the media stream constraints to get s valid media stream to decode from
     * @param {string|HTMLVideoElement} [previewElem] the video element in page where to show the video while
     *  decoding. Can be either an element id or directly an HTMLVideoElement. Can be undefined, in
     *  which case no video will be shown.
     */
    BrowserCodeReader.prototype.decodeFromConstraints = function (constraints, previewElem, callbackFn) {
        return __awaiter(this, void 0, void 0, function () {
            var stream, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        BrowserCodeReader.checkCallbackFnOrThrow(callbackFn);
                        return [4 /*yield*/, this.getUserMedia(constraints)];
                    case 1:
                        stream = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.decodeFromStream(stream, previewElem, callbackFn)];
                    case 3: return [2 /*return*/, _a.sent()];
                    case 4:
                        error_2 = _a.sent();
                        BrowserCodeReader.disposeMediaStream(stream);
                        throw error_2;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * In one attempt, tries to decode the barcode from a stream obtained from the given constraints
     * while showing the video in the specified video element.
     *
     * @param {MediaStream} [constraints] the media stream constraints to get s valid media stream to decode from
     * @param {string|HTMLVideoElement} [preview] the video element in page where to show the video
     *  while decoding. Can be either an element id or directly an HTMLVideoElement. Can be undefined,
     *  in which case no video will be shown.
     */
    BrowserCodeReader.prototype.decodeFromStream = function (stream, preview, callbackFn) {
        return __awaiter(this, void 0, void 0, function () {
            var timeout, video, finalizeCallback, originalControls, videoTracks, controls, isTorchAvailable, torchTrack_1, switchTorch_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        BrowserCodeReader.checkCallbackFnOrThrow(callbackFn);
                        timeout = this.options.tryPlayVideoTimeout;
                        return [4 /*yield*/, BrowserCodeReader.attachStreamToVideo(stream, preview, timeout)];
                    case 1:
                        video = _a.sent();
                        finalizeCallback = function () {
                            // stops video tracks and releases the stream reference
                            BrowserCodeReader.disposeMediaStream(stream);
                            // this video was just a preview, so in order
                            // to release the stream we gotta stop showing
                            // it (the stream) in the video element
                            BrowserCodeReader.cleanVideoSource(video);
                        };
                        originalControls = this.scan(video, callbackFn, finalizeCallback);
                        videoTracks = stream.getVideoTracks();
                        controls = __assign(__assign({}, originalControls), { stop: function () {
                                originalControls.stop();
                            }, streamVideoConstraintsApply: function (constraints, trackFilter) {
                                return __awaiter(this, void 0, void 0, function () {
                                    var tracks, tracks_2, tracks_2_1, track, e_3_1;
                                    var e_3, _a;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                tracks = trackFilter ? videoTracks.filter(trackFilter) : videoTracks;
                                                _b.label = 1;
                                            case 1:
                                                _b.trys.push([1, 6, 7, 8]);
                                                tracks_2 = __values(tracks), tracks_2_1 = tracks_2.next();
                                                _b.label = 2;
                                            case 2:
                                                if (!!tracks_2_1.done) return [3 /*break*/, 5];
                                                track = tracks_2_1.value;
                                                return [4 /*yield*/, track.applyConstraints(constraints)];
                                            case 3:
                                                _b.sent();
                                                _b.label = 4;
                                            case 4:
                                                tracks_2_1 = tracks_2.next();
                                                return [3 /*break*/, 2];
                                            case 5: return [3 /*break*/, 8];
                                            case 6:
                                                e_3_1 = _b.sent();
                                                e_3 = { error: e_3_1 };
                                                return [3 /*break*/, 8];
                                            case 7:
                                                try {
                                                    if (tracks_2_1 && !tracks_2_1.done && (_a = tracks_2.return)) _a.call(tracks_2);
                                                }
                                                finally { if (e_3) throw e_3.error; }
                                                return [7 /*endfinally*/];
                                            case 8: return [2 /*return*/];
                                        }
                                    });
                                });
                            }, streamVideoConstraintsGet: function (trackFilter) {
                                return videoTracks.find(trackFilter).getConstraints();
                            }, streamVideoSettingsGet: function (trackFilter) {
                                return videoTracks.find(trackFilter).getSettings();
                            }, streamVideoCapabilitiesGet: function (trackFilter) {
                                return videoTracks.find(trackFilter).getCapabilities();
                            } });
                        isTorchAvailable = BrowserCodeReader.mediaStreamIsTorchCompatible(stream);
                        if (isTorchAvailable) {
                            torchTrack_1 = videoTracks === null || videoTracks === void 0 ? void 0 : videoTracks.find(function (t) { return BrowserCodeReader.mediaStreamIsTorchCompatibleTrack(t); });
                            switchTorch_1 = function (onOff) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, BrowserCodeReader.mediaStreamSetTorch(torchTrack_1, onOff)];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); };
                            controls.switchTorch = switchTorch_1;
                            controls.stop = function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            originalControls.stop();
                                            return [4 /*yield*/, switchTorch_1(false)];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); };
                        }
                        return [2 /*return*/, controls];
                }
            });
        });
    };
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
    BrowserCodeReader.prototype.decodeFromVideoDevice = function (deviceId, previewElem, callbackFn) {
        return __awaiter(this, void 0, void 0, function () {
            var videoConstraints, constraints;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        BrowserCodeReader.checkCallbackFnOrThrow(callbackFn);
                        if (!deviceId) {
                            videoConstraints = { facingMode: 'environment' };
                        }
                        else {
                            videoConstraints = { deviceId: { exact: deviceId } };
                        }
                        constraints = { video: videoConstraints };
                        return [4 /*yield*/, this.decodeFromConstraints(constraints, previewElem, callbackFn)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Decodes something from an image HTML element.
     */
    BrowserCodeReader.prototype.decodeFromVideoElement = function (source, callbackFn) {
        return __awaiter(this, void 0, void 0, function () {
            var element, timeout;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        BrowserCodeReader.checkCallbackFnOrThrow(callbackFn);
                        if (!source) {
                            throw new library_1.ArgumentException('A video element must be provided.');
                        }
                        element = BrowserCodeReader.prepareVideoElement(source);
                        timeout = this.options.tryPlayVideoTimeout;
                        // plays the video
                        return [4 /*yield*/, BrowserCodeReader.playVideoOnLoadAsync(element, timeout)];
                    case 1:
                        // plays the video
                        _a.sent();
                        // starts decoding after played the video
                        return [2 /*return*/, this.scan(element, callbackFn)];
                }
            });
        });
    };
    /**
     * Decodes a video from a URL until it ends.
     */
    BrowserCodeReader.prototype.decodeFromVideoUrl = function (url, callbackFn) {
        return __awaiter(this, void 0, void 0, function () {
            var element, finalizeCallback, timeout, controls;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        BrowserCodeReader.checkCallbackFnOrThrow(callbackFn);
                        if (!url) {
                            throw new library_1.ArgumentException('An URL must be provided.');
                        }
                        element = BrowserCodeReader.prepareVideoElement();
                        // starts loading the video
                        element.src = url;
                        finalizeCallback = function () {
                            // dispose created video element
                            BrowserCodeReader.cleanVideoSource(element);
                        };
                        timeout = this.options.tryPlayVideoTimeout;
                        // plays the video
                        return [4 /*yield*/, BrowserCodeReader.playVideoOnLoadAsync(element, timeout)];
                    case 1:
                        // plays the video
                        _a.sent();
                        controls = this.scan(element, callbackFn, finalizeCallback);
                        return [2 /*return*/, controls];
                }
            });
        });
    };
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
    BrowserCodeReader.prototype.decodeOnceFromConstraints = function (constraints, videoSource) {
        return __awaiter(this, void 0, void 0, function () {
            var stream;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getUserMedia(constraints)];
                    case 1:
                        stream = _a.sent();
                        return [4 /*yield*/, this.decodeOnceFromStream(stream, videoSource)];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * In one attempt, tries to decode the barcode from a stream obtained from the given
     * constraints while showing the video in the specified video element.
     *
     * @param {MediaStream} [constraints] the media stream constraints to get s valid media stream to decode from
     * @param {string|HTMLVideoElement} [video] the video element in page where to show the video while decoding.
     *  Can be either an element id or directly an HTMLVideoElement. Can be undefined,
     *  in which case no video will be shown.
     */
    BrowserCodeReader.prototype.decodeOnceFromStream = function (stream, preview) {
        return __awaiter(this, void 0, void 0, function () {
            var receivedPreview, video, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        receivedPreview = Boolean(preview);
                        return [4 /*yield*/, BrowserCodeReader.attachStreamToVideo(stream, preview)];
                    case 1:
                        video = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, , 4, 5]);
                        return [4 /*yield*/, this.scanOneResult(video)];
                    case 3:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 4:
                        if (!receivedPreview) {
                            BrowserCodeReader.cleanVideoSource(video);
                        }
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
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
    BrowserCodeReader.prototype.decodeOnceFromVideoDevice = function (deviceId, videoSource) {
        return __awaiter(this, void 0, void 0, function () {
            var videoConstraints, constraints;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!deviceId) {
                            videoConstraints = { facingMode: 'environment' };
                        }
                        else {
                            videoConstraints = { deviceId: { exact: deviceId } };
                        }
                        constraints = { video: videoConstraints };
                        return [4 /*yield*/, this.decodeOnceFromConstraints(constraints, videoSource)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Decodes something from an image HTML element.
     */
    BrowserCodeReader.prototype.decodeOnceFromVideoElement = function (source) {
        return __awaiter(this, void 0, void 0, function () {
            var element, timeout;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!source) {
                            throw new library_1.ArgumentException('A video element must be provided.');
                        }
                        element = BrowserCodeReader.prepareVideoElement(source);
                        timeout = this.options.tryPlayVideoTimeout;
                        // plays the video
                        return [4 /*yield*/, BrowserCodeReader.playVideoOnLoadAsync(element, timeout)];
                    case 1:
                        // plays the video
                        _a.sent();
                        return [4 /*yield*/, this.scanOneResult(element)];
                    case 2: 
                    // starts decoding after played the video
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Decodes a video from a URL.
     */
    BrowserCodeReader.prototype.decodeOnceFromVideoUrl = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var element, task;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!url) {
                            throw new library_1.ArgumentException('An URL must be provided.');
                        }
                        element = BrowserCodeReader.prepareVideoElement();
                        // starts loading the video
                        element.src = url;
                        task = this.decodeOnceFromVideoElement(element);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 3, 4]);
                        return [4 /*yield*/, task];
                    case 2: 
                    // it waits the task so we can destroy the created image after
                    return [2 /*return*/, _a.sent()];
                    case 3:
                        // we created this element, so we destroy it
                        BrowserCodeReader.cleanVideoSource(element);
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Tries to decode from the video input until it finds some value.
     */
    BrowserCodeReader.prototype.scanOneResult = function (element, retryIfNotFound, retryIfChecksumError, retryIfFormatError) {
        var _this = this;
        if (retryIfNotFound === void 0) { retryIfNotFound = true; }
        if (retryIfChecksumError === void 0) { retryIfChecksumError = true; }
        if (retryIfFormatError === void 0) { retryIfFormatError = true; }
        return new Promise(function (resolve, reject) {
            // reuses the scan API, but returns at the first successful result
            _this.scan(element, function (result, error, controls) {
                if (result) {
                    // good result, returning
                    resolve(result);
                    controls.stop();
                    return;
                }
                if (error) {
                    // checks if it should retry
                    if (error instanceof library_1.NotFoundException && retryIfNotFound) {
                        return;
                    }
                    if (error instanceof library_1.ChecksumException && retryIfChecksumError) {
                        return;
                    }
                    if (error instanceof library_1.FormatException && retryIfFormatError) {
                        return;
                    }
                    // not re-trying
                    controls.stop(); // stops scan loop
                    reject(error); // returns the error
                }
            });
        });
    };
    /**
     * Continuously decodes from video input.
     *
     * @param element HTML element to scan/decode from. It will not be disposed or destroyed.
     * @param callbackFn Called after every scan attempt, being it successful or errored.
     * @param finalizeCallback Called after scan process reaches the end or stop is called.
     */
    BrowserCodeReader.prototype.scan = function (element, callbackFn, finalizeCallback) {
        var _this = this;
        BrowserCodeReader.checkCallbackFnOrThrow(callbackFn);
        /**
         * The HTML canvas element, used to draw the video or image's frame for decoding.
         */
        var captureCanvas = BrowserCodeReader.createCaptureCanvas(element);
        /**
         * The HTML canvas element context.
         */
        var captureCanvasContext;
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
        var disposeCanvas = function () {
            captureCanvasContext = undefined;
            captureCanvas = undefined;
        };
        var stopScan = false;
        var lastTimeoutId;
        // can be called to break the scan loop
        var stop = function () {
            stopScan = true;
            clearTimeout(lastTimeoutId);
            disposeCanvas();
            if (finalizeCallback) {
                finalizeCallback();
            }
        };
        // created for extensibility
        var controls = { stop: stop };
        // this async loop allows infinite (or almost? maybe) scans
        var loop = function () {
            if (stopScan) {
                // no need to clear timeouts as none was create yet in this scope.
                return;
            }
            try {
                BrowserCodeReader.drawImageOnCanvas(captureCanvasContext, element);
                var result = _this.decodeFromCanvas(captureCanvas);
                callbackFn(result, undefined, controls);
                lastTimeoutId = setTimeout(loop, _this.options.delayBetweenScanSuccess);
            }
            catch (error) {
                callbackFn(undefined, error, controls);
                var isChecksumError = error instanceof library_1.ChecksumException;
                var isFormatError = error instanceof library_1.FormatException;
                var isNotFound = error instanceof library_1.NotFoundException;
                if (isChecksumError || isFormatError || isNotFound) {
                    // trying again
                    lastTimeoutId = setTimeout(loop, _this.options.delayBetweenScanAttempts);
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
    };
    /**
     * Waits for the image to load and then tries to decode it.
     */
    BrowserCodeReader.prototype._decodeOnLoadImage = function (element) {
        return __awaiter(this, void 0, void 0, function () {
            var isImageLoaded;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        isImageLoaded = BrowserCodeReader.isImageLoaded(element);
                        if (!!isImageLoaded) return [3 /*break*/, 2];
                        return [4 /*yield*/, BrowserCodeReader._waitImageLoad(element)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/, this.decode(element)];
                }
            });
        });
    };
    /**
     * Get MediaStream from browser to be used.
     * @param constraints constraints the media stream constraints to get s valid media stream to decode from.
     * @private For private use.
     */
    BrowserCodeReader.prototype.getUserMedia = function (constraints) {
        return __awaiter(this, void 0, void 0, function () {
            var stream;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, navigator.mediaDevices.getUserMedia(constraints)];
                    case 1:
                        stream = _a.sent();
                        BrowserCodeReader.streamTracker.push(stream);
                        return [2 /*return*/, stream];
                }
            });
        });
    };
    /**
     * Keeps track to created media streams.
     * @private there is no need this array to be accessible from outside.
     */
    BrowserCodeReader.streamTracker = [];
    return BrowserCodeReader;
}());
exports.BrowserCodeReader = BrowserCodeReader;
//# sourceMappingURL=BrowserCodeReader.js.map