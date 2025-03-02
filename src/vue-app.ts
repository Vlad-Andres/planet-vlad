import { createApp } from 'vue'
import LandingOverlay from './components/LandingOverlay.vue'

// Create and mount the Vue application
document.addEventListener('DOMContentLoaded', () => {
  const appElement = document.createElement('div')
  appElement.id = 'app'
  document.body.appendChild(appElement)
})

const app = createApp({
  components: {
    LandingOverlay
  },
  template: `<LandingOverlay @gameStart="handleGameStart" />`,
  setup() {
    const handleGameStart = () => {
      // Remove the blur effect from the scene
      const event = new CustomEvent('game-start')
      document.dispatchEvent(event)
    }
    
    return {
      handleGameStart
    }
  }
})

// Mount the app immediately
app.mount('#app')

export default app