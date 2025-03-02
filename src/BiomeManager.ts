// src/BiomeManager.ts
import {
    Scene,
    Color3,
    Color4,
    HemisphericLight,
    DirectionalLight,
    Vector3,
    Sound,
    PostProcess,
    Effect,
    Engine
} from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Container, Control } from '@babylonjs/gui';
import { Materials } from './Materials';
import { PlanetTransition } from './PlanetTransition';

export class BiomeData {
    constructor(
        public readonly name: string,
        public readonly materialIndex: number,
        public readonly skyColor: Color4,
        public readonly fogColor: Color3,
        public readonly fogDensity: number,
        public readonly lightSettings: LightSettings,
        public readonly narrative: string,
        public readonly soundPath: string = ""
    ) {}
}

export interface LightSettings {
    topLight: {
        intensity: number;
        diffuse: Color3;
        groundColor: Color3;
    };
    ambientLight: {
        intensity: number;
        diffuse: Color3;
        groundColor: Color3;
    };
}

export class BiomeManager {
    private static biomes: BiomeData[] = [];
    private static currentBiomeIndex: number = 0;
    private static narrativeUI: AdvancedDynamicTexture | null = null;
    private static biomeSound: Sound | null = null;
    private static scene: Scene | null = null;
    private static initialized: boolean = false;
    private static horizonBlurEffect: PostProcess | null = null;

    public static initialize(scene: Scene): void {
        if (this.initialized) return;
        
        this.scene = scene;
        this.setupBiomes();
        this.setupHorizonEffect(scene);
        
        // Apply the initial biome (grass) environment immediately
        this.applyBiomeEnvironment(0);
        
        // Set the material index to match the grass biome (index 0)
        Materials.changeActiveMaterial(0);
        
        this.initialized = true;
    }

    private static setupBiomes(): void {
        // Define biomes in the order: grass → brick → stone → repeat
        this.biomes = [
            // Biome 1: Grassland (Material index 1 for grass)
            new BiomeData(
                "Childhood in Moldova",
                0, // Material index for grass
                new Color4(0.6, 0.8, 1, 1), // Light blue sky
                new Color3(0.5, 0.7, 0.3), // Light green fog
                0.001, // Light fog density
                {
                    topLight: {
                        intensity: 0.9,
                        diffuse: new Color3(1, 0.9, 0.7), // Warm sunlight
                        groundColor: new Color3(0.5, 0.8, 0.5) // Green ground reflection
                    },
                    ambientLight: {
                        intensity: 0.5,
                        diffuse: new Color3(0.9, 0.9, 0.7), // Warm ambient
                        groundColor: new Color3(0.4, 0.6, 0.3) // Green tint
                    }
                },
                "This is where it all began—my childhood in Moldova, surrounded by nature and simplicity.",
                "sounds/nature_ambience.mp3"
            ),
            
            // Biome 2: Brick (Material index 2 for brick)
            new BiomeData(
                "Moving to the Big City",
                1, // Material index for brick
                new Color4(0.8, 0.6, 0.5, 1), // Warm brick-colored sky
                new Color3(0.6, 0.4, 0.3), // Brick-colored fog
                0.002, // Light fog density
                {
                    topLight: {
                        intensity: 0.8,
                        diffuse: new Color3(0.9, 0.7, 0.5), // Warm brick light
                        groundColor: new Color3(0.6, 0.4, 0.3) // Brick ground reflection
                    },
                    ambientLight: {
                        intensity: 0.5,
                        diffuse: new Color3(0.8, 0.6, 0.4), // Warm ambient
                        groundColor: new Color3(0.5, 0.3, 0.2) // Brick tint
                    }
                },
                "As I grew older, I moved to the city—a place of opportunities and challenges.",
                "sounds/city_ambience.mp3"
            ),
            
            // Biome 3: Stone (Material index 0 for stone)
            new BiomeData(
                "The Netherlands",
                2, // Material index for stone
                new Color4(0.5, 0.5, 0.6, 1), // Stone-colored sky
                new Color3(0.4, 0.4, 0.5), // Stone-colored fog
                0.002, // Light fog density
                {
                    topLight: {
                        intensity: 0.7,
                        diffuse: new Color3(0.7, 0.7, 0.8), // Cool stone light
                        groundColor: new Color3(0.4, 0.4, 0.5) // Stone ground reflection
                    },
                    ambientLight: {
                        intensity: 0.4,
                        diffuse: new Color3(0.6, 0.6, 0.7), // Cool ambient
                        groundColor: new Color3(0.3, 0.3, 0.4) // Stone tint
                    }
                },
               "Leaving home was scary, but the Netherlands became a new chapter in my life.",
                "sounds/wind_bicycles.mp3"
            ),

            // Biome 3: Stone (Material index 0 for stone)
            new BiomeData(
                "Iceland",
                3, // Material index for stone
                new Color4(0.1, 0.1, 0.2, 1), // Dark night sky
                new Color3(0.05, 0.05, 0.1), // Dark night fog
                0.003, // Slightly denser fog for night
                {
                    topLight: {
                        intensity: 0.1,
                        diffuse: new Color3(0.2, 0.2, 0.3), // Dim moonlight
                        groundColor: new Color3(0.05, 0.05, 0.1) // Dark ground reflection
                    },
                    ambientLight: {
                        intensity: 0.05,
                        diffuse: new Color3(0.1, 0.1, 0.15), // Very dim ambient
                        groundColor: new Color3(0.02, 0.02, 0.05) // Nearly black ground
                    }
                },
                "Great experience, university and a lot of - ... - lava.",
                "sounds/wind_bicycles.mp3"
            )
        ];
    }

