import { defineConfig } from 'vite';

// export default defineConfig(({ command, mode }) => {
//       // set base url for production to /vue3-todo/
//     base: process.env.NODE_ENV === 'production' ? '/vue3-todo/' : '/',
//     return {
//         resolve: {
//             alias: {
//                 'babylonjs': mode === 'development' ? 'babylonjs/babylon.max' : 'babylonjs'
//             }
//         }
//     };
// });

// // https://vitejs.dev/config/
// export default defineConfig({
//     // set base url for production to /vue3-todo/
//     base: process.env.NODE_ENV === 'production' ? '/vue3-todo/' : '/',
//   })

  // vite.config.js
export default {
  // ...
  base: '/planet-vlad/', // Set this to your repository name if applicable
  // ...
}
