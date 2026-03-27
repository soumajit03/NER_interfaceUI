import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { PredictionHistoryItem } from "../types";
import { Clock, FileText, Trash2, Search, ExternalLink } from "lucide-react";

interface HistoryPageProps {
  onOpenInAnnotator: (item: PredictionHistoryItem) => void;
}

export default function HistoryPage({ onOpenInAnnotator }: HistoryPageProps) {
  const [history, setHistory] = useState<PredictionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error("Error loading history:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteHistoryItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this analysis?")) return;
    try {
      const { error } = await supabase.from("predictions").delete().eq("id", id);
      if (error) throw error;
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  };

  const filteredHistory = history.filter((item) =>
    searchTerm ? item.input_text.toLowerCase().includes(searchTerm.toLowerCase()) : true
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl text-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="size-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium">Loading your history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Analysis History</h1>
        <p className="text-slate-500">View and manage your previous text analyses</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-8 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search within your annotated texts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* History List */}
      <div className="space-y-4">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          
            <h3 className="text-lg font-medium text-slate-900">No analyses found</h3>
            <p className="text-slate-500 mt-1">Start by analyzing some text in your workspace.</p>
          </div>
        ) : (
          filteredHistory.map((item) => {
            const entityCount = item.output_tokens.filter((t) => t.bio_label !== "O").length;
            
            return (
              <div key={item.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all group">
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div className="flex-1">
                    <p className="text-slate-700 text-sm line-clamp-2 leading-relaxed">
                      {item.input_text}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteHistoryItem(item.id)}
                    className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors"
                    title="Delete record"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md">
                      <span className="font-bold text-slate-700">{entityCount}</span> entities
                    </div>
                    {item.source_file_path && (
                      <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                        <FileText className="size-3.5" />
                        File Upload
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onOpenInAnnotator(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    <ExternalLink className="size-3.5" />
                    Open in Workspace
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}