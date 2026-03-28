import { useEffect, useRef, useState } from "react";
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
import { saveFeedbackAnalysis, saveFeedbackEdits } from "../services/api";
import { supabase } from "../lib/supabase";

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

interface WorkspaceSnapshot {
  inputText: string;
  output: PredictionResponse | null;
  spans: EntitySpan[];
  selectedIndex: number | null;
  analysisId: string;
  originalTokens: Token[];
  viewMode: "annotated" | "sentence";
  sentenceIndex: number;
}

interface WorkspaceDraftRow {
  user_id: string;
  snapshot: WorkspaceSnapshot;
  updated_at?: string;
}

const REMOTE_DRAFT_TABLE = "workspace_drafts";

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

function normalizeTokensWithO(text: string, tokens: Token[]): Token[] {
  const sorted = [...tokens]
    .filter((token) => token.end > token.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const normalized: Token[] = [];
  let cursor = 0;

  const isAlphaNumeric = (char: string) => /[A-Za-z0-9]/.test(char);

  const splitTokenBoundaryPunctuation = (token: Token): Token[] => {
    const parts: Token[] = [];
    let left = token.start;
    let right = token.end;

    while (left < right && !isAlphaNumeric(text[left])) {
      parts.push({
        text: text[left],
        start: left,
        end: left + 1,
        bio_label: "O",
        assigned_gender: null,
      });
      left += 1;
    }

    const trailing: number[] = [];
    while (right > left && !isAlphaNumeric(text[right - 1])) {
      trailing.push(right - 1);
      right -= 1;
    }

    if (left < right) {
      parts.push({
        text: text.slice(left, right),
        start: left,
        end: right,
        bio_label: token.bio_label,
        assigned_gender: token.assigned_gender ?? null,
      });
    }

    for (let i = trailing.length - 1; i >= 0; i -= 1) {
      const pos = trailing[i];
      parts.push({
        text: text[pos],
        start: pos,
        end: pos + 1,
        bio_label: "O",
        assigned_gender: null,
      });
    }

    return parts;
  };

  const appendOGap = (gapStart: number, gapEnd: number) => {
    if (gapStart >= gapEnd) return;

    const segment = text.slice(gapStart, gapEnd);
    let i = 0;
    while (i < segment.length) {
      while (i < segment.length && /\s/.test(segment[i])) i += 1;
      if (i >= segment.length) break;

      const chunkStart = i;
      while (i < segment.length && !/\s/.test(segment[i])) i += 1;

      normalized.push({
        text: text.slice(gapStart + chunkStart, gapStart + i),
        start: gapStart + chunkStart,
        end: gapStart + i,
        bio_label: "O",
        assigned_gender: null,
      });
    }
  };

  sorted.forEach((token) => {
    if (token.start > cursor) {
      appendOGap(cursor, token.start);
    }

    if (token.start >= cursor) {
      const normalizedToken: Token = {
        ...token,
        text: text.slice(token.start, token.end) || token.text,
      };

      normalized.push(...splitTokenBoundaryPunctuation(normalizedToken));
      cursor = token.end;
    }
  });

  if (cursor < text.length) {
    appendOGap(cursor, text.length);
  }

  return normalized;
}

export default function NamedEntityPage() {
  const [output, setOutput] = useState<PredictionResponse | null>(null);
  const [spans, setSpans] = useState<EntitySpan[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [inputText, setInputText] = useState<string>("");
  const [analysisId, setAnalysisId] = useState<string>("");
  const [originalTokens, setOriginalTokens] = useState<Token[]>([]);
  const [inputSectionKey, setInputSectionKey] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"annotated" | "sentence">("annotated");
  const [sentenceIndex, setSentenceIndex] = useState<number>(0);
  const [workspaceStorageKey, setWorkspaceStorageKey] = useState<string | null>(null);
  const [workspaceUserId, setWorkspaceUserId] = useState<string | null>(null);
  const [workspaceHydrated, setWorkspaceHydrated] = useState<boolean>(false);
  const initializedRef = useRef<boolean>(false);
  const saveDebounceRef = useRef<number | null>(null);
  const outputCardRef = useRef<HTMLDivElement | null>(null);
  const propertiesCardRef = useRef<HTMLDivElement | null>(null);

  const splitIntoSentences = (text: string): Array<{ text: string; start: number; end: number }> => {
    const segments: Array<{ text: string; start: number; end: number }> = [];
    const regex = /[^.!?]+[.!?]+|[^.!?]+$/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const raw = match[0];
      const leadingWhitespace = raw.match(/^\s*/)?.[0].length ?? 0;
      const trailingWhitespace = raw.match(/\s*$/)?.[0].length ?? 0;

      const start = match.index + leadingWhitespace;
      const end = match.index + raw.length - trailingWhitespace;

      if (start >= end) continue;

      segments.push({
        text: text.slice(start, end),
        start,
        end,
      });
    }

    return segments;
  };

  const sentenceSource = output?.text ?? inputText;
  const sentences = splitIntoSentences(sentenceSource);
  const activeSentence = sentences[sentenceIndex] ?? null;
  const sentenceSpansWithIndex = activeSentence
    ? spans
        .map((span, index) => ({ span, index }))
        .filter(
          ({ span }) =>
            span.start >= activeSentence.start &&
            span.end <= activeSentence.end
        )
    : [];
  const sentenceSpans = activeSentence
    ? sentenceSpansWithIndex.map(({ span }) => ({
        ...span,
        start: span.start - activeSentence.start,
        end: span.end - activeSentence.start,
      }))
    : [];
  const sentenceSpanIndexMap = sentenceSpansWithIndex.map(({ index }) => index);
  const sentenceTokens =
    output && activeSentence
      ? output.tokens
          .filter(
            (token) => token.start >= activeSentence.start && token.end <= activeSentence.end
          )
          .map((token) => ({
            ...token,
            start: token.start - activeSentence.start,
            end: token.end - activeSentence.start,
          }))
      : [];
  const sentenceOutput =
    output && activeSentence
      ? {
          text: activeSentence.text,
          tokens: sentenceTokens,
        }
      : null;

  useEffect(() => {
    if (sentences.length === 0) {
      setSentenceIndex(0);
      return;
    }

    setSentenceIndex((prev) => Math.min(prev, sentences.length - 1));
  }, [sentences.length]);

  const handleResetWorkspace = () => {
    setInputText("");
    setOutput(null);
    setSpans([]);
    setSelectedIndex(null);
    setAnalysisId("");
    setOriginalTokens([]);
    setViewMode("annotated");
    setSentenceIndex(0);
    setInputSectionKey((prev) => prev + 1);
    sessionStorage.removeItem("ner.pendingHistoryItem");
    if (workspaceStorageKey) {
      localStorage.removeItem(workspaceStorageKey);
    }
    if (workspaceUserId) {
      clearRemoteWorkspaceSnapshot(workspaceUserId).catch(() => {
        // Keep reset resilient even if remote cleanup fails.
      });
    }
  };

  const createAnalysisId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  };

  const toFeedbackTokenLabels = (tokens: Token[]) =>
    tokens.map((token) => ({
      text: token.text,
      start: token.start,
      end: token.end,
      bio_label: token.bio_label,
    }));

  const mergeTokensToSpans = (tokens: Token[], fullText: string): EntitySpan[] => {
    const merged: EntitySpan[] = [];
    let current: EntitySpan | null = null;
    const hasAlphaNumeric = (value: string) => /[A-Za-z0-9]/.test(value);

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

        const tokenText = fullText.slice(token.start, token.end);
        if (token.bio_label === "O" && !hasAlphaNumeric(tokenText)) {
          return;
        }

        merged.push({
          text: tokenText,
          start: token.start,
          end: token.end,
          bio_label: token.bio_label,
          assigned_gender: token.assigned_gender ?? null,
        });
      }
    });

    if (current) merged.push(current);

    return merged;
  };

  const loadHistoryItem = (preloadItem: PredictionHistoryItem) => {
    const normalizedTokens = normalizeTokensWithO(
      preloadItem.input_text,
      preloadItem.output_tokens
    );

    const preloadedOutput: PredictionResponse = {
      text: preloadItem.input_text,
      tokens: normalizedTokens,
    };

    setInputText(preloadItem.input_text);
    setOutput(preloadedOutput);
    setSpans(mergeTokensToSpans(preloadedOutput.tokens, preloadedOutput.text));
    setOriginalTokens(preloadedOutput.tokens.map((token) => ({ ...token })));
    setAnalysisId(createAnalysisId());
    setSelectedIndex(null);
  };

  const applyWorkspaceSnapshot = (snapshot: WorkspaceSnapshot) => {
    const normalizedOutput = snapshot.output
      ? {
          ...snapshot.output,
          tokens: normalizeTokensWithO(snapshot.output.text, snapshot.output.tokens),
        }
      : null;

    setInputText(snapshot.inputText);
    setOutput(normalizedOutput);
    setSpans(
      normalizedOutput
        ? mergeTokensToSpans(normalizedOutput.tokens, normalizedOutput.text)
        : snapshot.spans
    );
    setSelectedIndex(snapshot.selectedIndex);
    setAnalysisId(snapshot.analysisId);
    setOriginalTokens(snapshot.originalTokens);
    setViewMode(snapshot.viewMode);
    setSentenceIndex(snapshot.sentenceIndex);
  };

  const loadRemoteWorkspaceSnapshot = async (userId: string): Promise<WorkspaceSnapshot | null> => {
    const { data, error } = await supabase
      .from(REMOTE_DRAFT_TABLE)
      .select("snapshot")
      .eq("user_id", userId)
      .maybeSingle<Pick<WorkspaceDraftRow, "snapshot">>();

    if (error || !data?.snapshot) {
      return null;
    }

    return data.snapshot;
  };

  const saveRemoteWorkspaceSnapshot = async (userId: string, snapshot: WorkspaceSnapshot) => {
    await supabase
      .from(REMOTE_DRAFT_TABLE)
      .upsert(
        {
          user_id: userId,
          snapshot,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
  };

  const clearRemoteWorkspaceSnapshot = async (userId: string) => {
    await supabase.from(REMOTE_DRAFT_TABLE).delete().eq("user_id", userId);
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (selectedIndex === null) {
        return;
      }

      const target = event.target as Node;
      const insideOutput = !!outputCardRef.current?.contains(target);
      const insideProperties = !!propertiesCardRef.current?.contains(target);

      if (!insideOutput && !insideProperties) {
        setSelectedIndex(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [selectedIndex]);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        const userId = data.session?.user?.id;
        setWorkspaceUserId(userId ?? null);
        setWorkspaceStorageKey(userId ? `ner.workspace.${userId}` : "ner.workspace.anon");
      })
      .catch(() => {
        setWorkspaceUserId(null);
        setWorkspaceStorageKey("ner.workspace.anon");
      });
  }, []);

  useEffect(() => {
    if (!workspaceStorageKey || initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    const hydrateWorkspace = async () => {
      const pending = sessionStorage.getItem("ner.pendingHistoryItem");
      if (pending) {
        try {
          const parsed = JSON.parse(pending) as PredictionHistoryItem;
          if (parsed?.id && parsed?.input_text && parsed?.output_tokens) {
            loadHistoryItem(parsed);
          }
        } catch {
          // Ignore malformed storage payloads.
        } finally {
          sessionStorage.removeItem("ner.pendingHistoryItem");
          setWorkspaceHydrated(true);
        }
        return;
      }

      if (workspaceUserId) {
        const remoteSnapshot = await loadRemoteWorkspaceSnapshot(workspaceUserId);
        if (remoteSnapshot) {
          applyWorkspaceSnapshot(remoteSnapshot);
          setWorkspaceHydrated(true);
          return;
        }
      }

      const rawSnapshot = localStorage.getItem(workspaceStorageKey);
      if (rawSnapshot) {
        try {
          const parsed = JSON.parse(rawSnapshot) as WorkspaceSnapshot;
          applyWorkspaceSnapshot(parsed);
        } catch {
          localStorage.removeItem(workspaceStorageKey);
        }
      }

      setWorkspaceHydrated(true);
    };

    hydrateWorkspace();
  }, [workspaceStorageKey, workspaceUserId]);

  useEffect(() => {
    if (!workspaceHydrated || !workspaceStorageKey) {
      return;
    }

    const snapshot: WorkspaceSnapshot = {
      inputText,
      output,
      spans,
      selectedIndex,
      analysisId,
      originalTokens,
      viewMode,
      sentenceIndex,
    };

    localStorage.setItem(workspaceStorageKey, JSON.stringify(snapshot));

    if (workspaceUserId) {
      if (saveDebounceRef.current !== null) {
        window.clearTimeout(saveDebounceRef.current);
      }

      saveDebounceRef.current = window.setTimeout(() => {
        saveRemoteWorkspaceSnapshot(workspaceUserId, snapshot).catch(() => {
          // Keep local fallback silent if remote persistence is unavailable.
        });
      }, 800);
    }
  }, [
    workspaceHydrated,
    workspaceStorageKey,
    workspaceUserId,
    inputText,
    output,
    spans,
    selectedIndex,
    analysisId,
    originalTokens,
    viewMode,
    sentenceIndex,
  ]);

  useEffect(() => {
    return () => {
      if (saveDebounceRef.current !== null) {
        window.clearTimeout(saveDebounceRef.current);
      }
    };
  }, []);

  const handlePrediction = (data: PredictionResponse) => {
    setOutput(data);
    const mergedSpans = mergeTokensToSpans(data.tokens, data.text);
    setSpans(mergedSpans);
    setOriginalTokens(data.tokens.map((token) => ({ ...token })));
    setAnalysisId(createAnalysisId());
    setSelectedIndex(null);
    setSentenceIndex(0);
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

    if (analysisId && originalTokens.length > 0) {
      saveFeedbackAnalysis({
        analysis_id: analysisId,
        original_tokens: toFeedbackTokenLabels(originalTokens),
        edited_tokens: toFeedbackTokenLabels(updatedTokens),
      }).catch((error) => {
        console.error("Failed to persist feedback analysis", error);
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-[1400px]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Input Panel */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-5 bg-white shadow-sm border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b pb-2">
              <h2 className="text-lg font-semibold text-slate-800">Input Source</h2>
              <button
                type="button"
                onClick={handleResetWorkspace}
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Reset All
              </button>
            </div>
            <InputSection
              key={inputSectionKey}
              text={inputText}
              setText={setInputText}
              setOutput={handlePrediction}
            />
          </Card>
        </div>

        {/* Middle Column: Core Output Panel */}
        <div ref={outputCardRef} className="lg:col-span-6">
          <Card className="p-6 bg-white shadow-sm border-slate-200 flex flex-col">
            <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">Annotation Output</h2>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-md border border-slate-300 p-1 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setViewMode("annotated")}
                    className={`px-2.5 py-1 text-xs rounded ${
                      viewMode === "annotated"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600"
                    }`}
                  >
                    Paragraph View
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("sentence");
                      setSentenceIndex(0);
                    }}
                    className={`px-2.5 py-1 text-xs rounded ${
                      viewMode === "sentence"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600"
                    }`}
                  >
                    Sentence View
                  </button>
                </div>
                {output && (
                  <ExportButton
                    spans={spans}
                    tokens={output.tokens}
                    text={output.text}
                  />
                )}
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              {viewMode === "annotated" ? (
                <OutputSection
                  data={output}
                  spans={spans}
                  selectedIndex={selectedIndex}
                  setSelectedIndex={setSelectedIndex}
                />
              ) : (
                <div className="py-4 space-y-4">
                  {sentences.length === 0 ? (
                    <div className="text-slate-500 text-sm italic py-8 text-center border-2 border-dashed border-slate-200 rounded-lg">
                      Add input text and run analysis to view sentence navigation.
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setSentenceIndex((prev) =>
                              sentences.length === 0
                                ? 0
                                : (prev - 1 + sentences.length) % sentences.length
                            )
                          }
                          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Previous
                        </button>
                        <span className="text-sm font-medium text-slate-600">
                          Sentence {sentenceIndex + 1} of {sentences.length}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setSentenceIndex((prev) =>
                              sentences.length === 0
                                ? 0
                                : (prev + 1) % sentences.length
                            )
                          }
                          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Next
                        </button>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <OutputSection
                          data={sentenceOutput}
                          spans={sentenceSpans}
                          selectedIndex={selectedIndex}
                          setSelectedIndex={setSelectedIndex}
                          spanIndexMap={sentenceSpanIndexMap}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>

        {/* Right Column: Assignment & Entity Lists */}
        <div ref={propertiesCardRef} className="lg:col-span-3 space-y-6">
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