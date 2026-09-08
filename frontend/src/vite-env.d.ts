/// <reference types="vite/client" />

interface SpeechRecognitionAlternative {
	transcript: string;
	confidence: number;
}

interface SpeechRecognitionResult {
	isFinal: boolean;
	length: number;
	[index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
	length: number;
	[index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
	resultIndex: number;
	results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	onstart: (() => void) | null;
	onend: (() => void) | null;
	onerror: ((event: Event) => void) | null;
	onresult: ((event: SpeechRecognitionEvent) => void) | null;
	start(): void;
	stop(): void;
}

interface SpeechRecognitionConstructor {
	new (): SpeechRecognition;
}

interface Window {
	SpeechRecognition?: SpeechRecognitionConstructor;
	webkitSpeechRecognition?: SpeechRecognitionConstructor;
}
