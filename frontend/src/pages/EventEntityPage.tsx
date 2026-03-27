import { CalendarDays, Sparkles } from "lucide-react";

export default function EventEntityPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-[1400px]">
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-2xl mx-auto mt-10 shadow-sm">
        <div className="size-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
          <CalendarDays className="size-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">Event Entity Annotation</h2>
        <p className="text-slate-500 mb-6">
          This workspace is currently under development. Soon, you will be able to specifically track timelines, mythological eras, and sequential story events.
        </p>
        <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm font-medium text-slate-600 border border-slate-200">
          <Sparkles className="size-4 text-amber-500" />
          Coming in the next update
        </div>
      </div>
    </div>
  );
}