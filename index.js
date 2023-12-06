const can = document.getElementById("can");
const ctx = can.getContext("2d");

const e_score = document.getElementById("score");

let scale = 1;

let score = 0;
let oldScore = "0";
function updateScore() {
    const newScore = score.toFixed();
    if (newScore === oldScore) return;
    e_score.textContent = newScore;
}

let boundingRadius;

window.onresize = () => {
    can.width = window.innerWidth;
    can.height = window.innerHeight;
    boundingRadius = Math.max(can.width, can.height);
}
window.onresize();

function sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time * 1000))
}
function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
let scaling = true;
async function scaleUp() {
    if (scaling) return;
    scaling = true;
    const from = scale;
    const to = scale / 2;
    for (let i = 0; i < 1; i += 0.01) {
        const ease = easeInOut(i);
        scale = to * ease + from * (1 - ease);
        await sleep(0.01);
    }
    scaling = false;
}

let ballDensity = 100;

class Vector {
    constructor(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }
    static fromPolar(mag, dir) {
        return new Vector(
            Math.sin(dir) * mag,
            Math.cos(dir) * mag
        );
    }
    iaddmul(other, mul) {
        this.x += other.x * mul;
        this.y += other.y * mul;
    }
    dirWith(other) {
        return Math.atan2(
            this.y - other.y,
            this.x - other.x
        );
    }
    getDisSquared(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return (dx * dx) + (dy * dy);
    }
    getMag() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
}

class Ball {
    constructor(pos, vel, r, color) {
        this.pos = pos;
        this.vel = vel;
        this.r = r;
        this.color = color;
        this.alive = 0;
        this.dead = false;
    }
    static create() {
        const pos = Vector.fromPolar(boundingRadius / scale * 1.5, Math.random() * 2 * Math.PI);
        const size = Math.round(Math.random() ** 4 * (mouse.r + 50)) / Math.sqrt(scale) + 1;
        return new Ball(
            pos,
            Vector.fromPolar(((1 / size) + Math.random() * 0.1) / (scale ** 2), pos.dirWith(
                Vector.fromPolar(Math.random() * boundingRadius / scale, Math.random() * 2 * Math.PI),
            )),
            size,
            `hsl(${Math.round(Math.random() * 360)}deg ${Math.round(Math.random() * 50) + 50}% ${Math.round(Math.random() * 50) + 50}%)`
        );
    }
    update(dx) {
        this.pos.iaddmul(this.vel, dx);
        this.alive += dx;
        if (this.alive * this.vel.getMag() > (boundingRadius + this.r) / scale * 3) {
            this.dead = true;
        }
    }
    isColliding(other) {
        const d = this.pos.getDisSquared(other.pos);
        const r = this.r + other.r;
        return r * r > d;
    }

}
let balls = [];
const mouse = new Ball(new Vector(), NaN, 5, "white");

let timeOld = performance.now(), timeDelta = 0;
function frame() {
    const timeNow = performance.now();
    timeDelta = timeNow - timeOld;
    timeOld = timeNow;

    // New Ball
    if (balls.length < can.width * can.height / ballDensity) {
        const ball = Ball.create();
        balls.push(ball);
    }

    // Update
    score += timeDelta / 1000;
    updateScore();
    balls.sort((a, b) => { return a.r - b.r; });
    for (const ball of balls) {
        ball.update(timeDelta);
        if (ball.isColliding(mouse)) {
            if (mouse.r >= ball.r) {
                mouse.r += 1;
                ball.dead = true;
                score += ball.r;
                updateScore();
            } else {
                ball.color = "red";
                die();
            }
        }
    }
    balls = balls.filter(ball => { return !ball.dead; });

    // Scale

    if (mouse.r * scale > 50) {
        scaleUp();
    }

    ctx.resetTransform();
    ctx.clearRect(0, 0, can.width, can.height);
    ctx.translate(can.width / 2, can.height / 2);
    ctx.scale(scale, scale);

    // Render
    for (const ball of balls) {
        ctx.fillStyle = ball.color;
        ctx.beginPath();
        ctx.arc(
            ball.pos.x, ball.pos.y,
            ball.r,
            0, 2 * Math.PI
        );
        ctx.fill();
    }

    // Cursor
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(
        mouse.pos.x, mouse.pos.y,
        mouse.r,
        0, 2 * Math.PI
    );
    ctx.fill();

    window.requestAnimationFrame(frame);
}

function die() {
    if (scaling) return;
    alert("die");
    reset();
}
function reset() {
    mouse.r = 5;
    balls = [];
    score = 0;
    updateScore();
    mouse.pos.x = 0;
    mouse.pos.y = 0;
    scale = 1;
}
reset();

window.onpointermove = event => {
    const boundu = 0.95;
    const boundl = 0.05;
    let x = event.clientX / can.width;
    if (x > boundu) {
        x = boundu + (x - boundu) ** 2;
    } else if (x < boundl) {
        x = boundl - (boundl - x) ** 2;
    }
    let y = event.clientY / can.height;
    if (y > boundu) {
        y = boundu + Math.sqrt(y - boundu);
    } else if (y < boundl) {
        y = boundl - (boundl - y) ** 2;
    }
    console.log(x, y)
    mouse.pos.x = (x * can.width - can.width / 2) / scale;
    mouse.pos.y = (y * can.height - can.height / 2) / scale;
};

window.requestAnimationFrame(frame);