import { UECommand } from '../types';

export const applyMIndustrialConcrete = async (host: string, port: number) => {
    try {
        const materialId = 'M_Industrial_Concrete';
        const materialPath = `/Game/Materials/Instances/${materialId}.${materialId}`;
        
        // 1. Obter atores selecionados
        const getSelectedRes = await fetch(`http://${host}:${port}/remote/object/call`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                objectPath: '/Script/UnrealEd.Default__EditorLevelLibrary',
                functionName: 'GetSelectedLevelActors'
            })
        });

        if (!getSelectedRes.ok) {
            throw new Error('Falha ao recuperar atores selecionados via EditorLevelLibrary.');
        }

        const data = await getSelectedRes.json();
        const selectedActors = data.ReturnValue || [];

        if (selectedActors.length === 0) {
            console.log('Nenhum ator selecionado detectado na cena atual.');
            return;
        }

        // 2. Aplicar material aos atores selecionados
        const applyCommands: UECommand[] = [];
        selectedActors.forEach((actor: any) => {
            const actorPath = typeof actor === 'string' ? actor : (actor.ObjectPath || actor.Path || actor);
            
            applyCommands.push({
                endpoint: '/remote/object/call',
                method: 'PUT',
                body: {
                    objectPath: `${actorPath}.StaticMeshComponent0`,
                    functionName: 'SetMaterial',
                    parameters: {
                        ElementIndex: 0,
                        Material: materialPath
                    }
                }
            });
            applyCommands.push({
                endpoint: '/remote/object/call',
                method: 'PUT',
                body: {
                    objectPath: `${actorPath}.StaticMeshComponent`,
                    functionName: 'SetMaterial',
                    parameters: {
                        ElementIndex: 0,
                        Material: materialPath
                    }
                }
            });
        });

        for (const cmd of applyCommands) {
            await fetch(`http://${host}:${port}${cmd.endpoint}`, {
                method: cmd.method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cmd.body)
            });
        }

        console.log(`Material ${materialId} aplicado aos atores selecionados com sucesso.`);
    } catch (error: any) {
        console.error('UNCAUGHT_EXCEPTION in applyMIndustrialConcrete:', error.message || String(error));
    }
};