    private static setupHorizonEffect(scene: Scene): void {
        // Create custom horizon blur shader effect
        Effect.ShadersStore["horizonBlurFragmentShader"] = `
            varying vec2 vUV;
            uniform sampler2D textureSampler;
            uniform float radius;
            uniform vec2 screenSize;
            uniform float planetRadius;
            uniform vec3 planetCenter;
            uniform mat4 worldViewProjection;
            
            void main(void) {
                vec4 color = texture2D(textureSampler, vUV);
                
                // Calculate distance from center (planet) as viewed from screen
                vec2 center = vec2(0.5, 0.5); // Assume planet center is middle of screen
                float dist = distance(vUV, center);
                
                // Apply blur based on distance from center (stronger at the horizon)
                float horizon = planetRadius * 0.9; // Adjust for where horizon appears
                float strength = smoothstep(horizon - 0.1, horizon + 0.1, dist);
                
                // Apply blur intensity near horizon
                float blurAmount = strength * radius;
                
                gl_FragColor = color * (1.0 - blurAmount * 0.5) + vec4(0.0, 0.0, 0.0, 0.0) * blurAmount;
            }
        `;
        
        // Create and apply the post-process
        this.horizonBlurEffect = new PostProcess(
            "HorizonBlur",
            "horizonBlur",
            ["radius", "screenSize", "planetRadius", "planetCenter", "worldViewProjection"],
            null,
            1.0,
            scene.activeCamera
        );
        
        this.horizonBlurEffect.onApply = (effect) => {
            effect.setFloat("radius", 0.25); // Blur intensity
            effect.setFloat2("screenSize", scene.getEngine().getRenderWidth(), scene.getEngine().getRenderHeight());
            effect.setFloat("planetRadius", 4.0); // Adjust based on your planet radius
            // Set planet center in screen space would require additional calculations in a real implementation
        };
    }

    public static startBiomeTransition(scene: Scene): void {
        if (!this.initialized) this.initialize(scene);
        
        // Get next biome index
        const nextBiomeIndex = (this.currentBiomeIndex + 1) % this.biomes.length;
        const nextBiome = this.biomes[nextBiomeIndex];
        
        // Start the vertex transition using your existing system
        PlanetTransition.start(scene);
        
        // This works because your PlanetTransition class will naturally call Materials.changeActiveMaterial()
        // when the transition is complete
        
        // Schedule applying the rest of the biome changes for when the transition completes
        // This requires adding an event or callback system to your PlanetTransition
        this.setupTransitionCallback(scene, nextBiomeIndex);
    }
    
