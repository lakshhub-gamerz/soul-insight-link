import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
  connections: string[];
  color: string;
}

interface KnowledgeMapProps {
  messages: any[];
}

export default function KnowledgeMap({ messages }: KnowledgeMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);

  useEffect(() => {
    // Generate nodes from messages
    const newNodes: Node[] = messages
      .filter(msg => msg.role === "user")
      .slice(-10)
      .map((msg, i) => {
        const angle = (i / messages.length) * Math.PI * 2;
        const radius = 150 + Math.random() * 50;
        return {
          id: `node-${i}`,
          x: 300 + Math.cos(angle) * radius,
          y: 300 + Math.sin(angle) * radius,
          label: msg.content.substring(0, 30) + "...",
          connections: i > 0 ? [`node-${i - 1}`] : [],
          color: `hsl(${180 + i * 20}, 100%, 50%)`,
        };
      });
    setNodes(newNodes);
  }, [messages]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 600;
    canvas.height = 600;

    // Clear canvas
    ctx.fillStyle = "rgba(0, 0, 16, 0.1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    ctx.strokeStyle = "rgba(0, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    nodes.forEach(node => {
      node.connections.forEach(connId => {
        const targetNode = nodes.find(n => n.id === connId);
        if (targetNode) {
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.stroke();
        }
      });
    });

    // Draw nodes
    nodes.forEach(node => {
      // Glow effect
      const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 15);
      gradient.addColorStop(0, node.color);
      gradient.addColorStop(0.5, node.color + "88");
      gradient.addColorStop(1, "transparent");
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 15, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      // Gentle pulsing effect
      const time = Date.now() * 0.001;
      nodes.forEach((node, i) => {
        const pulse = Math.sin(time + i) * 2;
        
        ctx.fillStyle = node.color + "22";
        ctx.beginPath();
        ctx.arc(node.x, node.y, 15 + pulse, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [nodes]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hovered = nodes.find(node => {
      const dx = x - node.x;
      const dy = y - node.y;
      return Math.sqrt(dx * dx + dy * dy) < 15;
    });

    setHoveredNode(hovered || null);
  };

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] text-muted-foreground">
        <p>Start querying to see your knowledge constellation...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        onMouseMove={handleCanvasMouseMove}
        className="w-full h-auto rounded-lg cursor-pointer"
        style={{ maxWidth: "600px", margin: "0 auto", display: "block" }}
      />
      
      {hoveredNode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-card/90 backdrop-blur-md px-4 py-2 rounded-lg border border-outer-primary/30"
        >
          <p className="text-sm text-foreground">{hoveredNode.label}</p>
        </motion.div>
      )}
    </div>
  );
}
