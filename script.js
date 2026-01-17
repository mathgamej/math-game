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
        if (!s || s.trim() === '') return new Fraction(0, 1);
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
        this.currentProblem = null;
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

        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.showScreen('start'));

        this.initSettings();

        const keypad = document.getElementById('keypad');
        if (keypad) {
            keypad.addEventListener('click', (e) => {
                const target = e.target.closest('.key');
                if (target) this.handleKeyInput(target);
            });
        }

        window.addEventListener('keydown', (e) => {
            if (!this.gameActive) return;
            if ((e.key >= '0' && e.key <= '9') || e.key === '.' || e.key === '/' || e.key === 'x' || e.key === 'y' || e.key === '+' || e.key === '-') {
                this.inputEl.value += e.key;
            } else if (e.key === 'Backspace') {
                this.inputEl.value = this.inputEl.value.slice(0, -1);
            } else if (e.key === 'Enter') {
                this.checkAnswer();
            }
        });

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

        this.digitCount = parseInt(this.digitInput.value) || 1;
        this.termCount = parseInt(this.termInput.value) || 2;
    }

    handleKeyInput(target) {
        if (!this.gameActive) return;
        const action = target.getAttribute('data-action');
        const val = target.textContent;

        if (action === 'enter') this.checkAnswer();
        else if (action === 'clear') this.inputEl.value = '';
        else if (action === 'minus' || action === 'plus') { this.inputEl.value += val; }
        else if (action === 'dot') { if (!this.inputEl.value.includes('.')) this.inputEl.value += '.'; }
        else if (action === 'fraction') { if (!this.inputEl.value.includes('/')) this.inputEl.value += '/'; }
        else if (action === 'char') { this.inputEl.value += val; }
        else this.inputEl.value += val;
    }

    startGame() {
        this.updateSettings();
        if (this.selectedOps.length === 0 && (this.gameMode !== 'algebra' && this.gameMode !== 'equation')) {
            alert('演算子を少なくとも1つ選択してください。');
            return;
        }

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

    // --- Problem Generation Facade ---
    generateProblem() {
        this.inputEl.value = '';
        const generators = {
            'integer': () => this.generatorArithmetic('integer'),
            'decimal': () => this.generatorArithmetic('decimal'),
            'fraction': () => this.generatorArithmetic('fraction'),
            'algebra': () => this.generatorAlgebra(),
            'equation': () => this.generatorEquation()
        };

        const gen = generators[this.gameMode];
        if (gen) {
            this.currentProblem = gen();
            this.problemEl.textContent = this.currentProblem.display + ' = ?';
            // Equation mode has its own display logic since it's not always "= ?"
            if (this.gameMode === 'equation') {
                this.problemEl.textContent = this.currentProblem.display;
            }
        }
    }

    // --- Answer Validation Facade ---
    checkAnswer() {
        if (!this.gameActive || !this.currentProblem) return;
        const userInput = this.inputEl.value.trim().replace(/\s/g, '');
        if (userInput === '') return;

        let isCorrect = false;
        try {
            isCorrect = this.currentProblem.validate(userInput);
        } catch (e) { isCorrect = false; }

        if (isCorrect) {
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

    // --- Generators ---
    generatorArithmetic(subMode) {
        let valid = false;
        while (!valid) {
            const terms = [];
            const ops = [];
            for (let i = 0; i < this.termCount; i++) {
                terms.push(this.utilGetRandomFraction(subMode));
                if (i < this.termCount - 1) ops.push(this.selectedOps[Math.floor(Math.random() * this.selectedOps.length)]);
            }
            const result = this.utilEvaluateArithmetic(terms, ops);

            if (subMode === 'integer' && result.den !== 1) continue;
            if (subMode === 'decimal') {
                const val = result.toNumber();
                if (Math.abs(val - Math.round(val * 100) / 100) > 0.000001) continue;
            }

            let display = '';
            for (let i = 0; i < terms.length; i++) {
                const t = terms[i];
                const wrap = t.num < 0 || t.den !== 1;
                let tStr = subMode === 'decimal' && t.den !== 1 ? t.toNumber().toString() : t.toString();
                display += wrap ? `(${tStr})` : tStr;
                if (i < ops.length) display += ` ${ops[i] === '*' ? '×' : ops[i] === '/' ? '÷' : ops[i]} `;
            }

            return {
                display,
                answer: result,
                validate: (input) => {
                    if (subMode === 'decimal') {
                        return Math.abs(parseFloat(input) - result.toNumber()) < 0.0001;
                    }
                    return Fraction.fromString(input).equals(result);
                }
            };
        }
    }

    generatorAlgebra() {
        const type = Math.floor(Math.random() * 3);
        let sums = { x: 0, y: 0, c: 0 };
        let display = '';

        if (type === 0) {
            // Flat simplification
            const terms = [];
            const vars = [null, 'x', 'y'];
            for (let i = 0; i < this.termCount; i++) {
                const v = vars[Math.floor(Math.random() * vars.length)];
                const coef = this.utilGetRandomInt(this.digitCount);
                terms.push({ coef, var: v });
            }
            terms.forEach((t, i) => {
                const termStr = this.utilFormatTerm(t.coef, t.var);
                if (i === 0) display += termStr;
                else display += this.utilFormatOpWithTerm(t.coef, t.var);

                if (t.var === 'x') sums.x += t.coef;
                else if (t.var === 'y') sums.y += t.coef;
                else sums.c += t.coef;
            });
        } else if (type === 1) {
            // a(x + b) + c
            const a = this.utilGetRandomInt(1) || 1, b = this.utilGetRandomInt(1), c = this.utilGetRandomInt(1);
            const varName = Math.random() > 0.5 ? 'x' : 'y';
            display = `${a === 1 ? '' : a === -1 ? '-' : a}(${varName}${this.utilFormatOp(b)}) ${this.utilFormatOp(c)}`;
            sums[varName] += a;
            sums.c += (a * b) + c;
        } else {
            // a(x + b) + c(x + d)
            const a = this.utilGetRandomInt(1) || 1, b = this.utilGetRandomInt(1);
            const c = this.utilGetRandomInt(1) || 1, d = this.utilGetRandomInt(1);
            const varName = Math.random() > 0.5 ? 'x' : 'y';
            display = `${a === 1 ? '' : a === -1 ? '-' : a}(${varName}${this.utilFormatOp(b)}) ${this.utilFormatOpWithCoef(c)}(${varName}${this.utilFormatOp(d)})`;
            sums[varName] += a + c;
            sums.c += (a * b) + (c * d);
        }

        return {
            display,
            answer: sums,
            validate: (input) => {
                const userSums = this.utilParseAlgebra(input);
                return userSums.x === sums.x && userSums.y === sums.y && userSums.c === sums.c;
            }
        };
    }

    utilFormatOpWithTerm(coef, variable) {
        const sign = coef >= 0 ? '+' : '-';
        const term = this.utilFormatTerm(Math.abs(coef), variable);
        return ` ${sign} ${term}`;
    }

    utilFormatOpWithCoef(coef) {
        return coef >= 0 ? `+ ${coef}` : `- ${Math.abs(coef)}`;
    }

    generatorEquation() {
        const type = Math.floor(Math.random() * 3);
        let display = '', x = this.utilGetRandomInt(1);

        if (type === 0) {
            // ax + b = c
            const a = this.utilGetRandomInt(1) || 1, b = this.utilGetRandomInt(1);
            const c = a * x + b;
            display = `${this.utilFormatTerm(a, 'x')}${this.utilFormatOp(b)} = ${c}`;
        } else if (type === 1) {
            // ax + b = cx + d
            let a = this.utilGetRandomInt(1) || 1, c = this.utilGetRandomInt(1) || 1;
            if (a === c) c++; // Ensure a != c to have a unique x
            const b = this.utilGetRandomInt(1);
            const d = (a - c) * x + b;
            display = `${this.utilFormatTerm(a, 'x')}${this.utilFormatOp(b)} = ${this.utilFormatTerm(c, 'x')}${this.utilFormatOp(d)}`;
        } else {
            // a(x + b) = c
            const a = this.utilGetRandomInt(1) || 1, b = this.utilGetRandomInt(1);
            const c = a * (x + b);
            display = `${a === 1 ? '' : a === -1 ? '-' : a}(x ${this.utilFormatOp(b).trim()}) = ${c}`;
        }

        const answer = new Fraction(x, 1);
        return {
            display,
            answer,
            validate: (input) => Fraction.fromString(input).equals(answer)
        };
    }

    // --- Utilities ---
    utilFormatTerm(coef, variable) {
        if (coef === 0) return '';
        if (!variable) return coef.toString();
        if (coef === 1) return variable;
        if (coef === -1) return '-' + variable;
        return coef.toString() + variable;
    }

    utilFormatOp(val) {
        if (val === 0) return '';
        return val > 0 ? ` + ${val}` : ` - ${Math.abs(val)}`;
    }

    utilParseAlgebra(s) {
        const sums = { x: 0, y: 0, c: 0 };
        // Normalize: remove spaces, convert +- to -, -- to +
        const norm = s.replace(/\s/g, '').replace(/\+?-\+?/g, '-').replace(/--/g, '+');
        // Regex to find terms: optional sign, then (digits+variable OR digits OR variable)
        const matches = norm.matchAll(/[+-]?(\d*[xy]|\d+)/g);

        for (const [part] of matches) {
            let coefStr = '', variable = null;
            if (part.includes('x')) { variable = 'x'; coefStr = part.replace('x', ''); }
            else if (part.includes('y')) { variable = 'y'; coefStr = part.replace('y', ''); }
            else coefStr = part;

            // Handle singleton signs or empty strings for components
            if (coefStr === '' || coefStr === '+') coefStr = '1';
            else if (coefStr === '-') coefStr = '-1';

            const coef = parseInt(coefStr);
            if (!isNaN(coef)) {
                if (variable === 'x') sums.x += coef;
                else if (variable === 'y') sums.y += coef;
                else sums.c += coef;
            }
        }
        return sums;
    }

    utilEvaluateArithmetic(terms, ops) {
        let newTerms = [terms[0]], newOps = [];
        for (let i = 0; i < ops.length; i++) {
            const op = ops[i], nextTerm = terms[i + 1];
            if (op === '*' || op === '/') {
                const prevTerm = newTerms.pop();
                newTerms.push(op === '*' ? prevTerm.mul(nextTerm) : prevTerm.div(nextTerm));
            } else {
                newOps.push(op);
                newTerms.push(nextTerm);
            }
        }
        let result = newTerms[0];
        for (let i = 0; i < newOps.length; i++) {
            result = newOps[i] === '+' ? result.add(newTerms[i + 1]) : result.sub(newTerms[i + 1]);
        }
        return result;
    }

    utilGetRandomFraction(mode) {
        if (mode === 'integer') return new Fraction(this.utilGetRandomInt(this.digitCount), 1);
        if (mode === 'decimal') return new Fraction(this.utilGetRandomInt(this.digitCount), 10);
        return new Fraction(this.utilGetRandomInt(1), Math.abs(this.utilGetRandomInt(1)) || 1);
    }

    utilGetRandomInt(digits) {
        const min = Math.pow(10, digits - 1), max = Math.pow(10, digits) - 1;
        let n = Math.floor(Math.random() * (max - min + 1)) + min;
        return Math.random() > 0.5 ? -n : n;
    }

    showFeedback(text, cls) {
        this.feedbackEl.textContent = text;
        this.feedbackEl.className = `feedback ${cls}`;
        setTimeout(() => { if (this.feedbackEl.textContent === text) this.feedbackEl.textContent = ''; }, 800);
    }

    endGame() {
        this.gameActive = false;
        clearInterval(this.timerInterval);
        this.finalTimeEl.textContent = this.formatTime(this.elapsedTime);
        this.showScreen('result');
    }
}
window.addEventListener('load', () => new MathGame());
