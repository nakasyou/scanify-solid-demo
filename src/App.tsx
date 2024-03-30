import { createEffect, createSignal, For, onMount, Show } from "solid-js";
import {
  type Edges,
  fromImageData,
  type Image as ScanifyImage,
  initialize,
} from "../node_modules/@ns/scanify/mod";

function App() {
  let canvas!: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let imageRef!: HTMLImageElement;

  const [getScanifyImage, setScanifyImage] = createSignal<ScanifyImage>();
  const [getEdges, setEdges] = createSignal<Edges>([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 }
  ]);
  const [getImage, setImage] = createSignal<HTMLImageElement>();
  const [getImageRect, setImageRect] = createSignal<DOMRect>();
  const [getResultUrl, setResultUrl] = createSignal<string>()

  onMount(async () => {
    ctx = canvas.getContext("2d")!;
    await initialize();

    setImageRect(imageRef.getBoundingClientRect());
    new ResizeObserver(() => {
      setImageRect(imageRef.getBoundingClientRect());
    }).observe(imageRef);
  });

  return (
    <>
      <Show when={getResultUrl()}>
        <div class="touch-none">
          <img src={getResultUrl()} alt='result' />
        </div>
      </Show>
      <div class="">
        <For each={getEdges()}>
          {({ x, y }, i) => (
            <div
              style={{
                top: `${y / (getImage()?.height ?? 1) * (getImageRect()?.height ?? 1)}px`,
                left: `${x / (getImage()?.width ?? 1) * (getImageRect()?.width ?? 1)}px`,
              }}
              class="w-8 h-8 bg-white border absolute rounded-full touch-none"
              onpointermove={(evt) => {
                if (evt.pressure !== 0) {
                  evt.currentTarget.setPointerCapture(evt.pointerId);
                  evt.currentTarget.style.left =
                    evt.currentTarget.offsetLeft + evt.movementX + "px";
                  evt.currentTarget.style.top =
                    evt.currentTarget.offsetTop + evt.movementY + "px";
                }
              }}
              onPointerUp={(evt) => {
                const edges = getEdges()
                const imageRect = getImageRect()
                const image = getImage()
                if (!(imageRect && image)) {
                  return
                }
                edges[i()] = {
                  x: evt.currentTarget.offsetLeft * image.width / imageRect.width,
                  y: evt.currentTarget.offsetTop * image.height / imageRect.height,
                };
                console.log(edges)
                setEdges([...edges]);
              }}
            />
          )}
        </For>
      </div>
      <div class="">
        <img src={getImage()?.src} class="max-w-[100dvw] max-h-[100dvh]" ref={imageRef} />
      </div>
      <button type="button" onClick={async () => {
        const edges = getEdges()
        const imageRect = getImageRect()
        const image = getImage()
        const scanifyImage = getScanifyImage()
        if (!(imageRect && image && scanifyImage)) {
          return
        }
        const calcedEdges = edges.map(({x, y}) => ({
          x: x * image.width / imageRect.width,
          y: y * image.height / imageRect.height
        })) as Edges
        const imageData = scanifyImage.scan(edges)
        
        canvas.width = imageData.width
        canvas.height = imageData.height

        console.log(imageData)
        ctx.putImageData(imageData, 0, 0)
        setResultUrl(canvas.toDataURL())
      }}>確定</button>
      <div>
        <input
          type="file"
          onChange={async (evt) => {
            const file = evt.currentTarget?.files?.[0];
            if (!file) {
              return;
            }
            const url = URL.createObjectURL(file);

            const image = await new Promise<HTMLImageElement>((resolve) => {
              const image = new Image();
              image.onload = () => {
                resolve(image);
              };
              image.src = url;
            });
            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            console.log(imageData)
            setImage(image);

            const scanifyImage = fromImageData(imageData);

            setScanifyImage(scanifyImage);
          }}
        />
      </div>
      <canvas ref={canvas} hidden />
    </>
  );
}

export default App;
