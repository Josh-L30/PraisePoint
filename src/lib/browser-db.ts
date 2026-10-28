import type {PreparedRecord,PreparedAsset} from '../domain/prepared-service';
import {openDB,type DBSchema} from 'idb';
import type {MediaDescriptor} from '../domain/media';
export type DeviceSession={profileId:string;signedOut:boolean};
export type StoredMedia={profileId:string;descriptor:MediaDescriptor;blob:Blob};
interface BrowserDatabase extends DBSchema {
 preparedServices:{key:[string,string];value:PreparedRecord;indexes:{'by-profile':string;'by-service':[string,string]}};
 preparedAssets:{key:[string,string];value:PreparedAsset;indexes:{'by-profile':string}};
 meta:{key:string;value:DeviceSession};
 mediaFiles:{key:[string,string];value:StoredMedia;indexes:{'by-profile':string;'by-workspace':[string,string]}};
}
export function openBrowserDB(){
 return openDB<BrowserDatabase>('gather-device',3,{upgrade(database,oldVersion){
  if(oldVersion<1)database.createObjectStore('meta');
  if(oldVersion<2){const store=database.createObjectStore('mediaFiles',{keyPath:['profileId','descriptor.id']});store.createIndex('by-profile','profileId');store.createIndex('by-workspace',['profileId','descriptor.workspaceId']);}
  if(oldVersion<3){const packages=database.createObjectStore('preparedServices',{keyPath:['profileId','packageId']});packages.createIndex('by-profile','profileId');packages.createIndex('by-service',['profileId','serviceId'],{unique:true});const assets=database.createObjectStore('preparedAssets',{keyPath:['profileId','key']});assets.createIndex('by-profile','profileId');}
 }});
}
