const COLORS = {
    dark: '#222831',
    darkAccent: '#393E46',
    primary: '#00ADB5',
    light: '#EEEEEE'
};

// Initialize Supabase client
const SUPABASE_URL = 'https://dnrrdfapxzqpfabjxcji.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRucnJkZmFweHpxcGZhYmp4Y2ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NjMwODksImV4cCI6MjA1MDUzOTA4OX0.mzVEpUpoAH2JzKBEXRgQ_ParxBju9f97qRlQv4uR8aM';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let timerText;
let questionText;
let currentAnswer;
let scoreText;
let highscoreText;
let globalHighscoreText;
let timeLeft = 15;
let score = 0;
let currentLevel = 1;
let levelText;
let questionsPerLevel = 7;
let questionsAskedInLevel = 0;
let answerButtons = [];
let currentTableLevel = 2;
let soundOn = true;

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 700,
    backgroundColor: COLORS.dark,
    parent: 'game-container',
    scene: {
        preload: preload,
        create: create,
        update: update,
    },
    audio: {
        disableWebAudio: true
    },
    dom: {
        createContainer: true
    }
};

const game = new Phaser.Game(config);

function preload() {
    this.load.atlas(
        "flares",
        "https://labs.phaser.io/assets/particles/flares.png",
        "https://labs.phaser.io/assets/particles/flares.json"
    );
    this.load.audio("correct", "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/своих-multimedia-sound-effects-верно.mp3");
    this.load.audio("wrong", "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/своих-multimedia-sound-effects-неверно.mp3");
    this.load.audio("levelup", "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/своих-multimedia-sound-effects-уровень-вверх.mp3");
    this.load.audio("gameover", "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/своих-multimedia-sound-effects-конец-игры.mp3");
}

function create() {
    this.cameras.main.setBackgroundColor(COLORS.dark);

    timerText = this.add.text(config.width / 2, 50, `Zeit: ${timeLeft}`, { fontSize: "32px", color: COLORS.light, fontFamily: "sans-serif", fontWeight: 'bold' }).setOrigin(0.5);
    scoreText = this.add.text(10, 10, `Punkte: ${score}`, { fontSize: "24px", color: COLORS.primary, fontFamily: "sans-serif", fontWeight: 'bold' });
    const highscore = localStorage.getItem("highscore") || 0;
    highscoreText = this.add.text(10, 40, `Highscore: ${highscore}`, { fontSize: "18px", color: COLORS.light, fontFamily: "sans-serif" });
    levelText = this.add.text(config.width - 10, 10, `Level: ${currentLevel}`, { fontSize: "24px", color: COLORS.light, fontFamily: "sans-serif", fontWeight: 'bold' }).setOrigin(1, 0);
    globalHighscoreText = this.add.text(10, config.height - 10, 'Globale Highscores laden...', { fontSize: '16px', color: COLORS.light, fontFamily: 'sans-serif', origin: [0, 1] });

    // Sound Toggle Button
    const soundButton = this.add.text(config.width - 10, 40, '🔊', { fontSize: '24px', color: COLORS.light, fontFamily: 'sans-serif' })
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', toggleSound);

    fetchGlobalHighscores(this);
    generateQuestion(this);

    this.time.addEvent({ delay: 1000, callback: () => {
            timeLeft--;
            timerText.setText(`Zeit: ${timeLeft}`);
            if (timeLeft <= 0) {
                gameOver(this);
            }
        }, loop: true
    });
}

function update() { }

