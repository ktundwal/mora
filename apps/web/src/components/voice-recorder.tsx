'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
    onTranscript: (text: string) => void;
    isListening?: boolean;
    onListeningChange?: (isListening: boolean) => void;
    className?: string;
}

export function VoiceRecorder({
    onTranscript,
    isListening: externalIsListening,
    onListeningChange,
    className
}: VoiceRecorderProps) {
    const [isInternalListening, setIsInternalListening] = useState(false);
    const recognitionRef = useRef<any>(null); // Type 'any' for window.webkitSpeechRecognition

    // Sync internal/external state if controlled
    const isListening = externalIsListening ?? isInternalListening;

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Speech recognition is not supported in this browser. Please use Chrome or Safari.');
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            handleListeningChange(true);
        };

        recognition.onend = () => {
            handleListeningChange(false);
        };

        recognition.onresult = (event: any) => {
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                onTranscript(finalTranscript);
            }
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            handleListeningChange(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        handleListeningChange(false);
    };

    const handleListeningChange = (listening: boolean) => {
        setIsInternalListening(listening);
        if (onListeningChange) {
            onListeningChange(listening);
        }
    };

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    return (
        <Button
            variant={isListening ? "destructive" : "secondary"}
            size="icon"
            className={cn("h-12 w-12 rounded-full shadow-md transition-all", isListening && "animate-pulse", className)}
            onClick={toggleListening}
            title={isListening ? "Stop Recording" : "Start Recording"}
        >
            {isListening ? (
                <MicOff className="h-6 w-6" />
            ) : (
                <Mic className="h-6 w-6" />
            )}
        </Button>
    );
}
