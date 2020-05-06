const grid = document.getElementById('grid');
const zoomText = document.getElementById('zoom-text');
const zoomIncrease = document.getElementById('zoom-increase');
const zoomDecrease = document.getElementById('zoom-decrease');
const areaTotalText = document.getElementById('area-total');
const areaSelectionText = document.getElementById('area-selection');
const shapesListElement = document.getElementById('shapes');

const gridSpaces = {};

const shapes = [];

const drawToolRadios = document.getElementsByName('draw-tool');

updateSvgViewBox(grid);

// Initialize zoom level
let zoom = 50;
zoomIncrease.addEventListener('click', () => {
    if (zoom > 5) {
        zoom -= 5;
        drawGridBackground(grid);
    }
});
zoomDecrease.addEventListener('click', () => {
    zoom += 5;
    drawGridBackground(grid);
});

// Initialize grid background
const gridGroup = addGroup(grid, 'background-grid');
drawGridBackground(gridGroup);

// Create root group intended for drawing
const root = addGroup(grid, 'root');

// Create a group intended for metadata
const metaGroup = addGroup(grid, 'meta');

// Update svg viewBox and grid on window resize
let resizeId = null;
window.addEventListener('resize', () => {
    clearTimeout(resizeId);
    resizeId = setTimeout(() => {
        updateSvgViewBox(grid);
        drawGridBackground(grid);
    }, 500);
});

// Highlight selection area on mouse events
let highlightShape = null;
let mouseDownCoordinates = [];
grid.addEventListener('mousedown', (event) => {
    const [x, y] = transformToViewBox(grid, event.x, event.y);
    mouseDownCoordinates = [x, y];
});

grid.addEventListener('mousemove', (event) => {   
    const [x, y] = transformToViewBox(grid, event.x, event.y);

    if (mouseDownCoordinates.length) {
        const shapeToMove = shapes.find(shape => shape.classList.contains('grabbing'));
        if (shapeToMove) {
            // Offset between rectangle x,y and mousedown x,y
            const initOffsetX = shapeToMove.dataset.mouseDownShapeX - mouseDownCoordinates[0];
            const initOffsetY = shapeToMove.dataset.mouseDownShapeY - mouseDownCoordinates[1];

            // Sustain offset with mousemove coordinate
            if (shapeToMove.tagName === 'rect') {
                shapeToMove.setAttribute('x', x + initOffsetX);
                shapeToMove.setAttribute('y', y + initOffsetY);
            } else if (shapeToMove.tagName === 'circle') {
                shapeToMove.setAttribute('cx', x + initOffsetX);
                shapeToMove.setAttribute('cy', y + initOffsetY);
            }
        } else {
            highlightSelection(grid, mouseDownCoordinates[0], mouseDownCoordinates[1], x, y);
        }
    }

    createCursorCoordinatesText(grid, x, y);
});

grid.addEventListener('mouseup', (event) => {
    if (highlightShape !== null) {
        highlightShape.setAttribute('fill', '#fff');
        highlightShape.setAttribute('stroke', '#000');
        highlightShape.setAttribute('stroke-width', 1);
        shapes.push(highlightShape);

        highlightShape.addEventListener('mousedown', (event) => {
            event.target.classList.add('grabbing');

            shapes.forEach(shape => shape.classList.remove('focused'));
            event.target.classList.add('focused');

            if (event.target.tagName === 'rect') {
                event.target.dataset.mouseDownShapeX = parseFloat(event.target.getAttribute('x'));
                event.target.dataset.mouseDownShapeY = parseFloat(event.target.getAttribute('y'));
            } else if (event.target.tagName === 'circle') {
                event.target.dataset.mouseDownShapeX = parseFloat(event.target.getAttribute('cx'));
                event.target.dataset.mouseDownShapeY = parseFloat(event.target.getAttribute('cy'));
            }
        });

        const li = createShapeLi(highlightShape);
        shapesListElement.appendChild(li);

        highlightShape = null;
    } else {
        const shapeToMove = shapes.find(shape => shape.classList.contains('grabbing'));
        if (shapeToMove) {
            shapeToMove.classList.remove('grabbing');
        }
    }

    mouseDownCoordinates = [];
});


function updateSvgViewBox(svg) {
    const gridWidth = svg.scrollWidth;
    const gridHeight = svg.scrollHeight;
    svg.setAttribute('width', gridWidth);
    svg.setAttribute('height', gridHeight);
    svg.setAttribute('viewBox', `${-gridWidth / 2} ${-gridHeight / 2} ${gridWidth} ${gridHeight}`)
}


function drawGridBackground(svg) {
    const gridWidth = grid.scrollWidth;
    const gridHeight = grid.scrollHeight;

    while (svg.lastChild) {
        svg.removeChild(svg.lastChild);
    }

    const step = Math.floor(gridWidth / zoom);

    // Draw Horizontal Lines
    for (let i = -step; i > -gridHeight / 2; i -= step) {
        const gridLine = drawLine(svg, -gridWidth / 2, i, gridWidth / 2, i);
        gridLine.setAttribute('stroke', '#e8e8e8');
    }

    for (let i = step; i < gridHeight / 2; i += step) {
        const gridLine = drawLine(svg, -gridWidth / 2, i, gridWidth / 2, i);
        gridLine.setAttribute('stroke', '#e8e8e8');
    }

    // Draw Vertical Lines
    for (let i = -step; i > -gridWidth / 2; i -= step) {
        const gridLine = drawLine(svg, i, -gridHeight / 2, i, gridHeight / 2);
        gridLine.setAttribute('stroke', '#e8e8e8');
    }

    for (let i = step; i < gridWidth / 2; i += step) {
        const gridLine = drawLine(svg, i, -gridHeight / 2, i, gridHeight / 2);
        gridLine.setAttribute('stroke', '#e8e8e8');
    }

    const horizontalCenterLine = drawLine(svg, -gridWidth / 2, 0, gridWidth / 2, 0);
    horizontalCenterLine.setAttribute('stroke-width', 2);

    const verticalCenterLine = drawLine(svg, 0, -gridHeight / 2, 0, gridHeight / 2);
    verticalCenterLine.setAttribute('stroke-width', 2);
}


