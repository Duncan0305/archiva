import {
  Image as ImageIcon,
  FileText,
  Archive,
  ArrowUpRight,
  Layers,
} from "lucide-react";

// Original CSS illustration; no user files or remote assets are represented.
export function FileIllustration() {
  return (
    <div
      className="hero-grid relative mx-auto h-[325px] w-full max-w-[430px] select-none"
      aria-hidden="true"
    >
      <div className="absolute top-8 right-5 rounded-full border border-border bg-background/85 px-3 py-1.5 text-[9px] font-medium tracking-wide">
        UN LUGAR. MUCHAS POSIBILIDADES.
      </div>
      <div className="absolute top-[104px] left-[64px] h-[169px] w-[270px] -rotate-6 rounded-xl bg-[#bcc9a5] shadow-sm">
        <div className="absolute -top-5 left-0 h-10 w-28 rounded-t-xl bg-[#bcc9a5]" />
      </div>
      <div className="file-paper absolute top-[65px] left-[88px] h-[157px] w-[112px] -rotate-[17deg] rounded-lg p-4 text-[#536746]">
        <FileText className="size-7" strokeWidth={1.4} />
        <div className="mt-4 h-1 w-12 rounded bg-[#d8dece]" />
        <div className="mt-2 h-1 w-16 rounded bg-[#e5e9df]" />
        <div className="mt-2 h-1 w-10 rounded bg-[#e5e9df]" />
        <span className="absolute bottom-4 text-xs font-bold">PDF</span>
      </div>
      <div className="file-paper absolute top-[48px] left-[183px] h-[157px] w-[112px] rotate-[9deg] rounded-lg p-4 text-[#a17b45]">
        <ImageIcon className="size-7" strokeWidth={1.4} />
        <div className="mt-4 flex h-10 items-end gap-1 overflow-hidden rounded bg-[#f2ead9]">
          <div className="size-12 translate-y-5 rotate-45 bg-[#d8c49c]" />
          <div className="size-10 translate-y-4 rotate-45 bg-[#c4b083]" />
        </div>
        <span className="absolute bottom-4 text-xs font-bold">JPG</span>
      </div>
      <div className="absolute top-[139px] left-[59px] flex h-[145px] w-[285px] -rotate-6 flex-col justify-between rounded-xl border border-[#b1c096] bg-[#d3dfbb] p-6 text-[#45603c] shadow-[0_18px_28px_-20px_#344a3680]">
        <Layers className="size-6" strokeWidth={1.4} />
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[8px] font-semibold tracking-[0.2em]">
              ESPACIO PARA LO IMPORTANTE
            </div>
            <div className="mt-1 font-display text-xl font-semibold tracking-tight">
              Tus archivos, contigo.
            </div>
          </div>
          <ArrowUpRight className="size-5" />
        </div>
      </div>
      <div className="absolute top-[225px] left-[10px] flex -rotate-6 items-center gap-2 rounded-lg border border-[#e5d6c5] bg-[#fff9ef] px-3 py-2.5 text-[#896853] shadow-sm">
        <Archive className="size-4" />
        <span className="text-[10px] font-semibold">.zip</span>
      </div>
      <div className="absolute right-5 bottom-5 flex rotate-3 items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-[10px]">
        <span className="size-1.5 rounded-full bg-primary" />
        Pensado para tu navegador
      </div>
    </div>
  );
}
