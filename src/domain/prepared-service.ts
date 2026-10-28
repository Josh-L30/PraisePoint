import type {ServiceSnapshot} from './service';
export type PreparedManifest={schemaVersion:1;packageId:string;profileId:string;workspaceId:string;rendererVersion:1;appBuild:string;sourceRevision:string;preparedAt:string;assetIds:string[];snapshot:ServiceSnapshot};
export type Readiness={state:'missing'|'stale'|'preparing'|'failed';issues:string[]}|{state:'ready';packageId:string;verifiedAt:string};
export type PreparedRecord={profileId:string;packageId:string;serviceId:string;manifest:PreparedManifest;manifestHash:string;contentStamp:string;cloudStale?:boolean;checkedAt?:string};
export type PreparedAsset={profileId:string;key:string;blob:Blob;refCount:number};
