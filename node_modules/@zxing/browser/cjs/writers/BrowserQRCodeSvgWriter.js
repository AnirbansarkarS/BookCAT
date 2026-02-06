"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserQRCodeSvgWriter = void 0;
var library_1 = require("@zxing/library");
var svgNs = 'http://www.w3.org/2000/svg';
/**/
var BrowserQRCodeSvgWriter = /** @class */ (function () {
    function BrowserQRCodeSvgWriter() {
    }
    /**
     * Writes and renders a QRCode SVG element.
     *
     * @param contents
     * @param width
     * @param height
     * @param hints
     */
    BrowserQRCodeSvgWriter.prototype.write = function (contents, width, height, hints) {
        if (contents.length === 0) {
            throw new library_1.IllegalArgumentException('Found empty contents');
        }
        // if (format != BarcodeFormat.QR_CODE) {
        //   throw new IllegalArgumentException("Can only encode QR_CODE, but got " + format)
        // }
        if (width < 0 || height < 0) {
            throw new library_1.IllegalArgumentException('Requested dimensions are too small: ' + width + 'x' + height);
        }
        var errorCorrectionLevel = library_1.QRCodeDecoderErrorCorrectionLevel.L;
        var quietZone = BrowserQRCodeSvgWriter.QUIET_ZONE_SIZE;
        if (hints) {
            if (undefined !== hints.get(library_1.EncodeHintType.ERROR_CORRECTION)) {
                var correctionStr = hints.get(library_1.EncodeHintType.ERROR_CORRECTION).toString();
                errorCorrectionLevel = library_1.QRCodeDecoderErrorCorrectionLevel.fromString(correctionStr);
            }
            if (undefined !== hints.get(library_1.EncodeHintType.MARGIN)) {
                quietZone = Number.parseInt(hints.get(library_1.EncodeHintType.MARGIN).toString(), 10);
            }
        }
        var code = library_1.QRCodeEncoder.encode(contents, errorCorrectionLevel, hints);
        return this.renderResult(code, width, height, quietZone);
    };
    /**
     * Renders the result and then appends it to the DOM.
     */
    BrowserQRCodeSvgWriter.prototype.writeToDom = function (containerElement, contents, width, height, hints) {
        if (typeof containerElement === 'string') {
            var targetEl = document.querySelector(containerElement);
            if (!targetEl) {
                throw new Error('Could no find the target HTML element.');
            }
            containerElement = targetEl;
        }
        var svgElement = this.write(contents, width, height, hints);
        if (containerElement instanceof HTMLElement) {
            containerElement.appendChild(svgElement);
        }
    };
    /**
     * Note that the input matrix uses 0 == white, 1 == black.
     * The output matrix uses 0 == black, 255 == white (i.e. an 8 bit greyscale bitmap).
     */
    BrowserQRCodeSvgWriter.prototype.renderResult = function (code, width /*int*/, height /*int*/, quietZone /*int*/) {
        var input = code.getMatrix();
        if (input === null) {
            throw new library_1.IllegalStateException();
        }
        var inputWidth = input.getWidth();
        var inputHeight = input.getHeight();
        var qrWidth = inputWidth + (quietZone * 2);
        var qrHeight = inputHeight + (quietZone * 2);
        var outputWidth = Math.max(width, qrWidth);
        var outputHeight = Math.max(height, qrHeight);
        var multiple = Math.min(Math.floor(outputWidth / qrWidth), Math.floor(outputHeight / qrHeight));
        // Padding includes both the quiet zone and the extra white pixels to accommodate the requested
        // dimensions. For example, if input is 25x25 the QR will be 33x33 including the quiet zone.
        // If the requested size is 200x160, the multiple will be 4, for a QR of 132x132. These will
        // handle all the padding from 100x100 (the actual QR) up to 200x160.
        var leftPadding = Math.floor((outputWidth - (inputWidth * multiple)) / 2);
        var topPadding = Math.floor((outputHeight - (inputHeight * multiple)) / 2);
        var svgElement = this.createSVGElement(outputWidth, outputHeight);
        for (var inputY = 0, outputY = topPadding; inputY < inputHeight; inputY++, outputY += multiple) {
            // Write the contents of this row of the barcode
            for (var inputX = 0, outputX = leftPadding; inputX < inputWidth; inputX++, outputX += multiple) {
                if (input.get(inputX, inputY) === 1) {
                    var svgRectElement = this.createSvgRectElement(outputX, outputY, multiple, multiple);
                    svgElement.appendChild(svgRectElement);
                }
            }
        }
        return svgElement;
    };
    /**
     * Creates a SVG element.
     *
     * @param w SVG's width attribute
     * @param h SVG's height attribute
     */
    BrowserQRCodeSvgWriter.prototype.createSVGElement = function (w, h) {
        var svgElement = document.createElementNS(svgNs, 'svg');
        var width = w.toString();
        var height = h.toString();
        svgElement.setAttribute('height', height);
        svgElement.setAttribute('width', width);
        svgElement.setAttribute('viewBox', "0 0 " + width + " " + height);
        return svgElement;
    };
    /**
     * Creates a SVG rect element.
     *
     * @param x Element's x coordinate
     * @param y Element's y coordinate
     * @param w Element's width attribute
     * @param h Element's height attribute
     */
    BrowserQRCodeSvgWriter.prototype.createSvgRectElement = function (x, y, w, h) {
        var rect = document.createElementNS(svgNs, 'rect');
        rect.setAttribute('x', x.toString());
        rect.setAttribute('y', y.toString());
        rect.setAttribute('height', w.toString());
        rect.setAttribute('width', h.toString());
        rect.setAttribute('fill', '#000000');
        return rect;
    };
    BrowserQRCodeSvgWriter.QUIET_ZONE_SIZE = 4;
    return BrowserQRCodeSvgWriter;
}());
exports.BrowserQRCodeSvgWriter = BrowserQRCodeSvgWriter;
//# sourceMappingURL=BrowserQRCodeSvgWriter.js.map