function generateQuestion(scene) {
    let num1, num2;
    let maxNum = 12;
    let possibleAnswers = [];

    if (currentLevel >= 1 && currentLevel <= 10) {
        questionsPerLevel = 7;
        do { num1 = Phaser.Math.Between(2, maxNum - 1); num2 = currentLevel; } while ([1, 2, 10].includes(num1));
    } else if (currentLevel === 11) {
        questionsPerLevel = 14;
        do { num1 = Phaser.Math.Between(3, maxNum - 2); num2 = Phaser.Math.Between(3, maxNum - 2); } while ([1, 2, 10].includes(num1) || [1, 2, 10].includes(num2));
    } else {
        questionsPerLevel = 7;
        num2 = currentTableLevel;
        do { num1 = Phaser.Math.Between(2, maxNum - 1); } while ([1, 2, 10].includes(num1));
    }

    currentAnswer = num1 * num2;
    if (questionText) questionText.destroy();
    questionText = scene.add.text(config.width / 2, 200, `${num1} x ${num2} = ?`, { fontSize: "64px", color: COLORS.primary, fontFamily: "sans-serif", fontWeight: 'bold' }).setOrigin(0.5);

    possibleAnswers = [currentAnswer];
    while (possibleAnswers.length < 6) {
        const wrongAnswer = Math.round(currentAnswer + Phaser.Math.Between(-10, 10));
        if (wrongAnswer > 0 && Math.abs(wrongAnswer - currentAnswer) > 0 && !possibleAnswers.includes(wrongAnswer)) {
            possibleAnswers.push(wrongAnswer);
        }
    }

    Phaser.Utils.Array.Shuffle(possibleAnswers);
    createAnswerButtons(scene, possibleAnswers);
}

