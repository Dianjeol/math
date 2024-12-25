class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.level = 1;
        this.score = 0;
        this.currentQuestion = null;
        this.timeLeft = CONFIG.game.timePerQuestion;
        this.answeredQuestions = 0;
    }

    init() {
        this.soundManager = new SoundManager(this);
    }

    preload() {
        this.soundManager.preload();
    }

    create() {
        this.soundManager.create();
        this.createUI();
        this.startLevel();
    }

    createUI() {
        // Level-Anzeige
        this.levelText = this.add.text(10, 10, 'Level: 1', {
            fontSize: '32px',
            fill: CONFIG.colors.light
        });

        // Score-Anzeige
        this.scoreText = this.add.text(10, 50, 'Score: 0', {
            fontSize: '32px',
            fill: CONFIG.colors.light
        });

        // Timer-Anzeige
        this.timerText = this.add.text(10, 90, 'Time: ' + CONFIG.game.timePerQuestion, {
            fontSize: '32px',
            fill: CONFIG.colors.light
        });
    }

    startLevel() {
        this.timeLeft = CONFIG.game.timePerQuestion;
        this.answeredQuestions = 0;
        this.generateQuestion();
        this.startTimer();
    }

    generateQuestion() {
        // Generiere Brüche basierend auf Level
        const [num1, den1] = FractionUtils.generateFraction(this.level);
        const [num2, den2] = FractionUtils.generateFraction(this.level);
        
        // Berechne korrektes Ergebnis
        const result = (num1 * den2) + (num2 * den1);
        const resultDenominator = den1 * den2;
        [this.correctNum, this.correctDen] = FractionUtils.reduce(result, resultDenominator);

        // Zeige Frage an
        this.showQuestion(num1, den1, num2, den2);
        this.generateAnswerOptions();
    }

    showQuestion(num1, den1, num2, den2) {
        const questionText = `${FractionUtils.format(num1, den1)} + ${FractionUtils.format(num2, den2)} = ?`;
        
        if (this.questionDisplay) {
            this.questionDisplay.destroy();
        }
        
        this.questionDisplay = this.add.text(400, 200, questionText, {
            fontSize: '48px',
            fill: CONFIG.colors.light
        });
        this.questionDisplay.setOrigin(0.5);
    }

    generateAnswerOptions() {
        const options = [];
        // Korrekte Antwort
        options.push([this.correctNum, this.correctDen]);
        
        // Generiere 3 falsche Antworten
        while (options.length < 4) {
            const wrong1 = this.correctNum + (Math.random() < 0.5 ? 1 : -1);
            const wrong2 = this.correctDen + (Math.random() < 0.5 ? 1 : -1);
            const wrongAnswer = [wrong1, wrong2];
            
            if (!options.some(opt => opt[0] === wrong1 && opt[1] === wrong2)) {
                options.push(wrongAnswer);
            }
        }

        // Mische die Optionen
        this.shuffleArray(options);
        this.createAnswerButtons(options);
    }

    createAnswerButtons(options) {
        if (this.answerButtons) {
            this.answerButtons.forEach(btn => btn.destroy());
        }
        
        this.answerButtons = options.map((opt, index) => {
            const x = 200 + (index % 2) * 400;
            const y = 400 + Math.floor(index / 2) * 100;
            
            const button = this.add.text(x, y, FractionUtils.format(opt[0], opt[1]), {
                fontSize: '32px',
                fill: CONFIG.colors.light,
                backgroundColor: CONFIG.colors.primary,
                padding: { x: 20, y: 10 }
            })
            .setOrigin(0.5)
            .setInteractive();

            button.on('pointerdown', () => this.checkAnswer(opt[0], opt[1]));
            return button;
        });
    }

    checkAnswer(num, den) {
        const isCorrect = num === this.correctNum && den === this.correctDen;
        
        if (isCorrect) {
            this.score += Math.ceil(this.timeLeft * this.level);
            this.soundManager.play('correct');
            this.scoreText.setText('Score: ' + this.score);
        } else {
            this.soundManager.play('wrong');
        }

        this.answeredQuestions++;
        if (this.answeredQuestions >= CONFIG.game.questionsPerLevel) {
            if (isCorrect) {
                this.level++;
                this.levelText.setText('Level: ' + this.level);
            }
            this.startLevel();
        } else {
            this.generateQuestion();
        }
    }

    startTimer() {
        if (this.timer) {
            this.timer.destroy();
        }

        this.timer = this.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
    }

    updateTimer() {
        this.timeLeft--;
        this.timerText.setText('Time: ' + this.timeLeft);
        
        if (this.timeLeft <= 0) {
            this.generateQuestion();
            this.timeLeft = CONFIG.game.timePerQuestion;
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}

// Spielkonfiguration und Start
const config = {
    type: Phaser.AUTO,
    width: CONFIG.game.width,
    height: CONFIG.game.height,
    backgroundColor: CONFIG.colors.bg,
    scene: GameScene
};

// Starte das Spiel wenn das Dokument geladen ist
window.onload = () => {
    const game = new Phaser.Game(config);
};
