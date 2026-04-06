"use client";

import { useEffect, useMemo, useState } from "react";
import { useDataTopics } from "@/hooks/use-data-topics";
import { TopicList } from "./topic-list";
import { TopicPanel } from "./topic-panel";
import { DataSender } from "./data-sender";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Layers3,
  Radio,
  Send,
} from "lucide-react";
import {
  SERIALIZATION_MODE_OPTIONS,
  type SerializationMode,
} from "@/lib/data-serialization";
import { cn } from "@/lib/utils";

export function DataPacketsSection() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [senderMode, setSenderMode] = useState<SerializationMode>("json-only");
  const [receiverMode, setReceiverMode] =
    useState<SerializationMode>("json-only");
  const [showSender, setShowSender] = useState(false);
  const [showReceiver, setShowReceiver] = useState(false);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [outgoingTopicActivity, setOutgoingTopicActivity] = useState<
    Map<string, { count: number; lastSent: number }>
  >(new Map());

  const {
    topics,
    incomingTopicActivity,
    selectedTopic,
    setSelectedTopic,
    getTopicMessages,
    getTopicStats,
    hasData,
  } = useDataTopics(receiverMode);

  const incomingStatsByTopic = useMemo(() => {
    const map = new Map<
      string,
      (typeof incomingTopicActivity)[number]["stats"]
    >();
    for (const activity of incomingTopicActivity) {
      map.set(activity.topic, activity.stats);
    }
    return map;
  }, [incomingTopicActivity]);

  const allTopics = useMemo(() => {
    return Array.from(
      new Set([
        ...incomingStatsByTopic.keys(),
        ...outgoingTopicActivity.keys(),
      ]),
    ).sort();
  }, [incomingStatsByTopic, outgoingTopicActivity]);

  useEffect(() => {
    setShowReceiver(hasData);
  }, [hasData]);

  useEffect(() => {
    setShowAllTopics(allTopics.length > 0);
  }, [allTopics.length]);

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsCollapsed((prev) => !prev)}
        className="h-auto w-full items-start justify-between gap-3 whitespace-normal px-0 py-1 text-left text-neutral-200 hover:bg-transparent hover:text-neutral-100"
      >
        <div className="min-w-0 flex-1 pr-2">
          <div className="text-sm font-semibold">Data Packets / Topics</div>
          <p className="mt-1 text-xs leading-5 text-neutral-500">
            Reliable or lossy data-channel packets grouped by topic.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start">
          <Badge variant="outline" className="text-xs text-neutral-300">
            {allTopics.length} topic{allTopics.length !== 1 ? "s" : ""}
          </Badge>
          <ChevronRight
            className={cn(
              "h-4 w-4 text-neutral-400 transition-transform",
              !isCollapsed && "rotate-90",
            )}
          />
        </div>
      </Button>

      {!isCollapsed && (
        <>
          <div className="mt-4 border-t border-neutral-800 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSender(!showSender)}
              className="w-full justify-between text-neutral-400 hover:text-neutral-200"
            >
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Sender
              </span>
              {showSender ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>

            {showSender && (
              <div className="mt-3 space-y-3">
                <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
                  <p className="text-xs text-neutral-400">Sender Serialization</p>
                  <div className="flex flex-wrap gap-2">
                    {SERIALIZATION_MODE_OPTIONS.map((mode) => (
                      <button
                        key={`packet-sender-${mode.value}`}
                        onClick={() => setSenderMode(mode.value)}
                        className={cn(
                          "rounded px-2 py-1 text-xs transition-colors",
                          senderMode === mode.value
                            ? "bg-blue-600 text-white"
                            : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600",
                        )}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
                <DataSender
                  senderMode={senderMode}
                  onPublishSuccess={(topic, timestamp) => {
                    setOutgoingTopicActivity((prev) => {
                      const next = new Map(prev);
                      const current = next.get(topic);
                      next.set(topic, {
                        count: (current?.count ?? 0) + 1,
                        lastSent: timestamp,
                      });
                      return next;
                    });
                  }}
                />
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-neutral-800 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReceiver(!showReceiver)}
              className="w-full justify-between text-neutral-400 hover:text-neutral-200"
            >
              <span className="flex items-center gap-2">
                <Radio className="h-4 w-4" />
                Receiver
              </span>
              {showReceiver ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>

            {showReceiver && (
              <div className="mt-3 space-y-3">
                <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
                  <p className="text-xs text-neutral-400">Receiver Serialization</p>
                  <div className="flex flex-wrap gap-2">
                    {SERIALIZATION_MODE_OPTIONS.map((mode) => (
                      <button
                        key={`packet-receiver-${mode.value}`}
                        onClick={() => setReceiverMode(mode.value)}
                        className={cn(
                          "rounded px-2 py-1 text-xs transition-colors",
                          receiverMode === mode.value
                            ? "bg-purple-600 text-white"
                            : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600",
                        )}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                <TopicList
                  topics={topics}
                  selectedTopic={selectedTopic}
                  onSelectTopic={(topic) => setSelectedTopic(topic)}
                  getTopicStats={getTopicStats}
                />

                {selectedTopic && (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Radio className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-neutral-300">
                        {selectedTopic}
                      </span>
                    </div>
                    <TopicPanel
                      topic={selectedTopic}
                      messages={getTopicMessages(selectedTopic)}
                      stats={getTopicStats(selectedTopic)}
                    />
                  </div>
                )}

                {!selectedTopic && hasData && (
                  <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4 text-center text-sm text-neutral-400">
                    Select a topic above to view its messages.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-neutral-800 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllTopics(!showAllTopics)}
              className="w-full justify-between text-neutral-400 hover:text-neutral-200"
            >
              <span className="flex items-center gap-2">
                <Layers3 className="h-4 w-4" />
                All Topics
              </span>
              {showAllTopics ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>

            {showAllTopics && (
              <div className="mt-3 space-y-2">
                {allTopics.length === 0 ? (
                  <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-center text-neutral-500">
                    No topic activity yet.
                  </div>
                ) : (
                  allTopics.map((topic) => {
                    const incoming = incomingStatsByTopic.get(topic);
                    const outgoing = outgoingTopicActivity.get(topic);

                    return (
                      <div
                        key={topic}
                        className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-neutral-200">
                            {topic}
                          </span>
                          <div className="flex items-center gap-2">
                            {incoming && (
                              <span className="inline-flex items-center gap-1 text-xs text-green-400">
                                <ArrowDownLeft className="h-3 w-3" />
                                incoming
                              </span>
                            )}
                            {outgoing && (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-400">
                                <ArrowUpRight className="h-3 w-3" />
                                outgoing
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-neutral-400">
                          {incoming && (
                            <Badge variant="outline" className="text-xs">
                              in: {incoming.messageCount}
                            </Badge>
                          )}
                          {outgoing && (
                            <Badge variant="outline" className="text-xs">
                              out: {outgoing.count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
