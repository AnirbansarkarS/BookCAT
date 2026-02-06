import { BrowserMultiFormatReader } from '@zxing/browser';
import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';

export default function ISBNScanner({ onDetected, onClose }) {
    const videoRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const codeReaderRef = useRef(null);

    useEffect(() => {
        const codeReader = new BrowserMultiFormatReader();
        codeReaderRef.current = codeReader;

        const startScanning = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Start decoding from video device
                await codeReader.decodeFromVideoDevice(
                    null, // Use default camera
                    videoRef.current,
                    (result, err) => {
                        if (result) {
                            const isbn = result.getText();
                            console.log('ISBN detected:', isbn);
                            onDetected(isbn);
                            codeReader.reset(); // Stop scanning after detection
                        }
                        // Ignore errors during scanning (normal when no barcode in view)
                    }
                );

                setIsLoading(false);
            } catch (err) {
                console.error('Camera error:', err);
                setError('Unable to access camera. Please grant camera permissions.');
                setIsLoading(false);
            }
        };

        startScanning();

        // Cleanup function
        return () => {
            if (codeReaderRef.current) {
                codeReaderRef.current.reset();
            }
        };
    }, [onDetected]);

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
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg z-10">
                    <div className="text-center space-y-3">
                        <Camera className="w-12 h-12 text-primary mx-auto animate-pulse" />
                        <p className="text-white font-medium">Initializing camera...</p>
                    </div>
                </div>
            )}

            {/* Error state */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg z-10">
                    <div className="text-center space-y-3 p-6">
                        <Camera className="w-12 h-12 text-red-400 mx-auto" />
                        <p className="text-red-400 font-medium">{error}</p>
                        <p className="text-sm text-text-muted">
                            Make sure you've granted camera permissions in your browser
                        </p>
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
                {!isLoading && !error && (
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
