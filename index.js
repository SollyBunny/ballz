const can = document.getElementById("can");
const ctx = can.getContext("2d");

const e_score = document.getElementById("score");

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
        const pos = Vector.fromPolar(boundingRadius * 1.5, Math.random() * 2 * Math.PI);
        const size = Math.round(Math.random() ** 4 * 100) + 2;
        return new Ball(
            pos,
            Vector.fromPolar((1 / size) + Math.random() * 0.1, pos.dirWith(
                Vector.fromPolar(Math.random() * boundingRadius, Math.random() * 2 * Math.PI),
            )),
            size,
            `hsl(${Math.round(Math.random() * 360)}deg ${Math.round(Math.random() * 50) + 50}% ${Math.round(Math.random() * 50) + 50}%)`
        );
    }
    update(dx) {
        this.pos.iaddmul(this.vel, dx);
        this.alive += dx;
        if (this.alive * this.vel.getMag() > boundingRadius * 3) {
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

    // Render
    ctx.clearRect(0, 0, can.width, can.height);
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
    alert("die");
    mouse.r = 5;
    balls = [];
    score = 0;
    updateScore();
}
die();

window.onpointermove = event => {
    mouse.pos.x = event.clientX;
    mouse.pos.y = event.clientY;
};

window.requestAnimationFrame(frame);