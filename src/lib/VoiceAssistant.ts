/**
 * VoiceAssistant - Handles text-to-speech for rep counting and feedback
 */
class VoiceAssistant {
    private synth: SpeechSynthesis | null = null;
    private voice: SpeechSynthesisVoice | null = null;
    private enabled: boolean = true;
    private lastMotivationalTime: number = 0;
    private motivationCooldown: number = 10000; // 10 seconds between motivational messages

    constructor() {
        if (typeof window !== 'undefined') {
            this.synth = window.speechSynthesis;
            this.loadVoice();
        }
    }

    private loadVoice() {
        if (!this.synth) return;

        const voices = this.synth.getVoices();
        // Prefer a natural sounding English voice
        this.voice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
            voices.find(v => v.lang.startsWith('en')) ||
            voices[0];
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        if (!enabled && this.synth) {
            this.synth.cancel();
        }
    }

    speak(text: string, force: boolean = false) {
        if (!this.enabled || !this.synth) return;

        // Cancel previous speech if forced
        if (force) {
            this.synth.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        if (this.voice) {
            utterance.voice = this.voice;
        }
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        this.synth.speak(utterance);
    }

    countRep(count: number) {
        this.speak(count.toString(), true);
    }

    giveMotivationalFeedback(formScore: number) {
        const now = Date.now();
        if (now - this.lastMotivationalTime < this.motivationCooldown) return;

        const highFormMessages = [
            "Excellent form!",
            "You're doing great!",
            "Perfect technique!",
            "Keep that energy up!",
            "Strong and steady!"
        ];

        const midFormMessages = [
            "Good effort, keep it steady.",
            "You've got this!",
            "Focus on the movement.",
            "Focus on your core."
        ];

        let message = "";
        if (formScore >= 90) {
            message = highFormMessages[Math.floor(Math.random() * highFormMessages.length)];
        } else if (formScore >= 70) {
            message = midFormMessages[Math.floor(Math.random() * midFormMessages.length)];
        }

        if (message) {
            this.speak(message);
            this.lastMotivationalTime = now;
        }
    }

    warnPain(painScore: number) {
        if (!this.enabled || !this.synth || painScore < 60) return;

        const now = Date.now();
        // Use a longer cooldown for pain warnings to not be annoying
        if (now - this.lastMotivationalTime < 15000) return;

        const painMessages = [
            "Take it easy, you seem to be straining.",
            "Watch your comfort level, don't push too hard.",
            "If you feel pain, please pause and rest.",
            "Maintain a relaxed face while lifting."
        ];

        const message = painMessages[Math.floor(Math.random() * painMessages.length)];
        this.speak(message, true);
        this.lastMotivationalTime = now;
    }

    onComplete() {
        this.speak("Workout complete! Fantastic job today.", true);
    }
}

export const voiceAssistant = new VoiceAssistant();
