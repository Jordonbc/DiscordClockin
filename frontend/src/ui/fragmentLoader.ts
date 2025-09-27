async function replaceWithFragment(target: HTMLElement, markup: string): Promise<void> {
  const template = document.createElement("template");
  template.innerHTML = markup.trim();
  const nodes = Array.from(template.content.childNodes);

  if (nodes.length === 0) {
    target.remove();
    return;
  }

  target.replaceWith(...nodes);
}

export async function loadInterfaceFragments(): Promise<void> {
  let fragmentHost = document.querySelector<HTMLElement>("[data-fragment]");

  while (fragmentHost) {
    const fragmentPath = fragmentHost.dataset.fragment;

    if (!fragmentPath) {
      fragmentHost.removeAttribute("data-fragment");
      fragmentHost = document.querySelector<HTMLElement>("[data-fragment]");
      continue;
    }

    try {
      const response = await fetch(fragmentPath);

      if (!response.ok) {
        throw new Error(`Failed to load fragment: ${fragmentPath}`);
      }

      const markup = await response.text();
      await replaceWithFragment(fragmentHost, markup);
    } catch (error) {
      console.error(error);
      fragmentHost.removeAttribute("data-fragment");
    }

    fragmentHost = document.querySelector<HTMLElement>("[data-fragment]");
  }
}
