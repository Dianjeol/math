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
let currentLevel = 2; // Start at level 2
let levelText;
let questionsPerLevel = 7;
let questionsAskedInLevel = 0;
let answerButtons = [];
let currentTableLevel = 2;
let soundOn = true;
let availableQuestions = []; // Array to store questions for the current level

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

// ... (rest of the code) ...

function createAnswerButtons(scene, answers) {
    answerButtons.forEach((button) => button.destroy());
    answerButtons = [];

    const buttonWidth = 180; // Increased button width
    const spacing = 20; // Increased spacing
    const startX = (config.width - (6 * buttonWidth + 5 * spacing)) / 2;
    const buttonY = 550;

    const buttonColors = [
        '#FF5733', // Reddish Orange
        '#33FF57', // Bright Green
        '#3357FF', // Bright Blue
        '#FF33F6', // Bright Magenta
        '#F6FF33', // Bright Yellow
        '#33FFF6'  // Bright Cyan
    ];

    for (let i = 0; i < 6; i++) {
        const x = startX + i * (buttonWidth + spacing) + buttonWidth / 2;
        const buttonColor = buttonColors[i];
        const button = scene.add.text(x, buttonY, answers[i], { fontSize: "40px", color: COLORS.dark, backgroundColor: buttonColor, padding: { left: 25, right: 25, top: 20, bottom: 20 }, fontFamily: "sans-serif", fontWeight: 'bold' }) // Increased font size and padding
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on("pointerover", () => { button.setStyle({ backgroundColor: COLORS.primary, color: COLORS.light }); scene.tweens.add({ targets: button, scale: 1.1, duration: 100, ease: "Sine.easeInOut" }); })
            .on("pointerout", () => { button.setStyle({ backgroundColor: buttonColor, color: COLORS.dark }); scene.tweens.add({ targets: button, scale: 1, duration: 100, ease: "Sine.easeInOut" }); })
            .on("pointerdown", () => checkAnswer(answers[i], scene));
        answerButtons.push(button);
    }
}

// ... (rest of the code) ...

function restartGame(scene) {
    score = 0;
    timeLeft = 15;
    currentLevel = 2; // Reset to level 2 on restart
    questionsAskedInLevel = 0;
    currentTableLevel = 2;
    initializeQuestions();
    scene.scene.restart();
}