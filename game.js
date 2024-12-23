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
let currentLevel = 2;
let levelText;
let questionsPerLevel = 7;
let questionsAskedInLevel = 0;
let answerButtons = [];
let currentTableLevel = 2;
let soundOn = true;
let availableQuestions = [];
let music;
let debugText; // Text element for debugging

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
    this.load.audio("correct", "./yes.mp3");
    this.load.audio("wrong", "./no.mp3");
    this.load.audio("levelup", "./levelup.mp3");
    this.load.audio("gameover", "./gameover.mp3");
    this.load.audio('music', './song.mp3');
}

function create() {
    this.cameras.main.setBackgroundColor(COLORS.dark);

    timerText = this.add.text(config.width / 2, 50, `Zeit: ${timeLeft}`, { fontSize: "32px", color: COLORS.light, fontFamily: "sans-serif", fontWeight: 'bold' }).setOrigin(0.5);
    scoreText = this.add.text(10, 10, `Punkte: ${score}`, { fontSize: "24px", color: COLORS.primary, fontFamily: "sans-serif", fontWeight: 'bold' });
    const highscore = localStorage.getItem("highscore") || 0;
    highscoreText = this.add.text(10, 40, `Highscore: ${highscore}`, { fontSize: "18px", color: COLORS.light, fontFamily: "sans-serif" });
    levelText = this.add.text(config.width - 10, 10, `Level: ${currentLevel}`, { fontSize: "24px", color: COLORS.light, fontFamily: "sans-serif", fontWeight: 'bold' }).setOrigin(1, 0);
    globalHighscoreText = this.add.text(10, config.height - 10, 'Globale Highscores laden...', { fontSize: '16px', color: COLORS.light, fontFamily: 'sans-serif', origin: [0, 1] });

    const soundButton = this.add.text(config.width - 10, 40, '🔊', { fontSize: '24px', color: COLORS.light, fontFamily: 'sans-serif' })
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', toggleSound);
    
    // Debug Text
        debugText = this.add.text(10, config.height - 30, '', { fontSize: '14px', color: 'yellow', fontFamily: 'sans-serif' });


    fetchGlobalHighscores(this);
    initializeQuestions();
    generateQuestion(this);

    this.time.addEvent({ delay: 1000, callback: () => {
            timeLeft--;
            timerText.setText(`Zeit: ${timeLeft}`);
            if (timeLeft <= 0) {
                gameOver(this);
            }
        }, loop: true
    });

     music = this.sound.add('music', { loop: true, volume: 0.5 });
    music.play();
}

function update() {}

function initializeQuestions() {
    availableQuestions = [];
    let maxNum = 12;

    if (currentLevel >= 1 && currentLevel <= 10) {
        for (let i = 2; i <= maxNum - 1; i++) {
            if (![1, 2, 10].includes(i)) {
                availableQuestions.push({ num1: i, num2: currentLevel });
            }
        }
    } else if (currentLevel === 11) {
        for (let i = 3; i <= maxNum - 2; i++) {
            for (let j = 3; j <= maxNum - 2; j++) {
                if (![1, 2, 10].includes(i) && ![1, 2, 10].includes(j)) {
                    availableQuestions.push({ num1: i, num2: j });
                }
            }
        }
    } else {
        for (let i = 2; i <= maxNum - 1; i++) {
            if (![1, 2, 10].includes(i)) {
                availableQuestions.push({ num1: i, num2: currentTableLevel });
            }
        }
    }

    Phaser.Utils.Array.Shuffle(availableQuestions);
}

