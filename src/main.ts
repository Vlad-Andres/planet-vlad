// import { AppOne } from './AppOne';
// // import './vue-app';

// console.log(`main.ts starting ${App.name}`);
// window.addEventListener('DOMContentLoaded', () => {
//     let canvasElement = document.getElementById('renderCanvas');
//     if (canvasElement instanceof HTMLCanvasElement) {
//         let app = new AppOne(canvasElement);
//         app.run();
//     } else {
//         console.error('renderCanvas element is not a canvas');
//     }
// });

import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')