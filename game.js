const COLORS = {
    dark: '#EAD8B1',
    darkAccent: '#001F3F',
    primary: '#3A6D8C',
    light: '#6A9AB0',
    secondary: '#001F3F'
};

// Initialize Supabase client
const SUPABASE_URL = 'https://dnrrdfapxzqpfabjxcji.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRucnJkZmFweHpxcGZhYmp4Y2ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NjMwODksImV4cCI6MjA1MDUzOTA4OX0.mzVEpUpoAH2JzKBEXRgQ_ParxBju9f97qRlQv4uR8aM';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let timerText, questionText, currentAnswer, scoreText, levelText, music;
let timeLeft = 15, score = 0, level = 1, questionsAsked = 0;
let soundOn = false, musicStarted = false, isMobile = false;
let availableQuestions = [], answerButtons = [];

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
    audio: { disableWebAudio: false },
    dom: { createContainer: true }
};

const game = new Phaser.Game(config);

function preload() {
    this.load.atlas("flares", "https://labs.phaser.io/assets/particles/flares.png", "https://labs.phaser.io/assets/particles/flares.json");
    this.load.audio("correct", "./yes.mp3");
    this.load.audio("wrong", "./no.mp3");
    this.load.audio("levelup", "./levelup.mp3");
    this.load.audio("gameover", "./gameover.mp3");
    this.load.audio('music', './song.mp3');
}

function create() {
    this.cameras.main.setBackgroundColor(COLORS.dark);
    isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;

    timerText = this.add.text(config.width / 2, 50, `Zeit: ${timeLeft}`, { fontSize: "32px", color: COLORS.light, fontFamily: "sans-serif", fontWeight: 'bold' }).setOrigin(0.5);
    scoreText = this.add.text(10, 10, `Punkte: ${score}`, { fontSize: "24px", color: COLORS.primary, fontFamily: "sans-serif", fontWeight: 'bold' });
    levelText = this.add.text(config.width - 10, 10, `Level: ${level}`, { fontSize: "24px", color: COLORS.light, fontFamily: "sans-serif", fontWeight: 'bold' }).setOrigin(1, 0);

    const soundButton = this.add.text(config.width - 10, 40, '🔇', { fontSize: '24px', color: COLORS.light, fontFamily: 'sans-serif' })
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', toggleSound.bind(this));

    initializeQuestions();
    generateQuestion(this);

    this.time.addEvent({ delay: 1000, callback: () => { timeLeft--; timerText.setText(`Zeit: ${timeLeft}`); if (timeLeft <= 0) { gameOver(this); } }, loop: true });

    music = this.sound.add('music', { loop: true, volume: 0.5 });
    if (isMobile) {
        this.input.once('pointerdown', () => { if (!musicStarted) { music.play(); musicStarted = true; soundOn = true; soundButton.setText('🔊'); } });
    } else {
        if (!musicStarted) { music.play(); musicStarted = true; soundOn = true; soundButton.setText('🔊'); }
    }
}

function update() { }

function initializeQuestions() {
    availableQuestions = [];
    const numbersToMultiply = [3, 4, 6, 7, 8, 9];

    if (level === 1) {
        availableQuestions = numbersToMultiply.slice(1).map(num => ({ num1: num, num2: num, type: 'multiplication' }));
    } else if (level === 11) {
        availableQuestions = numbersToMultiply.slice(4).map(num => ({ num1: num, num2: num, type: 'multiplication' }));
    } else if (level <= 10) {
        availableQuestions = numbersToMultiply.map(num => ({ num1: num, num2: level, type: 'multiplication' }));
    } else if (level <= 21) {
        const divisor = level - 10;
        availableQuestions = numbersToMultiply.map(num => ({ num1: num * divisor, num2: divisor, type: 'division' }));
    } else if (level <= 30) {
        const divisor = level - 20;
        for (let i = 0; i < 6; i++) {
            let numerator = Phaser.Math.Between(divisor, 50);
            numerator = Math.round(numerator / divisor) * divisor;
            availableQuestions.push({ num1: numerator, num2: Phaser.Math.Between(2, 10) * divisor, type: 'fraction', divisor });
        }
    }

    Phaser.Utils.Array.Shuffle(availableQuestions);
}

