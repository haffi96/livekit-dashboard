"use client";

import { useMemo, useState } from "react";
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

export function DataPanel() {
  const [senderMode, setSenderMode] = useState<SerializationMode>("json-only");
  const [receiverMode, setReceiverMode] =
    useState<SerializationMode>("json-only");
  const [showSender, setShowSender] = useState(true);
  const [showReceiver, setShowReceiver] = useState(true);
  const [showAllTopics, setShowAllTopics] = useState(true);
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
    const map = new Map<string, (typeof incomingTopicActivity)[number]["stats"]>();
    for (const activity of incomingTopicActivity) {
      map.set(activity.topic, activity.stats);
    }
    return map;
  }, [incomingTopicActivity]);

  const allTopics = useMemo(() => {
    return Array.from(
      new Set([...incomingStatsByTopic.keys(), ...outgoingTopicActivity.keys()]),
    ).sort();
  }, [incomingStatsByTopic, outgoingTopicActivity]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-300">Data Topics</h3>
        <Badge variant="outline" className="text-xs">
          {allTopics.length} topic{allTopics.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="border-t border-neutral-800 pt-2">
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
                    key={`sender-${mode.value}`}
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

      <div className="border-t border-neutral-800 pt-2">
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
                    key={`receiver-${mode.value}`}
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
                Select a topic above to view its messages
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-neutral-800 pt-2">
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
    </div>
  );
}