    private static setupTransitionCallback(scene: Scene, nextBiomeIndex: number): void {

        // Transition is complete, apply the rest of the biome changes
        this.applyBiomeEnvironment(nextBiomeIndex);
        this.showBiomeNarrative(this.biomes[nextBiomeIndex].narrative);
        this.playBiomeSound(this.biomes[nextBiomeIndex].soundPath);

        // Check every frame if the transition is complete
        const observer = scene.onBeforeRenderObservable.add(() => {
            if (!PlanetTransition.transitionRunning && Materials.getActiveMaterialIndex() === this.biomes[nextBiomeIndex].materialIndex) {
                
                // Update current biome index
                this.currentBiomeIndex = nextBiomeIndex;
                
                // Remove observer after transition is complete
                scene.onBeforeRenderObservable.remove(observer);
            }
        });
    }
    
    private static applyBiomeEnvironment(biomeIndex: number): void {
        if (!this.scene) return;
        
        const biome = this.biomes[biomeIndex];
        
        // Set sky color
        this.scene.clearColor = biome.skyColor;
        
        // Set fog
        this.scene.fogMode = Scene.FOGMODE_EXP2;
        this.scene.fogColor = biome.fogColor;
        this.scene.fogDensity = biome.fogDensity;
        
        // Update lights (assuming you have the lights with these names already in the scene)
        const topLight = this.scene.getLightByName("topLight") as HemisphericLight;
        const ambientLight = this.scene.getLightByName("ambientLight") as HemisphericLight;
        
        if (topLight) {
            topLight.intensity = biome.lightSettings.topLight.intensity;
            topLight.diffuse = biome.lightSettings.topLight.diffuse;
            topLight.groundColor = biome.lightSettings.topLight.groundColor;
        }
        
        if (ambientLight) {
            ambientLight.intensity = biome.lightSettings.ambientLight.intensity;
            ambientLight.diffuse = biome.lightSettings.ambientLight.diffuse;
            ambientLight.groundColor = biome.lightSettings.ambientLight.groundColor;
        }
    }
    
    private static showBiomeNarrative(narrative: string): void {
        if (!this.scene) return;
        
        // Clean up previous UI if exists
        if (this.narrativeUI) {
            this.narrativeUI.dispose();
        }
        
        // Create fullscreen UI
        this.narrativeUI = AdvancedDynamicTexture.CreateFullscreenUI("BiomeNarrativeUI", true, this.scene);
        
        // Create container for text
        const container = new Container("narrativeContainer");
        container.width = 0.8;
        container.height = "100px";
        container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        container.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        container.top = "-50px";
        container.zIndex = 10;
        container.background = "rgba(0, 0, 0, 0.5)";
        this.narrativeUI.addControl(container);
        
        // Create text block
        const textBlock = new TextBlock("narrativeText");
        textBlock.text = narrative;
        textBlock.color = "white";
        textBlock.fontSize = 18;
        textBlock.textWrapping = true;
        textBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        textBlock.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        container.addControl(textBlock);
        
        // Fade out narrative after a few seconds
        setTimeout(() => {
            if (this.narrativeUI) {
                this.narrativeUI.dispose();
                this.narrativeUI = null;
            }
        }, 6000);
    }
    
    private static playBiomeSound(soundPath: string): void {
        if (!this.scene || !soundPath) return;
        
        // Stop previous sound if playing
        if (this.biomeSound) {
            this.biomeSound.stop();
            this.biomeSound.dispose();
        }
        
        // Play new sound
        this.biomeSound = new Sound("biomeSound", soundPath, this.scene, null, {
            loop: true,
            autoplay: true,
            volume: 0.5
        });
    }
    
    public static getCurrentBiomeIndex(): number {
        return this.currentBiomeIndex;
    }
    
    public static getBiomeCount(): number {
        return this.biomes.length;
    }
    
    public static dispose(): void {
        if (this.biomeSound) {
            this.biomeSound.stop();
            this.biomeSound.dispose();
        }
        
        if (this.narrativeUI) {
            this.narrativeUI.dispose();
        }
        
        if (this.horizonBlurEffect) {
            this.horizonBlurEffect.dispose();
        }
        
        this.initialized = false;
    }
}