import axios from 'axios';
import logger from '../lib/logger';
import { UEConnection } from '../types';

/**
 * Service: UEMaterialManager
 * Responsabilidade: Interagir via Remote Control API com a Unreal Engine 
 * para criação e modificação dinâmica de Material Instances em tempo de execução.
 */
export class UEMaterialManager {
  private ueUrl: string;

  constructor(connection: UEConnection) {
    // A porta padrão do Remote Control API é 30010
    this.ueUrl = `${connection.url}:${connection.port}`;
  }

  /**
   * Modifica os parâmetros escalares e vetoriais de um Material Instance existente.
   * 
   * @param objectPath Caminho completo do Material Instance (ex: '/Game/Materials/MI_Dynamic.MI_Dynamic')
   * @param parameters Objeto contendo os parâmetros a serem alterados:
   *  - BaseColor: RGBA (VectorParameter value)
   *  - Metallic: float (ScalarParameter value)
   *  - Roughness: float (ScalarParameter value)
   *  - Emissive: RGBA (VectorParameter value)
   *  - TexturePaths: Mapeamento de nome do parâmetro de textura -> caminho do asset
   */
  public async modifyMaterialInstance(
    objectPath: string,
    parameters: {
      BaseColor?: { r: number, g: number, b: number, a: number },
      Metallic?: number,
      Roughness?: number,
      Emissive?: { r: number, g: number, b: number, a: number },
      TexturePaths?: Record<string, string>
    }
  ): Promise<boolean> {
    try {
      // Modifica Vector Parameters (BaseColor, Emissive) e Scalar Parameters (Metallic, Roughness)
      const requests = [];

      if (parameters.BaseColor) {
        requests.push(this.setVectorParameter(objectPath, 'BaseColor', parameters.BaseColor));
      }
      if (parameters.Emissive) {
        requests.push(this.setVectorParameter(objectPath, 'EmissiveColor', parameters.Emissive));
      }
      if (parameters.Metallic !== undefined) {
        requests.push(this.setScalarParameter(objectPath, 'Metallic', parameters.Metallic));
      }
      if (parameters.Roughness !== undefined) {
        requests.push(this.setScalarParameter(objectPath, 'Roughness', parameters.Roughness));
      }

      // Modifica Texture Parameters
      if (parameters.TexturePaths) {
        for (const [paramName, texturePath] of Object.entries(parameters.TexturePaths)) {
          requests.push(this.setTextureParameter(objectPath, paramName, texturePath));
        }
      }

      await Promise.all(requests);
      return true;
    } catch (error: any) {
      logger.error(`[MATERIAL_MANAGER_FAULT]: Falha ao modificar material ${objectPath}.`, { error: error.message });
      throw error;
    }
  }

  private async setScalarParameter(targetObj: string, paramName: string, value: number) {
    return axios.put(`${this.ueUrl}/remote/object/property`, {
      objectPath: targetObj,
      propertyName: "ScalarParameterValues", // Assumindo alteração direta na propriedade, ou chamada de função no Asset
      // O Remote Control API permite chamar funções Blueprint expostas.
      // Se houver uma função SetScalarParameterValue exposta em um Blueprint remoto:
    }).catch(err => {
        // Fallback para chamada de função nativa de MaterialInstanceDynamic
        return axios.post(`${this.ueUrl}/remote/object/call`, {
            objectPath: targetObj,
            functionName: "SetScalarParameterValue",
            parameters: {
                ParameterName: paramName,
                Value: value
            }
        });
    });
  }

  private async setVectorParameter(targetObj: string, paramName: string, value: {r: number, g: number, b: number, a: number}) {
    return axios.post(`${this.ueUrl}/remote/object/call`, {
      objectPath: targetObj,
      functionName: "SetVectorParameterValue",
      parameters: {
        ParameterName: paramName,
        Value: {
           R: value.r,
           G: value.g,
           B: value.b,
           A: value.a
        }
      }
    });
  }

  private async setTextureParameter(targetObj: string, paramName: string, texturePath: string) {
    // Carrega o Asset da textura antes de aplica-lo
    return axios.post(`${this.ueUrl}/remote/object/call`, {
      objectPath: targetObj,
      functionName: "SetTextureParameterValue",
      parameters: {
        ParameterName: paramName,
        Value: texturePath
      }
    });
  }

  /**
   * Cria uma nova Material Instance Dynamic (MID) a partir de um material pai e a aplica em um ator.
   */
  public async createAndApplyDynamicMaterial(
    actorPath: string, 
    parentMaterialPath: string,
    meshComponentName: string = "StaticMeshComponent0"
  ): Promise<any> {
    try {
      // Chama Blueprint function que cria o MID e aplica no Mesh component.
      // A engine deve expor uma função global (BFL) ou podemos invocar CreateDynamicMaterialInstance no PrimitiveComponent
      const result = await axios.post(`${this.ueUrl}/remote/object/call`, {
        objectPath: `${actorPath}.${meshComponentName}`,
        functionName: "CreateDynamicMaterialInstance",
        parameters: {
          ElementIndex: 0,
          SourceMaterial: parentMaterialPath
        }
      });
      return result.data;
    } catch (error: any) {
      logger.error(`[MATERIAL_MANAGER_FAULT]: Falha ao instanciar material dinâmico em ${actorPath}.`, { error: error.message });
      throw error;
    }
  }
}
