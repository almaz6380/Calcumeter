/*
 * Calcumeter – Rechenkern
 *
 * Sicherer Ausdrucks-Parser (kein eval) mit Operator-Rangfolge,
 * impliziter Multiplikation, Funktionen, Konstanten und Grad/Bogenmaß.
 * Läuft im Browser (window.Calc) und in Node (module.exports).
 */
(function (global, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else global.Calc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class CalcError extends Error {
    constructor(message) {
      super(message);
      this.name = 'CalcError';
    }
  }

  const DEG = Math.PI / 180;
  const MATH_ERROR = 'Mathefehler';
  const SYNTAX_ERROR = 'Syntaxfehler';

  // Winzige Rundungsreste (z. B. sin(π) = 1.2e-16) auf 0 setzen.
  const snap = (x) => (Math.abs(x) < 1e-15 ? 0 : x);

  function check(x) {
    if (typeof x !== 'number' || Number.isNaN(x)) throw new CalcError(MATH_ERROR);
    if (!Number.isFinite(x)) throw new CalcError('Überlauf');
    return x;
  }

  function requireInt(x, nonNegative) {
    if (!Number.isInteger(x) || (nonNegative && x < 0)) throw new CalcError(MATH_ERROR);
    return x;
  }

  // ---------- Trigonometrie ----------

  function sinDeg(x) {
    const r = x % 360;
    if (r % 180 === 0) return 0;
    if (r === 90 || r === -270) return 1;
    if (r === -90 || r === 270) return -1;
    return Math.sin(r * DEG);
  }

  function cosDeg(x) {
    const r = x % 360;
    if ((r - 90) % 180 === 0) return 0;
    if (r === 0) return 1;
    if (r === 180 || r === -180) return -1;
    return Math.cos(r * DEG);
  }

  function tanDeg(x) {
    const r = x % 180;
    if (r === 0) return 0;
    if (r === 90 || r === -90) throw new CalcError(MATH_ERROR);
    return Math.tan(r * DEG);
  }

  function tanRad(x) {
    if (Math.abs(Math.cos(x)) < 1e-15) throw new CalcError(MATH_ERROR);
    return snap(Math.tan(x));
  }

  const fromRad = (x, ctx) => (ctx.angle === 'deg' ? x / DEG : x);

  // ---------- Spezielle Funktionen ----------

  const LANCZOS = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];

  function gamma(z) {
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
    z -= 1;
    let x = LANCZOS[0];
    for (let i = 1; i < LANCZOS.length; i++) x += LANCZOS[i] / (z + i);
    const t = z + 7.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  }

  function factorial(n) {
    if (Number.isInteger(n)) {
      if (n < 0) throw new CalcError(MATH_ERROR);
      if (n > 170) throw new CalcError('Überlauf');
      let r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return r;
    }
    return gamma(n + 1);
  }

  function nPr(n, r) {
    requireInt(n, true);
    requireInt(r, true);
    if (r > n) throw new CalcError(MATH_ERROR);
    let res = 1;
    for (let i = 0; i < r; i++) res *= n - i;
    return res;
  }

  function nCr(n, r) {
    requireInt(n, true);
    requireInt(r, true);
    if (r > n) throw new CalcError(MATH_ERROR);
    r = Math.min(r, n - r);
    let res = 1;
    for (let i = 1; i <= r; i++) res = (res * (n - r + i)) / i;
    return Math.round(res);
  }

  function gcd(a, b) {
    a = Math.abs(requireInt(a));
    b = Math.abs(requireInt(b));
    while (b) [a, b] = [b, a % b];
    return a;
  }

  function lcm(a, b) {
    if (a === 0 || b === 0) return 0;
    return Math.abs(a * b) / gcd(a, b);
  }

  function nthRoot(x, n) {
    if (n === 0) throw new CalcError(MATH_ERROR);
    if (x < 0) {
      if (Number.isInteger(n) && Math.abs(n) % 2 === 1) return -Math.pow(-x, 1 / n);
      throw new CalcError(MATH_ERROR);
    }
    return Math.pow(x, 1 / n);
  }

  function log(x, base) {
    if (x <= 0) throw new CalcError(MATH_ERROR);
    if (base === undefined) return Math.log10(x);
    if (base <= 0 || base === 1) throw new CalcError(MATH_ERROR);
    return Math.log(x) / Math.log(base);
  }

  function positive(fn) {
    return (x) => {
      if (x <= 0) throw new CalcError(MATH_ERROR);
      return fn(x);
    };
  }

  // name -> [minArgs, maxArgs, (args, ctx) => number]
  const FUNCTIONS = {
    sin: [1, 1, ([x], c) => (c.angle === 'deg' ? sinDeg(x) : snap(Math.sin(x)))],
    cos: [1, 1, ([x], c) => (c.angle === 'deg' ? cosDeg(x) : snap(Math.cos(x)))],
    tan: [1, 1, ([x], c) => (c.angle === 'deg' ? tanDeg(x) : tanRad(x))],
    asin: [1, 1, ([x], c) => fromRad(Math.asin(x), c)],
    acos: [1, 1, ([x], c) => fromRad(Math.acos(x), c)],
    atan: [1, 1, ([x], c) => fromRad(Math.atan(x), c)],
    sinh: [1, 1, ([x]) => Math.sinh(x)],
    cosh: [1, 1, ([x]) => Math.cosh(x)],
    tanh: [1, 1, ([x]) => Math.tanh(x)],
    asinh: [1, 1, ([x]) => Math.asinh(x)],
    acosh: [1, 1, ([x]) => Math.acosh(x)],
    atanh: [1, 1, ([x]) => Math.atanh(x)],
    sqrt: [1, 1, ([x]) => Math.sqrt(x)],
    cbrt: [1, 1, ([x]) => Math.cbrt(x)],
    root: [2, 2, ([x, n]) => nthRoot(x, n)],
    ln: [1, 1, ([x]) => positive(Math.log)(x)],
    log: [1, 2, ([x, b]) => log(x, b)],
    log2: [1, 1, ([x]) => positive(Math.log2)(x)],
    log10: [1, 1, ([x]) => log(x)],
    exp: [1, 1, ([x]) => Math.exp(x)],
    abs: [1, 1, ([x]) => Math.abs(x)],
    floor: [1, 1, ([x]) => Math.floor(x)],
    ceil: [1, 1, ([x]) => Math.ceil(x)],
    round: [1, 2, ([x, d = 0]) => {
      requireInt(d);
      const f = Math.pow(10, d);
      return Math.round(x * f) / f;
    }],
    sign: [1, 1, ([x]) => Math.sign(x)],
    fact: [1, 1, ([x]) => factorial(x)],
    gamma: [1, 1, ([x]) => gamma(x)],
    ncr: [2, 2, ([n, r]) => nCr(n, r)],
    npr: [2, 2, ([n, r]) => nPr(n, r)],
    gcd: [2, 2, ([a, b]) => gcd(a, b)],
    lcm: [2, 2, ([a, b]) => lcm(requireInt(a), requireInt(b))],
    min: [1, Infinity, (args) => Math.min(...args)],
    max: [1, Infinity, (args) => Math.max(...args)],
    rand: [0, 0, () => Math.random()],
  };

  const CONSTANTS = {
    pi: () => Math.PI,
    e: () => Math.E,
    phi: () => (1 + Math.sqrt(5)) / 2,
    tau: () => 2 * Math.PI,
    ans: (ctx) => ctx.ans || 0,
  };

  // Binäre Operatoren, die als Wort geschrieben werden.
  const WORD_OPERATORS = ['mod', 'ncr', 'npr'];

  // Längste Namen zuerst, damit z. B. "asinh" vor "asin" und "exp" vor "e" greift.
  // Variablen gibt es nur in kompilierten Ausdrücken (Funktionsplotter).
  const VARIABLES = ['x'];

  const NAMES = [...Object.keys(FUNCTIONS), ...Object.keys(CONSTANTS), ...VARIABLES, 'mod']
    .filter((n, i, a) => a.indexOf(n) === i)
    .sort((a, b) => b.length - a.length);

  const SYMBOLS = {
    '+': ['op', '+'], '-': ['op', '-'], '−': ['op', '-'],
    '*': ['op', '*'], '×': ['op', '*'], '·': ['op', '*'],
    '/': ['op', '/'], '÷': ['op', '/'], ':': ['op', '/'],
    '^': ['op', '^'], '!': ['op', '!'], '%': ['op', '%'],
    '²': ['op', '²'], '³': ['op', '³'],
    '(': ['('], ')': [')'], ',': [','], ';': [','],
    'π': ['id', 'pi'], 'φ': ['id', 'phi'], 'τ': ['id', 'tau'],
    '√': ['id', 'sqrt'], '∛': ['id', 'cbrt'],
  };

  const NUMBER_RE = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+\-−]?\d+)?/;

  // ---------- Tokenizer ----------

  function tokenize(src) {
    const tokens = [];
    let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) {
        i++;
        continue;
      }
      if (src.startsWith('⁻¹', i)) {
        tokens.push({ type: 'op', value: '⁻¹' });
        i += 2;
        continue;
      }
      if (/[0-9.]/.test(c)) {
        const m = NUMBER_RE.exec(src.slice(i));
        if (!m) throw new CalcError(SYNTAX_ERROR);
        i += m[0].length;
        if (src[i] === '.') throw new CalcError(SYNTAX_ERROR);
        tokens.push({ type: 'num', value: parseFloat(m[0].replace('−', '-')) });
        continue;
      }
      if (/[a-z]/i.test(c)) {
        const rest = src.slice(i).toLowerCase();
        const name = NAMES.find((n) => rest.startsWith(n));
        if (!name) {
          const word = /^[a-z]+/i.exec(src.slice(i))[0];
          throw new CalcError(`Unbekannt: ${word}`);
        }
        tokens.push(name === 'mod' ? { type: 'op', value: 'mod' } : { type: 'id', name });
        i += name.length;
        continue;
      }
      const sym = SYMBOLS[c];
      if (!sym) throw new CalcError(`Ungültiges Zeichen: ${c}`);
      tokens.push(sym[0] === 'op' || sym[0] === 'id'
        ? { type: sym[0], [sym[0] === 'op' ? 'value' : 'name']: sym[1] }
        : { type: sym[0] });
      i++;
    }
    return tokens;
  }

  // ---------- Parser (rekursiver Abstieg) ----------
  //
  //   expr    := term (('+' | '-') term)*
  //   term    := unary (('*' | '/' | 'mod' | 'nCr' | 'nPr') unary | implizit power)*
  //   unary   := ('-' | '+') unary | power
  //   power   := postfix ('^' unary)?            (rechtsassoziativ)
  //   postfix := primary ('!' | '%' | '²' | '³' | '⁻¹')*
  //   primary := Zahl | Konstante | Funktion | '(' expr ')'

  function parse(tokens) {
    let pos = 0;
    const peek = () => tokens[pos];
    const isOp = (t, ...values) => t && t.type === 'op' && values.includes(t.value);
    const atEnd = () => pos >= tokens.length;

    function closeParen() {
      // Fehlende schließende Klammern am Ende werden automatisch ergänzt.
      if (atEnd()) return;
      if (peek().type !== ')') throw new CalcError(SYNTAX_ERROR);
      pos++;
    }

    function startsOperand(t) {
      if (!t) return false;
      if (t.type === 'num') {
        const prev = tokens[pos - 1];
        return !(prev && prev.type === 'num');
      }
      return t.type === '(' || (t.type === 'id' && !WORD_OPERATORS.includes(t.name));
    }

    function expr() {
      let node = term();
      while (isOp(peek(), '+', '-')) {
        const op = tokens[pos++].value;
        node = { type: 'bin', op, left: node, right: term() };
      }
      return node;
    }

    function term() {
      let node = unary();
      for (;;) {
        const t = peek();
        if (isOp(t, '*', '/', 'mod')) {
          pos++;
          node = { type: 'bin', op: t.value, left: node, right: unary() };
        } else if (t && t.type === 'id' && (t.name === 'ncr' || t.name === 'npr')) {
          pos++;
          node = { type: 'call', name: t.name, args: [node, unary()] };
        } else if (startsOperand(t)) {
          node = { type: 'bin', op: '*', left: node, right: power() };
        } else {
          return node;
        }
      }
    }

    function unary() {
      const t = peek();
      if (isOp(t, '-')) {
        pos++;
        return { type: 'neg', arg: unary() };
      }
      if (isOp(t, '+')) {
        pos++;
        return unary();
      }
      return power();
    }

    function power() {
      const base = postfix();
      if (isOp(peek(), '^')) {
        pos++;
        return { type: 'bin', op: '^', left: base, right: unary() };
      }
      return base;
    }

    function postfix() {
      let node = primary();
      while (isOp(peek(), '!', '%', '²', '³', '⁻¹')) {
        node = { type: 'post', op: tokens[pos++].value, arg: node };
      }
      return node;
    }

    function primary() {
      const t = tokens[pos++];
      if (!t) throw new CalcError(SYNTAX_ERROR);
      if (t.type === 'num') return { type: 'num', value: t.value };
      if (t.type === '(') {
        const node = expr();
        closeParen();
        return node;
      }
      if (t.type === 'id') {
        if (CONSTANTS[t.name]) return { type: 'const', name: t.name };
        if (VARIABLES.includes(t.name)) return { type: 'var', name: t.name };
        const [min, max] = FUNCTIONS[t.name];
        const args = [];
        if (peek() && peek().type === '(') {
          pos++;
          if (peek() && peek().type !== ')') {
            args.push(expr());
            while (peek() && peek().type === ',') {
              pos++;
              args.push(expr());
            }
          }
          closeParen();
        } else if (max > 0) {
          // Funktion ohne Klammern, z. B. "sin30" oder "√9"
          args.push(power());
        }
        if (args.length < min || args.length > max) throw new CalcError(SYNTAX_ERROR);
        return { type: 'call', name: t.name, args };
      }
      throw new CalcError(SYNTAX_ERROR);
    }

    if (tokens.length === 0) throw new CalcError('Keine Eingabe');
    const tree = expr();
    if (!atEnd()) throw new CalcError(SYNTAX_ERROR);
    return tree;
  }

  // ---------- Auswertung ----------

  function evalNode(node, ctx) {
    switch (node.type) {
      case 'num':
        return node.value;
      case 'var':
        if (!ctx.vars || !(node.name in ctx.vars)) throw new CalcError(`Unbekannt: ${node.name}`);
        return ctx.vars[node.name];
      case 'const':
        return CONSTANTS[node.name](ctx);
      case 'neg':
        return -evalNode(node.arg, ctx);
      case 'call': {
        const args = node.args.map((a) => evalNode(a, ctx));
        return check(FUNCTIONS[node.name][2](args, ctx));
      }
      case 'post': {
        const x = evalNode(node.arg, ctx);
        switch (node.op) {
          case '!': return check(factorial(x));
          case '%': return x / 100;
          case '²': return x * x;
          case '³': return x * x * x;
          case '⁻¹':
            if (x === 0) throw new CalcError('Division durch 0');
            return 1 / x;
        }
        break;
      }
      case 'bin': {
        const a = evalNode(node.left, ctx);
        // "200 + 10%" = 220, "200 − 10%" = 180 (wie bei Taschenrechnern üblich)
        if ((node.op === '+' || node.op === '-') && node.right.type === 'post' && node.right.op === '%') {
          const p = evalNode(node.right.arg, ctx) / 100;
          return node.op === '+' ? a + a * p : a - a * p;
        }
        const b = evalNode(node.right, ctx);
        switch (node.op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/':
            if (b === 0) throw new CalcError('Division durch 0');
            return a / b;
          case 'mod':
            if (b === 0) throw new CalcError('Division durch 0');
            return ((a % b) + b) % b;
          case '^':
            if (a === 0 && b < 0) throw new CalcError('Division durch 0');
            return check(Math.pow(a, b));
        }
      }
    }
    throw new CalcError(SYNTAX_ERROR);
  }

  function evaluate(expression, ctx = {}) {
    const context = { angle: ctx.angle === 'rad' ? 'rad' : 'deg', ans: ctx.ans || 0 };
    const result = check(evalNode(parse(tokenize(String(expression))), context));
    return Object.is(result, -0) ? 0 : result;
  }

  // ---------- Formatierung ----------

  function format(x) {
    if (!Number.isFinite(x)) return MATH_ERROR;
    if (x === 0) return '0';
    const abs = Math.abs(x);
    if (abs >= 1e15 || abs < 1e-9) {
      const [mantissa, exponent] = x.toExponential(11).split('e');
      const m = mantissa.replace(/\.?0+$/, '');
      return `${m}E${parseInt(exponent, 10)}`;
    }
    return String(parseFloat(x.toPrecision(12)));
  }

  // Ausdruck mit Variable x einmal übersetzen und dann schnell für viele x auswerten.
  // Liefert NaN, wo der Ausdruck nicht definiert ist (z. B. ln(x) für x ≤ 0).
  function compile(expression, ctx = {}) {
    const tree = parse(tokenize(String(expression)));
    const context = { angle: ctx.angle === 'deg' ? 'deg' : 'rad', ans: ctx.ans || 0, vars: { x: 0 } };
    return (x) => {
      context.vars.x = x;
      try {
        return evalNode(tree, context);
      } catch (e) {
        if (e instanceof CalcError && e.message.startsWith('Unbekannt')) throw e;
        return NaN;
      }
    };
  }

  return { evaluate, compile, format, tokenize, parse, CalcError, FUNCTIONS: Object.keys(FUNCTIONS) };
});
