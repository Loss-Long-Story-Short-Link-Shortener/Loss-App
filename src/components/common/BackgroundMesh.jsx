import React from "react";

export function BackgroundMesh() {
  return (
    <div className="bg-animated loss-bg-animated" aria-hidden="true">
      {/* Ambient Mesh Radial Gradients */}
      <div className="bg-gradient loss-bg-gradient" />
      <div className="bg-mesh" />

      {/* Grid Overlay with Radial Vignette */}
      <div className="grid-overlay loss-grid-overlay" />

      {/* 5 Floating Ambient Glowing Orbs */}
      <div className="floating-orbs loss-floating-orbs">
        <div className="orb orb-1 loss-orb loss-orb-1" />
        <div className="orb orb-2 loss-orb loss-orb-2" />
        <div className="orb orb-3 loss-orb loss-orb-3" />
        <div className="orb orb-4 loss-orb loss-orb-4" />
        <div className="orb orb-5 loss-orb loss-orb-5" />
      </div>
    </div>
  );
}

export default BackgroundMesh;

