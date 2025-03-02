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
        
        // Make sure we have a valid camera before setting up the horizon effect
        if (scene.activeCamera) {
            this.setupHorizonEffect(scene);
            
            // Ensure the effect is attached to the camera and enabled
            if (this.horizonBlurEffect) {
                this.horizonBlurEffect.onSizeChangedObservable.add(() => {
                    if (this.horizonBlurEffect) {
                        const effect = this.horizonBlurEffect.getEffect();
                        // Add additional null check before accessing effect methods
                        if (effect && effect.setFloat2) {
                            try {
                                effect.setFloat2("screenSize", 
                                    scene.getEngine().getRenderWidth(), 
                                    scene.getEngine().getRenderHeight());
                            } catch (error) {
                                console.warn("Error updating screen size:", error);
                            }
                        }
                    }
                });
            }
            
            // Add a render observer to update effect parameters each frame with improved error handling
            scene.onBeforeRenderObservable.add(() => {
                if (!this.horizonBlurEffect || !this.horizonBlurEffect.getEffect()) return;

                const planet = scene.getMeshByName("planet");
                if (!planet || !scene.activeCamera) return;

                try {
                    const worldMatrix = planet.getWorldMatrix();
                    const viewProjection = scene.getTransformMatrix();
                    const worldViewProjection = worldMatrix.multiply(viewProjection);
                    
                    const effect = this.horizonBlurEffect.getEffect();
                    if (!effect || !effect.setMatrix || !effect.setVector3 || !effect.setFloat) return;

                    effect.setMatrix("worldViewProjection", worldViewProjection);
                    effect.setVector3("planetCenter", planet.position);
                    
                    // Update radius parameter for dynamic effect
                    const distanceToCamera = Vector3.Distance(planet.position, scene.activeCamera.position);
                    const dynamicRadius = Math.max(1.0, Math.min(3.0, distanceToCamera / 10));
                    effect.setFloat("radius", dynamicRadius);
                } catch (error) {
                    console.warn("Error updating horizon blur effect:", error);
                }
            });

        } else {
            console.warn("No active camera found. Horizon effect will not be applied.");
        }
        
        // Apply the initial biome (grass) environment immediately
        this.applyBiomeEnvironment(0);
        
        // Play the initial biome sound
        this.playBiomeSound(this.biomes[0].soundPath);
        
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
                "./sound/summer_sounds.mp3"
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
                "./sound/city.mp3"
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
        // Check if scene and camera are available
        if (!scene || !scene.activeCamera) {
            console.warn("Cannot setup horizon effect: Scene or active camera is not available");
            return;
        }

        try {
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
                    vec4 baseColor = texture2D(textureSampler, vUV);
                    
                    // Calculate normalized screen coordinates
                    vec2 normalizedCoords = (vUV - 0.5) * 2.0;
                    
                    // Calculate distance from center of screen
                    float distFromCenter = length(normalizedCoords);
                    
                    // Create a radial gradient for the horizon
                    float horizonRadius = 0.1; // Adjust this to control where the horizon blur starts
                    float horizonWidth = 0.1; // Adjust this to control how wide the blur transition is
                    
                    // Calculate blur strength based on distance from horizon circle
                    float horizonStrength = smoothstep(
                        horizonRadius - horizonWidth,
                        horizonRadius + horizonWidth,
                        distFromCenter
                    );
                    
                    // Add vertical bias to make the blur stronger towards the bottom
                    float verticalBias = smoothstep(0.0, 1.0, vUV.y);
                    horizonStrength = mix(horizonStrength, horizonStrength * verticalBias, 0.7);
                    
                    // Apply radial blur with increased samples and radius
                    vec4 blurredColor = vec4(0.0);
                    float totalWeight = 0.0;
                    int samples = 64; // Increased sample count for smoother blur
                    float blurRadius = radius * 0.4; // Increased base blur radius
                    
                    for(int i = 0; i < samples; i++) {
                        float angle = float(i) * (3.14159 * 2.0 / float(samples));
                        // Create a spiral pattern for more natural blur
                        float r = float(i) / float(samples);
                        vec2 offset = vec2(
                            cos(angle) * r,
                            sin(angle) * r
                        ) * blurRadius * horizonStrength;
                        
                        vec2 sampleUV = vUV + offset;
                        // Add weight falloff based on distance
                        float weight = 1.0 - length(offset) / blurRadius;
                        weight = max(0.0, weight * weight); // Square for smoother falloff
                        
                        blurredColor += texture2D(textureSampler, sampleUV) * weight;
                        totalWeight += weight;
                    }
                    
                    blurredColor = blurredColor / totalWeight;
                    
                    // Enhanced blend between original and blurred color
                    float finalBlendStrength = horizonStrength * 0.8; // Adjust blend strength
                    gl_FragColor = mix(baseColor, blurredColor, finalBlendStrength);
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
            
            // Only set onApply if the effect was created successfully
            if (this.horizonBlurEffect) {
                this.horizonBlurEffect.onApply = (effect) => {
                    if (!effect) return;
                    
                    try {
                        effect.setFloat("radius", 4.0);  // Significantly increased blur radius for more pronounced effect
                        
                        // Safely get render dimensions
                        const engine = scene.getEngine();
                        if (engine) {
                            effect.setFloat2("screenSize", engine.getRenderWidth(), engine.getRenderHeight());
                        }
                        
                        effect.setFloat("planetRadius", 8.0);  // Matches the planet's actual diameter
                        
                        // Get planet's world position and transform to screen space
                        const planet = scene.getMeshByName("planet");
                        if (planet && scene.activeCamera) {
                            const worldMatrix = planet.getWorldMatrix();
                            const viewProjection = scene.getTransformMatrix();
                            const worldViewProjection = worldMatrix.multiply(viewProjection);
                            effect.setMatrix("worldViewProjection", worldViewProjection);
                            effect.setVector3("planetCenter", planet.position);
                        }
                    } catch (error) {
                        console.warn("Error in horizon blur effect onApply:", error);
                    }
                };
            }
        } catch (error) {
            console.error("Failed to setup horizon blur effect:", error);
            // Make sure to set the effect to null if creation failed
            this.horizonBlurEffect = null;
        }
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