import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  FileText,
  Trash2,
  Save,
  Search,
  FolderOpen,
  Edit3,
  X,
  Sparkles,
} from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  title: string;
}

export default function Workspace() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotes();
    fetchProjects();
  }, []);

  const fetchNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("projects")
        .select("id, title")
        .eq("user_id", user.id);

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Failed to load projects");
    }
  };

  const createNote = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          title: "Untitled Note",
          content: "",
        })
        .select()
        .single();

      if (error) throw error;

      setNotes([data, ...notes]);
      setActiveNote(data);
      setEditTitle(data.title);
      setEditContent("");
      setIsEditing(true);
      toast.success("Note created");
    } catch (error: any) {
      toast.error("Failed to create note");
    }
  };

  const saveNote = async () => {
    if (!activeNote) return;

    try {
      const { error } = await supabase
        .from("notes")
        .update({
          title: editTitle,
          content: editContent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeNote.id);

      if (error) throw error;

      setNotes(notes.map(n => 
        n.id === activeNote.id 
          ? { ...n, title: editTitle, content: editContent, updated_at: new Date().toISOString() }
          : n
      ));
      setActiveNote({ ...activeNote, title: editTitle, content: editContent });
      setIsEditing(false);
      toast.success("Note saved");
    } catch (error: any) {
      toast.error("Failed to save note");
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      setNotes(notes.filter(n => n.id !== noteId));
      if (activeNote?.id === noteId) {
        setActiveNote(null);
        setIsEditing(false);
      }
      toast.success("Note deleted");
    } catch (error: any) {
      toast.error("Failed to delete note");
    }
  };

  const selectNote = (note: Note) => {
    setActiveNote(note);
    setEditTitle(note.title);
    setEditContent(note.content || "");
    setIsEditing(false);
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (note.content?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return null;
    return projects.find(p => p.id === projectId)?.title;
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Workspace
          </h1>
          <p className="text-muted-foreground">Your personal notes and documents</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notes List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 h-[calc(100vh-200px)]">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-4">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Notes
                  </CardTitle>
                  <Button size="sm" onClick={createNote}>
                    <Plus className="w-4 h-4 mr-1" />
                    New
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background/50"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-380px)]">
                  <div className="px-4 pb-4 space-y-2">
                    {loading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : filteredNotes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No notes yet</p>
                        <p className="text-sm">Create your first note</p>
                      </div>
                    ) : (
                      <AnimatePresence>
                        {filteredNotes.map((note) => (
                          <motion.div
                            key={note.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onClick={() => selectNote(note)}
                            className={`p-3 rounded-lg cursor-pointer transition-all ${
                              activeNote?.id === note.id
                                ? "bg-primary/20 border border-primary/50"
                                : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">{note.title}</h4>
                                <p className="text-xs text-muted-foreground truncate mt-1">
                                  {note.content?.slice(0, 50) || "No content"}
                                </p>
                                {note.project_id && (
                                  <span className="text-xs text-primary mt-1 inline-block">
                                    <FolderOpen className="w-3 h-3 inline mr-1" />
                                    {getProjectName(note.project_id)}
                                  </span>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNote(note.id);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(note.updated_at).toLocaleDateString()}
                            </p>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>

          {/* Note Editor */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 h-[calc(100vh-200px)]">
              {activeNote ? (
                <>
                  <CardHeader className="pb-4 border-b border-border/50">
                    <div className="flex items-center justify-between">
                      {isEditing ? (
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="text-xl font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-0"
                          placeholder="Note title..."
                        />
                      ) : (
                        <h2 className="text-xl font-semibold">{activeNote.title}</h2>
                      )}
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                              <X className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                            <Button size="sm" onClick={saveNote}>
                              <Save className="w-4 h-4 mr-1" />
                              Save
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                            <Edit3 className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {isEditing ? (
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="Start writing your note..."
                        className="min-h-[calc(100vh-400px)] resize-none bg-transparent border-none focus-visible:ring-0 text-base leading-relaxed"
                      />
                    ) : (
                      <ScrollArea className="h-[calc(100vh-400px)]">
                        <div className="prose prose-invert max-w-none">
                          {activeNote.content ? (
                            <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
                              {activeNote.content}
                            </p>
                          ) : (
                            <p className="text-muted-foreground italic">
                              This note is empty. Click Edit to add content.
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <Sparkles className="w-16 h-16 mb-4 opacity-30" />
                  <h3 className="text-xl font-medium mb-2">No Note Selected</h3>
                  <p className="text-sm mb-4">Select a note from the list or create a new one</p>
                  <Button onClick={createNote}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Note
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
