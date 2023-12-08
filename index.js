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
let scaling = false;
async function scaleUp() {
    if (scaling) return;
    scaling = true;
    const from = scale;
    const to = scale / 2;
    for (let i = 0; i < 1; i += 0.01) {
        const ease = easeInOut(i);
        scale = to * ease + from * (1 - ease);
        await sleep(0.01);
        if (!scaling) return;
    }
    scaling = false;
}
const anims = new Set();
async function animBall(ball) {
    thisAnim = ball.id;
    if (anims.has(thisAnim)) return;
    anims.add(thisAnim);
    ball.alive = NaN;
    const from = scale;
    const to = scale / 2;
    const fromPos = ball.vel;
    let speed = 0.5 / scale;
    for (let i = 0; i < 1; i += 0.01) {
        const toPos = Vector.fromPolar(
            speed,
            mouse.pos.dirWith(ball.pos)
        );
        const ease = easeInOut(i);
        ball.vel = Vector.merge(fromPos, toPos, ease);
        if (ball.dead) return;
        await sleep(0.01);
    }
    while (mouse.pos.getDisSquared(ball.pos) > mouse.r * mouse.r * 2 - speed * speed) {
        ball.vel = Vector.fromPolar(
            speed,
            mouse.pos.dirWith(ball.pos)
        );
        speed += 0.01 / scale;
        if (ball.dead) return;
        await sleep(0.01);
    }
    anims.delete(thisAnim);
    mouse.r += 1;
    ball.dead = true;
    score += ball.r;
    updateScore();
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
    static merge(from, to, factor) {
        return new Vector(
            to.x * factor + from.x * (1 - factor),
            to.y * factor + from.y * (1 - factor),
        );
    }
    clone() {
        return new Vector(
            this.x,
            this.y
        );
    }
    set(other) {
        this.x = other.x;
        this.y = other.y;
    }
    goMid(other) {
        this.x += other.x;
        this.y += other.y;
        this.x /= 2;
        this.y /= 2;
    }
    iaddmul(other, mul) {
        this.x += other.x * mul;
        this.y += other.y * mul;
    }
    add(other) {
        return new Vector(
            this.x + other.x,
            this.y + other.y,
        );
    }
    addmul(other, mul) {
        return new Vector(
            this.x + other.x * mul,
            this.y + other.y * mul,
        );
    }
    dirWith(other) {
        return -Math.atan2(
            this.y - other.y,
            this.x - other.x
        ) + Math.PI / 2;
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

let gID = 0;
class Ball {
    constructor(pos, vel, r, color) {
        this.id = gID;
        gID += 1;
        this.pos = pos;
        this.vel = vel;
        this.r = r;
        this.color = color;
        this.alive = 0;
        this.dead = false;
        this.trail = [
            pos,
            pos.clone(),
            pos.clone(),
            pos.clone(),
            pos.clone(),
            pos.clone(),
            pos.clone(),
            pos.clone(),
            pos.clone(),
        ];
    }
    static create() {
        const pos = Vector.fromPolar(boundingRadius / scale * 1.5, Math.random() * 2 * Math.PI);
        const size = Math.round(Math.random() ** 4 * (mouse.r + 50)) / Math.sqrt(scale) + 1;
        return new Ball(
            pos,
            Vector.fromPolar(((1 / size) + Math.random() * 0.1) / (scale ** 2), -pos.dirWith(
                Vector.fromPolar(Math.random() * boundingRadius / scale, Math.random() * 2 * Math.PI),
            )),
            size,
            `hsl(${Math.round(Math.random() * 360)}deg ${Math.round(Math.random() * 50) + 50}% ${Math.round(Math.random() * 50) + 50}%)`
        );
    }
    update(dx) {
        if (this.pos.getDisSquared(this.trail[1]) > this.vel.getMag() ** 2 + this.r ** 2) {
            for (let i = this.trail.length - 1; i > 0; --i) {
                this.trail[i].set(this.trail[i - 1]);
            }
        }
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
mouse.lastUpdate = performance.now();

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
    balls.sort((a, b) => { return b.r - a.r; });
    for (const ball of balls) {
        ball.update(timeDelta);
        if (anims.has(ball.id)) continue;
        if (ball.isColliding(mouse)) {
            if (mouse.r >= ball.r) {
                animBall(ball);
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
    
    // Render Trails
    function renderTrail(ball) {
        let r = ball.r;
        let path = []
        let pathLoopAround = [];
        for (let i = 0; i < ball.trail.length; ++i) {
            const part = ball.trail[i];
            let dir;
            if (i == 0) {
                dir = ball.trail[1].dirWith(part) + Math.PI / 2;
            } else {
                const prevpart = ball.trail[i - 1];
                dir = part.dirWith(prevpart) + Math.PI / 2;
            }
            path.push(part.add(
                Vector.fromPolar(
                    r,
                    dir
                ),
            ))
            pathLoopAround.push(part.add(
                Vector.fromPolar(
                    r,
                    dir + Math.PI
                ),
            ))
            r -= ball.r / ball.trail.length;
        }
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y)
        for (let i = 1; i < path.length; ++i) {
            ctx.lineTo(path[i].x, path[i].y)
        }
        for (let i = pathLoopAround.length -1; i >= 0; --i) {
            ctx.lineTo(pathLoopAround[i].x, pathLoopAround[i].y)
        }
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = ball.color;
        ctx.fill();
    }
    for (const ball of balls) {
        renderTrail(ball);
    }

    // Render Balls
    ctx.globalAlpha = 1;
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

    // Mouse
    if (mouse.lastUpdate > 10) {
        mouse.lastUpdate = 0;
        for (let i = mouse.trail.length - 1; i > 0; --i) {
            mouse.trail[i].set(mouse.trail[i - 1]);
        }
    } else {
        mouse.lastUpdate += timeDelta;
    }
    renderTrail(mouse);
    ctx.globalAlpha = 1;
    ctx.fillStyle = mouse.color;
    ctx.beginPath();
    ctx.arc(
        mouse.pos.x, mouse.pos.y,
        mouse.r,
        0, 2 * Math.PI
    );
    ctx.fill();

    window.requestAnimationFrame(frame);
}

let xOld = 0.5, yOld = 0.5;
function die() {
    if (scaling) return;
    e_score.textContent = "0";
    alert("die");
    reset();
}
function reset() {
    mouse.r = 5;
    balls.forEach(ball => {
        ball.dead = true;
        ball.alive = 0;
    })
    balls = [];
    score = 0;
    updateScore();
    mouse.pos.x = 0;
    mouse.pos.y = 0;
    scale = 1;
    scaling = false;
    xOld = 0.5;
    yOld = 0.5;
    timeOld = performance.now();
}
reset();

window.addEventListener("pointermove", event => {
    const boundu = 0.95;
    const boundl = 0.05;
    const factor = 0.7;
    let x = event.clientX / can.width;
    let y = event.clientY / can.height;
    if (x > boundu) {
        x = boundu + (x - boundu) * factor;
    } else if (x < boundl) {
        x = boundl - (boundl - x) * factor;
    }
    if (y > boundu) {
        y = boundu + (y - boundu) * factor;
    } else if (y < boundl) {
        y = boundl - (boundl - y) * factor;
    }
    x += xOld;
    y += yOld;
    x /= 2;
    y /= 2;
    xOld = x;
    yOld = y;
    mouse.pos.x = (x * can.width - can.width / 2) / scale;
    mouse.pos.y = (y * can.height - can.height / 2) / scale;
});
window.addEventListener("onkeydown", event => {
    if (event.key === "N") {
        for (const ball of balls) {
            animBall(ball);
        }
    }
});
let hue = localStorage["ballz.hue"];
if (hue !== undefined) {
    hue = parseInt(hue);
    if (hue === NaN) {
        hue = 0;
    } else {
        mouse.color = `hsl(${hue}deg 50% 50%)`;
    }
}

window.addEventListener("wheel", event => {
    if (hue === undefined) hue = 0;
    hue += 5;
    hue %= 360;
    mouse.color = `hsl(${hue}deg 50% 50%)`;
    localStorage["ballz.hue"] = hue;
}, { passive: true });

window.requestAnimationFrame(frame);