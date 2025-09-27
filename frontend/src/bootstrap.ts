import "../config";
import { loadInterfaceFragments } from "./ui/fragmentLoader";

async function bootstrap(): Promise<void> {
  await loadInterfaceFragments();

  const mainModule = await import("./main");
  if (typeof mainModule.initialize === "function") {
    mainModule.initialize();
  } else {
    console.error("Failed to bootstrap application: initialize function missing.");
  }
}

void bootstrap();