function createAnswerButtons(scene, answers) {
    answerButtons.forEach((button) => button.destroy());
    answerButtons = [];

    const buttonWidth = 120;
    const spacing = 15;
    const startX = (config.width - (6 * buttonWidth + 5 * spacing)) / 2;
    const buttonY = 550;

    for (let i = 0; i < 6; i++) {
        const x = startX + i * (buttonWidth + spacing) + buttonWidth / 2;
        const button = scene.add.text(x, buttonY, answers[i], { fontSize: "32px", color: COLORS.light, backgroundColor: COLORS.darkAccent, padding: { left: 15, right: 15, top: 10, bottom: 10 }, fontFamily: "sans-serif", fontWeight: 'bold' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on("pointerover", () => { button.setStyle({ backgroundColor: COLORS.primary, color: COLORS.dark }); scene.tweens.add({ targets: button, scale: 1.1, duration: 100, ease: "Sine.easeInOut" }); })
            .on("pointerout", () => { button.setStyle({ backgroundColor: COLORS.darkAccent, color: COLORS.light }); scene.tweens.add({ targets: button, scale: 1, duration: 100, ease: "Sine.easeInOut" }); })
            .on("pointerdown", () => checkAnswer(answers[i], scene));
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

        if (soundOn) scene.sound.play("correct");

        const emitter = scene.add.particles(config.width / 2, 300, "flares", { blendMode: "ADD", lifespan: 500, speed: { min: 200, max: 300 }, scale: { start: 0.8, end: 0 }, quantity: 20 });
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
        if (soundOn) scene.sound.play("wrong");

        const wrongButton = answerButtons.find((button) => button.text === String(selectedAnswer));
        if (wrongButton) {
            scene.tweens.add({ targets: wrongButton, backgroundColor: { from: '#ff4d4d', to: COLORS.darkAccent }, duration: 250, ease: "Linear", yoyo: true });
        }
    }
}

function levelUp(scene) {
    const levelUpText = scene.add.text(config.width / 2, 300, `Level Up!`, { fontSize: "64px", color: COLORS.primary, fontFamily: "sans-serif", fontWeight: 'bold' }).setOrigin(0.5);
    if (soundOn) scene.sound.play("levelup");
    scene.tweens.add({ targets: levelUpText, scale: 1.5, y: 200, alpha: 0, duration: 1500, ease: "Cubic.easeOut", onComplete: () => levelUpText.destroy() });

    const emitter = scene.add.particles(config.width / 2, 300, "flares", { blendMode: "ADD", lifespan: 1500, speed: { min: 100, max: 400 }, angle: { min: 0, max: 360 }, scale: { start: 1.2, end: 0 }, quantity: 50 });
    scene.time.delayedCall(1500, () => emitter.destroy());

    currentLevel++;
    levelText.setText(`Level: ${currentLevel}`);
    questionsAskedInLevel = 0;
    timeLeft = 15;

    if (currentLevel > 11) {
        currentTableLevel = Math.min((currentLevel - 11) + 1, 10);
    }

    generateQuestion(scene);
}

async function gameOver(scene) {
    scene.time.removeAllEvents();

    // Create a semi-transparent background for the menu
    const background = scene.add.rectangle(0, 0, config.width, config.height, 0x000000, 0.7).setOrigin(0);

    // Group to hold all menu elements
    const gameOverMenu = scene.add.container(config.width / 2, config.height / 2);

    // Game Over Text
    const gameOverText = scene.add.text(0, -150, 'Game Over!', { fontSize: "64px", color: COLORS.primary, fontFamily: "sans-serif", fontWeight: 'bold' }).setOrigin(0.5);
    gameOverMenu.add(gameOverText);

    // Final Score Text
    const finalScoreText = scene.add.text(0, -80, `Deine Punktzahl: ${score}`, { fontSize: "32px", color: COLORS.light, fontFamily: "sans-serif" }).setOrigin(0.5);
    gameOverMenu.add(finalScoreText);

    // Username Input
    const usernameInput = scene.add.dom(0, -20, 'input', `width: 200px; height: 30px; font-size: 16px; text-align: center; background-color: ${COLORS.light}; color: ${COLORS.dark}; border: 2px solid ${COLORS.primary}; border-radius: 5px;`, 'Your Name');
    usernameInput.node.value = localStorage.getItem('username') || '';
    gameOverMenu.add(usernameInput);

    // Save Score Button
    const saveScoreButton = scene.add.text(0, 30, 'Speichern', { fontSize: "24px", color: COLORS.light, backgroundColor: COLORS.darkAccent, padding: { left: 15, right: 15, top: 10, bottom: 10 }, fontFamily: "sans-serif", fontWeight: 'bold' })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => saveScoreButton.setStyle({ backgroundColor: COLORS.primary, color: COLORS.dark }))
        .on("pointerout", () => saveScoreButton.setStyle({ backgroundColor: COLORS.darkAccent, color: COLORS.light }))
        .on("pointerdown", async () => {
            const username = usernameInput.node.value.trim();
            if (username) {
                localStorage.setItem('username', username);
                await submitScore(username, score);
                alert('Highscore gesendet!');
                gameOverMenu.destroy();
                background.destroy();
                restartGame(scene);
            } else {
                alert('Bitte gib einen Namen ein.');
            }
        });
    gameOverMenu.add(saveScoreButton);

    // View Highscores Button
    const viewHighscoresButton = scene.add.text(0, 80, 'Highscores', { fontSize: "24px", color: COLORS.light, backgroundColor: COLORS.darkAccent, padding: { left: 15, right: 15, top: 10, bottom: 10 }, fontFamily: "sans-serif", fontWeight: 'bold' })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => viewHighscoresButton.setStyle({ backgroundColor: COLORS.primary, color: COLORS.dark }))
        .on("pointerout", () => viewHighscoresButton.setStyle({ backgroundColor: COLORS.darkAccent, color: COLORS.light }))
        .on("pointerdown", () => {
            showGlobalHighscores(scene, gameOverMenu); // Function to display highscores (see below)
        });
    gameOverMenu.add(viewHighscoresButton);

    // Restart Button
    const restartButton = scene.add.text(0, 130, 'Neustart', { fontSize: "24px", color: COLORS.light, backgroundColor: COLORS.darkAccent, padding: { left: 15, right: 15, top: 10, bottom: 10 }, fontFamily: "sans-serif", fontWeight: 'bold' })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => restartButton.setStyle({ backgroundColor: COLORS.primary, color: COLORS.dark }))
        .on("pointerout", () => restartButton.setStyle({ backgroundColor: COLORS.darkAccent, color: COLORS.light }))
        .on("pointerdown", () => {
            gameOverMenu.destroy();
            background.destroy();
            restartGame(scene);
        });
    gameOverMenu.add(restartButton);

    if (soundOn) scene.sound.play("gameover");
}

