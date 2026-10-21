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

export async function submitRequestFeedback(requestId, payload) {
  const { data } = await api.post(`/service-requests/${requestId}/feedback`, payload);
  return data;
}

export async function getRequestFeedback(requestId) {
  const { data } = await api.get(`/service-requests/${requestId}/feedback`);
  return data;
}

export async function updateRequestFeedback(requestId, payload) {
  const { data } = await api.patch(`/service-requests/${requestId}/feedback`, payload);
  return data;
}

export async function getMyFeedback() {
  const { data } = await api.get("/feedback/my");
  return data;
}

export async function getAdminFeedback(params = {}) {
  const { data } = await api.get("/admin/feedback", { params });
  return data;
}

// Module 9: Analytics & Administration API
export async function getAnalyticsOverview(params = {}) {
  const { data } = await api.get("/admin/analytics/overview", { params });
  return data;
}

export async function getRequestsOverTime(params = {}) {
  const { data } = await api.get("/admin/analytics/requests-over-time", { params });
  return data;
}

export async function getDistributionAnalytics(params = {}) {
  const { data } = await api.get("/admin/analytics/distribution", { params });
  return data;
}

export async function getDepartmentPerformance(params = {}) {
  const { data } = await api.get("/admin/analytics/department-performance", { params });
  return data;
}

export async function getOfficerWorkload(params = {}) {
  const { data } = await api.get("/admin/analytics/officer-workload", { params });
  return data;
}

export async function getFeedbackAnalytics(params = {}) {
  const { data } = await api.get("/admin/analytics/feedback", { params });
  return data;
}

export async function getRequestActivity(params = {}) {
  const { data } = await api.get("/admin/analytics/request-activity", { params });
  return data;
}

export async function exportAnalyticsCsv(params = {}) {
  const response = await api.get("/admin/analytics/export-csv", {
    params,
    responseType: "blob",
  });

  // Extract filename from header or construct default
  const disposition = response.headers["content-disposition"];
  let filename = `commonground_${params.report_type || "report"}_${new Date().toISOString().slice(0, 10)}.csv`;
  if (disposition && disposition.indexOf("filename=") !== -1) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) filename = match[1];
  }

  // Trigger browser download
  const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}