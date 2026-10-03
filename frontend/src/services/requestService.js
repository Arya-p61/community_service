import api from "./api";

export async function createRequest(payload) {
  const { data } = await api.post("/service-requests", payload);
  return data;
}

export async function getMyRequests() {
  const { data } = await api.get("/service-requests");
  return data;
}

export async function getRequestById(id) {
  const { data } = await api.get(`/service-requests/${id}`);
  return data;
}

export async function updateRequest(id, payload) {
  const { data } = await api.patch(`/service-requests/${id}`, payload);
  return data;
}

export async function deleteRequest(id) {
  await api.delete(`/service-requests/${id}`);
}

export async function classifyRequest(id) {
  const { data } = await api.post(`/service-requests/${id}/classify`);
  return data;
}

export async function getClassification(id) {
  const { data } = await api.get(`/service-requests/${id}/classification`);
  return data;
}

export async function getOfficerRequests(params = {}) {
  const { data } = await api.get("/officer/requests", { params });
  return data;
}

export async function getOfficerRequest(id) {
  const { data } = await api.get(`/officer/requests/${id}`);
  return data;
}

export async function claimOfficerRequest(id) {
  const { data } = await api.post(`/officer/requests/${id}/claim`);
  return data;
}

export async function unclaimOfficerRequest(id) {
  const { data } = await api.post(`/officer/requests/${id}/unclaim`);
  return data;
}

export async function updateRequestStatus(requestId, status, note) {
  const { data } = await api.patch(`/officer/requests/${requestId}/status`, { status, note });
  return data;
}

export async function updateOfficerStatus(id, payload) {
  return updateRequestStatus(id, payload.status, payload.note);
}

export async function addOfficerNote(id, note) {
  const { data } = await api.post(`/officer/requests/${id}/notes`, { note });
  return data;
}

export async function getOfficerNotes(id) {
  const { data } = await api.get(`/officer/requests/${id}/notes`);
  return data;
}

export async function getOfficerHistory(id) {
  const { data } = await api.get(`/officer/requests/${id}/history`);
  return data;
}

export async function getDepartments(includeInactive = false) {
  const { data } = await api.get("/departments", { params: { include_inactive: includeInactive } });
  return data;
}

export async function createDepartment(payload) {
  const { data } = await api.post("/departments", payload);
  return data;
}

export async function updateDepartment(id, payload) {
  const { data } = await api.patch(`/departments/${id}`, payload);
  return data;
}

export async function getAdminOfficers() {
  const { data } = await api.get("/admin/officers");
  return data;
}

export async function createOfficer(payload) {
  const { data } = await api.post("/admin/officers", payload);
  return data;
}

export async function updateOfficer(id, payload) {
  const { data } = await api.patch(`/admin/officers/${id}`, payload);
  return data;
}

export async function getAdminRequests() {
  const { data } = await api.get("/admin/requests");
  return data;
}

export async function updateAdminAssignment(id, payload) {
  const { data } = await api.patch(`/admin/requests/${id}/assignment`, payload);
  return data;
}

export async function updateAdminStatus(id, payload) {
  const { data } = await api.patch(`/admin/requests/${id}/status`, payload);
  return data;
}

export async function getRequestStatusHistory(requestId) {
  const { data } = await api.get(`/service-requests/${requestId}/status-history`);
  return data;
}

export async function getRequestHistory(id) {
  return getRequestStatusHistory(id);
}