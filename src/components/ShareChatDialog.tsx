import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Share2 } from "lucide-react";

interface ShareChatDialogProps {
  chatId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShareChatDialog({ chatId, open, onOpenChange }: ShareChatDialogProps) {
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateShareLink = async () => {
    setLoading(true);
    try {
      // Generate a unique share token
      const shareToken = crypto.randomUUID();
      
      const { error } = await supabase
        .from("querynet_chats")
        .update({
          share_token: shareToken,
          is_public: true,
        })
        .eq("id", chatId);

      if (error) throw error;

      const url = `${window.location.origin}/shared/${shareToken}`;
      setShareUrl(url);
      
      toast({
        title: "Share link generated!",
        description: "Anyone with this link can view this conversation.",
      });
    } catch (error: any) {
      toast({
        title: "Error generating link",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share This Chat
          </DialogTitle>
          <DialogDescription>
            Create a public link to share this conversation with others.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!shareUrl ? (
            <Button
              onClick={generateShareLink}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Generating..." : "Generate Share Link"}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="flex-1"
                />
                <Button
                  onClick={copyToClipboard}
                  size="icon"
                  variant="outline"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                This link will remain active. You can revoke access anytime from chat settings.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
