"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TopicStats } from "@/hooks/use-data-topics";

interface TopicListProps {
  topics: string[];
  selectedTopic: string | null;
  onSelectTopic: (topic: string | null) => void;
  getTopicStats: (topic: string) => TopicStats;
}

export function TopicList({
  topics,
  selectedTopic,
  onSelectTopic,
  getTopicStats,
}: TopicListProps) {
  if (topics.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-center text-neutral-500">
        No data topics received yet. Waiting for incoming data...
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {topics.map((topic) => {
        const stats = getTopicStats(topic);
        const isActive = stats.currentRate > 0;
        const isSelected = selectedTopic === topic;

        return (
          <button
            key={topic}
            onClick={() => onSelectTopic(isSelected ? null : topic)}
            className={cn(
              "group relative rounded-lg border p-2 text-left transition-all",
              isSelected
                ? "border-blue-500 bg-blue-500/10"
                : "border-neutral-700 bg-neutral-800 hover:border-neutral-600",
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  isActive ? "animate-pulse bg-green-500" : "bg-neutral-500",
                )}
              />
              <span className="font-mono text-sm font-medium">{topic}</span>
              <Badge variant="outline" className="text-xs text-neutral-400">
                {stats.messageCount}
              </Badge>
            </div>
            {isActive && (
              <div className="mt-1 text-xs text-neutral-400">
                {stats.currentRate.toFixed(1)} Hz
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
