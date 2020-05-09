const grid = document.getElementById('grid');
const zoomText = document.getElementById('zoom-text');
const zoomIncrease = document.getElementById('zoom-increase');
const zoomDecrease = document.getElementById('zoom-decrease');
const areaTotalText = document.getElementById('area-total');
const areaSelectionText = document.getElementById('area-selection');
const shapesListElement = document.getElementById('shapes');

const gridSpaces = {};

const shapes = [];
const shapeMap = new Map();

const drawToolRadios = document.getElementsByName('draw-tool');

const regexNumberInputNegativeAllowed = /^-?\d*\.?\d*$/;
const regexNumberInputPositive = /^\d*\.?\d*$/;

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

                const shapeLi = shapeMap.get(shapeToMove);
                shapeLi.querySelector('[data-x]').value = parseFloat(shapeToMove.getAttribute('x'));
                shapeLi.querySelector('[data-y]').value = parseFloat(shapeToMove.getAttribute('y'));
                shapeLi.querySelector('[data-x]').oldValue = parseFloat(shapeToMove.getAttribute('x'));
                shapeLi.querySelector('[data-y]').oldValue = parseFloat(shapeToMove.getAttribute('y'));
            } else if (shapeToMove.tagName === 'circle') {
                shapeToMove.setAttribute('cx', x + initOffsetX);
                shapeToMove.setAttribute('cy', y + initOffsetY);

                const shapeLi = shapeMap.get(shapeToMove);
                shapeLi.querySelector('[data-cx]').value = parseFloat(shapeToMove.getAttribute('cx'));
                shapeLi.querySelector('[data-cy]').value = parseFloat(shapeToMove.getAttribute('cy'));
                shapeLi.querySelector('[data-cx]').oldValue = parseFloat(shapeToMove.getAttribute('cx'));
                shapeLi.querySelector('[data-cy]').oldValue = parseFloat(shapeToMove.getAttribute('cy'));
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
        shapeMap.set(highlightShape, li);
        shapeMap.set(li, highlightShape);

        if (event.target.tagName === 'rect') {
            li.querySelector('[data-x]').value = parseFloat(highlightShape.getAttribute('x'));
            li.querySelector('[data-y]').value = parseFloat(highlightShape.getAttribute('y'));
        } else if (event.target.tagName === 'circle') {
            li.querySelector('[data-cx]').value = parseFloat(highlightShape.getAttribute('cx'));
            li.querySelector('[data-cy]').value = parseFloat(highlightShape.getAttribute('cy'));
            li.querySelector('[data-r]').value = parseFloat(highlightShape.getAttribute('r'));
        } else {
            console.log(event.target.tagName);
        }

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
        const radius = calcRadius(width, height);
        highlightShape = drawCircle(svg, x1, y1, radius);
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

    const infoHtmlRect = `
        <div class="input-group">
            <div class="input-group-min">
                <span>X</span>
            </div>
            <div class="input-group-max">
                <input type="text" data-x="">
            </div>
            <div class="input-group-min">
                <span>Y</span>
            </div>
            <div class="input-group-max">
                <input type="text" data-y="">
            </div>
        </div>
    `;
    
    const infoHtmlCircle = `
        <div class="input-group">
            <div class="input-group-min">
                <span>CX</span>
            </div>
            <div class="input-group-max">
                <input type="text" data-cx="">
            </div>
            <div class="input-group-min">
                <span>CY</span>
            </div>
            <div class="input-group-max">
                <input type="text" data-cy="">
            </div>
            <div class="input-group-min">
                <span>R</span>
            </div>
            <div class="input-group-max">
                <input type="text" data-r="">
            </div>
        </div>
    `;

    const infoHtml = shape.tagName === 'circle' ? infoHtmlCircle : infoHtmlRect;

    const html = `
        <li class="li-shape" data-order="${shapesListElement.children.length}">
            <div class="input-group">
                <div class="input-group-min">
                    <span></span>
                </div>
                <div class="input-group-max">
                    <input type="text" placeholder="${shapesListElement.children.length}">
                </div>
                <div class="input-group-min">
                    <button data-collapsed="true" class="chevron-down"></button>
                </div>
            </div>
            <div class="li-shape-info hidden">
                ${infoHtml}
            </div>
        </li>
    `;
    const li = htmlToElement(html);

    const liCollapseButton = li.querySelector('[data-collapsed]');
    const liShapeInfo = li.querySelector('.li-shape-info');

    if (shape.tagName === 'rect') {
        const xInput = li.querySelector('[data-x]');
        const yInput = li.querySelector('[data-y]');
        setInputFilter(xInput, val => regexNumberInputNegativeAllowed.test(val));
        setInputFilter(yInput, val => regexNumberInputNegativeAllowed.test(val));
    
        xInput.addEventListener('blur', () => {
            shapeMap.get(li).setAttribute('x', parseFloat(xInput.value));
        });
        yInput.addEventListener('blur', () => {
            shapeMap.get(li).setAttribute('y', parseFloat(yInput.value));
        });
    
        xInput.addEventListener('keydown', (keyEvent) => {
            // Enter Key
            if (keyEvent.which == 13) {
                shapeMap.get(li).setAttribute('x', parseFloat(xInput.value));
            }
        });
        yInput.addEventListener('keydown', (keyEvent) => {
            // Enter Key
            if (keyEvent.which == 13) {
                shapeMap.get(li).setAttribute('y', parseFloat(yInput.value));
            }
        });
    } else if (shape.tagName === 'circle') {
        const cxInput = li.querySelector('[data-cx]');
        const cyInput = li.querySelector('[data-cy]');
        const rInput = li.querySelector('[data-r]');
        setInputFilter(cxInput, val => regexNumberInputNegativeAllowed.test(val));
        setInputFilter(cyInput, val => regexNumberInputNegativeAllowed.test(val));
        setInputFilter(rInput, val => regexNumberInputPositive.test(val));

        cxInput.addEventListener('blur', () => {
            shapeMap.get(li).setAttribute('cx', parseFloat(cxInput.value));
        });
        cyInput.addEventListener('blur', () => {
            shapeMap.get(li).setAttribute('cy', parseFloat(cyInput.value));
        });
        rInput.addEventListener('blur', () => {
            shapeMap.get(li).setAttribute('r', parseFloat(rInput.value));
        });

        cxInput.addEventListener('keydown', (keyEvent) => {
            // Enter Key
            if (keyEvent.which == 13) {
                shapeMap.get(li).setAttribute('cx', parseFloat(cxInput.value));
            }
        });
        cyInput.addEventListener('keydown', (keyEvent) => {
            // Enter Key
            if (keyEvent.which == 13) {
                shapeMap.get(li).setAttribute('cy', parseFloat(cyInput.value));
            }
        });
        rInput.addEventListener('keydown', (keyEvent) => {
            // Enter Key
            if (keyEvent.which == 13) {
                shapeMap.get(li).setAttribute('r', parseFloat(rInput.value));
            }
        });
    }

    liCollapseButton.addEventListener('click', () => {
        const collapsed = liCollapseButton.dataset.collapsed === 'true';

        if (collapsed) {
            liCollapseButton.classList.remove('chevron-down');
            liCollapseButton.classList.add('chevron-up');
            liCollapseButton.dataset.collapsed = 'false';
            liShapeInfo.classList.remove('hidden');
        } else {
            liCollapseButton.classList.remove('chevron-up');
            liCollapseButton.classList.add('chevron-down');
            liCollapseButton.dataset.collapsed = 'true';
            liShapeInfo.classList.add('hidden');
        }

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


/**
 * Creates a DOM Element from the given html string.
 * @param {string} html - A string representation of html.
 * @returns {ChildNode} the dom element created from the html string.
 */
function htmlToElement(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
}


function setInputFilter(element, filter) {
    ['input', 'keydown', 'keyup', 'mousedown', 'mouseup', 'select', 'contextmenu', 'drop'].forEach((event) => {
        element.addEventListener(event, () => {
            if (filter(element.value)) {
                element.oldValue = element.value;
                element.oldSelectionStart = element.selectionStart;
                element.oldSelectionEnd = element.selectionEnd;
            } else if (element.hasOwnProperty('oldValue')) {
                element.value = element.oldValue;
                element.setSelectionRange(element.oldSelectionStart, element.oldSelectionEnd);
            } else {
                element.value = '';
            }
        });
    });
}


/**
 * Calculates a radius based on width and height, rounded to 2 decimal places.
 * @param {Number} width 
 * @param {Number} height 
 */
function calcRadius(width, height) {
    const radius = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
    return Math.round((radius + Number.EPSILON) * 100) / 100
}