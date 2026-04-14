/*
  KpiCard — Glassmorphic metric card with glow effects
  Design: Midnight Command — luminosity hierarchy, status-driven colors
*/
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "profit" | "loss" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
  delay?: number;
}

export default function KpiCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "text-primary",
  delay = 0,
}: KpiCardProps) {
  const changeColors = {
    profit: "text-profit bg-profit/10",
    loss: "text-loss bg-loss/10",
    neutral: "text-muted-foreground bg-muted",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="glass-card p-5 group hover:border-primary/20 transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg bg-primary/10 ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        {change && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full data-value ${changeColors[changeType]}`}
          >
            {change}
          </span>
        )}
      </div>
      <div className="data-value text-2xl font-bold text-foreground mb-1">{value}</div>
      <div className="text-xs text-muted-foreground font-medium">{label}</div>
    </motion.div>
  );
}
