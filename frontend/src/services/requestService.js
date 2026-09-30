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