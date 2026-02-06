"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserCodeSvgWriter = void 0;
var library_1 = require("@zxing/library");
var svgNs = 'http://www.w3.org/2000/svg';
/**/
var BrowserCodeSvgWriter = /** @class */ (function () {
    /**
     * Constructs. 😉
     */
    function BrowserCodeSvgWriter(containerElement) {
        if (typeof containerElement === 'string') {
            var container = document.getElementById(containerElement);
            if (!container) {
                throw new Error("Could not find a Container element with '".concat(containerElement, "'."));
            }
            this.containerElement = container;
        }
        else {
            this.containerElement = containerElement;
        }
    }
    /**
     * Writes the QR code to a SVG and renders it in the container.
     */
    BrowserCodeSvgWriter.prototype.write = function (contents, width, height, hints) {
        if (contents.length === 0) {
            throw new library_1.IllegalArgumentException('Found empty contents');
        }
        if (width < 0 || height < 0) {
            throw new library_1.IllegalArgumentException('Requested dimensions are too small: ' + width + 'x' + height);
        }
        var quietZone = hints && hints.get(library_1.EncodeHintType.MARGIN) !== undefined
            ? Number.parseInt(hints.get(library_1.EncodeHintType.MARGIN).toString(), 10)
            : BrowserCodeSvgWriter.QUIET_ZONE_SIZE;
        var code = this.encode(hints, contents);
        return this.renderResult(code, width, height, quietZone);
    };
    /**
     * Creates a SVG element.
     */
    BrowserCodeSvgWriter.prototype.createSVGElement = function (w, h) {
        var el = document.createElementNS(BrowserCodeSvgWriter.SVG_NS, 'svg');
        el.setAttributeNS(svgNs, 'width', h.toString());
        el.setAttributeNS(svgNs, 'height', w.toString());
        return el;
    };
    /**
     * Creates a SVG rect.
     */
    BrowserCodeSvgWriter.prototype.createSvgPathPlaceholderElement = function (w, h) {
        var el = document.createElementNS(BrowserCodeSvgWriter.SVG_NS, 'path');
        el.setAttributeNS(svgNs, 'd', "M0 0h".concat(w, "v").concat(h, "H0z"));
        el.setAttributeNS(svgNs, 'fill', 'none');
        return el;
    };
    /**
     * Creates a SVG rect.
     */
    BrowserCodeSvgWriter.prototype.createSvgRectElement = function (x, y, w, h) {
        var el = document.createElementNS(BrowserCodeSvgWriter.SVG_NS, 'rect');
        el.setAttributeNS(svgNs, 'x', x.toString());
        el.setAttributeNS(svgNs, 'y', y.toString());
        el.setAttributeNS(svgNs, 'height', w.toString());
        el.setAttributeNS(svgNs, 'width', h.toString());
        el.setAttributeNS(svgNs, 'fill', '#000000');
        return el;
    };
    /**
     * Encodes the content to a Barcode type.
     */
    BrowserCodeSvgWriter.prototype.encode = function (hints, contents) {
        var errorCorrectionLevel = library_1.QRCodeDecoderErrorCorrectionLevel.L;
        if (hints && hints.get(library_1.EncodeHintType.ERROR_CORRECTION) !== undefined) {
            var correctionStr = hints.get(library_1.EncodeHintType.ERROR_CORRECTION).toString();
            errorCorrectionLevel = library_1.QRCodeDecoderErrorCorrectionLevel.fromString(correctionStr);
        }
        var code = library_1.QRCodeEncoder.encode(contents, errorCorrectionLevel, hints);
        return code;
    };
    /**
     * Renders the SVG in the container.
     *
     * @note the input matrix uses 0 == white, 1 == black. The output matrix
     *  uses 0 == black, 255 == white (i.e. an 8 bit greyscale bitmap).
     */
    BrowserCodeSvgWriter.prototype.renderResult = function (code, width /*int*/, height /*int*/, quietZone /*int*/) {
        // if (this.format && format != this.format) {
        //   throw new IllegalArgumentException("Can only encode QR_CODE, but got " + format)
        // }
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
        var placeholder = this.createSvgPathPlaceholderElement(width, height);
        svgElement.appendChild(placeholder);
        this.containerElement.appendChild(svgElement);
        // 2D loop
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
     * Default quiet zone in pixels.
     */
    BrowserCodeSvgWriter.QUIET_ZONE_SIZE = 4;
    /**
     * SVG markup NameSpace
     */
    BrowserCodeSvgWriter.SVG_NS = 'http://www.w3.org/2000/svg';
    return BrowserCodeSvgWriter;
}());
exports.BrowserCodeSvgWriter = BrowserCodeSvgWriter;
//# sourceMappingURL=BrowserCodeSvgWriter.js.map