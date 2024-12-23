let timerText;
let questionText;
let currentAnswer;
let scoreText;
let highscoreText;
let timeLeft = 15;
let score = 0;
let currentLevel = 1;
let levelText;
let questionsPerLevel = 7;
let questionsAskedInLevel = 0;
let answerButtons = [];
let currentTableLevel = 2; // Startet mit der 2er Reihe nach Level 11

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: "#84b6f4",
    parent: 'game-container',
    scene: {
        preload: preload,
        create: create,
        update: update,
    },
};

const game = new Phaser.Game(config);

function preload() {
    this.load.atlas(
        "flares",
        "https://labs.phaser.io/assets/particles/flares.png",
        "https://labs.phaser.io/assets/particles/flares.json"
    );
    this.load.audio(
        "correct",
        "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/ своих-multimedia-sound-effects-верно.mp3" // Positiver Bestätigungston
    );
    this.load.audio(
        "wrong",
        "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/ своих-multimedia-sound-effects-неверно.mp3" // Kurzer Fehler- oder Ablehnungston
    );
    this.load.audio(
        "levelup",
        "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/ своих-multimedia-sound-effects-уровень-вверх.mp3" // Etwas festlicherer Aufstiegston
    );
    this.load.audio(
        "gameover",
        "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/ своих-multimedia-sound-effects-конец-игры.mp3" // Dramatischerer Ton für Spielende
    );
}

function create() {
    timerText = this.add
        .text(config.width / 2, 50, `Zeit: ${timeLeft}`, {
            fontSize: "32px",
            color: "#fff",
            fontFamily: "Arial Black",
        })
        .setOrigin(0.5);
    scoreText = this.add.text(10, 10, `Punkte: ${score}`, {
        fontSize: "24px",
        color: "#fff",
        fontFamily: "Arial",
    });
    const highscore = localStorage.getItem("highscore") || 0;
    highscoreText = this.add.text(10, 40, `Highscore: ${highscore}`, {
        fontSize: "24px",
        color: "#ffa500",
        fontFamily: "Arial",
    });
    levelText = this.add
        .text(config.width - 10, 10, `Level: ${currentLevel}`, {
            fontSize: "24px",
            color: "#fff",
            fontFamily: "Arial Black",
        })
        .setOrigin(1, 0);

    generateQuestion(this);

    this.time.addEvent({
        delay: 1000,
        callback: () => {
            timeLeft--;
            timerText.setText(`Zeit: ${timeLeft}`);
            if (timeLeft <= 0) {
                gameOver(this);
            }
        },
        loop: true,
    });
}

function update() { }

function generateQuestion(scene) {
    let num1, num2;
    let maxNum = 10;
    let possibleAnswers = [];

    if (currentLevel >= 1 && currentLevel <= 10) {
        questionsPerLevel = 7;
        do {
            num1 = Phaser.Math.Between(1, maxNum);
            num2 = currentLevel;
        } while (num1 === 1 || num1 === 2 || num1 === 10);
    } else if (currentLevel === 11) {
        questionsPerLevel = 14;
        do {
            num1 = Phaser.Math.Between(3, maxNum - 1); // Verhindert 1, 2, 10
            num2 = Phaser.Math.Between(1, maxNum);
        } while (num2 === 1 || num2 === 2 || num2 === 10);
    } else { // Level 12+ - Wiederholung der Reihen
        questionsPerLevel = 7;
        num2 = currentTableLevel;
        do {
            num1 = Phaser.Math.Between(1, maxNum);
        } while (num1 === 1 || num1 === 2 || num1 === 10);
    }

    currentAnswer = num1 * num2;

    if (questionText) {
        questionText.destroy();
    }

    questionText = scene.add
        .text(config.width / 2, 200, `${num1} x ${num2} = ?`, {
            fontSize: "48px",
            color: "#fff",
            fontFamily: "Arial Black",
        })
        .setOrigin(0.5);

    possibleAnswers = [
        currentAnswer,
        currentAnswer + Phaser.Math.Between(-5, 5),
        currentAnswer + Phaser.Math.Between(-8, 8),
        currentAnswer + Phaser.Math.Between(-3, 7),
        currentAnswer - Phaser.Math.Between(1, 6),
        currentAnswer * Phaser.Math.FloatBetween(0.5, 1.5),
    ];

    possibleAnswers = possibleAnswers.filter(answer => answer > 0);
    possibleAnswers = possibleAnswers.map(answer => Math.round(answer));
    possibleAnswers.push(currentAnswer); // Sicherstellen, dass die richtige Antwort dabei ist
    possibleAnswers = [...new Set(possibleAnswers)]; // Duplikate entfernen

    while (possibleAnswers.length < 6) {
        possibleAnswers.push(Math.round(currentAnswer + Phaser.Math.Between(-15, 15)));
        possibleAnswers = possibleAnswers.filter(answer => answer > 0);
        possibleAnswers = [...new Set(possibleAnswers)];
    }

    Phaser.Utils.Array.Shuffle(possibleAnswers);
    createAnswerButtons(scene, possibleAnswers);
}

