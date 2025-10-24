(function(){
    // Self-contained golf game moved from inline HTML to external file
    const canvas = document.getElementById('golfCanvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');

    // Game state
    let holeNumber = 1;
    let strokes = 0;
    let totalStrokes = 0;
    const maxHoles = 9;

    let ball = { x:50, y:50, vx:0, vy:0, radius:8 };
    let hole = { x:300, y:100, radius:12 };
    let obstacles = [];

    let isAiming = false;
    let aimStart = null;
    let aimCurrent = null;
    let inHole = false;

    // HiDPI resize
    function resizeCanvas(){
        const ratio = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.floor(rect.width * ratio);
        canvas.height = Math.floor(rect.height * ratio);
        ctx.setTransform(ratio,0,0,ratio,0,0);
    }

    // Utility collision helpers
    function rectCircleIntersect(rx, ry, rw, rh, cx, cy, cr){
        const closestX = Math.max(rx, Math.min(cx, rx+rw));
        const closestY = Math.max(ry, Math.min(cy, ry+rh));
        const dx = cx - closestX; const dy = cy - closestY;
        return (dx*dx + dy*dy) < (cr*cr);
    }

    function generateCourse(){
        const w = canvas.width/ (window.devicePixelRatio || 1);
        const h = canvas.height/ (window.devicePixelRatio || 1);
        ball.x = 40; ball.y = h/2; ball.vx = 0; ball.vy = 0;
        hole.x = Math.random() * (w*0.4) + w*0.55;
        hole.y = Math.random() * (h*0.8) + h*0.1;

        obstacles = [];
        const count = 4 + Math.floor(Math.random()*5);
        let attempts = 0;
        while(obstacles.length < count && attempts < 200){
            attempts++;
            const rw = 50 + Math.random()*120;
            const rh = 30 + Math.random()*100;
            const rx = Math.random()*(w - rw - 40) + 20;
            const ry = Math.random()*(h - rh - 40) + 20;
            const pad = 30;
            function overlapsStartOrHole(){
                if(rectCircleIntersect(rx,ry,rw,rh, ball.x, ball.y, ball.radius+pad)) return true;
                if(rectCircleIntersect(rx,ry,rw,rh, hole.x, hole.y, hole.radius+pad)) return true;
                for(const r of obstacles){
                    if(!(rx+rw < r.x || rx > r.x + r.w || ry+rh < r.y || ry > r.y + r.h)) return true;
                }
                return false;
            }
            if(!overlapsStartOrHole()){
                obstacles.push({x:rx,y:ry,w:rw,h:rh});
            }
        }
        strokes = 0;
        inHole = false;
    }

    function drawCourse(){
        const w = canvas.width/ (window.devicePixelRatio || 1);
        const h = canvas.height/ (window.devicePixelRatio || 1);
        ctx.fillStyle = '#ECFCCB';
        ctx.fillRect(0,0,w,h);
        ctx.fillStyle = '#D1FAE5';
        ctx.fillRect(0,0,w,20);
        ctx.fillRect(0,h-20,w,20);

        for(const r of obstacles){
            ctx.fillStyle = '#5B21B6';
            ctx.fillRect(r.x, r.y, r.w, r.h);
            ctx.strokeStyle = 'rgba(0,0,0,0.12)';
            ctx.strokeRect(r.x, r.y, r.w, r.h);
        }

        ctx.beginPath();
        ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI*2);
        ctx.fillStyle = '#111827';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hole.x, hole.y, hole.radius-4, 0, Math.PI*2);
        ctx.fillStyle = '#65A30D';
        ctx.fill();
    }

    function draw(){
        const w = canvas.width/ (window.devicePixelRatio || 1);
        const h = canvas.height/ (window.devicePixelRatio || 1);
        ctx.clearRect(0,0,w,h);
        drawCourse();

        if(isAiming && aimStart && aimCurrent){
            ctx.beginPath();
            ctx.moveTo(ball.x, ball.y);
            ctx.lineTo(aimCurrent.x, aimCurrent.y);
            ctx.strokeStyle = 'rgba(99,102,241,0.9)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI*2);
        ctx.fillStyle = '#4F46E5';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.stroke();

        ctx.font = 'bold 14px Inter';
        ctx.fillStyle = '#064E3B';
        ctx.fillText(`Hole: ${holeNumber} / ${maxHoles}`, 10, 20);
        ctx.fillText(`Strokes: ${strokes}`, 10, 40);
        ctx.fillText(`Total: ${totalStrokes}`, 10, 60);
    }

    function updatePhysics(){
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.vx *= 0.985;
        ball.vy *= 0.985;
        if(Math.abs(ball.vx) < 0.02) ball.vx = 0;
        if(Math.abs(ball.vy) < 0.02) ball.vy = 0;

        const w = canvas.width/ (window.devicePixelRatio || 1);
        const h = canvas.height/ (window.devicePixelRatio || 1);
        if(ball.x - ball.radius < 0){ ball.x = ball.radius; ball.vx *= -0.6; }
        if(ball.x + ball.radius > w){ ball.x = w - ball.radius; ball.vx *= -0.6; }
        if(ball.y - ball.radius < 0){ ball.y = ball.radius; ball.vy *= -0.6; }
        if(ball.y + ball.radius > h){ ball.y = h - ball.radius; ball.vy *= -0.6; }

        for(const r of obstacles){
            if(rectCircleIntersect(r.x, r.y, r.w, r.h, ball.x, ball.y, ball.radius)){
                const cx = Math.min(Math.max(ball.x, r.x), r.x + r.w);
                const cy = Math.min(Math.max(ball.y, r.y), r.y + r.h);
                const dx = ball.x - cx;
                const dy = ball.y - cy;
                if(Math.abs(dx) > Math.abs(dy)){
                    ball.vx *= -0.7; ball.x += Math.sign(dx) * 4;
                } else {
                    ball.vy *= -0.7; ball.y += Math.sign(dy) * 4;
                }
            }
        }

        const dx = ball.x - hole.x; const dy = ball.y - hole.y;
        if(!inHole && Math.hypot(dx,dy) < hole.radius - 4 && (Math.abs(ball.vx) < 0.6 && Math.abs(ball.vy) < 0.6)){
            // mark as in-hole to avoid double-counting while ball settles
            inHole = true;
            // strokes already includes the stroke that put the ball in the hole
            totalStrokes += strokes;
            // stop the ball
            ball.vx = 0; ball.vy = 0;
            // advance after a short delay so player can see the result
            setTimeout(()=>{
                if(holeNumber < maxHoles){
                    holeNumber++;
                    generateCourse();
                } else {
                    // game finished — keep final state and show completion (could add UI later)
                }
            }, 400);
        }
    }

    function loop(){
        updatePhysics();
        draw();
        requestAnimationFrame(loop);
    }

    function toCanvasCoords(clientX, clientY){
        const rect = canvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        return { x: (clientX - rect.left) * (canvas.width/rect.width) / (window.devicePixelRatio || 1), y: (clientY - rect.top) * (canvas.height/rect.height) / (window.devicePixelRatio || 1) };
    }

    canvas.addEventListener('pointerdown', (e)=>{
        e.preventDefault();
        const p = toCanvasCoords(e.clientX, e.clientY);
        isAiming = true; aimStart = p; aimCurrent = p;
    });
    canvas.addEventListener('pointermove', (e)=>{
        if(!isAiming) return;
        aimCurrent = toCanvasCoords(e.clientX, e.clientY);
    });
    canvas.addEventListener('pointerup', (e)=>{
        if(!isAiming || !aimStart) return;
        const p = toCanvasCoords(e.clientX, e.clientY);
        const dx = aimStart.x - p.x;
        const dy = aimStart.y - p.y;
        const power = Math.min(1.6, Math.hypot(dx,dy)/80);
        ball.vx = dx * 0.12 * power;
        ball.vy = dy * 0.12 * power;
        strokes++;
        isAiming = false; aimStart = null; aimCurrent = null;
    });
    canvas.addEventListener('pointercancel', ()=>{ isAiming=false; aimStart=null; aimCurrent=null; });

    function addControls(){
        const container = canvas.parentElement;
        let ctl = document.getElementById('golf-controls');
        if(ctl) return;
        ctl = document.createElement('div'); ctl.id='golf-controls';
        ctl.style.marginTop = '8px';
        ctl.innerHTML = '<button id="golf-restart" style="padding:8px 12px;border-radius:6px;background:#4338CA;color:#fff;border:none;cursor:pointer">Restart Course</button> <button id="golf-new" style="padding:8px 12px;border-radius:6px;background:#10B981;color:#fff;border:none;cursor:pointer">New Course</button>';
        container.appendChild(ctl);
        document.getElementById('golf-restart').addEventListener('click', ()=>{ generateCourse(); });
        document.getElementById('golf-new').addEventListener('click', ()=>{ holeNumber=1; totalStrokes=0; generateCourse(); });
    }

    function init(){
        resizeCanvas();
        window.addEventListener('resize', ()=>{ resizeCanvas(); generateCourse(); });
        generateCourse();
        addControls();
        loop();
    }

    // Run when DOM is ready (script is deferred but this ensures safety)
    if(document.readyState === 'complete' || document.readyState === 'interactive'){
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
