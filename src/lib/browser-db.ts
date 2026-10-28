import {openDB,type DBSchema} from 'idb';
import type {MediaDescriptor} from '../domain/media';
export type DeviceSession={profileId:string;signedOut:boolean};
export type StoredMedia={profileId:string;descriptor:MediaDescriptor;blob:Blob};
interface BrowserDatabase extends DBSchema {
 meta:{key:string;value:DeviceSession};
 mediaFiles:{key:[string,string];value:StoredMedia;indexes:{'by-profile':string;'by-workspace':[string,string]}};
}
export function openBrowserDB(){
 return openDB<BrowserDatabase>('gather-device',2,{upgrade(database,oldVersion){
  if(oldVersion<1)database.createObjectStore('meta');
  if(oldVersion<2){const store=database.createObjectStore('mediaFiles',{keyPath:['profileId','descriptor.id']});store.createIndex('by-profile','profileId');store.createIndex('by-workspace',['profileId','descriptor.workspaceId']);}
 }});
}
