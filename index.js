const can = document.getElementById("can");
const ctx = can.getContext("2d");

const e_score = document.getElementById("score");
const e_pause = document.getElementById("pause");
const e_pausetext = document.getElementById("pausetext");
let paused = false;
let resetwaiting = false;
function pause() {
    if (paused) {
        if (resetwaiting) {
            resetwaiting = false;
            reset();
        }
        e_pause.style.opacity = "0";
        window.setTimeout(() => {
            e_pausetext.textContent = "pause";
            paused = false;
        }, 300);
    } else {
        e_pausetext.textContent = "unpause";
        e_pause.style.opacity = "1";
        paused = true;
    }
}

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
        while (paused) await sleep(0.1);
    }
    while (mouse.pos.getDisSquared(ball.pos) > (mouse.r + ball.r - speed) ** 2) {
        ball.vel = Vector.fromPolar(
            speed,
            mouse.pos.dirWith(ball.pos)
        );
        speed += 0.01 / scale;
        if (ball.dead) return;
        await sleep(0.01);
        while (paused) await sleep(0.1);
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
    iadd(other) {
        this.x += other.x;
        this.y += other.y;
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
        const size = mouse.r * (Math.random() ** (1/3) + 0.5) + 1 / scale;
        const vel = Vector.fromPolar(((1 / size) + Math.random() * 0.1) / (scale ** 1.5), -pos.dirWith(
            Vector.fromPolar(Math.random() * boundingRadius / scale, Math.random() * 2 * Math.PI),
        ));
        return new Ball(
            pos, vel, size,
            `hsl(${Math.round(Math.random() * 360)}deg ${Math.round(Math.random() * 50) + 50}% ${Math.round(Math.random() * 50) + 50}%)`
        );
    }
    update(dx) {
        const maxdis = (this.vel.getMag() + this.r) / 2; 
        for (let i = 1; i < this.trail.length; ++i) {
            const dis = Math.sqrt(this.trail[i].getDisSquared(this.trail[i - 1]));
            if (dis > maxdis) {
                this.trail[i].iadd(
                    Vector.fromPolar(
                        dis - maxdis,
                        this.trail[i - 1].dirWith(this.trail[i])
                    )
                );
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
class Mouse {
    constructor(pos, r, color) {
        this.pos = pos;
        this.r = r;
        this.color = color;
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
}
let balls = [];
const mouse = new Mouse(new Vector(), 5, "white");
mouse.lastUpdate = performance.now();

let timeOld = performance.now(), timeDelta = 0;
function frame() {
    const timeNow = performance.now();
    timeDelta = timeNow - timeOld;
    timeOld = timeNow;

    if (rainbow === 1) {
        hue += rainbow * timeDelta;
        hue %= 360;
        mouse.color = `hsl(${hue}deg 50% 50%)`;
    }

    if (!paused) {
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
                    const decrease = timeDelta / 10 / scale;
                    if (ball.r < decrease) {
                        ball.dead = true;
                        mouse.r -= ball.r;
                    } else {
                        ball.r -= decrease;
                        mouse.r -= decrease;
                    }
                    if (mouse.r < 5) {
                        ball.color = "red";
                        mouse.r = 0;
                        die();
                    }
                }
            }
        }
        balls = balls.filter(ball => { return !ball.dead; });
        // Scale
        if (mouse.r * scale > 50) {
            scaleUp();
        }
        // Mouse
        if (mouse.lastUpdate > 5) {
            mouse.lastUpdate = 0;
            for (let i = mouse.trail.length - 1; i > 0; --i) {
                mouse.trail[i].set(mouse.trail[i - 1]);
            }
        } else {
            mouse.lastUpdate += timeDelta;
        }
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
        let dir;
        for (let i = 0; i < ball.trail.length; ++i) {
            const part = ball.trail[i];
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
        const path2d = new Path2D();
        path2d.moveTo(path[0].x, path[0].y);
        let i;
        for (i = 1; i < path.length - 1; i++) {
            const xc = (path[i].x + path[i + 1].x) / 2;
            const yc = (path[i].y + path[i + 1].y) / 2;
            path2d.quadraticCurveTo(path[i].x, path[i].y, xc, yc);
        }
        const xc = (path[i].x + pathLoopAround[pathLoopAround.length - 1].x) / 2;
        const yc = (path[i].y + pathLoopAround[pathLoopAround.length - 1].y) / 2;
        path2d.quadraticCurveTo(
            path[i].x, path[i].y,
            xc, yc
        );
        for (i = pathLoopAround.length - 1; i > 1; i--) {
            const xc = (pathLoopAround[i].x + pathLoopAround[i - 1].x) / 2;
            const yc = (pathLoopAround[i].y + pathLoopAround[i - 1].y) / 2;
            path2d.quadraticCurveTo(
                pathLoopAround[i].x, pathLoopAround[i].y, 
                xc, yc
            );
        }
        path2d.quadraticCurveTo(
            pathLoopAround[i].x, pathLoopAround[i].y,
            pathLoopAround[i - 1].x, pathLoopAround[i - 1].y
        );
        path2d.closePath();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = ball.color;
        ctx.fill(path2d, "nonzero");
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

    // Render Mouse
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
    e_pausetext.textContent = "play again";
    e_pause.style.opacity = "1";
    paused = true;
    resetwaiting = true;
}
function reset() {
    mouse.r = 5;
    balls.forEach(ball => {
        ball.dead = true;
        ball.alive = 0;
    });
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

let hue = localStorage["ballz.hue"];
mouse.color = "white";
if (hue !== undefined) {
    hue = parseInt(hue);
    if (hue === NaN) {
        hue = 0;
    } else {
        mouse.color = `hsl(${hue}deg 50% 50%)`;
    }
}
let rainbow = parseInt(localStorage["ballz.rainbow"]) || 0;

window.addEventListener("pointermove", event => {
    if (paused) return;
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
window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    switch (key) {
        case "p":
            pause();
            break;
    }
});
window.addEventListener("contextmenu", event => {
    event.preventDefault();
    pause();
});
window.addEventListener("pointerdown", event => {
    if (event.buttons === 4) {
        rainbow = 1 - rainbow;
        localStorage["rainbow.hue"] = rainbow;
        return;
    }
    if (resetwaiting)
        pause();
});
window.addEventListener("wheel", event => {
    if (hue === undefined) hue = 0;
    hue += 5;
    hue %= 360;
    mouse.color = `hsl(${hue}deg 50% 50%)`;
    localStorage["ballz.hue"] = hue;
}, { passive: true });
document.addEventListener("visibilitychange", event => {
    if (document.hidden && !paused)
        pause();
})

window.requestAnimationFrame(frame);