// Update import paths
import { AppOne } from './core/AppOne'
import { LandingScreen } from './core/LandingScreen'
import GameIntro from './components/GameIntro.vue'  // Changed from LandingOverlay
import { createApp } from 'vue'

// Create and mount the Vue application
document.addEventListener('DOMContentLoaded', () => {
  const appElement = document.createElement('div')
  appElement.id = 'app'
  document.body.appendChild(appElement)
})

const app = createApp({
  components: {
    GameIntro  // Changed from LandingOverlay
  },
  template: `<GameIntro @gameStart="handleGameStart" />`,  // Changed template
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