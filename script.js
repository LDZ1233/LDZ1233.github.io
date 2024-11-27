function createStars(num) {
    const container = document.querySelector('body');
    for (let i = 0; i < num; i++) {
        let star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + 'vw';
        star.style.top = Math.random() * 100 + 'vh';
        star.style.animationDelay = Math.random() * 20 + 's';
        container.appendChild(star);
    }
}

function createComets(num) {
    const container = document.querySelector('body');
    for (let i = 0; i < num; i++) {
        let comet = document.createElement('div');
        comet.className = 'comet';
        comet.style.left = Math.random() * 100 + 'vw';
        comet.style.top = Math.random() * -20 + 'vh'; // Start above the screen
        comet.style.animationDelay = Math.random() * 5 + 's';
        container.appendChild(comet);
    }
}

createStars(100); // 创建100颗星星
createComets(5);  // 创建5条流星
