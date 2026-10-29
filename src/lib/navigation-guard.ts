type AccountChangeEvent=CustomEvent<{decisions:Promise<boolean>[]} >;
export function deferAccountChange(event:Event,decision:Promise<boolean>){
 const detail=(event as AccountChangeEvent).detail;
 if(detail?.decisions)detail.decisions.push(decision);else event.preventDefault();
}
export async function mayChangeAccount(){
 const event=new CustomEvent('gather-before-account-change',{cancelable:true,detail:{decisions:[] as Promise<boolean>[]}});
 if(!window.dispatchEvent(event))return false;
 return (await Promise.all(event.detail.decisions)).every(Boolean);
}