function generateQuestion(scene) {
    if (availableQuestions.length === 0 && level !== 31) { initializeQuestions(); }
    if (level === 31) { congratulations(scene); return; }

    const question = availableQuestions.pop();
    let operator, result;

    if (question.type === 'multiplication') { operator = 'x'; result = question.num1 * question.num2; }
    else if (question.type === 'division') { operator = '÷'; result = question.num1 / question.num2; }
    else if (question.type === 'fraction') { operator = '/'; result = question.num1 / question.divisor; }

    currentAnswer = (question.type === 'fraction') ? result / (question.num2 / question.divisor) : result;

    if (questionText) questionText.destroy();
    questionText = scene.add.text(config.width / 2, 150, (question.type === 'fraction') ? `Kürze vollständig:\n${question.num1} ${operator} ${question.num2}` : `${question.num1} ${operator} ${question.num2} = ?`, { fontSize: (question.type === 'fraction') ? "45px" : "64px", color: COLORS.primary, fontFamily: "sans-serif", fontWeight: 'bold' }).setOrigin(0.5);

    let possibleAnswers = [currentAnswer];
    while (possibleAnswers.length < 4) {
        const wrongAnswer = Phaser.Math.Between(currentAnswer - 5 > 0 ? currentAnswer - 5 : 1, currentAnswer + 5);
        if (wrongAnswer !== currentAnswer && !possibleAnswers.includes(wrongAnswer)) possibleAnswers.push(wrongAnswer);
    }

    Phaser.Utils.Array.Shuffle(possibleAnswers);
    createAnswerButtons(scene, possibleAnswers);
}

function createAnswerButton(scene, answer, x, y, color) {
    return scene.add.text(x, y, answer, { fontSize: "40px", color: COLORS.dark, backgroundColor: color, padding: { left: 30, right: 30, top: 20, bottom: 20 }, fontFamily: "sans-serif", fontWeight: 'bold' })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => { button.setStyle({ backgroundColor: COLORS.darkAccent }); scene.tweens.add({ targets: button, scale: 1.1, duration: 100, ease: "Sine.easeInOut" }); })
        .on("pointerout", () => { button.setStyle({ backgroundColor: color }); scene.tweens.add({ targets: button, scale: 1, duration: 100, ease: "Sine.easeInOut" }); })
        .on("pointerdown", function () { checkAnswer(this.text, scene, this); });
}

function createAnswerButtons(scene, answers) {
    answerButtons.forEach(button => button.destroy());
    answerButtons = [];

    const buttonWidth = 250, buttonHeight = 80, spacing = 20;
    const startX = (config.width - (2 * buttonWidth + spacing)) / 2;
    const startY = config.height - 300;
    const buttonColors = [COLORS.primary, COLORS.secondary];

    for (let i = 0; i < answers.length; i++) {
        const x = startX + (i % 2) * (buttonWidth + spacing) + buttonWidth / 2;
        const y = startY + Math.floor(i / 2) * (buttonHeight + spacing);
        answerButtons.push(createAnswerButton(scene, answers[i], x, y, buttonColors[i % 2]));
    }
}

function checkAnswer(selectedAnswer, scene, button) {
    const isCorrect = parseInt(selectedAnswer) === parseInt(currentAnswer);

    if (isCorrect) {
        score += 10;
        scoreText.setText(`Punkte: ${score}`);
        questionsAsked++;
        timeLeft = 15;
        timerText.setText(`Zeit: ${timeLeft}`);
        if (questionsAsked >= 6) { levelUp(scene); } else { generateQuestion(scene); }
        if (soundOn) scene.sound.play("correct");
    } else {
        timeLeft -= 5;
        if (timeLeft < 0) timeLeft = 0;
        timerText.setText(`Zeit: ${timeLeft}`);
        if (soundOn) scene.sound.play("wrong");
        if (button) scene.tweens.add({ targets: button, backgroundColor: { from: '#ff4d4d', to: COLORS.darkAccent }, duration: 250, ease: "Linear", yoyo: true });
    }
}

