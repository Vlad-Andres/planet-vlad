<template>
  <div class="game-container">
    <!-- Canvas for Babylon.js game -->
    <canvas id="renderCanvas" tabindex="0"></canvas>
    
    <!-- Glass panel overlay -->
    <div class="intro-overlay" :class="{ 'hide-overlay': isOverlayHidden }">
      <div class="intro-content">
        <h1>Welcome to Planet Vlad</h1>
        <p>Explore the journey of my life through changing biomes and landscapes. Each environment represents a different chapter from Moldova to the Netherlands and beyond.</p>
        
        <div class="controls-guide">
          <div class="controls-section">
            <h2>Controls</h2>
            <ul>
              <li><span class="key">W,A,S,D</span> - Move around the planet</li>
              <li><span class="key">Space</span> - Change biome</li>
              <li><span class="key">Mouse</span> - Look around</li>
            </ul>
          </div>
        </div>
        
        <p class="journey-text">Ready to begin the journey?</p>
        
        <button class="start-journey-btn" @click="startGame">Start Journey</button>
      </div>
      
      <div class="scroll-indicator" @click="hideOverlay">
        <span>Scroll Down</span>
        <div class="arrow-down"></div>
      </div>
    </div>
    
    <!-- About section that appears when scrolling down -->
    <div class="about-section" ref="aboutSection">
      <div class="about-content">
        <h2>About Me</h2>
        <div class="timeline">
          <div class="timeline-item">
            <h3>Childhood in Moldova</h3>
            <p>Growing up surrounded by nature and simplicity shaped my early perspectives on life.</p>
          </div>
          
          <div class="timeline-item">
            <h3>Moving to the Big City</h3>
            <p>The transition to urban life brought new opportunities and challenges that fostered my personal growth.</p>
          </div>
          
          <div class="timeline-item">
            <h3>Life in the Netherlands</h3>
            <p>Leaving home was a leap of faith that opened doors to new cultures, perspectives, and professional development.</p>
          </div>
          
          <div class="timeline-item">
            <h3>Exchange in Iceland</h3>
            <p>An adventure of self-discovery amid volcanic landscapes that changed my outlook on the world.</p>
          </div>
        </div>
        
        <div class="skills-section">
          <h3>Skills & Interests</h3>
          <div class="skills-grid">
            <div class="skill-card">Web Development</div>
            <div class="skill-card">3D Graphics</div>
            <div class="skill-card">Game Design</div>
            <div class="skill-card">Creative Coding</div>
          </div>
        </div>
        
        <div class="contact">
          <h3>Get In Touch</h3>
          <p>Interested in my work or have a project in mind? Let's connect!</p>
          <a href="#" class="contact-button">Contact Me</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, nextTick } from 'vue';
import { AppOne } from '../AppOne'; // Make sure this path is correct

export default {
  name: 'GameIntro',
  setup() {
    const isOverlayHidden = ref(false);
    const aboutSection = ref(null);
    let app = null;
    
    const startGame = () => {
      isOverlayHidden.value = true;
      // Start the game
      document.dispatchEvent(new Event('game-start'));
      nextTick(() => {
        const canvas = document.getElementById('renderCanvas');
        if (canvas) {
          canvas.focus();
          canvas.style.outline = 'none';
          // Add event listener to maintain focus
          window.addEventListener('click', () => {
            if (document.activeElement !== canvas) {
              canvas.focus();
            }
          });
        }
      });
    };

    const hideOverlay = () => {
      isOverlayHidden.value = true;
      // Dispatch game-start event
    };
    
    onMounted(() => {
      // Initialize Babylon.js game
      const canvas = document.getElementById('renderCanvas');
      app = new AppOne(canvas);
      app.run();
      
      // Setup scroll listener to show/hide overlay based on scroll position
      window.addEventListener('scroll', () => {
        const scrollPosition = window.scrollY;
        const windowHeight = window.innerHeight;
        
        // Hide overlay when scrolled enough (30% of viewport height)
        if (scrollPosition > windowHeight * 0.3) {
          isOverlayHidden.value = true;
          const canvas = document.getElementById('renderCanvas');
          if (canvas) {
            canvas.focus();
          }
        } else if (scrollPosition < windowHeight * 0.1) { 
          // Show overlay when near top
          isOverlayHidden.value = false;
        }
      });
    });
    
    return {
      isOverlayHidden,
      hideOverlay,
      startGame,
      aboutSection
    };
  }
}
</script>