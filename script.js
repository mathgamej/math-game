class MathGame {
    constructor() {
        this.score = 0;
        this.timeLeft = 60;
        this.currentAnswer = 0;
        this.gameActive = false;
        this.timerInterval = null;

        // Elements
        this.screens = {
            start: document.getElementById('start-screen'),
            play: document.getElementById('play-screen'),
            result: document.getElementById('result-screen')
        };
        this.scoreEl = document.getElementById('score');
        this.timerEl = document.getElementById('timer');
        this.problemEl = document.getElementById('problem-text');
        this.inputEl = document.getElementById('answer-input');
        this.feedbackEl = document.getElementById('feedback');
        this.finalScoreEl = document.getElementById('final-score-val');

        // Buttons
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());

        // Keypad
        const keypad = document.getElementById('keypad');
        if (keypad) {
            keypad.addEventListener('click', (e) => {
                if (e.target.classList.contains('key')) {
                    this.handleKeyInput(e.target);
                }
            });
        }

        // Physical Keyboard Support
        window.addEventListener('keydown', (e) => {
            if (!this.gameActive) return;

            if (e.key >= '0' && e.key <= '9') {
                this.inputEl.value += e.key;
            } else if (e.key === '-') {
                if (this.inputEl.value === '') {
                    this.inputEl.value = '-';
                }
            } else if (e.key === 'Backspace') {
                this.inputEl.value = this.inputEl.value.slice(0, -1);
            } else if (e.key === 'Enter') {
                this.checkAnswer();
            }
        });
    }

    handleKeyInput(target) {
        if (!this.gameActive) return;

        const action = target.getAttribute('data-action');
        const value = target.textContent;

        if (action === 'enter') {
            this.checkAnswer();
        } else if (action === 'clear') {
            this.inputEl.value = '';
        } else if (action === 'minus') {
            if (this.inputEl.value === '') {
                this.inputEl.value = '-';
            }
        } else {
            // Numbers 0-9
            this.inputEl.value += value;
        }
    }

    startGame() {
        this.score = 0;
        this.timeLeft = 60;
        this.gameActive = true;
        this.updateScore();
        this.updateTimer();
        this.showScreen('play');
        this.generateProblem();
        this.startTimer();
        this.inputEl.focus();
    }

    showScreen(screenName) {
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        this.screens[screenName].classList.add('active');
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateTimer();
            if (this.timeLeft <= 0) this.endGame();
        }, 1000);
    }

    updateTimer() {
        this.timerEl.textContent = this.timeLeft;
        if (this.timeLeft <= 10) {
            this.timerEl.style.color = '#ef4444';
        } else {
            this.timerEl.style.color = '';
        }
    }

    updateScore() {
        this.scoreEl.textContent = this.score;
    }

    generateProblem() {
        const operators = ['+', '-', '*'];
        const op = operators[Math.floor(Math.random() * operators.length)];

        // Generate numbers between -20 and 20
        let a = Math.floor(Math.random() * 41) - 20;
        let b = Math.floor(Math.random() * 41) - 20;

        // Adjust for multiplication to keep it simple
        if (op === '*') {
            a = Math.floor(Math.random() * 21) - 10; // -10 to 10
            b = Math.floor(Math.random() * 11) - 5;   // -5 to 5
        }

        const formatNum = (n) => n < 0 ? `(${n})` : n;

        this.problemEl.textContent = `${formatNum(a)} ${op} ${formatNum(b)} = ?`;

        switch (op) {
            case '+': this.currentAnswer = a + b; break;
            case '-': this.currentAnswer = a - b; break;
            case '*': this.currentAnswer = a * b; break;
        }

        this.inputEl.value = '';
    }

    checkAnswer() {
        if (!this.gameActive) return;

        const userAnswer = parseInt(this.inputEl.value);
        if (userAnswer === this.currentAnswer) {
            this.score += 10;
            this.showFeedback('Correct!', 'correct');
            this.generateProblem();
        } else {
            this.score = Math.max(0, this.score - 5);
            this.showFeedback('Wrong!', 'wrong');
            // Flash red on input
            this.inputEl.style.borderColor = '#ef4444';
            setTimeout(() => this.inputEl.style.borderColor = '', 300);
        }

        this.updateScore();
        this.inputEl.value = '';
    }

    showFeedback(text, className) {
        this.feedbackEl.textContent = text;
        this.feedbackEl.className = `feedback ${className}`;
        setTimeout(() => {
            this.feedbackEl.textContent = '';
        }, 800);
    }

    endGame() {
        this.gameActive = false;
        clearInterval(this.timerInterval);
        this.finalScoreEl.textContent = this.score;
        this.showScreen('result');
    }
}

// Initialize
window.addEventListener('load', () => {
    new MathGame();
});
