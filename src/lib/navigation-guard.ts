export function mayChangeAccount() { return window.dispatchEvent(new Event('gather-before-account-change',{ cancelable: true })); }
