import { BiomeData } from './BiomeManager';
import { BiomeManager } from './BiomeManager';

export class BiomeDataManager {
    private biomes: BiomeData[] = [];
    private currentIndex = 0;

    constructor() {
        this.initializeBiomes();
    }

    private initializeBiomes(): void {
        this.biomes = BiomeManager.getBiomes();
    }

    public setBiomes(biomes: BiomeData[]): void {
        this.biomes = biomes;
    }

    public getCurrentBiome(): BiomeData {
        return this.biomes[this.currentIndex];
    }

    public getNextBiome(): BiomeData {
        const nextIndex = (this.currentIndex + 1) % this.biomes.length;
        return this.biomes[nextIndex];
    }

    public advanceToNext(): BiomeData {
        this.currentIndex = (this.currentIndex + 1) % this.biomes.length;
        return this.getCurrentBiome();
    }

    public getCurrentIndex(): number {
        return this.currentIndex;
    }

    public getBiomeCount(): number {
        return this.biomes.length;
    }
}