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

    static fromString(s) {
        if (s.includes('/')) {
            const [n, d] = s.split('/').map(Number);
            return new Fraction(n, d || 1);
        }
        return new Fraction(Number(s), 1);
    }

    static fromNumber(n) {
        const precision = 1000000;
        return new Fraction(Math.round(n * precision), precision);
    }

    add(other) {
        return new Fraction(this.num * other.den + other.num * this.den, this.den * other.den);
    }

    sub(other) {
        return new Fraction(this.num * other.den - other.num * this.den, this.den * other.den);
    }

    mul(other) {
        return new Fraction(this.num * other.num, this.den * other.den);
    }

    div(other) {
        return new Fraction(this.num * other.den, this.den * other.num);
    }

    toNumber() {
        return this.num / this.den;
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
        this.problemsSolved = 0;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.currentAnswer = null; // Always a Fraction object
        this.gameActive = false;
        this.timerInterval = null;

        // Settings
        this.gameMode = 'integer';
        this.selectedOps = ['+', '-'];
        this.digitCount = 1;
        this.termCount = 2;
        this.problemTarget = 10;

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
        this.finalTimeEl = document.getElementById('final-time');

        // Settings Elements
        this.digitInput = document.getElementById('digit-select');
        this.termInput = document.getElementById('term-select');
        this.chips = document.querySelectorAll('.chip');
        this.modeChips = document.querySelectorAll('.mode-chip');
        this.countChips = document.querySelectorAll('.count-chip');

        // Buttons
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.showScreen('start'));

        // Settings Interaction
        this.initSettings();

        // Keypad
        const keypad = document.getElementById('keypad');
        if (keypad) {
            keypad.addEventListener('click', (e) => {
                const target = e.target.closest('.key');
                if (target) this.handleKeyInput(target);
            });
        }

        // Keyboard support
        window.addEventListener('keydown', (e) => {
            if (!this.gameActive) return;
            if ((e.key >= '0' && e.key <= '9') || e.key === '.' || e.key === '/') {
                this.inputEl.value += e.key;
            } else if (e.key === '-') {
                if (this.inputEl.value === '') this.inputEl.value = '-';
            } else if (e.key === 'Backspace') {
                this.inputEl.value = this.inputEl.value.slice(0, -1);
            } else if (e.key === 'Enter') {
                this.checkAnswer();
            }
        });

        // SW Registration
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(() => { });
        }
    }

    initSettings() {
        this.chips.forEach(c => c.addEventListener('click', () => {
            c.classList.toggle('active');
            this.updateSettings();
        }));
        this.modeChips.forEach(c => c.addEventListener('click', () => {
            this.modeChips.forEach(x => x.classList.remove('active'));
            c.classList.add('active');
            this.updateSettings();
        }));
        this.countChips.forEach(c => c.addEventListener('click', () => {
            this.countChips.forEach(x => x.classList.remove('active'));
            c.classList.add('active');
            this.updateSettings();
        }));
    }

    updateSettings() {
        this.selectedOps = Array.from(this.chips)
            .filter(c => c.classList.contains('active'))
            .map(c => c.getAttribute('data-op'));

        const activeMode = Array.from(this.modeChips).find(c => c.classList.contains('active'));
        this.gameMode = activeMode ? activeMode.getAttribute('data-mode') : 'integer';

        const activeCount = Array.from(this.countChips).find(c => c.classList.contains('active'));
        this.problemTarget = activeCount ? parseInt(activeCount.getAttribute('data-count')) : 10;
    }

    handleKeyInput(target) {
        if (!this.gameActive) return;
        const action = target.getAttribute('data-action');
        const val = target.textContent;

        if (action === 'enter') this.checkAnswer();
        else if (action === 'clear') this.inputEl.value = '';
        else if (action === 'minus') { if (this.inputEl.value === '') this.inputEl.value = '-'; }
        else if (action === 'dot') { if (!this.inputEl.value.includes('.')) this.inputEl.value += '.'; }
        else if (action === 'fraction') { if (!this.inputEl.value.includes('/')) this.inputEl.value += '/'; }
        else this.inputEl.value += val;
    }

    startGame() {
        if (this.selectedOps.length === 0) {
            alert('演算子を少なくとも1つ選択してください。');
            return;
        }
        this.updateSettings();
        this.digitCount = parseInt(this.digitInput.value) || 1;
        this.termCount = parseInt(this.termInput.value) || 2;

        this.problemsSolved = 0;
        this.elapsedTime = 0;
        this.gameActive = true;
        this.startTime = Date.now();

        this.updateProgress();
        this.updateTimer();
        this.showScreen('play');
        this.generateProblem();
        this.startTimer();
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.elapsedTime = (Date.now() - this.startTime) / 1000;
            this.updateTimer();
        }, 100);
    }

    updateTimer() {
        this.timerEl.textContent = this.formatTime(this.elapsedTime);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 10);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
    }

    updateProgress() {
        this.scoreEl.textContent = `${this.problemsSolved} / ${this.problemTarget}`;
    }

    showScreen(name) {
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        this.screens[name].classList.add('active');
    }

    evaluateExpression(terms, ops) {
        // High precedence: * and /
        let newTerms = [terms[0]];
        let newOps = [];

        for (let i = 0; i < ops.length; i++) {
            const op = ops[i];
            const nextTerm = terms[i + 1];
            if (op === '*' || op === '/') {
                const prevTerm = newTerms.pop();
                const result = op === '*' ? prevTerm.mul(nextTerm) : prevTerm.div(nextTerm);
                newTerms.push(result);
            } else {
                newOps.push(op);
                newTerms.push(nextTerm);
            }
        }

        // Low precedence: + and -
        let result = newTerms[0];
        for (let i = 0; i < newOps.length; i++) {
            const op = newOps[i];
            const nextTerm = newTerms[i + 1];
            result = op === '+' ? result.add(nextTerm) : result.sub(nextTerm);
        }

        return result;
    }

    generateProblem() {
        let valid = false;
        while (!valid) {
            try {
                const terms = [];
                const ops = [];
                for (let i = 0; i < this.termCount; i++) {
                    terms.push(this.getRandomFraction());
                    if (i < this.termCount - 1) ops.push(this.selectedOps[Math.floor(Math.random() * this.selectedOps.length)]);
                }

                const result = this.evaluateExpression(terms, ops);

                if (this.gameMode === 'integer') {
                    if (result.den === 1) {
                        this.currentAnswer = result;
                        valid = true;
                    }
                } else if (this.gameMode === 'decimal') {
                    // Check if it's a stable decimal (e.g. max 2 decimal places)
                    const val = result.toNumber();
                    const rnd = Math.round(val * 100) / 100;
                    if (Math.abs(val - rnd) < 0.000001) {
                        this.currentAnswer = result;
                        valid = true;
                    }
                } else {
                    // Fraction mode: any valid result
                    this.currentAnswer = result;
                    valid = true;
                }

                if (valid) {
                    let display = '';
                    for (let i = 0; i < terms.length; i++) {
                        const t = terms[i];
                        const isNeg = t.num < 0;
                        const isFrac = t.den !== 1;
                        const wrap = isNeg || isFrac;

                        let tStr = t.toString();
                        if (this.gameMode === 'decimal' && !isFrac) {
                            // If it should be decimal but it's an integer, just show it
                        } else if (this.gameMode === 'decimal') {
                            tStr = t.toNumber().toString();
                        }

                        display += wrap ? `(${tStr})` : tStr;
                        if (i < ops.length) {
                            display += ` ${ops[i] === '*' ? '×' : ops[i] === '/' ? '÷' : ops[i]} `;
                        }
                    }
                    this.problemEl.textContent = display + ' = ?';
                }
            } catch (e) { continue; }
        }
        this.inputEl.value = '';
    }

    getRandomFraction() {
        if (this.gameMode === 'integer') {
            return new Fraction(this.getRandomInt(this.digitCount), 1);
        } else if (this.gameMode === 'decimal') {
            const n = this.getRandomInt(this.digitCount);
            return new Fraction(n, 10);
        } else {
            const a = this.getRandomInt(1);
            let b = Math.abs(this.getRandomInt(1)) || 1;
            return new Fraction(a, b);
        }
    }

    getRandomInt(digits) {
        const min = Math.pow(10, digits - 1);
        const max = Math.pow(10, digits) - 1;
        let n = Math.floor(Math.random() * (max - min + 1)) + min;
        return Math.random() > 0.5 ? -n : n;
    }

    checkAnswer() {
        if (!this.gameActive) return;
        const val = this.inputEl.value.trim();
        if (val === '') return;

        let correct = false;
        try {
            if (this.gameMode === 'decimal') {
                const userNum = parseFloat(val);
                correct = Math.abs(userNum - this.currentAnswer.toNumber()) < 0.0001;
            } else {
                const userF = Fraction.fromString(val);
                correct = userF.equals(this.currentAnswer);
            }
        } catch (e) { correct = false; }

        if (correct) {
            this.problemsSolved++;
            this.showFeedback('Correct!', 'correct');
            this.updateProgress();
            if (this.problemsSolved >= this.problemTarget) this.endGame();
            else this.generateProblem();
        } else {
            this.showFeedback('Wrong!', 'wrong');
            this.inputEl.style.borderColor = '#ef4444';
            setTimeout(() => this.inputEl.style.borderColor = '', 300);
            this.inputEl.value = '';
        }
    }

    showFeedback(text, cls) {
        this.feedbackEl.textContent = text;
        this.feedbackEl.className = `feedback ${cls}`;
        setTimeout(() => {
            if (this.feedbackEl.textContent === text) this.feedbackEl.textContent = '';
        }, 800);
    }

    endGame() {
        this.gameActive = false;
        clearInterval(this.timerInterval);
        this.finalTimeEl.textContent = this.formatTime(this.elapsedTime);
        this.showScreen('result');
    }
}

window.addEventListener('load', () => new MathGame());
