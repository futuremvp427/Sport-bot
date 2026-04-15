/**
 * DemoModeBanner — Shows the current data source status.
 *
 * source="trpc-live"  → live NBA odds from tRPC backend
 * source="mock-dev"   → mock data (VITE_USE_MOCK_DATA=true)
 * source="loading"    → fetching live data
 */
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import type { DataSource } from "@/hooks/useApiData";

interface DemoModeBannerProps {
  dataSource: DataSource;
}

export default function DemoModeBanner({ dataSource }: DemoModeBannerProps) {
  return (
    <AnimatePresence>
      {dataSource === "mock-dev" && (
        <motion.div
          key="mock"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-caution/10 border border-caution/20 text-xs"
        >
          <WifiOff className="w-3.5 h-3.5 text-caution flex-shrink-0" />
          <span className="text-caution font-medium">Dev Mode</span>
          <span className="text-muted-foreground">
            — Mock data active (VITE_USE_MOCK_DATA=true). Remove flag to use live NBA odds.
          </span>
        </motion.div>
      )}
      {dataSource === "trpc-live" && (
        <motion.div
          key="live"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-profit/10 border border-profit/20 text-xs"
        >
          <Wifi className="w-3.5 h-3.5 text-profit flex-shrink-0" />
          <span className="text-profit font-medium">Live</span>
          <span className="text-muted-foreground">
            — Live NBA odds via tRPC. Multi-layer model active (historical + injuries + fatigue).
          </span>
        </motion.div>
      )}
      {dataSource === "loading" && (
        <motion.div
          key="loading"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/30 border border-muted/20 text-xs"
        >
          <Loader2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 animate-spin" />
          <span className="text-muted-foreground">Fetching live NBA odds...</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