function generateQuestion(scene) {
     if (availableQuestions.length === 0) {
        initializeQuestions();
    }

    const question = availableQuestions.pop();
    const num1 = question.num1;
    const num2 = question.num2;
    
    currentAnswer = num1 * num2;
    if (questionText) questionText.destroy();
    questionText = scene.add.text(config.width / 2, 150, `${num1} x ${num2} = ?`, { fontSize: "64px", color: COLORS.primary, fontFamily: "sans-serif", fontWeight: 'bold' }).setOrigin(0.5);

    let possibleAnswers = [currentAnswer];
    while (possibleAnswers.length < 6) {
        const wrongAnswer = Math.round(currentAnswer + Phaser.Math.Between(-10, 10));
        if (wrongAnswer > 0 && Math.abs(wrongAnswer - currentAnswer) > 0 && !possibleAnswers.includes(wrongAnswer)) {
            possibleAnswers.push(wrongAnswer);
        }
    }

    Phaser.Utils.Array.Shuffle(possibleAnswers);
    createAnswerButtons(scene, possibleAnswers);

    debugText.setText(`Current Answer: ${currentAnswer}`);
}

function createAnswerButtons(scene, answers) {
    answerButtons.forEach((button) => button.destroy());
    answerButtons = [];

    const buttonWidth = 130;
    const spacing = 15;
    const rows = 2;
    const cols = 3;
    const startX = (config.width - (cols * buttonWidth + (cols - 1) * spacing)) / 2;
    const startY = 380;

    const buttonColors = [
        COLORS.primary,
        COLORS.light,
        COLORS.primary,
        COLORS.light,
        COLORS.primary,
        COLORS.light
    ];

    let buttonIndex = 0;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = startX + col * (buttonWidth + spacing) + buttonWidth / 2;
            const y = startY + row * (buttonWidth * 0.8 + spacing) + buttonWidth / 2;

            const buttonColor = buttonColors[buttonIndex];
             const button = scene.add.text(x, y, answers[buttonIndex], { fontSize: "32px", color: COLORS.dark, backgroundColor: buttonColor, padding: { left: 15, right: 15, top: 10, bottom: 10 }, fontFamily: "sans-serif", fontWeight: 'bold' })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true })
                .on("pointerover", () => { button.setStyle({ backgroundColor: COLORS.darkAccent }); scene.tweens.add({ targets: button, scale: 1.1, duration: 100, ease: "Sine.easeInOut" }); })
                .on("pointerout", () => { button.setStyle({ backgroundColor: buttonColor }); scene.tweens.add({ targets: button, scale: 1, duration: 100, ease: "Sine.easeInOut" }); })
                 .on("pointerdown", function() { // Hier der fix: Closure nutzen
                     checkAnswer(this.text, scene, this); // this.text gibt den Wert des angeklickten Buttons wieder
                     });
            answerButtons.push(button);
            buttonIndex++;
        }
    }
}
function checkAnswer(selectedAnswer, scene, button) {
  console.log("Raw Selected Answer:", selectedAnswer);
  console.log("Raw Current Answer:", currentAnswer);

    const parsedSelectedAnswer = parseInt(selectedAnswer.trim(), 10);
    const parsedCurrentAnswer = parseInt(currentAnswer, 10);


   console.log("Parsed Selected Answer:", parsedSelectedAnswer);
    console.log("Parsed Current Answer:", parsedCurrentAnswer);


    const isCorrect = parsedSelectedAnswer === parsedCurrentAnswer;


     debugText.setText(`Selected Answer: ${selectedAnswer}, Correct Answer: ${currentAnswer}, isCorrect: ${isCorrect}`);
     console.log("isCorrect:", isCorrect);

    if (isCorrect) {
        score += 10;
        scoreText.setText(`Punkte: ${score}`);
        questionsAskedInLevel++;
         if (questionsAskedInLevel >= questionsPerLevel) {
            levelUp(scene);
        } else {
            generateQuestion(scene);
        }
        if (soundOn) scene.sound.play("correct");
         
    }
     else {
        timeLeft -= 5;
        if (timeLeft < 0) timeLeft = 0;
        timerText.setText(`Zeit: ${timeLeft}`);
        if (soundOn) scene.sound.play("wrong");

            // Highlight the incorrectly selected button
        if (button) {
            scene.tweens.add({
                targets: button,
                backgroundColor: { from: '#ff4d4d', to: COLORS.darkAccent },
                duration: 250,
                ease: "Linear",
                yoyo: true
            });
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

    initializeQuestions();
    generateQuestion(scene);
}


async function gameOver(scene) {
    scene.time.removeAllEvents();

     const background = scene.add.rectangle(0, 0, config.width, config.height, 0x000000, 0.7).setOrigin(0);

    const gameOverMenu = scene.add.container(config.width / 2, config.height / 2);

    const gameOverText = scene.add.text(0, -150, 'Game Over!', { fontSize: "64px", color: COLORS.primary, fontFamily: "sans-serif", fontWeight: 'bold' }).setOrigin(0.5);
    gameOverMenu.add(gameOverText);

     const finalScoreText = scene.add.text(0, -80, `Deine Punktzahl: ${score}`, { fontSize: "32px", color: COLORS.light, fontFamily: "sans-serif" }).setOrigin(0.5);
    gameOverMenu.add(finalScoreText);

    const usernameInput = scene.add.dom(0, -20, 'input', `width: 200px; height: 30px; font-size: 16px; text-align: center; background-color: ${COLORS.light}; color: ${COLORS.dark}; border: 2px solid ${COLORS.primary}; border-radius: 5px;`, 'Your Name');
    usernameInput.node.value = localStorage.getItem('username') || '';
    gameOverMenu.add(usernameInput);

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

    const viewHighscoresButton = scene.add.text(0, 80, 'Highscores', { fontSize: "24px", color: COLORS.light, backgroundColor: COLORS.darkAccent, padding: { left: 15, right: 15, top: 10, bottom: 10 }, fontFamily: "sans-serif", fontWeight: 'bold' })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => viewHighscoresButton.setStyle({ backgroundColor: COLORS.primary, color: COLORS.dark }))
        .on("pointerout", () => viewHighscoresButton.setStyle({ backgroundColor: COLORS.darkAccent, color: COLORS.light }))
        .on("pointerdown", () => {
            showGlobalHighscores(scene, gameOverMenu);
        });
    gameOverMenu.add(viewHighscoresButton);

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
     music.stop();
}


async function showGlobalHighscores(scene, parentMenu) {
    try {
         parentMenu.setVisible(false);

        const { data: highscores, error } = await supabase
            .from('highscores')
            .select('username, score')
            .order('score', { ascending: false })
            .limit(10);

        if (error) {
            throw error;
        }
        const highscoresMenu = scene.add.container(config.width / 2, config.height / 2);
          const backButton = scene.add.text(0, 180, 'Zurück', { fontSize: "24px", color: COLORS.light, backgroundColor: COLORS.darkAccent, padding: { left: 15, right: 15, top: 10, bottom: 10 }, fontFamily: "sans-serif", fontWeight: 'bold' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on("pointerover", () => backButton.setStyle({ backgroundColor: COLORS.primary, color: COLORS.dark }))
            .on("pointerout", () => backButton.setStyle({ backgroundColor: COLORS.darkAccent, color: COLORS.light }))
            .on("pointerdown", () => {
                highscoresMenu.destroy();
                parentMenu.setVisible(true);
            });
        highscoresMenu.add(backButton);


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
    currentLevel = 2;
    questionsAskedInLevel = 0;
    currentTableLevel = 2;
    initializeQuestions();
    scene.scene.restart();
     music.play();
}

function toggleSound() {
     soundOn = !soundOn;
     game.sound.setMute(!soundOn);
    const soundButton = this.scene.children.list.find(child => child.type === 'Text' && child.text === (soundOn ? '🔊' : '🔇'));
    if (soundButton) {
        soundButton.setText(soundOn ? '🔊' : '🔇');
    }
    if (music) {
        music.setMute(!soundOn);
    }
}