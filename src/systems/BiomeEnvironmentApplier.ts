import { Scene, HemisphericLight } from '@babylonjs/core';
import { BiomeData } from '../managers/BiomeManager';

export class BiomeEnvironmentApplier {
    constructor(private scene: Scene) {}

    public async apply(biome: BiomeData): Promise<void> {
        // Set sky color
        this.scene.clearColor = biome.skyColor;
        
        // Set fog
        this.scene.fogMode = Scene.FOGMODE_EXP2;
        this.scene.fogColor = biome.fogColor;
        this.scene.fogDensity = biome.fogDensity;
        
        // Update lights
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
}