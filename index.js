const can = document.getElementById("can");
const ctx = can.getContext("2d");

let boundingRadius;

window.onresize = () => {
    can.width = window.innerWidth;
    can.height = window.innerHeight;
    boundingRadius = Math.max(can.width, can.height);
}
window.onresize();

const ballDensity = 1000;

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
}

class Ball {
    constructor(pos, vel, r, color) {
        this.pos = pos;
        this.vel = vel;
        this.r = r;
        this.color = color;
        this.grace = 500;
    }
    static create() {
        const pos = Vector.fromPolar(boundingRadius * 1.5, Math.random() * 2 * Math.PI);
        return new Ball(
            pos,
            Vector.fromPolar(Math.random() * 1 + 0.5, pos.dirWith(
                Vector.fromPolar(Math.random() * boundingRadius * 0.1, Math.random() * 2 * Math.PI),
            )),
            Math.round(Math.random() * 10) + 5,
            `hsl(${Math.round(Math.random() * 360)}deg ${Math.round(Math.random() * 50) + 50}% ${Math.round(Math.random() * 50) + 50}%)`
        );
    }
    update(dx) {
        this.pos.iaddmul(this.vel, dx);
    }

}
let balls = new Set();

let timeOld, timeDelta;
function frame() {
    const timeNow = performance.now();
    timeDelta = timeNow - timeOld;
    timeOld = timeNow;

    // New Ball
    if (balls.size < can.width * can.height / ballDensity) {
        const ball = Ball.create();
        balls.add(ball);
    }

    // Update
    for (const ball of balls) {
        ball.update(timeDelta);
    }

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

    window.requestAnimationFrame(frame);
}

window.requestAnimationFrame(frame);