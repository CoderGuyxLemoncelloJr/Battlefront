module.exports = function() {
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(
    require("node:path").join(__dirname, "..", "battlefront.js"),
    "utf8"
);
let seed = 12;
let now = 0;
let matrixDepth = 0;
let maxMatrixDepth = 0;
let recordedText = [];
function PVector(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
}
PVector.prototype.mult = function (n) {
    this.x *= n;
    this.y *= n;
    this.z *= n;
    return this;
};
PVector.prototype.add = function (v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z || 0;
    return this;
};
PVector.prototype.get = function () {
    return new PVector(this.x, this.y, this.z);
};
PVector.prototype.set = function (x, y, z) {
    if (typeof x === "object") {
        Object.assign(this, x);
    } else {
        this.x = x;
        this.y = y;
        this.z = z || 0;
    }
    return this;
};
PVector.prototype.mag = function () {
    return Math.hypot(this.x, this.y, this.z);
};
PVector.prototype.normalize = function () {
    const m = this.mag();
    return m ? this.mult(1 / m) : this;
};
PVector.sub = (a, b) => new PVector(a.x - b.x, a.y - b.y, a.z - b.z);
PVector.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const noop = () => {};
const bitmap = () => ({ mask: noop, get: bitmap, width: 600, height: 600 });
const sandbox = {
    PVector,
    console,
    Math,
    ArrayBuffer,
    Uint8Array,
    width: 600,
    height: 600,
    frameCount: 1,
    mouseX: 300,
    mouseY: 300,
    pmouseX: 300,
    pmouseY: 300,
    mouseIsPressed: false,
    keyCode: 0,
    key: "",
    UP: 38,
    DOWN: 40,
    LEFT: 37,
    RIGHT: 39,
    CENTER: 3,
    CORNER: 0,
    P2D: 2,
    CLOSE: 2,
    TOP: 101,
    BOTTOM: 102,
    SQUARE: 1,
    ROUND: 2,
    PROJECT: 3,
    BASELINE: 0,
    RGB: 1,
    HSB: 2,
    PI: Math.PI,
    TWO_PI: Math.PI * 2,
    millis: () => now,
    createFont: (name) => name,
    color: (...args) => {
        if (args.length === 1) return args[0];
        return { r: args[0], g: args[1], b: args[2], a: args[3] === undefined ? 255 : args[3] };
    },
    red: (c) => c.r || 0,
    green: (c) => c.g || 0,
    blue: (c) => c.b || 0,
    alpha: (c) => (c.a === undefined ? 255 : c.a),
    random: (a, b) => {
        seed = (seed * 16807) % 2147483647;
        const r = seed / 2147483647;
        return a === undefined ? r : b === undefined ? r * a : a + (b - a) * r;
    },
    noise: () => 0.5,
    lerpColor: (a, b, t) => a,
    sin: (v) => Math.sin((v * Math.PI) / 180),
    cos: (v) => Math.cos((v * Math.PI) / 180),
    tan: (v) => Math.tan((v * Math.PI) / 180),
    atan2: (a, b) => (Math.atan2(a, b) * 180) / Math.PI,
    atan: (a) => (Math.atan(a) * 180) / Math.PI,
    acos: (a) => (Math.acos(a) * 180) / Math.PI,
    asin: (a) => (Math.asin(a) * 180) / Math.PI,
    radians: (v) => (v * Math.PI) / 180,
    degrees: (v) => (v * 180) / Math.PI,
    abs: Math.abs,
    sqrt: Math.sqrt,
    pow: Math.pow,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    min: Math.min,
    max: Math.max,
    exp: Math.exp,
    log: Math.log,
    constrain: (x, a, b) => Math.max(a, Math.min(b, x)),
    lerp: (a, b, t) => a + (b - a) * t,
    map: (x, a, b, c, d) => c + ((d - c) * (x - a)) / (b - a),
    dist: (x, y, a, b) => Math.hypot(x - a, y - b),
    get: bitmap,
    getImage: bitmap,
    loadImage: bitmap,
    text: (value) => recordedText.push(String(value)),
    textWidth: (text) => String(text).length * 7,
    pushMatrix: () => {
        matrixDepth++;
        maxMatrixDepth = Math.max(maxMatrixDepth, matrixDepth);
    },
    popMatrix: () => {
        assert(matrixDepth > 0, "matrix stack underflow");
        matrixDepth--;
    },
    resetMatrix: () => {
        matrixDepth = 0;
    },
    atob: (text) => Buffer.from(text, "base64").toString("binary")
};
for (const name of [
    "background",
    "fill",
    "stroke",
    "strokeWeight",
    "noStroke",
    "noFill",
    "rect",
    "ellipse",
    "line",
    "point",
    "quad",
    "triangle",
    "arc",
    "bezier",
    "beginShape",
    "endShape",
    "vertex",
    "curveVertex",
    "bezierVertex",
    "translate",
    "rotate",
    "scale",
    "pushStyle",
    "popStyle",
    "rectMode",
    "ellipseMode",
    "imageMode",
    "image",
    "tint",
    "noTint",
    "textAlign",
    "textSize",
    "textFont",
    "textMode",
    "strokeCap",
    "strokeJoin",
    "colorMode",
    "smooth",
    "noSmooth",
    "println",
    "print",
    "frameRate",
    "cursor",
    "noCursor",
    "size",
    "reset",
    "getSound",
    "playSound"
]) {
    sandbox[name] = noop;
}
sandbox.createGraphics = () => {
    const graphics = { ...sandbox, ...bitmap() };
    graphics.get = bitmap;
    return graphics;
};
vm.createContext(sandbox);

return {g: sandbox, setTime: function(value) { now = value; }, depth: function() { return matrixDepth; }};
};
