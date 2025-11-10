import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, MessageSquare, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ChatHistoryProps {
  mode: "querynet" | "lifesync";
  onSelectChat: (chatId: string) => void;
  currentChatId: string;
}

export default function ChatHistory({ mode, onSelectChat, currentChatId }: ChatHistoryProps) {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadChats();
  }, [mode]);

  const loadChats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const table = mode === "querynet" ? "querynet_chats" : "lifesync_chats";
      const { data } = await supabase
        .from(table)
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      setChats(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading chats",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const table = mode === "querynet" ? "querynet_chats" : "lifesync_chats";
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast({ title: "Chat deleted" });
      setChats(chats.filter(c => c.id !== deleteId));
      setDeleteId(null);
    } catch (error: any) {
      toast({
        title: "Error deleting chat",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Chat History</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {chats.map((chat) => (
          <Card
            key={chat.id}
            className={`glass-panel p-4 cursor-pointer hover:bg-glass/80 transition-all ${
              chat.id === currentChatId ? "ring-2 ring-primary" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <button
                onClick={() => onSelectChat(chat.id)}
                className="flex items-center gap-3 flex-1 text-left"
              >
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{chat.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(chat.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteId(chat.id);
                }}
                className="hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}

        {chats.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No chats yet. Start a conversation!
          </p>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this chat and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
