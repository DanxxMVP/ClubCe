const FULL_ANGLE = 2 * Math.PI;

// ====================
// SISTEMA DE CÁMARA
// ====================
let currentZoom = 1;
let targetX = 0;
let targetY = 0;

const setupCamera = (ctx, playerCell, screenWidth, screenHeight) => {
    if (!playerCell) return;
    
    // *** Ajusta estos valores para controlar el zoom:
    const baseZoom = 1.5;
    const zoomFactor = Math.min(3, Math.max(0.3, baseZoom / (playerCell.radius / 100)));

    // Suavizado del zoom
    currentZoom += (zoomFactor - currentZoom) * 0.2;
    
    // *** ¡Centrado perfecto! (con suavizado para movimientos fluidos)
    targetX = playerCell.x;
    targetY = playerCell.y;

    // *** Aplicar transformaciones (orden clave):
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(screenWidth / 2, screenHeight / 2);
    ctx.scale(currentZoom, currentZoom);
    ctx.translate(-targetX, -targetY); // Resta las coordenadas del jugador
};

const resetCamera = (ctx) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
};

// ====================
// FUNCIONES DE DIBUJO
// ====================
const drawRoundObject = (position, radius, ctx) => {
    ctx.beginPath();
    ctx.arc(position.x, position.y, radius, 0, FULL_ANGLE);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
};

const drawFood = (position, food, ctx) => {
    resetCamera(ctx);
    ctx.fillStyle = `hsl(${food.hue}, 100%, 50%)`;
    ctx.strokeStyle = `hsl(${food.hue}, 100%, 45%)`;
    ctx.lineWidth = 0;
    drawRoundObject(position, food.radius, ctx);
};

const drawVirus = (position, virus, ctx) => {
    resetCamera(ctx);
    ctx.strokeStyle = virus.stroke;
    ctx.fillStyle = virus.fill;
    ctx.lineWidth = virus.strokeWidth;

    const spikes = 16;
    const outerRadius = virus.radius;
    const innerRadius = outerRadius * 0.8;
    
    ctx.beginPath();
    for (let i = 0; i < spikes; i++) {
        const outerAngle = (i * 2 * Math.PI / spikes) - Math.PI / 2;
        const outerX = position.x + outerRadius * Math.cos(outerAngle);
        const outerY = position.y + outerRadius * Math.sin(outerAngle);

        const innerAngle = ((i + 0.5) * 2 * Math.PI / spikes) - Math.PI / 2;
        const innerX = position.x + innerRadius * Math.cos(innerAngle);
        const innerY = position.y + innerRadius * Math.sin(innerAngle);

        if (i === 0) {
            ctx.moveTo(outerX, outerY);
        } else {
            ctx.lineTo(outerX, outerY);
        }
        ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
};

const drawFireFood = (position, mass, playerConfig, ctx) => {
    resetCamera(ctx);
    ctx.strokeStyle = `hsl(${mass.hue}, 100%, 45%)`;
    ctx.fillStyle = `hsl(${mass.hue}, 100%, 50%)`;
    ctx.lineWidth = playerConfig.border + 2;
    drawRoundObject(position, mass.radius - 1, ctx);
};

const valueInRange = (min, max, value) => Math.min(max, Math.max(min, value));

const circlePoint = (origo, radius, theta) => ({
    x: origo.x + radius * Math.cos(theta),
    y: origo.y + radius * Math.sin(theta)
});

const cellTouchingBorders = (cell, borders) =>
    cell.x - cell.radius <= borders.left ||
    cell.x + cell.radius >= borders.right ||
    cell.y - cell.radius <= borders.top ||
    cell.y + cell.radius >= borders.bottom;

const regulatePoint = (point, borders) => ({
    x: valueInRange(borders.left, borders.right, point.x),
    y: valueInRange(borders.top, borders.bottom, point.y)
});

const drawCellWithLines = (cell, borders, ctx) => {
    let pointCount = 30 + ~~(cell.mass / 5);
    let points = [];
    for (let theta = 0; theta < FULL_ANGLE; theta += FULL_ANGLE / pointCount) {
        let point = circlePoint(cell, cell.radius, theta);
        points.push(regulatePoint(point, borders));
    }
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
};

const drawCells = (cells, playerConfig, toggleMassState, borders, ctx) => {
    if (cells && cells.length > 0) {
        setupCamera(ctx, cells[0], ctx.canvas.width, ctx.canvas.height);
    }

    for (let cell of cells) {
        ctx.fillStyle = cell.color;
        ctx.strokeStyle = cell.borderColor;
        ctx.lineWidth = 6;
        
        if (cellTouchingBorders(cell, borders)) {
            drawCellWithLines(cell, borders, ctx);
        } else {
            drawRoundObject(cell, cell.radius, ctx);
        }

        // Texto ajustado al zoom
        const fontSize = Math.max(cell.radius / 3 / currentZoom, 12);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.strokeText(cell.name, cell.x, cell.y);
        ctx.fillText(cell.name, cell.x, cell.y);

        if (toggleMassState === 1) {
            ctx.font = `bold ${Math.max(fontSize * 0.66, 10)}px sans-serif`;
            ctx.strokeText(Math.round(cell.mass), cell.x, cell.y + fontSize);
            ctx.fillText(Math.round(cell.mass), cell.x, cell.y + fontSize);
        }
    }
    resetCamera(ctx);
};

const drawGrid = (global, player, screen, ctx) => {
    setupCamera(ctx, player, screen.width, screen.height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = global.lineColor;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();

    for (let x = -player.x; x < screen.width; x += screen.height / 18) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, screen.height);
    }

    for (let y = -player.y; y < screen.height; y += screen.height / 18) {
        ctx.moveTo(0, y);
        ctx.lineTo(screen.width, y);
    }

    ctx.stroke();
    ctx.globalAlpha = 1;
    resetCamera(ctx);
};

const drawBorder = (borders, ctx) => {
    resetCamera(ctx);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(borders.left, borders.top);
    ctx.lineTo(borders.right, borders.top);
    ctx.lineTo(borders.right, borders.bottom);
    ctx.lineTo(borders.left, borders.bottom);
    ctx.closePath();
    ctx.stroke();
};

const drawErrorMessage = (message, ctx, screen) => {
    resetCamera(ctx);
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, screen.width, screen.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(message, screen.width / 2, screen.height / 2);
};

// ====================
// EXPORTACIÓN
// ====================
module.exports = {
    drawFood,
    drawVirus,
    drawFireFood,
    drawCells,
    drawErrorMessage, // ¡Asegúrate de que esté exportada!
    drawGrid,
    drawBorder
};