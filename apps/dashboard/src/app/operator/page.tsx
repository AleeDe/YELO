import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui";

export default function OperatorPage() {
  return <>
    <PageHeader eyebrow="Operator workspace" title="My review queue" description="Only real AI-generated incidents are shown in the review queue." action={<Link className="primary-button focus-ring" href="/incidents">Open queue <ArrowRight size={18} /></Link>} />
    <section className="panel"><div className="empty-state"><div className="empty-icon"><AlertTriangle size={26} /></div><h2>Review live incidents</h2><p>Assignment-specific queues are not implemented yet. The incident directory already reads accessible events from Supabase.</p><Link href="/incidents" className="secondary-button focus-ring">View incidents</Link></div></section>
  </>;
}
