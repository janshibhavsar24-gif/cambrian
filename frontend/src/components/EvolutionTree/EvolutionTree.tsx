import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import html2canvas from "html2canvas";
import type { TreeData, VizNode, VizEdge } from "../../types";
import styles from "./EvolutionTree.module.css";

interface Props {
  data: TreeData;
  problem?: string;
}

const COL_WIDTH = 200;
const ROW_HEIGHT = 56;
const NODE_R = 20;
const PAD_X = 60;
const PAD_Y = 48;

function scoreColor(score: number, scored: boolean): string {
  if (!scored) return "#e2e8f0";
  if (score >= 7) return "#22c55e";
  if (score >= 4) return "#f59e0b";
  return "#ef4444";
}

function scoreTextColor(scored: boolean): string {
  if (!scored) return "#94a3b8";
  return "#fff";
}

function layoutNodes(nodes: VizNode[]): Map<string, { x: number; y: number }> {
  const byGen = new Map<number, VizNode[]>();
  nodes.forEach(n => {
    const arr = byGen.get(n.generation) ?? [];
    arr.push(n);
    byGen.set(n.generation, arr);
  });

  const positions = new Map<string, { x: number; y: number }>();
  byGen.forEach((genNodes, gen) => {
    const totalH = genNodes.length * ROW_HEIGHT;
    genNodes.forEach((n, i) => {
      positions.set(n.id, {
        x: PAD_X + (gen - 1) * COL_WIDTH,
        y: PAD_Y + i * ROW_HEIGHT - totalH / 2,
      });
    });
  });
  return positions;
}

type ShareState = "idle" | "capturing" | "done" | "error";

