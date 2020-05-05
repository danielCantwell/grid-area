const grid = document.getElementById('grid');
const zoomText = document.getElementById('zoom-text');
const zoomIncrease = document.getElementById('zoom-increase');
const zoomDecrease = document.getElementById('zoom-decrease');
const areaTotalText = document.getElementById('area-total');
const areaSelectionText = document.getElementById('area-selection');
const shapesListElement = document.getElementById('shapes');

const gridSpaces = {};

const shapes = [];

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
let highlightRect = null;
let mouseDownCoordinates = [];
grid.addEventListener('mousedown', (event) => {
    const [x, y] = transformToViewBox(grid, event.x, event.y);
    mouseDownCoordinates = [x, y];
});

grid.addEventListener('mousemove', (event) => {   
    if (mouseDownCoordinates.length) {
        const [x, y] = transformToViewBox(grid, event.x, event.y);

        const rectToMove = shapes.find(shape => shape.classList.contains('grabbing'));
        if (rectToMove) {
            // Offset between rectangle x,y and mousedown x,y
            const initOffsetX = rectToMove.dataset.mousedownRectX - mouseDownCoordinates[0];
            const initOffsetY = rectToMove.dataset.mousedownRectY - mouseDownCoordinates[1];

            // Sustain offset with mousemove coordinate
            rectToMove.setAttribute('x', x + initOffsetX);
            rectToMove.setAttribute('y', y + initOffsetY);
        } else {
            highlightSelection(grid, mouseDownCoordinates[0], mouseDownCoordinates[1], x, y);
        }
    }
});

grid.addEventListener('mouseup', (event) => {
    if (highlightRect !== null) {
        highlightRect.setAttribute('fill', '#fff');
        highlightRect.setAttribute('stroke', '#000');
        highlightRect.setAttribute('stroke-width', 1);
        shapes.push(highlightRect);

        highlightRect.addEventListener('mousedown', (event) => {
            event.target.classList.add('grabbing');

            shapes.forEach(shape => shape.classList.remove('focused'));
            event.target.classList.add('focused');

            event.target.dataset.mousedownRectX = parseFloat(event.target.getAttribute('x'));
            event.target.dataset.mousedownRectY = parseFloat(event.target.getAttribute('y'));
        });

        const li = createShapeLi(highlightRect);
        shapesListElement.appendChild(li);

        highlightRect = null;
    } else {
        const rectToMove = shapes.find(shape => shape.classList.contains('grabbing'));
        if (rectToMove) {
            rectToMove.classList.remove('grabbing');
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


// function drawRectForCoordinates(svg, x, y) {
//     const width = Math.floor(svg.scrollWidth / zoom);
//     const left = x - (x % width);
//     const top = y - (y % width);
//     return drawRect(svg, left, top, width, width);
// }


function highlightSelection(svg, x1, y1, x2, y2) {
    if (highlightRect !== null) {
        highlightRect.remove();
    }
    const left = Math.min(x1, x2);
    const width = Math.abs(x2 - x1);
    const top = Math.min(y1, y2);
    const height = Math.abs(y2 - y1);
    highlightRect = drawRect(svg, left, top, width, height);
    highlightRect.setAttribute('fill', '#87ceeb44');
    highlightRect.setAttribute('stroke', '#87ceeb');
    highlightRect.setAttribute('stroke-width', 2);
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
    const template = document.getElementById('li-shape');
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