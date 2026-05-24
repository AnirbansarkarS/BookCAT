import { BrowserMultiFormatReader } from '@zxing/browser';
import { useEffect, useRef, useState } from 'react';
import { Camera, X, AlertCircle } from 'lucide-react';

export default function ISBNScanner({ onDetected, onClose }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [manualISBN, setManualISBN] = useState('');
    const [showManualInput, setShowManualInput] = useState(false);
    const codeReaderRef = useRef(null);
    const onDetectedRef = useRef(onDetected);
    const stopScanningRef = useRef(false);

    // Keep callback ref current without restarting the camera
    useEffect(() => {
        onDetectedRef.current = onDetected;
    }, [onDetected]);

    useEffect(() => {
        let startTimeout;
        let scanInterval;

        const startScanning = async () => {
            try {
                setIsLoading(true);
                setError(null);
                setShowManualInput(false);
                stopScanningRef.current = false;

                // Check if camera is available
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('Camera API not supported');
                }

                // Request camera access
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                });

                streamRef.current = stream;
                
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    // Wait for video to be ready
                    await new Promise(resolve => {
                        videoRef.current.onloadedmetadata = () => {
                            videoRef.current.play().catch(() => {});
                            resolve();
                        };
                    });
                }

                // Initialize barcode reader
                const codeReader = new BrowserMultiFormatReader();
                codeReaderRef.current = codeReader;

                setIsLoading(false);

                // Scan periodically
                scanInterval = setInterval(async () => {
                    if (stopScanningRef.current || !videoRef.current) return;
                    
                    try {
                        const result = await codeReader.decodeFromVideoElement(videoRef.current);
                        if (result && !stopScanningRef.current) {
                            stopScanningRef.current = true;
                            const isbn = result.getText();
                            console.log('ISBN detected:', isbn);
                            onDetectedRef.current(isbn);
                        }
                    } catch (err) {
                        // No barcode detected, continue scanning
                    }
                }, 300); // Scan every 300ms

            } catch (err) {
                console.error('Camera error:', err);
                let errorMessage = 'Unable to access camera.';
                
                if (err.name === 'NotAllowedError' || err.message.includes('Permission')) {
                    errorMessage = 'Camera permission denied. Please enable camera permissions in your browser settings.';
                } else if (err.name === 'NotFoundError' || err.message.includes('not found')) {
                    errorMessage = 'No camera device found. Please check your device.';
                } else if (err.message.includes('not supported')) {
                    errorMessage = 'Camera access is not supported in your browser.';
                }
                
                setError(errorMessage);
                setIsLoading(false);
                setShowManualInput(true);
            }
        };

        startTimeout = setTimeout(startScanning, 100);

        // Cleanup function
        return () => {
            clearTimeout(startTimeout);
            clearInterval(scanInterval);
            stopScanningRef.current = true;
            
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };
    }, []); // empty deps — only init once

    const handleManualSubmit = () => {
        const cleaned = manualISBN.replace(/\D/g, '');
        if (cleaned.length >= 10) {
            stopScanningRef.current = true;
            onDetectedRef.current(cleaned);
        }
    };

    return (
        <div className="relative">
            {/* Close button */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    aria-label="Close scanner"
                >
                    <X size={20} />
                </button>
            )}

            {/* Loading state */}
            {isLoading && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg z-10">
                    <div className="text-center space-y-3">
                        <Camera className="w-12 h-12 text-primary mx-auto animate-pulse" />
                        <p className="text-white font-medium">Initializing camera...</p>
                    </div>
                </div>
            )}

            {/* Error state with manual fallback */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg z-10">
                    <div className="text-center space-y-4 p-6 max-w-sm">
                        <div className="flex justify-center">
                            <AlertCircle className="w-12 h-12 text-red-400" />
                        </div>
                        <div>
                            <p className="text-red-400 font-medium mb-1">Camera Error</p>
                            <p className="text-sm text-text-muted mb-4">{error}</p>
                        </div>
                        {!showManualInput && (
                            <button
                                onClick={() => setShowManualInput(true)}
                                className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition-all"
                            >
                                Enter ISBN Manually
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Manual ISBN input */}
            {showManualInput && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg z-10">
                    <div className="text-center space-y-4 p-6 max-w-sm">
                        <div>
                            <p className="text-white font-medium mb-1">Enter ISBN Manually</p>
                            <p className="text-sm text-text-muted mb-4">ISBN-10 or ISBN-13</p>
                        </div>
                        <input
                            type="text"
                            value={manualISBN}
                            onChange={e => setManualISBN(e.target.value.replace(/\D/g, ''))}
                            placeholder="e.g., 9780136769157"
                            className="w-full px-4 py-2 bg-white/[0.08] border border-white/[0.15] rounded-lg text-white placeholder:text-text-muted/50 outline-none focus:border-primary/40"
                            maxLength="13"
                            onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowManualInput(false)}
                                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-all"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleManualSubmit}
                                disabled={manualISBN.replace(/\D/g, '').length < 10}
                                className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all"
                            >
                                Search Book
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Video element */}
            <div className="relative rounded-lg overflow-hidden bg-black">
                <video
                    ref={videoRef}
                    className="w-full h-[400px] object-cover"
                    playsInline
                />

                {/* Scanning overlay */}
                {!isLoading && !error && !showManualInput && (
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Scanning guide box */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 border-2 border-primary rounded-lg">
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary rounded-br-lg" />
                        </div>

                        {/* Instruction text */}
                        <div className="absolute bottom-8 left-0 right-0 text-center">
                            <p className="text-white font-medium bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full inline-block">
                                Position the ISBN barcode within the frame
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
