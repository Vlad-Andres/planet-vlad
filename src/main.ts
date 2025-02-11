import { AppOne as App } from './AppOne';

console.log(`main.ts starting ${App.name}`);
window.addEventListener('DOMContentLoaded', () => {
    let canvasElement = document.getElementById('renderCanvas');
    if (canvasElement instanceof HTMLCanvasElement) {
        let app = new App(canvasElement);
        app.run();
    } else {
        console.error('renderCanvas element is not a canvas');
    }
});