async function showGlobalHighscores(scene, parentMenu) {
    try {
        // Hide the parent menu
        parentMenu.setVisible(false);

        // Fetch data
        const { data: highscores, error } = await supabase
            .from('highscores')
            .select('username, score')
            .order('score', { ascending: false })
            .limit(10);

        if (error) {
            throw error;
        }

        // Create a container for the highscores menu
        const highscoresMenu = scene.add.container(config.width / 2, config.height / 2);

        // Back Button
        const backButton = scene.add.text(0, 180, 'Zurück', { fontSize: "24px", color: COLORS.light, backgroundColor: COLORS.darkAccent, padding: { left: 15, right: 15, top: 10, bottom: 10 }, fontFamily: "sans-serif", fontWeight: 'bold' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on("pointerover", () => backButton.setStyle({ backgroundColor: COLORS.primary, color: COLORS.dark }))
            .on("pointerout", () => backButton.setStyle({ backgroundColor: COLORS.darkAccent, color: COLORS.light }))
            .on("pointerdown", () => {
                // Hide highscores menu and show the parent menu
                highscoresMenu.destroy();
                parentMenu.setVisible(true);
            });
        highscoresMenu.add(backButton);

        // Display the highscores or a message if there are none
        if (highscores.length > 0) {
            let yOffset = -100;
            highscores.forEach((entry) => {
                const highscoreText = scene.add.text(0, yOffset, `${entry.username}: ${entry.score}`, { fontSize: "24px", color: COLORS.light, fontFamily: "sans-serif" }).setOrigin(0.5);
                highscoresMenu.add(highscoreText);
                yOffset += 30;
            });
        } else {
            const noHighscoresText = scene.add.text(0, 0, 'Noch keine Highscores', { fontSize: "24px", color: COLORS.light, fontFamily: "sans-serif" }).setOrigin(0.5);
            highscoresMenu.add(noHighscoresText);
        }

    } catch (error) {
        console.error("Fehler beim Laden der globalen Highscores:", error);
        const errorText = scene.add.text(0, 0, 'Fehler beim Laden der Highscores', { fontSize: "24px", color: COLORS.light, fontFamily: "sans-serif" }).setOrigin(0.5);
        highscoresMenu.add(errorText);
    }
}

async function fetchGlobalHighscores(scene) {
    try {
        const { data: highscores, error } = await supabase
            .from('highscores')
            .select('username, score')
            .order('score', { ascending: false })
            .limit(10);

        if (error) {
            console.error("Fehler beim Laden der globalen Highscores:", error);
            globalHighscoreText.setText('Fehler beim Laden der Highscores.');
            return;
        }

        const formattedHighscores = highscores.map(item => `${item.username}: ${item.score}`).join('\n');
        globalHighscoreText.setText(`Globale Highscores:\n${formattedHighscores || 'Noch keine Einträge'}`);
    } catch (error) {
        console.error("Unerwarteter Fehler beim Laden der Highscores:", error);
        globalHighscoreText.setText('Fehler beim Laden der Highscores.');
    }
}

async function submitScore(username, score) {
    try {
        const { error } = await supabase
            .from('highscores')
            .insert([{ username, score }]);

        if (error) {
            console.error("Fehler beim Senden der Highscore:", error);
            alert('Fehler beim Senden der Highscore.');
        } else {
            console.log('Score submitted successfully!');
        }
    } catch (error) {
        console.error("Unerwarteter Fehler beim Senden der Highscore:", error);
        alert('Unerwarteter Fehler beim Senden der Highscore.');
    }
}

function restartGame(scene) {
    score = 0;
    timeLeft = 15;
    currentLevel = 1;
    questionsAskedInLevel = 0;
    currentTableLevel = 2;
    scene.scene.restart();
}

function toggleSound() {
    soundOn = !soundOn;
    game.sound.setMute(!soundOn);
    const soundButton = this.scene.children.list.find(child => child.type === 'Text' && child.text === (soundOn ? '🔊' : '🔇'));
    if (soundButton) {
        soundButton.setText(soundOn ? '🔊' : '🔇');
    }
}