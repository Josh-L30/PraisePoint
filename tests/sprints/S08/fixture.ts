import {createTemplate} from '../../../src/features/decks/templates';
import {preparedAssetKey} from '../../../src/features/offline/prepared-store';
import {hashMedia} from '../../../src/features/media/local-media-store';
import type {PreparedManifest} from '../../../src/domain/prepared-service';
export const profile='a8000000-0000-4000-8000-000000000001';
export async function fixture(serviceId:string=crypto.randomUUID()){
 const blob=new Blob([new Uint8Array([1,2,3])],{type:'image/png'}),asset={id:crypto.randomUUID(),workspaceId:crypto.randomUUID(),kind:'image' as const,location:'cloud' as const,mime:'image/png',bytes:3,sha256:await hashMedia(blob),revision:1,originalName:'Synthetic bytes.png'};
 const slide=createTemplate('lyrics');slide.background={kind:'image',mediaId:asset.id};
 const snapshot={schemaVersion:1 as const,serviceId,workspaceId:asset.workspaceId,sourceRevision:'a'.repeat(64),title:'Sunday',slides:[slide],media:[asset],sections:[{id:crypto.randomUUID(),deckId:crypto.randomUUID(),label:'Worship',startIndex:0,slideCount:1,sourceSongId:null}]};
 const manifest:PreparedManifest={schemaVersion:1,packageId:crypto.randomUUID(),profileId:profile,workspaceId:asset.workspaceId,rendererVersion:1,appBuild:'test-build',sourceRevision:snapshot.sourceRevision,preparedAt:new Date().toISOString(),assetIds:[asset.id],snapshot};
 return {manifest,blob,files:new Map([[preparedAssetKey(asset),blob]])};
}
