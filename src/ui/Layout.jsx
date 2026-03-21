import React from "react";
import PWAInstallPrompt from "../components/PWAInstallPrompt.jsx";
import { Outlet } from "react-router-dom";
import Footer from "./Footer.jsx";

/**
 * Global layout wrapper to ensure legal footer is present on all pages.
 */
export default function Layout() {
  return (
    <div className="min-h-screen bg-[#070910] text-white flex flex-col">
      <div style={{display:"flex", alignItems:"center", gap:10, padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <img src="/orkio-logo-app.png" alt="Orkio" style={{width:28, height:28}} />
        <div style={{fontWeight:800, letterSpacing:".08em"}}>ORKIO</div>
      </div>
      <div className="flex-1">
        <Outlet />
      </div>
      <PWAInstallPrompt />
      <Footer />
    </div>
  );
}
