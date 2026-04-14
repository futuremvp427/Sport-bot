/*
  DemoModeBanner — Shows when dashboard is using mock data instead of live API.
  Design: Midnight Command — subtle amber banner
*/
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Wifi, WifiOff } from "lucide-react";
import type { DataSource } from "@/hooks/useApiData";

interface DemoModeBannerProps {
  dataSource: DataSource;
}

export default function DemoModeBanner({ dataSource }: DemoModeBannerProps) {
  return (
    <AnimatePresence>
      {dataSource === "mock" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-caution/10 border border-caution/20 text-xs"
        >
          <WifiOff className="w-3.5 h-3.5 text-caution flex-shrink-0" />
          <span className="text-caution font-medium">Demo Mode</span>
          <span className="text-muted-foreground">
            — Showing realistic simulated data (57.9% model accuracy). Connect the Python backend on port 8000 for live data.
          </span>
        </motion.div>
      )}
      {dataSource === "api" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-profit/10 border border-profit/20 text-xs"
        >
          <Wifi className="w-3.5 h-3.5 text-profit flex-shrink-0" />
          <span className="text-profit font-medium">Live</span>
          <span className="text-muted-foreground">
            — Connected to backend API. Showing real-time data from Caesars Sportsbook &amp; PrizePicks.
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
