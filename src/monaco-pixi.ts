/**
 * Configuración de Monaco Editor para PixiJS v8 y TypeScript.
 */

export function configureMonaco(monaco: any): void {
  // 1. Configurar opciones del compilador de TypeScript y JavaScript en Monaco
  const compilerOptions = {
    target: monaco.languages.typescript.ScriptTarget.ES2022,
    allowNonTextExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    noEmit: false,
    esModuleInterop: true,
    allowJs: true,
    isolatedModules: true,
    skipLibCheck: true,
  };

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);

  // 2. Configurar diagnósticos y validación en tiempo real (subrayados de error)
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });

  // 3. Declaraciones de tipos para PixiJS v8 en el editor
  const pixiTypeDeclarations = `
    declare module 'pixi.js' {
      export class Application {
        canvas: HTMLCanvasElement;
        renderer: any;
        stage: Container;
        screen: { width: number; height: number };
        ticker: Ticker;
        init(options?: {
          width?: number;
          height?: number;
          background?: string | number;
          backgroundColor?: string | number;
          resizeTo?: Window | HTMLElement;
          antialias?: boolean;
          autoDensity?: boolean;
          resolution?: number;
          preference?: 'webgl' | 'webgpu';
        }): Promise<void>;
        render(): void;
        destroy(rendererDestroyOptions?: boolean | object, options?: boolean | object): void;
      }

      export class Container {
        x: number;
        y: number;
        width: number;
        height: number;
        rotation: number;
        alpha: number;
        visible: boolean;
        pivot: { x: number; y: number; set(x: number, y?: number): void };
        scale: { x: number; y: number; set(x: number, y?: number): void };
        position: { x: number; y: number; set(x: number, y?: number): void };
        children: any[];
        addChild<T extends any>(...children: T[]): T;
        removeChild<T extends any>(...children: T[]): T;
        removeChildren(beginIndex?: number, endIndex?: number): any[];
        destroy(options?: boolean | object): void;
      }

      export class Sprite extends Container {
        texture: any;
        anchor: { x: number; y: number; set(x: number, y?: number): void };
        tint: number | string;
        blendMode: string;
        constructor(texture?: any);
        static from(source: any): Sprite;
      }

      export class Graphics extends Container {
        rect(x: number, y: number, width: number, height: number): this;
        roundRect(x: number, y: number, width: number, height: number, radius?: number): this;
        circle(x: number, y: number, radius: number): this;
        ellipse(x: number, y: number, radiusX: number, radiusY: number): this;
        poly(points: number[] | { x: number; y: number }[]): this;
        star(x: number, y: number, points: number, radius: number, innerRadius?: number, rotation?: number): this;
        moveTo(x: number, y: number): this;
        lineTo(x: number, y: number): this;
        bezierCurveTo(cpX: number, cpY: number, cpX2: number, cpY2: number, toX: number, toY: number): this;
        quadraticCurveTo(cpX: number, cpY: number, toX: number, toY: number): this;
        arc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): this;
        closePath(): this;
        fill(colorOrOptions?: number | string | { color?: number | string; alpha?: number }): this;
        stroke(options?: number | { width?: number; color?: number | string; alpha?: number }): this;
        cut(): this;
        clear(): this;
      }

      export class Text extends Container {
        text: string;
        style: any;
        anchor: { x: number; y: number; set(x: number, y?: number): void };
        constructor(options?: { text?: string; style?: any });
      }

      export class TextStyle {
        constructor(style?: any);
      }

      export class Ticker {
        started: boolean;
        FPS: number;
        deltaTime: number;
        deltaMS: number;
        elapsedMS: number;
        speed: number;
        add(fn: (ticker: Ticker) => void, context?: any, priority?: number): this;
        remove(fn: (ticker: Ticker) => void, context?: any): this;
        start(): void;
        stop(): void;
        update(currentTime?: number): void;
        static shared: Ticker;
      }

      export namespace Assets {
        function load<T = any>(urls: string | string[]): Promise<T>;
        function init(options?: any): Promise<void>;
        function reset(): Promise<void>;
        function add(options: any): void;
      }

      export namespace Color {
        const shared: {
          setValue(value: any): { toNumber(): number; toHex(): string; toRgb(): number[] };
        };
      }

      export class Point {
        x: number;
        y: number;
        constructor(x?: number, y?: number);
        set(x?: number, y?: number): void;
      }

      export class Rectangle {
        x: number;
        y: number;
        width: number;
        height: number;
        constructor(x?: number, y?: number, width?: number, height?: number);
      }

      export class Circle {
        x: number;
        y: number;
        radius: number;
        constructor(x?: number, y?: number, radius?: number);
      }

      export class Matrix {
        constructor();
      }

      export namespace TexturePool {
        function clear(): void;
      }
    }

    // Declaraciones globales disponibles directamente en la escena
    import * as _PIXI from 'pixi.js';
    declare global {
      const PIXI: typeof _PIXI;
      const app: _PIXI.Application;
      const Application: typeof _PIXI.Application;
      const Assets: typeof _PIXI.Assets;
      const Container: typeof _PIXI.Container;
      const Sprite: typeof _PIXI.Sprite;
      const Graphics: typeof _PIXI.Graphics;
      const Text: typeof _PIXI.Text;
      const TextStyle: typeof _PIXI.TextStyle;
      const Ticker: typeof _PIXI.Ticker;
      const Point: typeof _PIXI.Point;
      const Rectangle: typeof _PIXI.Rectangle;
      const Circle: typeof _PIXI.Circle;
      const Matrix: typeof _PIXI.Matrix;
      const Color: typeof _PIXI.Color;
    }
  `;

  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    pixiTypeDeclarations,
    "ts:filename/pixi.d.ts"
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    pixiTypeDeclarations,
    "ts:filename/pixi.d.ts"
  );
}

/**
 * Transpila código TypeScript a JavaScript ejecutable en el navegador usando el worker de Monaco.
 */
export async function transpileTypeScript(
  monaco: any,
  editor: any,
  rawCode: string
): Promise<string> {
  try {
    if (monaco && editor) {
      const model = editor.getModel();
      if (model) {
        const getWorker = await monaco.languages.typescript.getTypeScriptWorker();
        const worker = await getWorker(model.uri);
        const result = await worker.getEmitOutput(model.uri.toString());
        if (result && result.outputFiles && result.outputFiles.length > 0) {
          return result.outputFiles[0].text;
        }
      }
    }
  } catch (err) {
    console.warn("Monaco worker transpile fallback, using raw code:", err);
  }
  return rawCode;
}