function addGroup(svg, name) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('name', name);
    svg.append(group);
    return group;
}


function drawLine(svg, x1, y1, x2, y2) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#bbb');
    line.setAttribute('stroke-width', '1');
    svg.append(line);
    return line;
}


function drawRect(svg, x, y, width, height) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
    rect.setAttribute('fill', '#fff');
    rect.setAttribute('stroke', '#fff');
    svg.append(rect);

    return rect;
}

function drawCircle(svg, x, y, radius) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', radius);
    svg.append(circle);
    return circle;
}


// function drawRectForCoordinates(svg, x, y) {
//     const width = Math.floor(svg.scrollWidth / zoom);
//     const left = x - (x % width);
//     const top = y - (y % width);
//     return drawRect(svg, left, top, width, width);
// }


function highlightSelection(svg, x1, y1, x2, y2) {
    if (highlightShape !== null) {
        highlightShape.remove();
    }
    const left = Math.min(x1, x2);
    const width = Math.abs(x2 - x1);
    const top = Math.min(y1, y2);
    const height = Math.abs(y2 - y1);

    const activeDrawTool = getActiveDrawTool();

    if (activeDrawTool == 'tool-rect') {
        highlightShape = drawRect(svg, left, top, width, height);
    } else if (activeDrawTool == 'tool-circle') {
        highlightShape = drawCircle(svg, x1, y1, width);
    }

    highlightShape.setAttribute('fill', '#87ceeb44');
    highlightShape.setAttribute('stroke', '#87ceeb');
    highlightShape.setAttribute('stroke-width', 2);
}


function getCoordinateGridSpace(svg, x, y) {
    const width = Math.floor(svg.scrollWidth / zoom);
    const left = x - (x % width);
    const top = y - (y % width);
    return `${Math.floor(left / width)},${Math.floor(top / width)}`;
}


function updateTotalArea() {
    const unitSpaces = Object.keys(gridSpaces);
    const area = unitSpaces.length
    areaTotalText.innerText = area;
}


// function drawRectsForSelection(svg, x1, y1, x2, y2) {
//     const width = Math.floor(svg.scrollWidth / zoom);
//     const left = Math.min(x1, x2);
//     const right = Math.max(x1, x2);
//     const top = Math.min(y1, y2);
//     const bottom = Math.max(y1, y2);

//     for (let x = left; x < right; x += width ) {
//         for (let y = top; y < bottom; y += width) {
//             const space = getCoordinateGridSpace(grid, x, y);
//             if (!gridSpaces[space]) {
//                 gridSpaces[space] = drawRectForCoordinates(grid, x, y);
//             }
//         }
//     }
// }

function transformToViewBox(svg, x, y) {
    return [
        x - (svg.scrollWidth / 2),
        y - (svg.scrollHeight / 2),
    ];
}

function createShapeLi(shape) {
    const li = document.createElement('li');
    li.className = 'li-shape';

    const handleDiv = document.createElement('div');
    handleDiv.className = 'li-shape-handle';
    li.appendChild(handleDiv);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'flex-row';
    const input = document.createElement('input');
    input.setAttribute('type', 'text');
    input.classList.add('li-shape-label');
    input.classList.add('flex-max');
    const buttonDelete = document.createElement('button');
    buttonDelete.classList.add('btn-delete');
    buttonDelete.classList.add('flex-min');
    buttonDelete.innerHTML = 'X';
    contentDiv.appendChild(input);
    contentDiv.appendChild(buttonDelete);

    li.appendChild(handleDiv);
    li.appendChild(contentDiv);

    li.dataset.order = shapesListElement.children.length;
    const liShapeLabel = li.querySelector('.li-shape-label');
    liShapeLabel.setAttribute('placeholder', li.dataset.order);

    handleDiv.addEventListener('click', () => {
        for (let i = 0; i < shapes.length; i++) {
            if (i == li.dataset.order) {
                shapes[i].classList.add('focused');
            } else {
                shapes[i].classList.remove('focused');
            }
        }
    });

    return li;
}

let cursorText = null;
function createCursorCoordinatesText(grid, x, y) {
    if (cursorText === null) {
        cursorText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        cursorText.className = 'cursor-coords-text';
        metaGroup.append(cursorText);
    }

    while (cursorText.lastChild) {
        cursorText.lastChild.remove();
    }

    cursorText.setAttribute('x', x + 10);
    cursorText.setAttribute('y', y - 10);
    cursorText.setAttribute('fill', '#000');
    cursorText.setAttribute('font-family', 'Verdana');
    cursorText.setAttribute('font-size', '12');
    cursorText.setAttribute('text-anchor', 'left');

    const textValue = `(${x}, ${y})`;
    cursorText.innerHTML = textValue;
}


function getActiveDrawTool() {
    return document.querySelector('input[name="draw-tool"]:checked').value;
}