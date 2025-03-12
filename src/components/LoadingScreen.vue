<template>
  <div class="loading-screen" v-if="visible">
    <div class="loading-content">
      <h2>Loading Planet...</h2>
      <div class="progress-container">
        <div class="progress-bar" :style="{ width: `${progress}%` }"></div>
      </div>
      <div class="loading-status">{{ loadingStatus }}</div>
    </div>
  </div>
</template>

<script>
import { ref, defineProps, defineEmits } from 'vue';

export default {
  name: 'LoadingScreen',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    progress: {
      type: Number,
      default: 0
    },
    loadingStatus: {
      type: String,
      default: 'Loading assets...'
    }
  },
  setup(props, { emit }) {
    return {
      // Props are already accessible
    };
  }
}
</script>

<style scoped>
.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.loading-content {
  text-align: center;
  color: white;
  max-width: 80%;
}

.loading-content h2 {
  font-size: 2.5rem;
  margin-bottom: 2rem;
  color: #ff00ff;
  text-shadow: 0 0 10px rgba(255, 0, 255, 0.7);
}

.progress-container {
  width: 300px;
  height: 20px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  margin: 0 auto 1rem auto;
  overflow: hidden;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #00ffff, #ff00ff);
  border-radius: 10px;
  transition: width 0.3s ease;
}

.loading-status {
  font-size: 1rem;
  color: #00ffff;
  margin-top: 1rem;
}
</style>