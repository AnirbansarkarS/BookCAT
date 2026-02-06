"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canEnumerateDevices = exports.hasNavigator = void 0;
/**
 * If navigator is present.
 */
function hasNavigator() {
    return typeof navigator !== 'undefined';
}
exports.hasNavigator = hasNavigator;
/**
 * If mediaDevices under navigator is supported.
 */
function isMediaDevicesSupported() {
    return hasNavigator() && !!navigator.mediaDevices;
}
/**
 * If enumerateDevices under navigator is supported.
 */
function canEnumerateDevices() {
    return !!(isMediaDevicesSupported() && navigator.mediaDevices.enumerateDevices);
}
exports.canEnumerateDevices = canEnumerateDevices;
//# sourceMappingURL=navigator-utils.js.map