function levelUp(scene) {
    if (level === 30) { congratulations(scene); return; }

    const levelUpText = scene.add.text(config.width / 2, 300, `Level Up!`, { fontSize: "64px", color: COLORS.primary, fontFamily: "sans-serif", fontWeight: 'bold' }).setOrigin(0.5);
    if (soundOn) scene.sound.play("levelup");
    scene.tweens.add({ targets: levelUpText, scale: 1.5, y: 200, alpha: 0, duration: 1500, ease: "Cubic.easeOut", onComplete: () => levelUpText.destroy() });

    const emitter = scene.add.particles(config.width / 2, 300, "flares", { blendMode: "ADD", lifespan: 1500, speed: { min: 100, max: 400 }, angle: { min: 0, max: 360 }, scale: { start: 1.2, end: 0 }, quantity: 50 });
    scene.time.delayedCall(1500, () => emitter.destroy());

    level++;
    levelText.setText(`Level: ${level}`);
    questionsAsked = 0;
    timeLeft = 15;

    initializeQuestions();
    generateQuestion(scene);
}

function congratulations(scene) {
    const congratsText = scene.add.text(config.width / 2, 300, `Herzlichen Glückwunsch!\nDu hast das Spiel\ndurchgespielt!`, { fontSize: "45px", color: COLORS.primary, fontFamily: "sans-serif", fontWeight: 'bold', align: 'center' }).setOrigin(0.5);
    if (soundOn) scene.sound.play("levelup");
    scene.tweens.add({ targets: congratsText, scale: 1.5, y: 200, alpha: 0, duration: 3000, ease: "Cubic.easeOut", onComplete: () => congratsText.destroy() });

    const emitter = scene.add.particles(config.width / 2, 300, "flares", { blendMode: "ADD", lifespan: 1500, speed: { min: 100, max: 400 }, angle: { min: 0, max: 360 }, scale: { start: 1.2, end: 0 }, quantity: 50 });
    scene.time.delayedCall(3000, () => emitter.destroy());
}

async function gameOver(scene) {
    scene.time.removeAllEvents();

    const background = scene.add.rectangle(0, 0, config.width, config.height, 0x000000, 0.7).setOrigin(0);
    const gameOverMenu = scene.add.container(config.width / 2, config.height / 2);

    const gameOverText = scene.add.text(0, -150, 'Game Over!', { fontSize: "64px", color: COLORS.primary, fontFamily: "sans-serif", fontWeight: 'bold' }).setOrigin(0.5);
    const finalScoreText = scene.add.text(0, -80, `Deine Punktzahl: ${score}`, { fontSize: "32px", color: COLORS.light, fontFamily: "sans-serif" }).setOrigin(0.5);
    const usernameInput = scene.add.dom(0, -20, 'input', `width: 200px; height: 30px; font-size: 16px; text-align: center; background-color: ${COLORS.light}; color: ${COLORS.dark}; border: 2px solid ${COLORS.primary}; border-radius: 5px;`, 'Your Name');
    usernameInput.node.value = localStorage.getItem('username') || '';

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

    const viewHighscoresButton = scene.add.text(0, 80, 'Highscores', { fontSize: "24px", color: COLORS.light, backgroundColor: COLORS.darkAccent, padding: { left: 15, right: 15, top: 10, bottom: 10 }, fontFamily: "sans-serif", fontWeight: 'bold' })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => viewHighscoresButton.setStyle({ backgroundColor: COLORS.primary, color: COLORS.dark }))
        .on("pointerout", () => viewHighscoresButton.setStyle({ backgroundColor: COLORS.darkAccent, color: COLORS.light }))
        .on("pointerdown", () => showGlobalHighscores(scene, gameOverMenu));

    const restartButton = scene.add.text(0, 130, 'Neustart', { fontSize: "24px", color: COLORS.light, backgroundColor: COLORS.darkAccent, padding: { left: 15, right: 15, top: 10, bottom: 10 }, fontFamily: "sans-serif", fontWeight: 'bold' })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => restartButton.setStyle({ backgroundColor: COLORS.primary, color: COLORS.dark }))
        .on("pointerout", () => restartButton.setStyle({ backgroundColor: COLORS.darkAccent, color: COLORS.light }))
        .on("pointerdown", () => { gameOverMenu.destroy(); background.destroy(); restartGame(scene); });

    gameOverMenu.add([gameOverText, finalScoreText, usernameInput, saveScoreButton, viewHighscoresButton, restartButton]);

    if (soundOn) scene.sound.play("gameover");
    music.stop();
}

