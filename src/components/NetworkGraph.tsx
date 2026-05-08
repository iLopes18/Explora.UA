import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  course: string;
  department: string;
  avatarUrl?: string;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
}

interface NetworkGraphProps {
  users: any[];
  connections: any[];
  onNodeClick: (id: string) => void;
}

export default function NetworkGraph({ users, connections, onNodeClick }: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Prepare data
    const nodes: Node[] = users.map(u => ({
      id: u.uid || u.id,
      name: u.name,
      course: u.course,
      department: u.department || 'UA',
      avatarUrl: u.avatarUrl
    }));

    const links: Link[] = connections.map(c => ({
      source: c.userA,
      target: c.userB
    })).filter(l => 
      nodes.find(n => n.id === l.source) && 
      nodes.find(n => n.id === l.target)
    );

    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(60));

    // Links
    const link = g.append('g')
      .attr('stroke', '#141414')
      .attr('stroke-opacity', 0.1)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', 1.5);

    // Nodes
    const node = g.append('g')
      .selectAll('.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => onNodeClick(d.id))
      .call(d3.drag<any, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any
      );

    // Node circles (outer)
    node.append('circle')
      .attr('r', 25)
      .attr('fill', '#E4E3E0')
      .attr('stroke', '#141414')
      .attr('stroke-width', 2);

    // Course Labels
    node.append('text')
      .text(d => d.department.toUpperCase())
      .attr('text-anchor', 'middle')
      .attr('dy', 40)
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace')
      .attr('font-size', '8px')
      .attr('font-weight', 'bold')
      .attr('fill', '#141414')
      .attr('opacity', 0.5);

    // Names
    node.append('text')
      .text(d => d.name.split(' ')[0])
      .attr('text-anchor', 'middle')
      .attr('dy', -35)
      .attr('font-family', 'system-ui')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', '#141414');

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [users, connections]);

  return (
    <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
