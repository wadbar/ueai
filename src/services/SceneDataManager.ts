import { Actor, StreamingAsset, SceneState } from '../types';
import logger from '../lib/logger';

/**
 * Service: SceneDataManager
 * Architecture: Optimized Data Processor
 * Pattern: High-Performance Data Transformation (Independent Service)
 * 
 * Responsabilidade: Transformar dados brutos do UE em estados de cena otimizados.
 */
export class SceneDataManager {
  private static instance: SceneDataManager;
  
  private constructor() {}

  public static getInstance(): SceneDataManager {
    if (!SceneDataManager.instance) {
      SceneDataManager.instance = new SceneDataManager();
    }
    return SceneDataManager.instance;
  }

  /**
   * Processamento de cena: Filtra e otimiza estado.
   */
  public processSceneState(actors: Actor[], assets: StreamingAsset[]): SceneState {
    try {
      const validatedActors = actors.map(actor => ({
        ...actor,
        components: actor.components || [],
        materials: actor.materials || [],
        transform: actor.transform || { 
            location: { x: 0, y: 0, z: 0 }, 
            rotation: { r: 0, p: 0, y: 0 }, 
            scale: { x: 1, y: 1, z: 1 } 
        }
      })).filter(a => a && a.id);
      
      const validatedAssets = assets.filter(a => a && a.id);

      return {
        actors: validatedActors,
        assets: validatedAssets,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('[SCENE_PROCESSING_EXCEPTION]', { error });
      throw new Error('Falha crítica no processamento do estado da cena.');
    }
  }

  /**
   * Validação de integridade de transformações UE
   */
  public validateTransform(transform: any): boolean {
    return transform && 
           typeof transform.location?.x === 'number' &&
           typeof transform.rotation?.r === 'number' &&
           typeof transform.scale?.x === 'number';
  }
}
