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
        this.canvasEl = document.getElementById('problem-canvas');
        this.inputEl = document.getElementById('answer-input');
        this.inputXEl = document.getElementById('answer-x');
        this.inputYEl = document.getElementById('answer-y');
        this.dualInputContainer = document.getElementById('dual-input-container');
        this.modeLabelEl = document.getElementById('mode-label');
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

        // Add click listeners for dual inputs to enable focus
        this.inputXEl.addEventListener('click', () => this.inputXEl.focus());
        this.inputYEl.addEventListener('click', () => this.inputYEl.focus());

        const keypad = document.getElementById('keypad');
        if (keypad) {
            keypad.addEventListener('click', (e) => {
                const target = e.target.closest('.key');
                if (target) this.handleKeyInput(target);
            });
        }

        // Allowed input characters
        const allowedKeys = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '/', 'x', 'y', '+', '-', 'π', ',', '(', ')', '^']);

        window.addEventListener('keydown', (e) => {
            if (!this.gameActive) return;

            // Get active input element
            const activeInput = this.gameMode === 'systems' ?
                (document.activeElement === this.inputYEl ? this.inputYEl : this.inputXEl) :
                this.inputEl;

            if (allowedKeys.has(e.key)) {
                activeInput.value += e.key;
            } else if (e.key === 'p' || e.key === 'P') {
                activeInput.value += 'π';
            } else if (e.key === 'Backspace') {
                activeInput.value = activeInput.value.slice(0, -1);
            } else if (e.key === 'Enter') {
                this.checkAnswer();
            } else if (e.key === 'Tab' && this.gameMode === 'systems') {
                e.preventDefault();
                // Toggle between x and y inputs
                if (document.activeElement === this.inputXEl) {
                    this.inputYEl.focus();
                } else {
                    this.inputXEl.focus();
                }
            }
        });

        // Service Worker registration with auto-update
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then((registration) => {
                    console.log('[App] Service Worker registered');

                    // Check for updates every 60 seconds
                    setInterval(() => {
                        registration.update();
                    }, 60000);

                    // Listen for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        console.log('[App] New Service Worker installing...');

                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'activated') {
                                console.log('[App] New Service Worker activated - reloading page');
                                // Automatically reload to get the new version
                                window.location.reload();
                            }
                        });
                    });
                })
                .catch((error) => {
                    console.error('[App] Service Worker registration failed:', error);
                });

            // Listen for controller change (when new SW takes over)
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('[App] Controller changed - reloading');
                window.location.reload();
            });
        }
    }

    initSettings() {
        // Toggle chips (operators)
        this.chips.forEach(c => c.addEventListener('click', () => {
            c.classList.toggle('active');
            this.updateSettings();
        }));

        // Single-select chips (mode and count)
        this.setupSingleSelectChips(this.modeChips);
        this.setupSingleSelectChips(this.countChips);
    }

    setupSingleSelectChips(chipList) {
        chipList.forEach(c => c.addEventListener('click', () => {
            chipList.forEach(x => x.classList.remove('active'));
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

        // Get active input
        const activeInput = this.gameMode === 'systems' ?
            (document.activeElement === this.inputYEl ? this.inputYEl : this.inputXEl) :
            this.inputEl;

        if (action === 'enter') this.checkAnswer();
        else if (action === 'clear') {
            if (this.gameMode === 'systems') {
                this.inputXEl.value = '';
                this.inputYEl.value = '';
            } else {
                this.inputEl.value = '';
            }
        }
        else if (action === 'minus' || action === 'plus') { activeInput.value += val; }
        else if (action === 'dot') { if (!activeInput.value.includes('.')) activeInput.value += '.'; }
        else if (action === 'fraction') { if (!activeInput.value.includes('/')) activeInput.value += '/'; }
        else if (action === 'char') {
            const char = target.getAttribute('data-char') || val;
            activeInput.value += char;
        }
        else activeInput.value += val;
    }

    updateKeypad(requiredKeys = []) {
        // requiredKeys: array of keys needed for this problem, e.g., ['x', 'y', 'π']
        const dynamicButtons = document.querySelectorAll('.dynamic-key');

        dynamicButtons.forEach(btn => {
            const char = btn.getAttribute('data-char');
            if (requiredKeys.includes(char)) {
                btn.style.display = '';
            } else {
                btn.style.display = 'none';
            }
        });
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
        // Clear inputs
        this.inputEl.value = '';
        this.inputXEl.value = '';
        this.inputYEl.value = '';

        const generators = {
            'integer': () => this.generatorArithmetic('integer'),
            'decimal': () => this.generatorArithmetic('decimal'),
            'fraction': () => this.generatorArithmetic('fraction'),
            'algebra': () => this.generatorAlgebra(),
            'equation': () => this.generatorEquation(),
            'geometry': () => this.generatorGeometry(),
            'systems': () => this.generatorSystems(),
            'factor': () => this.generatorFactoring(),
            'complete': () => this.generatorCompleteSquare()
        };

        const gen = generators[this.gameMode];
        if (gen) {
            this.currentProblem = gen();

            // Update keypad based on mode
            let requiredKeys = [];
            if (this.gameMode === 'algebra') requiredKeys = ['x', 'y'];
            else if (this.gameMode === 'equation') requiredKeys = ['x'];
            else if (this.gameMode === 'systems') requiredKeys = ['x', 'y', ','];
            else if (this.gameMode === 'factor') requiredKeys = ['x', '(', ')'];
            else if (this.gameMode === 'complete') requiredKeys = ['x', '(', ')', '^'];
            else if (this.gameMode === 'geometry' && this.currentProblem.problemData) {
                // For geometry, add π if it's a circle problem
                if (this.currentProblem.problemData.type.includes('circle')) {
                    requiredKeys = ['π'];
                }
            }
            this.updateKeypad(requiredKeys);

            // Show/hide dual input for systems mode
            if (this.gameMode === 'systems') {
                this.inputEl.parentElement.style.display = 'none';
                this.dualInputContainer.style.display = 'flex';
                setTimeout(() => this.inputXEl.focus(), 10);
            } else {
                this.inputEl.parentElement.style.display = '';
                this.dualInputContainer.style.display = 'none';
            }

            // Set mode label
            const modeLabels = {
                'factor': '因数分解 (Factoring)',
                'complete': '平方完成 (Completing the Square)'
            };
            this.modeLabelEl.textContent = modeLabels[this.gameMode] || '';

            // Geometry mode uses canvas, others use text
            if (this.gameMode === 'geometry') {
                this.problemEl.style.display = 'none';
                this.canvasEl.style.display = 'block';
                this.drawGeometryProblem(this.currentProblem);
            } else {
                this.problemEl.style.display = 'block';
                this.canvasEl.style.display = 'none';

                let displayHtml = this.currentProblem.display;
                if (this.gameMode === 'equation') {
                    displayHtml += '<div style="font-size: 0.6em; margin-top: 0.5rem; opacity: 0.7;"><span class="math-var">x</span> = ?</div>';
                } else {
                    displayHtml += ' = ?';
                }
                this.problemEl.innerHTML = displayHtml;
            }
        }
    }

    // --- Answer Validation Facade ---
    checkAnswer() {
        if (!this.gameActive || !this.currentProblem) return;

        let userInput;
        if (this.gameMode === 'systems') {
            const xVal = this.inputXEl.value.trim();
            const yVal = this.inputYEl.value.trim();
            if (xVal === '' || yVal === '') return;
            userInput = `${xVal},${yVal}`;
        } else {
            userInput = this.inputEl.value.trim().replace(/\s/g, '');
            if (userInput === '') return;
        }

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

    generatorGeometry() {
        const types = ['triangle_pythagorean', 'triangle_area', 'circle_circumference', 'circle_area', 'rectangle'];
        const type = types[Math.floor(Math.random() * types.length)];
        const digits = Math.min(this.digitCount, 2); // Keep geometry simple

        let answer, problemData;

        if (type === 'triangle_pythagorean') {
            // Use Pythagorean triples to ensure valid right triangles
            // Common triples: (3,4,5), (5,12,13), (8,15,17), (7,24,25), (6,8,10)
            const baseTriples = [
                [3, 4, 5],
                [5, 12, 13],
                [6, 8, 10],
                [8, 15, 17],
                [7, 24, 25],
                [9, 12, 15],
                [12, 16, 20]
            ];

            const baseTriple = baseTriples[Math.floor(Math.random() * baseTriples.length)];
            const scale = Math.max(1, Math.min(digits, Math.floor(Math.random() * 2) + 1)); // Scale by 1 or 2

            let a = baseTriple[0] * scale;
            let b = baseTriple[1] * scale;
            let c = baseTriple[2] * scale;

            const unknown = Math.floor(Math.random() * 3); // 0=a, 1=b, 2=c

            if (unknown === 0) answer = new Fraction(a, 1);
            else if (unknown === 1) answer = new Fraction(b, 1);
            else answer = new Fraction(c, 1);

            problemData = { type, a, b, c, unknown };
        } else if (type === 'triangle_area') {
            const base = Math.max(2, Math.abs(this.utilGetRandomInt(digits)) || 2);
            const height = Math.max(2, Math.abs(this.utilGetRandomInt(digits)) || 2);
            answer = new Fraction(Math.round(base * height / 2), 1);
            problemData = { type, base, height };
        } else if (type === 'circle_circumference') {
            const radius = Math.max(2, Math.abs(this.utilGetRandomInt(digits)) || 2);
            const circ = Math.round(2 * Math.PI * radius * 10) / 10;
            answer = Fraction.fromNumber(circ);
            problemData = { type, radius };
        } else if (type === 'circle_area') {
            const radius = Math.max(2, Math.abs(this.utilGetRandomInt(digits)) || 2);
            const area = Math.round(Math.PI * radius * radius * 10) / 10;
            answer = Fraction.fromNumber(area);
            problemData = { type, radius };
        } else { // rectangle
            const width = Math.max(2, Math.abs(this.utilGetRandomInt(digits)) || 2);
            const height = Math.max(2, Math.abs(this.utilGetRandomInt(digits)) || 2);
            const area = width * height;
            answer = new Fraction(area, 1);
            problemData = { type, width, height };
        }

        return {
            display: '', // Not used for geometry
            answer,
            problemData,
            validate: (input) => {
                // Handle π in user input: "9π" should be interpreted as 9 * π
                let normalizedInput = input;
                // Match patterns like "9π" or "π" or "3.5π"
                const piPattern = /(\d+\.?\d*)?π/g;
                normalizedInput = normalizedInput.replace(piPattern, (match, coef) => {
                    const coefficient = coef ? parseFloat(coef) : 1;
                    return (coefficient * Math.PI).toString();
                });

                const userVal = Fraction.fromString(normalizedInput);
                // Allow small tolerance for decimal answers
                return Math.abs(userVal.toNumber() - answer.toNumber()) < 0.5;
            }
        };
    }

    drawGeometryProblem(problem) {
        const canvas = this.canvasEl;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Set textbook style
        ctx.strokeStyle = '#f8fafc';
        ctx.fillStyle = '#f8fafc';
        ctx.lineWidth = 1.5;
        ctx.font = 'italic 18px "EB Garamond"';

        const data = problem.problemData;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        if (data.type === 'triangle_pythagorean') {
            this.drawRightTriangle(ctx, centerX - 80, centerY + 60, data.a * 15, data.b * 15, data.unknown);
        } else if (data.type === 'triangle_area') {
            this.drawTriangleArea(ctx, centerX, centerY + 60, data.base * 20, data.height * 20);
        } else if (data.type.startsWith('circle')) {
            this.drawCircle(ctx, centerX, centerY, data.radius * 15, data.type === 'circle_circumference');
        } else if (data.type === 'rectangle') {
            this.drawRectangle(ctx, centerX - data.width * 10, centerY - data.height * 10, data.width * 20, data.height * 20);
        }
    }

    drawRightTriangle(ctx, x, y, a, b, unknown) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + a, y);
        ctx.lineTo(x + a, y - b);
        ctx.closePath();
        ctx.stroke();

        // Labels
        const labels = [a / 15, b / 15, Math.round(Math.sqrt(a * a + b * b) / 15)];
        ctx.fillText(unknown === 0 ? '?' : labels[0], x + a / 2, y + 20);
        ctx.fillText(unknown === 1 ? '?' : labels[1], x + a + 20, y - b / 2);
        ctx.fillText(unknown === 2 ? '?' : labels[2], x + a / 2 - 30, y - b / 2 - 10);

        // Right angle marker
        ctx.strokeRect(x + a - 10, y - 10, 10, 10);
    }

    drawTriangleArea(ctx, x, y, base, height) {
        ctx.beginPath();
        ctx.moveTo(x - base / 2, y);
        ctx.lineTo(x + base / 2, y);
        ctx.lineTo(x, y - height);
        ctx.closePath();
        ctx.stroke();

        // Height line (dashed)
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Labels
        ctx.fillText(base / 20, x, y + 20);
        ctx.fillText(height / 20, x + 15, y - height / 2);
        ctx.fillText('Area = ?', x - 40, y - height - 20);
    }

    drawCircle(ctx, x, y, radius, isCircumference) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.stroke();

        // Radius line
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + radius, y);
        ctx.stroke();

        // Labels
        ctx.fillText('r = ' + (radius / 15), x + radius / 2 - 10, y - 10);
        ctx.fillText(isCircumference ? 'C = ?' : 'A = ?', x - 20, y + radius + 30);
    }

    drawRectangle(ctx, x, y, width, height) {
        ctx.strokeRect(x, y, width, height);

        // Labels
        ctx.fillText(width / 20, x + width / 2 - 10, y - 10);
        ctx.fillText(height / 20, x - 30, y + height / 2);
        ctx.fillText('A = ?', x + width / 2 - 20, y + height + 30);
    }

    // --- New Advanced Algebra Generators ---
    generatorSystems() {
        // Generate 2x2 linear system: ax + by = c, dx + ey = f
        // Ensure integer solutions for x and y
        const x = this.utilGetRandomInt(1);
        const y = this.utilGetRandomInt(1);

        // Generate first equation coefficients
        const a = this.utilGetRandomInt(1) || 1;
        const b = this.utilGetRandomInt(1) || 1;
        const c = a * x + b * y;

        // Generate second equation coefficients
        const d = this.utilGetRandomInt(1) || 1;
        const e = this.utilGetRandomInt(1) || 1;
        const f = d * x + e * y;

        // Format equations with proper HTML
        const formatEq = (a, b, c) => {
            let eq = this.utilFormatTerm(a, 'x');
            if (b >= 0) eq += ' +';
            eq += ' ' + this.utilFormatTerm(b, 'y') + ' = ' + c;
            return eq;
        };

        const eq1 = formatEq(a, b, c);
        const eq2 = formatEq(d, e, f);

        return {
            display: `${eq1}<br>${eq2}`,
            answer: { x: new Fraction(x, 1), y: new Fraction(y, 1) },
            validate: (input) => {
                // Expected format: "x,y" or "x, y"
                const parts = input.split(',').map(s => s.trim());
                if (parts.length !== 2) return false;
                try {
                    const userX = Fraction.fromString(parts[0]);
                    const userY = Fraction.fromString(parts[1]);
                    return userX.equals(new Fraction(x, 1)) && userY.equals(new Fraction(y, 1));
                } catch {
                    return false;
                }
            }
        };
    }

    generatorFactoring() {
        // Generate factorable quadratic: x² + bx + c = (x + p)(x + q)
        // where p + q = b and p × q = c
        const p = this.utilGetRandomInt(1);
        const q = this.utilGetRandomInt(1);
        const b = p + q;
        const c = p * q;

        // Display as x² + bx + c (handle signs properly)
        let display = '<span class="math-var">x</span>\u00b2';
        if (b !== 0) {
            if (b === 1) display += ' + <span class="math-var">x</span>';
            else if (b === -1) display += ' - <span class="math-var">x</span>';
            else display += (b > 0 ? ' + ' : ' - ') + Math.abs(b) + '<span class="math-var">x</span>';
        }
        if (c !== 0) {
            display += (c > 0 ? ' + ' : ' - ') + Math.abs(c);
        }

        return {
            display,
            answer: { p, q },
            validate: (input) => {
                // Expected formats: (x+p)(x+q) or (x-p)(x-q) etc.
                const normalized = input.replace(/\s/g, '').toLowerCase();

                // Match patterns like (x+2)(x+3) or (x-2)(x+3)
                const pattern = /\(x([+-]\d+)\)\(x([+-]\d+)\)/;
                const match = normalized.match(pattern);

                if (!match) return false;

                const userP = parseInt(match[1]);
                const userQ = parseInt(match[2]);

                // Check both orderings
                return (userP === p && userQ === q) || (userP === q && userQ === p);
            }
        };
    }

    generatorCompleteSquare() {
        // Generate x² + bx + c and convert to (x + h)² + k form
        // where h = b/2 and k = c - h²
        const b = this.utilGetRandomInt(2) * 2; // Even number for easier completion
        const c = this.utilGetRandomInt(2);

        const h = b / 2;
        const k = c - (h * h);

        // Display as x² + bx + c
        let display = '<span class="math-var">x</span>\u00b2';
        if (b !== 0) {
            if (b === 1) display += ' + <span class="math-var">x</span>';
            else if (b === -1) display += ' - <span class="math-var">x</span>';
            else display += (b > 0 ? ' + ' : ' - ') + Math.abs(b) + '<span class="math-var">x</span>';
        }
        if (c !== 0) {
            display += (c > 0 ? ' + ' : ' - ') + Math.abs(c);
        }

        return {
            display,
            answer: { h, k },
            validate: (input) => {
                // Expected format: (x+h)^2+k or (x-h)^2+k
                const normalized = input.replace(/\s/g, '').toLowerCase();

                // Match patterns like (x+2)^2-3 or (x-2)^2+5
                const pattern = /\(x([+-]?\d+(?:\.\d+)?)\)\^2([+-]?\d+(?:\.\d+)?)/;
                const match = normalized.match(pattern);

                if (!match) return false;

                const userH = parseFloat(match[1]);
                const userK = parseFloat(match[2]);

                // Allow small tolerance for decimal values
                return Math.abs(userH - h) < 0.1 && Math.abs(userK - k) < 0.1;
            }
        };
    }

    // --- Utilities ---
    utilFormatTerm(coef, variable) {
        if (coef === 0) return '';
        const varHtml = variable ? `<span class="math-var">${variable}</span>` : '';
        if (!variable) return coef.toString();
        if (coef === 1) return varHtml;
        if (coef === -1) return '-' + varHtml;
        return coef.toString() + varHtml;
    }

    utilFormatOp(val) {
        if (val === 0) return '';
        return val > 0 ? ` + ${val}` : ` - ${Math.abs(val)}`;
    }

    utilParseAlgebra(s) {
        const sums = { x: 0, y: 0, c: 0 };
        // Normalize: remove spaces, handle double negatives
        const norm = s.replace(/\s/g, '').replace(/--/g, '+').replace(/\+-|-\+/g, '-');
        // Regex to find terms: optional sign, then (digits+variable OR digits OR variable)
        const matches = norm.matchAll(/[+-]?(?:\d*[xy]|\d+)/g);

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
