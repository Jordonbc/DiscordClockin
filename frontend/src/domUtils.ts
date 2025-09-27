export function query<T extends Element = HTMLElement>(selector: string): T | null {
  return document.querySelector(selector) as T | null;
}

export function queryAll<T extends Element = HTMLElement>(selector: string): T[] {
  return Array.from(document.querySelectorAll(selector) as NodeListOf<T>);
}
