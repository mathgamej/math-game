class Fraction {
    constructor(num, den = 1) {
        if (den === 0) throw new Error("Division by zero");
        this.num = den < 0 ? -num : num;
        this.den = Math.abs(den);
        this.simplify();
    }

    simplify() {
        const common = Fraction.gcd(Math.abs(this.num), this.den);
        this.num /= common;
        this.den /= common;
    }

    static gcd(a, b) {
        return b === 0 ? a : Fraction.gcd(b, a % b);
    }

    getFractionFromNumber(n) {
        // Simple conversion for mental math results
        // We assume the result is a relatively simple rational number
        const precision = 10000;
        const num = Math.round(n * precision);
        const den = precision;
        return new Fraction(num, den);
    }

    static fromString(s) {
        if (s.includes('/')) {
            const [n, d] = s.split('/').map(Number);
            return new Fraction(n, d || 1);
        }
        return new Fraction(Number(s), 1);
    }

    toString() {
        return this.den === 1 ? `${this.num}` : `${this.num}/${this.den}`;
    }

    equals(other) {
        return this.num === other.num && this.den === other.den;
    }
}

class MathGame {
    constructor() {
        this.score = 0;
        this.timeLeft = 60;
        this.currentAnswer = 0; // Can be number or Fraction
        this.gameActive = false;
        this.timerInterval = null;

        // Settings
        this.gameMode = 'integer'; // integer, decimal, fraction
        this.selectedOps = ['+', '-'];
        this.digitCount = 1;
        this.termCount = 2;

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

        // Settings Elements
        this.digitInput = document.getElementById('digit-select');
        this.termInput = document.getElementById('term-select');
        this.chips = document.querySelectorAll('.chip');
        this.modeChips = document.querySelectorAll('.mode-chip');

        // Buttons
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.showScreen('start'));

        // Chip interaction
        this.chips.forEach(chip => {
            chip.addEventListener('click', () => {
                chip.classList.toggle('active');
                this.updateSettings();
            });
        });

        this.modeChips.forEach(chip => {
            chip.addEventListener('click', () => {
                this.modeChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.updateSettings();
            });
        });

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

            if ((e.key >= '0' && e.key <= '9') || e.key === '.' || e.key === '/') {
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

    updateSettings() {
        this.selectedOps = Array.from(this.chips)
            .filter(c => c.classList.contains('active'))
            .map(c => c.getAttribute('data-op'));

        const activeMode = Array.from(this.modeChips).find(c => c.classList.contains('active'));
        this.gameMode = activeMode ? activeMode.getAttribute('data-mode') : 'integer';
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
            if (this.inputEl.value === '') this.inputEl.value = '-';
        } else if (action === 'dot') {
            if (!this.inputEl.value.includes('.')) this.inputEl.value += '.';
        } else if (action === 'fraction') {
            if (!this.inputEl.value.includes('/')) this.inputEl.value += '/';
        } else {
            // Numbers 0-9
            this.inputEl.value += value;
        }
    }

    startGame() {
        if (this.selectedOps.length === 0) {
            alert('演算子を少なくとも1つ選択してください。');
            return;
        }

        this.digitCount = parseInt(this.digitInput.value) || 1;
        this.termCount = parseInt(this.termInput.value) || 2;

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
        let expression = '';
        let validProblem = false;

        while (!validProblem) {
            try {
                const terms = [];
                const ops = [];

                for (let i = 0; i < this.termCount; i++) {
                    terms.push(this.getRandomValue());
                    if (i < this.termCount - 1) {
                        ops.push(this.selectedOps[Math.floor(Math.random() * this.selectedOps.length)]);
                    }
                }

                // Construct strings
                let displayStr = '';
                let calcStr = '';
                for (let i = 0; i < terms.length; i++) {
                    const t = terms[i];
                    const tDisplay = (typeof t === 'string' && t.includes('/')) || (typeof t === 'number' && t < 0) ? `(${t})` : `${t}`;
                    displayStr += tDisplay;

                    // For calc, convert fraction "a/b" to (a/b)
                    const tCalc = typeof t === 'string' && t.includes('/') ? `(${t})` : `${t}`;
                    calcStr += tCalc;

                    if (i < ops.length) {
                        const op = ops[i];
                        displayStr += ` ${op === '*' ? '×' : op === '/' ? '÷' : op} `;
                        calcStr += ` ${op} `;
                    }
                }

                const answer = eval(calcStr.replace(/÷/g, '/').replace(/×/g, '*'));

                if (this.gameMode === 'integer') {
                    if (Number.isInteger(answer)) {
                        this.currentAnswer = answer;
                        validProblem = true;
                    }
                } else if (this.gameMode === 'decimal') {
                    // Maximum 2 decimal places for user friendliness
                    const rounded = Math.round(answer * 100) / 100;
                    if (Math.abs(answer - rounded) < 0.0001) {
                        this.currentAnswer = rounded;
                        validProblem = true;
                    }
                } else if (this.gameMode === 'fraction') {
                    // For simplicity, we only handle fractions where answer can be represented clearly
                    // We check if it's a rational number (in this case, it always is since inputs are rational)
                    // We need a way to compare the answer. Let's convert eval answer to a simple ratio if possible,
                    // or just use a custom fraction math engine.
                    // To keep it simple, we'll use the eval result and compare with a Fraction object.
                    this.currentAnswer = answer;
                    validProblem = true;
                }

                if (validProblem) {
                    this.problemEl.textContent = displayStr + ' = ?';
                }
            } catch (e) { continue; }
        }
        this.inputEl.value = '';
    }

    getRandomValue() {
        if (this.gameMode === 'integer') {
            return this.getRandomInt(this.digitCount);
        } else if (this.gameMode === 'decimal') {
            const val = this.getRandomInt(this.digitCount) / 10;
            return Math.round(val * 10) / 10;
        } else {
            // Fraction mode: a/b where a and b are small for mental math
            const a = this.getRandomInt(1);
            let b = Math.abs(this.getRandomInt(1)) || 1;
            if (b === 0) b = 1;
            const f = new Fraction(a, b);
            return f.toString();
        }
    }

    getRandomInt(digits) {
        const min = Math.pow(10, digits - 1);
        const max = Math.pow(10, digits) - 1;
        let num = Math.floor(Math.random() * (max - min + 1)) + min;

        // 50% chance of being negative
        if (Math.random() > 0.5) num *= -1;
        return num;
    }

    checkAnswer() {
        if (!this.gameActive) return;

        const val = this.inputEl.value.trim();
        let isCorrect = false;

        if (this.gameMode === 'fraction') {
            try {
                const userFraction = Fraction.fromString(val);
                const targetFraction = this.getFractionFromNumber(this.currentAnswer);
                isCorrect = userFraction.equals(targetFraction);
            } catch (e) { isCorrect = false; }
        } else {
            const userNum = parseFloat(val);
            isCorrect = Math.abs(userNum - this.currentAnswer) < 0.0001;
        }

        if (isCorrect) {
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
