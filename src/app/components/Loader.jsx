import React from "react";

export default function Loader() {
  return (
    <div className="flex justify-center items-center min-h-[200px] w-full">
      <div className="relative w-[70px] h-[70px]">
        <div
          className="absolute left-0 top-0 w-[70px] h-[70px] rounded-full border border-transparent border-b-8 border-b-[#ff8df9] animate-rotate1"
        />
        <div
          className="absolute left-0 top-0 w-[70px] h-[70px] rounded-full border border-transparent border-b-8 border-b-[#ff416a] animate-rotate2"
        />
        <div
          className="absolute left-0 top-0 w-[70px] h-[70px] rounded-full border border-transparent border-b-8 border-b-[#00ffff] animate-rotate3"
        />
        <div
          className="absolute left-0 top-0 w-[70px] h-[70px] rounded-full border border-transparent border-b-8 border-b-[#fcb737] animate-rotate4"
        />
      </div>
    </div>
  );
}

