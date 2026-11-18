import { api } from "./client";

export type AdmissionFormLink = {
  token: string;
  enabled: boolean;
};

export type PublicGuardianInput = {
  full_name: string;
  phone: string;
  email?: string | null;
  occupation?: string | null;
  id_number?: string | null;
};

export type PublicAdmissionSubmit = {
  first_name: string;
  last_name?: string | null;
  gender: string;
  date_of_birth: string;
  nationality?: string | null;
  religion?: string | null;
  blood_group?: string | null;
  present_address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  class_id: string;
  section_id: string;
  medium?: string | null;
  shift?: string | null;
  previous_school_name?: string | null;
  previous_class?: string | null;
  father: PublicGuardianInput;
  mother?: PublicGuardianInput | null;
  declaration_accepted: boolean;
  website?: string | null;
};

export type PublicAdmissionResult = {
  reference: string;
  message: string;
};

export type PublicAdmissionSection = {
  id: string;
  name: string;
};

export type PublicAdmissionClass = {
  id: string;
  name: string;
  numeric_value: number | null;
  sections: PublicAdmissionSection[];
};

export type PublicAdmissionConfig = {
  school: {
    id: string;
    name: string;
    code: string;
    logo_url?: string | null;
  };
  academic_year: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
  } | null;
  classes: PublicAdmissionClass[];
  admission_open: boolean;
};

export async function getAdmissionFormLink(): Promise<AdmissionFormLink> {
  const resp = await api.get("/admissions/form-link");
  return resp.data as AdmissionFormLink;
}

export async function setAdmissionFormEnabled(enabled: boolean): Promise<AdmissionFormLink> {
  const resp = await api.patch("/admissions/form-link", { enabled });
  return resp.data as AdmissionFormLink;
}

export async function rotateAdmissionFormLink(): Promise<AdmissionFormLink> {
  const resp = await api.post("/admissions/form-link/rotate");
  return resp.data as AdmissionFormLink;
}

export async function getAdmissionFormQr(target: string): Promise<Blob> {
  const resp = await api.get("/admissions/form-link/qr", {
    params: { target },
    responseType: "blob",
  });
  return resp.data as Blob;
}

export async function getPublicAdmissionConfig(token: string): Promise<PublicAdmissionConfig> {
  const resp = await api.get(`/public/admissions/${encodeURIComponent(token)}`);
  return resp.data as PublicAdmissionConfig;
}

export async function submitPublicAdmission(
  token: string,
  payload: PublicAdmissionSubmit,
  files?: {
    photo?: File | null;
    birthCertificate?: File | null;
    transferCertificate?: File | null;
  },
): Promise<PublicAdmissionResult> {
  const formData = new FormData();
  formData.append("payload", JSON.stringify(payload));
  if (files?.photo) formData.append("student_photo", files.photo);
  if (files?.birthCertificate) formData.append("birth_certificate", files.birthCertificate);
  if (files?.transferCertificate) formData.append("transfer_certificate", files.transferCertificate);

  const resp = await api.post(`/public/admissions/${encodeURIComponent(token)}/apply`, formData, {
    suppressSuccessToast: true,
  });
  return resp.data as PublicAdmissionResult;
}
