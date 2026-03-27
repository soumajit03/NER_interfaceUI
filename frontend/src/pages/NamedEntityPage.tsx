import { useEffect, useState } from "react";
import InputSection from "../components/input/InputSection";
import OutputSection from "../components/output/OutputSection";
import AssignPanel from "../components/output/AssignPanel";
import AssignedEntitiesPanel from "../components/output/AssignedEntitiesPanel";
import ExportButton from "../components/output/ExportButton";
import type {
  FeedbackEditEvent,
  PredictionResponse,
  EntitySpan,
  PredictionHistoryItem,
  Token,
} from "../types";
import { Card } from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";
import { saveFeedbackEdits } from "../services/api";

const ALLOWED_BIO_LABELS = new Set([
  "O",
  "B-MYTH",
  "I-MYTH",
  "B-GEO",
  "I-GEO",
  "B-LOC",
  "I-LOC",
  "B-ORG",
  "I-ORG",
]);

function applyLabelToSpanTokens(tokens: Token[], span: EntitySpan, newBioLabel: string) {
  const tokenIndexes = tokens
    .map((token, idx) => ({ token, idx }))
    .filter(({ token }) => token.start >= span.start && token.end <= span.end)
    .map(({ idx }) => idx);

  if (tokenIndexes.length === 0) return;

  if (newBioLabel === "O") {
    tokenIndexes.forEach((idx) => {
      tokens[idx].bio_label = "O";
    });
    return;
  }

  const [prefix, entity] = newBioLabel.split("-");
  if (!entity) {
    return;
  }

  tokenIndexes.forEach((idx, pos) => {
    if (pos === 0) {
      tokens[idx].bio_label = `${prefix}-${entity}`;
    } else {
      tokens[idx].bio_label = `I-${entity}`;
    }
  });
}

export default function NamedEntityPage() {
  const [output, setOutput] = useState<PredictionResponse | null>(null);
  const [spans, setSpans] = useState<EntitySpan[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [inputText, setInputText] = useState<string>("");

  const mergeTokensToSpans = (tokens: Token[], fullText: string): EntitySpan[] => {
    const merged: EntitySpan[] = [];
    let current: EntitySpan | null = null;

    tokens.forEach((token) => {
      if (token.bio_label.startsWith("B-")) {
        if (current) merged.push(current);

        current = {
          text: fullText.slice(token.start, token.end),
          start: token.start,
          end: token.end,
          bio_label: token.bio_label,
          assigned_gender: null,
        };
      } else if (token.bio_label.startsWith("I-") && current) {
        current.end = token.end;
        current.text = fullText.slice(current.start, current.end);
      } else {
        if (current) {
          merged.push(current);
          current = null;
        }
      }
    });

    if (current) merged.push(current);

    return merged;
  };

  const loadHistoryItem = (preloadItem: PredictionHistoryItem) => {
    const preloadedOutput: PredictionResponse = {
      text: preloadItem.input_text,
      tokens: preloadItem.output_tokens,
    };

    setInputText(preloadItem.input_text);
    setOutput(preloadedOutput);
    setSpans(mergeTokensToSpans(preloadedOutput.tokens, preloadedOutput.text));
    setSelectedIndex(null);
  };

  useEffect(() => {
    const raw = sessionStorage.getItem("ner.pendingHistoryItem");
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as PredictionHistoryItem;
      if (parsed?.id && parsed?.input_text && parsed?.output_tokens) {
        loadHistoryItem(parsed);
      }
    } catch {
      // Ignore malformed storage payloads.
    } finally {
      sessionStorage.removeItem("ner.pendingHistoryItem");
    }
  }, []);

  const handlePrediction = (data: PredictionResponse) => {
    setOutput(data);
    const mergedSpans = mergeTokensToSpans(data.tokens, data.text);
    setSpans(mergedSpans);
    setSelectedIndex(null);
  };

  const handleBioLabelEdit = (targetIndex: number, newBioLabel: string) => {
    if (!output || !ALLOWED_BIO_LABELS.has(newBioLabel)) {
      return;
    }

    const selected = spans[targetIndex];
    if (!selected) {
      return;
    }

    const targetText = selected.text.toLowerCase();
    const updatedSpans = spans.map((span) => ({ ...span }));
    const updatedTokens = output.tokens.map((token) => ({ ...token }));
    const feedbackEvents: FeedbackEditEvent[] = [];

    updatedSpans.forEach((span) => {
      if (span.text.toLowerCase() !== targetText) {
        return;
      }

      const oldBioLabel = span.bio_label;
      if (oldBioLabel === newBioLabel) {
        return;
      }

      span.bio_label = newBioLabel;
      applyLabelToSpanTokens(updatedTokens, span, newBioLabel);
      feedbackEvents.push({
        text: span.text,
        start: span.start,
        end: span.end,
        old_bio_label: oldBioLabel,
        new_bio_label: newBioLabel,
      });
    });

    setSpans(updatedSpans);
    setOutput({
      ...output,
      tokens: updatedTokens,
    });

    if (feedbackEvents.length > 0) {
      saveFeedbackEdits(feedbackEvents).catch((error) => {
        console.error("Failed to persist feedback edits", error);
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-[1400px]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Input Panel */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-5 bg-white shadow-sm border-slate-200">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 border-b pb-2">Input Source</h2>
            <InputSection
              text={inputText}
              setText={setInputText}
              setOutput={handlePrediction}
            />
          </Card>
        </div>

        {/* Middle Column: Core Output Panel */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="p-6 bg-white shadow-sm border-slate-200 min-h-[650px] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">Annotation Output</h2>
              {output && (
                <ExportButton
                  spans={spans}
                  tokens={output.tokens}
                  text={output.text}
                />
              )}
            </div>
            
            <ScrollArea className="flex-1 pr-4">
              <OutputSection
                data={output}
                spans={spans}
                selectedIndex={selectedIndex}
                setSelectedIndex={setSelectedIndex}
              />
            </ScrollArea>
          </Card>
        </div>

        {/* Right Column: Assignment & Entity Lists */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-5 bg-white shadow-sm border-slate-200">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 border-b pb-2">Properties</h2>
            <AssignPanel
              spans={spans}
              selectedIndex={selectedIndex}
              setSpans={setSpans}
              onApplyBioLabel={handleBioLabelEdit}
            />
          </Card>

          <Card className="p-5 bg-white shadow-sm border-slate-200">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 border-b pb-2">Assigned Entities</h2>
            <AssignedEntitiesPanel spans={spans} setSpans={setSpans} />
          </Card>
        </div>

      </div>
    </div>
  );
}