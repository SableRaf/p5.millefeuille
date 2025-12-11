import { LayerSystem } from "./p5.millefeuille.esm.d.ts";

//The createLayerSystem is created dynamically at runtime (in the global scope).  TypeScript didn't create a type for it in the d.ts
//We create one here, in the global scope, to match what will be available there at runtime.
declare global {
    function createLayerSystem(options?: object): LayerSystem;

    // TODO: also put the classes LayerSystem, Layer, etc,
    // into the global scope
}
