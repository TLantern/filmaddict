import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow ngrok domains - updated by ./update-ngrok-domain.sh
  allowedDevOrigins: [
    "83468c3ac12c.ngrok-free.app",
    "https://07e6ab8c442b.ngrok-free.app",
    
  ],
};

export default nextConfig;
