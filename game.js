const COLORS = {
    dark: '#222831',
    darkAccent: '#393E46',
    primary: '#00ADB5',
    light: '#EEEEEE'
};

// Initialize Supabase client
const SUPABASE_URL = 'https://dnrrdfapxzqpfabjxcji.supabase.co'; // Replace with your Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRucnJkZmFweHpxcGZhYmp4Y2ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NjMwODksImV4cCI6MjA1MDUzOTA4OX0.mzVEpUpoAH2JzKBEXRgQ_ParxBju9f97qRlQv4uR8aM'; // Replace with your Supabase Anon Key
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
        disableWebAudio: true // Fix for some audio issues
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

        const emitter = scene.add.particles(config.width / 2, 300, "flares", { frame: { frames: ["red", "green", "blue"], cycle: true }, blendMode: "ADD", lifespan: 500, speed: { min: 200, max: 300 }, scale: { start: 0.8, end: 0 }, quantity: 20 });
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

    const emitter = scene.add.particles(config.width / 2, 300, "flares", { frame: "green", blendMode: "ADD", lifespan: 1500, speed: { min: 100, max: 400 }, angle: { min: 0, max: 360 }, scale: { start: 1.2, end: 0 }, quantity: 50 });
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

    const gameOverContainer = document.createElement('div');
    gameOverContainer.id = 'game-over-ui';

    const gameOverText = document.createElement('h2');
    gameOverText.textContent = 'Game Over!';
    gameOverText.style.color = COLORS.light;

    const finalScoreText = document.createElement('p');
    finalScoreText.textContent = `Deine Punktzahl: ${score}`;
    finalScoreText.style.color = COLORS.light;

    const usernameInput = document.createElement('input');
    usernameInput.type = 'text';
    usernameInput.id = 'username-input';
    usernameInput.placeholder = 'Dein Name';
    usernameInput.value = localStorage.getItem('username') || '';

    const saveScoreButton = document.createElement('button');
    saveScoreButton.textContent = 'Speichern und Highscore senden';
    saveScoreButton.onclick = async () => {
        const username = usernameInput.value.trim();
        if (username) {
            localStorage.setItem('username', username);
            await submitScore(username, score);
            alert('Highscore gesendet!');
            showGlobalHighscores();
            gameOverContainer.remove();
            restartGame(scene);
        } else {
            alert('Bitte gib einen Namen ein.');
        }
    };

    const signUpButton = document.createElement('button');
    signUpButton.textContent = 'Konto erstellen';
    signUpButton.onclick = () => supabase.auth.signUp({/* email, password */}).then(() => alert('Check deine Emails!')); // Basic example

    const signInButton = document.createElement('button');
    signInButton.textContent = 'Anmelden';
    signInButton.onclick = () => supabase.auth.signInWithPassword({/* email, password */}); // Basic example

    gameOverContainer.appendChild(gameOverText);
    gameOverContainer.appendChild(finalScoreText);
    gameOverContainer.appendChild(usernameInput);
    gameOverContainer.appendChild(saveScoreButton);
    gameOverContainer.appendChild(signUpButton);
    gameOverContainer.appendChild(signInButton);

    document.getElementById('game-container').appendChild(gameOverContainer);

    if (soundOn) scene.sound.play("gameover");
    scene.tweens.add({ targets: gameOverText, angle: 360, duration: 2000, ease: "Sine.easeInOut" });
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