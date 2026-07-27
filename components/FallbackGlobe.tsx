type FallbackGlobeProps = {
  message: string;
};

export default function FallbackGlobe({ message }: FallbackGlobeProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_center,#0b3152_0%,#030914_58%,#01040a_100%)]">
      <div className="demo-globe" aria-hidden="true" />
      <div className="absolute bottom-24 left-1/2 w-[min(88vw,620px)] -translate-x-1/2 rounded-2xl bg-black/35 px-4 py-3 text-center text-sm text-slate-200 backdrop-blur-md">
        {message}
      </div>
    </div>
  );
}
