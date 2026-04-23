import { Separator } from "react-resizable-panels";

export function ResizeHandle() {
  return (
    <Separator className="group relative flex w-1 items-center justify-center bg-zinc-800 transition-colors hover:bg-emerald-500 active:bg-emerald-500 cursor-col-resize z-10">
      <div className="absolute inset-y-0 -inset-x-2" />
    </Separator>
  );
}