function createAnswerButtons(scene, answers) {
    answerButtons.forEach((button) => button.destroy());
    answerButtons = [];

    const buttonColors = ["#f1c40f", "#e67e22", "#e74c3c", "#3498db", "#2ecc71", "#9b59b6"];
    const buttonWidth = 120;
    const spacing = 20;
    const startX = (config.width - (6 * buttonWidth + 5 * spacing)) / 2;

    for (let i = 0; i < 6; i++) {
        const x = startX + i * (buttonWidth + spacing) + buttonWidth / 2;

        const button = scene.add
            .text(x, 550, answers[i], {
                fontSize: "32px",
                color: "#fff",
                backgroundColor: buttonColors[i],
                padding: { left: 15, right: 15, top: 10, bottom: 10 },
                fontFamily: "Arial",
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        button.on("pointerover", () => {
            button.setStyle({ backgroundColor: "#b2bec3" });
            scene.tweens.add({
                targets: button,
                scale: 1.1,
                duration: 100,
                ease: "Sine.easeInOut",
            });
        });

        button.on("pointerout", () => {
            button.setStyle({ backgroundColor: buttonColors[i] });
            scene.tweens.add({
                targets: button,
                scale: 1,
                duration: 100,
                ease: "Sine.easeInOut",
            });
        });

        button.on("pointerdown", () => checkAnswer(answers[i], scene));

        answerButtons.push(button);
    }
}

function checkAnswer(selectedAnswer, scene) {
    const isCorrect = selectedAnswer === currentAnswer;

    if (isCorrect) {
        score += 10;
        scoreText.setText(`Punkte: ${score}`);
        questionsAskedInLevel++;

        const highscore = localStorage.getItem("highscore") || 0;
        if (score > highscore) {
            localStorage.setItem("highscore", score);
            highscoreText.setText(`Highscore: ${score}`);
        }

        try {
            scene.sound.play("correct");
        } catch (e) {
            console.error("Fehler beim Abspielen des Sounds:", e);
        }

        const emitter = scene.add.particles(config.width / 2, 300, "flares", {
            frame: { frames: ["red", "green", "blue"], cycle: true },
            blendMode: "ADD",
            lifespan: 500,
            speed: { min: 200, max: 300 },
            scale: { start: 0.8, end: 0 },
            quantity: 20,
        });
        scene.time.delayedCall(500, () => emitter.destroy());

        if (questionsAskedInLevel >= questionsPerLevel) {
            levelUp(scene);
        } else {
            timeLeft = 15;
            generateQuestion(scene);
        }
    } else {
        timeLeft -= 5;
        if (timeLeft < 0) timeLeft = 0;
        timerText.setText(`Zeit: ${timeLeft}`);

        try {
            scene.sound.play("wrong");
        } catch (e) {
            console.error("Fehler beim Abspielen des Sounds:", e);
        }

        const wrongButton = answerButtons.find(
            (button) => button.text === String(selectedAnswer)
        );
        if (wrongButton) {
            scene.tweens.add({
                targets: wrongButton,
                backgroundColor: { from: "#ff0000", to: wrongButton.style.backgroundColor },
                duration: 250,
                ease: "Linear",
                yoyo: true,
            });
        }
    }
}

function levelUp(scene) {
    const levelUpText = scene.add
        .text(config.width / 2, 300, `Level Up!`, {
            fontSize: "64px",
            color: "#ffdd00",
            fontFamily: "Arial Black",
        })
        .setOrigin(0.5);

    try {
        scene.sound.play("levelup");
    } catch (e) {
        console.error("Fehler beim Abspielen des Sounds:", e);
    }

    scene.tweens.add({
        targets: levelUpText,
        scale: 1.5,
        y: 200,
        alpha: 0,
        duration: 1500,
        ease: "Cubic.easeOut",
        onComplete: () => levelUpText.destroy(),
    });

    const emitter = scene.add.particles(config.width / 2, 300, "flares", {
        frame: "green",
        blendMode: "ADD",
        lifespan: 1500,
        speed: { min: 100, max: 400 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.2, end: 0 },
        quantity: 50,
    });
    scene.time.delayedCall(1500, () => emitter.destroy());

    currentLevel++;
    levelText.setText(`Level: ${currentLevel}`);
    questionsAskedInLevel = 0;
    timeLeft = 15;

    if (currentLevel > 11) {
        currentTableLevel = (currentLevel - 11) + 1; // Setzt die aktuelle Reihe für Level 12+
    }

    generateQuestion(scene);
}

function gameOver(scene) {
    const gameOverText = scene.add
        .text(config.width / 2, 300, "Game Over", {
            fontSize: "64px",
            color: "#ff0000",
            fontFamily: "Arial Black",
        })
        .setOrigin(0.5);

    try {
        scene.sound.play("gameover");
    } catch (e) {
        console.error("Fehler beim Abspielen des Sounds:", e);
    }

    scene.tweens.add({
        targets: gameOverText,
        angle: 360,
        duration: 2000,
        ease: "Sine.easeInOut",
        loop: -1,
        yoyo: true,
    });

    scene.time.delayedCall(3000, () => {
        score = 0;
        timeLeft = 15;
        currentLevel = 1;
        questionsAskedInLevel = 0;
        currentTableLevel = 2; // Reset der Reihenfolge
        scene.scene.restart();
    });
}