async function showGlobalHighscores(scene, parentMenu) {
    try {
        parentMenu.setVisible(false);

        const { data: highscores, error } = await supabase.from('highscores').select('username, score').order('score', { ascending: false }).limit(10);
        if (error) throw error;

        const highscoresMenu = scene.add.container(config.width / 2, config.height / 2);
        const backButton = scene.add.text(0, 180, 'Zurück', { fontSize: "24px", color: COLORS.light, backgroundColor: COLORS.darkAccent, padding: { left: 15, right: 15, top: 10, bottom: 10 }, fontFamily: "sans-serif", fontWeight: 'bold' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on("pointerover", () => backButton.setStyle({ backgroundColor: COLORS.primary, color: COLORS.dark }))
            .on("pointerout", () => backButton.setStyle({ backgroundColor: COLORS.darkAccent, color: COLORS.light }))
            .on("pointerdown", () => { highscoresMenu.destroy(); parentMenu.setVisible(true); });
        highscoresMenu.add(backButton);

        if (highscores.length > 0) {
            let yOffset = -100;
            highscores.forEach(entry => { highscoresMenu.add(scene.add.text(0, yOffset, `${entry.username}: ${entry.score}`, { fontSize: "24px", color: COLORS.light, fontFamily: "sans-serif" }).setOrigin(0.5)); yOffset += 30; });
        } else {
            highscoresMenu.add(scene.add.text(0, 0, 'Noch keine Highscores', { fontSize: "24px", color: COLORS.light, fontFamily: "sans-serif" }).setOrigin(0.5));
        }
    } catch (error) {
        console.error("Fehler beim Laden der globalen Highscores:", error);
        scene.add.text(0, 0, 'Fehler beim Laden der Highscores', { fontSize: "24px", color: COLORS.light, fontFamily: "sans-serif" }).setOrigin(0.5);
    }
}

async function submitScore(username, score) {
    try {
        const { error } = await supabase.from('highscores').insert([{ username, score }]);
        if (error) throw error;
        console.log('Score submitted successfully!');
    } catch (error) {
        console.error("Fehler beim Senden der Highscore:", error);
        alert('Fehler beim Senden der Highscore.');
    }
}

function restartGame(scene) {
    score = 0;
    timeLeft = 15;
    level = 1;
    questionsAsked = 0;
    initializeQuestions();
    scene.scene.restart();
    if (isMobile) { musicStarted = false; soundOn = false; this.input.once('pointerdown', () => { if (!musicStarted) { music.play(); musicStarted = true; soundOn = true; this.scene.children.list.find(child => child.type === 'Text' && child.text === '🔇').setText('🔊'); } }); } 
    else { music.play(); soundOn = true; }
}

function toggleSound() {
    soundOn = !soundOn;
    game.sound.setMute(!soundOn);
    const soundButton = this.scene.children.list.find(child => child.type === 'Text' && (child.text === '🔊' || child.text === '🔇'));
    if (soundButton) soundButton.setText(soundOn ? '🔊' : '🔇');
    if (music) music.setMute(!soundOn);
}