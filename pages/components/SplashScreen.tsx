import React from "react";
import logo from "/icon-192.png";

const SplashScreen = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <img
          src={logo}
          alt="Dakahlia Poultry"
          className="w-40 h-40 animate-pulse"
        />
        <h1 className="text-blue-700 font-bold text-xl">
          الدقهلية للدواجن
        </h1>
      </div>
    </div>
  );
};

export default SplashScreen;
