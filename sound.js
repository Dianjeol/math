class SoundManager {
    constructor(scene) {
        this.scene = scene;
        this.sounds = {};
        this.isMuted = false;
    }

    preload() {
        // Lade Sound-Dateien
        this.scene.load.audio('correct', 'sounds/yes.mp3');
        this.scene.load.audio('wrong', 'sounds/no.mp3');
    }

    create() {
        // Erstelle Sound-Objekte
        this.sounds.correct = this.scene.sound.add('correct');
        this.sounds.wrong = this.scene.sound.add('wrong');
    }

    play(key) {
        if (!this.isMuted && this.sounds[key]) {
            this.sounds[key].play();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }
}
