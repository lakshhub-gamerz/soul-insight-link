-- Fix RLS for document_chunks table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "document_chunks_select_own" ON public.document_chunks;
DROP POLICY IF EXISTS "document_chunks_insert_own" ON public.document_chunks;
DROP POLICY IF EXISTS "document_chunks_update_own" ON public.document_chunks;
DROP POLICY IF EXISTS "document_chunks_delete_own" ON public.document_chunks;

-- Enable RLS
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Create policies for document_chunks
CREATE POLICY "document_chunks_select_own"
ON public.document_chunks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.querynet_documents d
    WHERE d.id = document_id AND d.user_id = auth.uid()
  )
);

CREATE POLICY "document_chunks_insert_own"
ON public.document_chunks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.querynet_documents d
    WHERE d.id = document_id AND d.user_id = auth.uid()
  )
);

CREATE POLICY "document_chunks_update_own"
ON public.document_chunks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.querynet_documents d
    WHERE d.id = document_id AND d.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.querynet_documents d
    WHERE d.id = document_id AND d.user_id = auth.uid()
  )
);

CREATE POLICY "document_chunks_delete_own"
ON public.document_chunks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.querynet_documents d
    WHERE d.id = document_id AND d.user_id = auth.uid()
  )
);