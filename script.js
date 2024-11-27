document.getElementById('addBoxButton').addEventListener('click', function() {
    const container = document.getElementById('container');
    const box = document.createElement('div');
    box.className = 'box';
    box.innerHTML = '<p contenteditable="false">双击编辑文本</p>';
    box.addEventListener('dblclick', function() {
        this.querySelector('p').contentEditable = 'true';
        this.querySelector('p').focus();
        box.classList.add('editing');
    });
    box.querySelector('p').addEventListener('blur', function() {
        box.classList.remove('editing');
        this.contentEditable = 'false';
    });

    // Make the box draggable
    let pos = {top: 0, left: 0, x: 0, y: 0};
    box.addEventListener('mousedown', dragStart);
    box.addEventListener('mouseup', dragEnd);
    box.addEventListener('mousemove', drag);

    function dragStart(e) {
        e.preventDefault();
        if (!box.classList.contains('editing')) {
            pos = {
                left: box.offsetLeft - e.clientX,
                top: box.offsetTop - e.clientY,
                x: e.clientX,
                y: e.clientY
            };
            box.style.userSelect = "none";
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);
        }
    }

    function drag(e) {
        pos.left = pos.left + e.clientX - pos.x;
        pos.top = pos.top + e.clientY - pos.y;
        pos.x = e.clientX;
        pos.y = e.clientY;

        box.style.left = `${pos.left}px`;
        box.style.top = `${pos.top}px`;
    }

    function dragEnd() {
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', dragEnd);
        box.style.userSelect = "auto";
    }

    container.appendChild(box);
});
