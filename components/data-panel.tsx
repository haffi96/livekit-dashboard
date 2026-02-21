"use client";

import { useState } from "react";
import { useDataTopics } from "@/hooks/use-data-topics";
import { TopicList } from "./topic-list";
import { TopicPanel } from "./topic-panel";
import { DataSender } from "./data-sender";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Radio, Send } from "lucide-react";

export function DataPanel() {
  const {
    topics,
    selectedTopic,
    setSelectedTopic,
    getTopicMessages,
    getTopicStats,
    hasData,
  } = useDataTopics();

  const [showSender, setShowSender] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-300">Data Topics</h3>
        <Badge variant="outline" className="text-xs">
          {topics.length} topic{topics.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <TopicList
        topics={topics}
        selectedTopic={selectedTopic}
        onSelectTopic={setSelectedTopic}
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

      <div className="border-t border-neutral-800 pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSender(!showSender)}
          className="w-full justify-between text-neutral-400 hover:text-neutral-200"
        >
          <span className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Data Sender
          </span>
          {showSender ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>

        {showSender && (
          <div className="mt-3">
            <DataSender />
          </div>
        )}
      </div>
    </div>
  );
}
