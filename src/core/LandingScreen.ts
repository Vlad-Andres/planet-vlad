import {
    AdvancedDynamicTexture,
    Container,
    TextBlock,
    Button,
    Control,
} from "@babylonjs/gui";

import {
    Scene,
    BlurPostProcess,
    Texture,
    Vector2
} from "@babylonjs/core";

export class LandingScreen {
    private static texture: AdvancedDynamicTexture;
    private static container: Container;
    
    static initialize(scene: Scene): void {
        // Create fullscreen UI
        this.texture = AdvancedDynamicTexture.CreateFullscreenUI("landingUI");
        
        // Create container
        this.container = new Container("landingContainer");
        this.container.width = 1;
        this.container.height = 1;
        this.container.background = "rgba(0, 0, 0, 0.7)";
        this.texture.addControl(this.container);
        
        // Add title
        const title = new TextBlock("title");
        title.text = "My Life Journey";
        title.color = "white";
        title.fontSize = 48;
        title.height = "100px";
        title.top = "-200px";
        this.container.addControl(title);
        
        // Add description
        const description = new TextBlock("description");
        description.text = "Explore the journey of my life through changing biomes";
        description.color = "white";
        description.fontSize = 24;
        description.height = "100px";
        description.top = "-100px";
        this.container.addControl(description);
        
        // Add instructions
        const instructions = new TextBlock("instructions");
        instructions.text = "Use WASD to move. Press E to change biomes.\nPress Start to begin.";
        instructions.color = "white";
        instructions.fontSize = 18;
        instructions.height = "100px";
        instructions.top = "0px";
        this.container.addControl(instructions);
        
        // Add start button
        const startButton = Button.CreateSimpleButton("startButton", "Start");
        startButton.width = 0.2;
        startButton.height = "40px";
        startButton.color = "white";
        startButton.background = "green";
        startButton.top = "100px";
        startButton.onPointerClickObservable.add(() => {
            this.hide();
        });
        this.container.addControl(startButton);
        
        // Blur the scene initially
const blurPostProcess = new BlurPostProcess(
    "blur",     // name of the post-process
    new Vector2(4, 4),          // blur kernel size
    2,
    0.25,        // ratio (1 = full resolution, 0.5 = half resolution)
    null, // camera to attach to
    Texture.BILINEAR_SAMPLINGMODE,
    scene.getEngine()
);
        scene.activeCamera!.attachPostProcess(blurPostProcess);
        
        // Remove blur when starting
        startButton.onPointerClickObservable.add(() => {
            scene.activeCamera!.detachPostProcess(blurPostProcess);
        });
    }
    
    static hide(): void {
        this.texture.dispose();
    }
}