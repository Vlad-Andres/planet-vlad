<template>
    <GameIntro />
  </template>
  
  <script>
  import GameIntro from './components/GameIntro.vue'
  
  export default {
    name: 'App',
    components: {
      GameIntro
    }
  }
  </script>
  
  <style>
  html, body {
    margin: 0;
    padding: 0;
    overflow-x: hidden;
    font-family: Arial, sans-serif;
  }
  
  * {
    box-sizing: border-box;
  }
  </style>