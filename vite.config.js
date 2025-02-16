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

export default defineConfig({
  base: '/planet-vlad/', // Ensure this matches your repository name
});
