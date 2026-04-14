/*
  Models — ML model performance metrics and comparison
  Design: Midnight Command — metric cards, radar-style comparisons
*/
import { useMockData } from "@/hooks/useMockData";
import { motion } from "framer-motion";
import { Cpu, Award, BarChart3 } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const COLORS = ["oklch(0.765 0.177 163)", "oklch(0.585 0.233 277)", "oklch(0.795 0.184 86)"];

export default function Models() {
  const { modelMetrics } = useMockData();

  // Radar chart data
  const radarData = [
    { metric: "Accuracy", ...Object.fromEntries(modelMetrics.map((m) => [m.modelName, m.accuracy * 100])) },
    { metric: "Precision", ...Object.fromEntries(modelMetrics.map((m) => [m.modelName, m.precision * 100])) },
    { metric: "Recall", ...Object.fromEntries(modelMetrics.map((m) => [m.modelName, m.recall * 100])) },
    { metric: "F1 Score", ...Object.fromEntries(modelMetrics.map((m) => [m.modelName, m.f1 * 100])) },
    { metric: "ROC AUC", ...Object.fromEntries(modelMetrics.map((m) => [m.modelName, m.rocAuc * 100])) },
  ];

  // Best model
  const bestModel = modelMetrics.reduce((best, m) => (m.accuracy > best.accuracy ? m : best), modelMetrics[0]);

  return (
    <div className="space-y-6">
      {/* Best model highlight */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 border-profit/20 glow-profit"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-profit/15">
            <Award className="w-5 h-5 text-profit" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Best Performing Model</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="text-profit font-semibold">{bestModel.modelName.replace("_", " ")}</span>
              {" "}— {(bestModel.accuracy * 100).toFixed(1)}% accuracy on {bestModel.sampleSize.toLocaleString()} samples
            </p>
          </div>
        </div>
      </motion.div>

      {/* Radar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className="glass-card p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Model Comparison</h3>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="oklch(1 0 0 / 8%)" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fontSize: 11, fill: "oklch(0.65 0.02 260)" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[40, 70]}
              tick={{ fontSize: 9, fill: "oklch(0.5 0.02 260)" }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "oklch(0.17 0.015 260 / 95%)",
                border: "1px solid oklch(1 0 0 / 10%)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "oklch(0.93 0.005 260)",
              }}
              formatter={(value: number) => [`${value.toFixed(1)}%`]}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px" }}
              formatter={(value) => value.replace("_", " ")}
            />
            {modelMetrics.map((m, i) => (
              <Radar
                key={m.modelName}
                name={m.modelName}
                dataKey={m.modelName}
                stroke={COLORS[i]}
                fill={COLORS[i]}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Model detail cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {modelMetrics.map((model, i) => (
          <motion.div
            key={model.modelName}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + 0.08 * i, duration: 0.35 }}
            className="glass-card p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Cpu className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground capitalize">
                  {model.modelName.replace("_", " ")}
                </h3>
                <p className="text-[10px] text-muted-foreground">{model.sport.toUpperCase()} · {model.sampleSize} samples</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {[
                { label: "Accuracy", value: model.accuracy, format: "pct" },
                { label: "Precision", value: model.precision, format: "pct" },
                { label: "Recall", value: model.recall, format: "pct" },
                { label: "F1 Score", value: model.f1, format: "pct" },
                { label: "ROC AUC", value: model.rocAuc, format: "pct" },
                { label: "Brier Score", value: model.brierScore, format: "dec" },
              ].map((metric) => (
                <div key={metric.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{metric.label}</span>
                    <span className="data-value text-xs font-semibold text-foreground">
                      {metric.format === "pct"
                        ? `${(metric.value * 100).toFixed(1)}%`
                        : metric.value.toFixed(3)}
                    </span>
                  </div>
                  {metric.format === "pct" && (
                    <div className="w-full h-1 rounded-full bg-accent overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${metric.value * 100}%` }}
                        transition={{ delay: 0.3 + 0.05 * i, duration: 0.5 }}
                        className="h-full rounded-full"
                        style={{ background: COLORS[i] }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
