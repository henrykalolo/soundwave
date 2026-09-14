import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FeedTab } from "@/types";

interface FeedTabsProps {
  value: FeedTab;
  onChange: (tab: FeedTab) => void;
}

export default function FeedTabs({ value, onChange }: FeedTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChange(v as FeedTab)}
      className="w-full"
    >
      <TabsList className="w-full">
        <TabsTrigger value="forYou" data-ocid="feed.tab.for_you">
          For You
        </TabsTrigger>
        <TabsTrigger value="following" data-ocid="feed.tab.following">
          Following
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
