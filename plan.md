# Game Scenario Plan for Personal Website

## **1. Initial User Experience (Website Landing)**
- **Visuals**:  
  - Blurred screen with a faintly visible sphere (planet) moving in the background.  
  - Foreground: Text overlay with game instructions and a brief description of the game’s purpose (e.g., “Explore the journey of my life through changing biomes”).  
  - Subtle animations (e.g., the sphere slowly rotating, text fading in and out).  

- **Interaction**:  
  - User presses `WASD` or clicks a “Start” button to begin.  
  - The blur effect smoothly fades out, revealing the game world.  

---

## **2. Gameplay Mechanics**
- **Player Movement**:  
  - Use `WASD` for movement, with smooth camera controls (e.g., mouse or arrow keys to look around).  
  - The player walks on the surface of the sphere (planet), which acts as the game world.  

- **Biome Transitions**:  
  - Press a specific key (e.g., `Spacebar` or `E`) to trigger a biome change.  
  - Biome changes are accompanied by:  
    - A smooth transition effect (e.g., fade to white, then fade into the new biome).  
    - A change in the sphere’s material (e.g., grass, pavement, volcanic rock).  
    - Randomly spawned meshes (e.g., trees, buildings, volcanic rocks) that match the biome’s theme.  

---

## **3. Narrative and Biome Design**
Each biome represents a phase of your life, with associated visuals, sounds, and narrative elements. Here’s a detailed breakdown:

### **Biome 1: Grassland (Childhood in Moldova)**  
- **Visuals**:  
  - Green grass material for the sphere.  
  - Randomly spawned trees, flowers, and small houses.  
- **Background Lighting**:  
  - Warm, soft sunlight (e.g., `HemisphericLight` with a yellowish tint).  
- **Background Color**:  
  - Light blue sky (e.g., `scene.clearColor = new BABYLON.Color3(0.6, 0.8, 1)`).  
- **Sounds**:  
  - Calm nature sounds (birds chirping, wind rustling).  
- **Narrative**:  
  - A text overlay or voiceover: “This is where it all began—my childhood in Moldova, surrounded by nature and simplicity.”  

### **Biome 2: Urban City (Moving to the Big City)**  
- **Visuals**:  
  - Gray pavement material for the sphere.  
  - Randomly spawned buildings, cars, and streetlights.  
- **Background Lighting**:  
  - Cool, artificial light (e.g., `DirectionalLight` with a bluish tint).  
- **Background Color**:  
  - Grayish sky (e.g., `scene.clearColor = new BABYLON.Color3(0.5, 0.5, 0.5)`).  
- **Sounds**:  
  - City ambiance (traffic, distant chatter).  
- **Narrative**:  
  - “As I grew older, I moved to the city—a place of opportunities and challenges.”  

### **Biome 3: Foreign Land (Moving to the Netherlands)**  
- **Visuals**:  
  - A mix of grass and water material (symbolizing the Netherlands’ landscapes).  
  - Randomly spawned windmills, bicycles, and tulips.  
- **Background Lighting**:  
  - Soft, diffused light (e.g., `HemisphericLight` with a neutral white tint).  
- **Background Color**:  
  - Light gray sky (e.g., `scene.clearColor = new BABYLON.Color3(0.8, 0.8, 0.8)`).  
- **Sounds**:  
  - Wind and occasional bicycle bells.  
- **Narrative**:  
  - “Leaving home was scary, but the Netherlands became a new chapter in my life.”  

### **Biome 4: Volcanic Iceland (Exchange Program)**  
- **Visuals**:  
  - Black volcanic rock material for the sphere.  
  - Randomly spawned lava flows, geysers, and snow-capped mountains.  
- **Background Lighting**:  
  - Dark, moody light (e.g., `PointLight` with an orange tint for lava glow).  
- **Background Color**:  
  - Dark gray sky (e.g., `scene.clearColor = new BABYLON.Color3(0.2, 0.2, 0.2)`).  
- **Sounds**:  
  - Crackling lava and distant rumbling.  
- **Narrative**:  
  - “My exchange in Iceland was a time of adventure and self-discovery.”  

---

## **4. Additional Features**
- **Interactive Objects**:  
  - Add clickable objects in each biome that reveal more about your story (e.g., a tree in the grassland that, when clicked, shows a childhood memory).  
- **Soundtrack**:  
  - Use a dynamic soundtrack that changes with each biome to enhance the emotional tone.  
- **Progression**:  
  - Add a subtle indicator (e.g., a progress bar or timeline) to show how far the player has progressed through your life story.  

---

## **5. Final Touches**
- **Testing**:  
  - Test each biome transition to ensure smooth performance and no memory leaks.  
- **Optimization**:  
  - Use `SceneOptimizer` to improve performance, especially for mobile users.  
- **Deployment**:  
  - Host the game on your personal website using a platform like GitHub Pages or Netlify.  
