import type {ServiceSnapshot} from '../../domain/service';
import type {Result} from '../../domain/result';
import {inspectTransfer} from './transfer-schema';
export function encodeTransfer(snapshot:ServiceSnapshot):Result<Blob>{const verified=inspectTransfer({format:'church-service',version:1,snapshot});return verified.ok?{ok:true,value:new Blob([JSON.stringify(verified.value)],{type:'application/json'})}:verified;}
export function createExportService(build:(id:string)=>Promise<Result<ServiceSnapshot>>){return {async exportServiceMetadata(serviceId:string):Promise<Result<Blob>>{const result=await build(serviceId);return result.ok?encodeTransfer(result.value):result;}};}
