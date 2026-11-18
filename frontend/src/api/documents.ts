import { api } from "./client";

export type DocumentOut = {
  id: string;
  school_id: string;
  uploaded_by_user_id?: string | null;
  entity_type: string | null;
  entity_id: string | null;
  filename: string;
  content_type: string | null;
  created_at: string;
};

export async function listDocuments(params?: { entityType?: string; entityId?: string }) {
  const resp = await api.get<DocumentOut[]>("/documents", {
    params: {
      entity_type: params?.entityType,
      entity_id: params?.entityId,
    },
  });
  return resp.data;
}

export async function uploadDocument(input: { file: File; entityType?: string; entityId?: string }) {
  const formData = new FormData();
  formData.append("file", input.file);

  const resp = await api.post<DocumentOut>("/documents/upload", formData, {
    params: {
      entity_type: input.entityType,
      entity_id: input.entityId,
    },
    headers: { "Content-Type": "multipart/form-data" },
  });
  return resp.data;
}

export async function bulkUploadDocuments(input: { files: File[]; entityType?: string; entityId?: string }) {
  const formData = new FormData();
  for (const f of input.files) {
    formData.append("files", f);
  }

  const resp = await api.post<{ created: number }>("/documents/bulk-upload", formData, {
    params: {
      entity_type: input.entityType,
      entity_id: input.entityId,
    },
    headers: { "Content-Type": "multipart/form-data" },
  });
  return resp.data;
}

export async function deleteDocument(documentId: string) {
  const resp = await api.delete<{ status: string }>(`/documents/${documentId}`);
  return resp.data;
}

export async function downloadDocument(documentId: string) {
  const resp = await api.get<Blob>(`/documents/${documentId}/download`, {
    responseType: "blob",
  });
  return resp.data;
}