export function EvolutionTree({ data, problem }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [shareState, setShareState] = useState<ShareState>("idle");

  const allScored = data.nodes.length > 0 && data.nodes.every(n => n.scored);

  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0) return;

    const positions = layoutNodes(data.nodes);
    const maxGen = Math.max(...data.nodes.map(n => n.generation));
    const maxNodesInGen = Math.max(
      ...Array.from({ length: maxGen }, (_, i) =>
        data.nodes.filter(n => n.generation === i + 1).length
      )
    );

    const svgW = PAD_X * 2 + (maxGen - 1) * COL_WIDTH + NODE_R * 2;
    const svgH = PAD_Y * 2 + maxNodesInGen * ROW_HEIGHT;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 ${-svgH / 2} ${svgW} ${svgH}`);

    const edgeGroup = svg.append("g");
    data.edges.forEach((edge: VizEdge) => {
      const src = positions.get(edge.sourceId);
      const tgt = positions.get(edge.targetId);
      if (!src || !tgt) return;
      const mx = (src.x + tgt.x) / 2;
      edgeGroup.append("path")
        .attr("d", `M ${src.x} ${src.y} C ${mx} ${src.y}, ${mx} ${tgt.y}, ${tgt.x} ${tgt.y}`)
        .attr("fill", "none")
        .attr("stroke", edge.type === "crossover" ? "#818cf8" : "#f472b6")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", edge.type === "mutation" ? "5,3" : "none")
        .attr("opacity", 0.5);
    });

    const labelGroup = svg.append("g");
    for (let g = 1; g <= maxGen; g++) {
      labelGroup.append("text")
        .attr("x", PAD_X + (g - 1) * COL_WIDTH)
        .attr("y", -svgH / 2 + 20)
        .attr("text-anchor", "middle")
        .attr("font-size", 11)
        .attr("font-weight", 600)
        .attr("fill", "#94a3b8")
        .attr("font-family", "Inter, sans-serif")
        .attr("letter-spacing", "0.08em")
        .text(`GEN ${g}`);
    }

    const nodeGroup = svg.append("g");
    data.nodes.forEach((node: VizNode) => {
      const pos = positions.get(node.id);
      if (!pos) return;

      const g = nodeGroup.append("g")
        .attr("transform", `translate(${pos.x}, ${pos.y})`)
        .attr("opacity", node.scored && !node.survived ? 0.3 : 1);

      if (node.survived && node.scored) {
        g.append("circle")
          .attr("r", NODE_R + 4)
          .attr("fill", "none")
          .attr("stroke", scoreColor(node.score, node.scored))
          .attr("stroke-width", 1)
          .attr("opacity", 0.25);
      }

      g.append("circle")
        .attr("r", NODE_R)
        .attr("fill", scoreColor(node.score, node.scored))
        .attr("stroke", node.survived && node.scored ? scoreColor(node.score, node.scored) : "#e2e8f0")
        .attr("stroke-width", node.survived && node.scored ? 0 : 1.5);

      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("font-size", node.scored ? 12 : 10)
        .attr("font-weight", 700)
        .attr("fill", scoreTextColor(node.scored))
        .attr("font-family", "Inter, sans-serif")
        .text(node.scored ? node.score.toFixed(1) : node.label.slice(0, 2).toUpperCase());

      const shortLabel = node.label.length > 12 ? node.label.slice(0, 11) + "…" : node.label;
      g.append("text")
        .attr("y", NODE_R + 13)
        .attr("text-anchor", "middle")
        .attr("font-size", 10)
        .attr("fill", "#64748b")
        .attr("font-family", "Inter, sans-serif")
        .text(shortLabel);
    });

  }, [data]);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setShareState("capturing");
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });

      // Add branding strip at bottom
      const branded = document.createElement("canvas");
      const strip = 48;
      branded.width = canvas.width;
      branded.height = canvas.height + strip;
      const ctx = branded.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, branded.width, branded.height);
      ctx.drawImage(canvas, 0, 0);

      // Bottom strip
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, canvas.height, branded.width, strip);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 22px Inter, sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText("🧬 cambrian", 32, canvas.height + strip / 2);
      ctx.font = "400 20px Inter, sans-serif";
      ctx.fillStyle = "#cbd5e1";
      ctx.textAlign = "right";
      ctx.fillText("github.com/janshibhavsar24-gif/cambrian", branded.width - 32, canvas.height + strip / 2);

      branded.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          setShareState("done");
        } catch {
          // Clipboard failed — fallback to download
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "cambrian-tree.png";
          a.click();
          URL.revokeObjectURL(url);
          setShareState("done");
        }
        setTimeout(() => setShareState("idle"), 2500);
      }, "image/png");
    } catch {
      setShareState("error");
      setTimeout(() => setShareState("idle"), 2500);
    }
  };

  if (data.nodes.length === 0) return null;

  const maxGen = Math.max(...data.nodes.map(n => n.generation));
  const maxNodesInGen = Math.max(
    ...Array.from({ length: maxGen }, (_, i) =>
      data.nodes.filter(n => n.generation === i + 1).length
    )
  );
  const svgH = PAD_Y * 2 + maxNodesInGen * ROW_HEIGHT;

  return (
    <div className={styles.container} ref={cardRef}>
      <div className={styles.header}>
        <span className={styles.title}>Evolutionary Tree</span>
        <div className={styles.headerRight}>
          <div className={styles.legend}>
            <span className={styles.legendItem}><span className={styles.dot} style={{ background: "#22c55e" }} />≥ 7</span>
            <span className={styles.legendItem}><span className={styles.dot} style={{ background: "#f59e0b" }} />4–7</span>
            <span className={styles.legendItem}><span className={styles.dot} style={{ background: "#ef4444" }} />{"< 4"}</span>
            <span className={styles.legendItem}><span className={styles.line} style={{ background: "#818cf8" }} />crossover</span>
            <span className={styles.legendItem}><span className={styles.dashed} />mutation</span>
          </div>
          {allScored && (
            <button
              className={`${styles.shareBtn} ${shareState === "done" ? styles.shareDone : ""} ${shareState === "error" ? styles.shareError : ""}`}
              onClick={handleShare}
              disabled={shareState === "capturing"}
            >
              {shareState === "capturing" && "Capturing…"}
              {shareState === "done" && "✓ Copied!"}
              {shareState === "error" && "Failed"}
              {shareState === "idle" && "Share ↗"}
            </button>
          )}
        </div>
      </div>

      {problem && (
        <div className={styles.problemBadge}>
          <span className={styles.problemLabel}>Problem</span>
          <span className={styles.problemText}>{problem}</span>
        </div>
      )}

      <div className={styles.scroll}>
        <svg
          ref={svgRef}
          style={{ width: PAD_X * 2 + (maxGen - 1) * COL_WIDTH + NODE_R * 2, height: svgH }}
        />
      </div>
    </div>
  );
}
