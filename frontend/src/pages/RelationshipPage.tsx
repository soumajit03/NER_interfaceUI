import { Network, Sparkles } from "lucide-react";

export default function RelationshipPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-[1400px]">
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-2xl mx-auto mt-10 shadow-sm">
        <div className="size-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-6">
          <Network className="size-8 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">Relationship Annotation</h2>
        <p className="text-slate-500 mb-6">
          Map and visualize complex family trees, rivalries, and alliances between entities in your mythological narratives.
        </p>
        <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm font-medium text-slate-600 border border-slate-200">
          <Sparkles className="size-4 text-amber-500" />
          Under Construction
        </div>
      </div>
    </div>
  );
}