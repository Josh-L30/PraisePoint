import type {MediaDescriptor} from '../../domain/media';
import type {PreparedManifest} from '../../domain/prepared-service';
import type {ServiceSnapshot} from '../../domain/service';
import {failure,type Result} from '../../domain/result';
import {readDeviceSession} from '../../lib/device-session';
import {hashMedia} from '../media/local-media-store';
import {decodeMedia,type DecodedMedia} from '../media/decode-media';
import {validateServiceSnapshot} from '../services/snapshot-validation';
import {currentContentStamp} from './content-changes';
import {preparedAssetKey,promotePrepared} from './prepared-store';
import {verifyPresentationFont} from './readiness';
import {acquireRuntimeActivity,verifyAppShell} from './runtime-client';
export type PreparationDependencies={snapshot(id:string):Promise<Result<ServiceSnapshot>>;media(asset:MediaDescriptor):Promise<Result<Blob>>;decode?(file:File):Promise<Result<Pick<DecodedMedia,'kind'|'mime'>>>;shell?():Promise<Result<{appBuild:string}>>;font?():Promise<Result<void>>;acquire?():Promise<Result<()=>void>>};
export function createPreparationService(profileId:string,dependencies:PreparationDependencies){
 return {async prepareService(serviceId:string,expectedRevision?:string,progress?:(message:string)=>void):Promise<Result<PreparedManifest>>{
  const lease=await (dependencies.acquire??(()=>acquireRuntimeActivity('prepare')))();if(!lease.ok)return lease;
  try{
   const marker=await readDeviceSession();if(marker?.profileId!==profileId || marker.signedOut)return failure('FORBIDDEN','The device profile changed or signed out.');
   const stamp=currentContentStamp(profileId);progress?.('Checking the app and presentation font…');const shell=await (dependencies.shell??verifyAppShell)();if(!shell.ok)return shell;const font=await (dependencies.font??verifyPresentationFont)();if(!font.ok)return font;
   const source=await dependencies.snapshot(serviceId);if(!source.ok)return source;const parsed=validateServiceSnapshot(source.value,serviceId);if(!parsed.ok)return parsed;const snapshot=parsed.value;
   if(expectedRevision && snapshot.sourceRevision!==expectedRevision)return failure('CONFLICT','The saved service changed. Review it again before preparing.');
   const files=new Map<string,Blob>();let completed=0;
   for(const asset of snapshot.media){progress?.('Verifying file '+(++completed)+' of '+snapshot.media.length+'…');const result=await dependencies.media(asset);if(!result.ok)return result;const blob=result.value;
    if(blob.size!==asset.bytes || blob.type!==asset.mime || await hashMedia(blob)!==asset.sha256)return failure('VALIDATION','A required file is incomplete or differs from the service snapshot.');
    const decoded=await (dependencies.decode??decodeMedia)(new File([blob],asset.originalName,{type:asset.mime}));if(!decoded.ok)return decoded;if(decoded.value.kind!==asset.kind || decoded.value.mime!==asset.mime)return failure('VALIDATION','A decoded file has a different media type.');files.set(preparedAssetKey(asset),blob);
   }
   const latest=await dependencies.snapshot(serviceId);if(!latest.ok)return latest;if(latest.value.sourceRevision!==snapshot.sourceRevision)return failure('CONFLICT','The saved service changed during preparation. The previous complete copy is retained.');
   const manifest:PreparedManifest={schemaVersion:1,packageId:crypto.randomUUID(),profileId,workspaceId:snapshot.workspaceId,rendererVersion:1,appBuild:shell.value.appBuild,sourceRevision:snapshot.sourceRevision,preparedAt:new Date().toISOString(),assetIds:snapshot.media.map(asset=>asset.id),snapshot};
   progress?.('Saving the complete service…');return await promotePrepared(manifest,files,stamp);
  }catch{return failure('STORAGE_UNAVAILABLE','Preparation could not finish. Keep original files, free device space and retry. Your previous complete copy is retained.');}
  finally{lease.value();}
 }};
}
